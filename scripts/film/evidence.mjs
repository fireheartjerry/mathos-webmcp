/**
 * Produces the evidence an independent scorer needs but cannot generate itself:
 * frames across every transition, frames at each narration clip's start and end,
 * frames at each shot's midpoint, and the measurements the gates ask for.
 *
 * The scorer judges; this only gathers. Keeping the split honest is why the score
 * is worth anything -- a scorer that cannot decode video would otherwise mark every
 * visual criterion zero and look exactly like a plateau.
 *
 *   node scripts/film/evidence.mjs [--out .film/evidence]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM = resolve(ROOT, 'video/out/mathburst-final.mp4')
const OUT = resolve(ROOT, (process.argv.find((a) => a.startsWith('--out=')) ?? '--out=.film/evidence').slice(6))
if (!existsSync(FILM)) throw new Error(`missing ${FILM}`)
mkdirSync(OUT, { recursive: true })

const cutlist = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/cutlist.json'), 'utf8'))
const narration = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/narration.json'), 'utf8'))

const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', FILM]).toString().trim())

const grab = (seconds, name) => {
  const file = resolve(OUT, `${name}.jpg`)
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, Math.min(seconds, duration - 0.05))), '-i', FILM, '-frames:v', '1', '-vf', 'scale=760:-1', '-y', file])
  return file
}

const strip = (files, name) => {
  const args = ['-v', 'error', '-y']
  for (const file of files) args.push('-i', file)
  args.push('-filter_complex', `hstack=inputs=${files.length}`, resolve(OUT, `${name}.jpg`))
  execFileSync('ffmpeg', args)
}

const index = { duration, transitions: [], shots: [], clips: [] }

for (const shot of cutlist.shots.filter((s) => s.transitionSeconds > 0)) {
  const at = shot.filmEnd - shot.transitionSeconds
  const files = [0, 0.25, 0.5, 0.75, 1].map((f, i) => grab(at + shot.transitionSeconds * f, `t_${shot.id}_${i}`))
  strip(files, `transition_${shot.id}`)
  index.transitions.push({ id: shot.id, kind: shot.kind, at: +at.toFixed(2), seconds: shot.transitionSeconds, strip: `transition_${shot.id}.jpg` })
}

for (const shot of cutlist.shots) {
  const mid = shot.filmStart + (shot.filmEnd - shot.filmStart) / 2
  grab(mid, `shot_${shot.id}`)
  index.shots.push({ id: shot.id, at: +mid.toFixed(2), frame: `shot_${shot.id}.jpg`, seconds: shot.seconds })
}

for (const clip of narration.clips) {
  grab(clip.offset + 0.3, `clip_${clip.shot}_start`)
  grab(clip.offset + clip.duration - 0.3, `clip_${clip.shot}_end`)
  index.clips.push({ id: clip.shot, overShot: clip.overShot, start: +clip.offset.toFixed(2), end: +(clip.offset + clip.duration).toFixed(2), text: clip.text, frames: [`clip_${clip.shot}_start.jpg`, `clip_${clip.shot}_end.jpg`] })
}

// Gate measurements the scorer would otherwise have to guess at.
const paths = narration.clips.map((c) => c.file)
index.gates = {
  G1_runtime_seconds: +duration.toFixed(2),
  G1_pass: duration < 180,
  G3_all_v3_paths: paths.every((p) => p.includes('narration-v3/')),
  G3_sample_path: paths[0],
}
writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log(`duration ${duration.toFixed(2)}s | ${index.transitions.length} transition strips | ${index.shots.length} shot frames | ${index.clips.length} clip pairs`)
console.log(`wrote ${OUT}`)
