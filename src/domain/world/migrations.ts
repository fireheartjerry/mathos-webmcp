import type { SemanticBinding, SemanticEntity } from '../semantic/types'
import { validateSemanticWorld } from '../semantic/bindings'
import type { AnimationKeyframe, AnimationTargetPath, AnimationTimeline } from '../animation/types'
import type { EquationObject, GraphObject, MatrixObject, WorldObject, WorldState } from './types'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => Boolean(
  value && typeof value === 'object' && !Array.isArray(value),
)

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const FORBIDDEN_NAMES = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
])

const isSafeIdentifier = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0
  && !FORBIDDEN_NAMES.has(value)

const isSafeName = (value: unknown): value is string => isSafeIdentifier(value)
  && !value.includes('.')
  && !value.includes('[')
  && !value.includes(']')
  && !value.includes('\\')
  && !value.includes('/')
  && !value.includes(' ')

const isFiniteNumberRecord = (value: unknown): value is Record<string, number> => isRecord(value)
  && Object.keys(value).every((key) => isSafeName(key) && isFiniteNumber(value[key]))

const isFiniteNumberArray = (value: unknown): value is number[] => Array.isArray(value)
  && value.every(isFiniteNumber)

const isPair = (value: unknown): value is [number, number] => Array.isArray(value)
  && value.length === 2
  && value.every(isFiniteNumber)

const isQuad = (value: unknown): value is [number, number, number, number] => Array.isArray(value)
  && value.length === 4
  && value.every(isFiniteNumber)

const isSafeIdArray = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(isSafeIdentifier)

const isViewport = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.zoom)

const isPoint = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)

const isBounds = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.width)
  && isFiniteNumber(value.height)

const OBJECT_KINDS = new Set([
  'ink',
  'text',
  'image',
  'shape',
  'arrow',
  'equation',
  'graph',
  'geometry',
  'matrix',
  'attention',
  'training',
  'barycentric',
  'simplex',
  'numberTheory',
  'frame',
  'group',
])

const isSemanticViewLink = (value: UnknownRecord): boolean => (
  (value.entityId === undefined || isSafeIdentifier(value.entityId))
  && (value.bindingIds === undefined || isSafeIdArray(value.bindingIds))
)

const isBaseObject = (value: unknown): value is UnknownRecord => isRecord(value)
  && isSafeIdentifier(value.id)
  && typeof value.kind === 'string'
  && OBJECT_KINDS.has(value.kind)
  && isBounds(value.bounds)
  && isFiniteNumber(value.rotation)
  && (value.author === 'human' || value.author === 'agent')
  && isFiniteNumber(value.opacity)
  && (value.locked === undefined || typeof value.locked === 'boolean')
  && isSemanticViewLink(value)

const isWorldShape = (value: UnknownRecord, version: 1 | 2): boolean => (
  value.version === version
  && typeof value.title === 'string'
  && isRecord(value.objects)
  && isSafeIdArray(value.order)
  && isSafeIdArray(value.selection)
  && isViewport(value.viewport)
  && Array.isArray(value.history)
  && Array.isArray(value.future)
  && Array.isArray(value.activity)
  && isRecord(value.session)
  && hasOwn(value, 'reconstruction')
  && (version === 1 || (isRecord(value.entities) && isRecord(value.bindings) && isRecord(value.timelines)))
)

const isMatrixValues = (value: unknown): value is [[number, number], [number, number]] => Array.isArray(value)
  && value.length === 2
  && value.every((row) => Array.isArray(row) && row.length === 2 && row.every(isFiniteNumber))

const isEquationObject = (value: unknown): value is EquationObject => isBaseObject(value)
  && value.kind === 'equation'
  && typeof value.latex === 'string'
  && typeof value.color === 'string'

