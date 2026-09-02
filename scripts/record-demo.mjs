/**
 * Records one uninterrupted 2:35 Mathburst product take through real WebMCP calls.
 *
 * Start the production server on port 3400 and open http://localhost:3400/ in a
 * WebMCP-enabled Chrome with remote debugging. Then run:
 *
 *   node scripts/record-demo.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'

const CDP_PORT = process.env.CDP_PORT ?? '9333'
const URL_ = process.env.URL ?? 'http://localhost:3400/'
const OUT = process.env.OUT ?? 'video/public/screen.mp4'
const BEATS_OUT = process.env.BEATS_OUT ?? 'video/public/beats.json'
const FPS = Number(process.env.FPS ?? 8)
const FRAMES = process.env.FRAMES ?? '.demo-frames'
const VIEWPORT_W = Number(process.env.VIEWPORT_W ?? 1280)
const VIEWPORT_H = Number(process.env.VIEWPORT_H ?? 800)
const DPR = Number(process.env.DPR ?? 2)

const workspaceRoot = resolve('.')
const frameRoot = resolve(FRAMES)
if (frameRoot === workspaceRoot || !frameRoot.toLowerCase().startsWith((workspaceRoot + sep).toLowerCase())) {
  throw new Error(`FRAMES must resolve inside the workspace, not ${frameRoot}`)
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms))
const origin = new URL(URL_).origin
const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = targets.find((target) => {
  if (target.type !== 'page') return false
  try { return new URL(target.url).origin === origin } catch { return false }
})

if (!page) {
  throw new Error(`No ${origin} page is open on CDP port ${CDP_PORT}.`)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolveOpen, rejectOpen) => {
  ws.addEventListener('open', resolveOpen, { once: true })
  ws.addEventListener('error', rejectOpen, { once: true })
})

let commandId = 1
const pending = new Map()
ws.addEventListener('message', (event) => {
  const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
  if (!message.id || !pending.has(message.id)) return
  const request = pending.get(message.id)
  pending.delete(message.id)
  message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result)
})

const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
  const id = commandId++
  pending.set(id, { resolve: resolveCommand, reject: rejectCommand })
  setTimeout(() => {
    if (!pending.has(id)) return
    pending.delete(id)
    rejectCommand(new Error(`Timed out waiting for ${method}`))
  }, 30_000)
  ws.send(JSON.stringify({ id, method, params }))
})

const evaluate = (body) => send('Runtime.evaluate', {
  expression: `(async () => { ${body} })()`,
  awaitPromise: true,
  returnByValue: true,
}).then((result) => {
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Page evaluation failed.')
  return result.result.value
})

async function waitFor(body, timeoutMs = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try { if (await evaluate(body)) return } catch { /* page may still be navigating */ }
    await wait(200)
  }
  throw new Error(`Timed out waiting for page condition: ${body}`)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL_ })
await waitFor('return document.readyState === "complete"')
await evaluate('localStorage.removeItem("mathburst.world.v1"); return true')
await send('Page.reload', { ignoreCache: true })
await waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null')

for (const [method, params] of [
  ['Emulation.setDeviceMetricsOverride', { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: DPR, mobile: false }],
  ['Emulation.setFocusEmulationEnabled', { enabled: true }],
  ['Page.setWebLifecycleState', { state: 'active' }],
  ['Page.bringToFront', {}],
]) {
  try { await send(method, params) } catch { /* older Chrome builds may omit one */ }
}

await waitFor('return document.visibilityState === "visible"')
await waitFor('return typeof document.modelContext?.getTools === "function"')
await waitFor('return (await document.modelContext.getTools()).length === 18')

const probe = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')
const captureSize = { width: probe.readUInt32BE(16), height: probe.readUInt32BE(20) }
const requestedSize = { width: VIEWPORT_W * DPR, height: VIEWPORT_H * DPR }
console.log(`capturing ${captureSize.width}×${captureSize.height}; requested ${requestedSize.width}×${requestedSize.height}`)
if (captureSize.width < requestedSize.width || captureSize.height < requestedSize.height) {
  throw new Error('Chrome is smaller than the requested capture. Relaunch it with a larger window.')
}

