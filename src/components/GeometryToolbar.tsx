'use client'

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
  { id: 'move', label: 'Move', key: 'M', hint: 'drag points or shapes · click to select', icon: <><path d="M4 2.5 12 8l-3.6.9 2 4.4-1.7.8-2-4.4L4 12z" /></> },
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
  return (
    <div className="geometry-toolbar" role="toolbar" aria-label="Construction tools" data-canvas-control="true" onPointerDown={stopForLeftClicks}>
      {GEOMETRY_TOOLS.map((definition) => (
        <button
          key={definition.id}
          type="button"
          className={`geometry-tool is-${definition.id}`}
          aria-pressed={tool === definition.id}
          aria-label={definition.label}
          title={`${definition.label} (${definition.key}) — ${definition.hint}`}
          onClick={() => onSelect(definition.id)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">{definition.icon}</svg>
        </button>
      ))}
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
