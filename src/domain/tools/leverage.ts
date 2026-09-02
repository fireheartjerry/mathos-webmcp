/**
 * Leverage tools: the sixteen page tools that give an agent the same verbs the
 * learner has in the interface — projects and scenes, focus and annotation,
 * explanation and evaluation, and the per-lab controls (training, attention,
 * barycentrics, geometry points, the simplex section, the partition cutoff).
 *
 * Every mutation goes through the same reducer as the canvas, so it is
 * attributed to the Tutor, visible in the activity rail, and undoable.
 */
import { evaluateLatexAt } from '../math/graph'
import { normalizeBarycentricWeights, pointFromWeights, triangleAreas } from '../math/barycentric'
import { resolveGeometry } from '../math/geometry'
import { finiteEulerProductCoefficients, verifyRamanujanFive } from '../math/partitions'
import { pascalRecurrence, tetrahedralLatticeCount } from '../math/simplex'
import { createInitialTinyModel, evaluateTinyModel, trainOneStep } from '../math/transformer'
import { getProject, getScene, PROJECTS, SCENES } from '../world/projects'
import type { CatalogSceneId, ProjectId, SceneId } from '../world/projects'
import type { GeometryPrimitive, WorldObject, WorldOperation, WorldState } from '../world/types'
import {
  action, boundsSchema, changedIds, emptySchema, isPoint, isRecord, isStringNumberMap, isVector,
  requiredString, schema, tool, values,
} from './definitions'
import type { ToolResult, WorldBridge, WorldTool } from './definitions'

const finiteNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number.`)
  return value
}
const optionalNumber = (value: unknown, field: string): number | undefined => (value === undefined ? undefined : finiteNumber(value, field))
const integer = (value: unknown, field: string, minimum = 0): number => {
  const number = finiteNumber(value, field)
  if (!Number.isInteger(number) || number < minimum) throw new Error(`${field} must be an integer ≥ ${minimum}.`)
  return number
}
const round = (value: number, places = 4) => Number(value.toFixed(places))
const unavailable = (feature: string): ToolResult => ({ ok: false, summary: 'No changes made', error: `${feature} is not available on this page.` })

function objectOfKind<K extends WorldObject['kind']>(world: WorldState, id: string, kind: K): Extract<WorldObject, { kind: K }> {
  const object = world.objects[id]
  if (!object) throw new Error(`Object ${id} does not exist.`)
  if (object.kind !== kind) throw new Error(`Object ${id} is a ${object.kind}, not a ${kind}.`)
  return object as Extract<WorldObject, { kind: K }>
}

/** Find the single object of a kind, or require an id when there are several. */
function resolveOfKind<K extends WorldObject['kind']>(world: WorldState, id: unknown, kind: K): Extract<WorldObject, { kind: K }> {
  if (typeof id === 'string' && id.trim()) return objectOfKind(world, id, kind)
  const candidates = world.order.map((candidate) => world.objects[candidate]).filter((object): object is Extract<WorldObject, { kind: K }> => object?.kind === kind)
  if (candidates.length === 1) return candidates[0]
  if (!candidates.length) throw new Error(`This project has no ${kind} object.`)
  throw new Error(`This project has ${candidates.length} ${kind} objects; pass objectId.`)
}

const fmt = (numbers: readonly number[]) => numbers.map((value) => round(value, 3)).join(', ')

/** A short, honest description of what an object is and what its live values say. */
export function explainObject(world: WorldState, object: WorldObject): { explanation: string; facts: Record<string, unknown> } {
  switch (object.kind) {
    case 'equation': {
      const graphs = world.order.filter((id) => { const item = world.objects[id]; return item?.kind === 'graph' && item.equationId === object.id })
      return { explanation: `A typeset equation, ${object.latex}. ${graphs.length ? `${graphs.length} graph object${graphs.length > 1 ? 's' : ''} re-plot when it changes.` : 'No graph depends on it yet.'}`, facts: { latex: object.latex, dependentGraphIds: graphs } }
    }
    case 'graph': {
      const equation = world.objects[object.equationId]
      const latex = equation?.kind === 'equation' ? equation.latex : null
      const at = object.showTangentAt ?? 0
      const value = latex ? evaluateLatexAt(latex, at, object.parameters) : null
      const density = object.visualization === 'gamma-density'
      return {
        explanation: `${density ? 'A normalised Gamma density' : 'A live graph'} of ${latex ?? 'a missing equation'} over x ∈ [${fmt(object.xDomain)}]${object.parameters ? ` with parameters ${JSON.stringify(object.parameters)}` : ''}.${object.shadeIntegral ? ` The shaded area runs from ${fmt(object.shadeIntegral)}.` : ''}${object.showTangentAt !== undefined ? ` A tangent is drawn at x = ${round(object.showTangentAt)}.` : ''}${density && object.binEdges ? ` Bin edges ${fmt(object.binEdges)} split the area into three probability masses that feed the attention lab.` : ''}`,
        facts: { latex, parameters: object.parameters ?? {}, valueAtTangent: value, xDomain: object.xDomain, yDomain: object.yDomain, binEdges: object.binEdges ?? null },
      }
    }
    case 'attention': {
      const pass = evaluateTinyModel(object.model, object.bridgeMasses, object.temperature)
      return {
        explanation: `A one-head attention card over tokens ${object.model.tokens.join(', ')} with two-dimensional embeddings. Query ${object.model.tokens[object.model.queryIndex]} scores each key by q·k/√2; softmax turns the scores [${fmt(pass.scores)}] into weights [${fmt(pass.attentionWeights)}] that sum to ${round(pass.attentionWeights.reduce((sum, value) => sum + value, 0), 3)}. The context vector predicts ${object.model.tokens[object.model.targetIndex]} with probability ${round(pass.targetProbability, 3)}, cross-entropy ${round(pass.loss, 3)}. Editing any matrix cell recomputes every value.`,
        facts: { scores: pass.scores, weights: pass.attentionWeights, probabilities: pass.probabilities, loss: pass.loss, temperature: object.temperature, bridgeMasses: object.bridgeMasses },
      }
    }
    case 'training': {
      const first = object.lossHistory[0]
      const last = object.lossHistory[object.lossHistory.length - 1]
      return {
        explanation: `A training card that takes honest gradient steps on the visible parameters using central finite differences. It has taken ${object.step} step${object.step === 1 ? '' : 's'}; loss ${first === undefined ? 'is not recorded' : `moved from ${round(first, 3)} to ${round(last, 3)}`}. A step is only committed when loss falls and the target probability rises; the learning rate backs off until that holds.`,
        facts: { step: object.step, lossHistory: object.lossHistory, probabilityHistory: object.probabilityHistory, learningRate: object.learningRate, linkedAttentionId: object.linkedAttentionId },
      }
    }
    case 'barycentric': {
      const weights = normalizeBarycentricWeights(object.weights)
      const point = pointFromWeights(object.vertices, weights)
      const areas = triangleAreas(point, object.vertices)
      return {
        explanation: `A point P inside triangle ${object.labels.join('')} written as P = ${weights.map((weight, index) => `${round(weight, 3)}·${object.labels[index]}`).join(' + ')}, weights summing to ${round(weights.reduce((sum, value) => sum + value, 0), 3)}. Each weight equals the signed sub-triangle area opposite its vertex divided by the whole area; dragging a vertex moves P by the same affine rule.`,
        facts: { weights, point, signedSubareas: areas.signed, totalArea: areas.total, linkedAttentionId: object.linkedAttentionId ?? null },
      }
    }
    case 'geometry': {
      const resolved = resolveGeometry(object.primitives)
      const spiral = object.primitives.find((primitive) => primitive.kind === 'spiralCenter')
      const similarity = object.primitives.find((primitive): primitive is Extract<GeometryPrimitive, { kind: 'similarity' }> => primitive.kind === 'similarity')
      const draggable = object.primitives.filter((primitive) => primitive.kind === 'point' && primitive.draggable).map((primitive) => primitive.id)
      return {
        explanation: `A live construction with ${resolved.points.length} points, ${resolved.segments.length} segments, ${resolved.circles.length} circles and ${resolved.angles.length} marked angles. Every dependent primitive recomputes when a base point moves${draggable.length ? ` (draggable: ${draggable.join(', ')})` : ''}.${similarity ? ` A spiral similarity about ${similarity.center} scales by ${round(similarity.factor, 3)} and rotates by ${round(similarity.angle, 1)}°.` : ''}${spiral ? ' The spiral centre is constructed from two corresponding pairs and stays fixed under the map.' : ''}`,
        facts: { primitiveCount: object.primitives.length, draggablePoints: draggable, spiral: similarity ? { center: similarity.center, factor: similarity.factor, angle: similarity.angle } : null },
      }
    }
    case 'simplex': {
      const n = Math.max(0, Math.round(object.denominator))
      return {
        explanation: `A four-weight probability simplex drawn as a tetrahedron: P = ${fmt(object.weights)} on vertices A, B, C, D with the weights summing to ${round(object.weights.reduce((sum, value) => sum + value, 0), 3)}. The section plane at δ = ${round(object.section, 3)} cuts a triangle, which recovers the barycentric picture. With denominator ${n} the lattice holds ${tetrahedralLatticeCount(n)} points, the tetrahedral number C(${n + 3}, 3).`,
        facts: { weights: object.weights, section: object.section, denominator: n, latticeCount: tetrahedralLatticeCount(n), recurrence: pascalRecurrence(n, 3) },
      }
    }
    case 'numberTheory': {
      const cutoff = Math.max(0, Math.round(object.finiteCutoff))
      const coefficients = finiteEulerProductCoefficients(cutoff, cutoff)
      const verification = verifyRamanujanFive(cutoff)
      return {
        explanation: `A partition observatory. The finite Euler product ∏(1 − qᵐ)⁻¹ up to m = ${cutoff} yields the coefficients p(0..${cutoff}); p(${object.selectedN}) = ${coefficients[object.selectedN] ?? 'out of range'}. Lattice tuples from the simplex are the same objects as ordered partitions, which is why the counts agree. Ramanujan's congruence p(5n+4) ≡ 0 (mod 5) is ${verification.verified ? `verified for the ${verification.checked} cases in range` : 'not verified in range'}; the general statement is a theorem, not something this card proves.`,
        facts: { selectedN: object.selectedN, finiteCutoff: cutoff, coefficients, ramanujan: verification, revealTheorem: object.revealTheorem },
      }
    }
    case 'matrix': return { explanation: `A 2×2 matrix [[${fmt(object.values[0])}], [${fmt(object.values[1])}]] applied live to ${object.sourceIds.length} source vectors.`, facts: { values: object.values, sourceIds: object.sourceIds } }
    case 'text': return { explanation: `${object.presentation === 'handwritten' ? 'Handwritten' : 'Typed'} text: “${object.text}”.`, facts: { text: object.text, author: object.author } }
    case 'ink': return { explanation: `An ink stroke group with ${object.strokes?.length ?? 1} stroke${(object.strokes?.length ?? 1) === 1 ? '' : 's'} in ${object.color}, drawn by the ${object.author === 'agent' ? 'Tutor' : 'learner'}.`, facts: { strokes: object.strokes?.length ?? 1, color: object.color } }
    case 'image': return { explanation: `A photographed source: ${object.alt}. It can be reconstructed into live math and audited before approval.`, facts: { alt: object.alt, reconstructed: world.reconstruction?.sourceImageId === object.id } }
    case 'frame': return { explanation: `A scene frame titled “${object.title}” holding ${object.childIds.length} objects.`, facts: { childIds: object.childIds } }
    case 'group': return { explanation: `A group of ${object.childIds.length} objects that move together.`, facts: { childIds: object.childIds } }
    case 'shape': return { explanation: `A ${object.shape} filled ${object.fill}.`, facts: { shape: object.shape } }
    case 'arrow': return { explanation: `An arrow from (${round(object.from.x, 1)}, ${round(object.from.y, 1)}) to (${round(object.to.x, 1)}, ${round(object.to.y, 1)}).`, facts: { from: object.from, to: object.to } }
    default: return { explanation: 'An object on the canvas.', facts: {} }
  }
}

