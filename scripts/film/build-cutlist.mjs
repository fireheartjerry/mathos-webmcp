/**
 * Turns the measured take into a cut list: which span of `capture.mp4` each shot
 * uses, where it sits in the finished film, and what transition joins it to the next.
 *
 * The composition used to play the capture straight through, so what a viewer saw
 * between two scenes was the app's own camera panning across empty canvas. That is
 * not a transition, it is dead air with movement in it -- and across twelve shot
 * boundaries it cost about eighteen seconds of a film with a three-minute ceiling.
 *
 * A `camera` boundary is a plain move, so its pan is excised: the outgoing shot ends
 * on settled content and the incoming shot begins on settled content, joined by a
 * designed push. A `bridge` boundary is different -- there the product animates a
 * real match between two representations, which is the best content in the film -- so
 * its span is kept whole and only softened at the seam.
 *
 * Both the composition and the narration builder read the result, so the picture and
 * the words cannot disagree about when a shot starts.
 *
 *   node scripts/film/build-cutlist.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const TIMELINE_FILE = resolve(ROOT, 'video/public/film/timeline.json')
const MANIFEST_FILE = resolve(ROOT, 'video/film.manifest.json')
const OUT_FILE = resolve(ROOT, 'video/public/film/cutlist.json')

if (!existsSync(TIMELINE_FILE)) throw new Error(`missing ${TIMELINE_FILE} -- run scripts/film/capture.mjs first`)

const timeline = JSON.parse(readFileSync(TIMELINE_FILE, 'utf8'))
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))

/**
 * How long each kind of join takes, and how much of the outgoing shot it overlaps.
 * Both are zero: the film cuts straight between shots. An overlap only exists to give
 * a transition something to blend across, and there is no transition any more, so a
 * non-zero value here would silently eat the end of every outgoing shot instead.
 */
const TRANSITION = {
  camera: 0,
  bridge: 0,
}
/** Never cut a shot shorter than this, however aggressive the excision maths gets. */
const MIN_SHOT_SECONDS = 1.6
/** The app's camera travel (760ms) plus its arrival settle -- the span worth skipping. */
const PAN_SECONDS = 0.95

/**
 * How much speech each shot carries, so a shot can be capped at what it actually
 * needs. Step timing overruns -- a cue waits for the app to settle and takes as
 * long as it takes -- and those overruns land on shots that were already holding.
 * Capping the tail is far cheaper than re-capturing, and the tail of an over-long
 * shot is a hold, not an action.
 */
const spec = JSON.parse(readFileSync(resolve(ROOT, 'scripts/film/narration-v3.json'), 'utf8'))
const speechByShot = new Map()
for (const clip of spec.clips) {
  if (!clip.shot) continue
  const rendered = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/narration-v3/narration-v3.json'), 'utf8'))
  const duration = rendered.clips.find((c) => c.id === clip.id)?.duration ?? 0
  speechByShot.set(clip.shot, Math.max(speechByShot.get(clip.shot) ?? 0, (clip.offset ?? 0) + duration))
}
/**
 * Room after a shot's last word. Generous on purpose: the narration usually stops
 * before the action does -- the training shot says its line while the learner is
 * still clicking through eight gradient steps -- so capping tight to the speech
 * would cut content, not padding.
 */
const TAIL_ROOM = 3.2
/** Never remove more than this share of a shot; beyond it we are cutting the beat. */
const MAX_TRIM_SHARE = 0.34
/**
 * The browser waits for real reducer commits and camera settles during capture, so
 * the measured take is intentionally slower than the finished film. A modest global
 * speed-up preserves every captured action while recovering the time those waits add.
 * Narration is mixed separately at normal speed.
 */
const PLAYBACK_RATE = 1.2

const shots = []
for (let index = 0; index < timeline.shots.length; index += 1) {
  const shot = timeline.shots[index]
  const next = timeline.shots[index + 1]
  const kind = shot.transitionOut === 'bridge' ? 'bridge' : shot.transitionOut === 'end' ? 'end' : 'camera'

  // The pan runs at the HEAD of the incoming shot, not the tail of the outgoing one:
  // previewNext fires at the boundary and the camera is still travelling while the
  // next shot's first steps begin. So a camera join skips the arriving shot's first
  // moments, where the picture is a canvas sliding past. A bridge join keeps them --
  // there the movement is a real match between two representations.
  const previous = timeline.shots[index - 1]
  const arrivesFromCamera = previous && previous.transitionOut !== 'bridge' && previous.transitionOut !== 'end'
  // The capture's first shot can be logged at -0.0; a negative source frame is not a thing.
  let srcStart = Math.max(0, shot.start)
  if (arrivesFromCamera) srcStart = Math.min(shot.start + PAN_SECONDS, shot.end - MIN_SHOT_SECONDS)

  // Cap the tail at what this shot's own narration needs.
  let srcEnd = shot.end
  const needs = speechByShot.get(shot.id)
  if (needs !== undefined) {
    const measured = shot.end - srcStart
    const cap = srcStart + Math.max(MIN_SHOT_SECONDS, needs + TAIL_ROOM, measured * (1 - MAX_TRIM_SHARE))
    if (cap < srcEnd) srcEnd = cap
  }

  shots.push({
    id: shot.id,
    title: shot.title,
    srcStart,
    srcEnd,
    kind,
    playbackRate: PLAYBACK_RATE,
    excised: +(srcStart - shot.start).toFixed(3),
    trimmed: +(shot.end - srcEnd).toFixed(3),
  })
}

// Lay the segments out with each transition overlapping the two shots it joins.
let cursor = 0
for (let index = 0; index < shots.length; index += 1) {
  const shot = shots[index]
  shot.filmStart = +cursor.toFixed(3)
  shot.seconds = +((shot.srcEnd - shot.srcStart) / shot.playbackRate).toFixed(3)
  shot.filmEnd = +(shot.filmStart + shot.seconds).toFixed(3)
  const overlap = index < shots.length - 1 ? (TRANSITION[shot.kind] ?? 0) : 0
  shot.transitionSeconds = overlap
  cursor = shot.filmEnd - overlap
}

const filmSeconds = +shots.at(-1).filmEnd.toFixed(3)
const rawSeconds = +(timeline.shots.at(-1).end - timeline.shots[0].start).toFixed(3)
const excised = +shots.reduce((total, shot) => total + shot.excised, 0).toFixed(1)
const trimmed = +shots.reduce((total, shot) => total + (shot.trimmed ?? 0), 0).toFixed(1)
const overlapped = +shots.reduce((total, shot) => total + shot.transitionSeconds, 0).toFixed(1)

writeFileSync(OUT_FILE, JSON.stringify({ filmSeconds, rawSeconds, excised, overlapped, shots }, null, 2))

console.log(`raw take     ${rawSeconds.toFixed(1)}s`)
console.log(`pans excised ${excised.toFixed(1)}s across ${shots.filter((shot) => shot.excised > 0.05).length} camera joins`)
console.log(`tails capped ${trimmed.toFixed(1)}s to what each shot's narration needs`)
console.log(`overlap      ${overlapped.toFixed(1)}s across ${shots.filter((shot) => shot.transitionSeconds > 0).length} transitions`)
console.log(`film         ${filmSeconds.toFixed(1)}s = ${Math.floor(filmSeconds / 60)}:${String(Math.round(filmSeconds % 60)).padStart(2, '0')}`)
if (filmSeconds >= 180) console.error('WARNING: the film is three minutes or longer, which the rules do not allow')
console.log(`wrote ${OUT_FILE}`)
