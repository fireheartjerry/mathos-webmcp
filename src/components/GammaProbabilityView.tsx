'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { gammaBinMasses, gammaCDF, gammaDensity, gammaFunction } from '../domain/math/probability'
import type { GraphObject, WorldAction } from '../domain/world/types'
import { Tex } from './Tex'

type Props = { object: GraphObject; run: (action: WorldAction) => void }

const humanPut = (summary: string, object: GraphObject): WorldAction => ({
  id: crypto.randomUUID(), source: 'human', summary, operations: [{ type: 'put', object }],
})
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const fmt = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()
const edgeLabel = (value: number) => Number.isFinite(value) ? fmt(value, 2) : '∞'

export default function GammaProbabilityView({ object, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingBound, setDraggingBound] = useState(false)
  const width = Math.max(360, object.bounds.width)
  const height = Math.max(240, object.bounds.height)
  const plot = { left: 42, top: 34, right: width - 18, bottom: height - 120 }
  const [xMin, rawXMax] = object.xDomain
  const xMax = Math.max(xMin + 1, rawXMax)
  const [yMin, rawYMax] = object.yDomain
  const yMax = Math.max(yMin + 0.01, rawYMax)
  const shape = clamp(object.parameters?.a ?? object.parameters?.shape ?? 4.5, 0.35, 12)
  const bound = clamp(object.parameters?.b ?? object.shadeIntegral?.[1] ?? shape + 1, xMin, xMax)
  const edges = object.binEdges ?? [0, shape * 0.7, shape * 1.35, Number.POSITIVE_INFINITY]
  const masses = useMemo(() => gammaBinMasses(shape, edges), [shape, edges[0], edges[1], edges[2], edges[3]])
  const cdf = gammaCDF(bound, shape)
  const peakX = Math.max(0, (shape - 1))
  const samples = useMemo(() => Array.from({ length: 100 }, (_, index) => {
    const x = xMin + ((xMax - xMin) * index) / 99
    return { x, y: gammaDensity(x, shape) }
  }), [shape, xMin, xMax])
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)
  const curve = samples.map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')
  const shadeSamples = useMemo(() => Array.from({ length: 44 }, (_, index) => {
    const x = xMin + ((bound - xMin) * index) / 43
    return { x, y: gammaDensity(x, shape) }
  }), [bound, shape, xMin])
  const shade = shadeSamples.length > 1
    ? `M ${mapX(xMin)} ${mapY(0)} ${shadeSamples.map((point) => `L ${mapX(point.x)} ${mapY(point.y)}`).join(' ')} L ${mapX(bound)} ${mapY(0)} Z`
    : ''
  const tangentX = clamp(object.showTangentAt ?? peakX, xMin, xMax)
  const tangentY = gammaDensity(tangentX, shape)
  const epsilon = Math.max(0.001, (xMax - xMin) / 500)
  const slope = (gammaDensity(tangentX + epsilon, shape) - gammaDensity(Math.max(0, tangentX - epsilon), shape)) / (2 * epsilon)
  const tangentSpan = (xMax - xMin) * 0.15
  const tangentA = Math.max(xMin, tangentX - tangentSpan)
  const tangentB = Math.min(xMax, tangentX + tangentSpan)
  const update = (summary: string, patch: Partial<GraphObject>) => run(humanPut(summary, { ...object, ...patch }))
  const updateParameter = (name: string, value: number) => update(`Changed Gamma ${name}`, { parameters: { ...object.parameters, [name]: value } })
  const boundFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return bound
    return clamp(xMin + ((event.clientX - rect.left) / Math.max(1, rect.width)) * (xMax - xMin), xMin, xMax)
  }
  const beginBoundDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation(); svgRef.current?.setPointerCapture(event.pointerId)
    setDraggingBound(true)
  }
  const moveBound = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingBound) return
    event.preventDefault(); event.stopPropagation()
    updateParameter('b', Number(boundFromPointer(event).toFixed(2)))
  }
  const endBound = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingBound) return
    event.preventDefault(); event.stopPropagation(); setDraggingBound(false)
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
  }
  const clipId = `gamma-clip-${object.id}`

  return (
    <section className="gamma-probability-view" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
      <svg ref={svgRef} className="gamma-probability-canvas" viewBox={`0 0 ${width} ${height - 96}`} aria-label="Normalized Gamma density and CDF" onPointerMove={moveBound} onPointerUp={endBound} onPointerCancel={endBound}>
        <defs><clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} /></clipPath></defs>
        <rect className="gamma-paper" width={width} height={height - 96} rx="8" />
        <text className="gamma-kicker" x="16" y="21">NORMALIZED GAMMA DENSITY</text>
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: 8 }, (_, index) => {
            const x = xMin + ((xMax - xMin) * index) / 7
            return <line key={`x-${index}`} className="gamma-grid" x1={mapX(x)} x2={mapX(x)} y1={plot.top} y2={plot.bottom} />
          })}
          <line className="gamma-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} />
          {shade && <path className="gamma-area" d={shade} />}
          <path className="gamma-curve" d={curve} />
          <line className="gamma-tangent" x1={mapX(tangentA)} y1={mapY(tangentY + slope * (tangentA - tangentX))} x2={mapX(tangentB)} y2={mapY(tangentY + slope * (tangentB - tangentX))} />
          <line className="gamma-bound" x1={mapX(bound)} x2={mapX(bound)} y1={plot.top} y2={plot.bottom} />
          <circle className="gamma-mode" cx={mapX(peakX)} cy={mapY(gammaDensity(peakX, shape))} r="4" />
          <circle className="gamma-bound-handle" cx={mapX(bound)} cy={mapY(gammaDensity(bound, shape))} r="7" onPointerDown={beginBoundDrag} aria-label="Drag CDF bound" />
        </g>
        <text className="gamma-label" x={plot.left} y={plot.bottom + 18}>{xMin}</text>
        <text className="gamma-label" x={plot.right} y={plot.bottom + 18} textAnchor="end">{xMax}</text>
        <text className="gamma-cdf-label" x={plot.right - 6} y={plot.top + 15} textAnchor="end">P(X ≤ {fmt(bound, 2)}) = {fmt(cdf)}</text>
        <text className="gamma-mode-label" x={mapX(peakX) + 8} y={mapY(gammaDensity(peakX, shape)) - 8}>mode {fmt(peakX, 2)}</text>
      </svg>
      <div className="gamma-probability-formula"><Tex latex={`g_a(x)=\\frac{x^{a-1}e^{-x}}{\\Gamma(a)}`} /><span>Γ({fmt(shape, 1)}) = {fmt(gammaFunction(shape), 4)}</span></div>
      <div className="gamma-probability-controls" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
        <label><span>shape a <b>{fmt(shape, 2)}</b></span><input type="range" min="0.5" max="10" step="0.1" value={shape} aria-label="Gamma shape" onChange={(event) => updateParameter('a', Number(event.target.value))} /></label>
        <label><span>bound b <b>{fmt(bound, 2)}</b></span><input type="range" min={xMin} max={xMax} step="0.05" value={bound} aria-label="Gamma CDF bound" onChange={(event) => updateParameter('b', Number(event.target.value))} /></label>
      </div>
      <div className="gamma-bin-strip" aria-label="Gamma probability bins">
        {masses.map((mass, index) => <div className={`gamma-bin gamma-bin-${index + 1}`} key={index}><small>w{index + 1}</small><b>{fmt(mass)}</b><em>[{edgeLabel(edges[index])}, {edgeLabel(edges[index + 1])}]</em><span>{fmt(mass * 100, 1)}% of total area</span></div>)}
        <strong>Σ w = {fmt(masses.reduce((sum, mass) => sum + mass, 0))}</strong>
      </div>
      <div className="gamma-bridge-note"><span>partitioned area</span><b>Σ</b><span>total mass = 1</span><em>each bin is an exact definite integral</em></div>
    </section>
  )
}
