/**
 * Builds the Agent Replay cut list and schedules narration against the capture's
 * measured events. Run after capture has written film-replay/timeline.json.
 *
 *   CONTENT_ENDS=175.2 HOLD=2 node scripts/film/build-replay.mjs
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const DIR = resolve(ROOT, 'video/public/film-replay')
const timeline = JSON.parse(readFileSync(resolve(DIR, 'timeline.json'), 'utf8'))
const rendered = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/narration-v3/narration-v3.json'), 'utf8'))
if (!Array.isArray(timeline.events)) throw new Error('timeline.json must contain an events array')
if (!Number.isFinite(Number(timeline.seconds))) throw new Error('timeline.json must contain a finite seconds value')
if (!Array.isArray(rendered.clips)) throw new Error('narration-v3.json must contain a clips array')
const renderedById = new Map(rendered.clips.map((clip) => [clip.id, clip]))
const fileOf = (id) => `film/narration-v3/${id}.wav`

const numberFromEnv = (name, fallback, minimum = 0) => {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(value) || value < minimum) throw new Error(`${name} must be a finite number >= ${minimum}; received ${process.env[name] ?? fallback}`)
  return value
}

/**
 * Where the performance stops moving, measured rather than guessed.
 *
 * This used to be a hand-typed default of 143s, and it was stale the moment the pacing
 * changed: too high and the film ends on dead air, too low and it amputates the closing
 * beats — the final lockup was being cut off entirely. ffmpeg's freezedetect reports
 * where the picture stops changing, and the last such marker in the take is the end of
 * the performance. CONTENT_ENDS survives as a deliberate override; the log says which
 * source won.
 */
