/**
 * Download the selected royalty-free Mixkit track and conform it to the measured
 * replay clock. The untouched source MP3 is cached in the film output directory;
 * provenance and license details live in music-stock.json.
 *
 *   FILM_DIR=video/public/film-replay node scripts/film/music-stock.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM_DIR = process.env.FILM_DIR ?? 'video/public/film'
const OUT = resolve(ROOT, FILM_DIR)
const SOURCE = JSON.parse(readFileSync(resolve(ROOT, 'scripts/film/music-stock.json'), 'utf8'))
const CUTLIST = JSON.parse(readFileSync(resolve(OUT, 'cutlist.json'), 'utf8'))
const NARRATION = JSON.parse(readFileSync(resolve(OUT, 'narration.json'), 'utf8'))
const RAW = resolve(OUT, 'music.stock.mp3')
const META = resolve(OUT, 'music.stock.json')
const WAV = resolve(OUT, 'music.wav')

const pictureEnd = Number(CUTLIST.filmSeconds)
const wordsEnd = Math.max(0, ...NARRATION.clips.map((clip) => Number(clip.offset) + Number(clip.duration)))
const seconds = Math.max(pictureEnd, wordsEnd) + 1.8
if (!Number.isFinite(seconds) || seconds < 3 || seconds > 600) throw new Error(`invalid film length ${seconds}`)

if (!existsSync(RAW)) {
  const response = await fetch(SOURCE.downloadUrl)
  if (!response.ok) throw new Error(`stock music download failed: HTTP ${response.status}`)
  writeFileSync(RAW, Buffer.from(await response.arrayBuffer()))
  console.log(`downloaded ${SOURCE.title} by ${SOURCE.artist}`)
} else {
  console.log(`reusing cached ${RAW}`)
}

// Use one continuous portion of the 4:22 source—no looping or abrupt joins. The
// source is gently filtered for speech, normalized, and given a resolved three-second
// exit under the brand lockup.
const fadeStart = Math.max(0, seconds - 3)
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', RAW,
  '-af', `atrim=duration=${seconds.toFixed(3)},asetpts=PTS-STARTPTS,highpass=f=45,lowpass=f=12500,afade=t=in:st=0:d=1.4,afade=t=out:st=${fadeStart.toFixed(3)}:d=3,loudnorm=I=-22:TP=-3:LRA=10`,
  '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', WAV,
], { stdio: 'inherit' })

writeFileSync(META, `${JSON.stringify({ ...SOURCE, conformedSeconds: Number(seconds.toFixed(3)) }, null, 2)}\n`)
console.log(`wrote ${WAV} (${seconds.toFixed(3)}s)`)
