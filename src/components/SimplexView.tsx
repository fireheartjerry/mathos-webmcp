'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject, PointerEvent as ReactPointerEvent } from 'react'
import {
  normalizedSimplexLatticePoints,
  pascalRecurrence,
  pointFromSimplexWeights,
  projectTetrahedron,
  rotateAndProject,
  sectionTriangle,
  setSimplexWeight,
  weightsFromScreenOnSection,
  wrapAngle,
  type EulerRotation,
  type SimplexWeights,
  type Tetrahedron,
} from '../domain/math/simplex'
import type { Point, SimplexObject, WorldAction } from '../domain/world/types'
import { revealDash, revealItem, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumber, useTweenedNumbers } from './useTweenedNumber'
import '../styles/reveal.css'
import '../styles/lattice.css'

type Props = {
  object: SimplexObject
  run: (action: WorldAction) => void
}

const humanPut = (summary: string, object: SimplexObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const TETRAHEDRON: Tetrahedron = [
  { x: -2.3, y: -1.35, z: -1.15 },
  { x: 2.3, y: -1.35, z: -1.15 },
  { x: 0, y: 2.25, z: -1.15 },
  { x: 0, y: 0, z: 2.25 },
]
const EDGE_PAIRS: Array<[number, number]> = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]]
const LABELS = ['A', 'B', 'C', 'D']
const GREEK = ['α', 'β', 'γ', 'δ']
const MIN_DENOMINATOR = 1
const MAX_DENOMINATOR = 24
const ORBIT_GAIN = 0.0085
const FLASH_MS = 700
const SECTION_TWEEN_MS = 260
const WEIGHT_TWEEN_MS = 320
const ORBIT_TWEEN_MS = 420
const fmt = (value: number) => value.toFixed(3)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const bracket = (weights: readonly number[]) => `[${weights.map((weight) => weight.toFixed(2)).join(' : ')}]`

type Draft = Partial<Pick<SimplexObject, 'weights' | 'section' | 'rotationX' | 'rotationY'>>
type DragState =
  | { kind: 'point'; pointerId: number }
  | { kind: 'orbit'; pointerId: number; startX: number; startY: number; rotationX: number; rotationY: number }
type FlashField = 'weights' | 'section' | 'rotationX' | 'rotationY' | 'denominator' | 'showLattice'
const FLASH_FIELDS: readonly FlashField[] = ['weights', 'section', 'rotationX', 'rotationY', 'denominator', 'showLattice']

const sameValue = (a: unknown, b: unknown): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => sameValue(item, b[index]))
  return a === b
}

/**
 * Fields that changed on the object without a matching local commit: a tool,
 * an undo, or a timeline set them. Each flagged field stays hot for 700 ms.
 */
function useForeignChanges<T extends object, K extends keyof T>(
  object: T,
  fields: readonly K[],
  localRef: MutableRefObject<T | null>,
): Partial<Record<K, true>> {
  const previousRef = useRef(object)
  const [flash, setFlash] = useState<Partial<Record<K, number>>>({})
  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = object
    if (previous === object) return
    const local = localRef.current
    const hits = fields.filter((field) => !sameValue(object[field], previous[field]) && (!local || !sameValue(object[field], local[field])))
    if (local && fields.every((field) => sameValue(object[field], local[field]))) localRef.current = null
    if (!hits.length) return
    const stamp = Date.now()
    setFlash((current) => {
      const next = { ...current }
      for (const field of hits) next[field] = stamp
      return next
    })
    window.setTimeout(() => setFlash((current) => {
      const next = { ...current }
      for (const field of hits) if (next[field] === stamp) delete next[field]
      return next
    }), FLASH_MS)
  }, [object, fields, localRef])
  const hot: Partial<Record<K, true>> = {}
  for (const field of fields) if (flash[field] !== undefined) hot[field] = true
  return hot
}

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  digits: number
  onCommit: (value: number) => void
  className?: string
}

/** Typed twin of a slider: edits locally, commits once on blur or Enter. */
function NumberField({ label, value, min, max, step, digits, onCommit, className }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null)
  const settle = () => {
    if (text === null) return
    const parsed = Number(text)
    setText(null)
    if (Number.isFinite(parsed)) onCommit(clamp(parsed, min, max))
  }
  // Arrow keys step by the control's own step, not the browser's default of 1:
  // `step="any"` keeps a 0.589 weight from being reported as an invalid entry.
  const nudge = (direction: 1 | -1) => {
    const base = text === null ? value : Number(text)
    if (!Number.isFinite(base)) return
    setText(null)
    const next = clamp(Math.round((base + direction * step) / step) * step, min, max)
    if (!sameValue(next, value)) onCommit(next)
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    // Enter only blurs: the blur handler commits once, so Enter + blur never double-commit.
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') { setText(null); event.currentTarget.blur() }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); nudge(event.key === 'ArrowUp' ? 1 : -1) }
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`lattice-num${className ? ` ${className}` : ''}`}
      aria-label={label}
      value={text ?? value.toFixed(digits)}
      min={min}
      max={max}
      step="any"
      onChange={(event) => setText(event.target.value)}
      onBlur={settle}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}