const isGraphObject = (value: unknown): value is GraphObject => isBaseObject(value)
  && value.kind === 'graph'
  && isSafeIdentifier(value.equationId)
  && isPair(value.xDomain)
  && isPair(value.yDomain)
  && typeof value.color === 'string'
  && (value.parameters === undefined || isFiniteNumberRecord(value.parameters))
  && (value.showTangentAt === undefined || isFiniteNumber(value.showTangentAt))
  && (value.shadeIntegral === undefined || isPair(value.shadeIntegral))
  && (value.visualization === undefined || value.visualization === 'standard' || value.visualization === 'gamma-density')
  && (value.binEdges === undefined || isQuad(value.binEdges))

const isMatrixObject = (value: unknown): value is MatrixObject => isBaseObject(value)
  && value.kind === 'matrix'
  && isMatrixValues(value.values)
  && isSafeIdArray(value.sourceIds)

const isExpressionEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'expression' }> => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'expression'
  && typeof value.latex === 'string'
  && isFiniteNumberRecord(value.parameters)

const isMatrixEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'matrix' }> => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'matrix'
  && typeof value.name === 'string'
  && Array.isArray(value.values)
  && value.values.every(isFiniteNumberArray)

const isScalarEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'scalar'
  && typeof value.name === 'string'
  && isFiniteNumber(value.value)

const isVectorEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'vector'
  && typeof value.name === 'string'
  && isFiniteNumberArray(value.values)

const isDataEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'data'
  && isRecord(value.columns)
  && Object.keys(value.columns).every((key) => isSafeName(key) && isFiniteNumberArray((value.columns as UnknownRecord)[key]))

const isSemanticEntity = (value: unknown): value is SemanticEntity => (
  isExpressionEntity(value)
  || isScalarEntity(value)
  || isVectorEntity(value)
  || isMatrixEntity(value)
  || isDataEntity(value)
)

const isSemanticEntityStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, entity]) => isSafeIdentifier(key)
    && isRecord(entity)
    && entity.id === key
    && isSemanticEntity(entity))

const BINDING_ADAPTERS = new Set(['identity', 'expression-parameter', 'matrix-cell', 'point-coordinate'])

const isSemanticPath = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0
  && !value.split('.').some((part) => !isSafeName(part))

const isSemanticBinding = (value: unknown): value is SemanticBinding => isRecord(value)
  && isSafeIdentifier(value.id)
  && isRecord(value.source)
  && isSafeIdentifier(value.source.entityId)
  && isSemanticPath(value.source.path)
  && isRecord(value.target)
  && isSafeIdentifier(value.target.objectId)
  && isSemanticPath(value.target.path)
  && typeof value.forward === 'string'
  && BINDING_ADAPTERS.has(value.forward)
  && (value.inverse === null || (typeof value.inverse === 'string' && BINDING_ADAPTERS.has(value.inverse)))

const isSemanticBindingStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, binding]) => isSafeIdentifier(key)
    && isRecord(binding)
    && binding.id === key
    && isSemanticBinding(binding))

const isAnimationValue = (value: unknown): boolean => isFiniteNumber(value)
  || typeof value === 'string'
  || isFiniteNumberArray(value)
  || (Array.isArray(value) && value.every(isFiniteNumberArray))

const isAnimationTarget = (value: unknown): value is AnimationTargetPath => isRecord(value)
  && (value.kind === 'camera'
    ? isSemanticPath(value.path)
    : value.kind === 'entity'
      ? isSafeIdentifier(value.entityId) && isSemanticPath(value.path)
      : value.kind === 'object'
        && isSafeIdentifier(value.objectId) && isSemanticPath(value.path))

const isAnimationKeyframe = (key: string, value: unknown): value is AnimationKeyframe => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && isFiniteNumber(value.time)
  && isAnimationValue(value.value)

const isAnimationTrack = (key: string, value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && isAnimationTarget(value.target)
  && isRecord(value.keyframes)
  && Object.entries(value.keyframes).every(([frameKey, frame]) => isAnimationKeyframe(frameKey, frame))

const isAnimationTimeline = (key: string, value: unknown): value is AnimationTimeline => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && typeof value.name === 'string'
  && isFiniteNumber(value.duration)
  && isRecord(value.playbackRange)
  && isFiniteNumber(value.playbackRange.start)
  && isFiniteNumber(value.playbackRange.end)
  && isRecord(value.tracks)
  && Object.entries(value.tracks).every(([trackKey, track]) => isAnimationTrack(trackKey, track))

const isAnimationTimelineStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, timeline]) => isAnimationTimeline(key, timeline))

