'use client'

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { resolveGeometry, spiralSimilarityParameters } from '../domain/math/geometry'
import type { ResolvedAngle, ResolvedPoint } from '../domain/math/geometry'
import type { GeometryObject, GraphObject, MatrixObject, Point, WorldAction } from '../domain/world/types'

const humanPut = (summary: string, object: GraphObject | GeometryObject | MatrixObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Live ratio and angle readouts computed from the resolved figure, never from the primitive factors. */
function constructionReadouts(points: ResolvedPoint[]): Array<{ id: string; label: string; value: string; tone: 'invariant' | 'tutor' }> {
  const at = (id: string) => points.find((point) => point.id === id)?.point
  const readouts: Array<{ id: string; label: string; value: string; tone: 'invariant' | 'tutor' }> = []
  const O = at('O')
  for (const vertex of ['A', 'B', 'C']) {
    const source = at(vertex)
    const image = at(`H-${vertex}`)
    if (O && source && image && distance(O, source) > 1e-6) {
      readouts.push({ id: `ratio-${vertex}`, label: `O${vertex}ₕ / O${vertex}`, value: (distance(O, image) / distance(O, source)).toFixed(3), tone: 'invariant' })
    }
  }
  const S = at('S')
  const A = at('A'); const B = at('B'); const A2 = at('S-A'); const B2 = at('S-B')
  if (S && A && B && A2 && B2) {
    const parameters = spiralSimilarityParameters(A, B, A2, B2)
    if (parameters) {
      readouts.push({ id: 'spiral-ratio', label: "SA′ / SA = SB′ / SB", value: `${(distance(S, A2) / Math.max(1e-9, distance(S, A))).toFixed(3)} = ${(distance(S, B2) / Math.max(1e-9, distance(S, B))).toFixed(3)}`, tone: 'tutor' })
      readouts.push({ id: 'spiral-angle', label: '∠ASA′ = ∠BSB′', value: `${Math.abs(parameters.angle).toFixed(1)}°`, tone: 'tutor' })
    }
  }
  return readouts
}

function angleArc(angle: ResolvedAngle) {
  const radius = 28
  const start = Math.atan2(angle.a.y - angle.vertex.y, angle.a.x - angle.vertex.x)
  const finish = Math.atan2(angle.b.y - angle.vertex.y, angle.b.x - angle.vertex.x)
  let delta = finish - start
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  const first = { x: angle.vertex.x + Math.cos(start) * radius, y: angle.vertex.y + Math.sin(start) * radius }
  const last = { x: angle.vertex.x + Math.cos(start + delta) * radius, y: angle.vertex.y + Math.sin(start + delta) * radius }
  const middle = start + delta / 2
  return {
    path: `M ${first.x} ${first.y} A ${radius} ${radius} 0 0 ${delta > 0 ? 1 : 0} ${last.x} ${last.y}`,
    label: { x: angle.vertex.x + Math.cos(middle) * 44, y: angle.vertex.y + Math.sin(middle) * 44 },
  }
}

export default function LiveGeometry({
  object,
  run,
}: {
  object: GeometryObject
  run: (action: WorldAction) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDraggingState] = useState<{ id: string; pointerId: number } | null>(null)
  const draggingRef = useRef<{ id: string; pointerId: number } | null>(null)
  const setDragging = (next: { id: string; pointerId: number } | null) => { draggingRef.current = next; setDraggingState(next) }
  const [preview, setPreview] = useState<Point | null>(null)
  const primitives = preview && dragging
    ? object.primitives.map((primitive) => primitive.kind === 'point' && primitive.id === dragging.id ? { ...primitive, at: preview } : primitive)
    : object.primitives
  const resolved = resolveGeometry(primitives)
  const width = Math.max(220, object.bounds.width)
  const height = Math.max(180, object.bounds.height)
  const readouts = constructionReadouts(resolved.points)
  const hasSpiral = resolved.points.some((point) => point.id === 'S')

  const localPoint = (event: ReactPointerEvent<SVGElement>): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    }
  }

  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setDragging({ id, pointerId: event.pointerId })
    setPreview(localPoint(event))
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = draggingRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.stopPropagation()
    setPreview(localPoint(event))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = draggingRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.stopPropagation()
    const point = localPoint(event)
    const updated: GeometryObject = {
      ...object,
      primitives: object.primitives.map((primitive) => primitive.kind === 'point' && primitive.id === active.id ? { ...primitive, at: point } : primitive),
    }
    run(humanPut(`Moved ${active.id}; every dependent mark recomputed`, updated))
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    setDragging(null)
    setPreview(null)
  }

  return (
    <div className="live-geometry">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        aria-label="Dynamic geometry construction"
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <rect className="geometry-paper" width={width} height={height} />
        <text className="geometry-kicker" x="18" y="20">HOMOTHETY · SPIRAL SIMILARITY</text>
        {resolved.polygons.map((polygon) => <polygon key={polygon.id} className={`geometry-polygon is-${polygon.id}`} points={polygon.points.map((point) => `${point.x},${point.y}`).join(' ')} />)}
        {resolved.circles.map((circle) => <circle key={circle.id} className={`geometry-circle is-${circle.id}`} cx={circle.center.x} cy={circle.center.y} r={circle.radius} />)}
        {resolved.lines.map((line) => {
          const length = Math.hypot(line.direction.x, line.direction.y) || 1
          const unit = { x: line.direction.x / length, y: line.direction.y / length }
          return <line key={line.id} className="geometry-line" x1={line.through.x - unit.x * 1200} y1={line.through.y - unit.y * 1200} x2={line.through.x + unit.x * 1200} y2={line.through.y + unit.y * 1200} />
        })}
        {resolved.segments.map((segment) => <line key={segment.id} className={`geometry-segment is-${segment.id}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} />)}
        {resolved.angles.map((angle) => {
          const arc = angleArc(angle)
          return <g key={angle.id} className={`geometry-angle-group is-${angle.id}`}><path className="geometry-angle" d={arc.path} /><text className="geometry-angle-label" x={arc.label.x} y={arc.label.y} textAnchor="middle">{angle.degrees.toFixed(1)}°</text></g>
        })}
        {resolved.points.filter((point) => !point.hidden).map((point) => <g key={point.id} className={`geometry-point-group is-${point.id}`}>
          <circle
            className={`geometry-point${point.draggable ? ' is-draggable' : ''}${point.derived ? ' is-derived' : ''}${point.id === 'S' ? ' is-spiral-center' : ''}`}
            data-demo-target={point.id === 'A' ? 'geometry-vertex-a' : undefined}
            data-canvas-handle={point.draggable ? 'true' : undefined}
            cx={point.point.x}
            cy={point.point.y}
            r={point.draggable ? 6 : 4.5}
            onPointerDown={point.draggable ? (event) => beginDrag(event, point.id) : undefined}
          />
          {point.label && <text className="geometry-label" x={point.point.x + 9} y={point.point.y - 9}>{point.label}</text>}
        </g>)}
      </svg>
      <div className={`geometry-legend${hasSpiral ? ' has-spiral' : ''}`}>
        {readouts.map((readout) => <span key={readout.id} className={`geometry-readout is-${readout.tone}`}><small>{readout.label}</small><b>{readout.value}</b></span>)}
        <em>{hasSpiral ? 'S is the fixed point of the spiral similarity A→A′, B→B′, recomputed from the four points' : 'drag A, B, C or O · the two circles stay tangent at O'}</em>
      </div>
    </div>
  )
}