/**
 * A mathematically projected tetrahedron, not a physics engine. The hero
 * control is δ: setting it redistributes the remainder so α, β, γ keep their
 * ratios and the four weights still sum to one. The section plane δ = t cuts
 * a triangle; when t equals the point's δ, P lies on that triangle with
 * barycentrics (α, β, γ)/(1 − δ), which is the previous act's triangle.
 *
 * Direct manipulation: drag P across the section triangle (its weights are
 * the nearest valid point on δ = t), drag empty plot to orbit, sliders and
 * typed values for everything else. Every release is one commit.
 */
export default function SimplexView({ object, run }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const plotRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const localRef = useRef<SimplexObject | null>(null)
  const width = Math.max(320, object.bounds.width)
  const height = Math.max(245, object.bounds.height)
  const [plotSize, setPlotSize] = useState({ width: Math.max(120, width - 24 - 220 - 10), height: Math.max(120, height - 20 - 34 - 26 - 16) })
  const plotWidth = plotSize.width
  const plotHeight = plotSize.height
  const center = { x: plotWidth * 0.5, y: plotHeight * 0.53 }
  const projection = useMemo(() => ({ scale: Math.min(plotWidth, plotHeight) / 6.4, distance: 8, offset: center }), [plotWidth, plotHeight])

  // Measure the plot cell so the viewBox matches its box exactly (pointer maths stay honest).
  useLayoutEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    const measure = () => {
      const next = { width: Math.max(120, Math.round(plot.clientWidth)), height: Math.max(120, Math.round(plot.clientHeight)) }
      setPlotSize((current) => (current.width === next.width && current.height === next.height ? current : next))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(plot)
    return () => observer.disconnect()
  }, [])

  // A live draft is fed to the tween with ms = 0, so the hook tracks the pointer
  // exactly *and* keeps its internal origin in step. On release the committed
  // value already equals what is drawn, so nothing snaps back: the plane sweeps
  // over 260 ms only when a tool, the timeline or a typed value moves it.
  const draftingWeights = draft?.weights !== undefined
  const draftingSection = draft?.section !== undefined
  const draftingOrbit = draft?.rotationX !== undefined || draft?.rotationY !== undefined
  const tweenedWeights = useTweenedNumbers(draft?.weights ?? object.weights, draftingWeights ? 0 : WEIGHT_TWEEN_MS)
  const tweenedSection = useTweenedNumber(draft?.section ?? object.section, draftingSection ? 0 : SECTION_TWEEN_MS)
  const tweenedOrbit = useTweenedNumbers(
    [draft?.rotationX ?? object.rotationX, draft?.rotationY ?? object.rotationY],
    draftingOrbit ? 0 : ORBIT_TWEEN_MS,
  )
  const weights = tweenedWeights as SimplexWeights
  const section = clamp(tweenedSection, 0, 1)
  const rotationX = tweenedOrbit[0]
  const rotationY = tweenedOrbit[1]
  const denominator = clamp(Math.round(object.denominator), MIN_DENOMINATOR, MAX_DENOMINATOR)
  const rotation: EulerRotation = useMemo(() => ({ x: rotationX, y: rotationY, z: 0 }), [rotationX, rotationY])
  const projected = useMemo(() => projectTetrahedron(TETRAHEDRON, rotation, projection), [rotation, projection])
  const projectedPoint = rotateAndProject(pointFromSimplexWeights(TETRAHEDRON, weights), rotation, projection)
  const flash = useForeignChanges(object, FLASH_FIELDS, localRef)

  // ---- staged reveal: edges → lattice → section plane sweeping down from the apex --
  const p = revealProgress(object)
  const revealing = p < 1
  const edgesT = revealStage(p, 0, 0.4)
  const latticeT = revealStage(p, 0.4, 0.7)
  const sectionT = revealStage(p, 0.7, 1)
  const pointT = revealStage(p, 0.85, 1)
  const sideT = revealStage(p, 0, 0.2)
  const chromeT = revealStage(p, 0, 0.15)
  const drawnSection = 1 - (1 - section) * sectionT
  const sectionPoints = useMemo(
    () => sectionTriangle(TETRAHEDRON, drawnSection).map((vertex) => rotateAndProject(vertex, rotation, projection)),
    [drawnSection, rotation, projection],
  )
  const recurrence = pascalRecurrence(denominator, 3)
  const lattice = useMemo(() => (object.showLattice ? normalizedSimplexLatticePoints(denominator) : []), [object.showLattice, denominator])
  const onSection = Math.abs(section - weights[3]) < 0.012
  const sectionWeights = weights[3] < 0.999
    ? [weights[0], weights[1], weights[2]].map((weight) => weight / (1 - weights[3]))
    : [1 / 3, 1 / 3, 1 / 3]
  const sum = weights.reduce((total, weight) => total + weight, 0)
  const latticeDelay = (index: number) => `${Math.min(360, index * 3)}ms`

  const commit = (summary: string, patch: Partial<SimplexObject>) => {
    setDraft(null)
    const next: SimplexObject = { ...object, ...patch }
    if (JSON.stringify(next) === JSON.stringify(object)) return
    localRef.current = next
    run(humanPut(summary, next))
  }
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  // ---- direct manipulation ---------------------------------------------------------
  const localPoint = (event: ReactPointerEvent): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: center.x, y: center.y }
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * plotWidth,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * plotHeight,
    }
  }
  const dragPlane = () => (object.section <= 0.97 ? object.section : object.weights[3])
  const weightsAt = (event: ReactPointerEvent): SimplexWeights =>
    weightsFromScreenOnSection(localPoint(event), TETRAHEDRON, dragPlane(), rotation, projection)

  const begin = (state: DragState, event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* capture unsupported */ }
    dragRef.current = state
    setDrag(state)
  }
  const beginPointDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0 || revealing) return
    begin({ kind: 'point', pointerId: event.pointerId }, event)
    setDraft((current) => ({ ...(current ?? {}), weights: weightsAt(event) }))
  }
  const beginOrbitDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || revealing || dragRef.current) return
    begin({ kind: 'orbit', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, rotationX: object.rotationX, rotationY: object.rotationY }, event)
  }
  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    if (active.kind === 'point') {
      setDraft((current) => ({ ...(current ?? {}), weights: weightsAt(event) }))
    } else {
      const scale = (svgRef.current?.getBoundingClientRect().width ?? plotWidth) / Math.max(1, plotWidth)
      const dx = (event.clientX - active.startX) / Math.max(0.05, scale)
      const dy = (event.clientY - active.startY) / Math.max(0.05, scale)
      setDraft((current) => ({ ...(current ?? {}), rotationY: wrapAngle(active.rotationY + dx * ORBIT_GAIN), rotationX: wrapAngle(active.rotationX + dy * ORBIT_GAIN) }))
    }
  }
  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    dragRef.current = null
    setDrag(null)
    if (active.kind === 'point') {
      const next = weightsAt(event)
      commit(`Moved P to ${bracket(next)}`, { weights: next })
    } else {
      const current = draft
      if (current?.rotationX === undefined && current?.rotationY === undefined) { setDraft(null); return }
      commit('Rotated the simplex', { rotationX: current.rotationX ?? object.rotationX, rotationY: current.rotationY ?? object.rotationY })
    }
  }

  const setDenominator = (value: number) => {
    const next = clamp(Math.round(value), MIN_DENOMINATOR, MAX_DENOMINATOR)
    if (next === denominator) return
    commit(`Changed the lattice denominator to ${next}`, { denominator: next })
  }

  const slider = (
    label: string,
    value: number,
    range: { min: number; max: number; step: number; digits: number },
    onDraft: (value: number) => Draft,
    summary: (value: number) => string,
    extra: { target?: string; className?: string; flash?: boolean },
  ) => (
    <label className={`lattice-field${extra.className ? ` ${extra.className}` : ''}${extra.flash ? ' is-agent-set' : ''}`}>
      <span>{label}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-label={label}
        data-demo-target={extra.target}
        onChange={(event) => setDraft((current) => ({ ...(current ?? {}), ...onDraft(Number(event.target.value)) }))}
        onPointerUp={() => commit(summary(value), draft ?? {})}
        onKeyUp={() => commit(summary(value), draft ?? {})}
        onBlur={() => { if (draft) commit(summary(value), draft) }}
      />
      <NumberField
        label={`${label} value`}
        value={value}
        min={range.min}
        max={range.max}
        step={range.step}
        digits={range.digits}
        onCommit={(next) => commit(summary(next), onDraft(next))}
      />
    </label>
  )

  const plotClass = `simplex-plot${drag?.kind === 'orbit' ? ' is-orbiting' : ''}${drag?.kind === 'point' ? ' is-moving-point' : ''}`

  return (
    <div className={`simplex-view lattice-card reveal-root${revealing ? ' is-revealing' : ''}`} onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="lattice-head reveal-fade" style={{ opacity: chromeT }}>
        <div className="lattice-head-text">
          <span className="lattice-kicker">4-weight probability simplex · perspective projection</span>
          <h3 className="lattice-title">Tetrahedral probability</h3>
        </div>
        <div className="lattice-meta" aria-label="Point and orbit readout">
          <span className={flash.weights ? 'is-agent-set' : undefined}>P <b>{bracket(weights)}</b></span>
          <i>·</i>
          <span className={flash.rotationX || flash.rotationY ? 'is-agent-set' : undefined}>orbit <b>{rotationX.toFixed(2)}</b> / <b>{rotationY.toFixed(2)}</b></span>
        </div>
      </header>

      <div className="simplex-body">
        <div ref={plotRef} className={plotClass} data-canvas-control="true">
          <svg
            ref={svgRef}
            className="simplex-canvas"
            viewBox={`0 0 ${plotWidth} ${plotHeight}`}
            preserveAspectRatio="none"
            aria-label="Projected tetrahedral probability simplex; drag P to move it on the section plane, drag empty space to orbit"
            onPointerDown={beginOrbitDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <polygon className="simplex-face" points={projected.slice(0, 3).map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(' ')} style={{ opacity: revealStage(p, 0.3, 0.45) }} />
            {EDGE_PAIRS.map(([first, second], index) => {
              const t = revealItem(edgesT, index, EDGE_PAIRS.length, 0.8)
              if (t <= 0) return null
              return (
                <line
                  key={`${first}-${second}`}
                  className="simplex-edge"
                  x1={projected[first].x}
                  y1={projected[first].y}
                  x2={projected[second].x}
                  y2={projected[second].y}
                  pathLength={1}
                  style={{ ...revealDash(t), animationDelay: `${index * 70}ms` }}
                />
              )
            })}
            {lattice.map((latticeWeights, index) => {
              const t = revealItem(latticeT, index, lattice.length, 3)
              if (t <= 0) return null
              const mapped = rotateAndProject(pointFromSimplexWeights(TETRAHEDRON, latticeWeights), rotation, projection)
              const onPlane = Math.abs(latticeWeights[3] - section) < 1e-9
              return (
                <circle
                  key={`lattice-${denominator}-${index}`}
                  className={`simplex-lattice-point${onPlane ? ' is-on-section' : ''}${flash.denominator || flash.showLattice ? ' is-agent-set' : ''}`}
                  cx={mapped.x}
                  cy={mapped.y}
                  r={onPlane ? 2.8 : 2}
                  style={t < 1 ? { opacity: 0.65 * t } : { animationDelay: latticeDelay(index) }}
                />
              )
            })}
            {sectionT > 0 && (
              <polygon
                className={`simplex-section${onSection ? ' is-holding-point' : ''}`}
                points={sectionPoints.map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(' ')}
              />
            )}
            {sectionPoints.map((vertex, index) => (
              <text key={`section-${index}`} className="simplex-section-vertex" x={vertex.x + 6} y={vertex.y - 5} style={{ opacity: sectionT }}>
                {LABELS[index]}ₜ
              </text>
            ))}
            {pointT > 0 && (
              <g>
                <circle className={`simplex-interior-point${onSection ? ' is-on-section' : ''}${flash.weights ? ' is-agent-set' : ''}`} cx={projectedPoint.x} cy={projectedPoint.y} r={7 * pointT} />
                <circle className="simplex-point-hit" cx={projectedPoint.x} cy={projectedPoint.y} r={15} onPointerDown={beginPointDrag} />
              </g>
            )}
            <text className="simplex-interior-label" x={projectedPoint.x + 11} y={projectedPoint.y - 9} style={{ opacity: pointT }}>P {bracket(weights)}</text>
            {projected.map((vertex, index) => {
              const t = revealStage(p, index * 0.08, index * 0.08 + 0.12)
              if (t <= 0) return null
              return (
                <g key={LABELS[index]}>
                  <circle className="simplex-vertex" cx={vertex.x} cy={vertex.y} r={4.5 * t} />
                  <text className="simplex-vertex-label" x={vertex.x + 9} y={vertex.y - 9} style={{ opacity: t }}>{LABELS[index]}</text>
                </g>
              )
            })}
            <text className={`simplex-section-label${flash.section ? ' is-agent-set' : ''}`} x={plotWidth - 12} y={17} textAnchor="end" style={{ opacity: sectionT }}>
              section δ = {section.toFixed(2)}{onSection ? ' · holds P' : ''}
            </text>
          </svg>
          <span className="simplex-orbit-hint" aria-hidden="true" style={{ opacity: chromeT * 0.7 }}>drag P · drag space to orbit</span>
        </div>

        <aside className="simplex-side reveal-fade" onPointerDown={stop} style={{ opacity: sideT }}>
          <div className="sx-weights">
            {weights.map((weight, index) =>
              slider(
                `${GREEK[index]} · ${LABELS[index]}`,
                weight,
                { min: 0, max: 1, step: 0.01, digits: 3 },
                (value) => ({ weights: setSimplexWeight(weights, index, value) }),
                (value) => `Set ${GREEK[index]} to ${short(value)}; the other weights keep their ratios`,
                { target: index === 3 ? 'simplex-weight-delta' : undefined, className: index === 3 ? 'is-hero' : undefined, flash: flash.weights },
              ),
            ).map((node, index) => <div key={LABELS[index]}>{node}</div>)}
            <div className="sx-weights-sum"><span>Σ λᵢ</span><b>{fmt(sum)}</b></div>
          </div>
          <div className="sx-section">
            {slider(
              'section δ = t',
              section,
              { min: 0, max: 1, step: 0.01, digits: 2 },
              (value) => ({ section: value }),
              (value) => `Swept the section plane to δ = ${short(value)}`,
              { target: 'simplex-section', className: 'is-teal', flash: flash.section },
            )}
            <p className={onSection ? 'is-active' : undefined}>
              {onSection
                ? <>P lies on this triangle with barycentrics [{sectionWeights.map((weight) => weight.toFixed(3)).join(' : ')}] = (α, β, γ)/(1 − δ)</>
                : <>the section at δ = t is a triangle; sweep to t = {weights[3].toFixed(2)} to recall the barycentric triangle holding P</>}
            </p>
          </div>
          <div className={`sx-orbit${flash.rotationX || flash.rotationY ? ' is-agent-set' : ''}`}>
            <span>orbit x <b>{rotationX.toFixed(2)}</b> · y <b>{rotationY.toFixed(2)}</b></span>
            <button type="button" className="lattice-btn" onClick={() => commit('Reset the simplex orbit', { rotationX: -0.32, rotationY: 0.49 })} disabled={Math.abs(object.rotationX + 0.32) < 1e-6 && Math.abs(object.rotationY - 0.49) < 1e-6}>reset</button>
          </div>
        </aside>
      </div>

      <footer className="lattice-foot reveal-fade" onPointerDown={stop} style={{ opacity: sideT }}>
        <div className={`lattice-foot-text${flash.denominator ? ' is-agent-set' : ''}`}>
          <b>{recurrence.total}</b>
          <span>lattice points · L₃({denominator}) = C({denominator + 3}, 3)</span>
          <small>Pascal {recurrence.previous} + {recurrence.lowerDimension} = {recurrence.sum}{recurrence.verified ? ' ✓' : ''}</small>
        </div>
        <div className="lattice-foot-actions">
          <span className={`lattice-stepper${flash.denominator ? ' is-agent-set' : ''}`} aria-label="Lattice denominator N">
            <span>N</span>
            <button type="button" className="lattice-btn" aria-label="Decrease denominator" onClick={() => setDenominator(denominator - 1)} disabled={denominator <= MIN_DENOMINATOR}>−</button>
            <NumberField label="Lattice denominator" value={denominator} min={MIN_DENOMINATOR} max={MAX_DENOMINATOR} step={1} digits={0} onCommit={setDenominator} />
            <button type="button" className="lattice-btn" aria-label="Increase denominator" onClick={() => setDenominator(denominator + 1)} disabled={denominator >= MAX_DENOMINATOR}>+</button>
          </span>
          <button
            type="button"
            className={`lattice-btn${object.showLattice ? ' is-on' : ''}${flash.showLattice ? ' is-agent-set' : ''}`}
            aria-pressed={object.showLattice}
            onClick={() => commit(object.showLattice ? 'Hid the simplex lattice' : 'Showed the simplex lattice', { showLattice: !object.showLattice })}
          >
            {object.showLattice ? 'lattice on' : 'lattice off'}
          </button>
        </div>
      </footer>
    </div>
  )
}
