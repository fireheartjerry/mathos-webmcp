'use client'

import { useEffect, useState } from 'react'
import type { ToolBurst } from '../../domain/tools/ledger'
import '../../styles/sidebar.css'

const HOLD_MS = 3200

/**
 * One big toast for the latest burst of tool calls, docked at the top of the
 * left WebMCP column: "Used 3 WebMCP tools" and the tool names as chips. It
 * pops in (scale 0.96 → 1 over 160 ms), holds 3.2 s after the burst's last
 * event and never stacks; a new burst simply replaces the current one and
 * replays the pop.
 */
export default function ToolToast({ bursts }: { bursts: ToolBurst[] }) {
  const latest = bursts.length ? bursts[bursts.length - 1] : null
  const latestId = latest?.id ?? null
  const latestAt = latest?.at ?? 0
  const latestCount = latest?.count ?? 0
  const [shown, setShown] = useState<ToolBurst | null>(null)
  const [visible, setVisible] = useState(false)
  const [pop, setPop] = useState(0)

  useEffect(() => {
    if (!latestId) return
    setShown(bursts[bursts.length - 1])
    setVisible(true)
    setPop((value) => value + 1)
    const remaining = Math.max(0, latestAt + HOLD_MS - Date.now())
    const timer = window.setTimeout(() => setVisible(false), remaining)
    return () => window.clearTimeout(timer)
    // Primitive deps: a burst object is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId, latestAt, latestCount])

  if (!shown) return null
  const names = shown.toolNames.length
  return (
    <div className={`tool-toast${visible ? ' is-visible' : ''}`} key={pop} role="status" aria-live="polite" aria-hidden={!visible}>
      <span className="tool-toast-kicker">WebMCP</span>
      <b>
        Used {names} WebMCP {names === 1 ? 'tool' : 'tools'}
        {shown.count > names && <small> · {shown.count} calls</small>}
      </b>
      <div className="tool-toast-chips">
        {shown.tools.map((tool) => (
          <span className={`tool-chip ${tool.readOnly ? 'is-read' : 'is-write'}`} key={tool.name}>
            <i>{tool.readOnly ? 'R' : 'W'}</i>
            <b>{tool.name}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
