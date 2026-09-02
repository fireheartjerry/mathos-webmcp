'use client'

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { evaluateTinyModel } from '../domain/math/transformer'
import {
  normalizeWeights3,
  pointFromWeights,
  triangleAreas,
  type Triangle,
} from '../domain/math/barycentric'
import type { BarycentricObject, Point, WorldAction, WorldState } from '../domain/world/types'

type Props = {
  object: BarycentricObject
  world?: WorldState
  run: (action: WorldAction) => void
}

type Drag =
  | { kind: 'point'; pointerId: number }
  | { kind: 'vertex'; index: 0 | 1 | 2; pointerId: number }

const humanPut = (summary: string, object: BarycentricObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const fallbackVertices: Triangle = [{ x: 55, y: 300 }, { x: 330, y: 300 }, { x: 190, y: 52 }]
const GREEK = ['α', 'β', 'γ']
const fmt = (value: number) => value.toFixed(3)
const polygonPoints = (points: readonly Point[]) => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')

/**
 * The attention weights as exact barycentric coordinates. Dragging P changes
 * the weights; dragging a vertex changes the triangle while the same weights
 * keep locating P, which is the affine-combination invariant on camera.
 */
export default function BarycentricView({ object, world, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null)
  const [previewVertices, setPreviewVertices] = useState<Triangle | null>(null)
  const width = Math.max(280, object.bounds.width)
  const height = Math.max(210, object.bounds.height)
  const canvasWidth = width - 214
  const canvasHeight = height
  const vertices = previewVertices ?? (object.vertices.length === 3 ? object.vertices : fallbackVertices)
  const committedWeights = normalizeWeights3(object.weights)
  const livePoint = previewPoint ?? pointFromWeights(vertices, committedWeights)
  const liveWeights = previewPoint ? triangleAreas(previewPoint, vertices).weights : committedWeights
  const areas = triangleAreas(livePoint, vertices)
  const clipId = `barycentric-clip-${object.id}`
  const attention = world && object.linkedAttentionId ? world.objects[object.linkedAttentionId] : undefined
  const attentionWeights = attention?.kind === 'attention'
    ? evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights
    : null
  const linkedNow = attentionWeights ? attentionWeights.every((weight, index) => Math.abs(weight - committedWeights[index]) < 5e-4) : false

  const localPoint = (event: ReactPointerEvent<SVGElement>): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return livePoint
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvasWidth,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvasHeight,
    }
  }

  const beginPointDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setDrag({ kind: 'point', pointerId: event.pointerId })
    setPreviewPoint(localPoint(event))
  }

  const beginVertexDrag = (event: ReactPointerEvent<SVGCircleElement>, index: 0 | 1 | 2) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    setDrag({ kind: 'vertex', index, pointerId: event.pointerId })
    setPreviewVertices([...vertices] as Triangle)
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    const point = localPoint(event)
    if (drag.kind === 'point') setPreviewPoint(point)
    else setPreviewVertices((current) => {
      const next = [...(current ?? vertices)] as Triangle
      next[drag.index] = { x: Math.max(12, Math.min(canvasWidth - 12, point.x)), y: Math.max(28, Math.min(canvasHeight - 12, point.y)) }
      return next
    })
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    if (drag.kind === 'point') {
      const point = previewPoint ?? localPoint(event)
      const weights = triangleAreas(point, vertices).weights
      run(humanPut(`Moved P to [${weights.map((weight) => weight.toFixed(2)).join(' : ')}]`, { ...object, weights }))
    } else if (previewVertices) {
      run(humanPut(`Moved vertex ${object.labels[drag.index]}; P follows the same weights`, { ...object, vertices: previewVertices }))
    }
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    setDrag(null)
    setPreviewPoint(null)
    setPreviewVertices(null)
  }

  const setWeight = (index: number, value: number) => {
    const raw = [...object.weights] as [number, number, number]
    raw[index] = value
    run(humanPut(`Adjusted ${GREEK[index]}`, { ...object, weights: normalizeWeights3(raw) }))
  }

  const setCentroid = () => run(humanPut('Set P to the centroid [1:1:1]', { ...object, weights: [1 / 3, 1 / 3, 1 / 3] }))
  const syncAttention = () => {
    if (!attentionWeights) return
    run(humanPut('Copied the live attention weights into the triangle', { ...object, weights: attentionWeights }))
  }
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  return (
    <div className={`barycentric-view${drag ? ' is-dragging' : ''}`} onPointerDown={stop}>
      <svg
        ref={svgRef}
        className="barycentric-canvas"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        aria-label="Interactive barycentric triangle"
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <defs><clipPath id={clipId}><rect width={canvasWidth} height={canvasHeight} /></clipPath></defs>
        <rect className="barycentric-paper" width={canvasWidth} height={canvasHeight} />
        <text className="barycentric-kicker" x="16" y="18">BARYCENTRIC COORDINATES · P = αA + βB + γC</text>
        <g clipPath={`url(#${clipId})`}>
          <polygon className="barycentric-subarea barycentric-subarea-a" points={polygonPoints([livePoint, vertices[1], vertices[2]])} />
          <polygon className="barycentric-subarea barycentric-subarea-b" points={polygonPoints([livePoint, vertices[2], vertices[0]])} />
          <polygon className="barycentric-subarea barycentric-subarea-c" points={polygonPoints([livePoint, vertices[0], vertices[1]])} />
          <polygon className="barycentric-triangle" points={polygonPoints(vertices)} />
          {vertices.map((vertex, index) => <line key={`cevian-${index}`} className="barycentric-cevian" x1={vertex.x} y1={vertex.y} x2={livePoint.x} y2={livePoint.y} />)}
          {/* Subarea labels sit at the centroid of each signed sub-triangle. */}
          {[[1, 2], [2, 0], [0, 1]].map(([first, second], index) => {
            const cx = (livePoint.x + vertices[first].x + vertices[second].x) / 3
            const cy = (livePoint.y + vertices[first].y + vertices[second].y) / 3
            return <text key={`area-${index}`} className={`barycentric-area-label is-${index}`} x={cx} y={cy + 4} textAnchor="middle">{GREEK[index]} = {liveWeights[index].toFixed(2)}</text>
          })}
          {vertices.map((vertex, index) => (
            <g key={object.labels[index]}>
              <circle
                className="barycentric-vertex is-draggable"
                data-canvas-handle="true"
                data-demo-target={index === 0 ? 'barycentric-vertex-a' : undefined}
                cx={vertex.x}
                cy={vertex.y}
                r="6"
                onPointerDown={(event) => beginVertexDrag(event, index as 0 | 1 | 2)}
                aria-label={`Drag vertex ${object.labels[index]}`}
              />
              <text className="barycentric-vertex-label" x={vertex.x + (index === 1 ? 11 : index === 0 ? -20 : -5)} y={vertex.y + (index === 2 ? -12 : 20)}>{object.labels[index]}</text>
            </g>
          ))}
          <circle
            className="barycentric-point"
            data-canvas-handle="true"
            data-demo-target="barycentric-point"
            cx={livePoint.x}
            cy={livePoint.y}
            r="8"
            onPointerDown={beginPointDrag}
            aria-label="Drag barycentric point P"
          />
          <text className="barycentric-point-label" x={livePoint.x + 12} y={livePoint.y - 10}>P</text>
        </g>
      </svg>

      <aside className="barycentric-side" onPointerDown={stop}>
        <div className="barycentric-weight-grid" aria-label="Barycentric weights">
          {liveWeights.map((weight, index) => (
            <label key={GREEK[index]} className={`is-${index}`}>
              <span>{GREEK[index]} · {object.labels[index]}</span>
              <b>{fmt(weight)}</b>
              <input type="range" min="0" max="1" step="0.01" value={committedWeights[index]} aria-label={`${GREEK[index]} weight`} onChange={(event) => setWeight(index, Number(event.target.value))} />
            </label>
          ))}
          <strong>Σ = {fmt(liveWeights.reduce((sum, weight) => sum + weight, 0))}</strong>
        </div>
        <div className="barycentric-areas">
          <span>signed subareas</span>
          <code>[{areas.signed.map((value) => value.toFixed(0)).join(', ')}]</code>
          <em>÷ {areas.totalSigned.toFixed(0)} = [{liveWeights.map((weight) => weight.toFixed(3)).join(', ')}]</em>
        </div>
        <div className="barycentric-actions">
          <button type="button" data-demo-target="barycentric-centroid" onClick={setCentroid}>centroid [1:1:1]</button>
          <button type="button" className={linkedNow ? 'is-linked' : undefined} disabled={!attentionWeights || linkedNow} onClick={syncAttention} title={attentionWeights ? `attention α = [${attentionWeights.map((weight) => weight.toFixed(3)).join(', ')}]` : 'no linked attention head'}>
            {linkedNow ? 'weights = attention α' : 'use attention α'}
          </button>
        </div>
        <p className="barycentric-invariant">Dragging a vertex moves P by the same weights: the affine combination is the invariant.</p>
      </aside>
    </div>
  )
}
