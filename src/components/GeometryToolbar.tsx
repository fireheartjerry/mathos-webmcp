'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react'

export type GeometryTool =
  | 'move'
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'polygon'
  | 'midpoint'
  | 'perpendicular'
  | 'parallel'
  | 'intersection'
  | 'angle'
  | 'homothety'
  | 'delete'

export type GeometryToolDefinition = {
  id: GeometryTool
  label: string
  /** One-letter shortcut, active while the widget is hovered or focused. */
  key: string
  hint: string
  icon: ReactElement
}

const dot = (x: number, y: number, r = 1.6) => <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />

export const GEOMETRY_TOOLS: GeometryToolDefinition[] = [
  { id: 'move', label: 'Move', key: 'M', hint: 'drag points or shapes · click to select · shift-drag locks an axis', icon: <><path d="M4 2.5 12 8l-3.6.9 2 4.4-1.7.8-2-4.4L4 12z" /></> },
  { id: 'point', label: 'Point', key: 'P', hint: 'click empty space to place a point', icon: <>{dot(8, 8, 2.3)}</> },
  { id: 'segment', label: 'Segment', key: 'S', hint: 'click two points', icon: <><path d="M3.5 12.5 12.5 3.5" />{dot(3.5, 12.5)}{dot(12.5, 3.5)}</> },
  { id: 'line', label: 'Line', key: 'L', hint: 'click two points', icon: <><path d="M1.5 14.5 14.5 1.5" />{dot(5.5, 10.5)}{dot(10.5, 5.5)}</> },
  { id: 'ray', label: 'Ray', key: 'R', hint: 'click the origin, then a point it passes through', icon: <><path d="M3.5 12.5 14 2M11 2h3v3" />{dot(3.5, 12.5)}{dot(8.5, 7.5)}</> },
  { id: 'circle', label: 'Circle', key: 'C', hint: 'click the centre, then a point on the circle', icon: <><circle cx="8" cy="8" r="5.5" />{dot(8, 8)}{dot(13.5, 8)}</> },
  { id: 'polygon', label: 'Polygon', key: 'G', hint: 'click vertices · click the first again or double-click to close', icon: <><path d="M3 12.5 5 4l7.5-1 1 8.5z" />{dot(3, 12.5)}{dot(5, 4)}{dot(12.5, 3)}{dot(13.5, 11.5)}</> },
  { id: 'midpoint', label: 'Midpoint', key: 'D', hint: 'click two points', icon: <><path d="M2.5 8h11" />{dot(2.5, 8)}{dot(13.5, 8)}<circle cx="8" cy="8" r="2" fill="var(--paper, #fbf9f3)" /></> },
  { id: 'perpendicular', label: 'Perpendicular', key: 'T', hint: 'click a line or segment, then a point', icon: <><path d="M2 12.5h12M8 3v9.5M8 9.5h3v3" />{dot(8, 12.5)}</> },
  { id: 'parallel', label: 'Parallel', key: 'A', hint: 'click a line or segment, then a point', icon: <><path d="M2 10.5 10.5 2M5.5 14 14 5.5" />{dot(9.5, 10)}</> },
  { id: 'intersection', label: 'Intersection', key: 'I', hint: 'click two lines or segments', icon: <><path d="M2 3l12 10M2 13 14 3" />{dot(8, 8, 2)}</> },
  { id: 'angle', label: 'Angle', key: 'N', hint: 'click a point, the vertex, then another point', icon: <><path d="M3 13h11M3 13 12 3M8 13a5 5 0 0 0-1.5-3.6" />{dot(3, 13)}</> },
  { id: 'homothety', label: 'Reflect / Homothety', key: 'H', hint: 'click the centre, then the point to map · factor −1 reflects', icon: <><path d="M2.5 13.5 6 9.5 8 12zM2.5 13.5 13 2M2.5 13.5 12.5 8.5l-3.5 5z" />{dot(2.5, 13.5)}</> },
  { id: 'delete', label: 'Delete', key: 'X', hint: 'click a primitive to delete it and everything built on it', icon: <><path d="M4 4l8 8M12 4l-8 8" /></> },
]

const stopForLeftClicks = (event: ReactPointerEvent<HTMLElement>) => { if (event.button !== 2) event.stopPropagation() }

/** Pixel budget of the toolbar row, mirrored by geometry.css. */
const TOOL_SLOT = 23
const HORIZONTAL_PADDING = 32 // 16px each side, matching the header/footer inset
const DIVIDER = 7
const TOGGLE_SLOTS = 2
const GAP = 1 // matches the flex `gap` in geometry.css
const HINT_CHAR_WIDTH = 6.6 // ~0.6em per glyph at 11px in the mono stack
const HINT_MIN_WIDTH = 96 // floor so even a short hint gets a legible line
const HINT_MAX_WIDTH = 460 // cap so one long hint can't swallow the whole row
const HINT_BREAKPOINT = 640

