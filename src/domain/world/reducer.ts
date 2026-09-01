import type { WorldAction, WorldOperation, WorldState } from './types'

const finite = (...values: number[]) => values.every(Number.isFinite)
const clone = <T>(value: T): T => structuredClone(value)

export function validateWorldAction(_state: WorldState, action: WorldAction): string | null {
  if (action.operations.length === 0) return 'An action needs at least one operation.'
  for (const operation of action.operations) {
    if (operation.type === 'put') {
      const { bounds, rotation, opacity } = operation.object
      if (!finite(bounds.x, bounds.y, bounds.width, bounds.height, rotation, opacity)) {
        return `Object ${operation.object.id} contains a non-finite number.`
      }
    }
    if (operation.type === 'viewport' && !finite(operation.viewport.x, operation.viewport.y, operation.viewport.zoom)) {
      return 'Viewport contains a non-finite number.'
    }
  }
  return null
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
    session: { ...state.session },
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
        inverse.unshift(
          { type: 'put', object: previous },
          { type: 'order', ids: [...next.order] },
          { type: 'select', ids: [...next.selection] },
        )
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
      const requested = operation.ids.filter(
        (id, index) => Boolean(next.objects[id]) && operation.ids.indexOf(id) === index,
      )
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
    activity: [...state.activity, commit].slice(-30),
  }
}

export function stepWorldHistory(
  state: WorldState,
  direction: 'undo' | 'redo',
  source: WorldAction['source'],
): WorldState {
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
      summary: `${direction === 'undo' ? 'Undid' : 'Redid'} ${commit.action.summary.toLowerCase()}`,
    },
    inverse,
    at: Date.now(),
  }
  return direction === 'undo'
    ? {
        ...next,
        history: state.history.slice(0, -1),
        future: [...state.future, commit],
        activity: [...state.activity, replay].slice(-30),
      }
    : {
        ...next,
        history: [...state.history, commit],
        future: state.future.slice(0, -1),
        activity: [...state.activity, replay].slice(-30),
      }
}
