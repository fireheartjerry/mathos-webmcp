import type { SemanticBinding, SemanticEntity } from './types'
import {
  parseSemanticEntityPath,
  parseSemanticTargetPath,
  readSemanticPath,
  validateSemanticEntity,
  writeSemanticTargetPath,
  type ExactPointTarget,
  type SemanticEntityPath,
  type SemanticTargetPath,
  type SemanticPathValue
} from './path'
import type { WorldObject, WorldState } from '../world/types'

export type BindingGraphEdge = {
  from: string
  to: string
  bindingId?: string
}

const ENTITY_NODE = (id: string) => `entity:${id}`
const OBJECT_NODE = (id: string) => `object:${id}`

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

const SUPPORTED_FORWARD = new Set<SemanticBinding['forward']>(['identity', 'expression-parameter', 'matrix-cell', 'point-coordinate'])

const SUPPORTED_INVERSE = new Set<NonNullable<SemanticBinding['inverse']>>(['identity', 'expression-parameter', 'matrix-cell', 'point-coordinate'])

const compareIds = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

function bindingError(binding: SemanticBinding, detail: string): string {
  return `Binding ${binding.id}: ${detail}`
}

function isStringId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isEntityPathFor(entity: SemanticEntity, path: string): SemanticEntityPath {
  const parsed = parseSemanticEntityPath(path)
  if (parsed.kind === 'value' && entity.kind !== 'scalar') {
    throw new Error('value requires a scalar entity')
  }
  if (parsed.kind === 'latex' && entity.kind !== 'expression') {
    throw new Error('latex requires an expression entity')
  }
  if (parsed.kind === 'parameter' && entity.kind !== 'expression') {
    throw new Error('parameters.<name> requires an expression entity')
  }
  if (parsed.kind === 'matrix-cell' && entity.kind !== 'matrix') {
    throw new Error('values.<row>.<column> requires a matrix entity')
  }
  return parsed
}

function targetPathFor(object: WorldObject, path: string): SemanticTargetPath {
  const parsed = parseSemanticTargetPath(path)
  if (parsed.kind === 'latex' && object.kind !== 'equation') {
    throw new Error('latex requires an equation object')
  }
  if (parsed.kind === 'parameter' && object.kind !== 'graph') {
    throw new Error('parameters.<name> requires a graph object')
  }
  if (parsed.kind === 'matrix-cell' && object.kind !== 'matrix') {
    throw new Error('values.<row>.<column> requires a matrix object')
  }
  if (parsed.kind === 'point-coordinate') {
    // GeometryObject has an array of primitives. Without a primitive ID, at.x
    // and at.y cannot identify a point; writeSemanticTargetPath gives the
    // precise rejection for this schema.
    if ((object as { kind?: unknown }).kind !== 'point') {
      throw new Error('at.x/at.y requires an exact point target with a direct at field')
    }
  }
  return parsed
}

function sameParameterName(source: SemanticEntityPath, target: SemanticTargetPath): boolean {
  return source.kind === 'parameter' && target.kind === 'parameter' && source.name === target.name
}

function sameMatrixCell(source: SemanticEntityPath, target: SemanticTargetPath): boolean {
  return source.kind === 'matrix-cell' && target.kind === 'matrix-cell' && source.row === target.row && source.column === target.column
}

function isPointSource(source: SemanticEntityPath): boolean {
  return source.kind === 'value'
}

function assertAdapterCombination(binding: SemanticBinding, source: SemanticEntityPath, target: SemanticTargetPath, sourceEntity: SemanticEntity, targetObject: WorldObject): void {
  if (!SUPPORTED_FORWARD.has(binding.forward)) {
    throw new Error(`unsupported forward adapter ${String(binding.forward)}`)
  }
  if (binding.inverse !== null && !SUPPORTED_INVERSE.has(binding.inverse)) {
    throw new Error(`unsupported inverse adapter ${String(binding.inverse)}`)
  }

  if (binding.forward === 'identity') {
    // The target writer enforces the target's concrete type. Identity does not
    // impose a second path convention: e.g. a scalar value may feed a graph
    // parameter while an expression latex string may feed equation latex.
    return
  }

  if (binding.forward === 'expression-parameter') {
    if (sourceEntity.kind !== 'expression' || source.kind !== 'parameter') {
      throw new Error('expression-parameter requires an expression parameters.<name> source')
    }
    if (targetObject.kind !== 'graph' || target.kind !== 'parameter' || !sameParameterName(source, target)) {
      throw new Error('expression-parameter requires a matching graph parameters.<name> target')
    }
    return
  }

  if (binding.forward === 'matrix-cell') {
    if (sourceEntity.kind !== 'matrix' || source.kind !== 'matrix-cell') {
      throw new Error('matrix-cell requires a matrix values.<row>.<column> source')
    }
    if (targetObject.kind !== 'matrix' || target.kind !== 'matrix-cell' || !sameMatrixCell(source, target)) {
      throw new Error('matrix-cell requires a matching matrix values.<row>.<column> target')
    }
    return
  }

  if (!isPointSource(source) || target.kind !== 'point-coordinate') {
    throw new Error('point-coordinate requires scalar value or vector cell source and exact at.x/at.y target')
  }
}

