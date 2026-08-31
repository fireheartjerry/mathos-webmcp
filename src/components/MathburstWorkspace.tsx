'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadWorld, saveWorld } from '../domain/world/persistence'
import { dispatchWorldAction } from '../domain/world/reducer'
import { createSeedWorld } from '../domain/world/seed'
import type { WorldAction, WorldState } from '../domain/world/types'

export default function MathburstWorkspace() {
  const [world, setWorld] = useState<WorldState>(() => createSeedWorld())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = loadWorld()
    if (stored) setWorld(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWorld(world)
  }, [hydrated, world])

  const run = useCallback((action: WorldAction) => {
    setWorld((current) => dispatchWorldAction(current, action))
  }, [])

  return (
    <main className="mathburst" id="main" data-hydrated={hydrated}>
      <h1>Mathburst</h1>
      <p>{world.order.length} live objects</p>
      <button
        type="button"
        onClick={() => run({
          id: crypto.randomUUID(),
          source: 'human',
          summary: 'Selected the problem',
          operations: [{ type: 'select', ids: ['problem'] }],
        })}
      >
        Enter the world
      </button>
    </main>
  )
}
