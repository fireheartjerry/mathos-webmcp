import { migrateWorld } from './migrations'
import type { WorldState } from './types'

export const STORAGE_KEY = 'mathburst.world.v5'

export function loadWorld(): WorldState | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return migrateWorld(value)
  } catch {
    return null
  }
}

export function saveWorld(world: WorldState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(world))
  } catch {
    // The live session still works when storage is unavailable.
  }
}

export function clearWorld() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing else owns the current document.
  }
}