/**
 * One row, never two: tools that do not fit at the measured width move into a
 * "⋯ more" menu. The hint yields its space first (and hides below 640px).
 */
export default function GeometryToolbar({
  tool,
  onSelect,
  showLabels,
  onToggleLabels,
  showCoordinates,
  onToggleCoordinates,
  hint,
}: {
  tool: GeometryTool
  onSelect: (tool: GeometryTool) => void
  showLabels: boolean
  onToggleLabels: () => void
  showCoordinates: boolean
  onToggleCoordinates: () => void
  hint: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number>(Number.POSITIVE_INFINITY)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const element = rootRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      if (rootRef.current?.querySelector('.geometry-tool.is-more')?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('pointerdown', close, true)
    window.addEventListener('keydown', escape, true)
    return () => { window.removeEventListener('pointerdown', close, true); window.removeEventListener('keydown', escape, true) }
  }, [menuOpen])

  const compact = Number.isFinite(width) && width < HINT_BREAKPOINT
  // Reserve room for the *current* hint's actual text (not a flat guess), so a long hint like
  // Move's never gets less space than it needs and a short one doesn't starve the icons.
  const hintWidth = compact ? 0 : Math.min(HINT_MAX_WIDTH, Math.max(HINT_MIN_WIDTH, Math.ceil(hint.length * HINT_CHAR_WIDTH) + GAP + 4 /* hint's own margin-left */))
  const reserved = HORIZONTAL_PADDING + DIVIDER + TOGGLE_SLOTS * TOOL_SLOT + hintWidth + GAP * 3 /* divider/toggle/hint gaps */
  let visibleCount = Number.isFinite(width) ? Math.floor((width - reserved) / TOOL_SLOT) : GEOMETRY_TOOLS.length
  if (visibleCount < GEOMETRY_TOOLS.length) visibleCount = Math.max(1, visibleCount - 1) // keep a slot for the ⋯ button
  const visible = GEOMETRY_TOOLS.slice(0, visibleCount)
  const overflow = GEOMETRY_TOOLS.slice(visibleCount)
  const overflowActive = overflow.some((definition) => definition.id === tool)

  const select = (next: GeometryTool) => { setMenuOpen(false); onSelect(next) }

  return (
    <div ref={rootRef} className={`geometry-toolbar${compact ? ' is-compact' : ''}`} role="toolbar" aria-label="Construction tools" data-canvas-control="true" onPointerDown={stopForLeftClicks}>
      {visible.map((definition) => (
        <button
          key={definition.id}
          type="button"
          className={`geometry-tool is-${definition.id}`}
          aria-pressed={tool === definition.id}
          aria-label={definition.label}
          title={`${definition.label} (${definition.key}) — ${definition.hint}`}
          onClick={() => select(definition.id)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">{definition.icon}</svg>
        </button>
      ))}
      {overflow.length > 0 && (
        <span className="geometry-toolbar-more">
          <button
            type="button"
            className={`geometry-tool is-more${overflowActive ? ' is-holding-active' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More tools (${overflow.length})`}
            title="More tools"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">{dot(3.5, 8, 1.5)}{dot(8, 8, 1.5)}{dot(12.5, 8, 1.5)}</svg>
          </button>
          {menuOpen && (
            <div ref={menuRef} className="geometry-toolbar-menu" role="menu" aria-label="More tools">
              {overflow.map((definition) => (
                <button
                  key={definition.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={tool === definition.id}
                  className={`geometry-menu-item${tool === definition.id ? ' is-active' : ''}`}
                  onClick={() => select(definition.id)}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">{definition.icon}</svg>
                  <span>{definition.label}</span>
                  <kbd>{definition.key}</kbd>
                </button>
              ))}
            </div>
          )}
        </span>
      )}
      <span className="geometry-toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        className="geometry-tool is-toggle"
        aria-pressed={showLabels}
        aria-label="Show labels"
        title="Show labels"
        onClick={onToggleLabels}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><text x="8" y="12.5" textAnchor="middle" fontSize="12" fontFamily="var(--serif, serif)" fontWeight="600" fill="currentColor" stroke="none">A</text></svg>
      </button>
      <button
        type="button"
        className="geometry-tool is-toggle"
        aria-pressed={showCoordinates}
        aria-label="Coordinates panel"
        title="Coordinates panel — edit x and y of every free point"
        onClick={onToggleCoordinates}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2v11h11" />{dot(9, 6, 1.8)}<path d="M9 6v7M9 6H3" strokeDasharray="1.5 1.5" /></svg>
      </button>
      <span className="geometry-toolbar-hint" aria-live="polite">{hint}</span>
    </div>
  )
}
