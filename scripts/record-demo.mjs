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
 * The tab is made to paint via focus emulation, so it does not have to be the window
 * in front. A hidden tab returns stale frames rather than failing, which is worse.
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
const VIEWPORT_W = Number(process.env.VIEWPORT_W ?? 1280)
const VIEWPORT_H = Number(process.env.VIEWPORT_H ?? 800)
/** Device pixel ratio. 2 gives a 2560x1600 source for a 1280x800 page. */
const DPR = Number(process.env.DPR ?? 2)

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

// Make the tab paint without depending on which window happens to be in front.
// `Page.captureScreenshot` on a hidden tab returns stale frames, which is why this file
// used to say "the tab must be the ACTIVE one" and fail with 49 frames if it was not.
// Focus emulation and an explicit lifecycle state say the same thing to the renderer, and
// they are properties of this CDP session rather than of the desktop.
for (const [method, params] of [
  // Set the viewport and the pixel ratio here, not in a helper script. Emulation
  // overrides belong to the CDP session that set them, so a prep script that closed its
  // socket left the tab back at 1x and the take was captured at 1280x800 instead of
  // 2560x1600. The window must be large enough to hold the result: Chrome clamps the
  // screenshot to the window, which is why a 1400px window silently produced 1.5x.
  ['Emulation.setDeviceMetricsOverride', { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: DPR, mobile: false }],
  ['Emulation.setFocusEmulationEnabled', { enabled: true }],
  ['Page.setWebLifecycleState', { state: 'active' }],
  ['Page.bringToFront', {}],
]) {
  try { await send(method, params) } catch { /* older builds lack one of these */ }
}
const visibility = await evaluate('return document.visibilityState')
if (visibility !== 'visible') {
  console.error(`Page reports visibilityState="${visibility}"; frames will be stale.`)
  process.exit(1)
}

{
  const probe = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')
  const got = { w: probe.readUInt32BE(16), h: probe.readUInt32BE(20) }
  const want = { w: VIEWPORT_W * DPR, h: VIEWPORT_H * DPR }
  console.log(`capturing at ${got.w}x${got.h} (asked for ${want.w}x${want.h})`)
  if (got.w < want.w) {
    console.error('The browser window is too small to hold the requested capture. Relaunch Chrome')
    console.error(`with --window-size=${Math.ceil(want.w / 2) + 240},${Math.ceil(want.h / 2) + 240} or larger.`)
    process.exit(1)
  }
}

/**
 * The beats. Each returns quickly; the pauses are what make it watchable.
 *
 * `focus` names the region of the page this beat is about, as CSS selectors tried in
 * order. The recorder measures whichever one matches and writes the rectangle to
 * beats.json, so the composition can move a camera over the real interface instead of
 * showing a fixed wide shot for three minutes. Measuring at capture time rather than
 * hard-coding coordinates means the camera cannot drift when the layout changes.
 */
const BEATS = [
  {
    name: 'setup', label: 'open on a derivation with a wrong line, checked',
    run: 'return await window.__demo.setup()', hold: 3200,
    focus: ['.step.is-broken', '.work .step:last-child', '.work'],
  },
  {
    name: 'hold', label: 'let the marked line sit',
    run: 'return 1', hold: 1400,
    focus: ['.step.is-broken', '.work .step:last-child', '.work'],
  },
  {
    name: 'console', label: 'show the whole tool surface',
    run: 'return await window.__demo.showConsole()', hold: 2600,
    focus: ['.agent-console'],
  },
  {
    name: 'mathematics', label: 'open the mathematics group',
    run: 'return await window.__demo.openGroup("Mathematics")', hold: 2100,
    focus: ['.console-group.is-open', '.agent-console'],
  },
  {
    name: 'repair', label: 'the agent repairs the line and reaches the answer',
    run: 'return await window.__demo.repair()', hold: 3000,
    focus: ['.work'],
  },
  {
    name: 'receipt', label: 'close the round; the receipt appears',
    run: 'return await window.__demo.receipt()', hold: 3600,
    focus: ['.receipt', '.work'],
  },
  {
    name: 'probe', label: 'probe what this browser really does',
    run: 'return await window.__demo.probe()', hold: 3300,
    focus: ['.console-platform', '.agent-console'],
  },
]

