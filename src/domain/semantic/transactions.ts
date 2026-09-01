import { applyForwardBinding, validateSemanticBinding, validateSemanticWorld, validateWorldStoreKeys } from './bindings'
import { isSafeIdentifier, readSemanticPath, writeSemanticPath } from './path'
import type { SemanticEntity } from './types'
import type { WorldOperation, WorldState } from '../world/types'

export type SemanticEdit = { entityId: string; path: string; value: unknown }

const clone = <T>(value: T): T => structuredClone(value)
const compareIds = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

function semanticEditError(detail: string): Error {
  return new Error(`Semantic edit failed: ${detail}`)
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (typeof left !== typeof right || left === null || right === null) return false
  if (typeof left !== 'object' || typeof right !== 'object') return false
  const leftKeys = Object.keys(left as object)
  const rightKeys = Object.keys(right as object)
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !Object.prototype.hasOwnProperty.call(right, key))) {
    return false
  }
  return leftKeys.every((key) => sameValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]))
}

function assertWorldStores(world: WorldState): void {
  if (!world || typeof world !== 'object') throw semanticEditError('world is required.')
  if (!world.entities || !world.objects || !world.bindings) throw semanticEditError('world semantic stores are missing.')
  const keyError = validateWorldStoreKeys(world)
  if (keyError) throw semanticEditError(keyError)
}

/**
 * Expand one canonical edit into a deterministic, all-or-nothing operation
 * list. The candidate world is fully cloned before any binding is applied.
 */
export function buildSemanticEdit(world: WorldState, edit: SemanticEdit): WorldOperation[] {
  assertWorldStores(world)
  if (!edit || typeof edit !== 'object') throw semanticEditError('an edit is required.')
  if (!isSafeIdentifier(edit.entityId)) {
    throw semanticEditError('entityId must be a non-empty safe identifier.')
  }
  if (typeof edit.path !== 'string' || edit.path.length === 0) {
    throw semanticEditError('path must be a non-empty string.')
  }

  const sourceEntity = world.entities[edit.entityId]
  if (!sourceEntity) throw semanticEditError(`source entity ${edit.entityId} does not exist.`)

  let nextEntity: SemanticEntity
  try {
    // readSemanticPath validates the path and rejects an out-of-range source
    // before we create any candidate state. New expression parameter names are
    // allowed by writeSemanticPath and become readable after this write.
    if (!edit.path.startsWith('parameters.')) readSemanticPath(sourceEntity, edit.path)
    nextEntity = writeSemanticPath(sourceEntity, edit.path, edit.value)
  } catch (error) {
    throw semanticEditError(error instanceof Error ? error.message : String(error))
  }

  const candidate: WorldState = {
    ...world,
    entities: clone(world.entities),
    objects: clone(world.objects),
    bindings: clone(world.bindings)
  }
  candidate.entities[edit.entityId] = nextEntity

  const initialSemanticError = validateSemanticWorld(candidate)
  if (initialSemanticError) throw semanticEditError(initialSemanticError)

  const matchingBindings = Object.values(candidate.bindings)
    .filter((binding) => binding.source.entityId === edit.entityId && binding.source.path === edit.path)
    .sort((left, right) => compareIds(left.id, right.id))

  const originalTargets = new Map<string, WorldState['objects'][string]>()
  for (const binding of matchingBindings) {
    const bindingError = validateSemanticBinding(candidate, binding)
    if (bindingError) throw semanticEditError(bindingError)
    const target = candidate.objects[binding.target.objectId]
    if (!target) throw semanticEditError(`Binding ${binding.id} target object is missing.`)
    if (!originalTargets.has(target.id)) originalTargets.set(target.id, clone(target))

    try {
      const sourceValue = readSemanticPath(candidate.entities[edit.entityId], edit.path)
      candidate.objects[target.id] = applyForwardBinding(candidate, binding, sourceValue) as WorldState['objects'][string]
    } catch (error) {
      throw semanticEditError(error instanceof Error ? error.message : String(error))
    }
  }

  const finalSemanticError = validateSemanticWorld(candidate)
  if (finalSemanticError) throw semanticEditError(finalSemanticError)

  const operations: WorldOperation[] = [{ type: 'putEntity', entity: clone(nextEntity) }]
  for (const objectId of [...originalTargets.keys()].sort(compareIds)) {
    const before = originalTargets.get(objectId)
    const after = candidate.objects[objectId]
    if (before && after && !sameValue(before, after)) {
      operations.push({ type: 'put', object: clone(after) })
    }
  }
  return operations
}
