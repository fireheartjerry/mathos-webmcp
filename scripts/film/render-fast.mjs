/** Render the measured cut directly with FFmpeg for time-critical delivery. */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('.')
const publicDir = resolve(root, 'video/public')
const filmDir = process.env.FILM_DIR ? process.env.FILM_DIR.replace(/^video\/public\//, '') : 'film'
const capture = resolve(publicDir, `${filmDir}/capture.mp4`)
const cutlist = JSON.parse(readFileSync(resolve(publicDir, `${filmDir}/cutlist.json`), 'utf8'))
const narration = JSON.parse(readFileSync(resolve(publicDir, `${filmDir}/narration.json`), 'utf8'))
const manifest = JSON.parse(readFileSync(resolve(root, process.env.FILM_MANIFEST ?? 'video/film.manifest.json'), 'utf8'))
const output = process.argv[2] ?? resolve(process.env.USERPROFILE, 'Downloads/MathBurst-WebMCP-Challenge-Final.mp4')

const lastWord = Math.max(...narration.clips.map((clip) => clip.offset + clip.duration))
const filmSeconds = Math.max(cutlist.filmSeconds, lastWord) + 1.6
const filters = []

for (const [index, shot] of cutlist.shots.entries()) {
  filters.push(
    `[0:v]trim=start=${shot.srcStart}:end=${shot.srcEnd},` +
    `setpts=(PTS-STARTPTS)/${shot.playbackRate ?? 1}[v${index}]`,
  )
}
filters.push(`${cutlist.shots.map((_, index) => `[v${index}]`).join('')}concat=n=${cutlist.shots.length}:v=1:a=0[vjoined]`)
const hold = Math.max(0, filmSeconds - cutlist.filmSeconds)
filters.push(`[vjoined]tpad=stop_mode=clone:stop_duration=${hold},trim=duration=${filmSeconds},setpts=PTS-STARTPTS[vout]`)

for (const [index, clip] of narration.clips.entries()) {
  filters.push(`[${index + 3}:a]adelay=${Math.round(clip.offset * 1000)}:all=1,volume=${Math.pow(10, (manifest.narration.gainDb ?? 0) / 20)}[n${index}]`)
}
filters.push(`${narration.clips.map((_, index) => `[n${index}]`).join('')}amix=inputs=${narration.clips.length}:duration=longest:normalize=0:dropout_transition=0[voice]`)
// sidechaincompress ends with its SHORTEST input, so an unpadded voice chain cut
// the music dead at the last word (136.6s) and left the closing hold in silence.
filters.push('[voice]asplit=2[voice_key_raw][voice_mix]')
filters.push(`[voice_key_raw]apad=whole_dur=${filmSeconds.toFixed(3)}[voice_sidechain]`)
filters.push(`[1:a]volume=${Math.pow(10, (manifest.music.gainDb ?? -16) / 20)}[music]`)
filters.push('[music][voice_sidechain]sidechaincompress=threshold=0.018:ratio=8:attack=80:release=350[music_ducked]')
filters.push('[2:a]volume=0.9[sfx]')
filters.push('[music_ducked][sfx][voice_mix]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.95[aout]')

const inputs = [capture, resolve(publicDir, `${filmDir}/music.wav`), resolve(publicDir, `${filmDir}/sfx.wav`)]
for (const clip of narration.clips) inputs.push(resolve(publicDir, clip.file))
for (const file of inputs) if (!existsSync(file)) throw new Error(`missing input: ${file}`)

const args = ['-y']
for (const input of inputs) args.push('-i', input)
args.push(
  '-filter_complex', filters.join(';'),
  '-map', '[vout]', '-map', '[aout]',
  '-t', filmSeconds.toFixed(3),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-r', String(manifest.output.fps),
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart',
  output,
)

console.log(`rendering ${filmSeconds.toFixed(2)}s master to ${output}`)
const result = spawnSync('ffmpeg', args, { stdio: 'inherit', windowsHide: true })
if (result.status !== 0) process.exit(result.status ?? 1)
