'use client'

import { useMemo } from 'react'
import { estimateIntegral, evaluateLatexAt, sampleGraph } from '../domain/math/graph'
import type { GeometryObject, GraphObject, MatrixObject, WorldAction, WorldState } from '../domain/world/types'
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

export default function LiveGraph({
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
        <label className="graph-parameter" data-canvas-control="true" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
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

