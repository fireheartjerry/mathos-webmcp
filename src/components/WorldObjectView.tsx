import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { variableWidthInkPath } from './canvas/inkGeometry'
import '../styles/handles.css'

/** Default graphite drifts to a blue-black when text is presented as handwriting. */
const HANDWRITING_INK = '#22243a'
const ARROW_HEAD_LENGTH = 11
const ARROW_HEAD_WIDTH = 9

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ink drawn by hand with the pen tool is rendered as a filled, velocity-thinned outline. */
function usesVelocityInk(object: Extract<WorldObject, { kind: 'ink' }>, progress: number | undefined): boolean {
  return object.author === 'human' && object.strokeScale === undefined && object.width < 10 && progress === undefined
}

/**
 * Centres typeset math and scales it down (never clips) when it outgrows the
 * bounds, so an agent-resized equation stays crisp and whole.
 */
function EquationFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      const availableWidth = outer.clientWidth - 16
      const availableHeight = outer.clientHeight - 8
      const width = inner.offsetWidth
      const height = inner.offsetHeight
      if (!width || !height || availableWidth <= 0 || availableHeight <= 0) return
      const next = Math.min(1, availableWidth / width, availableHeight / height)
      setScale((current) => (Math.abs(current - next) < 0.005 ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} className="equation-fit" style={{ '--eq-scale': scale } as CSSProperties}>
      <div ref={innerRef} className="equation-fit-inner">{children}</div>
    </div>
  )
}

function LockGlyph() {
  return (
    <span className="lock-glyph" role="img" aria-label="Locked">
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
        <path d="M4 5.5 V3.8 a2 2 0 0 1 4 0 V5.5" fill="none" />
      </svg>
    </span>
  )
}

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
        if (usesVelocityInk(object, progress)) {
          return (
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
              {strokes.map((stroke, index) => (
                <path key={`${object.id}-ink-${index}`} className="ink-outline" d={variableWidthInkPath(stroke.points, object.width)} fill={object.color} stroke="none" />
              ))}
            </svg>
          )
        }
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
    case 'text': {
      const handwritten = object.presentation === 'handwritten'
      const color = handwritten && object.color.toLowerCase() === '#171713' ? HANDWRITING_INK : object.color
      return <p className={handwritten ? 'is-handwritten' : undefined} style={{ color, fontSize: object.fontSize, textAlign: object.textAlign ?? 'left', width: '100%' }}>{object.text}</p>
    }
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
      // The head is a plain polygon at the tip, scaled by --hs in CSS so it keeps
      // one screen size at any zoom, matching the non-scaling 2.5px shaft.
      const angle = Math.atan2(object.to.y - object.from.y, object.to.x - object.from.x)
      const tip = object.to
      const base = { x: tip.x - Math.cos(angle) * ARROW_HEAD_LENGTH, y: tip.y - Math.sin(angle) * ARROW_HEAD_LENGTH }
      const nx = -Math.sin(angle) * (ARROW_HEAD_WIDTH / 2)
      const ny = Math.cos(angle) * (ARROW_HEAD_WIDTH / 2)
      const head = `${tip.x},${tip.y} ${base.x + nx},${base.y + ny} ${base.x - nx},${base.y - ny}`
      return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <line x1={object.from.x} y1={object.from.y} x2={tip.x} y2={tip.y} stroke={object.color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <polygon className="arrow-head" points={head} fill={object.color} style={{ transformOrigin: `${tip.x}px ${tip.y}px` }} />
        </svg>
      )
    }
    case 'equation':
      return <EquationFit><MathObjectView object={object} world={world} run={run} /></EquationFit>
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
  groupChild,
  previewOffset,
  world,
  run,
  onPointerDown,
  onDoubleClick,
}: {
  object: WorldObject
  selected: boolean
  agentCommit?: boolean
  /** A child of a selected group or frame; highlighted subtly. */
  groupChild?: boolean
  previewOffset?: { x: number; y: number }
  world: WorldState
  run: (action: WorldAction) => void
  onPointerDown: (event: ReactPointerEvent, id: string) => void
  onDoubleClick: (id: string) => void
}) {
  const offset = previewOffset ?? { x: 0, y: 0 }
  // Entrance: mounted at scale .97 / opacity 0, released on the next frame and
  // transitioned for 220 ms (see handles.css). Transform and opacity only, so
  // nothing reflows. Reduced motion skips straight to the resting state.
  const [entered, setEntered] = useState<'false' | 'entering' | 'true'>(() => (reduceMotion() ? 'true' : 'false'))
  useEffect(() => {
    if (reduceMotion()) return
    let settle: number | undefined
    const frame = window.requestAnimationFrame(() => {
      setEntered('entering')
      settle = window.setTimeout(() => setEntered('true'), 260)
    })
    // Runs once per mount; the cleanup only fires on unmount so the settle
    // timer is never cancelled by the state change it follows.
    return () => {
      window.cancelAnimationFrame(frame)
      if (settle !== undefined) window.clearTimeout(settle)
    }
  }, [])
  // Path-like kinds reveal by stroke length (see objectContents); everything
  // else fades in with drawProgress.
  const progress = drawFraction(object)
  const revealsByStroke = object.kind === 'ink' || (object.kind === 'shape' && (object.shape === 'polygon' || object.shape === 'freeform'))
  const opacity = progress !== undefined && !revealsByStroke ? object.opacity * progress : object.opacity
  const style = {
    left: object.bounds.x + offset.x,
    top: object.bounds.y + offset.y,
    width: object.bounds.width,
    height: object.bounds.height,
    '--obj-rotation': `${object.rotation}deg`,
    '--obj-opacity': opacity,
    transform: 'rotate(var(--obj-rotation)) scale(var(--enter-scale, 1))',
    opacity: 'calc(var(--obj-opacity) * var(--enter-opacity, 1))',
    pointerEvents: object.opacity <= 0.02 ? 'none' : undefined,
  } as CSSProperties
  const className = [
    'world-object',
    `kind-${object.kind}`,
    selected ? 'is-selected' : '',
    agentCommit ? 'is-agent-commit' : '',
    groupChild ? 'is-group-child' : '',
    object.locked ? 'is-locked' : '',
  ].filter(Boolean).join(' ')
  return (
    <div
      className={className}
      data-object-id={object.id}
      data-author={object.author}
      data-entered={entered}
      aria-hidden={object.opacity <= 0.02}
      style={style}
      onPointerDown={(event) => onPointerDown(event, object.id)}
      onDoubleClick={(event) => {
        if (isCanvasControlTarget(event.target)) return
        onDoubleClick(object.id)
      }}
    >
      {objectContents(object, world, run)}
      {object.locked && <LockGlyph />}
      {object.author === 'agent' && <span className="author-pip" aria-label="Created by the Tutor">Tutor</span>}
    </div>
  )
}
