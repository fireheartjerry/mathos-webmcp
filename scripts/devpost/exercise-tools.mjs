/**
 * Headless exerciser for Mathburst's 48 WebMCP tools.
 *
 * Approach: this Node script uses esbuild (already in node_modules) to bundle the
 * real TypeScript domain modules — createWorldTools, dispatchWorldAction,
 * stepWorldHistory, createSeedWorld and the project library — into a temporary ESM
 * bundle, then imports it. No product source is modified and nothing is stubbed:
 * the world bridge dispatches through the real reducer and history mechanism.
 *
 * Run: node scripts/devpost/exercise-tools.mjs
 */
import { createRequire } from 'node:module'
import { writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
// pnpm does not hoist esbuild to the root node_modules; resolve it from the store.
import { readdirSync } from 'node:fs'
const store = join(ROOT, 'node_modules', '.pnpm')
const esbuildDir = readdirSync(store).filter((entry) => /^esbuild@/.test(entry)).sort().at(-1)
const esbuild = require(join(store, esbuildDir, 'node_modules', 'esbuild'))

const ENTRY = `
export { createWorldTools } from '${ROOT}src/domain/tools/definitions'
export { dispatchWorldAction, stepWorldHistory } from '${ROOT}src/domain/world/reducer'
export { createSeedWorld } from '${ROOT}src/domain/world/seed'
export { createDefaultProjectLibrary, createUserProject, cloneWorld } from '${ROOT}src/domain/world/library'
export { summarizeProject } from '${ROOT}src/domain/tools/leverage'
export { getViewportForScene, getScenesForProject, PROJECTS, SCENES } from '${ROOT}src/domain/world/projects'
export { evaluateTinyModel } from '${ROOT}src/domain/math/transformer'
export { TOOL_GROUPS } from '${ROOT}src/domain/tools/groups'
`

const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  logLevel: 'silent',
})
const bundlePath = join(tmpdir(), `mathburst-exercise-tools-${process.pid}.mjs`)
await writeFile(bundlePath, built.outputFiles[0].text)
const api = await import(pathToFileURL(bundlePath).href)
await rm(bundlePath, { force: true })

// ---------------------------------------------------------------------------
// In-memory WorldBridge over the real reducer, history and project library.
// ---------------------------------------------------------------------------

let world = api.createSeedWorld()
let library = api.createDefaultProjectLibrary()
let activeProject = 'gamma-lab'
let activeScene = 'gamma-probability'
const transient = { spotlights: [], typewrites: [], timelineControls: [], traces: [] }

