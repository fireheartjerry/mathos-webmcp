import { migrateWorld } from './migrations'
import type { WorldState } from './types'

export const STORAGE_KEY = 'mathburst.world.v5'

/** Read and migrate a world in memory; loading never repairs or removes raw storage. */
export function loadWorld(): WorldState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
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
