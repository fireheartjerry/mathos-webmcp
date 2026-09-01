import { resolveGeometry } from '../math/geometry'
import { evaluateLatexAt } from '../math/graph'
import { transformVectors } from '../math/matrix'
import { buildDeleteOperations, buildTransformOperations } from '../world/operations'
import { auditReconstruction, proposeReconstruction } from '../world/reconstruction'
import type {
  Bounds,
  GeometryPrimitive,
  Point,
  Viewport,
  WorldAction,
  WorldObject,
  WorldOperation,
  WorldState,
} from '../world/types'

export type ToolResult = {
  ok: boolean
  summary: string
  changedIds?: string[]
  data?: Record<string, unknown>
  error?: string
}

export type WorldBridge = {
  getWorld: () => WorldState
  runAgentAction: (action: WorldAction, targetIds?: string[]) => Promise<ToolResult>
  runHistory: (direction: 'undo' | 'redo') => Promise<ToolResult>
}

export type WorldTool = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
  execute: (input: unknown) => Promise<ToolResult>
}

type Values = Record<string, unknown>
type ToolExecutor = (input: unknown) => Promise<ToolResult> | ToolResult

const KINDS: WorldObject['kind'][] = [
  'ink', 'text', 'image', 'shape', 'arrow', 'equation', 'graph', 'geometry', 'matrix', 'frame', 'group',
]
const OPERATION_TYPES: WorldOperation['type'][] = ['put', 'remove', 'select', 'viewport', 'order', 'session', 'reconstruction']
const finite = (...numbers: number[]) => numbers.every(Number.isFinite)
const isRecord = (value: unknown): value is Values => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isPoint = (value: unknown): value is Point => isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number' && finite(value.x, value.y)
const isBounds = (value: unknown): value is Bounds => isRecord(value)
  && typeof value.x === 'number' && typeof value.y === 'number'
  && typeof value.width === 'number' && typeof value.height === 'number'
  && finite(value.x, value.y, value.width, value.height) && value.width > 0 && value.height > 0
const isPair = (value: unknown): value is [number, number] => Array.isArray(value)
  && value.length === 2 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === 'string')

function readInput(input: unknown): Values {
  if (typeof input === 'string') {
    if (!input.trim()) return {}
    const parsed: unknown = JSON.parse(input)
    if (!isRecord(parsed)) throw new Error('Arguments must be a JSON object.')
    return parsed
  }
  if (input === undefined || input === null) return {}
  if (!isRecord(input)) throw new Error('Arguments must be a JSON object.')
  return input
}

function values(input: unknown, allowed: string[]): Values {
  const result = readInput(input)
  const unexpected = Object.keys(result).find((key) => !allowed.includes(key))
  if (unexpected) throw new Error(`Unexpected argument “${unexpected}”.`)
  return result
}

const failure = (error: unknown): ToolResult => ({
  ok: false,
  summary: 'No changes made',
  error: error instanceof Error ? error.message : 'The page could not complete that tool call.',
})

function safe(execute: ToolExecutor): (input: unknown) => Promise<ToolResult> {
  return async (input) => {
    try { return await execute(input) } catch (error) { return failure(error) }
  }
}

const emptySchema = { type: 'object', properties: {}, additionalProperties: false }
const pointSchema = { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false }
const boundsSchema = {
  type: 'object',
  properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 } },
  required: ['x', 'y', 'width', 'height'], additionalProperties: false,
}
const objectSchema = {
  type: 'object',
  description: 'A typed Mathburst scene object. Kind-specific fields are required.',
  properties: {
    id: { type: 'string', minLength: 1 }, kind: { type: 'string', enum: KINDS }, bounds: boundsSchema,
    rotation: { type: 'number' }, author: { type: 'string', enum: ['human', 'agent'] }, opacity: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['id', 'kind', 'bounds', 'rotation', 'author', 'opacity'], additionalProperties: true,
}
const operationSchema = { type: 'object', properties: { type: { type: 'string', enum: OPERATION_TYPES } }, required: ['type'], additionalProperties: true }
const primitivesSchema = {
  type: 'array', minItems: 1,
  items: { type: 'object', properties: { kind: { type: 'string' }, id: { type: 'string' } }, required: ['kind', 'id'], additionalProperties: true },
}
const schema = (properties: Values, required: string[] = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false })

function tool(name: string, title: string, description: string, inputSchema: Record<string, unknown>, readOnly: boolean, execute: ToolExecutor): WorldTool {
  return { name, title, description, inputSchema, annotations: { readOnlyHint: readOnly, untrustedContentHint: false }, execute: safe(execute) }
}

