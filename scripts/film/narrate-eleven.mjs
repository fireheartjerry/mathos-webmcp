/**
 * Narration v2 for the Mathburst film, synthesised with ElevenLabs.
 *
 *   node scripts/film/narrate-eleven.mjs --list-voices   # account + premade library voices
 *   node scripts/film/narrate-eleven.mjs --dry-run       # print the plan, no API calls
 *   node scripts/film/narrate-eleven.mjs                 # synthesise changed clips only
 *
 * Reads `scripts/film/narration-v2.json` ({ voiceId, model, settings, clips }),
 * posts each clip to /v1/text-to-speech/{voiceId} as mp3_44100_128, caches the
 * mp3 by a hash of (text, voice, model, settings), converts to 48 kHz mono WAV
 * with leading/trailing silence trimmed and loudness at -18 LUFS (same chain as
 * narrate.mjs), and writes `video/public/film/narration-v2/<id>.wav` plus
 * `video/public/film/narration-v2/narration-v2.json` with measured durations.
 *
 * The API key is read from `.env.film` at the repo root (ELEVENLABS_API_KEY=...)
 * and is never printed.  Node >= 22, no dependencies beyond ffmpeg/ffprobe.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const ENV_FILE = resolve(ROOT, '.env.film')
const SPEC_FILE = resolve(ROOT, 'scripts/film/narration-v2.json')
const OUT_DIR = resolve(ROOT, 'video/public/film/narration-v2')
const CACHE_DIR = resolve(OUT_DIR, '.cache')
const API = 'https://api.elevenlabs.io'
const PRIMARY_MODEL = 'eleven_v3'
const FALLBACK_MODEL = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
const FFMPEG_FILTER = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,loudnorm=I=-18:TP=-2:LRA=9'

const args = new Set(process.argv.slice(2))
const list_voices = args.has('--list-voices')
const dry_run = args.has('--dry-run')

function loadApiKey() {
  if (!existsSync(ENV_FILE)) throw new Error('missing .env.film at the repo root (ELEVENLABS_API_KEY=...)')
  for (const raw of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const name = line.slice(0, eq).trim().replace(/^export\s+/, '')
    if (name !== 'ELEVENLABS_API_KEY') continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (value) return value
  }
  throw new Error('ELEVENLABS_API_KEY not found in .env.film')
}

async function api(path, { method = 'GET', body, key } = {}) {
  return fetch(`${API}${path}`, {
    method,
    headers: { 'xi-api-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function readError(res) {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const detail = json.detail ?? json
    return typeof detail === 'string' ? detail : JSON.stringify(detail)
  } catch {
    return text.slice(0, 400)
  }
}

function labelLine(voice) {
  const l = voice.labels ?? {}
  return [l.gender, l.accent, l.age, l.use_case ?? l.usecase, l.description ?? l.descriptive].filter(Boolean).join(' / ')
}

async function listVoices(key) {
  console.log('== Account voices (/v1/voices) ==')
  const res = await api('/v1/voices', { key })
  if (!res.ok) {
    console.log(`  HTTP ${res.status}: ${await readError(res)}`)
  } else {
    const { voices = [] } = await res.json()
    for (const v of voices) console.log(`  ${v.name.padEnd(22)} ${v.voice_id}  [${v.category ?? '?'}]  ${labelLine(v)}`)
    console.log(`  (${voices.length} voices)`)
  }
  console.log('\n== Library voices (/v1/shared-voices, male, English) ==')
  const shared = await api('/v1/shared-voices?page_size=60&gender=male&language=en&sort=trending', { key })
  if (!shared.ok) {
    console.log(`  HTTP ${shared.status}: ${await readError(shared)}`)
  } else {
    const { voices = [] } = await shared.json()
    for (const v of voices) {
      const l = [v.gender, v.accent, v.age, v.use_case, v.descriptive].filter(Boolean).join(' / ')
      console.log(`  ${String(v.name).padEnd(22)} ${v.voice_id}  ${l}`)
    }
    console.log(`  (${voices.length} voices)`)
  }
  console.log('\nPick a premade male, low, calm, clearly articulated English voice; record the choice in narration-v2.json and FILM_REPRODUCTION.md.')
}

function clipHash(clip, voiceId, model, settings) {
  return createHash('sha256').update(JSON.stringify({ text: clip.text, voiceId, model, settings })).digest('hex').slice(0, 16)
}

/** v3 audio tags like [calm] are spoken literally by older models: strip them there. */
function textForModel(text, model) {
  return model === PRIMARY_MODEL ? text : text.replace(/\[[a-z ]+\]\s*/gi, '').replace(/\s{2,}/g, ' ').trim()
}

