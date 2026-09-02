'use client'

import { applyMatrix, transformVectors } from '../domain/math/matrix'
import type { MatrixObject, Point, WorldAction, WorldState } from '../domain/world/types'

export default function MatrixPlane({ object, world, run }: { object: MatrixObject; world: WorldState; run: (action: WorldAction) => void }) {
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