function geometryPrimitiveError(value: unknown): string | null {
  if (!isRecord(value) || typeof value.kind !== 'string' || typeof value.id !== 'string') return 'Every geometry primitive needs a kind and id.'
  const string = (key: string) => typeof value[key] === 'string'
  if (value.kind === 'point') return isPoint(value.at) ? null : `Point ${value.id} needs finite coordinates.`
  if (value.kind === 'segment') return string('from') && string('to') ? null : `Segment ${value.id} needs from and to ids.`
  if (value.kind === 'line') return isStringArray(value.through) && value.through.length === 2 ? null : `Line ${value.id} needs two point ids.`
  if (value.kind === 'circle') return string('center') && string('through') ? null : `Circle ${value.id} needs center and through ids.`
  if (value.kind === 'polygon') return isStringArray(value.points) && value.points.length >= 3 ? null : `Polygon ${value.id} needs at least three point ids.`
  if (value.kind === 'midpoint') return isStringArray(value.of) && value.of.length === 2 ? null : `Midpoint ${value.id} needs two point ids.`
  if (value.kind === 'perpendicular' || value.kind === 'parallel') return string('through') && string('to') ? null : `${value.kind} ${value.id} needs through and to ids.`
  if (value.kind === 'intersection') return isStringArray(value.lines) && value.lines.length === 2 ? null : `Intersection ${value.id} needs two line ids.`
  if (value.kind === 'angle') return string('a') && string('vertex') && string('b') ? null : `Angle ${value.id} needs a, vertex and b ids.`
  if (value.kind === 'homothety') return string('center') && string('source') && typeof value.factor === 'number' ? null : `Homothety ${value.id} needs center, source and factor.`
  return `Geometry primitive ${value.id} has an unknown kind.`
}

function objectError(value: unknown): string | null {
  if (!isRecord(value)) return 'Each object must be a JSON object.'
  if (typeof value.id !== 'string' || !value.id) return 'Every object needs a non-empty id.'
  if (!KINDS.includes(value.kind as WorldObject['kind'])) return `Object ${value.id} has an unknown kind.`
  if (!isBounds(value.bounds)) return `Object ${value.id} needs finite positive bounds.`
  if (typeof value.rotation !== 'number' || !Number.isFinite(value.rotation)) return `Object ${value.id} needs a finite rotation.`
  if (typeof value.opacity !== 'number' || !Number.isFinite(value.opacity)) return `Object ${value.id} needs a finite opacity.`
  const id = value.id
  switch (value.kind) {
    case 'ink': return Array.isArray(value.points) && value.points.every(isPoint) && typeof value.color === 'string' && typeof value.width === 'number' ? null : `Ink ${id} is incomplete.`
    case 'text': return typeof value.text === 'string' && typeof value.color === 'string' && typeof value.fontSize === 'number' ? null : `Text ${id} is incomplete.`
    case 'image': return typeof value.src === 'string' && typeof value.alt === 'string' ? null : `Image ${id} is incomplete.`
    case 'shape': return ['rectangle', 'ellipse', 'triangle'].includes(String(value.shape)) && typeof value.fill === 'string' && typeof value.stroke === 'string' ? null : `Shape ${id} is incomplete.`
    case 'arrow': return isPoint(value.from) && isPoint(value.to) && typeof value.color === 'string' ? null : `Arrow ${id} is incomplete.`
    case 'equation': return typeof value.latex === 'string' && typeof value.color === 'string' ? null : `Equation ${id} needs LaTeX and color.`
    case 'graph': return typeof value.equationId === 'string' && isPair(value.xDomain) && isPair(value.yDomain) && typeof value.color === 'string' ? null : `Graph ${id} needs equationId and domains.`
    case 'geometry': {
      if (!Array.isArray(value.primitives) || typeof value.accent !== 'string') return `Geometry ${id} is incomplete.`
      return value.primitives.map(geometryPrimitiveError).find(Boolean) ?? null
    }
    case 'matrix': return Array.isArray(value.values) && value.values.length === 2 && value.values.every(isPair) && isStringArray(value.sourceIds) && typeof value.accent === 'string' ? null : `Matrix ${id} needs a 2×2 array and sourceIds.`
    case 'frame': return typeof value.title === 'string' && isStringArray(value.childIds) ? null : `Frame ${id} is incomplete.`
    case 'group': return isStringArray(value.childIds) ? null : `Group ${id} needs childIds.`
    default: return `Object ${id} has an unknown kind.`
  }
}

