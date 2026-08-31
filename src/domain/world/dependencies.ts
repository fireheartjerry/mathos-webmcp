import type { WorldState } from './types'

export function findDependentIds(state: WorldState, changedIds: string[]): string[] {
  return state.order.filter((id) => {
    const object = state.objects[id]
    return object?.kind === 'graph' && changedIds.includes(object.equationId)
  })
}