async function synthesise({ key, voiceId, model, settings, clip }) {
  const body = { text: textForModel(clip.text, model), model_id: model, voice_settings: settings }
  const res = await api(`/v1/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, { method: 'POST', body, key })
  if (!res.ok) return { ok: false, status: res.status, message: await readError(res) }
  const bytes = Buffer.from(await res.arrayBuffer())
  const header = res.headers.get('x-character-count')
  return { ok: true, bytes, characters: header != null ? Number(header) : body.text.length, header_characters: header != null }
}

async function subscription(key) {
  const res = await api('/v1/user/subscription', { key })
  if (!res.ok) return null
  const json = await res.json()
  return { used: json.character_count, limit: json.character_limit, tier: json.tier }
}

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())
}

function readStamp(stamp) {
  return existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')) : {}
}

async function main() {
  const key = loadApiKey()
  if (list_voices) return listVoices(key)

  const spec = JSON.parse(readFileSync(SPEC_FILE, 'utf8'))
  const { voiceId, settings = {}, clips } = spec
  const model = spec.model ?? PRIMARY_MODEL
  if (!voiceId) throw new Error('narration-v2.json needs a voiceId (run --list-voices to choose one)')
  mkdirSync(CACHE_DIR, { recursive: true })

  const words = clips.reduce((n, c) => n + c.text.split(/\s+/).length, 0)
  console.log(`voice ${voiceId}  model ${model}  settings ${JSON.stringify(settings)}`)
  console.log(`${clips.length} clips, ${words} words (~${(words / 150 * 60).toFixed(0)}s at 150 wpm)\n`)

  if (dry_run) {
    for (const clip of clips) {
      const cached = existsSync(resolve(CACHE_DIR, `${clipHash(clip, voiceId, model, settings)}.mp3`))
      console.log(`${clip.id.padEnd(16)} act ${String(clip.act).padEnd(2)} ${cached ? 'cached ' : 'SYNTH  '} ${String(clip.text.length).padStart(4)} chars  ${clip.text}`)
    }
    console.log('\n(dry run: no API calls made)')
    return
  }

  const before = await subscription(key)
  const rows = []
  const out_clips = []
  let synthesised_chars = 0
  let model_used = model

  for (const clip of clips) {
    let hash = clipHash(clip, voiceId, model_used, settings)
    let mp3 = resolve(CACHE_DIR, `${hash}.mp3`)
    const wav = resolve(OUT_DIR, `${clip.id}.wav`)
    const stamp = resolve(OUT_DIR, `${clip.id}.json`)
    let characters = 0
    let source = 'cached'

    if (!existsSync(mp3)) {
      let result = await synthesise({ key, voiceId, model: model_used, settings, clip })
      if (!result.ok && model_used === PRIMARY_MODEL && ![401, 429].includes(result.status)) {
        console.log(`  ${clip.id}: ${PRIMARY_MODEL} rejected (HTTP ${result.status}: ${result.message}); retrying with ${FALLBACK_MODEL}`)
        model_used = FALLBACK_MODEL
        hash = clipHash(clip, voiceId, model_used, settings)
        mp3 = resolve(CACHE_DIR, `${hash}.mp3`)
        result = existsSync(mp3) ? { ok: true, cached: true } : await synthesise({ key, voiceId, model: model_used, settings, clip })
      }
      if (!result.ok) {
        console.error(`\nSTOP: clip ${clip.id} failed with HTTP ${result.status}: ${result.message}`)
        process.exit(2)
      }
      if (!result.cached) {
        writeFileSync(mp3, result.bytes)
        characters = result.characters
        synthesised_chars += characters
        source = result.header_characters ? 'synth' : 'synth*'
      }
    }

    const fresh = existsSync(wav) && readStamp(stamp).hash === hash
    if (!fresh) execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp3, '-af', FFMPEG_FILTER, '-ar', '48000', '-ac', '1', wav], { stdio: 'inherit' })
    const seconds = duration(wav)
    if (!fresh || characters) {
      writeFileSync(stamp, JSON.stringify({ hash, model: model_used, characters: characters || readStamp(stamp).characters || 0, duration: seconds }, null, 2))
    }
    rows.push({ id: clip.id, act: clip.act, seconds, characters: readStamp(stamp).characters, source })
    out_clips.push({ id: clip.id, act: clip.act, file: `film/narration-v2/${clip.id}.wav`, duration: seconds, text: clip.text, model: model_used })
  }

  const after = await subscription(key)
  writeFileSync(resolve(OUT_DIR, 'narration-v2.json'), JSON.stringify({ voiceId, model: model_used, settings, output_format: OUTPUT_FORMAT, clips: out_clips }, null, 2))

  console.log('id               act   seconds   chars  source')
  let total = 0
  for (const r of rows) {
    total += r.seconds
    console.log(`${r.id.padEnd(16)} ${String(r.act).padEnd(4)} ${r.seconds.toFixed(2).padStart(7)}  ${String(r.characters).padStart(6)}  ${r.source}`)
  }
  console.log(`${'total'.padEnd(16)}      ${total.toFixed(2).padStart(7)}  (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')})`)
  console.log(`\nmodel used: ${model_used}   characters synthesised this run: ${synthesised_chars}${rows.some((r) => r.source === 'synth*') ? '  (* = no x-character-count header, counted from text)' : ''}`)
  if (before && after) console.log(`subscription (${after.tier}): ${before.used} -> ${after.used} of ${after.limit} characters`)
  console.log(`wrote ${OUT_DIR}/narration-v2.json`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
