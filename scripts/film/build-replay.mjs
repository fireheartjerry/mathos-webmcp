/**
 * Builds the cut list and the narration track for the Agent Replay take.
 *
 * The replay is one continuous performance, not a set of Director shots, so there
 * is nothing to excise: the cut list is the take itself, trimmed only at the tail
 * once the console has finished and held on its own 48/48 total.
 *
 * Narration is written straight to absolute film seconds against the beats the
 * capture actually logged, and it deliberately does NOT narrate the play by play.
 * The agent console is already speaking every action on screen; a voice repeating
 * it would fight the picture. The voice carries the argument instead, and steps
 * aside for the beats that speak for themselves.
 *
 *   node scripts/film/build-replay.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const DIR = resolve(ROOT, 'video/public/film-replay')
const timeline = JSON.parse(readFileSync(resolve(DIR, 'timeline.json'), 'utf8'))
const rendered = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/narration-v3/narration-v3.json'), 'utf8'))
const durationOf = (id) => rendered.clips.find((clip) => clip.id === id)?.duration ?? 0
const fileOf = (id) => `film/narration-v3/${id}.wav`

/** Where the performance stops and the finished console just holds. */
const CONTENT_ENDS = Number(process.env.CONTENT_ENDS ?? 143.0)
/**
 * How long to hold the finished 48/48 console before the film ends.
 *
 * 9s left the picture frozen for 19.4s (12.7% of the runtime), the last 12.4s of it
 * without narration, because the replay stops moving before CONTENT_ENDS. Measure
 * where the picture actually freezes (ffmpeg freezedetect) and pass CONTENT_ENDS
 * from that; the hold is then only the deliberate beat on the end card.
 */
const HOLD = Number(process.env.HOLD ?? 3.0)
const FILM_SECONDS = CONTENT_ENDS + HOLD

// One span. The take needs no pans excised and no tails capped.
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

/**
 * Offsets are anchored to logged beats, not guessed: geometry completes at 61.3 s,
 * barycentric at 67.6 s, the parity box at 74.7 s, the erase-and-undo at 83.4-84.5 s,
 * simplex at 86.8 s, partitions at 94.4 s, the matrix at 102.7 s, and the
 * compatibility audit at 118.2-120.6 s.
 */
const plan = [
  ['01-what', 1.6],
  ['02-problem', 11.2],
  ['03-webmcp', 22.6],
  ['07-density', 33.0],
  ['08-bridge', 43.4],
  ['09-attention', 52.0],
  // The eight training clicks had no line, so the beat read as an animation
  // rather than as real gradient steps the learner is taking.
  ['10-training', 58.0],
  ['11-geometry', 66.0],
  ['12-barycentric', 70.4],
  ['13-parity-shape', 75.2],
  ['13b-parity-ink', 83.0],
  ['15-matrix', 103.2],
  ['16-isolation', 112.0],
  ['16b-map', 118.0],
  ['16c-undo', 126.0],
  ['17-close', 134.0],
  // Names the panel the closing shot reveals; without it the ledger is a
  // sidebar the viewer has never had explained. ABSOLUTE: the manifest appends this
  // beat after the replay, so it sits a fixed distance from the end of the take and
  // must not be stretched with the rest.
  ['18-ledger', 167.0, { absolute: true }],
]

/**
 * The offsets above were measured against a take whose action ran ~132s. Slowing the
 * replay down so each construction can be read stretches every beat, so the anchors
 * have to stretch with it or the voice drifts ahead of the picture. Pass the ratio of
 * the new action length to that reference: NARRATION_SCALE=1.26 for a ~166s take.
 */
const NARRATION_SCALE = Number(process.env.NARRATION_SCALE ?? 1)

const clips = []
let previousEnd = 0
const problems = []
for (const [id, rawWanted, options] of plan) {
  // A beat the manifest appends AFTER the replay (the closing ledger reveal) sits at a
  // fixed distance from the end of the take, not at a fixed fraction of it. Scaling it
  // with the rest pushed it past the end of the film entirely. Absolute anchors are
  // given in final film seconds and are never stretched.
  const wanted = options?.absolute ? rawWanted : rawWanted * NARRATION_SCALE
  const duration = durationOf(id)
  if (!duration) { problems.push(`${id}: no rendered audio`); continue }
  // Never let two clips talk at once; a clip may start late but never early.
  const offset = Math.max(wanted, previousEnd + 0.35)
  if (offset > wanted + 0.05) console.log(`  pushed ${id} ${(offset - wanted).toFixed(2)}s later`)
  clips.push({ shot: id, file: fileOf(id), duration, offset, text: rendered.clips.find((c) => c.id === id)?.text ?? '' })
  previousEnd = offset + duration
}
if (problems.length) { for (const problem of problems) console.error(`  ${problem}`); process.exit(1) }

writeFileSync(resolve(DIR, 'narration.json'), `${JSON.stringify({ source: 'replay', clips }, null, 2)}\n`)

const speech = clips.reduce((total, clip) => total + clip.duration, 0)
console.log(`film     ${FILM_SECONDS.toFixed(1)}s (${Math.floor(FILM_SECONDS / 60)}:${String(Math.round(FILM_SECONDS % 60)).padStart(2, '0')})`)
console.log(`speech   ${speech.toFixed(1)}s across ${clips.length} clips`)
console.log(`silence  ${(FILM_SECONDS - speech).toFixed(1)}s`)
console.log(`last word ends at ${previousEnd.toFixed(1)}s`)
if (previousEnd > FILM_SECONDS) console.error(`WARNING: narration runs ${(previousEnd - FILM_SECONDS).toFixed(1)}s past the film`)
if (FILM_SECONDS >= 180) console.error('WARNING: three minutes or longer')