/**
 * Validate one binding, including endpoint existence and its narrow adapter
 * contract. The target write is attempted on a clone, so this is pure.
 */
export function validateSemanticBinding(world: WorldState, binding: unknown): string | null {
  if (!isRecord(binding)) return 'Binding must be an object.'
  const candidate = binding as unknown as SemanticBinding
  if (!isStringId(candidate.id)) return 'Binding needs a non-empty id.'
  if (!isRecord(candidate.source) || !isStringId(candidate.source.entityId) || typeof candidate.source.path !== 'string') {
    return bindingError(candidate, 'source must contain an entityId and path.')
  }
  if (!isRecord(candidate.target) || !isStringId(candidate.target.objectId) || typeof candidate.target.path !== 'string') {
    return bindingError(candidate, 'target must contain an objectId and path.')
  }
  if (candidate.inverse !== null && !SUPPORTED_INVERSE.has(candidate.inverse)) {
    return bindingError(candidate, `unsupported inverse adapter ${String(candidate.inverse)}.`)
  }
  if (!SUPPORTED_FORWARD.has(candidate.forward)) {
    return bindingError(candidate, `unsupported forward adapter ${String(candidate.forward)}.`)
  }

  const sourceEntity = world.entities[candidate.source.entityId]
  if (!sourceEntity) return bindingError(candidate, `source entity ${candidate.source.entityId} does not exist.`)
  const targetObject = world.objects[candidate.target.objectId]
  if (!targetObject) return bindingError(candidate, `target object ${candidate.target.objectId} does not exist.`)

  try {
    const sourcePath = isEntityPathFor(sourceEntity, candidate.source.path)
    const targetPath = targetPathFor(targetObject, candidate.target.path)
    assertAdapterCombination(candidate, sourcePath, targetPath, sourceEntity, targetObject)
    const sourceValue = readSemanticPath(sourceEntity, candidate.source.path)
    // This validates the target type/range and never mutates the world object.
    writeSemanticTargetPath(targetObject, candidate.target.path, sourceValue)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return bindingError(candidate, `${detail}.`)
  }
  return null
}

/** Apply one supported forward binding to a target object clone. */
export function applyForwardBinding(world: WorldState, binding: SemanticBinding, sourceValue?: SemanticPathValue): WorldObject | ExactPointTarget {
  const sourceEntity = world.entities[binding.source.entityId]
  const targetObject = world.objects[binding.target.objectId]
  if (!sourceEntity || !targetObject) {
    throw new Error(bindingError(binding, 'cannot apply without existing endpoints'))
  }
  const value = sourceValue ?? readSemanticPath(sourceEntity, binding.source.path)
  const error = validateSemanticBinding(world, binding)
  if (error) throw new Error(error)
  return writeSemanticTargetPath(targetObject, binding.target.path, value)
}

function addEdge(edges: BindingGraphEdge[], edge: BindingGraphEdge): void {
  if (!edges.some((candidate) => candidate.from === edge.from && candidate.to === edge.to && candidate.bindingId === edge.bindingId)) {
    edges.push(edge)
  }
}