function agentObject(value: unknown): WorldObject {
  const error = objectError(value)
  if (error) throw new Error(error)
  return { ...(value as WorldObject), author: 'agent' } as WorldObject
}

function objectList(value: unknown): WorldObject[] {
  if (!Array.isArray(value) || !value.length) throw new Error('objects must be a non-empty array.')
  const objects = value.map(agentObject)
  if (new Set(objects.map((object) => object.id)).size !== objects.length) throw new Error('Object ids must be unique inside one call.')
  return objects
}

function primitives(value: unknown): GeometryPrimitive[] {
  if (!Array.isArray(value) || !value.length) throw new Error('primitives must be a non-empty array.')
  const error = value.map(geometryPrimitiveError).find(Boolean)
  if (error) throw new Error(error)
  return value as GeometryPrimitive[]
}

const action = (summary: string, operations: WorldOperation[]): WorldAction => ({ id: crypto.randomUUID(), source: 'agent', summary, operations })
function changedIds(operations: WorldOperation[]): string[] {
  const ids = new Set<string>()
  for (const operation of operations) {
    if (operation.type === 'put') ids.add(operation.object.id)
    if (operation.type === 'remove') ids.add(operation.id)
  }
  return [...ids]
}
function limit(value: unknown, fallback: number) {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('limit must be a number.')
  return Math.max(1, Math.min(100, Math.floor(value)))
}
function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string.`)
  return value
}

const COMMON_PATCH_FIELDS = ['bounds', 'rotation', 'opacity', 'locked']
const KIND_PATCH_FIELDS: Record<WorldObject['kind'], string[]> = {
  ink: ['points', 'color', 'width'], text: ['text', 'color', 'fontSize'], image: ['src', 'alt'], shape: ['shape', 'fill', 'stroke'],
  arrow: ['from', 'to', 'color'], equation: ['latex', 'color'], graph: ['equationId', 'xDomain', 'yDomain', 'color', 'parameters', 'showTangentAt', 'shadeIntegral'],
  geometry: ['primitives', 'accent'], matrix: ['values', 'sourceIds', 'accent'], frame: ['title', 'childIds'], group: ['childIds'],
}

function validateOperations(world: WorldState, raw: unknown): WorldOperation[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error('operations must be a non-empty array.')
  const available = new Set(Object.keys(world.objects))
  const operations: WorldOperation[] = []
  for (const entry of raw) {
    if (!isRecord(entry) || !OPERATION_TYPES.includes(entry.type as WorldOperation['type'])) throw new Error('Every operation needs a supported type.')
    if (entry.type === 'put') {
      const object = agentObject(entry.object); available.add(object.id); operations.push({ type: 'put', object })
    } else if (entry.type === 'remove') {
      const id = requiredString(entry.id, 'remove.id'); if (!available.has(id)) throw new Error(`Object ${id} does not exist.`); available.delete(id); operations.push({ type: 'remove', id })
    } else if (entry.type === 'select' || entry.type === 'order') {
      if (!isStringArray(entry.ids) || entry.ids.some((id) => !available.has(id))) throw new Error(`${entry.type}.ids must reference existing objects.`)
      operations.push({ type: entry.type, ids: entry.ids } as WorldOperation)
    } else if (entry.type === 'viewport') {
      if (!isRecord(entry.viewport) || typeof entry.viewport.x !== 'number' || typeof entry.viewport.y !== 'number' || typeof entry.viewport.zoom !== 'number' || !finite(entry.viewport.x, entry.viewport.y, entry.viewport.zoom) || entry.viewport.zoom <= 0) throw new Error('viewport must contain finite x, y and positive zoom.')
      operations.push({ type: 'viewport', viewport: entry.viewport as Viewport })
    } else if (entry.type === 'session') {
      if (!isRecord(entry.patch)) throw new Error('session.patch must be an object.')
      operations.push(entry as WorldOperation)
    } else {
      if (entry.draft !== null && !isRecord(entry.draft)) throw new Error('reconstruction.draft must be an object or null.')
      operations.push(entry as WorldOperation)
    }
  }
  return operations
}

export function createWorldTools(bridge: WorldBridge): WorldTool[] {
  const getWorld = tool('get_world', 'Read the mathematical world', 'Read canvas, viewport, selection and tutoring state. Include objects only when needed.', schema({ includeObjects: { type: 'boolean' } }), true, (input) => {
    const args = values(input, ['includeObjects'])
    if (args.includeObjects !== undefined && typeof args.includeObjects !== 'boolean') throw new Error('includeObjects must be boolean.')
    const world = bridge.getWorld(); const all = world.order.map((id) => world.objects[id]).filter(Boolean)
    return { ok: true, summary: `Read ${all.length} world objects`, data: { title: world.title, version: world.version, objectCount: all.length, selection: world.selection, viewport: world.viewport, session: world.session, historyCount: world.history.length, ...(args.includeObjects ? { objects: all.slice(0, 100), ...(all.length > 100 ? { truncated: true } : {}) } : {}) } }
  })

  const getObjects = tool('get_objects', 'Read world objects', 'Read objects by id or kind. Results are bounded to one hundred objects.', schema({ ids: { type: 'array', items: { type: 'string' } }, kinds: { type: 'array', items: { type: 'string', enum: KINDS } }, limit: { type: 'integer', minimum: 1, maximum: 100 } }), true, (input) => {
    const args = values(input, ['ids', 'kinds', 'limit'])
    if (args.ids !== undefined && !isStringArray(args.ids)) throw new Error('ids must be a string array.')
    if (args.kinds !== undefined && (!isStringArray(args.kinds) || args.kinds.some((kind) => !KINDS.includes(kind as WorldObject['kind'])))) throw new Error('kinds contains an unknown kind.')
    const world = bridge.getWorld(); const maximum = limit(args.limit, 50)
    const matches = world.order.map((id) => world.objects[id]).filter((object) => object && (!args.ids || (args.ids as string[]).includes(object.id)) && (!args.kinds || (args.kinds as string[]).includes(object.kind)))
    return { ok: true, summary: `Read ${Math.min(matches.length, maximum)} objects`, data: { objects: matches.slice(0, maximum), ...(matches.length > maximum ? { truncated: true } : {}) } }
  })

  const getSelection = tool('get_selection', 'Read the current selection', 'Read which objects the learner currently has selected.', emptySchema, true, (input) => {
    values(input, []); const world = bridge.getWorld()
    return { ok: true, summary: `${world.selection.length} objects selected`, data: { ids: world.selection, objects: world.selection.map((id) => world.objects[id]).filter(Boolean) } }
  })

  const getSessionContext = tool('get_session_context', 'Read tutoring context', 'Read attempts, misconception, shown help and reconstruction state.', emptySchema, true, (input) => {
    values(input, []); const world = bridge.getWorld()
    return { ok: true, summary: `Read context after ${world.session.attempts} attempts`, data: { session: world.session, reconstruction: world.reconstruction ? { sourceImageId: world.reconstruction.sourceImageId, proposedObjectCount: world.reconstruction.proposedObjects.length, uncertainObjectIds: world.reconstruction.uncertainObjectIds, auditSummary: world.reconstruction.auditSummary } : null } }
  })

  const getHistory = tool('get_history', 'Read world history', 'Read recent atomic actions with authorship and affected object ids.', schema({ limit: { type: 'integer', minimum: 1, maximum: 100 } }), true, (input) => {
    const args = values(input, ['limit']); const world = bridge.getWorld(); const maximum = limit(args.limit, 20)
    const commits = world.history.slice(-maximum).reverse().map((commit) => ({ id: commit.action.id, source: commit.action.source, summary: commit.action.summary, at: commit.at, changedIds: changedIds(commit.action.operations) }))
    return { ok: true, summary: `Read ${commits.length} history commits`, data: { commits, ...(world.history.length > maximum ? { truncated: true } : {}) } }
  })

  const inspectMath = tool('inspect_math', 'Inspect a mathematical object', 'Inspect live equation source, graph linkage, construction primitives or matrix vectors.', schema({ objectId: { type: 'string', minLength: 1 } }, ['objectId']), true, (input) => {
    const args = values(input, ['objectId']); const id = requiredString(args.objectId, 'objectId'); const world = bridge.getWorld(); const object = world.objects[id]
    if (!object) throw new Error(`Object ${id} does not exist.`)
    if (object.kind === 'equation') {
      const dependents = world.order.filter((candidate) => { const item = world.objects[candidate]; return item?.kind === 'graph' && item.equationId === id })
      return { ok: true, summary: `Inspected equation ${id}`, data: { kind: object.kind, latex: object.latex, dependentGraphIds: dependents } }
    }
    if (object.kind === 'graph') {
      const equation = world.objects[object.equationId]; const latex = equation?.kind === 'equation' ? equation.latex : null
      return { ok: true, summary: `Inspected graph ${id}`, data: { kind: object.kind, equationId: object.equationId, latex, xDomain: object.xDomain, yDomain: object.yDomain, parameters: object.parameters ?? {}, tangentAt: object.showTangentAt ?? null, integralDomain: object.shadeIntegral ?? null, liveValue: latex ? evaluateLatexAt(latex, object.showTangentAt ?? 0, object.parameters) : null } }
    }
    if (object.kind === 'geometry') {
      const resolved = resolveGeometry(object.primitives)
      return { ok: true, summary: `Inspected construction ${id}`, data: { kind: object.kind, primitives: object.primitives, resolvedCounts: { points: resolved.points.length, lines: resolved.lines.length, segments: resolved.segments.length, circles: resolved.circles.length, polygons: resolved.polygons.length, angles: resolved.angles.length } } }
    }
    if (object.kind === 'matrix') return { ok: true, summary: `Inspected matrix ${id}`, data: { kind: object.kind, values: object.values, sourceIds: object.sourceIds, vectors: transformVectors(object, world) } }
    throw new Error(`Object ${id} is not a mathematical object.`)
  })

  const createObjects = tool('create_objects', 'Create world objects', 'Create typed objects in one attributed, undoable commit.', schema({ summary: { type: 'string' }, objects: { type: 'array', minItems: 1, items: objectSchema } }, ['objects']), false, async (input) => {
    const args = values(input, ['summary', 'objects']); const objects = objectList(args.objects); const operations: WorldOperation[] = objects.map((object) => ({ type: 'put', object }))
    return bridge.runAgentAction(action(typeof args.summary === 'string' ? args.summary : `Created ${objects.length} objects`, operations), objects.map((object) => object.id))
  })

  const updateObjects = tool('update_objects', 'Update world objects', 'Patch kind-valid fields while preserving id, kind and author.', schema({ summary: { type: 'string' }, updates: { type: 'array', minItems: 1, items: schema({ id: { type: 'string' }, patch: { type: 'object', additionalProperties: true } }, ['id', 'patch']) } }, ['updates']), false, async (input) => {
    const args = values(input, ['summary', 'updates']); if (!Array.isArray(args.updates) || !args.updates.length) throw new Error('updates must be a non-empty array.'); const world = bridge.getWorld()
    const operations: WorldOperation[] = args.updates.map((entry) => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || !isRecord(entry.patch)) throw new Error('Each update needs an id and patch.')
      const existing = world.objects[entry.id]; if (!existing) throw new Error(`Object ${entry.id} does not exist.`)
      const allowed = new Set([...COMMON_PATCH_FIELDS, ...KIND_PATCH_FIELDS[existing.kind]]); const invalid = Object.keys(entry.patch).find((key) => !allowed.has(key)); if (invalid) throw new Error(`${invalid} cannot be patched on ${existing.kind} objects.`)
      const object = { ...existing, ...entry.patch, id: existing.id, kind: existing.kind, author: existing.author } as WorldObject; const error = objectError(object); if (error) throw new Error(error)
      return { type: 'put', object }
    })
    return bridge.runAgentAction(action(typeof args.summary === 'string' ? args.summary : `Updated ${operations.length} objects`, operations), changedIds(operations))
  })

  const deleteObjects = tool('delete_objects', 'Delete world objects', 'Delete objects or groups with the same expansion rules as the whiteboard.', schema({ summary: { type: 'string' }, ids: { type: 'array', minItems: 1, items: { type: 'string' } } }, ['ids']), false, async (input) => {
    const args = values(input, ['summary', 'ids']); if (!isStringArray(args.ids) || !args.ids.length) throw new Error('ids must be a non-empty string array.'); const world = bridge.getWorld(); const missing = args.ids.find((id) => !world.objects[id]); if (missing) throw new Error(`Object ${missing} does not exist.`)
    const operations = buildDeleteOperations(world, args.ids)
    return bridge.runAgentAction(action(typeof args.summary === 'string' ? args.summary : `Deleted ${operations.length} objects`, operations), changedIds(operations))
  })

  const transformObjects = tool('transform_objects', 'Transform world objects', 'Translate, scale or rotate objects with human-identical group behavior.', schema({ summary: { type: 'string' }, ids: { type: 'array', minItems: 1, items: { type: 'string' } }, translate: pointSchema, scale: { type: 'number', exclusiveMinimum: 0 }, rotate: { type: 'number' } }, ['ids']), false, async (input) => {
    const args = values(input, ['summary', 'ids', 'translate', 'scale', 'rotate']); if (!isStringArray(args.ids) || !args.ids.length) throw new Error('ids must be a non-empty string array.')
    if (args.translate !== undefined && !isPoint(args.translate)) throw new Error('translate must contain finite x and y.'); if (args.scale !== undefined && (typeof args.scale !== 'number' || !Number.isFinite(args.scale) || args.scale <= 0)) throw new Error('scale must be positive.'); if (args.rotate !== undefined && (typeof args.rotate !== 'number' || !Number.isFinite(args.rotate))) throw new Error('rotate must be finite.'); if (args.translate === undefined && args.scale === undefined && args.rotate === undefined) throw new Error('Provide translate, scale or rotate.')
    const world = bridge.getWorld(); const missing = args.ids.find((id) => !world.objects[id]); if (missing) throw new Error(`Object ${missing} does not exist.`)
    const operations = buildTransformOperations(world, args.ids, { translate: args.translate as Point | undefined, scale: args.scale as number | undefined, rotate: args.rotate as number | undefined })
    return bridge.runAgentAction(action(typeof args.summary === 'string' ? args.summary : `Transformed ${operations.length} objects`, operations), changedIds(operations))
  })

  const applyActions = tool('apply_actions', 'Apply an atomic action batch', 'Apply typed operations atomically through the shared reducer.', schema({ summary: { type: 'string', minLength: 1 }, operations: { type: 'array', minItems: 1, items: operationSchema } }, ['summary', 'operations']), false, async (input) => {
    const args = values(input, ['summary', 'operations']); const operations = validateOperations(bridge.getWorld(), args.operations)
    return bridge.runAgentAction(action(requiredString(args.summary, 'summary'), operations), changedIds(operations))
  })

  const stepHistory = tool('step_history', 'Undo or redo the world', 'Step the same global history used by the learner.', schema({ direction: { type: 'string', enum: ['undo', 'redo'] } }, ['direction']), false, (input) => {
    const args = values(input, ['direction']); if (args.direction !== 'undo' && args.direction !== 'redo') throw new Error('direction must be undo or redo.'); return bridge.runHistory(args.direction)
  })

  const setViewport = tool('set_viewport', 'Set the world viewport', 'Pan and zoom the learner to a world region.', schema({ viewport: schema({ x: { type: 'number' }, y: { type: 'number' }, zoom: { type: 'number', exclusiveMinimum: 0 } }, ['x', 'y', 'zoom']) }, ['viewport']), false, async (input) => {
    const args = values(input, ['viewport']); if (!isRecord(args.viewport) || typeof args.viewport.x !== 'number' || typeof args.viewport.y !== 'number' || typeof args.viewport.zoom !== 'number' || !finite(args.viewport.x, args.viewport.y, args.viewport.zoom) || args.viewport.zoom <= 0) throw new Error('viewport must contain finite x, y and positive zoom.')
    return bridge.runAgentAction(action('Changed the viewport', [{ type: 'viewport', viewport: args.viewport as Viewport }]))
  })

  const reconstructProblem = tool('reconstruct_problem', 'Reconstruct an image into live math', 'Propose semantic objects from an image. This is the only approval flow.', schema({ sourceImageId: { type: 'string' }, proposedObjects: { type: 'array', minItems: 1, items: objectSchema }, uncertainObjectIds: { type: 'array', items: { type: 'string' } } }, ['sourceImageId', 'proposedObjects']), false, async (input) => {
    const args = values(input, ['sourceImageId', 'proposedObjects', 'uncertainObjectIds']); const sourceImageId = requiredString(args.sourceImageId, 'sourceImageId'); const world = bridge.getWorld(); if (world.objects[sourceImageId]?.kind !== 'image') throw new Error(`${sourceImageId} is not an image object.`)
    const proposed = objectList(args.proposedObjects); const uncertain = args.uncertainObjectIds === undefined ? [] : args.uncertainObjectIds; if (!isStringArray(uncertain) || uncertain.some((id) => !proposed.some((object) => object.id === id))) throw new Error('uncertainObjectIds must reference proposed objects.')
    return bridge.runAgentAction(proposeReconstruction(sourceImageId, proposed, uncertain), [sourceImageId])
  })

  const auditReconstructionTool = tool('audit_reconstruction', 'Audit the reconstruction', 'Compare the semantic draft with its source before approval.', schema({ auditSummary: { type: 'string' }, proposedObjects: { type: 'array', minItems: 1, items: objectSchema }, uncertainObjectIds: { type: 'array', items: { type: 'string' } } }, ['auditSummary']), false, async (input) => {
    const args = values(input, ['auditSummary', 'proposedObjects', 'uncertainObjectIds']); const world = bridge.getWorld(); if (!world.reconstruction) throw new Error('There is no reconstruction draft to audit.')
    const proposed = args.proposedObjects === undefined ? world.reconstruction.proposedObjects : objectList(args.proposedObjects); const uncertain = args.uncertainObjectIds === undefined ? world.reconstruction.uncertainObjectIds : args.uncertainObjectIds; if (!isStringArray(uncertain) || uncertain.some((id) => !proposed.some((object) => object.id === id))) throw new Error('uncertainObjectIds must reference proposed objects.')
    return bridge.runAgentAction(auditReconstruction(world.reconstruction, requiredString(args.auditSummary, 'auditSummary'), proposed, uncertain), [world.reconstruction.sourceImageId])
  })

  const graphExpression = tool('graph_expression', 'Graph a live expression', 'Create a reactive graph from new LaTeX or one existing equation.', schema({ latex: { type: 'string' }, equationId: { type: 'string' }, bounds: boundsSchema, parameters: { type: 'object', additionalProperties: { type: 'number' } }, showTangentAt: { type: 'number' }, shadeIntegral: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } } }), false, async (input) => {
    const args = values(input, ['latex', 'equationId', 'bounds', 'parameters', 'showTangentAt', 'shadeIntegral']); const hasLatex = typeof args.latex === 'string' && Boolean(args.latex.trim()); const hasEquation = typeof args.equationId === 'string' && Boolean(args.equationId.trim()); if (hasLatex === hasEquation) throw new Error('Provide exactly one of latex or equationId.')
    const world = bridge.getWorld(); const graphBounds = args.bounds === undefined ? { x: 730, y: 150, width: 460, height: 330 } : args.bounds; if (!isBounds(graphBounds)) throw new Error('bounds are invalid.'); if (args.parameters !== undefined && (!isRecord(args.parameters) || Object.values(args.parameters).some((value) => typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('parameters must map names to numbers.'); if (args.showTangentAt !== undefined && (typeof args.showTangentAt !== 'number' || !Number.isFinite(args.showTangentAt))) throw new Error('showTangentAt must be finite.'); if (args.shadeIntegral !== undefined && !isPair(args.shadeIntegral)) throw new Error('shadeIntegral must contain two numbers.')
    const operations: WorldOperation[] = []; let equationId = String(args.equationId ?? '')
    if (hasLatex) { equationId = crypto.randomUUID(); operations.push({ type: 'put', object: { id: equationId, kind: 'equation', latex: String(args.latex), color: '#171713', bounds: { x: graphBounds.x + 30, y: graphBounds.y - 62, width: 300, height: 50 }, rotation: 0, author: 'agent', opacity: 1 } }) } else if (world.objects[equationId]?.kind !== 'equation') throw new Error(`${equationId} is not an equation object.`)
    const graph: WorldObject = { id: crypto.randomUUID(), kind: 'graph', equationId, xDomain: [-4, 4], yDomain: [-5, 10], color: '#7c5cff', parameters: args.parameters as Record<string, number> | undefined, showTangentAt: args.showTangentAt as number | undefined, shadeIntegral: args.shadeIntegral as [number, number] | undefined, bounds: graphBounds, rotation: 0, author: 'agent', opacity: 1 }
    operations.push({ type: 'put', object: graph }, { type: 'select', ids: [graph.id] }); return bridge.runAgentAction(action('Graphed a live expression', operations), changedIds(operations))
  })

  const constructGeometry = tool('construct_geometry', 'Construct dynamic geometry', 'Create a declarative live construction.', schema({ primitives: primitivesSchema, bounds: boundsSchema, accent: { type: 'string' } }, ['primitives']), false, async (input) => {
    const args = values(input, ['primitives', 'bounds', 'accent']); const bounds = args.bounds === undefined ? { x: 400, y: 170, width: 430, height: 330 } : args.bounds; if (!isBounds(bounds)) throw new Error('bounds are invalid.')
    const object: WorldObject = { id: crypto.randomUUID(), kind: 'geometry', primitives: primitives(args.primitives), accent: typeof args.accent === 'string' ? args.accent : '#7c5cff', bounds, rotation: 0, author: 'agent', opacity: 1 }
    return bridge.runAgentAction(action('Constructed dynamic geometry', [{ type: 'put', object }, { type: 'select', ids: [object.id] }]), [object.id])
  })

  const visualizeConcept = tool('visualize_concept', 'Visualize a mathematical concept', 'Create a curated integral, tangent, homothety or matrix scene.', schema({ concept: { type: 'string', enum: ['integral', 'tangent', 'homothety', 'matrix-transform'] }, sourceIds: { type: 'array', items: { type: 'string' } }, bounds: boundsSchema }, ['concept']), false, async (input) => {
    const args = values(input, ['concept', 'sourceIds', 'bounds']); if (!['integral', 'tangent', 'homothety', 'matrix-transform'].includes(String(args.concept))) throw new Error('concept is not supported.'); if (args.sourceIds !== undefined && !isStringArray(args.sourceIds)) throw new Error('sourceIds must be a string array.'); const bounds = args.bounds === undefined ? { x: 720, y: 160, width: 470, height: 330 } : args.bounds; if (!isBounds(bounds)) throw new Error('bounds are invalid.'); const world = bridge.getWorld(); const operations: WorldOperation[] = []
    if (args.concept === 'integral' || args.concept === 'tangent') {
      const equation: WorldObject = { id: crypto.randomUUID(), kind: 'equation', latex: args.concept === 'integral' ? 'a x e^x' : 'x^2-2x-1', color: '#171713', bounds: { x: bounds.x + 30, y: bounds.y - 62, width: 280, height: 50 }, rotation: 0, author: 'agent', opacity: 1 }
      const graph: WorldObject = { id: crypto.randomUUID(), kind: 'graph', equationId: equation.id, xDomain: [-3, 3], yDomain: [-4, 10], color: '#7c5cff', parameters: args.concept === 'integral' ? { a: 1 } : undefined, shadeIntegral: args.concept === 'integral' ? [0, 1] : undefined, showTangentAt: args.concept === 'tangent' ? 1.5 : undefined, bounds, rotation: 0, author: 'agent', opacity: 1 }
      operations.push({ type: 'put', object: equation }, { type: 'put', object: graph }, { type: 'select', ids: [graph.id] })
    } else if (args.concept === 'homothety') {
      const object: WorldObject = { id: crypto.randomUUID(), kind: 'geometry', accent: '#7c5cff', bounds, rotation: 0, author: 'agent', opacity: 1, primitives: [
        { kind: 'point', id: 'O', at: { x: 100, y: 170 }, label: 'O', draggable: true }, { kind: 'point', id: 'A', at: { x: 235, y: 85 }, label: 'A', draggable: true }, { kind: 'point', id: 'B', at: { x: 245, y: 250 }, label: 'B', draggable: true },
        { kind: 'segment', id: 'OA', from: 'O', to: 'A' }, { kind: 'segment', id: 'OB', from: 'O', to: 'B' }, { kind: 'homothety', id: 'A2', center: 'O', source: 'A', factor: 1.65, label: 'A′' }, { kind: 'homothety', id: 'B2', center: 'O', source: 'B', factor: 1.65, label: 'B′' }, { kind: 'segment', id: 'A2B2', from: 'A2', to: 'B2' },
      ] }
      operations.push({ type: 'put', object }, { type: 'select', ids: [object.id] })
    } else {
      let sourceIds = args.sourceIds as string[] | undefined; if (sourceIds?.some((id) => world.objects[id]?.kind !== 'arrow')) throw new Error('Every matrix sourceId must reference an arrow.')
      if (!sourceIds?.length) { const sources: WorldObject[] = [
        { id: crypto.randomUUID(), kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2, y: 1 }, color: '#171713', bounds: { x: bounds.x, y: bounds.y, width: 1, height: 1 }, rotation: 0, author: 'agent', opacity: 0 },
        { id: crypto.randomUUID(), kind: 'arrow', from: { x: 0, y: 0 }, to: { x: -1, y: 2 }, color: '#171713', bounds: { x: bounds.x, y: bounds.y, width: 1, height: 1 }, rotation: 0, author: 'agent', opacity: 0 },
      ]; sourceIds = sources.map((source) => source.id); operations.push(...sources.map((object) => ({ type: 'put' as const, object }))) }
      const matrix: WorldObject = { id: crypto.randomUUID(), kind: 'matrix', values: [[1, 0.8], [0, 1]], sourceIds, accent: '#7c5cff', bounds, rotation: 0, author: 'agent', opacity: 1 }; operations.push({ type: 'put', object: matrix }, { type: 'select', ids: [matrix.id] })
    }
    return bridge.runAgentAction(action(`Visualized ${String(args.concept)}`, operations), changedIds(operations))
  })

  return [
    getWorld, getObjects, getSelection, getSessionContext, getHistory, inspectMath,
    createObjects, updateObjects, deleteObjects, transformObjects, applyActions, stepHistory, setViewport,
    reconstructProblem, auditReconstructionTool, graphExpression, constructGeometry, visualizeConcept,
  ]
}
