/**
 * Mathburst film capture.
 *
 * Performs `video/film.manifest.json` against the real product in a WebMCP
 * enabled Chrome, one continuous take, while streaming the compositor's
 * frames to disk. Every gesture is a real pointer or keyboard event; every
 * Tutor turn is a real cue through the registered tool objects. The result is
 * a 60 fps 2560×1440 capture plus a timeline the Remotion composition reads.
 *
 *   node scripts/film/capture.mjs            # full take
 *   SHOTS=opening-attempt,opening-tutor node scripts/film/capture.mjs   # subset
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectPage, launchChrome, wait } from './chrome.mjs'

const ROOT = resolve('.')
const MANIFEST = JSON.parse(readFileSync(resolve(ROOT, 'video/film.manifest.json'), 'utf8'))
const FRAMES = resolve(ROOT, '.film/frames')
const OUT_DIR = resolve(ROOT, 'video/public/film')
const CAPTURE = resolve(OUT_DIR, 'capture.mp4')
const TIMELINE = resolve(OUT_DIR, 'timeline.json')
const { width: WIDTH, height: HEIGHT, fps: FPS } = MANIFEST.output
const ONLY = process.env.SHOTS ? new Set(process.env.SHOTS.split(',')) : null
const KEEP_FRAMES = Boolean(process.env.KEEP_FRAMES)

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const now = () => Date.now() / 1000

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

const chrome = await launchChrome({ port: 9444, width: WIDTH, height: HEIGHT, position: MANIFEST.product.chromePosition })
let page
const frames = []
const events = []
const shots = []
const seenCommits = new Set()
let recording = false

const log = (...parts) => console.log(new Date().toISOString().slice(11, 19), ...parts)

try {
  page = await connectPage(chrome.port)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await page.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {})
  await page.send('Page.navigate', { url: MANIFEST.product.url })
  await page.waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null', 30_000)
  if (MANIFEST.product.resetStorage) {
    await page.evaluate('localStorage.clear(); return true')
    await page.send('Page.reload', { ignoreCache: false })
    await page.waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null', 30_000)
  }
  await page.waitFor('return Boolean(window.__mathburstFilm)', 10_000)
  const registered = await page.evaluate('return typeof document.modelContext?.getTools === "function" ? (await document.modelContext.getTools()).length : -1')
  log('webmcp tools registered with the browser:', registered)

  // ---- pointer helpers ------------------------------------------------------
  const pointer = { x: WIDTH * 0.9, y: HEIGHT * 0.9 }
  const mouse = (type, extra = {}) => page.send('Input.dispatchMouseEvent', { type, x: pointer.x, y: pointer.y, ...extra })
  const moveTo = async (x, y, durationMs = 520) => {
    const from = { ...pointer }
    const steps = Math.max(6, Math.round(durationMs / 16))
    for (let index = 1; index <= steps; index += 1) {
      const t = easeInOut(index / steps)
      pointer.x = from.x + (x - from.x) * t
      pointer.y = from.y + (y - from.y) * t
      await mouse('mouseMoved')
      await wait(16)
    }
  }
  // Wait for the element, then for it to stop moving (camera transitions
  // last about a second): two measurements 140 ms apart must agree.
  const rectOf = async (selector, text, timeoutMs = 8000) => {
    const started = Date.now()
    let rect = null
    let previous = null
    while (Date.now() - started < timeoutMs) {
      rect = await measure(selector, text)
      if (rect && previous && Math.abs(rect.x - previous.x) < 0.75 && Math.abs(rect.y - previous.y) < 0.75) break
      previous = rect
      rect = null
      await wait(140)
    }
    if (!rect) {
      const state = await page.evaluate("const w = window.__mathburstFilm.getWorld(); return { status: w.session.reconstructionStatus, draft: Boolean(w.reconstruction), activity: w.activity.slice(-3).map((c) => c.action.summary), panel: document.querySelector('.reconstruction-panel')?.textContent?.slice(0, 160), buttons: [...document.querySelectorAll('.reconstruction-panel footer button')].map((b) => [b.className, b.disabled]) }")
      console.log('page state', JSON.stringify(state))
      throw new Error('Missing element ' + selector + (text ? ' (' + text + ')' : ''))
    }
    return rect
  }
  const measure = async (selector, text) => {
    const rect = await page.evaluate(`
      const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})]
      const element = ${text ? `candidates.find((item) => (item.textContent || '').includes(${JSON.stringify(text)}))` : 'candidates[0]'}
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const svg = element.closest('svg')
      const viewBox = svg?.getAttribute('viewBox')?.split(' ').map(Number)
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, svgScale: svg && viewBox ? svg.getBoundingClientRect().width / viewBox[2] : 1 }
    `)
    return rect
  }
  const travel = (x, y) => Math.min(900, Math.max(320, Math.hypot(x - pointer.x, y - pointer.y) * 0.9))
  const click = async (selector, text) => {
    const rect = await rectOf(selector, text)
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    await moveTo(x, y, travel(x, y))
    await wait(120)
    await mouse('mousePressed', { button: 'left', buttons: 1, clickCount: 1 })
    await wait(90)
    await mouse('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 })
    await wait(140)
  }
  const dragBy = async (selector, dx, dy, durationMs = 1200) => {
    const rect = await rectOf(selector)
    const x = rect.x + rect.width / 2
    const y = rect.y + rect.height / 2
    await moveTo(x, y, travel(x, y))
    await wait(160)
    await mouse('mousePressed', { button: 'left', buttons: 1, clickCount: 1 })
    await wait(90)
    const steps = Math.max(12, Math.round(durationMs / 16))
    for (let index = 1; index <= steps; index += 1) {
      const t = easeInOut(index / steps)
      pointer.x = x + dx * t
      pointer.y = y + dy * t
      await mouse('mouseMoved', { button: 'left', buttons: 1 })
      await wait(16)
    }
    await wait(140)
    await mouse('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 })
    await wait(160)
  }
  const slider = async (selector, value, durationMs = 1200) => {
    const info = await page.evaluate(`
      const input = document.querySelector(${JSON.stringify(selector)})
      if (!input) return null
      const rect = input.getBoundingClientRect()
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, min: Number(input.min), max: Number(input.max), value: Number(input.value) }
    `)
    if (!info) throw new Error(`Missing slider ${selector}`)
    const thumb = 14
    const position = (v) => info.x + thumb / 2 + ((v - info.min) / (info.max - info.min)) * (info.width - thumb)
    const startX = position(info.value)
    const y = info.y + info.height / 2
    await moveTo(startX, y, travel(startX, y))
    await wait(160)
    await mouse('mousePressed', { button: 'left', buttons: 1, clickCount: 1 })
    await wait(80)
    const targetX = position(value)
    const steps = Math.max(12, Math.round(durationMs / 16))
    for (let index = 1; index <= steps; index += 1) {
      pointer.x = startX + (targetX - startX) * easeInOut(index / steps)
      pointer.y = y
      await mouse('mouseMoved', { button: 'left', buttons: 1 })
      await wait(16)
    }
    await wait(120)
    await mouse('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 })
    await wait(160)
  }
  const typeInto = async (selector, value, settleMs = 700) => {
    await click(selector)
    await page.evaluate('document.activeElement?.select?.(); return true')
    await wait(220)
    for (const character of value) {
      await page.send('Input.insertText', { text: character })
      await wait(140)
    }
    await wait(settleMs)
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    await wait(120)
  }
  const activityCount = () => page.evaluate('const w = window.__mathburstFilm.getWorld(); return { count: w.activity.length, last: w.activity.at(-1) ? { source: w.activity.at(-1).action.source, summary: w.activity.at(-1).action.summary } : null }')
  const awaitIdle = async (timeoutMs = 60_000) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      if (!(await page.evaluate('return window.__mathburstFilm.isBusy()'))) return
      await wait(60)
    }
    throw new Error('The product stayed busy.')
  }

  // ---- screencast --------------------------------------------------------------
  let frameIndex = 0
  const onFrame = (params) => {
    if (recording) {
      const file = `f${String(frameIndex).padStart(5, '0')}.jpg`
      writeFileSync(resolve(FRAMES, file), Buffer.from(params.data, 'base64'))
      frames.push({ file, t: params.metadata.timestamp })
      frameIndex += 1
    }
    page.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {})
  }
  page.on('Page.screencastFrame', onFrame)

  // ---- stage ---------------------------------------------------------------------
  const plan = MANIFEST.shots.filter((shot) => !ONLY || ONLY.has(shot.id))
  await page.evaluate("window.__mathburstFilm.openProject('gamma-lab'); return true")
  await wait(900)
  await page.evaluate('window.__mathburstFilm.openDirector(); return true')
  await wait(600)
  await page.evaluate(`window.__mathburstFilm.selectShot(${JSON.stringify(plan[0].id)}); return true`)
  await mouse('mouseMoved')
  await wait(1600)

  await page.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 })
  recording = true
  const takeStart = now()
  events.push({ t: 0, kind: 'take', label: 'start' })

  for (const [shotIndex, shot] of plan.entries()) {
    const shotStart = now() - takeStart
    log(`shot ${String(shotIndex + 1).padStart(2, '0')} ${shot.id} @ ${shotStart.toFixed(2)}s`)
    events.push({ t: shotStart, kind: 'shot', label: shot.id })
    for (const step of shot.steps ?? []) {
      if (step.wait) await wait(step.wait)
      else if (step.cue) { await page.evaluate(`window.__mathburstFilm.runCue(${JSON.stringify(step.cue)}); return true`); await wait(200); await awaitIdle() }
      else if (step.click) await click(step.click, step.text)
      else if (step.drag && step.px) await dragBy(step.drag, step.px.dx, step.px.dy, step.durationMs)
      else if (step.drag && step.svgUnits) { const rect = await rectOf(step.drag); await dragBy(step.drag, step.svgUnits.dx * rect.svgScale, step.svgUnits.dy * rect.svgScale, step.durationMs) }
      else if (step.slider) await slider(step.slider, step.value, step.durationMs)
      else if (step.type) await typeInto(step.type, step.value, step.settleMs)
      else if (step.pointer) await moveTo(WIDTH * step.pointer.x, HEIGHT * step.pointer.y, 700)
      else if (step.collapseActivity !== undefined) await page.evaluate(`const t = document.querySelector('.activity-toggle'); if (t && (t.getAttribute('aria-expanded') === 'true') === ${Boolean(step.collapseActivity)}) t.click(); return true`)
      else if (step.selectShot) await page.evaluate(`window.__mathburstFilm.selectShot(${JSON.stringify(step.selectShot)}); return true`)
      else if (step.waitFor) await rectOf(step.waitFor, undefined, step.timeoutMs ?? 12_000)
    }
    const elapsed = now() - takeStart - shotStart
    if (elapsed > shot.seconds) log(`  overran budget by ${(elapsed - shot.seconds).toFixed(2)}s`)
    else await wait((shot.seconds - elapsed) * 1000)
    const shotEnd = now() - takeStart
    const next = plan[shotIndex + 1]
    let transitionAt = null
    if (next && shot.transitionOut !== 'end') {
      transitionAt = now() - takeStart
      events.push({ t: transitionAt, kind: shot.transitionOut === 'bridge' ? 'bridge' : 'camera', label: `${shot.id} → ${next.id}` })
      await page.evaluate('window.__mathburstFilm.previewNext(); return true')
    }
    shots.push({ id: shot.id, title: shot.title, start: shotStart, end: shotEnd, budget: shot.seconds, transitionAt, transitionOut: shot.transitionOut })
    const commits = await page.evaluate('return window.__mathburstFilm.getWorld().activity.map((c) => ({ id: c.action.id, at: c.at, source: c.action.source, summary: c.action.summary }))')
    log(`  commits in world: ${commits.length}; new: ${commits.filter((c) => !seenCommits.has(c.id)).length}`)
    for (const commit of commits) {
      if (seenCommits.has(commit.id)) continue
      seenCommits.add(commit.id)
      const t = commit.at / 1000 - takeStart
      if (t >= 0) events.push({ t, kind: commit.source === 'agent' ? 'tutor' : 'human', label: commit.summary })
    }
  }
  events.sort((a, b) => a.t - b.t)
  await wait(1200)
  recording = false
  await page.send('Page.stopScreencast')
  const takeEnd = now() - takeStart
  events.push({ t: takeEnd, kind: 'take', label: 'end' })
  // Authoritative commit list: every project's own history, read once at the end.
  const allCommits = await page.evaluate('return window.__mathburstFilm.getCommits()')
  for (const commit of allCommits) {
    if (seenCommits.has(commit.id)) continue
    seenCommits.add(commit.id)
    const t = commit.at / 1000 - takeStart
    if (t >= 0 && t <= takeEnd) events.push({ t, kind: commit.source === 'agent' ? 'tutor' : 'human', label: commit.summary })
  }
  events.sort((a, b) => a.t - b.t)
  log(`commits logged: ${events.filter((event) => event.kind === 'tutor' || event.kind === 'human').length}`)
  page.close()
  log(`captured ${frames.length} frames over ${takeEnd.toFixed(1)}s`)

  // ---- encode --------------------------------------------------------------------
  const t0 = frames[0].t
  const list = frames.map((frame, index) => {
    const nextT = frames[index + 1]?.t ?? Math.max(frame.t + 0.05, takeStart + takeEnd)
    return `file '${frame.file}'\nduration ${Math.max(0.001, nextT - frame.t).toFixed(6)}`
  }).join('\n') + `\nfile '${frames[frames.length - 1].file}'\n`
  writeFileSync(resolve(FRAMES, 'frames.txt'), list)
  execFileSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', resolve(FRAMES, 'frames.txt'),
    '-vf', `fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-movflags', '+faststart',
    CAPTURE,
  ], { stdio: 'inherit' })
  const offset = t0 - takeStart
  writeFileSync(TIMELINE, JSON.stringify({
    output: MANIFEST.output,
    capturedAt: new Date().toISOString(),
    /** Seconds from the first captured frame to take start; timeline times are already relative to the first frame. */
    frameOffset: offset,
    frames: frames.length,
    seconds: takeEnd - offset,
    shots: shots.map((shot) => ({ ...shot, start: shot.start - offset, end: shot.end - offset, transitionAt: shot.transitionAt === null ? null : shot.transitionAt - offset })),
    events: events.map((event) => ({ ...event, t: event.t - offset })),
  }, null, 2))
  if (!KEEP_FRAMES) rmSync(FRAMES, { recursive: true, force: true })
  log('wrote', CAPTURE)
  log('wrote', TIMELINE)
} finally {
  chrome.close()
}
