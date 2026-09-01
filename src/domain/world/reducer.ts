import { validateSemanticWorld } from '../semantic/bindings'
import { isSafeIdentifier } from '../semantic/path'
import type { WorldAction, WorldOperation, WorldState } from './types'

const finite = (...values: number[]) => values.every(Number.isFinite)
const clone = <T>(value: T): T => structuredClone(value)
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const OPERATION_TYPES = new Set<WorldOperation['type']>([
  'put',
  'remove',
  'putEntity',
  'removeEntity',
  'putBinding',
  'removeBinding',
  'putTimeline',
  'removeTimeline',
  'select',
  'viewport',
  'order',
  'session',
  'reconstruction'
])

function validateOperationShape(operation: unknown): string | null {
  if (!isRecord(operation) || typeof operation.type !== 'string') return 'Every operation needs a supported type.'
  if (!OPERATION_TYPES.has(operation.type as WorldOperation['type'])) return `Unsupported operation type ${operation.type}.`
  if (operation.type === 'put') {
    if (!isRecord(operation.object) || !isSafeIdentifier(operation.object.id)) return 'Put operations need an object with a safe id.'
    const bounds = operation.object.bounds
    if (!isRecord(bounds) || !finite(bounds.x as number, bounds.y as number, bounds.width as number, bounds.height as number)) return `Object ${operation.object.id} contains a non-finite number.`
    if (!finite(operation.object.rotation as number, operation.object.opacity as number)) {
      return `Object ${operation.object.id} contains a non-finite number.`
    }
  }
  if (operation.type === 'viewport') {
    if (!isRecord(operation.viewport) || !finite(operation.viewport.x as number, operation.viewport.y as number, operation.viewport.zoom as number)) return 'Viewport contains a non-finite number.'
  }
  if (operation.type === 'putEntity' && (!isRecord(operation.entity) || !isSafeIdentifier(operation.entity.id))) {
    return 'putEntity operations need an entity with a safe id.'
  }
  if (operation.type === 'putBinding' && (!isRecord(operation.binding) || !isSafeIdentifier(operation.binding.id))) {
    return 'putBinding operations need a binding with a safe id.'
  }
  if (operation.type === 'putTimeline' && (!isRecord(operation.timeline) || !isSafeIdentifier(operation.timeline.id))) {
    return 'putTimeline operations need a timeline with a safe id.'
  }
  if (['remove', 'removeEntity', 'removeBinding', 'removeTimeline'].includes(operation.type) && !isSafeIdentifier(operation.id)) {
    return `${operation.type} operations need an id.`
  }
  if (['select', 'order'].includes(operation.type)
    && (!Array.isArray(operation.ids) || !operation.ids.every((id) => isSafeIdentifier(id)))) {
    return `${operation.type} operations need safe ids.`
  }
  return null
}

export function validateWorldAction(state: WorldState, action: WorldAction): string | null {
  if (!action || typeof action !== 'object' || !Array.isArray(action.operations)) {
    return 'An action needs an operations array.'
  }
  if (action.operations.length === 0) return 'An action needs at least one operation.'
  for (const operation of action.operations) {
    const shapeError = validateOperationShape(operation)
    if (shapeError) return shapeError
  }

  // Apply to a deep candidate first. This makes validation observe the final
  // state of a batch (including entity/object creation before putBinding), and
  // keeps a rejected action completely detached from the live world.
  try {
    const candidate = clone(state)
    const { next } = applyOperations(candidate, action.operations)
    return validateSemanticWorld(next)
  } catch (error) {
    return `Action could not be validated: ${error instanceof Error ? error.message : String(error)}`
  }
}

