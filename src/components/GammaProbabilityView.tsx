'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { gammaBinMasses, gammaCDF, gammaDensity, gammaFunction, massesToSoftmax } from '../domain/math/probability'
import { monoWidth, placeLabel, type LabelBox } from '../domain/math/graph'
import type { GraphObject, WorldAction } from '../domain/world/types'
import { revealDash, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumber, useTweenedNumbers } from './useTweenedNumber'
import { Tex } from './Tex'
import '../styles/graph.css'
import '../styles/reveal.css'

type Props = { object: GraphObject; run: (action: WorldAction) => void }

const humanPut = (summary: string, object: GraphObject): WorldAction => ({
  id: crypto.randomUUID(), source: 'human', summary, operations: [{ type: 'put', object }],
})
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const BIN_LABELS = ['w₁', 'w₂', 'w₃']
const DENSITY_LATEX = 'g_a(x)=\\dfrac{x^{a-1}e^{-x}}{\\Gamma(a)}'
const SHAPE_RANGE: [number, number] = [0.5, 10]
const GLIDE_MS = 240
const FLASH_MS = 600
const LOCAL_COMMIT_WINDOW_MS = 1500
/** Smallest gap kept between neighbouring bin edges, in x units. */
const EDGE_GAP = 0.2

/** Layout size of the plot box, unaffected by the stage's zoom transform. */
function usePlotSize(fallback: { width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(fallback)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0 && rect.height > 0) {
        setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return { ref, size }
}

/** Fields that changed without a local commit announced through `local` flash for FLASH_MS. */
function useAgentFlashes(keys: Record<string, string>, local: RefObject<Map<string, number>>): Record<string, boolean> {
  const [active, setActive] = useState<Record<string, boolean>>({})
  const previous = useRef<Record<string, string> | null>(null)
  const timers = useRef<number[]>([])
  const serial = JSON.stringify(keys)
  useEffect(() => {
    const before = previous.current
    previous.current = keys
    if (!before) return
    const changed: string[] = []
    for (const [field, value] of Object.entries(keys)) {
      if (before[field] === value) continue
      const stamp = local.current?.get(field)
      if (stamp !== undefined) {
        local.current?.delete(field)
        if (performance.now() - stamp < LOCAL_COMMIT_WINDOW_MS) continue
      }
      changed.push(field)
    }
    if (changed.length === 0) return
    setActive((current) => ({ ...current, ...Object.fromEntries(changed.map((field) => [field, true])) }))
    timers.current.push(window.setTimeout(() => {
      setActive((current) => {
        const next = { ...current }
        for (const field of changed) delete next[field]
        return next
      })
    }, FLASH_MS))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial])
  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)) }, [])
  return active
}

/** A number that commits on Enter or blur; Escape restores the committed value. */
function NumberField({ value, label, onCommit, min, max, step = 0.05, demoTarget }: {
  value: number
  label: string
  onCommit: (next: number) => void
  min?: number
  max?: number
  step?: number
  demoTarget?: string
}) {
  const [text, setText] = useState(short(value))
  useEffect(() => { setText(short(value)) }, [value])
  const commit = () => {
    const parsed = Number(text)
    if (text.trim() === '' || !Number.isFinite(parsed)) { setText(short(value)); return }
    const next = clamp(parsed, min ?? -Infinity, max ?? Infinity)
    if (Math.abs(next - value) < 1e-9) setText(short(value))
    else onCommit(next)
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() }
    else if (event.key === 'Escape') { event.preventDefault(); setText(short(value)); event.currentTarget.blur() }
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      className="graph-number is-small"
      aria-label={label}
      data-demo-target={demoTarget}
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  )
}

type PlotDrag = { kind: 'bound'; pointerId: number } | { kind: 'edge'; index: 1 | 2; pointerId: number }

/**
 * The Gamma density as a living area. Inverse controls: the CDF bound `b`
 * (handle on the curve, slider, field), the shape `a` (slider, field) and the
 * two interior bin edges (dragged on the plot). Pointer drags preview locally
 * and commit one world action on release, so a gesture is one history row.
 *
 * Header (kicker + title + typeset density), plot, then a two-column footer:
 * the controls on the left, the mass → log → softmax bridge on the right.
 */