const isWorldObject = (value: unknown): value is WorldObject => {
  if (!isBaseObject(value)) return false
  if (value.kind === 'equation') return isEquationObject(value)
  if (value.kind === 'graph') return isGraphObject(value)
  if (value.kind === 'matrix') return isMatrixObject(value)
  return true
}

const isWorldObjectStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, object]) => isSafeIdentifier(key)
    && isWorldObject(object)
    && object.id === key)

const isWorldOperation = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  switch (value.type) {
    case 'put': return isWorldObject(value.object)
    case 'remove':
    case 'removeEntity':
    case 'removeBinding':
    case 'removeTimeline': return isSafeIdentifier(value.id)
    case 'putEntity': return isSemanticEntity(value.entity)
    case 'putBinding': return isSemanticBinding(value.binding)
    case 'putTimeline': return isRecord(value.timeline)
      && typeof value.timeline.id === 'string'
      && isAnimationTimeline(value.timeline.id, value.timeline)
    case 'select':
    case 'order': return isSafeIdArray(value.ids)
    case 'viewport': return isViewport(value.viewport)
    case 'session': return isRecord(value.patch)
    case 'reconstruction': return value.draft === null || isReconstructionDraft(value.draft)
    default: return false
  }
}

const isWorldAction = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && (value.source === 'human' || value.source === 'agent')
  && typeof value.summary === 'string'
  && Array.isArray(value.operations)
  && value.operations.every(isWorldOperation)

const isWorldCommit = (value: unknown): boolean => isRecord(value)
  && isWorldAction(value.action)
  && Array.isArray(value.inverse)
  && value.inverse.every(isWorldOperation)
  && isFiniteNumber(value.at)

const isSession = (value: unknown): value is WorldState['session'] => isRecord(value)
  && isFiniteNumber(value.attempts)
  && Number.isInteger(value.attempts)
  && value.attempts >= 0
  && isSafeIdArray(value.helpShown)
  && (value.currentMisconception === null || typeof value.currentMisconception === 'string')
  && (value.reconstructionStatus === 'source'
    || value.reconstructionStatus === 'draft'
    || value.reconstructionStatus === 'audited'
    || value.reconstructionStatus === 'approved')

const isReconstructionDraft = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.sourceImageId)
  && Array.isArray(value.proposedObjects)
  && value.proposedObjects.every(isWorldObject)
  && isSafeIdArray(value.uncertainObjectIds)
  && typeof value.auditSummary === 'string'

const isObjectArray = (value: unknown, predicate: (item: unknown) => boolean): value is unknown[] => Array.isArray(value)
  && value.every(predicate)

const isWorldStore = (value: UnknownRecord, version: 1 | 2): boolean => {
  if (!isWorldObjectStore(value.objects)
    || !isSafeIdArray(value.order)
    || !isSafeIdArray(value.selection)
    || !isObjectArray(value.history, isWorldCommit)
    || !isObjectArray(value.future, isWorldCommit)
    || !isObjectArray(value.activity, isWorldCommit)
    || !isSession(value.session)
    || !(value.reconstruction === null || isReconstructionDraft(value.reconstruction))) return false

  const objects = value.objects
  const order = value.order
  const selection = value.selection
  if (!isSafeIdArray(order)
    || !isSafeIdArray(selection)
    || !order.every((id) => hasOwn(objects, id))
    || !selection.every((id) => hasOwn(objects, id))) return false
  for (const object of Object.values(objects)) {
    if (isGraphObject(object) && !isEquationObject(objects[object.equationId])) return false
  }

  if (version === 1) {
    // v1 did not define semantic stores, but preserve and validate an
    // optional forward-compatible store if a caller attached one.
    return (value.entities === undefined || isSemanticEntityStore(value.entities))
      && (value.bindings === undefined || isSemanticBindingStore(value.bindings))
      && (value.timelines === undefined || isAnimationTimelineStore(value.timelines))
  }

  return isSemanticEntityStore(value.entities)
    && isSemanticBindingStore(value.bindings)
    && isAnimationTimelineStore(value.timelines)
}

