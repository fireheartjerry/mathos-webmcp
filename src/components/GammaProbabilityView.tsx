'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { gammaBinMasses, gammaCDF, gammaDensity, gammaFunction, massesToSoftmax } from '../domain/math/probability'
import type { GraphObject, WorldAction } from '../domain/world/types'
import { Tex } from './Tex'

type Props = { object: GraphObject; run: (action: WorldAction) => void }

const humanPut = (summary: string, object: GraphObject): WorldAction => ({
  id: crypto.randomUUID(), source: 'human', summary, operations: [{ type: 'put', object }],
})
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const BIN_LABELS = ['w₁', 'w₂', 'w₃']

/**
 * The Gamma density as a living area. Two inverse controls only: the CDF
 * bound `b` and the shape `a`. Pointer drags preview locally and commit one
 * world action on release, so the recorded gesture is one history row.
 */
export default function GammaProbabilityView({ object, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ a?: number; b?: number } | null>(null)
  const [draggingBound, setDraggingBound] = useState(false)
  const width = Math.max(420, object.bounds.width)
  const height = Math.max(300, object.bounds.height)
  const plotHeight = height - 150
  const plot = { left: 46, top: 28, right: width - 18, bottom: plotHeight - 26 }
  const [xMin, rawXMax] = object.xDomain
  const xMax = Math.max(xMin + 1, rawXMax)
  const [yMin, rawYMax] = object.yDomain
  const yMax = Math.max(yMin + 0.01, rawYMax)
  const committedShape = clamp(object.parameters?.a ?? 4.5, 0.5, 10)
  const committedBound = clamp(object.parameters?.b ?? object.shadeIntegral?.[1] ?? committedShape + 1, xMin, xMax)
  const shape = clamp(draft?.a ?? committedShape, 0.5, 10)
  const bound = clamp(draft?.b ?? committedBound, xMin, xMax)
  const edges = object.binEdges ?? [0, shape * 0.7, shape * 1.35, 16]
  const masses = useMemo(() => gammaBinMasses(shape, edges), [shape, edges[0], edges[1], edges[2], edges[3]])
  const bridge = useMemo(() => massesToSoftmax(masses), [masses])
  const cdf = gammaCDF(bound, shape)
  const mode = Math.max(0, shape - 1)
  const gammaValue = gammaFunction(shape)
  const samples = useMemo(() => Array.from({ length: 120 }, (_, index) => {
    const x = xMin + ((xMax - xMin) * index) / 119
    return { x, y: gammaDensity(x, shape) }
  }), [shape, xMin, xMax])
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)
  const curve = samples.map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')
  const shadeSamples = useMemo(() => Array.from({ length: 56 }, (_, index) => {
    const x = xMin + ((bound - xMin) * index) / 55
    return { x, y: gammaDensity(x, shape) }
  }), [bound, shape, xMin])
  const shade = `M ${mapX(xMin)} ${mapY(0)} ${shadeSamples.map((point) => `L ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')} L ${mapX(bound)} ${mapY(0)} Z`
  // The tangent follows the bound while it is being dragged, and rests at the
  // committed tangent position (the mode after a shape change) otherwise.
  const tangentX = clamp(draggingBound || draft?.b !== undefined ? bound : (object.showTangentAt ?? mode), xMin, xMax)
  const tangentY = gammaDensity(tangentX, shape)
  const epsilon = Math.max(0.001, (xMax - xMin) / 600)
  const slope = (gammaDensity(tangentX + epsilon, shape) - gammaDensity(Math.max(0, tangentX - epsilon), shape)) / (2 * epsilon)
  const tangentSpan = (xMax - xMin) * 0.14
  const tangentA = Math.max(xMin, tangentX - tangentSpan)
  const tangentB = Math.min(xMax, tangentX + tangentSpan)
  const binCuts = [edges[1], edges[2]]

  const commit = (summary: string, next: { a?: number; b?: number }) => {
    const a = clamp(next.a ?? committedShape, 0.5, 10)
    const b = clamp(next.b ?? committedBound, xMin, xMax)
    const changedShape = next.a !== undefined && Math.abs(a - committedShape) > 1e-9
    const changedBound = next.b !== undefined && Math.abs(b - committedBound) > 1e-9
    setDraft(null)
    if (!changedShape && !changedBound) return
    run(humanPut(summary, {
      ...object,
      parameters: { ...object.parameters, a, b },
      shadeIntegral: [0, b],
      showTangentAt: changedShape ? Math.max(0, a - 1) : b,
    }))
  }

  const boundFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return bound
    const scale = width / Math.max(1, rect.width)
    const localX = (event.clientX - rect.left) * scale
    return clamp(xMin + ((localX - plot.left) / (plot.right - plot.left)) * (xMax - xMin), xMin, xMax)
  }
  const beginBoundDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation(); svgRef.current?.setPointerCapture(event.pointerId)
    setDraggingBound(true)
    setDraft({ b: committedBound })
  }
  const moveBound = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingBound) return
    event.preventDefault(); event.stopPropagation()
    setDraft({ b: Number(boundFromPointer(event).toFixed(2)) })
  }
  const endBound = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingBound) return
    event.preventDefault(); event.stopPropagation(); setDraggingBound(false)
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    commit(`Moved the CDF bound b to ${short(Number(boundFromPointer(event).toFixed(2)))}`, { b: Number(boundFromPointer(event).toFixed(2)) })
  }
  const clipId = `gamma-clip-${object.id}`
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  return (
    <section className={`gamma-probability-view${draggingBound ? ' is-dragging' : ''}`} onPointerDown={stop}>
      <svg
        ref={svgRef}
        className="gamma-probability-canvas"
        viewBox={`0 0 ${width} ${plotHeight}`}
        aria-label="Normalized Gamma density, CDF bound and three probability bins"
        onPointerMove={moveBound}
        onPointerUp={endBound}
        onPointerCancel={endBound}
      >
        <defs><clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} /></clipPath></defs>
        <rect className="gamma-paper" width={width} height={plotHeight} />
        <text className="gamma-kicker" x="16" y="18">NORMALIZED GAMMA DENSITY · TOTAL AREA 1</text>
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: 9 }, (_, index) => {
            const x = xMin + ((xMax - xMin) * index) / 8
            return <line key={`x-${index}`} className="gamma-grid" x1={mapX(x)} x2={mapX(x)} y1={plot.top} y2={plot.bottom} />
          })}
          <path className="gamma-area" d={shade} />
          {binCuts.map((cut, index) => (
            <line key={`cut-${index}`} className="gamma-bin-cut" x1={mapX(cut)} x2={mapX(cut)} y1={plot.top + 10} y2={plot.bottom} />
          ))}
          <path className="gamma-curve" d={curve} />
          <line className="gamma-tangent" x1={mapX(tangentA)} y1={mapY(tangentY + slope * (tangentA - tangentX))} x2={mapX(tangentB)} y2={mapY(tangentY + slope * (tangentB - tangentX))} />
          <line className="gamma-bound" x1={mapX(bound)} x2={mapX(bound)} y1={plot.top} y2={plot.bottom} />
          <circle className="gamma-mode" cx={mapX(mode)} cy={mapY(gammaDensity(mode, shape))} r="4" />
          <circle
            className="gamma-bound-handle"
            data-demo-target="gamma-bound-handle"
            cx={mapX(bound)}
            cy={mapY(gammaDensity(bound, shape))}
            r="8"
            onPointerDown={beginBoundDrag}
            aria-label="Drag CDF bound"
          />
        </g>
        <line className="gamma-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} />
        {[0, 4, 8, 12, 16].filter((tick) => tick >= xMin && tick <= xMax).map((tick) => (
          <text key={tick} className="gamma-label" x={mapX(tick)} y={plot.bottom + 16} textAnchor="middle">{tick}</text>
        ))}
        {masses.map((mass, index) => {
          const left = index === 0 ? xMin : edges[index]
          const right = index === 2 ? xMax : edges[index + 1]
          return (
            <text key={BIN_LABELS[index]} className="gamma-bin-label" x={mapX((left + right) / 2)} y={plot.top + 12} textAnchor="middle">
              {BIN_LABELS[index]} = {fmt(mass)}
            </text>
          )
        })}
        <text className="gamma-cdf-label" x={mapX(bound) + (bound > (xMin + xMax) * 0.62 ? -10 : 10)} y={plot.top + 32} textAnchor={bound > (xMin + xMax) * 0.62 ? 'end' : 'start'}>
          P(X ≤ {short(bound)}) = {fmt(cdf)}
        </text>
        <text className="gamma-mode-label" x={mapX(mode) + 8} y={mapY(gammaDensity(mode, shape)) - 9}>mode a − 1 = {short(mode)}</text>
      </svg>

      <div className="gamma-probability-band">
        <div className="gamma-probability-controls" onPointerDown={stop}>
          <div className="gamma-probability-formula"><Tex latex={'g_a(x)=\\dfrac{x^{a-1}e^{-x}}{\\Gamma(a)}'} /></div>
          <label>
            <span>shape a <b>{short(shape)}</b></span>
            <input
              type="range" min="0.5" max="10" step="0.1" value={shape} aria-label="Gamma shape a" data-demo-target="gamma-shape"
              onChange={(event) => setDraft({ a: Number(event.target.value) })}
              onPointerUp={() => commit(`Changed the shape a to ${short(shape)}`, { a: shape })}
              onKeyUp={() => commit(`Changed the shape a to ${short(shape)}`, { a: shape })}
              onBlur={() => { if (draft?.a !== undefined) commit(`Changed the shape a to ${short(shape)}`, { a: shape }) }}
            />
          </label>
          <label>
            <span>bound b <b>{short(bound)}</b></span>
            <input
              type="range" min={xMin} max={xMax} step="0.05" value={bound} aria-label="Gamma CDF bound b" data-demo-target="gamma-bound"
              onChange={(event) => setDraft({ b: Number(event.target.value) })}
              onPointerUp={() => commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound })}
              onKeyUp={() => commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound })}
              onBlur={() => { if (draft?.b !== undefined) commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound }) }}
            />
          </label>
          <small>Γ({short(shape, 1)}) = {fmt(gammaValue, 4)}</small>
        </div>

        <table className="gamma-bridge-table" aria-label="Probability masses, log masses and softmax">
          <thead>
            <tr>
              <th scope="col" />
              {masses.map((_, index) => {
                const left = index === 0 ? 0 : edges[index]
                const rightLabel = index === 2 ? '∞' : short(edges[index + 1])
                return <th scope="col" key={BIN_LABELS[index]}><b>{BIN_LABELS[index]}</b><small>[{short(left)}, {rightLabel})</small></th>
              })}
              <th scope="col"><b>Σ</b></th>
            </tr>
          </thead>
          <tbody>
            <tr className="is-mass" data-hero-path="mass">
              <th scope="row">probability mass</th>
              {bridge.masses.map((mass, index) => <td key={index}>{fmt(mass)}</td>)}
              <td className="gamma-sum">{fmt(bridge.masses.reduce((sum, mass) => sum + mass, 0))}</td>
            </tr>
            <tr className="is-log">
              <th scope="row">log mass ℓⱼ</th>
              {bridge.logs.map((value, index) => <td key={index}>{fmt(value)}</td>)}
              <td />
            </tr>
            <tr className="is-softmax">
              <th scope="row">softmax(ℓ)ⱼ</th>
              {bridge.probabilities.map((probability, index) => <td key={index}>{fmt(probability)}</td>)}
              <td className="gamma-sum">{fmt(bridge.probabilities.reduce((sum, probability) => sum + probability, 0))}</td>
            </tr>
          </tbody>
        </table>

        <div className="gamma-bridge-note">
          <b>the final bin owns the tail</b>
          <span>w₃ = 1 − w₁ − w₂, so the displayed masses sum to exactly one.</span>
          <em>log-masses are the logits the attention head starts from; softmax returns the same masses.</em>
        </div>
      </div>
    </section>
  )
}
