'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { evaluateTinyModel } from '../domain/math/transformer'
import {
  clampPointToTriangle,
  formatWeightTriple,
  normalizeWeights3,
  pointFromWeights,
  setWeightKeepingRatio,
  triangleAreas,
  type Triangle,
} from '../domain/math/barycentric'
import type { BarycentricObject, Point, WorldAction, WorldState } from '../domain/world/types'
import { revealDash, revealItem, revealLerp, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumbers } from './useTweenedNumber'
import '../styles/reveal.css'
import '../styles/barycentric.css'

type Props = {
  object: BarycentricObject
  world?: WorldState
  run: (action: WorldAction) => void
}

type Drag =
  | { kind: 'point'; pointerId: number }
  | { kind: 'vertex'; index: 0 | 1 | 2; pointerId: number }

type VertexIndex = 0 | 1 | 2
type Pulse = { target: 'point' | VertexIndex; at: number }

const humanPut = (summary: string, object: BarycentricObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

/** Card anatomy in pixels; mirrored by barycentric.css so the SVG stays 1:1 with its viewBox. */
const HEADER_HEIGHT = 44
const FOOTER_HEIGHT = 32
const SIDE_WIDTH = 214
const POINT_TWEEN_MS = 240
const PULSE_MS = 700

const fallbackVertices: Triangle = [{ x: 55, y: 300 }, { x: 330, y: 300 }, { x: 190, y: 52 }]
const GREEK = ['α', 'β', 'γ']
const fmt = (value: number) => value.toFixed(3)
const polygonPoints = (points: readonly Point[]) => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
const flatten = (vertices: Triangle) => vertices.flatMap((vertex) => [vertex.x, vertex.y])
const stateKey = (object: BarycentricObject) => `${object.labels.join('|')}#${flatten(object.vertices.length === 3 ? object.vertices : fallbackVertices).join(',')}#${object.weights.join(',')}`

/**
 * The attention weights as exact barycentric coordinates. Dragging P changes
 * the weights; dragging a vertex changes the triangle while the same weights
 * keep locating P, which is the affine-combination invariant on camera.
 *
 * Every committed change (slider, field, button, agent tool) glides: P, the
 * cevians and the sub-triangle areas are derived from tweened weights and
 * tweened vertices. A local drag snaps so the handle never runs behind the
 * pointer, and a change that did not come from this card pulses purple.
 */
export default function BarycentricView({ object, world, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const setDrag = (next: Drag | null) => { dragRef.current = next; setDragState(next) }
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null)
  const [previewVertices, setPreviewVertices] = useState<Triangle | null>(null)
  const [editingLabel, setEditingLabel] = useState<VertexIndex | null>(null)
  const [showCoordinates, setShowCoordinates] = useState(false)
  const [pulse, setPulse] = useState<Pulse | null>(null)

  const width = Math.max(360, object.bounds.width)
  const height = Math.max(240, object.bounds.height)
  const canvasWidth = width - SIDE_WIDTH
  const canvasHeight = height - HEADER_HEIGHT - FOOTER_HEIGHT
  const committedVertices: Triangle = object.vertices.length === 3 ? object.vertices : fallbackVertices
  const committedWeights = normalizeWeights3(object.weights)

  // ---- change bookkeeping: what this card committed vs. what arrived from outside --
  const key = stateKey(object)
  const localKeyRef = useRef<string | null>(null)
  const snapKeyRef = useRef<string | null>(null)
  const seenRef = useRef<{ key: string; vertices: Triangle; weights: [number, number, number] }>({ key, vertices: committedVertices, weights: committedWeights })
  const tweenMs = snapKeyRef.current === key ? 0 : POINT_TWEEN_MS

  useEffect(() => {
    const seen = seenRef.current
    if (seen.key === key) return
    seenRef.current = { key, vertices: committedVertices, weights: committedWeights }
    if (localKeyRef.current === key) return
    const movedVertex = ([0, 1, 2] as VertexIndex[]).find((index) => seen.vertices[index].x !== committedVertices[index].x || seen.vertices[index].y !== committedVertices[index].y)
    const movedPoint = committedWeights.some((weight, index) => Math.abs(weight - seen.weights[index]) > 1e-9)
    const target: Pulse['target'] | null = movedVertex ?? (movedPoint ? 'point' : null)
    if (target === null) return
    setPulse((current) => current && current.target === target && Date.now() - current.at < PULSE_MS ? current : { target, at: Date.now() })
  }, [key, committedVertices, committedWeights])

  const commit = (summary: string, next: BarycentricObject) => {
    localKeyRef.current = stateKey(next)
    run(humanPut(summary, next))
  }

  // ---- tweened display state ------------------------------------------------
  const tweenedWeightsRaw = useTweenedNumbers(committedWeights, tweenMs)
  const tweenedVerticesRaw = useTweenedNumbers(flatten(committedVertices), tweenMs)
  const tweenedWeights = (tweenMs === 0 ? committedWeights : tweenedWeightsRaw) as [number, number, number]
  const tweenedVertices: Triangle = tweenMs === 0
    ? committedVertices
    : [
      { x: tweenedVerticesRaw[0], y: tweenedVerticesRaw[1] },
      { x: tweenedVerticesRaw[2], y: tweenedVerticesRaw[3] },
      { x: tweenedVerticesRaw[4], y: tweenedVerticesRaw[5] },
    ]

  const vertices = previewVertices ?? tweenedVertices
  const livePoint = previewPoint ?? pointFromWeights(vertices, tweenedWeights)
  const liveWeights = previewPoint ? triangleAreas(previewPoint, vertices).weights : tweenedWeights
  const areas = triangleAreas(livePoint, vertices)
  const clipId = `barycentric-clip-${object.id}`
  const attention = world && object.linkedAttentionId ? world.objects[object.linkedAttentionId] : undefined
  const attentionWeights = attention?.kind === 'attention'
    ? evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights
    : null
  const linkedNow = attentionWeights ? attentionWeights.every((weight, index) => Math.abs(weight - committedWeights[index]) < 5e-4) : false

  // ---- staged reveal: triangle edges → cevians → P and its labels --
  const p = revealProgress(object)
  const revealing = p < 1
  const kickerT = revealStage(p, 0, 0.15)
  const edgeT = revealStage(p, 0, 0.4)
  const fillT = revealStage(p, 0.3, 0.5)
  const cevianT = (index: number) => revealItem(revealStage(p, 0.4, 0.7), index, 3, 1)
  const pointT = revealStage(p, 0.7, 0.9)
  const labelT = revealStage(p, 0.75, 1)
  const sideT = revealStage(p, 0, 0.2)

  const clampVertex = (point: Point): Point => ({
    x: Math.max(12, Math.min(canvasWidth - 12, point.x)),
    y: Math.max(16, Math.min(canvasHeight - 12, point.y)),
  })

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
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* synthetic or already-captured pointer */ }
    setDrag({ kind: 'point', pointerId: event.pointerId })
    setPreviewPoint(clampPointToTriangle(localPoint(event), vertices))
  }

  const beginVertexDrag = (event: ReactPointerEvent<SVGCircleElement>, index: VertexIndex) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* synthetic or already-captured pointer */ }
    setDrag({ kind: 'vertex', index, pointerId: event.pointerId })
    setPreviewVertices([...vertices] as Triangle)
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    const point = localPoint(event)
    if (active.kind === 'point') setPreviewPoint(clampPointToTriangle(point, vertices))
    else setPreviewVertices((current) => {
      const next = [...(current ?? vertices)] as Triangle
      next[active.index] = clampVertex(point)
      return next
    })
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    const point = localPoint(event)
    if (active.kind === 'point') {
      const weights = normalizeWeights3(triangleAreas(clampPointToTriangle(point, vertices), vertices).weights)
      const next = { ...object, weights }
      snapKeyRef.current = stateKey(next)
      commit(`Moved P to ${formatWeightTriple(weights)}`, next)
    } else {
      const nextVertices = [...(previewVertices ?? vertices)] as Triangle
      nextVertices[active.index] = clampVertex(point)
      const next = { ...object, vertices: nextVertices }
      snapKeyRef.current = stateKey(next)
      commit(`Moved vertex ${object.labels[active.index]}; P follows the same weights`, next)
    }
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    setDrag(null)
    setPreviewPoint(null)
    setPreviewVertices(null)
  }

  // ---- side-panel edits -------------------------------------------------------
  const slideWeight = (index: number, value: number) => {
    commit(`Adjusted ${GREEK[index]}`, { ...object, weights: setWeightKeepingRatio(committedWeights, index, value) })
  }
  const typeWeight = (index: number, value: number) => {
    const weights = setWeightKeepingRatio(committedWeights, index, value)
    if (weights.every((weight, at) => Math.abs(weight - committedWeights[at]) < 1e-9)) return
    commit(`Set weights to ${formatWeightTriple(weights)}`, { ...object, weights })
  }
  const setVertexCoordinate = (index: VertexIndex, axis: 'x' | 'y', value: number) => {
    if (!Number.isFinite(value) || committedVertices[index][axis] === value) return
    const nextVertices = [...committedVertices] as Triangle
    nextVertices[index] = clampVertex({ ...committedVertices[index], [axis]: value })
    commit(`Set vertex ${object.labels[index]} to (${nextVertices[index].x}, ${nextVertices[index].y})`, { ...object, vertices: nextVertices })
  }
  const renameVertex = (index: VertexIndex, label: string) => {
    setEditingLabel(null)
    const trimmed = label.trim()
    if (!trimmed || trimmed === object.labels[index]) return
    const labels = [...object.labels] as [string, string, string]
    labels[index] = trimmed
    commit(`Renamed vertex ${object.labels[index]} to ${trimmed}`, { ...object, labels })
  }
  const setCentroid = () => commit('Set P to the centroid [1:1:1]', { ...object, weights: [1 / 3, 1 / 3, 1 / 3] })
  const syncAttention = () => {
    if (!attentionWeights) return
    commit('Copied the live attention weights into the triangle', { ...object, weights: attentionWeights })
  }
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  const pulsePosition = pulse === null ? null : pulse.target === 'point' ? livePoint : vertices[pulse.target]
  const sum = liveWeights.reduce((total, weight) => total + weight, 0)
  const meta = linkedNow ? 'weights = attention α' : attentionWeights ? 'attention head linked' : 'free weights'

  return (
    <div
      className={`barycentric-view barycentric-card reveal-root${drag ? ' is-dragging' : ''}${revealing ? ' is-revealing' : ''}`}
      onPointerDown={stop}
      style={revealing ? { opacity: object.opacity } : undefined}
    >
      <header className="barycentric-header" style={{ opacity: kickerT }}>
        <div className="barycentric-heading">
          <span className="barycentric-kicker">Barycentric coordinates</span>
          <h3>P = αA + βB + γC</h3>
        </div>
        <div className="barycentric-meta">
          <b>Σ = {fmt(sum)}</b>
          <small className={linkedNow ? 'is-linked' : undefined}>{meta}</small>
        </div>
      </header>

      <div className="barycentric-body">
        <div className="barycentric-stage">
          <svg
            ref={svgRef}
            className="barycentric-canvas"
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            preserveAspectRatio="none"
            aria-label="Interactive barycentric triangle"
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <defs><clipPath id={clipId}><rect width={canvasWidth} height={canvasHeight} /></clipPath></defs>
            <rect className="barycentric-paper" width={canvasWidth} height={canvasHeight} />
            <g clipPath={`url(#${clipId})`}>
              <g style={{ opacity: fillT }}>
                <polygon className="barycentric-subarea barycentric-subarea-a" points={polygonPoints([livePoint, vertices[1], vertices[2]])} />
                <polygon className="barycentric-subarea barycentric-subarea-b" points={polygonPoints([livePoint, vertices[2], vertices[0]])} />
                <polygon className="barycentric-subarea barycentric-subarea-c" points={polygonPoints([livePoint, vertices[0], vertices[1]])} />
              </g>
              <polygon className="barycentric-triangle" points={polygonPoints(vertices)} pathLength={1} style={edgeT < 1 ? { ...revealDash(edgeT), fillOpacity: edgeT } : undefined} />
              {vertices.map((vertex, index) => {
                const t = cevianT(index)
                if (t <= 0) return null
                const tip = revealLerp(vertex, livePoint, t)
                return <line key={`cevian-${index}`} className="barycentric-cevian" x1={vertex.x} y1={vertex.y} x2={tip.x} y2={tip.y} />
              })}
              {/* Subarea labels sit at the centroid of each signed sub-triangle. */}
              {[[1, 2], [2, 0], [0, 1]].map(([first, second], index) => {
                const cx = (livePoint.x + vertices[first].x + vertices[second].x) / 3
                const cy = (livePoint.y + vertices[first].y + vertices[second].y) / 3
                return <text key={`area-${index}`} className={`barycentric-area-label is-${index}`} x={cx} y={cy + 4} textAnchor="middle" style={{ opacity: labelT }}>{GREEK[index]} = {(liveWeights[index] * labelT).toFixed(2)}</text>
              })}
              {pulsePosition && pulse && (
                <circle
                  key={`pulse-${String(pulse.target)}-${pulse.at}`}
                  className="barycentric-agent-pulse"
                  cx={pulsePosition.x}
                  cy={pulsePosition.y}
                  r={14}
                  onAnimationEnd={() => setPulse(null)}
                />
              )}
              {vertices.map((vertex, index) => {
                const t = revealStage(p, index * 0.1, index * 0.1 + 0.15)
                if (t <= 0) return null
                const labelX = vertex.x + (index === 1 ? 11 : index === 0 ? -20 : -5)
                const labelY = vertex.y + (index === 2 ? -12 : 20)
                return (
                  <g key={`vertex-${index}`}>
                    <circle
                      className="barycentric-vertex is-draggable"
                      data-canvas-handle="true"
                      data-demo-target={index === 0 ? 'barycentric-vertex-a' : undefined}
                      cx={vertex.x}
                      cy={vertex.y}
                      r={6 * t}
                      onPointerDown={(event) => beginVertexDrag(event, index as VertexIndex)}
                      aria-label={`Drag vertex ${object.labels[index]}`}
                    />
                    {editingLabel === index ? (
                      <foreignObject x={labelX - 6} y={labelY - 15} width={84} height={26}>
                        <LabelEditor value={object.labels[index]} onCommit={(label) => renameVertex(index as VertexIndex, label)} onCancel={() => setEditingLabel(null)} />
                      </foreignObject>
                    ) : (
                      <text
                        className="barycentric-vertex-label is-editable"
                        data-canvas-control="true"
                        x={labelX}
                        y={labelY}
                        style={{ opacity: t }}
                        onDoubleClick={(event) => { event.stopPropagation(); setEditingLabel(index as VertexIndex) }}
                      >
                        {object.labels[index]}
                        <title>Double-click to rename</title>
                      </text>
                    )}
                  </g>
                )
              })}
              {pointT > 0 && <circle
                className="barycentric-point"
                data-canvas-handle="true"
                data-demo-target="barycentric-point"
                cx={livePoint.x}
                cy={livePoint.y}
                r={8 * pointT}
                onPointerDown={beginPointDrag}
                aria-label="Drag barycentric point P"
              />}
              <text className="barycentric-point-label" x={livePoint.x + 12} y={livePoint.y - 10} style={{ opacity: labelT }}>P</text>
            </g>
          </svg>
        </div>

        <aside className="barycentric-side reveal-fade" onPointerDown={stop} style={{ opacity: sideT }}>
          <div className="barycentric-weight-grid" aria-label="Barycentric weights">
            {liveWeights.map((weight, index) => (
              <div key={GREEK[index]} className={`barycentric-weight is-${index}`}>
                <label className="barycentric-weight-name" htmlFor={`${object.id}-weight-${index}`}>{GREEK[index]} · {object.labels[index]}</label>
                <NumberField
                  key={`${index}-${committedWeights[index].toFixed(3)}`}
                  className="barycentric-weight-field"
                  value={committedWeights[index]}
                  digits={3}
                  step={0.001}
                  min={0}
                  max={1}
                  label={`${GREEK[index]} weight value`}
                  onCommit={(value) => typeWeight(index, value)}
                />
                <input
                  id={`${object.id}-weight-${index}`}
                  className="barycentric-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={committedWeights[index]}
                  style={{ '--fill': `${(weight * 100).toFixed(1)}%` } as CSSProperties}
                  aria-label={`${GREEK[index]} weight`}
                  onChange={(event) => slideWeight(index, Number(event.target.value))}
                />
              </div>
            ))}
          </div>
          <div className="barycentric-actions">
            <button type="button" data-demo-target="barycentric-centroid" onClick={setCentroid}>centroid [1:1:1]</button>
            <button type="button" className={linkedNow ? 'is-linked' : undefined} disabled={!attentionWeights || linkedNow} onClick={syncAttention} title={attentionWeights ? `attention α = [${attentionWeights.map((weight) => weight.toFixed(3)).join(', ')}]` : 'no linked attention head'}>
              {linkedNow ? 'weights = attention α' : 'use attention α'}
            </button>
          </div>
          <div className={`barycentric-coordinates${showCoordinates ? ' is-open' : ''}`}>
            <button type="button" className="barycentric-coordinates-toggle" aria-expanded={showCoordinates} onClick={() => setShowCoordinates((value) => !value)}>
              <span>{showCoordinates ? '▾' : '▸'}</span> vertex coordinates
            </button>
            {showCoordinates && (
              <div className="barycentric-coordinate-rows">
                {committedVertices.map((vertex, index) => (
                  <div key={`${index}-${vertex.x}-${vertex.y}`} className="barycentric-coordinate-row">
                    <b>{object.labels[index]}</b>
                    <NumberField value={vertex.x} digits={0} step={1} label={`${object.labels[index]} x`} onCommit={(value) => setVertexCoordinate(index as VertexIndex, 'x', Math.round(value))} />
                    <NumberField value={vertex.y} digits={0} step={1} label={`${object.labels[index]} y`} onCommit={(value) => setVertexCoordinate(index as VertexIndex, 'y', Math.round(value))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="barycentric-footer reveal-fade" style={{ opacity: sideT }}>
        <span className="barycentric-areas">
          <small>signed subareas</small>
          <code>[{areas.signed.map((value) => value.toFixed(0)).join(', ')}]</code>
          <small>÷ {areas.totalSigned.toFixed(0)} =</small>
          <em>[{liveWeights.map((weight) => weight.toFixed(3)).join(', ')}]</em>
        </span>
        <p className="barycentric-invariant">Dragging a vertex moves P by the same weights: the affine combination is the invariant.</p>
      </footer>
    </div>
  )
}

function NumberField({
  value,
  digits,
  step,
  min,
  max,
  label,
  className,
  onCommit,
}: {
  value: number
  digits: number
  step: number
  min?: number
  max?: number
  label: string
  className?: string
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(value.toFixed(digits))
  const submit = () => {
    const parsed = Number(text.replace(',', '.'))
    if (Number.isFinite(parsed)) onCommit(parsed)
    else setText(value.toFixed(digits))
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      step={step}
      min={min}
      max={max}
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); (event.target as HTMLInputElement).blur() }
        if (event.key === 'Escape') { setText(value.toFixed(digits)); (event.target as HTMLInputElement).blur() }
        event.stopPropagation()
      }}
    />
  )
}

function LabelEditor({ value, onCommit, onCancel }: { value: string; onCommit: (value: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value)
  const doneRef = useRef(false)
  const finish = (commit: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    if (commit) onCommit(text)
    else onCancel()
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') { event.preventDefault(); finish(true) }
    if (event.key === 'Escape') finish(false)
  }
  return (
    <input
      className="barycentric-label-editor"
      data-canvas-control="true"
      autoFocus
      maxLength={6}
      aria-label={`Rename vertex ${value}`}
      value={text}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finish(true)}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}