export function createLeverageTools(bridge: WorldBridge): WorldTool[] {
  const listProjects = tool('list_projects', 'List projects', 'List every saved project in the library with its scenes, template and whether it is open. Use before open_project.', schema({ includeDeleted: { type: 'boolean' } }), true, (input) => {
    const args = values(input, ['includeDeleted'])
    if (!bridge.listProjects) return unavailable('The project library')
    const projects = bridge.listProjects().filter((project) => args.includeDeleted === true || !project.deleted)
    return { ok: true, summary: `Listed ${projects.length} projects`, data: { projects, activeProjectId: projects.find((project) => project.active)?.id ?? null } }
  })

  const getSceneCatalog = tool('get_scene_catalog', 'Read the scene catalog', 'Read the eight built-in scenes: which project owns each, its title, subtitle, keyboard shortcut and the mathematical transition to the next scene.', emptySchema, true, (input) => {
    values(input, [])
    const activeScene = bridge.getActiveScene?.() ?? null
    const activeProject = bridge.getActiveProject?.() ?? null
    const scenes = PROJECTS.flatMap((project) => project.sceneIds.map((sceneId) => {
      const scene = SCENES[sceneId]
      return { id: scene.id, title: scene.title, subtitle: scene.subtitle, projectId: project.id, projectTitle: project.title, keyboard: scene.keyboard, transition: scene.transition, active: scene.id === activeScene }
    }))
    return { ok: true, summary: `Read ${scenes.length} scenes`, data: { scenes, activeScene, activeProject } }
  })

  const explain = tool('explain_object', 'Explain a mathematical object', 'Return a plain-language explanation of an object and the live facts behind it: what it shows, which values it computes, and how it links to neighbouring scenes.', schema({ objectId: { type: 'string', minLength: 1 } }, ['objectId']), true, (input) => {
    const args = values(input, ['objectId']); const id = requiredString(args.objectId, 'objectId'); const world = bridge.getWorld(); const object = world.objects[id]
    if (!object) throw new Error(`Object ${id} does not exist.`)
    const result = explainObject(world, object)
    return { ok: true, summary: `Explained ${object.kind} ${id}`, data: { kind: object.kind, author: object.author, ...result } }
  })

  const evaluate = tool('evaluate_expression', 'Evaluate an expression', 'Evaluate LaTeX at one or more x values with optional named parameters, using the same evaluator the graphs use. Read-only; nothing is drawn.', schema({ latex: { type: 'string', minLength: 1 }, x: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'number' } }, parameters: { type: 'object', additionalProperties: { type: 'number' } } }, ['latex', 'x']), true, (input) => {
    const args = values(input, ['latex', 'x', 'parameters']); const latex = requiredString(args.latex, 'latex')
    if (!Array.isArray(args.x) || !args.x.length || args.x.length > 64 || !args.x.every((value) => typeof value === 'number' && Number.isFinite(value))) throw new Error('x must be an array of 1 to 64 finite numbers.')
    if (args.parameters !== undefined && !isStringNumberMap(args.parameters)) throw new Error('parameters must map names to numbers.')
    const samples = (args.x as number[]).map((x) => ({ x, y: evaluateLatexAt(latex, x, args.parameters as Record<string, number> | undefined) }))
    return { ok: true, summary: `Evaluated ${latex} at ${samples.length} point${samples.length === 1 ? '' : 's'}`, data: { latex, parameters: args.parameters ?? {}, samples } }
  })

  const openProject = tool('open_project', 'Open a project', 'Open a saved project by id, optionally at one of its scenes. The learner sees the switch; nothing in either project changes.', schema({ projectId: { type: 'string', minLength: 1 }, scene: { type: 'string' } }, ['projectId']), false, async (input) => {
    const args = values(input, ['projectId', 'scene']); const projectId = requiredString(args.projectId, 'projectId')
    if (!bridge.openProject) return unavailable('Opening projects')
    if (args.scene !== undefined && (typeof args.scene !== 'string' || !(args.scene in SCENES))) throw new Error('scene must be one of the eight scene ids.')
    return bridge.openProject(projectId, args.scene as SceneId | undefined)
  })

  const openScene = tool('open_scene', 'Open a scene', 'Move the camera to one of the active project’s two scenes by scene id. Camera moves are not history commits.', schema({ scene: { type: 'string', enum: Object.keys(SCENES) } }, ['scene']), false, async (input) => {
    const args = values(input, ['scene']); const scene = requiredString(args.scene, 'scene')
    if (!(scene in SCENES)) throw new Error('scene must be one of the eight scene ids.')
    if (!bridge.openScene) return unavailable('Scene navigation')
    return bridge.openScene(scene as SceneId)
  })

  const createProject = tool('create_project', 'Create a project', 'Create a new project, blank or from one of the four built-in templates, and open it.', schema({ title: { type: 'string', minLength: 1 }, templateId: { type: 'string', enum: PROJECTS.map((project) => project.id) } }, ['title']), false, async (input) => {
    const args = values(input, ['title', 'templateId']); const title = requiredString(args.title, 'title').trim().slice(0, 80)
    if (args.templateId !== undefined && !PROJECTS.some((project) => project.id === args.templateId)) throw new Error('templateId must be a built-in project id.')
    if (!bridge.createProject) return unavailable('Creating projects')
    return bridge.createProject(title, (args.templateId as ProjectId | undefined) ?? null)
  })

  const deleteProject = tool('delete_project', 'Delete a project', 'Move a user-created project to Deleted projects, where the learner can restore it. Built-in projects cannot be deleted.', schema({ projectId: { type: 'string', minLength: 1 } }, ['projectId']), false, async (input) => {
    const args = values(input, ['projectId']); const projectId = requiredString(args.projectId, 'projectId')
    if (!bridge.deleteProject) return unavailable('Deleting projects')
    return bridge.deleteProject(projectId)
  })

  const focusObjects = tool('focus_objects', 'Focus the camera on objects', 'Pan and zoom so the given objects fill the view. Use before explaining or editing something the learner cannot see.', schema({ ids: { type: 'array', minItems: 1, items: { type: 'string' } } }, ['ids']), false, async (input) => {
    const args = values(input, ['ids']); if (!Array.isArray(args.ids) || !args.ids.length || !args.ids.every((id) => typeof id === 'string')) throw new Error('ids must be a non-empty string array.')
    const world = bridge.getWorld(); const missing = (args.ids as string[]).find((id) => !world.objects[id]); if (missing) throw new Error(`Object ${missing} does not exist.`)
    if (!bridge.focusObjects) return unavailable('Camera focus')
    return bridge.focusObjects(args.ids as string[])
  })

  const annotate = tool('annotate_object', 'Annotate an object', 'Leave a short note beside an object, typed or handwritten, attributed to the Tutor and undoable. Use for marks, hints and corrections, never to solve for the learner.', schema({ objectId: { type: 'string', minLength: 1 }, text: { type: 'string', minLength: 1, maxLength: 140 }, presentation: { type: 'string', enum: ['typed', 'handwritten'] }, placement: { type: 'string', enum: ['right', 'below', 'above', 'left'] }, color: { type: 'string' } }, ['objectId', 'text']), false, async (input) => {
    const args = values(input, ['objectId', 'text', 'presentation', 'placement', 'color']); const id = requiredString(args.objectId, 'objectId'); const text = requiredString(args.text, 'text').slice(0, 140)
    const world = bridge.getWorld(); const target = world.objects[id]; if (!target) throw new Error(`Object ${id} does not exist.`)
    const presentation = args.presentation === 'handwritten' ? 'handwritten' : 'typed'
    const placement = typeof args.placement === 'string' ? args.placement : 'right'
    const width = Math.min(420, Math.max(160, text.length * 9)); const height = presentation === 'handwritten' ? 44 : 32; const gap = 18
    const bounds = placement === 'below' ? { x: target.bounds.x, y: target.bounds.y + target.bounds.height + gap, width, height }
      : placement === 'above' ? { x: target.bounds.x, y: target.bounds.y - height - gap, width, height }
        : placement === 'left' ? { x: target.bounds.x - width - gap, y: target.bounds.y, width, height }
          : { x: target.bounds.x + target.bounds.width + gap, y: target.bounds.y, width, height }
    const note: WorldObject = { id: crypto.randomUUID(), kind: 'text', text, color: typeof args.color === 'string' ? args.color : '#7c5cff', fontSize: presentation === 'handwritten' ? 22 : 16, presentation, bounds, rotation: 0, author: 'agent', opacity: 1 }
    const operations: WorldOperation[] = [{ type: 'put', object: note }, { type: 'select', ids: [note.id] }]
    return bridge.runAgentAction(action(`Annotated ${target.kind} ${id}`, operations), [id, note.id])
  })

  const trainStep = tool('train_model_step', 'Train the tiny model', 'Take one honest gradient step on the training card (or reset it to the initial weights). A step commits only if loss falls and the target probability rises; the linked attention card receives the same weights.', schema({ objectId: { type: 'string' }, reset: { type: 'boolean' } }), false, async (input) => {
    const args = values(input, ['objectId', 'reset']); const world = bridge.getWorld(); const training = resolveOfKind(world, args.objectId, 'training')
    const linked = world.objects[training.linkedAttentionId]; const attention = linked?.kind === 'attention' ? linked : null
    if (args.reset === true) {
      const model = createInitialTinyModel(attention?.bridgeMasses)
      const pass = evaluateTinyModel(model, attention?.bridgeMasses, attention?.temperature ?? 1)
      const next: WorldObject = { ...training, model, step: 0, lossHistory: [pass.loss], probabilityHistory: [pass.targetProbability], learningRate: 0.35 }
      const operations: WorldOperation[] = [{ type: 'put', object: next }]; if (attention) operations.push({ type: 'put', object: { ...attention, model } })
      return bridge.runAgentAction(action('Reset the tiny model', operations), changedIds(operations))
    }
    const result = trainOneStep(training.model, attention?.bridgeMasses, attention?.temperature ?? 1)
    if (!result.accepted || !(result.after.loss < result.before.loss && result.after.targetProbability > result.before.targetProbability)) {
      return { ok: false, summary: 'No changes made', error: `No learning rate down to ${round(result.learningRate, 5)} reduced the loss while raising the target probability; the model is at a stationary point for this card.`, data: { lossBefore: result.lossBefore, gradientNorm: result.gradientNorm } }
    }
    const next: WorldObject = { ...training, model: result.state, step: training.step + 1, lossHistory: [...training.lossHistory, result.lossAfter], probabilityHistory: [...training.probabilityHistory, result.targetProbabilityAfter], learningRate: result.learningRate }
    const operations: WorldOperation[] = [{ type: 'put', object: next }]; if (attention) operations.push({ type: 'put', object: { ...attention, model: result.state } })
    const outcome = await bridge.runAgentAction(action(`Tutor applied gradient step ${training.step + 1}`, operations), changedIds(operations))
    return outcome.ok ? { ...outcome, data: { ...outcome.data, step: training.step + 1, lossBefore: result.lossBefore, lossAfter: result.lossAfter, targetProbabilityBefore: result.targetProbabilityBefore, targetProbabilityAfter: result.targetProbabilityAfter, learningRate: result.learningRate, gradientNorm: result.gradientNorm } } : outcome
  })

  const setAttentionWeight = tool('set_attention_weight', 'Edit an attention matrix cell', 'Set one entry of W_Q, W_K or W_V (or the softmax temperature) on the attention card. Every score, weight and probability recomputes; the linked training card shares the weights.', schema({ objectId: { type: 'string' }, matrix: { type: 'string', enum: ['wq', 'wk', 'wv'] }, row: { type: 'integer', minimum: 0, maximum: 1 }, column: { type: 'integer', minimum: 0, maximum: 1 }, value: { type: 'number' }, temperature: { type: 'number', exclusiveMinimum: 0 } }), false, async (input) => {
    const args = values(input, ['objectId', 'matrix', 'row', 'column', 'value', 'temperature']); const world = bridge.getWorld(); const attention = resolveOfKind(world, args.objectId, 'attention')
    const temperature = optionalNumber(args.temperature, 'temperature'); if (temperature !== undefined && temperature <= 0) throw new Error('temperature must be positive.')
    let model = attention.model; let summary = ''
    if (args.matrix !== undefined || args.value !== undefined) {
      if (args.matrix !== 'wq' && args.matrix !== 'wk' && args.matrix !== 'wv') throw new Error('matrix must be wq, wk or wv.')
      const row = integer(args.row, 'row'); const column = integer(args.column, 'column'); if (row > 1 || column > 1) throw new Error('row and column must be 0 or 1.')
      const value = finiteNumber(args.value, 'value')
      const matrix = model[args.matrix].map((entries) => [...entries]) as [[number, number], [number, number]]; matrix[row][column] = value
      model = { ...model, [args.matrix]: matrix }
      summary = `Set ${args.matrix.toUpperCase().replace('W', 'W_')}[${row}][${column}] to ${round(value, 3)}`
    } else if (temperature === undefined) throw new Error('Provide matrix, row, column and value, or temperature.')
    const nextAttention: WorldObject = { ...attention, model, temperature: temperature ?? attention.temperature }
    const operations: WorldOperation[] = [{ type: 'put', object: nextAttention }]
    for (const id of world.order) { const candidate = world.objects[id]; if (candidate?.kind === 'training' && candidate.linkedAttentionId === attention.id) operations.push({ type: 'put', object: { ...candidate, model } }) }
    const pass = evaluateTinyModel(model, attention.bridgeMasses, temperature ?? attention.temperature)
    const outcome = await bridge.runAgentAction(action(summary || `Set attention temperature to ${round(temperature ?? attention.temperature, 3)}`, operations), changedIds(operations))
    return outcome.ok ? { ...outcome, data: { ...outcome.data, scores: pass.scores, weights: pass.attentionWeights, targetProbability: pass.targetProbability, loss: pass.loss } } : outcome
  })

  const setBarycentric = tool('set_barycentric_weights', 'Set barycentric weights', 'Move P by giving three weights (normalised to sum to one), snapping to the centroid, or copying the live attention weights from the transformer card in this project.', schema({ objectId: { type: 'string' }, weights: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } }, preset: { type: 'string', enum: ['centroid', 'attention'] } }), false, async (input) => {
    const args = values(input, ['objectId', 'weights', 'preset']); const world = bridge.getWorld(); const object = resolveOfKind(world, args.objectId, 'barycentric')
    let weights: [number, number, number]; let summary: string
    if (args.preset === 'centroid') { weights = [1 / 3, 1 / 3, 1 / 3]; summary = 'Moved P to the centroid [1:1:1]' }
    else if (args.preset === 'attention') {
      const attentionId = object.linkedAttentionId; const linked = attentionId ? world.objects[attentionId] : world.order.map((id) => world.objects[id]).find((candidate) => candidate?.kind === 'attention')
      const live = linked?.kind === 'attention' ? evaluateTinyModel(linked.model, linked.bridgeMasses, linked.temperature).attentionWeights : bridge.getAttentionWeights?.()
      if (!live || live.length !== 3) throw new Error('No attention card is available to copy weights from; the Tiny Transformer project holds one.')
      weights = [live[0], live[1], live[2]]; summary = `Moved P to the attention weights [${fmt(weights)}]`
    } else {
      if (!isVector(args.weights, 3)) throw new Error('weights must be three finite numbers, or pass preset.')
      const total = (args.weights as number[]).reduce((sum, value) => sum + value, 0); if (!(total > 0) || (args.weights as number[]).some((value) => value < 0)) throw new Error('weights must be non-negative with a positive sum.')
      const normalised = normalizeBarycentricWeights(args.weights as number[]); weights = [normalised[0], normalised[1], normalised[2]]; summary = `Moved P to [${weights.map((value) => round(value, 2)).join(' : ')}]`
    }
    const point = pointFromWeights(object.vertices, weights)
    const outcome = await bridge.runAgentAction(action(summary, [{ type: 'put', object: { ...object, weights } }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, weights, point } } : outcome
  })

  const movePoint = tool('move_geometry_point', 'Move a construction point', 'Move a named base point of a live construction to new local coordinates, exactly as the learner drags it. Dependent lines, circles, images and angles recompute.', schema({ objectId: { type: 'string' }, pointId: { type: 'string', minLength: 1 }, to: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false }, by: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false } }, ['pointId']), false, async (input) => {
    const args = values(input, ['objectId', 'pointId', 'to', 'by']); const world = bridge.getWorld(); const geometry = resolveOfKind(world, args.objectId, 'geometry'); const pointId = requiredString(args.pointId, 'pointId')
    const point = geometry.primitives.find((primitive) => primitive.id === pointId)
    if (!point) throw new Error(`Construction ${geometry.id} has no primitive ${pointId}.`)
    if (point.kind !== 'point') throw new Error(`${pointId} is a ${point.kind}; only base points can be moved directly.`)
    if ((args.to === undefined) === (args.by === undefined)) throw new Error('Provide exactly one of to or by.')
    const target = args.to !== undefined ? args.to : { x: point.at.x + (args.by as { x: number }).x, y: point.at.y + (args.by as { y: number }).y }
    if (!isPoint(target)) throw new Error('Coordinates must be finite numbers.')
    const primitives = geometry.primitives.map((primitive) => (primitive.id === pointId && primitive.kind === 'point' ? { ...primitive, at: { x: target.x, y: target.y } } : primitive))
    const outcome = await bridge.runAgentAction(action(`Moved ${point.label ?? pointId} to (${round(target.x, 1)}, ${round(target.y, 1)})`, [{ type: 'put', object: { ...geometry, primitives } }]), [geometry.id])
    const resolved = resolveGeometry(primitives)
    return outcome.ok ? { ...outcome, data: { ...outcome.data, pointId, at: target, resolvedPoints: resolved.points.map((entry) => ({ id: entry.id, at: entry.point })) } } : outcome
  })

  const setSimplex = tool('set_simplex_view', 'Set the simplex view', 'Adjust the four-weight simplex: the weights (normalised), the section plane δ in [0, 1], the lattice denominator, the lattice visibility, or the rotation.', schema({ objectId: { type: 'string' }, weights: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'number' } }, section: { type: 'number', minimum: 0, maximum: 1 }, denominator: { type: 'integer', minimum: 1, maximum: 24 }, showLattice: { type: 'boolean' }, rotationX: { type: 'number' }, rotationY: { type: 'number' } }), false, async (input) => {
    const args = values(input, ['objectId', 'weights', 'section', 'denominator', 'showLattice', 'rotationX', 'rotationY']); const world = bridge.getWorld(); const object = resolveOfKind(world, args.objectId, 'simplex')
    const patch: Partial<Extract<WorldObject, { kind: 'simplex' }>> = {}; const notes: string[] = []
    if (args.weights !== undefined) { if (!isVector(args.weights, 4) || (args.weights as number[]).some((value) => value < 0)) throw new Error('weights must be four non-negative numbers.'); const total = (args.weights as number[]).reduce((sum, value) => sum + value, 0); if (!(total > 0)) throw new Error('weights need a positive sum.'); patch.weights = (args.weights as number[]).map((value) => value / total) as [number, number, number, number]; notes.push(`weights [${fmt(patch.weights)}]`) }
    const section = optionalNumber(args.section, 'section'); if (section !== undefined) { if (section < 0 || section > 1) throw new Error('section must be within [0, 1].'); patch.section = section; notes.push(`section δ = ${round(section, 2)}`) }
    if (args.denominator !== undefined) { const n = integer(args.denominator, 'denominator', 1); if (n > 24) throw new Error('denominator must be at most 24.'); patch.denominator = n; notes.push(`denominator ${n}`) }
    if (args.showLattice !== undefined) { if (typeof args.showLattice !== 'boolean') throw new Error('showLattice must be boolean.'); patch.showLattice = args.showLattice; notes.push(args.showLattice ? 'lattice shown' : 'lattice hidden') }
    const rotationX = optionalNumber(args.rotationX, 'rotationX'); if (rotationX !== undefined) { patch.rotationX = rotationX; notes.push(`rotation x ${round(rotationX, 2)}`) }
    const rotationY = optionalNumber(args.rotationY, 'rotationY'); if (rotationY !== undefined) { patch.rotationY = rotationY; notes.push(`rotation y ${round(rotationY, 2)}`) }
    if (!notes.length) throw new Error('Provide at least one of weights, section, denominator, showLattice, rotationX or rotationY.')
    const next = { ...object, ...patch }
    const outcome = await bridge.runAgentAction(action(`Set simplex ${notes.join(', ')}`, [{ type: 'put', object: next }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, weights: next.weights, section: next.section, denominator: next.denominator, latticeCount: tetrahedralLatticeCount(next.denominator) } } : outcome
  })

  const setPartitions = tool('set_partition_view', 'Set the partition observatory', 'Choose the highlighted n, extend the finite Euler-product cutoff, and reveal or hide the Ramanujan congruence card. Values are recomputed, never typed in.', schema({ objectId: { type: 'string' }, selectedN: { type: 'integer', minimum: 0, maximum: 60 }, finiteCutoff: { type: 'integer', minimum: 1, maximum: 60 }, revealTheorem: { type: 'boolean' } }), false, async (input) => {
    const args = values(input, ['objectId', 'selectedN', 'finiteCutoff', 'revealTheorem']); const world = bridge.getWorld(); const object = resolveOfKind(world, args.objectId, 'numberTheory')
    const patch: Partial<Extract<WorldObject, { kind: 'numberTheory' }>> = {}; const notes: string[] = []
    if (args.finiteCutoff !== undefined) { const cutoff = integer(args.finiteCutoff, 'finiteCutoff', 1); if (cutoff > 60) throw new Error('finiteCutoff must be at most 60.'); patch.finiteCutoff = cutoff; patch.maxN = Math.max(object.maxN, cutoff); notes.push(`cutoff ${cutoff}`) }
    if (args.selectedN !== undefined) { const n = integer(args.selectedN, 'selectedN'); if (n > (patch.finiteCutoff ?? object.finiteCutoff)) throw new Error('selectedN must not exceed the finite cutoff.'); patch.selectedN = n; notes.push(`n = ${n}`) }
    if (args.revealTheorem !== undefined) { if (typeof args.revealTheorem !== 'boolean') throw new Error('revealTheorem must be boolean.'); patch.revealTheorem = args.revealTheorem; notes.push(args.revealTheorem ? 'theorem revealed' : 'theorem hidden') }
    if (!notes.length) throw new Error('Provide at least one of selectedN, finiteCutoff or revealTheorem.')
    const next = { ...object, ...patch }
    const coefficients = finiteEulerProductCoefficients(next.finiteCutoff, next.finiteCutoff); const verification = verifyRamanujanFive(next.finiteCutoff)
    const outcome = await bridge.runAgentAction(action(`Set partitions ${notes.join(', ')}`, [{ type: 'put', object: next }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, selectedN: next.selectedN, finiteCutoff: next.finiteCutoff, coefficient: coefficients[next.selectedN] ?? null, ramanujan: { checked: verification.checked, verified: verification.verified, counterexamples: verification.counterexamples } } } : outcome
  })

  return [listProjects, getSceneCatalog, explain, evaluate, openProject, openScene, createProject, deleteProject, focusObjects, annotate, trainStep, setAttentionWeight, setBarycentric, movePoint, setSimplex, setPartitions]
}

export type ProjectSummary = {
  id: string
  title: string
  description: string
  kind: 'built-in' | 'user'
  templateId: ProjectId | null
  startScene: CatalogSceneId
  sceneIds: SceneId[]
  active: boolean
  deleted: boolean
  updatedAt: number
}

/** Shape a library project for the agent without leaking its world. */
export function summarizeProject(project: { id: string; title: string; description: string; kind: 'built-in' | 'user'; templateId: ProjectId | null; startScene: CatalogSceneId; deletedAt: number | null; updatedAt: number }, activeId: string | null): ProjectSummary {
  return {
    id: project.id, title: project.title, description: project.description, kind: project.kind, templateId: project.templateId, startScene: project.startScene,
    sceneIds: project.templateId ? [...getProject(project.templateId).sceneIds] : [], active: project.id === activeId && project.deletedAt === null, deleted: project.deletedAt !== null, updatedAt: project.updatedAt,
  }
}

export const sceneTitle = (scene: SceneId) => getScene(scene).title
export { boundsSchema }
