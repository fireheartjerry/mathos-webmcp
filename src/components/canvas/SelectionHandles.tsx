import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ResizeHandle } from '../../domain/world/operations'
import type { Bounds } from '../../domain/world/types'
import '../../styles/handles.css'

export type SelectionHandleId = ResizeHandle | 'rotate'

const RESIZE_HANDLES: { id: ResizeHandle; left: string; top: string }[] = [
  { id: 'nw', left: '0%', top: '0%' },
  { id: 'n', left: '50%', top: '0%' },
  { id: 'ne', left: '100%', top: '0%' },
  { id: 'e', left: '100%', top: '50%' },
  { id: 'se', left: '100%', top: '100%' },
  { id: 's', left: '50%', top: '100%' },
  { id: 'sw', left: '0%', top: '100%' },
  { id: 'w', left: '0%', top: '50%' },
]

/**
 * Selection frame with eight resize handles and a rotate handle. Lives inside the
 * world-stage so it follows the object; the stage's --hs variable keeps handle
 * sizes constant on screen. A multi-selection draws a dashed union frame.
 */
export default function SelectionHandles({
  bounds,
  rotation,
  agent,
  multi = false,
  onHandlePointerDown,
}: {
  bounds: Bounds
  rotation: number
  agent: boolean
  multi?: boolean
  onHandlePointerDown: (handle: SelectionHandleId, event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={`selection-frame${agent ? ' is-agent' : ''}${multi ? ' is-multi' : ''}`}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.id}
          className="selection-handle"
          data-canvas-handle="true"
          data-handle={handle.id}
          style={{ left: handle.left, top: handle.top }}
          onPointerDown={(event) => onHandlePointerDown(handle.id, event)}
        />
      ))}
      <div className="selection-rotate-leader" aria-hidden="true" />
      <div
        className="selection-handle"
        data-canvas-handle="true"
        data-handle="rotate"
        title="Rotate (Shift snaps to 15°)"
        onPointerDown={(event) => onHandlePointerDown('rotate', event)}
      />
    </div>
  )
}