/** Build the small dependency graph used by cycle validation. */
export function buildBindingGraph(world: WorldState): BindingGraphEdge[] {
  const edges: BindingGraphEdge[] = []
  const bindings = Object.values(world.bindings).sort((a, b) => compareIds(a.id, b.id))
  for (const binding of bindings) {
    addEdge(edges, {
      from: ENTITY_NODE(binding.source.entityId),
      to: OBJECT_NODE(binding.target.objectId),
      bindingId: binding.id
    })

    // IDs are normally globally distinct (migrations use entity:<objectId>),
    // but older/in-memory callers may reuse an ID for an entity and a view.
    // Keep a raw-ID edge in that explicitly colliding case so a synthetic
    // e1 -> object(e2) -> e2 -> object(e1) cycle is still rejected.
    if (
      hasOwn(world.entities, binding.source.entityId) &&
      hasOwn(world.entities, binding.target.objectId) &&
      hasOwn(world.objects, binding.source.entityId) &&
      hasOwn(world.objects, binding.target.objectId)
    ) {
      addEdge(edges, {
        from: binding.source.entityId,
        to: binding.target.objectId,
        bindingId: binding.id
      })
    }
  }

  // A view can point back to a canonical entity through entityId. Treat that
  // as a dependency only when it is not the binding's own direct view link;
  // otherwise every ordinary entity -> its own equation/graph would look like
  // a cycle. Cross-linked views still expose real cycles (e1 -> view(e2) ->
  // e2 -> view(e1)) and report the binding IDs on those edges.
  const targetBindings = new Map<string, SemanticBinding[]>()
  for (const binding of bindings) {
    const list = targetBindings.get(binding.target.objectId) ?? []
    list.push(binding)
    targetBindings.set(binding.target.objectId, list)
  }
  for (const object of Object.values(world.objects)) {
    const linkedEntityId = 'entityId' in object && typeof object.entityId === 'string' ? object.entityId : null
    if (!linkedEntityId) continue
    const direct = (targetBindings.get(object.id) ?? []).some((binding) => binding.source.entityId === linkedEntityId)
    if (!direct)
      addEdge(edges, {
        from: OBJECT_NODE(object.id),
        to: ENTITY_NODE(linkedEntityId)
      })
  }
  return edges
}

type CycleResult = { nodes: string[]; bindingIds: string[] }

function findCycle(edges: BindingGraphEdge[]): CycleResult | null {
  const adjacency = new Map<string, BindingGraphEdge[]>()
  for (const edge of edges) {
    const list = adjacency.get(edge.from) ?? []
    list.push(edge)
    adjacency.set(edge.from, list)
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, [])
  }
  for (const list of adjacency.values()) {
    list.sort((a, b) => compareIds(a.to, b.to) || compareIds(a.bindingId ?? '', b.bindingId ?? ''))
  }

  const state = new Map<string, 0 | 1 | 2>()
  const nodes: string[] = []
  const pathEdges: BindingGraphEdge[] = []
  let result: CycleResult | null = null

  const visit = (node: string): boolean => {
    state.set(node, 1)
    nodes.push(node)
    for (const edge of adjacency.get(node) ?? []) {
      if (result) return true
      const targetState = state.get(edge.to) ?? 0
      pathEdges.push(edge)
      if (targetState === 0) {
        if (visit(edge.to)) return true
      } else if (targetState === 1) {
        const start = nodes.indexOf(edge.to)
        const cycleEdges = pathEdges.slice(start)
        const cycleNodes = nodes.slice(start).concat(edge.to)
        const bindingIds = cycleEdges.map((item) => item.bindingId).filter((id): id is string => Boolean(id))
        if (bindingIds.length > 0) {
          result = { nodes: cycleNodes, bindingIds: [...new Set(bindingIds)] }
          return true
        }
      }
      pathEdges.pop()
    }
    nodes.pop()
    state.set(node, 2)
    return false
  }

  for (const node of [...adjacency.keys()].sort(compareIds)) {
    if ((state.get(node) ?? 0) === 0 && visit(node)) break
  }
  return result
}

/** Return the binding IDs involved in the first deterministic dependency cycle. */
export function findBindingCycle(world: WorldState): string[] | null {
  return findCycle(buildBindingGraph(world))?.bindingIds ?? null
}

/** Validate every entity and binding in a candidate world. */
export function validateSemanticBindings(world: WorldState): string | null {
  for (const binding of Object.values(world.bindings).sort((a, b) => compareIds(a.id, b.id))) {
    const error = validateSemanticBinding(world, binding)
    if (error) return error
  }
  const cycle = findBindingCycle(world)
  if (cycle && cycle.length > 0) return `Semantic binding cycle involves ${cycle.join(', ')}.`
  return null
}

/** Alias used by callers that validate the complete semantic dependency graph. */
export const validateBindingGraph = validateSemanticBindings

/** Validate the complete semantic stores of a candidate world. */
export function validateSemanticWorld(world: WorldState): string | null {
  for (const [key, entity] of Object.entries(world.entities).sort(([a], [b]) => a.localeCompare(b))) {
    if (entity.id !== key) return `Semantic entity key ${key} does not match entity id ${entity.id}.`
    const error = validateSemanticEntity(entity)
    if (error) return error
  }
  return validateSemanticBindings(world)
}
