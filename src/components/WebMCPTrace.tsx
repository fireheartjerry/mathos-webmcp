'use client'

import { useLayoutEffect, useState } from 'react'
import type { WorldTraceEvent } from '../domain/tools/definitions'
import type { Viewport, WorldState } from '../domain/world/types'

type ChipPosition = { left: number; top: number; anchorX: number; anchorY: number }

/**
 * Real tool calls, attached to their consequences. A write that changed a
 * visible object gets a chip pinned beside that object with a short leader;
 * reads and off-screen writes stay in the quiet rail under the header.
 */
export default function WebMCPTrace({
  events,
  world,
  viewport,
}: {
  events: WorldTraceEvent[]
  world: WorldState
  viewport: Viewport
}) {
  const [positions, setPositions] = useState<Record<string, ChipPosition>>({})

  useLayoutEffect(() => {
    const next: Record<string, ChipPosition> = {}
    const canvas = document.querySelector<HTMLElement>('.world-canvas')
    const canvasRect = canvas?.getBoundingClientRect()
    for (const event of events) {
      if (!event.changedIds?.length || !canvasRect) continue
      const id = event.changedIds.find((candidate) => {
        const object = world.objects[candidate]
        return object && object.opacity > 0.02
      })
      if (!id) continue
      const element = canvas?.querySelector<HTMLElement>(`[data-object-id="${CSS.escape(id)}"]`)
      const rect = element?.getBoundingClientRect()
      if (!rect || rect.width === 0) continue
      const visible = rect.right > canvasRect.left + 24 && rect.left < canvasRect.right - 24
        && rect.bottom > canvasRect.top + 24 && rect.top < canvasRect.bottom - 24
      if (!visible) continue
      const anchorX = Math.min(canvasRect.right - 60, Math.max(canvasRect.left + 60, rect.right - 8))
      const anchorY = Math.min(canvasRect.bottom - 70, Math.max(canvasRect.top + 70, rect.top + 4))
      next[event.invocationId] = { left: anchorX - 6, top: anchorY - 62, anchorX, anchorY }
    }
    setPositions((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
  }, [events, world, viewport])

  if (!events.length) return null
  const attached = events.filter((event) => positions[event.invocationId])
  const railed = events.filter((event) => !positions[event.invocationId]).slice(-5)

  return (
    <>
      {railed.length > 0 && (
        <aside className="webmcp-trace" aria-label="Recent WebMCP activity">
          <span className="webmcp-trace-label">WebMCP</span>
          <div className="webmcp-trace-list">
            {railed.map((event) => (
              <span className={`webmcp-trace-chip is-${event.phase} ${event.readOnly ? 'is-read' : 'is-write'}`} key={event.invocationId}>
                <i>{event.readOnly ? 'R' : 'W'}</i>
                <b>{event.toolName}</b>
                <small>{event.phase === 'running' ? '…' : event.phase === 'complete' ? '✓' : '!'}</small>
              </span>
            ))}
          </div>
        </aside>
      )}
      {attached.map((event) => {
        const position = positions[event.invocationId]
        return (
          <div className={`webmcp-trace-attached is-${event.phase}`} key={event.invocationId} style={{ left: position.left, top: position.top }} aria-hidden="true">
            <svg className="webmcp-trace-leader" width="16" height="30" viewBox="0 0 16 30">
              <path d="M 2 2 C 2 16 8 20 8 28" />
              <circle cx="8" cy="28" r="2.4" />
            </svg>
            <span className={`webmcp-trace-chip is-${event.phase} ${event.readOnly ? 'is-read' : 'is-write'}`}>
              <i>{event.readOnly ? 'R' : 'W'}</i>
              <b>{event.toolName}</b>
              <small>{event.phase === 'running' ? '…' : event.phase === 'complete' ? '✓' : '!'}</small>
            </span>
            <em>{event.summary}</em>
          </div>
        )
      })}
    </>
  )
}