function applyOperations(state: WorldState, operations: WorldOperation[]) {
  const next: WorldState = {
    ...state,
    objects: { ...state.objects },
    entities: { ...state.entities },
    bindings: { ...state.bindings },
    timelines: { ...state.timelines },
    order: [...state.order],
    selection: [...state.selection],
    session: { ...state.session }
  }
  const inverse: WorldOperation[] = []

  for (const operation of operations) {
    if (operation.type === 'put') {
      const previous = next.objects[operation.object.id]
      inverse.unshift(previous ? { type: 'put', object: previous } : { type: 'remove', id: operation.object.id })
      next.objects[operation.object.id] = operation.object
      if (!next.order.includes(operation.object.id)) next.order.push(operation.object.id)
    } else if (operation.type === 'remove') {
      const previous = next.objects[operation.id]
      if (previous) {
        inverse.unshift({ type: 'put', object: previous }, { type: 'order', ids: [...next.order] }, { type: 'select', ids: [...next.selection] })
        delete next.objects[operation.id]
        next.order = next.order.filter((id) => id !== operation.id)
        next.selection = next.selection.filter((id) => id !== operation.id)
      }
    } else if (operation.type === 'putEntity') {
      const previous = next.entities[operation.entity.id]
      inverse.unshift(previous ? { type: 'putEntity', entity: clone(previous) } : { type: 'removeEntity', id: operation.entity.id })
      next.entities[operation.entity.id] = clone(operation.entity)
    } else if (operation.type === 'removeEntity') {
      const previous = next.entities[operation.id]
      if (previous) {
        inverse.unshift({ type: 'putEntity', entity: clone(previous) })
        delete next.entities[operation.id]
      }
    } else if (operation.type === 'putBinding') {
      const previous = next.bindings[operation.binding.id]
      inverse.unshift(previous ? { type: 'putBinding', binding: clone(previous) } : { type: 'removeBinding', id: operation.binding.id })
      next.bindings[operation.binding.id] = clone(operation.binding)
    } else if (operation.type === 'removeBinding') {
      const previous = next.bindings[operation.id]
      if (previous) {
        inverse.unshift({ type: 'putBinding', binding: clone(previous) })
        delete next.bindings[operation.id]
      }
    } else if (operation.type === 'putTimeline') {
      const previous = next.timelines[operation.timeline.id]
      inverse.unshift(previous ? { type: 'putTimeline', timeline: clone(previous) } : { type: 'removeTimeline', id: operation.timeline.id })
      next.timelines[operation.timeline.id] = clone(operation.timeline)
    } else if (operation.type === 'removeTimeline') {
      const previous = next.timelines[operation.id]
      if (previous) {
        inverse.unshift({ type: 'putTimeline', timeline: clone(previous) })
        delete next.timelines[operation.id]
      }
    } else if (operation.type === 'select') {
      inverse.unshift({ type: 'select', ids: [...next.selection] })
      next.selection = operation.ids.filter((id) => Boolean(next.objects[id]))
    } else if (operation.type === 'viewport') {
      inverse.unshift({ type: 'viewport', viewport: { ...next.viewport } })
      next.viewport = operation.viewport
    } else if (operation.type === 'order') {
      inverse.unshift({ type: 'order', ids: [...next.order] })
      const requested = operation.ids.filter((id, index) => Boolean(next.objects[id]) && operation.ids.indexOf(id) === index)
      next.order = [...requested, ...next.order.filter((id) => !requested.includes(id))]
    } else if (operation.type === 'session') {
      inverse.unshift({ type: 'session', patch: { ...next.session } })
      next.session = { ...next.session, ...operation.patch }
    } else if (operation.type === 'reconstruction') {
      inverse.unshift({ type: 'reconstruction', draft: next.reconstruction })
      next.reconstruction = operation.draft
    }
  }
  return { next, inverse }
}

export function dispatchWorldAction(state: WorldState, action: WorldAction): WorldState {
  const acceptedAction = clone(action)
  const error = validateWorldAction(state, acceptedAction)
  if (error) throw new Error(error)
  const { next, inverse } = applyOperations(state, acceptedAction.operations)
  const commit = { action: acceptedAction, inverse, at: Date.now() }
  return {
    ...next,
    history: [...state.history, commit],
    future: [],
    activity: [...state.activity, commit].slice(-30)
  }
}

export function stepWorldHistory(state: WorldState, direction: 'undo' | 'redo', source: WorldAction['source']): WorldState {
  const stack = direction === 'undo' ? state.history : state.future
  const commit = stack.at(-1)
  if (!commit) return state
  const operations = direction === 'undo' ? commit.inverse : commit.action.operations
  const { next, inverse } = applyOperations(state, operations)
  const replay = {
    action: {
      ...commit.action,
      id: crypto.randomUUID(),
      source,
      summary: `${direction === 'undo' ? 'Undid' : 'Redid'} ${commit.action.summary.toLowerCase()}`
    },
    inverse,
    at: Date.now()
  }
  return direction === 'undo'
    ? {
        ...next,
        history: state.history.slice(0, -1),
        future: [...state.future, commit],
        activity: [...state.activity, replay].slice(-30)
      }
    : {
        ...next,
        history: [...state.history, commit],
        future: state.future.slice(0, -1),
        activity: [...state.activity, replay].slice(-30)
      }
}