/** Reads the first selector that matches, in CSS pixels relative to the document. */
const measure = (selectors) => evaluate(`
  for (const sel of ${JSON.stringify(selectors)}) {
    const el = document.querySelector(sel)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width < 40 || r.height < 24) continue
    return { sel, x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  }
  return null
`)

console.log('injecting the driver…')
await evaluate(await (await import('node:fs/promises')).readFile('scripts/demo-driver.js', 'utf8'))

// Capture on a timer while the beats run, so a still page still yields real seconds.
const startedAt = Date.now()
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

const timeline = []
for (const beat of BEATS) {
  process.stdout.write(`  ${beat.label}… `)
  const startedFrame = frames.length
  const startedMs = Date.now() - startedAt
  const result = await evaluate(beat.run)
  await wait(Math.round(beat.hold * HOLD))
  // Measure after the hold, when the beat's own scrolling and opening have settled.
  const focus = await measure(beat.focus)
  timeline.push({
    beat: beat.name,
    startSeconds: startedMs / 1000,
    endSeconds: (Date.now() - startedAt) / 1000,
    startFrame: startedFrame,
    endFrame: frames.length,
    focus,
  })
  console.log(focus ? `${focus.sel} ${focus.width}x${focus.height}` : 'no focus region found')
}
recording = false
await capture
const elapsedSeconds = (Date.now() - startedAt) / 1000
ws.close()

/**
 * Encode at the rate the frames were actually captured at, not the rate we asked for.
 *
 * `Page.captureScreenshot` does not always come back within the period, so a take that
 * ran for 163 real seconds produced 1700 frames rather than 1956 - and encoding those at
 * a nominal 12fps yields 141 seconds of picture. The demo then runs visibly faster than
 * it did, and the narration, which is timed against real seconds, drifts away from it.
 * Dividing by the measured elapsed time makes the output real-time whatever the capture
 * jitter was.
 */
const effectiveFps = frames.length / elapsedSeconds

console.log(`captured ${frames.length} frames over ${elapsedSeconds.toFixed(1)}s -> ${effectiveFps.toFixed(2)} fps`)
if (frames.length < 10) {
  console.error('Too few frames. The tab must be the ACTIVE one — a background tab does not paint.')
  process.exit(1)
}

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
frames.forEach((b64, i) => writeFileSync(`${FRAMES}/f${String(i).padStart(5, '0')}.png`, Buffer.from(b64, 'base64')))

mkdirSync('docs/images', { recursive: true })
// Read the frames at the rate they were captured, then write a constant 30fps file.
// Remotion's compositor seeks by frame position and fails on a variable or fractional
// rate: a take written at 10.7788fps produced "No frame found at position ..." partway
// through the render. Duration is unchanged; frames are duplicated to reach 30.
execFileSync('ffmpeg', [
  '-y', '-framerate', effectiveFps.toFixed(4), '-i', `${FRAMES}/f%05d.png`,
  // No downscale. Frames arrive at the device pixel ratio the tab was given, so a 1280
  // CSS-pixel viewport at deviceScaleFactor 2 yields a 2560-wide source. The previous
  // take was captured at 1x and then displayed larger than life in the composition,
  // which is the whole reason the picture looked soft.
  '-vf', 'format=yuv420p',
  '-r', '30', '-fps_mode', 'cfr',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' })
rmSync(FRAMES, { recursive: true, force: true })
if (process.env.BEATS_OUT) {
  writeFileSync(process.env.BEATS_OUT, JSON.stringify({ fps: effectiveFps, encodedFps: 30, beats: timeline }, null, 2))
  console.log('wrote', process.env.BEATS_OUT)
}
console.log('wrote', OUT)
