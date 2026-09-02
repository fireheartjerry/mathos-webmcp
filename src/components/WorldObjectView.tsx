import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { handwritingSampleToInk, loadHandwritingSamples } from '../domain/world/handwriting'
import type { FrameObject, ShapeObject, WorldAction, WorldObject, WorldState } from '../domain/world/types'
import AttentionView from './AttentionView'
import BarycentricView from './BarycentricView'
import MathObjectView from './MathObjectView'
import NumberTheoryView from './NumberTheoryView'
import SimplexView from './SimplexView'
import TrainingView from './TrainingView'
import { isCanvasControlTarget } from './canvas/useCanvasInputRouter'
import '../styles/handles.css'

export function smoothStrokePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  // Quadratic midpoint smoothing keeps the captured trajectory faithful while
  // removing the mouse's tiny corners. The final point is explicitly landed on.
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const midpoint = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 }
    path += ` Q ${current.x} ${current.y} ${midpoint.x} ${midpoint.y}`
  }
  const penultimate = points[points.length - 2]
  const last = points[points.length - 1]
  path += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`
  return path
}

/** Transient reveal fraction; undefined or >= 1 means fully drawn. */
function drawFraction(object: WorldObject): number | undefined {
  const progress = object.drawProgress
  if (typeof progress !== 'number' || !Number.isFinite(progress) || progress >= 1) return undefined
  return Math.max(0, progress)
}

/** pathLength="1" makes dasharray/dashoffset an exact fraction of the path. */
function drawReveal(progress: number | undefined) {
  if (progress === undefined) return {}
  return { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - progress }
}

function shapeContents(object: ShapeObject, width: number, height: number, progress: number | undefined): ReactNode {
  const strokeWidth = object.strokeWidth ?? 2
  const common = { fill: object.fill, stroke: object.stroke, strokeWidth, vectorEffect: 'non-scaling-stroke' as const }
  const points = object.points ?? []
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {object.shape === 'rectangle' && <rect x="2" y="2" width={width - 4} height={height - 4} rx={object.cornerRadius ?? 2} {...common} />}
      {object.shape === 'ellipse' && <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 2} ry={height / 2 - 2} {...common} />}
      {object.shape === 'triangle' && <polygon points={`${width / 2},2 ${width - 2},${height - 2} 2,${height - 2}`} {...common} />}
      {object.shape === 'polygon' && points.length > 0 && (
        <polygon
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          {...common}
          strokeLinejoin="round"
          fillOpacity={progress === undefined ? undefined : progress}
          {...drawReveal(progress)}
        />
      )}
      {object.shape === 'freeform' && points.length > 0 && (
        <path
          d={smoothStrokePath(points)}
          {...common}
          strokeLinecap="round"
          strokeLinejoin="round"
          fillOpacity={progress === undefined ? undefined : progress}
          {...drawReveal(progress)}
        />
      )}
    </svg>
  )
}

/** Frame title, editable in place on double-click. Commits 'Renamed frame'. */
function FrameLabel({ object, run }: { object: FrameObject; run: (action: WorldAction) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (draft !== null) inputRef.current?.select()
  }, [draft])

  const commit = () => {
    if (committedRef.current || draft === null) return
    committedRef.current = true
    const title = draft.trim()
    if (title && title !== object.title) {
      run({
        id: crypto.randomUUID(),
        source: 'human',
        summary: 'Renamed frame',
        operations: [{ type: 'put', object: { ...object, title } }],
      })
    }
    setDraft(null)
  }

  const cancel = () => {
    committedRef.current = true
    setDraft(null)
  }

  return (
    <div className="frame-label">
      {draft === null ? (
        <span
          title="Double-click to rename"
          onDoubleClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            committedRef.current = false
            setDraft(object.title)
          }}
        >
          {object.title}
        </span>
      ) : (
        <input
          ref={inputRef}
          className="frame-title-input"
          data-canvas-control="true"
          value={draft}
          aria-label="Frame title"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); commit() }
            else if (event.key === 'Escape') { event.preventDefault(); cancel() }
            event.stopPropagation()
          }}
        />
      )}
      <small>{object.childIds.length} objects</small>
    </div>
  )
}

function objectContents(object: WorldObject, world: WorldState, run: (action: WorldAction) => void): ReactNode {
  const width = Math.max(1, object.bounds.width)
  const height = Math.max(1, object.bounds.height)
  const progress = drawFraction(object)

  switch (object.kind) {
    case 'ink':
      {
        const strokes = object.strokes?.length ? object.strokes : [{ points: object.points }]
        const strokeWidth = Math.max(0.75, object.width * (object.strokeScale ?? 1))
        // Multi-stroke reveal: the fraction is spread over strokes in order, so
        // earlier strokes finish before later ones begin.
        const strokeCount = strokes.length
        return (
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            {strokes.map((stroke, index) => {
              const local = progress === undefined
                ? undefined
                : Math.min(1, Math.max(0, progress * strokeCount - index))
              if (local === 0) return null
              return (
                <path
                  key={`${object.id}-stroke-${index}`}
                  d={smoothStrokePath(stroke.points)}
                  fill="none"
                  stroke={object.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect={object.strokeScale === undefined ? 'non-scaling-stroke' : undefined}
                  {...drawReveal(local !== undefined && local < 1 ? local : undefined)}
                />
              )
            })}
          </svg>
        )
      }
    case 'text':
      return <p className={object.presentation === 'handwritten' ? 'is-handwritten' : undefined} style={{ color: object.color, fontSize: object.fontSize, textAlign: object.textAlign ?? 'left', width: '100%' }}>{object.text}</p>
    case 'image': {
      if (object.src === 'handwriting://opening-attempt') {
        const preview = handwritingSampleToInk(loadHandwritingSamples(), 'opening-attempt', {
          id: `${object.id}-preview`,
          bounds: { x: 0, y: 0, width, height },
          color: '#171713',
          width: 7.5,
          rotation: 0,
          author: 'human',
          opacity: 1,
        })
        if (preview) {
          const strokes = preview.strokes?.length ? preview.strokes : [{ points: preview.points }]
          const strokeWidth = Math.max(0.75, preview.width * (preview.strokeScale ?? 1))
          return (
            <svg className="handwriting-source-preview" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={object.alt}>
              <rect width={width} height={height} fill="#f4f0e7" />
              {strokes.map((stroke, index) => <path key={index} d={smoothStrokePath(stroke.points)} fill="none" stroke={preview.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />)}
            </svg>
          )
        }
      }
      return <img src={object.src} alt={object.alt} draggable={false} />
    }
    case 'shape':
      return shapeContents(object, width, height, progress)
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
    case 'attention':
      return <AttentionView object={object} world={world} run={run} />
    case 'training':
      return <TrainingView object={object} world={world} run={run} />
    case 'barycentric':
      return <BarycentricView object={object} world={world} run={run} />
    case 'simplex':
      return <SimplexView object={object} run={run} />
    case 'numberTheory':
      return <NumberTheoryView object={object} world={world} run={run} />
    case 'frame':
      return <FrameLabel object={object} run={run} />
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
  // Path-like kinds reveal by stroke length (see objectContents); everything
  // else fades in with drawProgress.
  const progress = drawFraction(object)
  const revealsByStroke = object.kind === 'ink' || (object.kind === 'shape' && (object.shape === 'polygon' || object.shape === 'freeform'))
  const opacity = progress !== undefined && !revealsByStroke ? object.opacity * progress : object.opacity
  const style: CSSProperties = {
    left: object.bounds.x + offset.x,
    top: object.bounds.y + offset.y,
    width: object.bounds.width,
    height: object.bounds.height,
    transform: `rotate(${object.rotation}deg)`,
    opacity,
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
      onDoubleClick={(event) => {
        if (isCanvasControlTarget(event.target)) return
        onDoubleClick(object.id)
      }}
    >
      {objectContents(object, world, run)}
      {object.author === 'agent' && <span className="author-pip" aria-label="Created by the Tutor">Tutor</span>}
    </div>
  )
}