const firstPass = [
  { id: 'eq_integral', kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713', bounds: { x: 430, y: 156, width: 275, height: 72 }, rotation: 0, author: 'agent', opacity: 1 },
  { id: 'recon_prompt', kind: 'text', text: 'Evaluate the integral, then explain the geometry.', color: '#171713', fontSize: 17, bounds: { x: 438, y: 242, width: 260, height: 50 }, rotation: 0, author: 'agent', opacity: 1 },
  { id: 'recon_work', kind: 'equation', latex: 'xe^x-e^x x+C', color: '#f05f44', bounds: { x: 430, y: 308, width: 275, height: 62 }, rotation: 0, author: 'agent', opacity: 1 },
]
const auditedPass = firstPass.map((object) => object.id === 'recon_work'
  ? { ...object, latex: 'xe^x-e^x+C', color: '#171713' }
  : object)

const injected = String.raw`
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
  const mc = document.modelContext
  const call = async (name, args = {}) => {
    const tools = await mc.getTools()
    const target = tools.find((tool) => tool.name === name)
    if (!target) throw new Error('Missing WebMCP tool: ' + name)
    const raw = await mc.executeTool(target, JSON.stringify(args))
    const result = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!result?.ok) throw new Error(name + ': ' + (result?.error || 'tool failed'))
    return result
  }
  const setInput = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const press = (selector, text) => {
    const candidates = [...document.querySelectorAll(selector)]
    const button = text ? candidates.find((item) => (item.textContent || '').includes(text)) : candidates[0]
    if (!button) throw new Error('Missing control: ' + selector + ' ' + (text || ''))
    button.click()
    return button
  }

  window.__mathburstDemo = {
    call,
    sleep,
    async reconstruction() {
      await sleep(1700)
      await call('reconstruct_problem', {
        sourceImageId: 'source',
        proposedObjects: ${JSON.stringify(firstPass)},
        uncertainObjectIds: ['recon_work'],
      })
      await sleep(1700)
      await call('audit_reconstruction', {
        auditSummary: 'Matched every symbol to the photograph and removed the duplicated x.',
        proposedObjects: ${JSON.stringify(auditedPass)},
        uncertainObjectIds: [],
      })
      await sleep(1700)
      press('button', 'Approve clean conversion')
      await sleep(1600)
      return { approved: Boolean(document.querySelector('[data-object-id="eq_integral"]')) }
    },
    async misconception() {
      const input = document.querySelector('#next-step-input')
      if (!input) throw new Error('Missing calculus attempt input')
      setInput(input, 'u=x, \\; dv=e^x dx')
      press('button', 'Check step')
      await sleep(5200)
      setInput(input, 'du=e^x dx')
      press('button', 'Check step')
      await sleep(5200)
      const read = await call('get_objects', { ids: ['eq_integrand'], limit: 1 })
      const equation = read.data.objects[0]
      await call('apply_actions', {
        summary: 'Asked one diagnostic question',
        operations: [
          { type: 'put', object: { ...equation, opacity: 1 } },
          { type: 'put', object: { id: 'demo_tutor_question', kind: 'text', text: 'What changes when you differentiate u?', color: '#171713', fontSize: 25, bounds: { x: 750, y: 505, width: 255, height: 88 }, rotation: 0, author: 'agent', opacity: 1 } },
          { type: 'session', patch: { helpShown: ['diagnostic-question'] } },
          { type: 'select', ids: ['demo_tutor_question'] },
        ],
      })
      return { attempts: 2 }
    },
    async representation() {
      const activity = document.querySelector('.activity-toggle[aria-expanded="true"]')
      activity?.click()
      await sleep(1800)
      const graph = await call('graph_expression', {
        equationId: 'eq_integrand',
        parameters: { a: 1 },
        showTangentAt: 1,
        shadeIntegral: [0, 1],
        bounds: { x: 730, y: 150, width: 460, height: 330 },
      })
      await sleep(7600)
      await call('update_objects', {
        summary: 'Edited the live source equation',
        updates: [{ id: 'eq_integrand', patch: { latex: 'a x^2 e^x' } }],
      })
      await call('apply_actions', {
        summary: 'Linked the graph to the tutoring context',
        operations: [{ type: 'session', patch: { helpShown: ['diagnostic-question', 'linked-integrand-graph'] } }],
      })
      await sleep(5400)
      return graph
    },
    async control() {
      document.querySelector('.activity-toggle[aria-expanded="false"]')?.click()
      await sleep(1200)
      await call('create_objects', {
        summary: 'Created a visual explanation',
        objects: [
          { id: 'demo_control_shape', kind: 'shape', shape: 'ellipse', fill: '#e7e0ff', stroke: '#7c5cff', bounds: { x: 520, y: 410, width: 180, height: 92 }, rotation: 0, author: 'agent', opacity: 1 },
          { id: 'demo_control_note', kind: 'text', text: 'same world · same undo', color: '#171713', fontSize: 18, bounds: { x: 535, y: 438, width: 155, height: 44 }, rotation: 0, author: 'agent', opacity: 1 },
        ],
      })
      await sleep(3000)
      await call('create_objects', {
        summary: 'Grouped the explanation',
        objects: [{ id: 'demo_control_group', kind: 'group', childIds: ['demo_control_shape', 'demo_control_note'], bounds: { x: 520, y: 410, width: 180, height: 92 }, rotation: 0, author: 'agent', opacity: 1 }],
      })
      await sleep(2600)
      await call('transform_objects', {
        summary: 'Transformed the grouped explanation',
        ids: ['demo_control_group'],
        translate: { x: 72, y: -28 },
        rotate: 4,
      })
      await sleep(3500)
      await call('step_history', { direction: 'undo' })
      await sleep(2800)
      return true
    },
    async goGeometry() {
      press('[data-camera-target="geometry"]')
      await sleep(2300)
      return true
    },
    async goMatrixAndEdit() {
      press('[data-camera-target="matrix"]')
      await sleep(2600)
      const matrix = document.querySelector('[data-object-id="transformer_matrix"]')
      if (!matrix) throw new Error('Missing transformer matrix')
      matrix.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }))
      await sleep(3600)
      const inputs = [...document.querySelectorAll('.matrix-editor-grid input')]
      if (inputs.length !== 4) throw new Error('Matrix editor did not open')
      setInput(inputs[0], '1.35')
      setInput(inputs[1], '0.25')
      await sleep(2600)
      press('.object-editor button', 'Commit')
      await sleep(3200)
      return true
    },
    async tools() {
      const trigger = document.querySelector('.webmcp-inspector-trigger')
      if (!trigger) throw new Error('Missing WebMCP inspector trigger')
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
      await sleep(2300)
      const row = document.querySelector('[data-tool-name="get_world"]')
      row?.querySelector('button')?.click()
      await sleep(2200)
      return { tools: document.querySelectorAll('.webmcp-tool').length }
    },
  }
  return 'Mathburst demo driver ready'
`
await evaluate(injected)

const measure = (selectors) => evaluate(`
  for (const selector of ${JSON.stringify(selectors)}) {
    const element = document.querySelector(selector)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 24) continue
    return { selector, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
  }
  return null
`)

async function dragGeometryPoint() {
  await evaluate('return await window.__mathburstDemo.goGeometry()')
  const point = await evaluate(`
    const element = document.querySelector('[data-object-id="geometry_construction"] .geometry-point.is-draggable')
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  `)
  if (!point) throw new Error('Could not locate draggable geometry point A.')
  const destination = { x: point.x + 74, y: point.y - 46 }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let index = 1; index <= 24; index += 1) {
    const progress = index / 24
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x + (destination.x - point.x) * progress,
      y: point.y + (destination.y - point.y) * progress,
      button: 'left',
      buttons: 1,
    })
    await wait(55)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: destination.x, y: destination.y, button: 'left', buttons: 0, clickCount: 1 })
  await wait(2200)
  return true
}

