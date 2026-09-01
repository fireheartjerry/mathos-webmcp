import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { WorldAction, WorldObject, WorldState } from '../domain/world/types'
import MathObjectView from './MathObjectView'

function objectContents(object: WorldObject, world: WorldState, run: (action: WorldAction) => void): ReactNode {
  const width = Math.max(1, object.bounds.width)
  const height = Math.max(1, object.bounds.height)

  switch (object.kind) {
    case 'ink':
      return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={object.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={object.color}
            strokeWidth={object.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )
    case 'text':
      return <p style={{ color: object.color, fontSize: object.fontSize }}>{object.text}</p>
    case 'image':
      return <img src={object.src} alt={object.alt} draggable={false} />
    case 'shape':
      return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {object.shape === 'rectangle' && <rect x="2" y="2" width={width - 4} height={height - 4} rx="2" fill={object.fill} stroke={object.stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          {object.shape === 'ellipse' && <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 2} ry={height / 2 - 2} fill={object.fill} stroke={object.stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          {object.shape === 'triangle' && <polygon points={`${width / 2},2 ${width - 2},${height - 2} 2,${height - 2}`} fill={object.fill} stroke={object.stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
        </svg>
      )
    case 'arrow': {
      const markerId = `arrow-${object.id}`
      return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={object.color} />
            </marker>
          </defs>
          <line x1={object.from.x} y1={object.from.y} x2={object.to.x} y2={object.to.y} stroke={object.color} strokeWidth="2.5" markerEnd={`url(#${markerId})`} vectorEffect="non-scaling-stroke" />
        </svg>
      )
    }
    case 'equation':
    case 'graph':
    case 'geometry':
    case 'matrix':
      return <MathObjectView object={object} world={world} run={run} />
    case 'frame':
      return <div className="frame-label"><span>{object.title}</span><small>{object.childIds.length} objects</small></div>
    case 'group':
      return <div className="group-label">Group · {object.childIds.length}</div>
  }
}

export default function WorldObjectView({
  object,
  selected,
  agentCommit,
  previewOffset,
  world,
  run,
  onPointerDown,
  onDoubleClick,
}: {
  object: WorldObject
  selected: boolean
  agentCommit?: boolean
  previewOffset?: { x: number; y: number }
  world: WorldState
  run: (action: WorldAction) => void
  onPointerDown: (event: ReactPointerEvent, id: string) => void
  onDoubleClick: (id: string) => void
}) {
  const offset = previewOffset ?? { x: 0, y: 0 }
  const style: CSSProperties = {
    left: object.bounds.x + offset.x,
    top: object.bounds.y + offset.y,
    width: object.bounds.width,
    height: object.bounds.height,
    transform: `rotate(${object.rotation}deg)`,
    opacity: object.opacity,
    pointerEvents: object.opacity <= 0.02 ? 'none' : undefined,
  }
  return (
    <div
      className={`world-object kind-${object.kind}${selected ? ' is-selected' : ''}${agentCommit ? ' is-agent-commit' : ''}`}
      data-object-id={object.id}
      data-author={object.author}
      aria-hidden={object.opacity <= 0.02}
      style={style}
      onPointerDown={(event) => onPointerDown(event, object.id)}
      onDoubleClick={() => onDoubleClick(object.id)}
    >
      {objectContents(object, world, run)}
      {object.author === 'agent' && <span className="author-pip" aria-label="Created by tutor">AI</span>}
    </div>
  )
}
