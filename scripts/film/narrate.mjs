/**
 * Synthesises one narration clip per shot from `video/film.manifest.json`
 * with a Microsoft neural voice (edge-tts), measures each clip, and writes
 * `video/public/film/narration.json` for the Remotion composition.
 *
 *   node scripts/film/narrate.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const MANIFEST = JSON.parse(readFileSync(resolve(ROOT, 'video/film.manifest.json'), 'utf8'))
const OUT_DIR = resolve(ROOT, 'video/public/film/narration')
mkdirSync(OUT_DIR, { recursive: true })

const { voice, rate, pitch } = MANIFEST.narration
const clips = []
for (const [index, shot] of MANIFEST.shots.entries()) {
  const base = `${String(index + 1).padStart(2, '0')}-${shot.id}`
  const mp3 = resolve(OUT_DIR, `${base}.mp3`)
  const wav = resolve(OUT_DIR, `${base}.wav`)
  const key = JSON.stringify({ voice, rate, pitch, text: shot.narration })
  const stamp = resolve(OUT_DIR, `${base}.json`)
  const fresh = existsSync(stamp) && readFileSync(stamp, 'utf8') === key && existsSync(wav)
  if (!fresh) {
    execFileSync('python', ['-m', 'edge_tts', '--voice', voice, '--rate', rate, '--pitch', pitch, '--text', shot.narration, '--write-media', mp3], { stdio: 'inherit' })
    // Trim leading/trailing silence and normalise to a consistent spoken level.
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,loudnorm=I=-18:TP=-2:LRA=9', '-ar', '48000', '-ac', '1', wav], { stdio: 'inherit' })
    writeFileSync(stamp, key)
  }
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString().trim())
  const words = shot.narration.split(/\s+/).length
  const fit = duration <= shot.seconds - 0.4 ? 'fits' : `OVER by ${(duration - shot.seconds + 0.4).toFixed(1)}s`
  console.log(`${base.padEnd(24)} ${duration.toFixed(2).padStart(6)}s of ${String(shot.seconds).padStart(3)}s  ${String(words).padStart(3)} words  ${fit}`)
  clips.push({ shot: shot.id, file: `film/narration/${base}.wav`, duration, offset: shot.narrationOffset ?? 0.3, text: shot.narration })
}
writeFileSync(resolve(ROOT, 'video/public/film/narration.json'), JSON.stringify({ voice, rate, pitch, clips }, null, 2))
console.log('wrote video/public/film/narration.json')
