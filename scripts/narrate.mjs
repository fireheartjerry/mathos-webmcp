/**
 * Builds the narration track from docs/narration.json.
 *
 * Uses Microsoft Edge's neural voices through `edge-tts`, which needs no API key and no
 * account. The previous track used Windows SAPI ("Microsoft Zira Desktop"), which is a
 * concatenative voice from a different decade and sounded like one.
 *
 * Each segment is rendered separately, padded to the length its beat occupies in the
 * picture, and written as seg00.wav ... seg06.wav for the Remotion composition. Padding
 * rather than stretching keeps the speech at its natural rate; the silence lands at the
 * end of a beat, where a viewer is reading the caption anyway.
 *
 *   node scripts/narrate.mjs            # writes video/public/seg*.wav
 *   node scripts/narrate.mjs --measure  # prints spoken length vs beat length, writes nothing
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SPEC = JSON.parse(readFileSync('docs/narration.json', 'utf8'))
const OUT = process.env.OUT_DIR ?? 'video/public'
const TMP = process.env.TMP_DIR ?? '.narration-tmp'
const measureOnly = process.argv.includes('--measure')

const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())

mkdirSync(TMP, { recursive: true })
if (!measureOnly) mkdirSync(OUT, { recursive: true })

let overrun = 0
SPEC.segments.forEach((segment, i) => {
  const raw = `${TMP}/seg${String(i).padStart(2, '0')}.mp3`
  execFileSync('python', [
    '-m', 'edge_tts',
    `--voice=${SPEC.voice}`,
    // Joined with "=" on purpose: a rate like "-4%" starts with a hyphen, and argparse
    // reads a separate "-4%" as another flag rather than as this one's value.
    `--rate=${SPEC.rate}`,
    `--pitch=${SPEC.pitch}`,
    `--text=${segment.text}`,
    `--write-media=${raw}`,
  ], { stdio: 'pipe' })

  const spoken = duration(raw)
  const beat = segment.durationSeconds
  const slack = beat - spoken
  if (slack < 0) overrun += 1
  console.log(
    `${segment.beat.padEnd(12)} spoken ${spoken.toFixed(1)}s / beat ${beat.toFixed(1)}s ` +
    `${slack < 0 ? `OVER by ${(-slack).toFixed(1)}s` : `${slack.toFixed(1)}s of room`}`,
  )

  if (measureOnly) return
  // Pad to exactly the beat length. `apad` then `atrim` is exact where `-t` alone is not.
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', raw,
    '-af', `apad,atrim=0:${beat},aresample=48000`,
    '-ac', '1', '-ar', '48000',
    `${OUT}/seg${String(i).padStart(2, '0')}.wav`,
  ], { stdio: 'pipe' })
})

if (overrun > 0) {
  console.error(`\n${overrun} segment(s) longer than their beat. Shorten the text or lengthen the beat.`)
  process.exit(1)
}
console.log(measureOnly ? '\nmeasured only' : `\nwrote ${SPEC.segments.length} files to ${OUT}`)
