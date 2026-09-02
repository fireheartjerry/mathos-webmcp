/**
 * QA sheets: sample a render every N seconds and tile the frames (16 per
 * sheet) with timecodes, so a whole viewing pass fits in a few images.
 *
 *   node scripts/film/qa-sheets.mjs video/out/mathburst-review.mp4 [stepSeconds]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const FILM = resolve(process.argv[2] ?? 'video/out/mathburst-review.mp4')
const STEP = Number(process.argv[3] ?? 2.5)
const TMP = resolve('.film/qa')
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', FILM]).toString().trim())
const times = []
for (let t = 0.2; t < duration; t += STEP) times.push(t)
const files = times.map((t, index) => {
  const file = `q${String(index).padStart(3, '0')}.png`
  const label = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.round((t % 1) * 10))}`
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', t.toFixed(3), '-i', FILM, '-frames:v', '1', '-vf', `scale=480:-1,drawbox=x=0:y=0:w=64:h=20:color=0x171713@0.9:t=fill,drawtext=text='${label}':x=5:y=4:fontsize=13:fontcolor=0xf4f0e6:font=Consolas`, resolve(TMP, file)])
  return file
})

const perSheet = 16
const columns = 4
for (let sheet = 0; sheet * perSheet < files.length; sheet += 1) {
  const group = files.slice(sheet * perSheet, (sheet + 1) * perSheet)
  while (group.length < perSheet) {
    const pad = `pad${group.length}.png`
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0xf4f0e6:s=480x270', '-frames:v', '1', resolve(TMP, pad)])
    group.push(pad)
  }
  const layout = group.map((_, index) => `${(index % columns) * 480}_${Math.floor(index / columns) * 270}`).join('|')
  const out = resolve(TMP, `sheet-${sheet + 1}.png`)
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...group.flatMap((file) => ['-i', resolve(TMP, file)]), '-filter_complex', `${group.map((_, index) => `[${index}:v]`).join('')}xstack=inputs=${perSheet}:layout=${layout}[v]`, '-map', '[v]', '-frames:v', '1', out])
  console.log('wrote', out)
}
console.log(`${files.length} samples over ${duration.toFixed(1)}s`)