const beats = [
  { name: 'reconstruction', durationSeconds: 15, label: 'photograph → audited live math', run: () => evaluate('return await window.__mathburstDemo.reconstruction()'), focus: ['[data-object-id="problem"]', '[data-object-id="eq_integral"]'] },
  { name: 'tutoring', durationSeconds: 33, label: 'two attempts → one tutor question', run: () => evaluate('return await window.__mathburstDemo.misconception()'), focus: ['.tutor-attempt-panel', '[data-object-id="demo_tutor_question"]'] },
  { name: 'representation', durationSeconds: 30, label: 'linked graph reacts to equation edit', run: () => evaluate('return await window.__mathburstDemo.representation()'), focus: ['.world-object.kind-graph:not([aria-hidden="true"])', '[data-object-id="eq_integrand"]'] },
  { name: 'control', durationSeconds: 24, label: 'create, group, transform, attribute, undo', run: () => evaluate('return await window.__mathburstDemo.control()'), focus: ['.activity-rail:not(.is-collapsed)', '[data-object-id="demo_control_shape"]'] },
  { name: 'geometry', durationSeconds: 23, label: 'drag one point; recompute the construction', run: dragGeometryPoint, focus: ['[data-object-id="geometry_construction"]', '[data-demo-scene="geometry"]'] },
  { name: 'matrix', durationSeconds: 20, label: 'edit WQ; transform vector geometry', run: () => evaluate('return await window.__mathburstDemo.goMatrixAndEdit()'), focus: ['[data-object-id="transformer_matrix"]', '[data-demo-scene="matrix"]'] },
  { name: 'tools', durationSeconds: 10, label: 'eighteen page tools; one shared world', run: () => evaluate('return await window.__mathburstDemo.tools()'), focus: ['[aria-label="WebMCP tool inspector"]', '.webmcp-inspector-trigger'] },
]