const bridge = {
  getWorld: () => world,
  getActiveScene: () => activeScene,
  getActiveProject: () => activeProject,
  runAgentAction: async (worldAction, targetIds) => {
    world = api.dispatchWorldAction(world, worldAction)
    return { ok: true, summary: worldAction.summary, changedIds: targetIds ?? [] }
  },
  runHistory: async (direction) => {
    const next = api.stepWorldHistory(world, direction, 'agent')
    if (next === world) return { ok: false, summary: 'No changes made', error: `There is nothing to ${direction}.` }
    world = next
    const commit = direction === 'undo' ? world.future.at(-1) : world.history.at(-1)
    return {
      ok: true,
      summary: `${direction === 'undo' ? 'Undid' : 'Redid'} ${commit?.action.summary ?? 'the last change'}`,
      changedIds: [],
    }
  },
  onTrace: (event) => { transient.traces.push(event) },
  listProjects: () => library.map((project) => api.summarizeProject(project, activeProject)),
  openProject: (projectId, scene) => {
    const project = library.find((entry) => entry.id === projectId && entry.deletedAt === null)
    if (!project) return { ok: false, summary: 'No changes made', error: `Project ${projectId} does not exist.` }
    const current = library.find((entry) => entry.id === activeProject)
    if (current) { current.world = world; current.updatedAt = Date.now() }
    activeProject = project.id
    world = api.cloneWorld(project.world, project.title)
    const ownedScenes = project.templateId ? api.getScenesForProject(project.templateId).map((s) => s.id) : []
    activeScene = scene && ownedScenes.includes(scene) ? scene : project.startScene
    return { ok: true, summary: `Opened ${project.title}`, data: { projectId: project.id, scene: activeScene } }
  },
  openScene: (scene) => {
    const target = api.SCENES[scene]
    if (!target) return { ok: false, summary: 'No changes made', error: `Scene ${scene} does not exist.` }
    activeScene = scene
    activeProject = target.projectId
    const viewport = api.getViewportForScene(scene)
    world = { ...world, viewport }
    return { ok: true, summary: `Opened ${target.title}`, data: { viewport } }
  },
  createProject: (title, templateId) => {
    const project = api.createUserProject(title, templateId, world)
    library.push(project)
    activeProject = project.id
    activeScene = project.startScene
    world = project.world
    return { ok: true, summary: `Created ${project.title}`, data: { projectId: project.id } }
  },
  deleteProject: (projectId) => {
    const project = library.find((entry) => entry.id === projectId)
    if (!project) return { ok: false, summary: 'No changes made', error: `Project ${projectId} does not exist.` }
    if (project.kind === 'built-in') return { ok: false, summary: 'No changes made', error: `Built-in project ${projectId} cannot be deleted.` }
    project.deletedAt = Date.now()
    return { ok: true, summary: `Deleted ${project.title}` }
  },
  focusObjects: (ids, emphasis = 'feature') => {
    const objects = ids.map((id) => world.objects[id]).filter(Boolean)
    if (!objects.length) return { ok: false, summary: 'No changes made', error: 'No objects to focus.' }
    const minX = Math.min(...objects.map((o) => o.bounds.x)); const minY = Math.min(...objects.map((o) => o.bounds.y))
    const maxX = Math.max(...objects.map((o) => o.bounds.x + o.bounds.width)); const maxY = Math.max(...objects.map((o) => o.bounds.y + o.bounds.height))
    const margin = emphasis === 'detail' ? 0.6 : emphasis === 'establish' ? 0.25 : 0.4
    const zoom = Math.min(4, Math.max(0.25, Math.min((1440 * margin) / (maxX - minX), (900 * margin) / (maxY - minY))))
    const viewport = { x: 720 - ((minX + maxX) / 2) * zoom, y: 450 - ((minY + maxY) / 2) * zoom, zoom }
    world = { ...world, viewport }
    return { ok: true, summary: `Focused ${objects.length} object(s)`, data: { viewport } }
  },
  // Render-only capabilities: no domain module exists for these; the bridge
  // records the call and returns success, as specified (never a history commit).
  spotlight: (ids, seconds, label) => {
    transient.spotlights.push({ ids, seconds, label })
    return { ok: true, summary: `Spotlit ${ids.length} object(s) for ${seconds}s`, changedIds: [], data: { ids, seconds } }
  },
  typewrite: async (objectId, field, value, ms) => {
    transient.typewrites.push({ objectId, field, value, ms })
  },
  getAttentionWeights: () => {
    const attention = Object.values(world.objects).find((object) => object.kind === 'attention')
    if (!attention) return null
    return api.evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights
  },
  controlTimeline: (timelineId, action, options = {}) => {
    transient.timelineControls.push({ timelineId, action, options })
    return { ok: true, summary: `Timeline ${action}`, changedIds: [], data: { timelineId, action } }
  },
}

