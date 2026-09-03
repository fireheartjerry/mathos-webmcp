/**
 * Inserts the Act 5 parity shots and the Act 0.2 new-project beat into the film
 * manifest, and reclaims the runtime they need from shots that are mostly hold.
 *
 * Run once. It is idempotent: a shot that already exists is left alone.
 *
 *   node scripts/film/add-act5-shots.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const FILE = resolve('.', 'video/film.manifest.json')
const manifest = JSON.parse(readFileSync(FILE, 'utf8'))
const has = (id) => manifest.shots.some((shot) => shot.id === id)
const indexOf = (id) => manifest.shots.findIndex((shot) => shot.id === id)

/**
 * Act 0.2. The cursor makes a project called Pipeline through the real dialog,
 * lands on the blank canvas, then returns to the gallery so `cold-open` starts
 * from the state it already expects. A blank project has no templateId, and the
 * Director refuses to open without one, so the film cannot simply stay here.
 */
const newProject = {
  id: 'new-project',
  title: 'A new project',
  seconds: 12,
  stage: 'gallery',
  approved: false,
  steps: [
    { pointer: { x: 0.5, y: 0.56 } },
    { wait: 1200 },
    { click: '.new-project-button' },
    { waitFor: '#new-project-title' },
    { wait: 700 },
    { type: '#new-project-title', value: 'Pipeline', settleMs: 500, enter: false },
    { wait: 500 },
    { click: '.project-template-grid button', text: 'Blank canvas' },
    { wait: 700 },
    { click: '.project-create-submit' },
    { waitFor: '.tool-ledger' },
    { wait: 2200 },
    { pointer: { x: 0.03, y: 0.42 } },
    { wait: 1200 },
    { click: '.wordmark' },
    { wait: 1100 },
  ],
  camera: [
    { at: 0, zoom: 1.04, x: 0.5, y: 0.5 },
    { at: 12, zoom: 1.0, x: 0.5, y: 0.5 },
  ],
  transitionOut: 'camera',
}

/**
 * Act 5.1. The agent rings the density widget, the learner resizes and rotates
 * that same ellipse with the handles, and the agent then recolours it to the
 * learner's graphite through edit_shape. Same object, two routes.
 *
 * `stage: 'gallery'` is doing a second job here: it is the only flag that stops
 * previewNext() firing at the shot boundary, and these shots run with the
 * Director closed because the rail clamps to select/hand while it is open.
 */
const parityShapes = {
  id: 'parity-shapes',
  title: 'The same shape, from both sides',
  seconds: 15,
  stage: 'gallery',
  approved: false,
  steps: [
    { closeDirector: true },
    { openProject: 'gamma-lab' },
    { navigateScene: 'gamma-probability' },
    { wait: 900 },
    { cue: 'parity-shapes' },
    { wait: 600 },
    { click: '.rail-button[aria-label=Select]' },
    { click: '.world-object.kind-shape:has(ellipse)' },
    { waitFor: '[data-handle=se]' },
    { drag: '[data-handle=se]', px: { dx: 64, dy: 38 }, durationMs: 1100 },
    { wait: 350 },
    { drag: '[data-handle=rotate]', px: { dx: 54, dy: 0 }, durationMs: 1000 },
    { wait: 400 },
    { cue: 'parity-shapes-match' },
    { wait: 500 },
    { pointer: { x: 0.55, y: 0.94 } },
  ],
  camera: [
    { at: 0, zoom: 1.0, x: 0.5, y: 0.5 },
    { at: 15, zoom: 1.04, x: 0.52, y: 0.48 },
  ],
  transitionOut: 'camera',
}

/**
 * Act 5.3, and the reason Act 5 matters. The learner highlights and erases with
 * the rail; then the agent erases the circle IT drew in Act 1 and one undo puts
 * it back. Erase and undo live in one cue on purpose, because the cue runner
 * appends a selection commit at the end and a separately issued undo would
 * reverse that instead of the erase.
 */
const parityInk = {
  id: 'parity-ink',
  title: 'Undo works on me too',
  seconds: 16,
  stage: 'gallery',
  approved: false,
  steps: [
    { click: '.rail-button[aria-label=Highlighter]' },
    { wait: 400 },
    { drag: '[data-object-id="graph_integrand"] tr.is-softmax th', px: { dx: 320, dy: 0 }, durationMs: 1100 },
    { wait: 600 },
    { click: '.rail-button[aria-label=Pen]' },
    { drag: '[data-object-id="gamma_bridge_equation"]', px: { dx: 150, dy: -46 }, durationMs: 900 },
    { wait: 400 },
    { click: '.rail-button[aria-label=Eraser]' },
    { drag: '[data-object-id="gamma_bridge_equation"]', px: { dx: 150, dy: -46 }, durationMs: 900 },
    { wait: 500 },
    { click: '.rail-button[aria-label=Select]' },
    { navigateScene: 'gamma-clinic' },
    { wait: 900 },
    { cue: 'parity-ink-erase' },
    { wait: 1400 },
    { openDirector: true },
    { wait: 500 },
  ],
  camera: [
    { at: 0, zoom: 1.04, x: 0.52, y: 0.48 },
    { at: 9, zoom: 1.06, x: 0.44, y: 0.46 },
    { at: 16, zoom: 1.0, x: 0.5, y: 0.5 },
  ],
  transitionOut: 'camera',
}

// --- insert ----------------------------------------------------------------
if (!has('new-project')) manifest.shots.unshift(newProject)
if (!has('parity-shapes')) {
  const at = indexOf('homothety')
  manifest.shots.splice(at + 1, 0, parityShapes, parityInk)
}

// --- reclaim runtime -------------------------------------------------------
// These are budgets, not measured lengths; the cut list trims each shot's tail to
// what its own narration needs. Cold open loses the most because eight of its
// thirty-eight seconds are pure cursor drift, and `new-project` now supplies that
// motion with something actually happening in it.
const TRIM = { 'cold-open': 22, 'gamma-probability': 16, 'reconstruction': 9, 'webmcp-crescendo': 10, 'one-world': 11 }
for (const shot of manifest.shots) {
  if (TRIM[shot.id] !== undefined && shot.seconds > TRIM[shot.id]) shot.seconds = TRIM[shot.id]
}

// Cold open no longer has to carry the whole opening argument on its own, so drop
// the three long cursor drifts that were only there to fill it.
const cold = manifest.shots.find((shot) => shot.id === 'cold-open')
if (cold) {
  const trimmed = []
  let dropped = 0
  for (const step of cold.steps) {
    // The first two pointer-then-wait pairs are dead time before the first click.
    if (dropped < 2 && step.pointer && step.pointer.y === 0.44) { dropped += 1; continue }
    if (dropped > 0 && step.wait && step.wait > 2000 && trimmed.at(-1)?.pointer === undefined) { trimmed.push({ wait: 1200 }); continue }
    trimmed.push(step)
  }
  cold.steps = trimmed
}

writeFileSync(FILE, `${JSON.stringify(manifest, null, 2)}\n`)
const total = manifest.shots.reduce((sum, shot) => sum + (shot.seconds ?? 0), 0)
console.log(`${manifest.shots.length} shots, budget ${total}s (cap ${manifest.output.maxSeconds}s)`)
for (const shot of manifest.shots) console.log(`  ${String(shot.seconds).padStart(3)}s  ${shot.id}`)