/** Assign a generated key without allowing a legacy `__proto__` key to mutate a store prototype. */
const setOwn = (record: UnknownRecord, key: string, value: unknown): void => {
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  })
}

const clone = <T>(value: T): T => structuredClone(value)

const entityIdFor = (object: UnknownRecord): string | null => (
  typeof object.entityId === 'string' && object.entityId.length > 0
    ? object.entityId
    : typeof object.id === 'string' && object.id.length > 0
      ? `entity:${object.id}`
      : null
)

const addExpressionEntity = (
  entities: UnknownRecord,
  object: EquationObject,
): string | null => {
  const entityId = entityIdFor(object as unknown as UnknownRecord)
  if (!entityId) return null

  if (object.entityId !== entityId) object.entityId = entityId

  const existing = hasOwn(entities, entityId) ? entities[entityId] : undefined
  if (!existing) {
    setOwn(entities, entityId, {
      id: entityId,
      kind: 'expression',
      latex: object.latex,
      parameters: {},
    } satisfies Extract<SemanticEntity, { kind: 'expression' }>)
  } else if (isExpressionEntity(existing) && !isRecord(existing.parameters)) {
    // A partially written v2 entity is still recoverable. Existing values are
    // retained; only the missing parameter container is made usable.
    existing.parameters = {}
  }

  return entityId
}

const addMatrixEntity = (
  entities: UnknownRecord,
  object: MatrixObject,
): string | null => {
  const entityId = entityIdFor(object as unknown as UnknownRecord)
  if (!entityId) return null

  if (object.entityId !== entityId) object.entityId = entityId

  const existing = hasOwn(entities, entityId) ? entities[entityId] : undefined
  if (!existing) {
    setOwn(entities, entityId, {
      id: entityId,
      kind: 'matrix',
      // Object IDs are stable and matrix views do not have a legacy title.
      name: object.id,
      values: clone(object.values),
    } satisfies Extract<SemanticEntity, { kind: 'matrix' }>)
  } else if (isMatrixEntity(existing) && typeof existing.name !== 'string') {
    existing.name = object.id
  }

  return entityId
}

const bindingForParameter = (
  bindingId: string,
  entityId: string,
  graphId: string,
  name: string,
): SemanticBinding => ({
  id: bindingId,
  source: { entityId, path: `parameters.${name}` },
  target: { objectId: graphId, path: `parameters.${name}` },
  forward: 'expression-parameter',
  inverse: 'expression-parameter',
})

const addGraphBindings = (
  entities: UnknownRecord,
  bindings: UnknownRecord,
  graph: GraphObject,
  equationEntityId: string,
): void => {
  const expression = hasOwn(entities, equationEntityId) ? entities[equationEntityId] : undefined
  if (!isExpressionEntity(expression) || !isRecord(graph.parameters)) return
  if (!isRecord(expression.parameters)) expression.parameters = {}

  const bindingIds = Array.isArray(graph.bindingIds) ? graph.bindingIds : []
  const nextBindingIds = [...bindingIds]

  // Sort names so generated store/array order is deterministic even when a
  // legacy object was assembled by a non-deterministic source.
  for (const name of Object.keys(graph.parameters).sort()) {
    if (!isSafeName(name)) continue
    const value = graph.parameters[name]
    if (!isFiniteNumber(value)) continue

    if (!hasOwn(expression.parameters, name)) setOwn(expression.parameters, name, value)

    const bindingId = `binding:${graph.id}:parameter:${name}`
    if (!hasOwn(bindings, bindingId)) {
      setOwn(bindings, bindingId, bindingForParameter(bindingId, equationEntityId, graph.id, name))
    }
    if (!nextBindingIds.includes(bindingId)) nextBindingIds.push(bindingId)
  }

  if (nextBindingIds.length > 0) graph.bindingIds = nextBindingIds
}

