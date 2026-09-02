'use client'

import { useEffect, useState } from 'react'
import type { WorldCommit } from '../domain/world/types'

export default function ActivityRail({
  activity,
  onUndo,
  compact = false,
  collapseOn,
}: {
  activity: WorldCommit[]
  onUndo: () => void
  compact?: boolean
  collapseOn?: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (window.innerWidth < 1040) setCollapsed(true)
  }, [])

  useEffect(() => {
    if (compact) setCollapsed(false)
  }, [compact])

  useEffect(() => {
    // Scene changes no longer collapse the rail: the film needs the shared
    // history visible while the camera moves. The prop is kept for callers.
    void collapseOn
  }, [collapseOn])

  const latest = activity.slice(-6).reverse()
  return (
    <aside className={`activity-rail${compact ? ' is-compact' : ''}${collapsed ? ' is-collapsed' : ''}`} aria-label="Session activity">
      <header>
        <button type="button" className="activity-toggle" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed}>
          <span>Activity</span><b>{activity.length}</b><i>{collapsed ? '↑' : '↓'}</i>
        </button>
        <button type="button" className="activity-undo" onClick={onUndo} disabled={!activity.length}>Undo</button>
      </header>
      {!collapsed && (
        <div className="activity-list">
          {latest.length === 0 && <p>Every human and tutor action will land here.</p>}
          {latest.map((commit) => (
            <div className="activity-item" key={`${commit.action.id}-${commit.at}`}>
              <i className={`source-dot is-${commit.action.source}`} />
              <div><b>{commit.action.summary}</b><span>{commit.action.source === 'agent' ? 'Tutor' : 'You'}</span></div>
              <time>{new Date(commit.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