let tools
try {
  tools = api.createWorldTools(bridge)
} catch (error) {
  console.error(`HARNESS FATAL: createWorldTools threw: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

const GROUP_OF = {}
for (const group of api.TOOL_GROUPS) for (const name of group.tools) GROUP_OF[name] = group.id

// Stable stringify: sorts plain-object keys so undo comparisons do not fail on
// key insertion order (a removed-then-restored object is re-inserted at the end).
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}
// World content the reducer tracks, excluding history bookkeeping fields.
const contentOf = (w) => JSON.stringify(stable({
  objects: w.objects, entities: w.entities, bindings: w.bindings, timelines: w.timelines,
  order: w.order, selection: w.selection, viewport: w.viewport, session: w.session, reconstruction: w.reconstruction,
}))
// Everything the bridge can observably change (adds navigation + library state).
const stateOf = () => JSON.stringify({
  content: contentOf(world), activeProject, activeScene,
  library: library.map((p) => ({ id: p.id, title: p.title, deletedAt: p.deletedAt })),
})

const dispatch = (operations, summary = 'Harness setup') => {
  world = api.dispatchWorldAction(world, { id: crypto.randomUUID(), source: 'agent', summary, operations })
}
const baseBounds = { x: 9000, y: 9000, width: 200, height: 120 }
const putObject = (object) => { dispatch([{ type: 'put', object }]); return object.id }
const seedInk = () => putObject({
  id: 'harness_ink', kind: 'ink', points: [{ x: 5, y: 5 }, { x: 50, y: 40 }], color: '#171713', width: 3,
  bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1,
})
const seedShape = () => putObject({
  id: 'harness_shape', kind: 'shape', shape: 'rectangle', fill: 'rgba(124,92,255,0.14)', stroke: '#7c5cff',
  bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1,
})
const seedArrow = () => putObject({
  id: 'harness_arrow', kind: 'arrow', from: { x: 10, y: 10 }, to: { x: 150, y: 60 }, color: '#171713',
  bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1,
})
const seedMatrix = () => putObject({
  id: 'harness_matrix', kind: 'matrix', values: [[1, 0.8], [0, 1]], sourceIds: [], accent: '#7c5cff',
  bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1,
})
const byName = (name) => tools.find((t) => t.name === name)
const seedTimeline = async () => {
  const result = await byName('create_timeline').execute({
    name: 'Harness timeline', duration: 2,
    tracks: [{ target: { kind: 'object', objectId: 'opening_prompt', path: 'opacity' }, keyframes: [{ time: 0, value: 0 }, { time: 2, value: 1 }] }],
  })
  if (!result.ok) throw new Error(`setup create_timeline failed: ${result.error}`)
  return result.data.timelineId
}
const seedReconstructionDraft = async () => {
  const result = await byName('reconstruct_problem').execute({
    sourceImageId: 'source',
    proposedObjects: [{
      id: 'recon_eq_1', kind: 'equation', latex: '\\Gamma(x+1)=x\\Gamma(x)', color: '#171713',
      bounds: { x: -800, y: 700, width: 300, height: 50 }, rotation: 0, author: 'agent', opacity: 1,
    }],
    uncertainObjectIds: ['recon_eq_1'],
  })
  if (!result.ok) throw new Error(`setup reconstruct_problem failed: ${result.error}`)
}

const NO_COMMIT = 'no history commit (navigation / transient playback)'

// ---------------------------------------------------------------------------
// One entry per tool: setup (state seeds), minimal valid input, undo policy.
// ---------------------------------------------------------------------------
const CASES = [
  { name: 'get_world', input: {} },
  { name: 'get_objects', input: { kinds: ['equation', 'graph'], limit: 10 } },
  { name: 'get_selection', input: {} },
  { name: 'get_session_context', input: {} },
  { name: 'get_history', input: {} },
  { name: 'inspect_math', input: { objectId: 'graph_integrand' } },

  { name: 'create_objects', input: { objects: [{ id: 'harness_note', kind: 'text', text: 'Try factoring first', color: '#171713', fontSize: 18, bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1 }] } },
  { name: 'update_objects', input: { updates: [{ id: 'opening_prompt', patch: { color: '#123456' } }] } },
  { name: 'transform_objects', input: { ids: ['opening_prompt'], translate: { x: 40, y: 0 } } },
  { name: 'delete_objects', input: { ids: ['opening_prompt'] } },

  { name: 'apply_actions', input: { summary: 'Selected the prompt', operations: [{ type: 'select', ids: ['opening_prompt'] }] } },
  { name: 'step_history', input: { direction: 'undo' }, setup: () => putObject({ id: 'harness_step_target', kind: 'text', text: 'undo me', color: '#171713', fontSize: 18, bounds: { ...baseBounds }, rotation: 0, author: 'agent', opacity: 1 }), skipUndo: 'step_history is itself the undo mechanism; a second undo would revert the setup commit, not this tool' },
  { name: 'set_viewport', input: { viewport: { x: 10, y: 20, zoom: 1.2 } } },

  { name: 'reconstruct_problem', input: { sourceImageId: 'source', proposedObjects: [{ id: 'recon_eq_1', kind: 'equation', latex: '\\Gamma(x+1)=x\\Gamma(x)', color: '#171713', bounds: { x: -800, y: 700, width: 300, height: 50 }, rotation: 0, author: 'agent', opacity: 1 }], uncertainObjectIds: ['recon_eq_1'] } },
  { name: 'audit_reconstruction', input: { auditSummary: 'Checked the recurrence against the photograph; one term uncertain.' }, setup: seedReconstructionDraft },

  { name: 'graph_expression', input: { latex: 'x^2-2x-1' } },
  { name: 'construct_geometry', input: { primitives: [{ kind: 'point', id: 'A', at: { x: 40, y: 60 } }, { kind: 'point', id: 'B', at: { x: 200, y: 60 } }, { kind: 'segment', id: 'AB', from: 'A', to: 'B' }] } },
  { name: 'visualize_concept', input: { concept: 'matrix-transform' } },

  { name: 'draw_ink', input: { strokes: [[{ x: 100, y: 200 }, { x: 300, y: 200 }]] } },
  { name: 'erase_ink', input: { own: true }, setup: seedInk },
  { name: 'create_shape', input: { shape: 'rectangle', bounds: { x: 100, y: 100, width: 200, height: 120 } } },
  { name: 'edit_shape', input: { objectId: 'harness_shape', fill: 'none' }, setup: seedShape },
  { name: 'set_arrow', input: { objectId: 'harness_arrow', to: { x: 300, y: 200 } }, setup: seedArrow },

  { name: 'edit_text', input: { objectId: 'opening_prompt', text: 'Check the sign here', typewriter: true, typewriterMs: 200 } },
  { name: 'edit_equation', input: { objectId: 'eq_integrand', latex: 'x^2-2x+1' } },
  { name: 'set_graph', input: { objectId: 'graph_integrand', parameters: { a: 5 } } },
  { name: 'set_matrix_cells', input: { objectId: 'harness_matrix', cells: [{ row: 0, column: 1, value: 0.9 }] }, setup: seedMatrix },

  { name: 'create_timeline', input: { name: 'Fade the note', duration: 2, tracks: [{ target: { kind: 'object', objectId: 'opening_prompt', path: 'opacity' }, keyframes: [{ time: 0, value: 0 }, { time: 2, value: 1 }] }] } },
  { name: 'add_keyframes', input: { timelineId: '$timeline', target: { kind: 'object', objectId: 'opening_prompt', path: 'opacity' }, keyframes: [{ time: 1, value: 0.5 }] }, setup: seedTimeline },
  { name: 'play_timeline', input: { timelineId: '$timeline', action: 'play' }, setup: seedTimeline, skipUndo: NO_COMMIT, transient: 'timelineControls' },
  { name: 'get_timelines', input: {} },

  { name: 'list_projects', input: {} },
  { name: 'get_scene_catalog', input: {} },
  { name: 'open_project', input: { projectId: 'tiny-transformer', scene: 'attention-geometry' }, skipUndo: NO_COMMIT },
  { name: 'open_scene', input: { scene: 'gamma-clinic' }, skipUndo: NO_COMMIT },
  { name: 'create_project', input: { title: 'Harness Project', templateId: 'gamma-lab' }, skipUndo: NO_COMMIT },
  { name: 'delete_project', input: { projectId: '$userProject' }, setup: () => bridge.createProject('Harness Delete Me', null), skipUndo: NO_COMMIT },

  { name: 'focus_objects', input: { ids: ['graph_integrand'] }, skipUndo: NO_COMMIT },
  { name: 'spotlight_objects', input: { ids: ['graph_integrand'], seconds: 0.5 } },
  { name: 'explain_object', input: { objectId: 'graph_integrand' } },
  { name: 'evaluate_expression', input: { latex: 'x^2', x: [0, 1, 2] } },
  { name: 'annotate_object', input: { objectId: 'graph_integrand', text: 'Area under the curve' } },

  { name: 'train_model_step', input: {} },
  { name: 'set_attention_weight', input: { matrix: 'wq', row: 0, column: 1, value: 0.8 } },
  { name: 'set_barycentric_weights', input: { weights: [0.2, 0.5, 0.3] } },
  { name: 'move_geometry_point', input: { objectId: 'geometry_construction', pointId: 'A', by: { x: 20, y: 0 } } },
  { name: 'set_simplex_view', input: { section: 0.5 } },
  { name: 'set_partition_view', input: { selectedN: 5, revealTheorem: true } },
]

const resolveInput = (input, ctx) => JSON.parse(JSON.stringify(input), (key, value) => {
  if (value === '$timeline') return ctx.timeline
  if (value === '$userProject') return ctx.userProject
  return value
})

const results = []
for (const testCase of CASES) {
  const tool = byName(testCase.name)
  const row = { name: testCase.name, group: GROUP_OF[testCase.name] ?? '?', readOnly: tool ? tool.annotations.readOnlyHint : '?', status: 'FAIL', error: '', undo: '', summary: '' }
  if (!tool) {
    row.error = 'Tool not produced by createWorldTools.'
    results.push(row); continue
  }
  // Snapshot everything the bridge can touch so each case is independent.
  const snapshot = structuredClone({ world, library, activeProject, activeScene })
  try {
    const ctx = {}
    if (testCase.setup) {
      const seeded = await testCase.setup()
      if (testCase.name === 'add_keyframes' || testCase.name === 'play_timeline') ctx.timeline = seeded
      if (testCase.name === 'delete_project') ctx.userProject = seeded?.data?.projectId
    }
    const afterSetup = { historyLength: world.history.length, content: contentOf(world), state: stateOf(), transients: transient[testCase.transient]?.length ?? 0 }
    const result = await tool.execute(resolveInput(testCase.input, ctx))
    row.summary = result.summary ?? ''
    if (!result.ok) {
      row.error = result.error ?? result.summary
    } else if (tool.annotations.readOnlyHint) {
      if (contentOf(world) === afterSetup.content) row.status = 'PASS'
      else row.error = 'Read-only tool changed the world content.'
    } else if (testCase.transient) {
      if ((transient[testCase.transient]?.length ?? 0) > afterSetup.transients) {
        row.status = 'PASS'
        row.undo = testCase.skipUndo ? `N/A — ${testCase.skipUndo}` : ''
      } else row.error = `ok but bridge.${testCase.transient === 'timelineControls' ? 'controlTimeline' : testCase.transient} was never called.`
    } else {
      if (stateOf() === afterSetup.state) row.error = 'Write tool returned ok but no observable state changed.'
      else {
        row.status = 'PASS'
        const grewHistory = world.history.length > afterSetup.historyLength
        if (testCase.skipUndo) row.undo = `N/A — ${testCase.skipUndo}`
        else if (!grewHistory) row.undo = 'N/A — no history commit recorded'
        else {
          const undo = await bridge.runHistory('undo')
          if (!undo.ok) { row.status = 'FAIL'; row.error = `undo failed: ${undo.error ?? undo.summary}` }
          else if (contentOf(world) !== afterSetup.content) { row.status = 'FAIL'; row.error = 'undo did not restore the pre-call world content.' }
          else row.undo = 'PASS'
        }
      }
    }
  } catch (error) {
    row.status = 'FAIL'
    row.error = `threw: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    world = snapshot.world
    library = snapshot.library
    activeProject = snapshot.activeProject
    activeScene = snapshot.activeScene
  }
  if (!row.undo) row.undo = tool.annotations.readOnlyHint ? '—' : (row.status === 'FAIL' ? 'not reached' : '')
  results.push(row)
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const exercised = results.length
const passed = results.filter((row) => row.status === 'PASS').length
const failed = results.filter((row) => row.status === 'FAIL').length
const notExercised = results.filter((row) => row.status === 'NOT EXERCISED').length

console.log(`Registered tools from createWorldTools: ${tools.length}`)
console.log('')
console.log('| # | Tool | Group | R/W | Call | Undo | Error |')
console.log('|---|------|-------|-----|------|------|-------|')
results.forEach((row, index) => {
  console.log(`| ${index + 1} | ${row.name} | ${row.group} | ${row.readOnly === true ? 'read' : row.readOnly === false ? 'write' : '?'} | ${row.status} | ${row.undo} | ${row.error.replace(/\|/g, '\\|')} |`)
})
console.log('')
console.log('Tool summaries:')
for (const row of results) console.log(`- ${row.name}: ${row.summary}`)
console.log('')
console.log(`Counts: exercised=${exercised} passed=${passed} failed=${failed} notExercised=${notExercised}`)
const missing = tools.filter((tool) => !CASES.some((testCase) => testCase.name === tool.name)).map((tool) => tool.name)
console.log(`Tools registered but with no test case: ${missing.length ? missing.join(', ') : 'none'}`)
const extra = CASES.filter((testCase) => !tools.some((tool) => tool.name === testCase.name)).map((testCase) => testCase.name)
console.log(`Test cases with no registered tool: ${extra.length ? extra.join(', ') : 'none'}`)