/** Keep view metadata usable without carrying dangling or duplicate binding IDs. */
const normalizeBindingIds = (objects: UnknownRecord, bindings: UnknownRecord): void => {
  for (const object of Object.values(objects)) {
    if (!isRecord(object) || !hasOwn(object, 'bindingIds')) continue
    if (!Array.isArray(object.bindingIds)) continue
    const ids = [...new Set(object.bindingIds.filter((id): id is string => (
      isSafeIdentifier(id) && hasOwn(bindings, id)
    )))]
    if (ids.length > 0) object.bindingIds = ids
    else delete object.bindingIds
  }
}

/**
 * Populate semantic stores on a cloned v1/v2 world.
 *
 * This helper deliberately mutates only the clone supplied by `migrateWorld`.
 * It is also used for the fresh seed so built-ins and persisted worlds share
 * exactly the same stable IDs and parameter bindings.
 */
export function backfillSemanticWorld(world: WorldState): WorldState {
  const objects = world.objects as unknown as Record<string, unknown>
  const entities = world.entities as unknown as UnknownRecord
  const bindings = world.bindings as unknown as UnknownRecord
  const equationEntityIds = new Map<string, string>()

  const orderedObjects = Object.values(objects)
    .filter((object): object is WorldObject => isRecord(object))
    .sort((left, right) => left.id.localeCompare(right.id))

  // First create/link all expression entities. Graphs can appear before their
  // equations in legacy order, so linking is intentionally a second pass.
  for (const object of orderedObjects) {
    if (!isEquationObject(object)) continue
    const entityId = addExpressionEntity(entities, object)
    if (entityId) equationEntityIds.set(object.id, entityId)
  }

  for (const object of orderedObjects) {
    if (isGraphObject(object)) {
      const equation = objects[object.equationId]
      const equationEntityId = isEquationObject(equation)
        ? equationEntityIds.get(equation.id) ?? entityIdFor(equation as unknown as UnknownRecord)
        : undefined
      if (equationEntityId) {
        // A graph is a view of its equation. Normalize even a stale existing
        // link so generated bindings and the graph view agree.
        object.entityId = equationEntityId
        addGraphBindings(entities, bindings, object, equationEntityId)
      }
    } else if (isMatrixObject(object)) {
      addMatrixEntity(entities, object)
    }
  }

  normalizeBindingIds(objects, bindings)

  return world
}

/** Clone and normalize persisted v1/v2 world data without writing to storage. */
export function migrateWorld(value: unknown): WorldState | null {
  try {
    if (!isRecord(value) || (!isWorldShape(value, 1) && !isWorldShape(value, 2))) return null
    const cloned = clone(value) as UnknownRecord
    if (!isRecord(cloned)) return null

    const version = cloned.version as 1 | 2
    if (!isWorldStore(cloned, version)) return null

    // Existing v2 semantic records must be valid before backfill begins. This
    // prevents migration from silently carrying a dangling or malformed link.
    if (version === 2 && validateSemanticWorld(cloned as unknown as WorldState)) return null

    if (version === 1) {
      cloned.version = 2
      // Keep any forward-compatible stores a caller may already have attached
      // to a v1 payload, while still initializing the required v2 containers.
      if (!isRecord(cloned.entities)) cloned.entities = {}
      if (!isRecord(cloned.bindings)) cloned.bindings = {}
      if (!isRecord(cloned.timelines)) cloned.timelines = {}
    }

    const migrated = backfillSemanticWorld(cloned as unknown as WorldState)
    if (!isWorldStore(migrated as unknown as UnknownRecord, 2)) return null
    if (validateSemanticWorld(migrated)) return null
    return migrated
  } catch {
    // A DataCloneError or malformed nested payload must never make loading
    // mutate storage or take down the workspace.
    return null
  }
}
