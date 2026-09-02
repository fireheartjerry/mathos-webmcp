'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorldTool } from '../../domain/tools/definitions'
import { relativeTime, summarizeLedger, type LedgerEvent } from '../../domain/tools/ledger'
import '../../styles/sidebar.css'

export const LEDGER_PIN_KEY = 'mathburst.ledger.pinned'

/** The stored pin, or null when nothing has been stored (or storage is unavailable). */
export function readLedgerPin(): boolean | null {
  try {
    const stored = window.localStorage.getItem(LEDGER_PIN_KEY)
    return stored === null ? null : stored === 'true'
  } catch {
    return null
  }
}

export function writeLedgerPin(pinned: boolean) {
  try { window.localStorage.setItem(LEDGER_PIN_KEY, String(pinned)) } catch { /* storage unavailable */ }
}

/** Convenience for the workspace: persisted pin state plus a toggle. */
export function useLedgerPin(initial = false): [boolean, () => void] {
  const [pinned, setPinned] = useState(initial)
  useEffect(() => {
    const stored = readLedgerPin()
    if (stored !== null) setPinned(stored)
  }, [])
  const toggle = useCallback(() => setPinned((value) => {
    writeLedgerPin(!value)
    return !value
  }), [])
  return [pinned, toggle]
}

const phaseGlyph = (phase: LedgerEvent['phase']) => phase === 'running' ? '…' : phase === 'complete' ? '✓' : '!'

/**
 * The persistent WebMCP ledger: distinct tools used over the total, finished
 * calls, a newest-first list of every invocation, and the tools not yet
 * called. Pinned, it stays open; unpinned, it is a slim tab on the right edge
 * that expands on hover or keyboard focus.
 */
export default function ToolLedger({
  events,
  tools,
  pinned,
  onTogglePin,
}: {
  events: LedgerEvent[]
  tools: WorldTool[]
  pinned: boolean
  onTogglePin: () => void
}) {
  const summary = useMemo(() => summarizeLedger(events, tools), [events, tools])
  const [now, setNow] = useState(() => Date.now())
  const [unusedOpen, setUnusedOpen] = useState(false)
  const firstRender = useRef(true)

  // Adopt a stored pin once, then persist every change after that.
  useEffect(() => {
    const stored = readLedgerPin()
    if (stored !== null && stored !== pinned) onTogglePin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    writeLedgerPin(pinned)
  }, [pinned])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { setNow(Date.now()) }, [events.length])

  const complete = summary.totalTools > 0 && summary.distinctUsed >= summary.totalTools
  const ratio = summary.totalTools ? Math.min(1, summary.distinctUsed / summary.totalTools) : 0
  const headline = `${summary.distinctUsed} / ${summary.totalTools} tools used · ${summary.totalCalls} ${summary.totalCalls === 1 ? 'call' : 'calls'}`

  return (
    <aside className={`tool-ledger${pinned ? ' is-pinned' : ' is-tab'}`} aria-label="WebMCP tool ledger">
      <button type="button" className="tool-ledger-tab" aria-label={`WebMCP ledger, ${headline}`} onClick={onTogglePin}>
        <span>WebMCP</span>
        <b>{summary.distinctUsed}/{summary.totalTools}</b>
      </button>
      <div className="tool-ledger-body">
        <header className="tool-ledger-header">
          <span className="tool-ledger-kicker">WebMCP</span>
          <b className="tool-ledger-headline">{headline}</b>
          <button
            type="button"
            className="tool-ledger-pin"
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin the ledger' : 'Pin the ledger open'}
            title={pinned ? 'Unpin' : 'Pin'}
            onClick={onTogglePin}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M4 1h4v1L7 3v3l2 2v1H6.5v2L6 12l-.5-1V9H3V8l2-2V3L4 2z" /></svg>
          </button>
        </header>
        <div className={`tool-ledger-progress${complete ? ' is-complete' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={summary.totalTools} aria-valuenow={summary.distinctUsed}>
          <i style={{ width: `${ratio * 100}%` }} />
        </div>
        <ol className="tool-ledger-list">
          {summary.recent.length === 0 && <li className="tool-ledger-empty">No tool calls yet. Every WebMCP call lands here.</li>}
          {summary.recent.map((event) => (
            <li className={`tool-ledger-row is-${event.phase} ${event.readOnly ? 'is-read' : 'is-write'}`} key={event.invocationId}>
              <i>{event.readOnly ? 'R' : 'W'}</i>
              <div>
                <b>{event.toolName}</b>
                <span title={event.summary}>{event.summary}</span>
              </div>
              <small>{phaseGlyph(event.phase)}</small>
              <time>{relativeTime(event.at, now)}</time>
            </li>
          ))}
        </ol>
        <details className="tool-ledger-unused" open={unusedOpen} onToggle={(event) => setUnusedOpen((event.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <span>Unused</span>
            <b>{summary.unusedTools.length}</b>
          </summary>
          {summary.unusedTools.length === 0
            ? <p>Every registered tool has been called.</p>
            : (
              <div className="tool-ledger-unused-list">
                {summary.unusedTools.map((name) => <span key={name}>{name}</span>)}
              </div>
            )}
        </details>
      </div>
    </aside>
  )
}