if (beats.reduce((sum, beat) => sum + beat.durationSeconds, 0) !== 155) {
  throw new Error('The recording beat budget must equal exactly 155 seconds.')
}

const frames = []
const startedAt = Date.now()
let recording = true
const capture = (async () => {
  const period = Math.round(1000 / FPS)
  while (recording) {
    const started = Date.now()
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      frames.push(shot.data)
    } catch { /* skip a frame rather than abort the take */ }
    const spent = Date.now() - started
    if (spent < period) await wait(period - spent)
  }
})()

const timeline = []
for (const beat of beats) {
  process.stdout.write(`  ${beat.label}… `)
  const beatStartedAt = Date.now()
  const startSeconds = (beatStartedAt - startedAt) / 1000
  const startFrame = frames.length
  const result = await beat.run()
  const remaining = beat.durationSeconds * 1000 - (Date.now() - beatStartedAt)
  if (remaining > 0) await wait(remaining)
  const focus = await measure(beat.focus)
  timeline.push({
    beat: beat.name,
    startSeconds,
    endSeconds: (Date.now() - startedAt) / 1000,
    startFrame,
    endFrame: frames.length,
    focus,
    result,
  })
  console.log(focus ? `${focus.selector} ${focus.width}×${focus.height}` : 'no focus region')
}

recording = false
await capture
const elapsedSeconds = (Date.now() - startedAt) / 1000
ws.close()

if (frames.length < 100) throw new Error(`Only ${frames.length} frames were captured.`)
const effectiveFps = frames.length / elapsedSeconds
console.log(`captured ${frames.length} frames over ${elapsedSeconds.toFixed(1)}s (${effectiveFps.toFixed(3)} effective fps)`)

rmSync(frameRoot, { recursive: true, force: true })
mkdirSync(frameRoot, { recursive: true })
frames.forEach((base64, index) => {
  writeFileSync(resolve(frameRoot, `f${String(index).padStart(5, '0')}.png`), Buffer.from(base64, 'base64'))
})

mkdirSync(dirname(resolve(OUT)), { recursive: true })
execFileSync('ffmpeg', [
  '-y',
  '-framerate', effectiveFps.toFixed(4),
  '-i', resolve(frameRoot, 'f%05d.png'),
  '-vf', 'format=yuv420p',
  '-r', '30',
  '-fps_mode', 'cfr',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '19',
  '-movflags', '+faststart',
  resolve(OUT),
], { stdio: 'inherit' })

mkdirSync(dirname(resolve(BEATS_OUT)), { recursive: true })
writeFileSync(resolve(BEATS_OUT), JSON.stringify({
  source: { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: DPR },
  encodedFps: 30,
  elapsedSeconds,
  beats: timeline,
}, null, 2))

rmSync(frameRoot, { recursive: true, force: true })
console.log('wrote', resolve(OUT))
console.log('wrote', resolve(BEATS_OUT))
