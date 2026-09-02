import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { editableNodes } from '../../domain/world/operations'
import type { WorldObject } from '../../domain/world/types'
import '../../styles/handles.css'

export type NodeRef =
  | { kind: 'arrow'; end: 'from' | 'to' }
  | { kind: 'point'; index: number }

/**
 * Draggable nodes for a single arrow (head/tail) or polygon/freeform shape
 * (every point, plus dashed edge midpoints that insert a node on double-click).
 * Rendered in the world-stage at the object's bounds so it rotates with it.
 */
export default function NodeEditor({
  object,
  onNodePointerDown,
  onInsertNode,
  onDeleteNode,
}: {
  object: WorldObject
  onNodePointerDown: (node: NodeRef, event: ReactPointerEvent<HTMLDivElement>) => void
  onInsertNode: (afterIndex: number) => void
  onDeleteNode: (index: number) => void
}) {
  const nodes = editableNodes(object)
  if (nodes.length === 0) return null
  const isArrow = object.kind === 'arrow'
  const closed = object.kind === 'shape' && object.shape === 'polygon'
  const minimum = closed ? 3 : 2

  const midpoints: { index: number; x: number; y: number }[] = []
  if (!isArrow) {
    const edgeCount = closed ? nodes.length : nodes.length - 1
    for (let index = 0; index < edgeCount; index += 1) {
      const a = nodes[index]
      const b = nodes[(index + 1) % nodes.length]
      midpoints.push({ index, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    }
  }

  const handleNodeClick = (index: number) => (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!event.altKey || isArrow) return
    event.preventDefault()
    event.stopPropagation()
    if (nodes.length > minimum) onDeleteNode(index)
  }

  return (
    <div
      className={`node-editor${object.author === 'agent' ? ' is-agent' : ''}`}
      style={{
        left: object.bounds.x,
        top: object.bounds.y,
        width: object.bounds.width,
        height: object.bounds.height,
        transform: `rotate(${object.rotation}deg)`,
      }}
    >
      {midpoints.map((midpoint) => (
        <div
          key={`mid-${midpoint.index}`}
          className="node-handle is-midpoint"
          data-canvas-handle="true"
          title="Double-click to insert a node"
          style={{ left: midpoint.x, top: midpoint.y }}
          onPointerDown={(event) => { event.stopPropagation() }}
          onDoubleClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onInsertNode(midpoint.index)
          }}
        />
      ))}
      {nodes.map((node, index) => (
        <div
          key={`node-${index}`}
          className={`node-handle${isArrow ? ' is-arrow-end' : ''}`}
          data-canvas-handle="true"
          data-node-index={index}
          title={isArrow ? (index === 0 ? 'Arrow tail' : 'Arrow head') : 'Drag to move · Alt-click to delete'}
          style={{ left: node.x, top: node.y }}
          onClick={handleNodeClick(index)}
          onPointerDown={(event) => {
            if (event.altKey && !isArrow) {
              // Alt-click deletes on click; keep the pointer from starting a drag.
              event.stopPropagation()
              return
            }
            onNodePointerDown(isArrow ? { kind: 'arrow', end: index === 0 ? 'from' : 'to' } : { kind: 'point', index }, event)
          }}
        />
      ))}
    </div>
  )
}