export default function GammaProbabilityView({ object, run }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ a?: number; b?: number } | null>(null)
  const [edgeDraft, setEdgeDraft] = useState<[number, number] | null>(null)
  const dragRef = useRef<PlotDrag | null>(null)
  const [dragging, setDragging] = useState<PlotDrag['kind'] | null>(null)
  const draggingBound = dragging === 'bound'
  const { ref: plotRef, size } = usePlotSize({
    width: Math.max(420, object.bounds.width),
    height: Math.max(120, object.bounds.height - 200),
  })
  const width = size.width
  const plotHeight = size.height
  const plot = { left: 46, top: 10, right: width - 18, bottom: plotHeight - 20 }
  const plotBox: LabelBox = { x: plot.left, y: plot.top, width: Math.max(0, plot.right - plot.left), height: Math.max(0, plot.bottom - plot.top) }
  const [xMin, rawXMax] = object.xDomain
  const xMax = Math.max(xMin + 1, rawXMax)
  const [yMin, rawYMax] = object.yDomain
  const yMax = Math.max(yMin + 0.01, rawYMax)
  const committedShape = clamp(object.parameters?.a ?? 4.5, SHAPE_RANGE[0], SHAPE_RANGE[1])
  const committedBound = clamp(object.parameters?.b ?? object.shadeIntegral?.[1] ?? committedShape + 1, xMin, xMax)
  const shape = clamp(draft?.a ?? committedShape, SHAPE_RANGE[0], SHAPE_RANGE[1])
  const bound = clamp(draft?.b ?? committedBound, xMin, xMax)
  const committedEdges: [number, number, number, number] = object.binEdges ?? [0, committedShape * 0.7, committedShape * 1.35, xMax]
  const edges: [number, number, number, number] = edgeDraft ? [committedEdges[0], edgeDraft[0], edgeDraft[1], committedEdges[3]] : committedEdges
  const masses = useMemo(() => gammaBinMasses(shape, edges), [shape, edges[0], edges[1], edges[2], edges[3]])
  const cdf = gammaCDF(bound, shape)
  const mode = Math.max(0, shape - 1)
  const gammaValue = gammaFunction(shape)

  // Fields this widget committed itself; their arrival is not replayed as an agent flash.
  const localCommits = useRef(new Map<string, number>())
  const flashes = useAgentFlashes({
    a: String(committedShape),
    b: String(committedBound),
    edges: committedEdges.join(','),
  }, localCommits)

  // ---- display tweens: the drawn shape, bound, cuts and masses glide --------
  const snap = dragging !== null || draft !== null
  const drawnShape = useTweenedNumber(shape, snap ? 0 : GLIDE_MS)
  const drawnBound = useTweenedNumber(bound, snap ? 0 : GLIDE_MS)
  const [drawnCut1, drawnCut2] = useTweenedNumbers([edges[1], edges[2]], dragging === 'edge' ? 0 : GLIDE_MS)
  const shownMasses = useTweenedNumbers(masses, GLIDE_MS)
  const bridge = useMemo(() => massesToSoftmax(shownMasses), [shownMasses])
  const shownCdf = useTweenedNumber(cdf, snap ? 0 : GLIDE_MS)
  const shownGamma = useTweenedNumber(gammaValue, GLIDE_MS)

  const samples = useMemo(() => Array.from({ length: 120 }, (_, index) => {
    const x = xMin + ((xMax - xMin) * index) / 119
    return { x, y: gammaDensity(x, drawnShape) }
  }), [drawnShape, xMin, xMax])
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)
  const curve = samples.map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')
  const shadeSamples = useMemo(() => Array.from({ length: 56 }, (_, index) => {
    const x = xMin + ((drawnBound - xMin) * index) / 55
    return { x, y: gammaDensity(x, drawnShape) }
  }), [drawnBound, drawnShape, xMin])
  const shade = `M ${mapX(xMin)} ${mapY(0)} ${shadeSamples.map((point) => `L ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')} L ${mapX(drawnBound)} ${mapY(0)} Z`
  // The tangent follows the bound while it is being dragged, and rests at the
  // committed tangent position (the mode after a shape change) otherwise.
  const tangentTarget = clamp(draggingBound || draft?.b !== undefined ? bound : (object.showTangentAt ?? mode), xMin, xMax)
  const tangentX = useTweenedNumber(tangentTarget, snap ? 0 : GLIDE_MS)
  const tangentY = gammaDensity(tangentX, drawnShape)
  const epsilon = Math.max(0.001, (xMax - xMin) / 600)
  const slope = (gammaDensity(tangentX + epsilon, drawnShape) - gammaDensity(Math.max(0, tangentX - epsilon), drawnShape)) / (2 * epsilon)
  const tangentSpan = (xMax - xMin) * 0.14
  const tangentA = Math.max(xMin, tangentX - tangentSpan)
  const tangentB = Math.min(xMax, tangentX + tangentSpan)
  const drawnMode = Math.max(0, drawnShape - 1)
  const binCuts = [drawnCut1, drawnCut2]

  const commit = (summary: string, next: { a?: number; b?: number }) => {
    const a = clamp(next.a ?? committedShape, SHAPE_RANGE[0], SHAPE_RANGE[1])
    const b = clamp(next.b ?? committedBound, xMin, xMax)
    const changedShape = next.a !== undefined && Math.abs(a - committedShape) > 1e-9
    const changedBound = next.b !== undefined && Math.abs(b - committedBound) > 1e-9
    setDraft(null)
    if (!changedShape && !changedBound) return
    if (changedShape) localCommits.current.set('a', performance.now())
    if (changedBound) localCommits.current.set('b', performance.now())
    run(humanPut(summary, {
      ...object,
      parameters: { ...object.parameters, a, b },
      shadeIntegral: [0, b],
      showTangentAt: changedShape ? Math.max(0, a - 1) : b,
    }))
  }
  const commitEdges = (cuts: [number, number]) => {
    setEdgeDraft(null)
    if (Math.abs(cuts[0] - committedEdges[1]) < 1e-9 && Math.abs(cuts[1] - committedEdges[2]) < 1e-9) return
    const moved = Math.abs(cuts[0] - committedEdges[1]) >= Math.abs(cuts[1] - committedEdges[2]) ? cuts[0] : cuts[1]
    localCommits.current.set('edges', performance.now())
    run(humanPut(`Moved a bin edge to ${short(moved)}`, {
      ...object,
      binEdges: [committedEdges[0], cuts[0], cuts[1], committedEdges[3]],
    }))
  }

  const xFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return bound
    const scale = width / Math.max(1, rect.width)
    const localX = (event.clientX - rect.left) * scale
    return clamp(xMin + ((localX - plot.left) / (plot.right - plot.left)) * (xMax - xMin), xMin, xMax)
  }
  const beginDrag = (event: ReactPointerEvent<SVGElement>, drag: PlotDrag) => {
    if (event.button !== 0) return
    event.preventDefault(); event.stopPropagation()
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* capture unavailable */ }
    dragRef.current = drag
    setDragging(drag.kind)
    if (drag.kind === 'bound') setDraft({ b: committedBound })
    else setEdgeDraft([committedEdges[1], committedEdges[2]])
  }
  const cutsFromPointer = (event: ReactPointerEvent<SVGSVGElement>, index: 1 | 2): [number, number] => {
    const current = edgeDraft ?? [committedEdges[1], committedEdges[2]]
    const x = Number(xFromPointer(event).toFixed(2))
    return index === 1
      ? [clamp(x, xMin + EDGE_GAP, current[1] - EDGE_GAP), current[1]]
      : [current[0], clamp(x, current[0] + EDGE_GAP, xMax - EDGE_GAP)]
  }
  const movePlot = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    if (drag.kind === 'bound') setDraft({ b: Number(xFromPointer(event).toFixed(2)) })
    else setEdgeDraft(cutsFromPointer(event, drag.index))
  }
  const endPlot = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    event.preventDefault(); event.stopPropagation(); setDragging(null)
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    if (drag.kind === 'bound') {
      const b = Number(xFromPointer(event).toFixed(2))
      commit(`Moved the CDF bound b to ${short(b)}`, { b })
    } else {
      commitEdges(cutsFromPointer(event, drag.index))
    }
  }
  const clipId = `gamma-clip-${object.id}`
  const areaClipId = `gamma-area-clip-${object.id}`
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  // ---- staged reveal: axes/grid → curve → shaded area → bins and counting labels --
  const p = revealProgress(object)
  const revealing = p < 1
  const chromeT = revealStage(p, 0, 0.2)
  const axesT = revealStage(p, 0, 0.25)
  const curveT = revealStage(p, 0.25, 0.65)
  const areaT = revealStage(p, 0.65, 0.85)
  const finalT = revealStage(p, 0.85, 1)
  const binCutTop = plot.top + 10

  // ---- label placement: bin labels along the top, the CDF label finds a free
  // spot beside the bound, the mode label sits under the peak. All boxes are
  // measured from the mono metrics and kept inside the plot rectangle.
  const binLabelY = plot.top + 12
  const binLabels = shownMasses.map((mass, index) => {
    const left = index === 0 ? xMin : binCuts[index - 1]
    const right = index === 2 ? xMax : binCuts[index]
    const text = `${BIN_LABELS[index]} = ${fmt(mass * finalT)}`
    const textWidth = monoWidth(text, 11)
    const centre = clamp(mapX((left + right) / 2), plot.left + textWidth / 2 + 2, plot.right - textWidth / 2 - 2)
    return { text, x: centre, box: { x: centre - textWidth / 2, y: binLabelY - 10, width: textWidth, height: 12 } as LabelBox }
  })
  const cdfText = `P(X ≤ ${short(bound)}) = ${fmt(shownCdf * finalT)}`
  const cdfWidth = monoWidth(cdfText, 13)
  const boundPx = mapX(drawnBound)
  const cdfCandidates: LabelBox[] = [
    { x: boundPx + 10, y: plot.top + 22, width: cdfWidth, height: 14 },
    { x: boundPx - 10 - cdfWidth, y: plot.top + 22, width: cdfWidth, height: 14 },
    { x: boundPx + 10, y: plot.top + 40, width: cdfWidth, height: 14 },
    { x: boundPx - 10 - cdfWidth, y: plot.top + 40, width: cdfWidth, height: 14 },
    { x: boundPx + 10, y: plot.top + 58, width: cdfWidth, height: 14 },
    { x: boundPx - 10 - cdfWidth, y: plot.top + 58, width: cdfWidth, height: 14 },
  ]
  const cdfBox = placeLabel(cdfCandidates, binLabels.map((label) => label.box), plotBox)
  const modeText = `mode a − 1 = ${short(mode)}`
  const modeWidth = monoWidth(modeText, 11)
  const modePx = mapX(drawnMode)
  const modePeakY = mapY(gammaDensity(drawnMode, drawnShape))
  const modeCandidates: LabelBox[] = [
    { x: modePx + 8, y: Math.max(plot.top + 46, modePeakY - 20), width: modeWidth, height: 12 },
    { x: modePx - 8 - modeWidth, y: Math.max(plot.top + 46, modePeakY - 20), width: modeWidth, height: 12 },
    { x: modePx + 8, y: Math.min(plot.bottom - 14, modePeakY + 12), width: modeWidth, height: 12 },
    { x: modePx - 8 - modeWidth, y: Math.min(plot.bottom - 14, modePeakY + 12), width: modeWidth, height: 12 },
  ]
  const modeBox = placeLabel(modeCandidates, [...binLabels.map((label) => label.box), cdfBox], plotBox)

  const shapeField = (next: number) => commit(`Changed the shape a to ${short(next)}`, { a: next })
  const boundField = (next: number) => commit(`Moved the CDF bound b to ${short(next)}`, { b: next })
  const sumOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0)

  return (
    <section
      className={`gamma-probability-view gamma-widget reveal-root${draggingBound ? ' is-dragging' : ''}${dragging === 'edge' ? ' is-dragging-edge' : ''}${revealing ? ' is-revealing' : ''}`}
      onPointerDown={stop}
      style={revealing ? { opacity: object.opacity } : undefined}
    >
      <header className="gamma-header reveal-fade" style={{ opacity: chromeT }}>
        <div className="gamma-header-title">
          <span className="graph-widget-kicker gamma-kicker-text">normalised gamma density · total area 1</span>
          <h3>Gamma density <span className="gamma-title-meta">a = {short(shape)} · b = {short(bound)}</span></h3>
        </div>
        <div className="gamma-header-equation">
          <Tex latex={DENSITY_LATEX} ariaLabel="g sub a of x equals x to the a minus one times e to the minus x, over Gamma of a" />
        </div>
      </header>

      <div className="gamma-plot" ref={plotRef}>
        <svg
          ref={svgRef}
          className="gamma-probability-canvas"
          viewBox={`0 0 ${width} ${plotHeight}`}
          aria-label="Normalized Gamma density, CDF bound and three probability bins"
          onPointerMove={movePlot}
          onPointerUp={endPlot}
          onPointerCancel={endPlot}
        >
          <defs>
            <clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plotBox.width} height={plotBox.height} /></clipPath>
            <clipPath id={areaClipId}><rect x={plot.left} y={plot.top} width={plotBox.width * areaT} height={plotBox.height} /></clipPath>
          </defs>
          <rect className="gamma-paper" width={width} height={plotHeight} />
          <g clipPath={`url(#${clipId})`}>
            {Array.from({ length: 9 }, (_, index) => {
              const x = xMin + ((xMax - xMin) * index) / 8
              return <line key={`x-${index}`} className="gamma-grid" x1={mapX(x)} x2={mapX(x)} y1={plot.bottom} y2={plot.top} pathLength={1} style={revealDash(axesT)} />
            })}
            {areaT > 0 && <g clipPath={`url(#${areaClipId})`}><path className={`gamma-area${flashes.b ? ' is-flash' : ''}`} d={shade} /></g>}
            {finalT > 0 && binCuts.map((cut, index) => (
              <g key={`cut-${index}`} className={`gamma-bin-edge${flashes.edges ? ' is-flash' : ''}${dragging === 'edge' ? ' is-dragging' : ''}`}>
                <line className="gamma-bin-cut" x1={mapX(cut)} x2={mapX(cut)} y1={plot.bottom - (plot.bottom - binCutTop) * finalT} y2={plot.bottom} />
                <rect
                  className="gamma-bin-grip"
                  x={mapX(cut) - 7}
                  y={binCutTop}
                  width={14}
                  height={Math.max(0, plot.bottom - binCutTop)}
                  role="slider"
                  aria-label={`Bin edge ${index + 1}`}
                  aria-valuenow={edges[index + 1]}
                  onPointerDown={(event) => beginDrag(event, { kind: 'edge', index: (index + 1) as 1 | 2, pointerId: event.pointerId })}
                />
                <circle className="gamma-bin-handle" cx={mapX(cut)} cy={plot.bottom - 6} r="3.5" />
              </g>
            ))}
            {curveT > 0 && <path className={`gamma-curve${flashes.a ? ' is-flash' : ''}`} d={curve} pathLength={1} style={revealDash(curveT)} />}
            <g style={{ opacity: finalT }}>
              <line className="gamma-tangent" x1={mapX(tangentA)} y1={mapY(tangentY + slope * (tangentA - tangentX))} x2={mapX(tangentB)} y2={mapY(tangentY + slope * (tangentB - tangentX))} />
              <line className="gamma-bound" x1={boundPx} x2={boundPx} y1={plot.top} y2={plot.bottom} />
              <circle className="gamma-mode" cx={modePx} cy={modePeakY} r="4" />
              <circle
                className={`gamma-bound-handle${flashes.b ? ' is-flash' : ''}`}
                data-demo-target="gamma-bound-handle"
                cx={boundPx}
                cy={mapY(gammaDensity(drawnBound, drawnShape))}
                r="8"
                onPointerDown={(event) => beginDrag(event, { kind: 'bound', pointerId: event.pointerId })}
                aria-label="Drag CDF bound"
              />
              {binLabels.map((label, index) => (
                <text key={BIN_LABELS[index]} className="gamma-bin-label" x={label.x} y={binLabelY} textAnchor="middle">{label.text}</text>
              ))}
              <text className="gamma-cdf-label" x={cdfBox.x} y={cdfBox.y + 11} textAnchor="start">{cdfText}</text>
              <text className="gamma-mode-label" x={modeBox.x} y={modeBox.y + 10} textAnchor="start">{modeText}</text>
            </g>
          </g>
          <line className="gamma-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} pathLength={1} style={revealDash(axesT)} />
          <g style={{ opacity: axesT }}>
            {[0, 4, 8, 12, 16].filter((tick) => tick >= xMin && tick <= xMax).map((tick) => (
              <text key={tick} className="gamma-label" x={mapX(tick)} y={plot.bottom + 14} textAnchor="middle">{tick}</text>
            ))}
          </g>
        </svg>
      </div>

      <footer className="gamma-footer reveal-fade" style={{ opacity: chromeT }}>
        <div className="gamma-probability-controls" onPointerDown={stop}>
          <label className={flashes.a ? 'is-flash' : undefined}>
            <span>shape a <NumberField label="Gamma shape a value" value={committedShape} min={SHAPE_RANGE[0]} max={SHAPE_RANGE[1]} step={0.1} onCommit={shapeField} /></span>
            <input
              type="range" min={SHAPE_RANGE[0]} max={SHAPE_RANGE[1]} step="0.1" value={shape} aria-label="Gamma shape a" data-demo-target="gamma-shape"
              onChange={(event) => setDraft({ a: Number(event.target.value) })}
              onPointerUp={() => commit(`Changed the shape a to ${short(shape)}`, { a: shape })}
              onKeyUp={() => commit(`Changed the shape a to ${short(shape)}`, { a: shape })}
              onBlur={() => { if (draft?.a !== undefined) commit(`Changed the shape a to ${short(shape)}`, { a: shape }) }}
            />
          </label>
          <label className={flashes.b ? 'is-flash' : undefined}>
            <span>bound b <NumberField label="Gamma CDF bound b value" value={committedBound} min={xMin} max={xMax} step={0.05} onCommit={boundField} /></span>
            <input
              type="range" min={xMin} max={xMax} step="0.05" value={bound} aria-label="Gamma CDF bound b" data-demo-target="gamma-bound"
              onChange={(event) => setDraft({ b: Number(event.target.value) })}
              onPointerUp={() => commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound })}
              onKeyUp={() => commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound })}
              onBlur={() => { if (draft?.b !== undefined) commit(`Moved the CDF bound b to ${short(bound)}`, { b: bound }) }}
            />
          </label>
          <small>Γ({short(shape, 1)}) = {fmt(shownGamma, 4)} · edges {short(edges[1])}, {short(edges[2])}</small>
        </div>

        <div className="gamma-bridge">
          <table className="gamma-bridge-table" aria-label="Probability masses, log masses and softmax">
            <thead>
              <tr>
                <th scope="col" />
                {masses.map((_, index) => {
                  const left = index === 0 ? 0 : edges[index]
                  const rightLabel = index === 2 ? '∞' : short(edges[index + 1])
                  return <th scope="col" key={BIN_LABELS[index]} className={flashes.edges ? 'is-flash' : undefined}><b>{BIN_LABELS[index]}</b><small>[{short(left)}, {rightLabel})</small></th>
                })}
                <th scope="col"><b>Σ</b></th>
              </tr>
            </thead>
            <tbody>
              <tr className="is-mass" data-hero-path="mass">
                <th scope="row">probability mass</th>
                {bridge.masses.map((mass, index) => <td key={index}>{fmt(mass * finalT)}</td>)}
                <td className="gamma-sum">{fmt(sumOf(bridge.masses) * finalT)}</td>
              </tr>
              <tr className="is-log" style={{ opacity: finalT }}>
                <th scope="row">log mass ℓⱼ</th>
                {bridge.logs.map((value, index) => <td key={index}>{fmt(value)}</td>)}
                <td />
              </tr>
              <tr className="is-softmax">
                <th scope="row">softmax(ℓ)ⱼ</th>
                {bridge.probabilities.map((probability, index) => (
                  <td key={index}>
                    <span className="gamma-cell-value">{fmt(probability * finalT)}</span>
                    <span className="gamma-bar" aria-hidden="true"><i style={{ width: `${clamp(probability * finalT, 0, 1) * 100}%` }} /></span>
                  </td>
                ))}
                <td className="gamma-sum">{fmt(sumOf(bridge.probabilities) * finalT)}</td>
              </tr>
            </tbody>
          </table>
          <div className="gamma-bridge-note">
            <b>the final bin owns the tail</b>
            <span>w₃ = 1 − w₁ − w₂, so the masses sum to exactly one.</span>
            <em>log-masses are the logits the attention head starts from.</em>
          </div>
        </div>
      </footer>
    </section>
  )
}
