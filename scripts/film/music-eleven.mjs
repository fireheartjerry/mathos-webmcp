/**
 * Generate the Agent Replay score with ElevenLabs Music, then conform it to the
 * measured film clock. The raw response is cached by prompt + duration so rerunning
 * the render does not spend music credits again.
 *
 *   FILM_DIR=video/public/film-replay node scripts/film/music-eleven.mjs
 *   FILM_DIR=video/public/film-replay node scripts/film/music-eleven.mjs --dry-run
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM_DIR = process.env.FILM_DIR ?? 'video/public/film'
const OUT = resolve(ROOT, FILM_DIR)
const ENV_FILE = resolve(ROOT, '.env.film')
const CUTLIST = resolve(OUT, 'cutlist.json')
const NARRATION = resolve(OUT, 'narration.json')
const RAW = resolve(OUT, 'music.elevenlabs.mp3')
const META = resolve(OUT, 'music.elevenlabs.json')
const WAV = resolve(OUT, 'music.wav')
const DRY_RUN = process.argv.includes('--dry-run')

const PROMPT = [
  'Original instrumental underscore for a polished product film about a shared infinite canvas for mathematics and AI collaboration.',
  'Modern chamber-electronic minimalism: warm felt piano, soft analog synth, delicate mallet and glass plucks, subtle low pulse, spacious stereo field.',
  'Intelligent, precise, optimistic, tactile, and quietly cinematic. Moderate tempo around 84 BPM. Clear evolving harmony and memorable restrained motif.',
  'Narrative arc: curious and sparse opening; growing momentum through live graphs and attention; thoughtful middle; playful tactile lift for geometry and undo; confident elegant rise into the final matrix; warm resolved cadence for the brand lockup.',
  'Background score under narration: no vocals, no spoken words, no dominant drums, no trailer booms, no comedy, no abrupt genre changes, no abrupt ending. Leave the final three seconds fully resolved and nearly silent.',
].join(' ')

function loadApiKey() {
  if (!existsSync(ENV_FILE)) throw new Error('missing .env.film at the repo root')
  for (const raw of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0 || line.slice(0, eq).trim().replace(/^export\s+/, '') !== 'ELEVENLABS_API_KEY') continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (value) return value
  }
  throw new Error('ELEVENLABS_API_KEY not found in .env.film')
}

function filmSeconds() {
  const cutlist = JSON.parse(readFileSync(CUTLIST, 'utf8'))
  const narration = JSON.parse(readFileSync(NARRATION, 'utf8'))
  const pictureEnd = Number(cutlist.filmSeconds)
  const wordsEnd = Math.max(0, ...narration.clips.map((clip) => Number(clip.offset) + Number(clip.duration)))
  const seconds = Math.max(pictureEnd, wordsEnd) + 1.8
  if (!Number.isFinite(seconds) || seconds < 3 || seconds > 600) throw new Error(`invalid music length ${seconds}`)
  return seconds
}

function conform(seconds) {
  const fadeStart = Math.max(0, seconds - 3)
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', RAW,
    '-af', `apad,atrim=duration=${seconds.toFixed(3)},afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeStart.toFixed(3)}:d=3,loudnorm=I=-22:TP=-3:LRA=11`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', WAV,
  ], { stdio: 'inherit' })
}

async function main() {
  const seconds = filmSeconds()
  const musicLengthMs = Math.round(seconds * 1000)
  const fingerprint = createHash('sha256').update(JSON.stringify({ PROMPT, musicLengthMs, model: 'music_v2' })).digest('hex').slice(0, 16)
  console.log(`ElevenLabs Music: ${(musicLengthMs / 1000).toFixed(3)}s, fingerprint ${fingerprint}`)
  if (DRY_RUN) return

  let cached = false
  if (existsSync(RAW) && existsSync(META)) {
    try { cached = JSON.parse(readFileSync(META, 'utf8')).fingerprint === fingerprint } catch { cached = false }
  }

  if (!cached) {
    const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192', {
      method: 'POST',
      headers: { 'xi-api-key': loadApiKey(), 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: PROMPT, music_length_ms: musicLengthMs, model_id: 'music_v2', force_instrumental: true }),
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800)
      throw new Error(`ElevenLabs Music HTTP ${response.status}: ${detail}`)
    }
    writeFileSync(RAW, Buffer.from(await response.arrayBuffer()))
    writeFileSync(META, `${JSON.stringify({
      provider: 'ElevenLabs Music', model: 'music_v2', fingerprint, musicLengthMs,
      songId: response.headers.get('song-id'), prompt: PROMPT,
    }, null, 2)}\n`)
    console.log(`generated ${RAW}`)
  } else {
    console.log(`reusing cached ${RAW}`)
  }

  conform(seconds)
  console.log(`wrote conformed ${WAV}`)
}

await main()
