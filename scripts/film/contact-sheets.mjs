/**
 * Contact sheets from the rendered film: one frame per Director shot and one
 * frame from the middle of every product transition. Both are tiled with
 * ffmpeg and written next to the render.
 *
 *   node scripts/film/contact-sheets.mjs [video/out/mathburst-final.mp4]
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM = resolve(process.argv[2] ?? 'video/out/mathburst-final.mp4')
const timeline = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/timeline.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'video/film.manifest.json'), 'utf8'))
const TMP = resolve(ROOT, '.film/contact')
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const filmStart = Math.max(0, timeline.shots[0].start)
const grab = (seconds, file, label) => {
  const at = Math.max(0, seconds - filmStart)
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-ss', at.toFixed(3), '-i', FILM, '-frames:v', '1',
    '-vf', `scale=640:-1,drawbox=x=0:y=0:w=640:h=30:color=0x171713@0.85:t=fill,drawtext=text='${label.replace(/[':]/g, ' ')}':x=10:y=8:fontsize=15:fontcolor=0xf4f0e6:fontfile=/Windows/Fonts/consola.ttf`,
    resolve(TMP, file),
  ])
}

const shotFiles = timeline.shots.map((shot, index) => {
  const spec = manifest.shots.find((candidate) => candidate.id === shot.id)
  const file = `shot-${String(index + 1).padStart(2, '0')}.png`
  grab(shot.start + Math.min(2.2, (shot.end - shot.start) * 0.55), file, `${String(index + 1).padStart(2, '0')} ${spec?.title ?? shot.id}  ${(shot.start - filmStart).toFixed(1)}s`)
  return file
})

const transitionFiles = timeline.shots.filter((shot) => shot.transitionAt !== null).map((shot, index) => {
  const file = `transition-${String(index + 1).padStart(2, '0')}.png`
  grab(shot.transitionAt + 0.6, file, `${shot.transitionOut} · ${shot.id} → next  ${(shot.transitionAt - filmStart).toFixed(1)}s`)
  return file
})

const tile = (files, columns, out) => {
  const rows = Math.ceil(files.length / columns)
  const inputs = files.flatMap((file) => ['-i', resolve(TMP, file)])
  const filter = `${files.map((_, index) => `[${index}:v]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, index) => `${(index % columns) === 0 ? 0 : Array.from({ length: index % columns }, (_, c) => `w${c}`).join('+')}_${Math.floor(index / columns) === 0 ? 0 : Array.from({ length: Math.floor(index / columns) }, (_, r) => `h${r * columns}`).join('+')}`).join('|')}:fill=0xf4f0e6[v]`
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[v]', '-frames:v', '1', out])
  console.log('wrote', out, `(${files.length} frames, ${rows} rows)`)
}

mkdirSync(resolve(ROOT, 'video/out'), { recursive: true })
tile(shotFiles.concat(shotFiles.length % 4 ? Array.from({ length: 4 - (shotFiles.length % 4) }, (_, i) => { const file = `pad-${i}.png`; execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0xf4f0e6:s=640x360', '-frames:v', '1', resolve(TMP, file)]); return file }) : []), 4, resolve(ROOT, 'video/out/contact-storyboard.png'))
tile(transitionFiles, 4, resolve(ROOT, 'video/out/contact-transitions.png'))