const detectContentEnd = (takeSeconds) => {
  if (process.env.CONTENT_ENDS) {
    const value = numberFromEnv('CONTENT_ENDS', 143, 0.01)
    console.log(`content ends ${value.toFixed(2)}s (source: CONTENT_ENDS override)`)
    return value
  }
  const capture = resolve(DIR, 'capture.mp4')
  const probe = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', capture,
    '-vf', 'freezedetect=n=-58dB:d=1.0,metadata=print:file=-',
    '-map', '0:v', '-f', 'null', '-',
  ], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
  const text = `${probe.stdout ?? ''}${probe.stderr ?? ''}`
  const starts = [...text.matchAll(/freeze_start[:=]\s*([\d.]+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < takeSeconds - 0.05)
  if (!starts.length) {
    throw new Error(`freezedetect found no still frame in ${capture}; pass CONTENT_ENDS to override`)
  }
  const last = starts[starts.length - 1]
  // freeze_start is the first frame of the still, so the last motion is just before it.
  const value = Math.min(takeSeconds, last + 0.35)
  console.log(`content ends ${value.toFixed(2)}s (source: freezedetect, ${starts.length} still${starts.length === 1 ? '' : 's'}, last begins ${last.toFixed(2)}s)`)
  return value
}
const CONTENT_ENDS = detectContentEnd(Number(timeline.seconds))
// Six seconds gives the restored closing thesis room to finish over the completed
// lockup. The audio builder adds its own 1.8s musical release after the final word.
const HOLD = numberFromEnv('HOLD', 6)
const FILM_SECONDS = CONTENT_ENDS + HOLD
/** Hard inter-clip floor and hard protection against narration going stale. */
const MIN_GAP = numberFromEnv('NARRATION_MIN_GAP', 0.35)
const MAX_DRIFT = numberFromEnv('NARRATION_MAX_DRIFT', 10)

if (CONTENT_ENDS > Number(timeline.seconds) + 0.001) {
  throw new Error(`CONTENT_ENDS ${CONTENT_ENDS.toFixed(2)}s exceeds the captured take ${Number(timeline.seconds).toFixed(2)}s`)
}

// The end card animates in over 900ms. A cut that lands inside that build ships a
// half-drawn lockup, which is exactly what the last take did.
const LOCKUP_BUILD = 0.9
const lockup = timeline.events.filter((event) => event.kind === 'lockup').pop()
if (lockup) {
  const needed = lockup.t + LOCKUP_BUILD
  if (FILM_SECONDS < needed - 0.001) {
    throw new Error(`the cut ends at ${FILM_SECONDS.toFixed(2)}s but the lockup is not fully built until ${needed.toFixed(2)}s (shown ${lockup.t.toFixed(2)}s + ${LOCKUP_BUILD}s build); raise HOLD or CONTENT_ENDS`)
  }
} else {
  console.warn('no lockup event in timeline.json — recapture with a capture.mjs that marks it')
}

// Beat predicates stay beside the lines they place. `afterCommit` counts only
// tutor/human commits, skipping take, shot and bridge markers.
const onBeat = (kind, labelIncludes, occurrence = 1) => ({ type: 'match', kind, labelIncludes, occurrence })
const afterCommit = (anchor, count = 1) => ({ type: 'afterCommit', anchor, count })

/**
 * The voice carries the argument while the parity section proves that learner and
 * tutor share the same objects and history. After the matrix there is one closing
 * thesis over the finished lockup; compatibility work has already happened.
 */
const plan = [
  { id: '01-what', beat: onBeat('take', 'start') },
  { id: '02-problem', beat: onBeat('shot', 'agent-replay') },
  { id: '03-webmcp', beat: afterCommit(onBeat('human', 'Wrote the Gamma recurrence'), 1) },
  { id: '07-density', beat: onBeat('tutor', 'Density draw-in') },
  { id: '08-bridge', beat: onBeat('tutor', 'Masses to softmax') },
  { id: '09-attention', beat: onBeat('tutor', 'Visualized attention') },
  { id: '10-training', beat: onBeat('tutor', 'Applied gradient step 1') },
  { id: '11-geometry', beat: onBeat('tutor', 'completed the construction') },
  { id: '12-barycentric', beat: onBeat('tutor', 'Visualized barycentric') },
  { id: '13-parity-shape', beat: onBeat('tutor', 'Moved arrow replay_arrow') },
  { id: '16c-undo', beat: onBeat('human', 'Undid erased 1 ink object by id') },
  { id: '15-matrix', beat: onBeat('tutor', 'Visualized matrix-transform') },
  { id: '17-close', beat: onBeat('replay', 'all tool calls settled') },
]

const describePredicate = (predicate) => {
  if (predicate.type === 'match') {
    return `${predicate.kind} label containing “${predicate.labelIncludes}”${predicate.occurrence === 1 ? '' : ` (#${predicate.occurrence})`}`
  }
  const ordinal = predicate.count === 1 ? 'st' : predicate.count === 2 ? 'nd' : predicate.count === 3 ? 'rd' : 'th'
  return `${predicate.count}${ordinal} commit after ${describePredicate(predicate.anchor)}`
}

const resolveBeat = (predicate, clipId) => {
  if (predicate.type === 'match') {
    const matches = timeline.events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.kind === predicate.kind && String(event.label).includes(predicate.labelIncludes))
    const match = matches[predicate.occurrence - 1]
    if (!match) {
      throw new Error(`${clipId}: beat not found: ${describePredicate(predicate)}; found ${matches.length} matching event(s)`)
    }
    return { ...match, predicate: describePredicate(predicate) }
  }

  if (predicate.type === 'afterCommit') {
    const anchor = resolveBeat(predicate.anchor, clipId)
    const commits = timeline.events
      .map((event, index) => ({ event, index }))
      .filter(({ event, index }) => index > anchor.index && (event.kind === 'tutor' || event.kind === 'human'))
    const match = commits[predicate.count - 1]
    if (!match) {
      throw new Error(`${clipId}: beat not found: ${describePredicate(predicate)}; only ${commits.length} later commit(s) exist`)
    }
    return { ...match, predicate: describePredicate(predicate) }
  }

  throw new Error(`${clipId}: unknown beat predicate ${JSON.stringify(predicate)}`)
}

const entries = plan.map(({ id, beat }) => {
  const audio = renderedById.get(id)
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) throw new Error(`${id}: no rendered audio with a positive duration`)
  const resolvedBeat = resolveBeat(beat, id)
  const beatTime = Number(resolvedBeat.event.t)
  if (!Number.isFinite(beatTime)) throw new Error(`${id}: beat “${resolvedBeat.event.label}” has a non-finite timestamp`)
  return {
    id,
    beat: resolvedBeat,
    beatTime: Math.max(0, beatTime),
    duration: audio.duration,
    text: audio.text ?? '',
  }
})

const speech = entries.reduce((total, entry) => total + entry.duration, 0)
const minimumRequired = speech + MIN_GAP * Math.max(0, entries.length - 1)
if (minimumRequired > FILM_SECONDS + 1e-9) {
  throw new Error(`narration needs at least ${minimumRequired.toFixed(2)}s (${speech.toFixed(2)}s speech + ${MIN_GAP.toFixed(2)}s × ${entries.length - 1} gaps), but the film is ${FILM_SECONDS.toFixed(2)}s; short by ${(minimumRequired - FILM_SECONDS).toFixed(2)}s`)
}

/** Earliest ordered placement for a requested uniform breathing gap. */
const place = (breathingGap) => {
  const rows = []
  let previousEnd = 0
  for (const [index, entry] of entries.entries()) {
    const collisionFloor = index === 0
      ? breathingGap
      : previousEnd + Math.max(MIN_GAP, breathingGap)
    const start = Math.max(entry.beatTime, collisionFloor)
    const end = start + entry.duration
    rows.push({ ...entry, start, end, drift: start - entry.beatTime })
    previousEnd = end
  }
  return rows
}

