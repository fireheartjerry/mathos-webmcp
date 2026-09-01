import type { SemanticBinding, SemanticEntity } from '../semantic/types'
import type { EquationObject, GraphObject, MatrixObject, WorldObject, WorldState } from './types'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => Boolean(
  value && typeof value === 'object' && !Array.isArray(value),
)

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isViewport = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.zoom)

const isWorldShape = (value: UnknownRecord, version: 1 | 2): boolean => (
  value.version === version
  && typeof value.title === 'string'
  && isRecord(value.objects)
  && Array.isArray(value.order)
  && Array.isArray(value.selection)
  && isViewport(value.viewport)
  && Array.isArray(value.history)
  && Array.isArray(value.future)
  && Array.isArray(value.activity)
  && isRecord(value.session)
  && 'reconstruction' in value
  && (version === 1 || (isRecord(value.entities) && isRecord(value.bindings) && isRecord(value.timelines)))
)

const isEquationObject = (value: unknown): value is EquationObject => isRecord(value)
  && value.kind === 'equation'
  && typeof value.id === 'string'
  && typeof value.latex === 'string'

const isGraphObject = (value: unknown): value is GraphObject => isRecord(value)
  && value.kind === 'graph'
  && typeof value.id === 'string'
  && typeof value.equationId === 'string'

const isMatrixObject = (value: unknown): value is MatrixObject => isRecord(value)
  && value.kind === 'matrix'
  && typeof value.id === 'string'
  && Array.isArray(value.values)

const isExpressionEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'expression' }> => isRecord(value)
  && value.kind === 'expression'
  && typeof value.id === 'string'

const isMatrixEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'matrix' }> => isRecord(value)
  && value.kind === 'matrix'
  && typeof value.id === 'string'

const isSafeParameterName = (value: string): boolean => value.length > 0
  && !value.includes('.')
  && !value.includes('[')
  && !value.includes(']')
  && !value.includes('\\')
  && !value.includes('/')
  && !value.includes(' ')
  && !new Set([
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
  ]).has(value)

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
    if (!isSafeParameterName(name)) continue
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
        // A graph is a view of its equation. Keep a pre-existing non-empty
        // graph link intact, but fill the missing link on legacy views.
        if (typeof object.entityId !== 'string' || object.entityId.length === 0) object.entityId = equationEntityId
        addGraphBindings(entities, bindings, object, equationEntityId)
      }
    } else if (isMatrixObject(object)) {
      addMatrixEntity(entities, object)
    }
  }

  return world
}

/** Clone and normalize persisted v1/v2 world data without writing to storage. */
export function migrateWorld(value: unknown): WorldState | null {
  if (!isRecord(value) || (!isWorldShape(value, 1) && !isWorldShape(value, 2))) return null

  try {
    const cloned = clone(value) as UnknownRecord
    if (!isRecord(cloned)) return null

    if (cloned.version === 1) {
      cloned.version = 2
      // Keep any forward-compatible stores a caller may already have attached
      // to a v1 payload, while still initializing the required v2 containers.
      if (!isRecord(cloned.entities)) cloned.entities = {}
      if (!isRecord(cloned.bindings)) cloned.bindings = {}
      if (!isRecord(cloned.timelines)) cloned.timelines = {}
    }

    return backfillSemanticWorld(cloned as unknown as WorldState)
  } catch {
    // A DataCloneError or malformed nested payload must never make loading
    // mutate storage or take down the workspace.
    return null
  }
}
