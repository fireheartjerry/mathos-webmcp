'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { estimateIntegral, evaluateLatexAt, sampleGraph } from '../domain/math/graph'
import { resolveGeometry } from '../domain/math/geometry'
import type { ResolvedAngle } from '../domain/math/geometry'
import { applyMatrix, transformVectors } from '../domain/math/matrix'
import type {
  EquationObject,
  GeometryObject,
  GraphObject,
  MatrixObject,
  Point,
  WorldAction,
  WorldState,
} from '../domain/world/types'
import GammaProbabilityView from './GammaProbabilityView'
import { Tex } from './Tex'

const humanPut = (summary: string, object: GraphObject | GeometryObject | MatrixObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

function ticks([min, max]: [number, number], target = 8): number[] {
  const step = Math.max(1, Math.ceil((max - min) / target))
  const values: number[] = []
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) values.push(value)
  return values
}

function LiveGraph({
  object,
  world,
  run,
}: {
  object: GraphObject
  world: WorldState
  run: (action: WorldAction) => void
}) {
  const equation = world.objects[object.equationId]
  const latex = equation?.kind === 'equation' ? equation.latex : '0'
  const width = Math.max(220, object.bounds.width)
  const height = Math.max(180, object.bounds.height)
  const plot = { left: 42, top: 34, right: width - 18, bottom: height - 62 }
  const [xMin, xMax] = object.xDomain
  const [yMin, yMax] = object.yDomain
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)
  const samples = sampleGraph(latex, object.xDomain, object.parameters)
  const curve = samples.map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')
  const shade = object.shadeIntegral
    ? sampleGraph(latex, object.shadeIntegral, object.parameters, 72)
    : []
  const shadePath = shade.length
    ? `M ${mapX(shade[0].x)} ${mapY(0)} ${shade.map((point) => `L ${mapX(point.x)} ${mapY(point.y)}`).join(' ')} L ${mapX(shade.at(-1)!.x)} ${mapY(0)} Z`
    : ''
  const area = object.shadeIntegral ? estimateIntegral(latex, object.shadeIntegral, object.parameters) : null
  const liveX = object.showTangentAt ?? (xMin + xMax) / 2
  const liveY = evaluateLatexAt(latex, liveX, object.parameters)
  const tangent = useMemo(() => {
    if (object.showTangentAt === undefined) return null
    const x = object.showTangentAt
    const epsilon = Math.max(0.0001, (xMax - xMin) / 500)
    const y = evaluateLatexAt(latex, x, object.parameters)
    const before = evaluateLatexAt(latex, x - epsilon, object.parameters)
    const after = evaluateLatexAt(latex, x + epsilon, object.parameters)
    if (y === null || before === null || after === null) return null
    const slope = (after - before) / (2 * epsilon)
    const span = (xMax - xMin) * 0.18
    const firstX = Math.max(xMin, x - span)
    const secondX = Math.min(xMax, x + span)
    return {
      x,
      y,
      first: { x: firstX, y: y + slope * (firstX - x) },
      second: { x: secondX, y: y + slope * (secondX - x) },
    }
  }, [latex, object.parameters, object.showTangentAt, xMax, xMin])
  const parameter = Object.entries(object.parameters ?? {})[0]
  const clipId = `graph-clip-${object.id}`

  return (
    <div className="live-graph">
      <svg viewBox={`0 0 ${width} ${height}`} aria-label={`Live graph of ${latex}`}>
        <defs><clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} /></clipPath></defs>
        <rect className="graph-paper" x="0" y="0" width={width} height={height} />
        <text className="graph-kicker" x={plot.left} y="18">LIVE FUNCTION</text>
        <g clipPath={`url(#${clipId})`}>
          {ticks(object.xDomain).map((value) => <line key={`x-${value}`} className="graph-grid" x1={mapX(value)} x2={mapX(value)} y1={plot.top} y2={plot.bottom} />)}
          {ticks(object.yDomain).map((value) => <line key={`y-${value}`} className="graph-grid" x1={plot.left} x2={plot.right} y1={mapY(value)} y2={mapY(value)} />)}
          {yMin <= 0 && yMax >= 0 && <line className="graph-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} />}
          {xMin <= 0 && xMax >= 0 && <line className="graph-axis" x1={mapX(0)} x2={mapX(0)} y1={plot.top} y2={plot.bottom} />}
          {shadePath && <path className="graph-area" d={shadePath} />}
          {curve && <path className="graph-curve" d={curve} style={{ stroke: object.color }} />}
          {tangent && <>
            <line className="graph-tangent" x1={mapX(tangent.first.x)} y1={mapY(tangent.first.y)} x2={mapX(tangent.second.x)} y2={mapY(tangent.second.y)} />
            <circle className="graph-focus" cx={mapX(tangent.x)} cy={mapY(tangent.y)} r="4.5" />
          </>}
        </g>
        <text className="graph-tick" x={plot.left} y={plot.bottom + 16}>{xMin}</text>
        <text className="graph-tick" x={plot.right} y={plot.bottom + 16} textAnchor="end">{xMax}</text>
        {area !== null && <text className="graph-area-label" x={plot.right} y="19" textAnchor="end">∫ area ≈ {area.toFixed(3)}</text>}
        {liveY !== null && <text className="graph-value-label" x={plot.right - 7} y={plot.top + 15} textAnchor="end">f({Number(liveX.toFixed(2))}) = {Number(liveY.toFixed(3))}</text>}
      </svg>
      <div className="graph-formula"><span>f(x)</span><Tex latex={latex} /></div>
      {parameter && (
        <label className="graph-parameter" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
          <span>{parameter[0]} = <b>{parameter[1].toFixed(1)}</b></span>
          <input
            aria-label={`Parameter ${parameter[0]}`}
            type="range"
            min="-2"
            max="3"
            step="0.1"
            value={parameter[1]}
            onChange={(event) => run(humanPut(`Changed graph parameter ${parameter[0]}`, {
              ...object,
              parameters: { ...object.parameters, [parameter[0]]: Number(event.target.value) },
            }))}
          />
        </label>
      )}
    </div>
  )
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

