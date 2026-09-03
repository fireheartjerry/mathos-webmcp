/**
 * Joins the narration spec to the film manifest and writes what Remotion reads.
 *
 * Three files used to disagree about the words: the manifest carried a `narration`
 * string per shot, `narration-v2.json` carried another wording, and the composition
 * actually played neither -- it read `public/film/narration.json`, written by the
 * edge-tts `narrate.mjs`. So the ElevenLabs voice that was chosen never reached the
 * render.
 *
 * Now `narration-v3.json` owns the words and names the shot each clip plays over;
 * the manifest owns timing, steps and camera; and this step resolves clip offsets
 * into the absolute film timeline and emits the `{shot, file, duration, offset,
 * text}` shape `Film.tsx` already expects. Nothing in the composition changes.
 *
 *   node scripts/film/build-narration-manifest.mjs [--spec=narration-v3]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const SPEC_NAME = (process.argv.slice(2).find((arg) => arg.startsWith('--spec=')) ?? '--spec=narration-v3').slice(7)
const MANIFEST_FILE = resolve(ROOT, 'video/film.manifest.json')
const RENDERED_FILE = resolve(ROOT, `video/public/film/${SPEC_NAME}/${SPEC_NAME}.json`)
const OUT_FILE = resolve(ROOT, 'video/public/film/narration.json')

if (!existsSync(RENDERED_FILE)) {
  throw new Error(`missing ${RENDERED_FILE} -- run: node scripts/film/narrate-eleven.mjs --spec=${SPEC_NAME}`)
}

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rendered = JSON.parse(readFileSync(RENDERED_FILE, 'utf8'))

/**
 * Shot starts come from the MEASURED take when one exists, never from the manifest's
 * budgets. Steps overrun -- a cue that waits for the app to settle takes as long as it
 * takes -- so the budgets are a plan and `timeline.json` is what actually happened. The
 * composition derives its own length from the timeline too, so timing narration against
 * the budgets would drift it further ahead of the picture with every overrun.
 */
/** Kept in step with TAIL_SECONDS in video/src/Film.tsx. */
const TAIL_SECONDS = 1.6

const CUTLIST_FILE = resolve(ROOT, 'video/public/film/cutlist.json')
const TIMELINE_FILE = resolve(ROOT, 'video/public/film/timeline.json')
const cutlist = existsSync(CUTLIST_FILE) ? JSON.parse(readFileSync(CUTLIST_FILE, 'utf8')) : null
const timeline = !cutlist && existsSync(TIMELINE_FILE) ? JSON.parse(readFileSync(TIMELINE_FILE, 'utf8')) : null
const shotStart = new Map()
let cursor = 0
if (cutlist?.shots?.length) {
  // The cut list is the finished film's clock: pans excised, transitions overlapped.
  // Timing against the raw take instead would drift the words later than the picture
  // by however much was cut out ahead of them.
  for (const shot of cutlist.shots) shotStart.set(shot.id, shot.filmStart)
  // Film.tsx holds the closing lockup for TAIL_SECONDS after the last shot, so that
  // time is part of the film and available to the closing line.
  cursor = cutlist.filmSeconds + TAIL_SECONDS
  console.log(`timing against the cut film (${cutlist.filmSeconds.toFixed(1)}s + ${TAIL_SECONDS}s tail)`)
} else if (timeline?.shots?.length) {
  const first = timeline.shots[0].start
  for (const shot of timeline.shots) shotStart.set(shot.id, shot.start - first)
  cursor = timeline.shots.at(-1).end - first
  console.log(`timing against the raw take (${cursor.toFixed(1)}s)`)
} else {
  for (const shot of manifest.shots) {
    shotStart.set(shot.id, cursor)
    cursor += shot.seconds
  }
  console.log(`no timeline.json yet -- timing against manifest budgets (${cursor}s)`)
}
const filmSeconds = cursor

/** Never let two clips talk at once; a clip may start late but never early. */
const MIN_GAP = 0.32

const problems = []
const clips = []
let previousEnd = 0
// Order by where each clip lands in the FILM, not by its order in the spec. The two
// disagree: 11-geometry is bound to the homothety shot, which the manifest plays
// after barycentrics, so reading the spec array in order would push 12-barycentric
// twenty seconds late to clear a clip that actually comes after it.
const ordered = [...rendered.clips].sort((left, right) =>
  ((shotStart.get(left.shot) ?? 0) + (left.offset ?? 0)) - ((shotStart.get(right.shot) ?? 0) + (right.offset ?? 0)))
for (const clip of ordered) {
  if (!clip.shot) { problems.push(`${clip.id}: no shot binding`); continue }
  if (!shotStart.has(clip.shot)) { problems.push(`${clip.id}: shot "${clip.shot}" is not in the manifest`); continue }
  // The spec's offset is where the clip WANTS to start. Two clips overlapping is
  // unlistenable, so the later one is pushed rather than trusted -- the spec stays
  // readable as intent and the invariant is enforced here instead of by hand-tuning
  // seventeen numbers every time a shot length changes.
  const desired = shotStart.get(clip.shot) + (clip.offset ?? 0)
  const start = Math.max(desired, previousEnd + MIN_GAP)
  if (start - desired > 0.01) console.log(`  pushed ${clip.id} ${(start - desired).toFixed(2)}s later to clear ${clips.at(-1)?.shot ?? 'the previous clip'}`)
  previousEnd = start + clip.duration
  clips.push({ shot: clip.id, file: clip.file, duration: clip.duration, offset: start, text: clip.text, overShot: clip.shot })
}

// The closing lockup holds the last frame, so a final line that runs past the last
// shot lengthens the film rather than getting cut off; Film.tsx measures its tail
// from the last WORD for exactly this reason. The only hard limit is the rules'
// three minutes, so that is what this checks.
const filmEnd = Math.max(filmSeconds, previousEnd + TAIL_SECONDS)
const overrun = filmEnd - manifest.output.maxSeconds
if (overrun > 0) problems.push(`film runs ${overrun.toFixed(2)}s past the ${manifest.output.maxSeconds}s limit -- cut words or a shot`)
if (previousEnd > filmSeconds) console.log(`closing line runs ${(previousEnd - filmSeconds).toFixed(2)}s past the last shot; the lockup holds to ${filmEnd.toFixed(1)}s`)

if (problems.length) {
  console.error('narration does not fit the manifest:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const speech = clips.reduce((total, clip) => total + clip.duration, 0)
writeFileSync(OUT_FILE, JSON.stringify({
  source: `scripts/film/${SPEC_NAME}.json`,
  voiceId: rendered.voiceId,
  model: rendered.model,
  clips,
}, null, 2))

console.log(`film      ${filmSeconds}s = ${Math.floor(filmSeconds / 60)}:${String(filmSeconds % 60).padStart(2, '0')}`)
console.log(`speech    ${speech.toFixed(2)}s across ${clips.length} clips`)
console.log(`silence   ${(filmSeconds - speech).toFixed(1)}s`)
console.log(`last word ends at ${(clips.at(-1).offset + clips.at(-1).duration).toFixed(1)}s`)
console.log(`wrote ${OUT_FILE}`)
