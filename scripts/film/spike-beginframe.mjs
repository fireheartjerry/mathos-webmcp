/**
 * Deterministic-frame spike: headless Chrome with BeginFrame control and
 * virtual time. Each frame advances the page by exactly 1/60 s and returns
 * a screenshot, so animations, timers and cues run in film time.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { connectPage, findChrome, wait } from './chrome.mjs'

const URL_ = process.env.URL ?? 'http://localhost:3400/'
const WIDTH = 2560
const HEIGHT = 1440
const PORT = 9445
const OUT = resolve('.film/spike-frames')
mkdirSync(OUT, { recursive: true })

const profile = mkdtempSync(join(tmpdir(), 'mathburst-bf-'))
const child = spawn(findChrome(), [
  '--headless=new',
  '--enable-begin-frame-control',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--enable-features=WebMCP',
  `--window-size=${WIDTH},${HEIGHT}`,
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-gpu-vsync',
  '--run-all-compositor-stages-before-draw',
  '--disable-new-content-rendering-timeout',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  '--disable-checker-imaging',
  'about:blank',
], { stdio: 'ignore' })

try {
  let ready = false
  for (let attempt = 0; attempt < 60 && !ready; attempt += 1) {
    try { ready = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).some((t) => t.type === 'page') } catch { /* wait */ }
    if (!ready) await wait(250)
  }
  const page = await connectPage(PORT)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await page.send('Page.navigate', { url: URL_ })
  await page.waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null', 30_000)
  console.log('webmcp', await page.evaluate('return typeof document.modelContext?.registerTool'))
  const status = await page.send('HeadlessExperimental.disable').catch((error) => `no HeadlessExperimental: ${error.message}`)
  console.log('headless experimental', JSON.stringify(status))
  await page.send('HeadlessExperimental.enable').catch(() => {})
  // Virtual time: timers advance only when we advance the budget.
  await page.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
  await page.evaluate('document.querySelector(\'button[aria-label="Open Gamma Function"]\')?.click(); return true')
  const interval = 1000 / 60
  let ticks = 0
  const started = Date.now()
  for (let frame = 0; frame < 120; frame += 1) {
    await page.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: interval })
    const result = await page.send('HeadlessExperimental.beginFrame', {
      interval,
      noDisplayUpdates: false,
      screenshot: { format: 'jpeg', quality: 92 },
    })
    if (result.screenshotData) {
      writeFileSync(join(OUT, `f${String(frame).padStart(5, '0')}.jpg`), Buffer.from(result.screenshotData, 'base64'))
      ticks += 1
    }
    if (frame === 30) await page.evaluate('document.querySelector(\'button[aria-label="Zoom in"]\')?.click(); return true')
  }
  console.log(`frames with pixels: ${ticks}/120 in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log('page time', await page.evaluate('return { now: performance.now(), transform: document.querySelector(".world-stage")?.style.transform }'))
  page.close()
} finally {
  try { child.kill() } catch { /* gone */ }
}
