'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import type { Viewport, WorldState } from '../../domain/world/types'
import '../../styles/agent-effects.css'

export type AuraTarget = { id: string; until: number; label?: string }

type AuraRect = { left: number; top: number; width: number; height: number }

const REMEASURE_MS = 250
const PAD = 8

/**
 * Agent intent, made visible before the change lands: a pulsing purple ring
 * around each target object's on-screen rect with a small mono caption above
 * it ("about to move P"). Rects are found the way WebMCPTrace finds them —
 * `[data-object-id]` inside `.world-canvas` — and re-measured on world or
 * viewport changes plus a 250 ms tick while any target is live. Targets that
 * are gone, invisible, expired or off-canvas render nothing. Fixed overlay,
 * pointer-events none.
 */
export default function AgentAura({
  targets,
  world,
  viewport,
}: {
  targets: AuraTarget[]
  world: WorldState
  viewport: Viewport
}) {
  const [rects, setRects] = useState<Record<string, AuraRect>>({})
  const [tick, setTick] = useState(0)

  const now = Date.now()
  const live = targets.filter((target) => target.until > now && world.objects[target.id])
  const liveKey = live.map((target) => `${target.id}@${target.until}`).join('|')

  useEffect(() => {
    if (!liveKey) return
    const timer = window.setInterval(() => setTick((value) => value + 1), REMEASURE_MS)
    return () => window.clearInterval(timer)
  }, [liveKey])

  useLayoutEffect(() => {
    const next: Record<string, AuraRect> = {}
    const canvas = document.querySelector<HTMLElement>('.world-canvas')
    const canvasRect = canvas?.getBoundingClientRect()
    if (canvas && canvasRect) {
      for (const target of live) {
        const object = world.objects[target.id]
        if (!object || object.opacity <= 0.02) continue
        const element = canvas.querySelector<HTMLElement>(`[data-object-id="${CSS.escape(target.id)}"]`)
        const rect = element?.getBoundingClientRect()
        if (!rect || rect.width === 0) continue
        const visible = rect.right > canvasRect.left && rect.left < canvasRect.right
          && rect.bottom > canvasRect.top && rect.top < canvasRect.bottom
        if (!visible) continue
        next[target.id] = { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
      }
    }
    setRects((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
    // `live` is derived from targets + world; liveKey stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, world, viewport, tick])

  if (!live.length) return null
  return (
    <>
      {live.map((target) => {
        const rect = rects[target.id]
        if (!rect) return null
        return (
          <div
            className="agent-aura"
            key={`${target.id}@${target.until}`}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            aria-hidden="true"
          >
            <span className="agent-aura-label">{target.label ?? 'about to change this'}</span>
          </div>
        )
      })}
    </>
  )
}