function LiveGeometry({
  object,
  run,
}: {
  object: GeometryObject
  run: (action: WorldAction) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{ id: string; pointerId: number } | null>(null)
  const [preview, setPreview] = useState<Point | null>(null)
  const primitives = preview && dragging
    ? object.primitives.map((primitive) => primitive.kind === 'point' && primitive.id === dragging.id ? { ...primitive, at: preview } : primitive)
    : object.primitives
  const resolved = resolveGeometry(primitives)
  const width = Math.max(220, object.bounds.width)
  const height = Math.max(180, object.bounds.height)

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
    if (!dragging || dragging.pointerId !== event.pointerId) return
    event.stopPropagation()
    setPreview(localPoint(event))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    event.stopPropagation()
    if (preview) {
      const updated: GeometryObject = {
        ...object,
        primitives: object.primitives.map((primitive) => primitive.kind === 'point' && primitive.id === dragging.id ? { ...primitive, at: preview } : primitive),
      }
      run(humanPut(`Moved geometry point ${dragging.id}`, updated))
    }
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
        <text className="geometry-kicker" x="18" y="22">DYNAMIC CONSTRUCTION</text>
        {resolved.polygons.map((polygon) => <polygon key={polygon.id} className="geometry-polygon" points={polygon.points.map((point) => `${point.x},${point.y}`).join(' ')} />)}
        {resolved.circles.map((circle) => <circle key={circle.id} className="geometry-circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />)}
        {resolved.lines.map((line) => {
          const length = Math.hypot(line.direction.x, line.direction.y) || 1
          const unit = { x: line.direction.x / length, y: line.direction.y / length }
          return <line key={line.id} className="geometry-line" x1={line.through.x - unit.x * 1200} y1={line.through.y - unit.y * 1200} x2={line.through.x + unit.x * 1200} y2={line.through.y + unit.y * 1200} />
        })}
        {resolved.segments.map((segment) => <line key={segment.id} className="geometry-segment" x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} />)}
        {resolved.angles.map((angle) => {
          const arc = angleArc(angle)
          return <g key={angle.id}><path className="geometry-angle" d={arc.path} /><text className="geometry-angle-label" x={arc.label.x} y={arc.label.y}>{Math.round(angle.degrees)}°</text></g>
        })}
        {resolved.points.map((point) => <g key={point.id}>
          <circle
            className={`geometry-point${point.draggable ? ' is-draggable' : ''}${point.derived ? ' is-derived' : ''}`}
            cx={point.point.x}
            cy={point.point.y}
            r={point.draggable ? 6 : 4.5}
            onPointerDown={point.draggable ? (event) => beginDrag(event, point.id) : undefined}
          />
          {point.label && <text className="geometry-label" x={point.point.x + 9} y={point.point.y - 9}>{point.label}</text>}
        </g>)}
      </svg>
      <div className="geometry-legend"><i /><span>drag purple points</span><b>{resolved.points.length} linked points</b></div>
    </div>
  )
}

function MatrixPlane({ object, world }: { object: MatrixObject; world: WorldState }) {
  const width = Math.max(260, object.bounds.width)
  const height = Math.max(200, object.bounds.height)
  const plotRight = width - 150
  const center = { x: plotRight / 2, y: height / 2 + 8 }
  const vectors = transformVectors(object, world)
  const maximum = Math.max(4, ...vectors.flatMap((vector) => [Math.abs(vector.source.x), Math.abs(vector.source.y), Math.abs(vector.transformed.x), Math.abs(vector.transformed.y)]))
  const scale = Math.min(plotRight, height - 54) / (maximum * 2.35)
  const draw = (point: Point) => ({ x: center.x + point.x * scale, y: center.y - point.y * scale })
  const sourceMarker = `matrix-source-${object.id}`
  const resultMarker = `matrix-result-${object.id}`
  const determinant = object.values[0][0] * object.values[1][1] - object.values[0][1] * object.values[1][0]
  const gridValues = [-4, -3, -2, -1, 0, 1, 2, 3, 4]

  return (
    <div className="matrix-plane">
      <svg viewBox={`0 0 ${width} ${height}`} aria-label="Live matrix transformation">
        <defs>
          <marker id={sourceMarker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className="matrix-source-head" d="M0 0L10 5L0 10Z" /></marker>
          <marker id={resultMarker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className="matrix-result-head" d="M0 0L10 5L0 10Z" /></marker>
        </defs>
        <rect className="matrix-paper" width={width} height={height} />
        <text className="matrix-kicker" x="17" y="21">LINEAR TRANSFORMATION</text>
        <g className="matrix-lattice">
          {gridValues.map((value) => {
            const first = draw(applyMatrix(object.values, { x: value, y: -4 }))
            const last = draw(applyMatrix(object.values, { x: value, y: 4 }))
            return <line key={`v-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} />
          })}
          {gridValues.map((value) => {
            const first = draw(applyMatrix(object.values, { x: -4, y: value }))
            const last = draw(applyMatrix(object.values, { x: 4, y: value }))
            return <line key={`h-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} />
          })}
        </g>
        <line className="matrix-axis" x1="8" x2={plotRight - 8} y1={center.y} y2={center.y} />
        <line className="matrix-axis" x1={center.x} x2={center.x} y1="32" y2={height - 12} />
        {vectors.map((vector, index) => {
          const source = draw(vector.source)
          const transformed = draw(vector.transformed)
          return <g key={vector.id}>
            <line className="matrix-source-vector" x1={center.x} y1={center.y} x2={source.x} y2={source.y} markerEnd={`url(#${sourceMarker})`} />
            <line className="matrix-result-vector" x1={center.x} y1={center.y} x2={transformed.x} y2={transformed.y} markerEnd={`url(#${resultMarker})`} />
            <text className="matrix-vector-label" x={transformed.x + 6} y={transformed.y - 6}>v{index + 1}′</text>
          </g>
        })}
      </svg>
      <div className="matrix-readout">
        <span className="matrix-name">A =</span>
        <div className="matrix-bracket">
          {object.values.flat().map((value, index) => <b key={index}>{Number(value.toFixed(2))}</b>)}
        </div>
        <small>det A = {Number(determinant.toFixed(2))}</small>
        <em>double-click to edit</em>
      </div>
      <div className="matrix-key"><span>— source</span><b>— transformed</b></div>
    </div>
  )
}

export default function MathObjectView({
  object,
  world,
  run,
}: {
  object: EquationObject | GraphObject | GeometryObject | MatrixObject
  world: WorldState
  run: (action: WorldAction) => void
}) {
  if (object.kind === 'equation') return <div className="math-equation-object"><Tex latex={object.latex} display ariaLabel={object.latex} /></div>
  if (object.kind === 'graph') return object.visualization === 'gamma-density'
    ? <GammaProbabilityView object={object} run={run} />
    : <LiveGraph object={object} world={world} run={run} />
  if (object.kind === 'geometry') return <LiveGeometry object={object} run={run} />
  return <MatrixPlane object={object} world={world} />
}
