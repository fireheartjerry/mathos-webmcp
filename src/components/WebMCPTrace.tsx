'use client'

import type { WorldTraceEvent } from '../domain/tools/definitions'

export default function WebMCPTrace({ events }: { events: WorldTraceEvent[] }) {
  if (!events.length) return null
  return (
    <aside className="webmcp-trace" aria-label="Recent WebMCP activity">
      <span className="webmcp-trace-label">WebMCP trace</span>
      <div className="webmcp-trace-list">
        {events.slice(-5).map((event) => (
          <span className={`webmcp-trace-chip is-${event.phase} ${event.readOnly ? 'is-read' : 'is-write'}`} key={event.invocationId}>
            <i>{event.readOnly ? 'R' : 'W'}</i>
            <b>{event.toolName}</b>
            <small>{event.phase === 'running' ? '…' : event.phase === 'complete' ? '✓' : '!'}</small>
          </span>
        ))}
      </div>
    </aside>
  )
}
