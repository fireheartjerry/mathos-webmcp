/**
 * Browser-plugin recorder for the seven-beat Mathburst demo.
 *
 * The caller supplies a Browser-plugin tab, CDP session, and WebMCP bridge.
 * This module intentionally has no top-level side effects so the browser
 * plugin can import it and decide when to begin the uninterrupted take.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'

const FPS = 8
const VIEWPORT_W = 1280
const VIEWPORT_H = 800
const DPR = 2

const wait = (ms) => new Promise((done) => setTimeout(done, ms))

/**
 * Record the exact 155-second Mathburst product take using existing browser
 * plugin handles.
 */
export async function recordMathburstDemo({ tab, cdp, webmcp, rootDir }) {
  if (!cdp?.send || (!webmcp?.call && !webmcp?.fetchTools)) {
    throw new Error('Expected cdp.send plus a WebMCP capability or tool handle.')
  }
  if (!rootDir) throw new Error('rootDir is required.')

  const workspaceRoot = resolve(rootDir)
  const frameRoot = resolve(workspaceRoot, '.demo-frames-browser')
  const output = resolve(workspaceRoot, 'video/public/screen.mp4')
  const beatsOutput = resolve(workspaceRoot, 'video/public/beats.json')
  if (frameRoot === workspaceRoot || !frameRoot.toLowerCase().startsWith((workspaceRoot + sep).toLowerCase())) {
    throw new Error(`Frame directory must resolve inside rootDir, not ${frameRoot}`)
  }

  const evaluate = async (body) => {
    const response = await cdp.send('Runtime.evaluate', {
      expression: `(async () => { ${body} })()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (response?.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Page evaluation failed.')
    return response?.result?.value
  }

  const waitFor = async (body, timeoutMs = 15_000) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      try {
        if (await evaluate(body)) return
      } catch {
        // The page can briefly be unavailable while reload/hydration completes.
      }
      await wait(200)
    }
    throw new Error(`Timed out waiting for page condition: ${body}`)
  }

  let toolBridge = webmcp
  const callTool = async (name, input = {}) => {
    const result = await toolBridge.call(name, input)
    if (!result?.ok) throw new Error(`${name}: ${result?.error || 'tool failed'}`)
    return result
  }

  const setInput = (selector, value) => evaluate(`
    const input = document.querySelector(${JSON.stringify(selector)})
    if (!input) throw new Error('Missing input: ' + ${JSON.stringify(selector)})
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, ${JSON.stringify(value)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  `)

  const press = (selector, text = '') => evaluate(`
    const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})]
    const button = ${text ? `candidates.find((item) => (item.textContent || '').includes(${JSON.stringify(text)}))` : 'candidates[0]'}
    if (!button) throw new Error('Missing control: ' + ${JSON.stringify(selector)} + ' ' + ${JSON.stringify(text)})
    button.click()
    return true
  `)

  const clickIfPresent = (selector) => evaluate(`
    const element = document.querySelector(${JSON.stringify(selector)})
    if (element) element.click()
    return Boolean(element)
  `)

  const measure = async (selectors) => evaluate(`
    for (const selector of ${JSON.stringify(selectors)}) {
      const element = document.querySelector(selector)
      if (!element) continue
      const rect = element.getBoundingClientRect()
      if (rect.width < 40 || rect.height < 24) continue
      return { sel: selector, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
    }
    return null
  `)

  if (typeof tab?.reload === 'function') {
    await evaluate('localStorage.removeItem("mathburst.world.v1"); return true')
    await tab.reload()
  }
  await waitFor('return document.readyState === "complete"')
  await waitFor('return document.querySelector("[data-hydrated=true]") !== null')
  await waitFor('return document.visibilityState === "visible"')
  await waitFor('return typeof document.modelContext?.getTools === "function"')
  await waitFor('return (await document.modelContext.getTools()).length === 18')
  if (typeof webmcp.fetchTools === 'function') toolBridge = await webmcp.fetchTools()

  const firstPass = [
    { id: 'eq_integral', kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713', bounds: { x: 430, y: 156, width: 275, height: 72 }, rotation: 0, author: 'agent', opacity: 1 },
    { id: 'recon_prompt', kind: 'text', text: 'Evaluate the integral, then explain the geometry.', color: '#171713', fontSize: 17, bounds: { x: 438, y: 242, width: 260, height: 50 }, rotation: 0, author: 'agent', opacity: 1 },
    { id: 'recon_work', kind: 'equation', latex: 'xe^x-e^x x+C', color: '#f05f44', bounds: { x: 430, y: 308, width: 275, height: 62 }, rotation: 0, author: 'agent', opacity: 1 },
  ]
  const auditedPass = firstPass.map((object) => object.id === 'recon_work'
    ? { ...object, latex: 'xe^x-e^x+C', color: '#171713' }
    : object)

  const reconstruction = async () => {
    await wait(1700)
    await callTool('reconstruct_problem', { sourceImageId: 'source', proposedObjects: firstPass, uncertainObjectIds: ['recon_work'] })
    await wait(1700)
    await callTool('audit_reconstruction', { auditSummary: 'Matched every symbol to the photograph and removed the duplicated x.', proposedObjects: auditedPass, uncertainObjectIds: [] })
    await wait(1700)
    await press('button', 'Approve clean conversion')
    await wait(1600)
    return { approved: await evaluate('return document.querySelector("[data-object-id=eq_integral]") !== null') }
  }

  const misconception = async () => {
    await setInput('#next-step-input', 'u=x, \\; dv=e^x dx')
    await press('button', 'Check step')
    await wait(5200)
    await setInput('#next-step-input', 'du=e^x dx')
    await press('button', 'Check step')
    await wait(5200)
    const read = await callTool('get_objects', { ids: ['eq_integrand'], limit: 1 })
    const equation = read.data.objects[0]
    await callTool('apply_actions', {
      summary: 'Asked one diagnostic question',
      operations: [
        { type: 'put', object: { ...equation, opacity: 1 } },
        { type: 'put', object: { id: 'demo_tutor_question', kind: 'text', text: 'What changes when you differentiate u?', color: '#171713', fontSize: 25, bounds: { x: 750, y: 505, width: 255, height: 88 }, rotation: 0, author: 'agent', opacity: 1 } },
        { type: 'session', patch: { helpShown: ['diagnostic-question'] } },
        { type: 'select', ids: ['demo_tutor_question'] },
      ],
    })
    return { attempts: 2 }
  }

  const representation = async () => {
    await clickIfPresent('.activity-toggle[aria-expanded="true"]')
    await wait(1800)
    const graph = await callTool('graph_expression', { equationId: 'eq_integrand', parameters: { a: 1 }, showTangentAt: 1, shadeIntegral: [0, 1], bounds: { x: 730, y: 150, width: 460, height: 330 } })
    await wait(7600)
    await callTool('update_objects', { summary: 'Edited the live source equation', updates: [{ id: 'eq_integrand', patch: { latex: 'a x^2 e^x' } }] })
    await callTool('apply_actions', { summary: 'Linked the graph to the tutoring context', operations: [{ type: 'session', patch: { helpShown: ['diagnostic-question', 'linked-integrand-graph'] } }] })
    await wait(5400)
    return graph
  }

  const control = async () => {
    await clickIfPresent('.activity-toggle[aria-expanded="false"]')
    await wait(1200)
    await callTool('create_objects', {
      summary: 'Created a visual explanation',
      objects: [
        { id: 'demo_control_shape', kind: 'shape', shape: 'ellipse', fill: '#e7e0ff', stroke: '#7c5cff', bounds: { x: 520, y: 410, width: 180, height: 92 }, rotation: 0, author: 'agent', opacity: 1 },
        { id: 'demo_control_note', kind: 'text', text: 'same world · same undo', color: '#171713', fontSize: 18, bounds: { x: 535, y: 438, width: 155, height: 44 }, rotation: 0, author: 'agent', opacity: 1 },
      ],
    })
    await wait(3000)
    await callTool('create_objects', { summary: 'Grouped the explanation', objects: [{ id: 'demo_control_group', kind: 'group', childIds: ['demo_control_shape', 'demo_control_note'], bounds: { x: 520, y: 410, width: 180, height: 92 }, rotation: 0, author: 'agent', opacity: 1 }] })
    await wait(2600)
    await callTool('transform_objects', { summary: 'Transformed the grouped explanation', ids: ['demo_control_group'], translate: { x: 72, y: -28 }, rotate: 4 })
    await wait(3500)
    await callTool('step_history', { direction: 'undo' })
    await wait(2800)
    return true
  }

  const goGeometry = async () => {
    await press('[data-camera-target="geometry"]')
    await wait(2300)
    const point = await evaluate(`
      const element = document.querySelector('[data-object-id="geometry_construction"] .geometry-point.is-draggable')
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    `)
    if (!point) throw new Error('Could not locate draggable geometry point A.')
    const destination = { x: point.x + 74, y: point.y - 46 }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1 })
    for (let index = 1; index <= 24; index += 1) {
      const progress = index / 24
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + (destination.x - point.x) * progress, y: point.y + (destination.y - point.y) * progress, button: 'left', buttons: 1 })
      await wait(55)
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: destination.x, y: destination.y, button: 'left', buttons: 0, clickCount: 1 })
    await wait(2200)
    return true
  }

  const goMatrixAndEdit = async () => {
    await press('[data-camera-target="matrix"]')
    await wait(2600)
    const matrix = await evaluate(`
      const element = document.querySelector('[data-object-id="transformer_matrix"]')
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    `)
    if (!matrix) throw new Error('Missing transformer matrix')
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: matrix.x, y: matrix.y })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: matrix.x, y: matrix.y, button: 'left', buttons: 1, clickCount: 2 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: matrix.x, y: matrix.y, button: 'left', buttons: 0, clickCount: 2 })
    await wait(3600)
    const inputs = await evaluate('return document.querySelectorAll(".matrix-editor-grid input").length')
    if (inputs !== 4) throw new Error('Matrix editor did not open')
    await setInput('.matrix-editor-grid input:nth-of-type(1)', '1.35')
    await setInput('.matrix-editor-grid input:nth-of-type(2)', '0.25')
    await wait(2600)
    await press('.object-editor button', 'Commit')
    await wait(3200)
    return true
  }

  const tools = async () => {
    const expanded = await evaluate('return document.querySelector(".webmcp-inspector-trigger")?.getAttribute("aria-expanded") === "true"')
    if (!expanded) await press('.webmcp-inspector-trigger')
    await wait(2300)
    const world = await callTool('get_world', {})
    await evaluate(`
      const row = document.querySelector('[data-tool-name="get_world"]')
      row?.querySelector('button')?.click()
      return Boolean(row)
    `)
    await wait(2200)
    return { tools: world?.data?.tools?.length ?? 18 }
  }

  const beats = [
    { name: 'reconstruction', durationSeconds: 15, label: 'photograph → audited live math', run: reconstruction, focus: ['[data-object-id="problem"]', '[data-object-id="eq_integral"]'] },
    { name: 'tutoring', durationSeconds: 33, label: 'two attempts → one tutor question', run: misconception, focus: ['.tutor-attempt-panel', '[data-object-id="demo_tutor_question"]'] },
    { name: 'representation', durationSeconds: 30, label: 'linked graph reacts to equation edit', run: representation, focus: ['.world-object.kind-graph:not([aria-hidden="true"])', '[data-object-id="eq_integrand"]'] },
    { name: 'control', durationSeconds: 24, label: 'create, group, transform, attribute, undo', run: control, focus: ['.activity-rail:not(.is-collapsed)', '[data-object-id="demo_control_shape"]'] },
    { name: 'geometry', durationSeconds: 23, label: 'drag one point; recompute the construction', run: goGeometry, focus: ['[data-object-id="geometry_construction"]', '[data-demo-scene="geometry"]'] },
    { name: 'matrix', durationSeconds: 20, label: 'edit WQ; transform vector geometry', run: goMatrixAndEdit, focus: ['[data-object-id="transformer_matrix"]', '[data-demo-scene="matrix"]'] },
    { name: 'tools', durationSeconds: 10, label: 'eighteen page tools; one shared world', run: tools, focus: ['[aria-label="WebMCP tool inspector"]', '.webmcp-inspector-trigger'] },
  ]
  if (beats.reduce((sum, beat) => sum + beat.durationSeconds, 0) !== 155) throw new Error('The recording beat budget must equal exactly 155 seconds.')

  rmSync(frameRoot, { recursive: true, force: true })
  mkdirSync(frameRoot, { recursive: true })
  const startedAt = Date.now()
  let recording = true
  let frameCount = 0
  const capture = (async () => {
    const period = Math.round(1000 / FPS)
    while (recording) {
      const frameStarted = Date.now()
      try {
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        writeFileSync(resolve(frameRoot, `f${String(frameCount).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'))
        frameCount += 1
      } catch {
        // Skip an occasional screenshot without aborting the demo take.
      }
      const spent = Date.now() - frameStarted
      if (spent < period) await wait(period - spent)
    }
  })()

  const timeline = []
  let scheduledSeconds = 0
  for (const beat of beats) {
    const beatStartedAt = Date.now()
    const startFrame = frameCount
    const result = await beat.run()
    const remaining = beat.durationSeconds * 1000 - (Date.now() - beatStartedAt)
    if (remaining > 0) await wait(remaining)
    timeline.push({
      beat: beat.name,
      startSeconds: scheduledSeconds,
      endSeconds: scheduledSeconds + beat.durationSeconds,
      startFrame,
      endFrame: frameCount,
      focus: await measure(beat.focus),
      result,
    })
    scheduledSeconds += beat.durationSeconds
  }

  recording = false
  await capture
  const elapsedSeconds = (Date.now() - startedAt) / 1000
  if (frameCount < 100) throw new Error(`Only ${frameCount} frames were captured.`)
  const effectiveFps = frameCount / elapsedSeconds

  mkdirSync(dirname(output), { recursive: true })
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
    output,
  ], { stdio: 'inherit' })

  mkdirSync(dirname(beatsOutput), { recursive: true })
  writeFileSync(beatsOutput, JSON.stringify({ source: { width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: DPR }, encodedFps: 30, elapsedSeconds, beats: timeline }, null, 2))
  rmSync(frameRoot, { recursive: true, force: true })
  return { output, beatsOutput, frameCount, elapsedSeconds, beats: timeline }
}
