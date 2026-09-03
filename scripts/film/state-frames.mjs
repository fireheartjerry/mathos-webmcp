/**
 * Extracts a frame for every distinct STATE of the film, not a fixed sample.
 *
 * Thirteen shot frames is far too coarse: a single shot performs several commits,
 * and each one changes what is on screen. The capture already records every commit
 * in `timeline.json` as an event with a timestamp, so the state changes are known
 * exactly rather than guessed at.
 *
 * For each event this takes the frame a beat AFTER it lands, once the app has
 * settled -- mid-animation frames lie, and chasing them has already cost this build
 * real time. Shot begin and end states are included too. Frames that are
 * near-identical to the one before are dropped, so a reviewer sees each distinct
 * picture once instead of sixty copies of the same one.
 *
 * Event times are in the raw take's clock; the film is cut, so each is mapped
 * through `cutlist.json` and any event inside an excised pan is discarded.
 *
 *   node scripts/film/state-frames.mjs [--settle=0.7] [--distinct=3.0]
 */
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM = resolve(ROOT, 'video/out/mathburst-final.mp4')
const OUT = resolve(ROOT, '.film/states')
const arg = (name, fallback) => {
  const found = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return found ? Number(found.slice(name.length + 3)) : fallback
}
/** How long after an event the app has settled. */
const SETTLE = arg('settle', 0.7)
/** Mean pixel difference below which two frames are "the same picture". */
const DISTINCT = arg('distinct', 3.0)

if (!existsSync(FILM)) throw new Error(`missing ${FILM} -- render first`)
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const timeline = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/timeline.json'), 'utf8'))
const cutlist = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/cutlist.json'), 'utf8'))
const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', FILM]).toString().trim())

/** Raw-take seconds -> film seconds, or null when the moment was cut out. */
const toFilm = (raw) => {
  for (const shot of cutlist.shots) {
    if (raw >= shot.srcStart && raw <= shot.srcEnd) return shot.filmStart + (raw - shot.srcStart)
  }
  return null
}
const shotAt = (film) => cutlist.shots.find((s) => film >= s.filmStart && film < s.filmEnd)?.id ?? '?'

// Every moment worth a frame: each shot's settled begin and end, and each commit.
const wanted = []
for (const shot of cutlist.shots) {
  wanted.push({ at: shot.filmStart + SETTLE, kind: 'shot-begin', label: shot.id })
  const endAt = shot.filmEnd - (shot.transitionSeconds ?? 0) - 0.35
  if (endAt > shot.filmStart + SETTLE + 0.5) wanted.push({ at: endAt, kind: 'shot-end', label: shot.id })
}
for (const event of timeline.events ?? []) {
  if (event.kind !== 'tutor' && event.kind !== 'human') continue
  const film = toFilm(event.t + SETTLE)
  if (film === null) continue
  wanted.push({ at: film, kind: event.kind, label: String(event.label ?? '').slice(0, 70) })
}

wanted.sort((left, right) => left.at - right.at)

const grab = (seconds, name) => {
  const file = resolve(OUT, `${name}.jpg`)
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, Math.min(seconds, duration - 0.05))), '-i', FILM, '-frames:v', '1', '-q:v', '3', '-y', file])
  return file
}
const difference = (left, right) => {
  const command = `ffmpeg -v info -i "${left}" -i "${right}" -filter_complex "[0:v][1:v]blend=all_mode=difference,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1`
  const match = /YAVG=([\d.]+)/.exec(execSync(command, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }))
  return match ? Number(match[1]) : 999
}

const kept = []
let previous = null
let index = 0
for (const moment of wanted) {
  if (moment.at < 0 || moment.at >= duration) continue
  // Two frames closer than a third of a second cannot show meaningfully different states.
  if (previous && moment.at - previous.at < 0.34) continue
  const name = `s${String(index).padStart(3, '0')}_${shotAt(moment.at)}`
  const file = grab(moment.at, name)
  if (previous && difference(previous.file, file) < DISTINCT) {
    rmSync(file, { force: true })
    continue
  }
  kept.push({ index, at: +moment.at.toFixed(2), shot: shotAt(moment.at), kind: moment.kind, label: moment.label, file: `${name}.jpg` })
  previous = { at: moment.at, file }
  index += 1
}

writeFileSync(resolve(OUT, 'states.json'), JSON.stringify({ duration, settle: SETTLE, distinct: DISTINCT, frames: kept }, null, 2))
console.log(`${wanted.length} candidate moments -> ${kept.length} distinct states`)
for (const frame of kept) console.log(`  ${String(frame.at).padStart(7)}s  ${frame.shot.padEnd(20)} ${frame.kind.padEnd(11)} ${frame.label}`)
console.log(`\nframes in ${OUT}`)
