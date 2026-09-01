'use client'

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  normalizeWeights3,
  pointFromWeights,
  signedSubareas,
  triangleAreas,
  type Triangle,
} from '../domain/math/barycentric'
import type { BarycentricObject, Point, WorldAction } from '../domain/world/types'

type Props = {
  object: BarycentricObject
  run: (action: WorldAction) => void
}

const humanPut = (summary: string, object: BarycentricObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const fallbackVertices: Triangle = [
  { x: 55, y: 300 },
  { x: 330, y: 300 },
  { x: 190, y: 52 },
]

function triangleFor(object: BarycentricObject): Triangle {
  return object.vertices.length === 3 ? object.vertices : fallbackVertices
}

function fmt(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function polygonPoints(points: readonly Point[]): string {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
}

export default function BarycentricView({ object, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<Point | null>(null)
  const width = Math.max(280, object.bounds.width)
  const height = Math.max(210, object.bounds.height)
  const canvasHeight = height - 78
  const vertices = triangleFor(object)
  const livePoint = preview ?? pointFromWeights(vertices, object.weights)
  const liveWeights = preview ? triangleAreas(preview, vertices).weights : normalizeWeights3(object.weights)
  const areas = triangleAreas(livePoint, vertices)
  const clipId = `barycentric-clip-${object.id}`

  const localPoint = (event: ReactPointerEvent<SVGElement>): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return livePoint
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * width,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight,
    }
  }

  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setDragging(true)
    setPreview(localPoint(event))
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    event.preventDefault()
    event.stopPropagation()
    setPreview(localPoint(event))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    event.preventDefault()
    event.stopPropagation()
    const point = preview ?? localPoint(event)
    const weights = triangleAreas(point, vertices).weights
    run(humanPut('Moved barycentric point P', { ...object, weights }))
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    setDragging(false)
    setPreview(null)
  }

  const setWeight = (index: number, value: number) => {
    const raw = [...object.weights] as [number, number, number]
    raw[index] = value
    run(humanPut(`Adjusted ${object.labels[index]} barycentric weight`, { ...object, weights: normalizeWeights3(raw) }))
  }

  const setCentroid = () => run(humanPut('Set barycentric point to centroid', { ...object, weights: [1 / 3, 1 / 3, 1 / 3] }))

  return (
    <div className="barycentric-view" onPointerDown={(event) => event.stopPropagation()}>
      <svg
        ref={svgRef}
        className="barycentric-canvas"
        viewBox={`0 0 ${width} ${canvasHeight}`}
        aria-label="Interactive barycentric triangle"
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <defs>
          <clipPath id={clipId}><rect width={width} height={canvasHeight} /></clipPath>
        </defs>
        <rect className="barycentric-paper" width={width} height={canvasHeight} rx="8" />
        <text className="barycentric-kicker" x="16" y="21">ATTENTION → BARYCENTRICS</text>
        <g clipPath={`url(#${clipId})`}>
          <polygon className="barycentric-triangle" points={polygonPoints(vertices)} />
          <polygon className="barycentric-subarea barycentric-subarea-a" points={polygonPoints([livePoint, vertices[1], vertices[2]])} />
          <polygon className="barycentric-subarea barycentric-subarea-b" points={polygonPoints([livePoint, vertices[2], vertices[0]])} />
          <polygon className="barycentric-subarea barycentric-subarea-c" points={polygonPoints([livePoint, vertices[0], vertices[1]])} />
          <line className="barycentric-cevian" x1={vertices[0].x} y1={vertices[0].y} x2={livePoint.x} y2={livePoint.y} />
          <line className="barycentric-cevian" x1={vertices[1].x} y1={vertices[1].y} x2={livePoint.x} y2={livePoint.y} />
          <line className="barycentric-cevian" x1={vertices[2].x} y1={vertices[2].y} x2={livePoint.x} y2={livePoint.y} />
          {vertices.map((vertex, index) => <g key={object.labels[index]}>
            <circle className="barycentric-vertex" cx={vertex.x} cy={vertex.y} r="5" />
            <text className="barycentric-vertex-label" x={vertex.x + (index === 1 ? 9 : -14)} y={vertex.y + (index === 2 ? -10 : 18)}>{object.labels[index]}</text>
          </g>)}
          <circle
            className="barycentric-point"
            cx={livePoint.x}
            cy={livePoint.y}
            r="8"
            onPointerDown={beginDrag}
            aria-label="Drag barycentric point P"
          />
          <text className="barycentric-point-label" x={livePoint.x + 12} y={livePoint.y - 10}>P</text>
        </g>
      </svg>
      <div className="barycentric-readout">
        <div className="barycentric-weight-row">
          {liveWeights.map((weight, index) => <span key={object.labels[index]}><b>{object.labels[index]}</b> {fmt(weight)}</span>)}
          <strong>Σ {fmt(liveWeights.reduce((sum, weight) => sum + weight, 0))}</strong>
        </div>
        <div className="barycentric-area-row">
          <span>signed subareas</span>
          <code>[{areas.signed.map(fmt).join(', ')}]</code>
          <span>total {fmt(areas.totalSigned)}</span>
        </div>
        <div className="barycentric-invariant">P = αA + βB + γC · similarity keeps the weights invariant</div>
      </div>
      <div className="barycentric-controls" onPointerDown={(event) => event.stopPropagation()}>
        {object.weights.map((weight, index) => <label key={object.labels[index]}>
          <span>{object.labels[index]} <b>{fmt(liveWeights[index])}</b></span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={weight}
            aria-label={`${object.labels[index]} barycentric weight`}
            onChange={(event) => setWeight(index, Number(event.target.value))}
          />
        </label>)}
        <button type="button" onClick={setCentroid}>centroid preset</button>
      </div>
    </div>
  )
}