// The earliest legal schedule is the feasibility proof: no other ordered
// placement can end sooner or reduce a clip's collision-driven drift.
const earliest = place(0)
const driftFailure = earliest.find((row) => row.drift > MAX_DRIFT + 1e-9)
if (driftFailure) {
  const previous = earliest[earliest.indexOf(driftFailure) - 1]
  throw new Error(`${driftFailure.id}: earliest legal start ${driftFailure.start.toFixed(2)}s is ${driftFailure.drift.toFixed(2)}s after its beat “${driftFailure.beat.event.label}” at ${driftFailure.beatTime.toFixed(2)}s, exceeding NARRATION_MAX_DRIFT=${MAX_DRIFT.toFixed(2)}s by ${(driftFailure.drift - MAX_DRIFT).toFixed(2)}s${previous ? `; ${previous.id} ends at ${previous.end.toFixed(2)}s and requires a ${MIN_GAP.toFixed(2)}s gap` : ''}`)
}
const endFailure = earliest.find((row) => row.end > FILM_SECONDS + 1e-9)
if (endFailure) {
  const previous = earliest[earliest.indexOf(endFailure) - 1]
  throw new Error(`${endFailure.id}: earliest legal end ${endFailure.end.toFixed(2)}s exceeds film end ${FILM_SECONDS.toFixed(2)}s by ${(endFailure.end - FILM_SECONDS).toFixed(2)}s; beat “${endFailure.beat.event.label}” is at ${endFailure.beatTime.toFixed(2)}s${previous ? ` and ${previous.id} ends at ${previous.end.toFixed(2)}s` : ''}`)
}

// Maximise the silence guaranteed around every clip (including head and tail).
// Forced beat gaps may be larger; binary search finds the largest common floor.
let low = 0
let high = FILM_SECONDS
for (let iteration = 0; iteration < 80; iteration += 1) {
  const candidate = (low + high) / 2
  const rows = place(candidate)
  const fitsEnd = rows.at(-1).end + candidate <= FILM_SECONDS + 1e-9
  const fitsDrift = rows.every((row) => row.drift <= MAX_DRIFT + 1e-9)
  if (fitsEnd && fitsDrift) low = candidate
  else high = candidate
}
const schedule = place(low)

const clips = schedule.map((row) => ({
  shot: row.id,
  file: fileOf(row.id),
  duration: row.duration,
  offset: Number(row.start.toFixed(3)),
  text: row.text,
}))

const cutlist = {
  filmSeconds: FILM_SECONDS,
  rawSeconds: FILM_SECONDS,
  excised: 0,
  overlapped: 0,
  shots: [{
    id: 'agent-replay',
    title: 'One mathematical world',
    srcStart: 0,
    srcEnd: FILM_SECONDS,
    kind: 'end',
    filmStart: 0,
    seconds: FILM_SECONDS,
    filmEnd: FILM_SECONDS,
    transitionSeconds: 0,
  }],
}

writeFileSync(resolve(DIR, 'cutlist.json'), `${JSON.stringify(cutlist, null, 2)}\n`)
writeFileSync(resolve(DIR, 'narration.json'), `${JSON.stringify({ source: 'replay', clips }, null, 2)}\n`)

const compact = (value, width) => value.length <= width ? value : `${value.slice(0, width - 1)}…`
const rowsForPrint = schedule.map((row) => ({
  clip: row.id,
  beat: compact(`${row.beat.event.kind}: ${row.beat.event.label}`, 48),
  time: row.beatTime.toFixed(2),
  start: row.start.toFixed(2),
  end: row.end.toFixed(2),
  drift: `+${row.drift.toFixed(2)}`,
}))
const widths = {
  clip: Math.max(4, ...rowsForPrint.map((row) => row.clip.length)),
  beat: Math.max(4, ...rowsForPrint.map((row) => row.beat.length)),
  time: 6,
  start: 6,
  end: 6,
  drift: 6,
}
const printRow = (row) => `${row.clip.padEnd(widths.clip)}  ${row.beat.padEnd(widths.beat)}  ${row.time.padStart(widths.time)}  ${row.start.padStart(widths.start)}  ${row.end.padStart(widths.end)}  ${row.drift.padStart(widths.drift)}`
console.log(printRow({ clip: 'clip', beat: 'beat', time: 'beat', start: 'start', end: 'end', drift: 'drift' }))
console.log(printRow({ clip: '-'.repeat(widths.clip), beat: '-'.repeat(widths.beat), time: '------', start: '------', end: '------', drift: '------' }))
for (const row of rowsForPrint) console.log(printRow(row))
console.log(`film      ${FILM_SECONDS.toFixed(2)}s`)
console.log(`speech    ${speech.toFixed(2)}s across ${clips.length} clips`)
console.log(`silence   ${(FILM_SECONDS - speech).toFixed(2)}s`)
console.log(`breathing ${low.toFixed(2)}s minimum around every clip (${MIN_GAP.toFixed(2)}s hard floor)`)
console.log(`last word ${schedule.at(-1).end.toFixed(2)}s`)
