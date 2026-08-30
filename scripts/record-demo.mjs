/**
 * Records the product working, as an MP4, with no narration.
 *
 * The challenge requires a demo video with audio. This produces the picture: a real
 * screencast of the live page being driven through the beats in `docs/DEMO_SCRIPT.md`,
 * so the remaining work is a voice track rather than a screen recording.
 *
 * Frames are captured on a fixed interval rather than from CDP's screencast. The
 * screencast only emits when the page paints, and this product has no animation at all,
 * so a first attempt produced 49 frames for the whole run and collapsed two minutes of
 * demo into four seconds. Polling `Page.captureScreenshot` keeps time real.
 *
 * The tab must be the active one; a background tab does not paint.
 *
 *   node scripts/record-demo.mjs
 *
 * Environment: URL (default http://localhost:3400/learn), OUT (default demo.mp4),
 * FPS (default 12).
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const PORT = process.env.CDP_PORT ?? '9333'
const URL_ = process.env.URL ?? 'http://localhost:3400/learn'
const OUT = process.env.OUT ?? 'docs/images/demo.mp4'
const FPS = Number(process.env.FPS ?? 12)
const FRAMES = process.env.FRAMES ?? '.demo-frames'
// Stretches every hold, so the footage can be made to match the narration length in
// docs/DEMO_SCRIPT.md (394 words, about 2:38 spoken) rather than the ~20s a bare take
// produces.
const HOLD = Number(process.env.HOLD_SCALE ?? 1)

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(URL_.replace(/^https?:\/\//, '').split('/')[0] + '/learn'))
  ?? targets.find((t) => t.type === 'page' && t.url.includes('/learn'))
if (!page) {
  console.error('No /learn tab open. Start the server and open the page first.')
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => {
  ws.addEventListener('open', r, { once: true })
  ws.addEventListener('error', j, { once: true })
})

let id = 1
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    return
  }
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mine = id++
    pending.set(mine, { resolve, reject })
    setTimeout(() => pending.has(mine) && (pending.delete(mine), reject(new Error('timeout ' + method))), 30000)
    ws.send(JSON.stringify({ id: mine, method, params }))
  })

const frames = []
const evaluate = (expression) =>
  send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
    .then((r) => r.result.value)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

await send('Page.enable')
await send('Runtime.enable')

// The beats. Each returns quickly; the pauses are what make it watchable.
const BEATS = [
  ['open on a derivation with a wrong line, checked', 'return await window.__demo.setup()', 3200],
  ['let the marked line sit', 'return 1', 1800],
  ['show the whole tool surface', 'return await window.__demo.showConsole()', 2600],
  ['open the mathematics group', 'return await window.__demo.openGroup("Mathematics")', 2600],
  ['the agent repairs the line', 'return await window.__demo.repair()', 3000],
  ['everything sound', 'return 1', 2000],
  ['probe what this browser really does', 'return await window.__demo.probe()', 4200],
]

console.log('injecting the driver…')
await evaluate(await (await import('node:fs/promises')).readFile('scripts/demo-driver.js', 'utf8'))

// Capture on a timer while the beats run, so a still page still yields real seconds.
let recording = true
const capture = (async () => {
  const period = Math.round(1000 / FPS)
  while (recording) {
    const started = Date.now()
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      frames.push(shot.data)
    } catch {
      // A frame that fails to paint is skipped rather than aborting the take.
    }
    const spent = Date.now() - started
    if (spent < period) await wait(period - spent)
  }
})()

for (const [label, expr, hold] of BEATS) {
  process.stdout.write(`  ${label}… `)
  const result = await evaluate(expr)
  await wait(Math.round(hold * HOLD))
  console.log(typeof result === 'object' ? JSON.stringify(result).slice(0, 60) : 'ok')
}
recording = false
await capture
ws.close()

console.log(`captured ${frames.length} frames`)
if (frames.length < 10) {
  console.error('Too few frames. The tab must be the ACTIVE one — a background tab does not paint.')
  process.exit(1)
}

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
frames.forEach((b64, i) => writeFileSync(`${FRAMES}/f${String(i).padStart(5, '0')}.png`, Buffer.from(b64, 'base64')))

mkdirSync('docs/images', { recursive: true })
execFileSync('ffmpeg', [
  '-y', '-framerate', String(FPS), '-i', `${FRAMES}/f%05d.png`,
  '-vf', 'scale=1280:-2:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' })
rmSync(FRAMES, { recursive: true, force: true })
console.log('wrote', OUT)
