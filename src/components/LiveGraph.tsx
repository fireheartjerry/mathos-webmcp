'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from 'react'
import {
  detectGraphParameters,
  estimateIntegral,
  evaluateLatexAt,
  gridPoints,
  monoWidth,
  panDomain,
  placeLabel,
  sampleGraph,
  sampleGraphGrid,
  splitGraphExpressions,
  zoomDomain,
  type LabelBox,
} from '../domain/math/graph'
import type { EquationObject, GraphObject, WorldAction, WorldState } from '../domain/world/types'
import { revealDash, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumber, useTweenedNumbers } from './useTweenedNumber'
import { Tex } from './Tex'
import '../styles/graph.css'
import '../styles/overflow.css'
import '../styles/reveal.css'

/** Graphite for the human, purple for the Tutor, teal and orange as accents. */
export const GRAPH_PALETTE: ReadonlyArray<{ name: string; value: string }> = [
  { name: 'graphite', value: '#171713' },
  { name: 'purple', value: '#7c5cff' },
  { name: 'teal', value: '#1f8a70' },
  { name: 'orange', value: '#d2691e' },
]

const DEFAULT_PARAMETER = 1
const DEFAULT_RANGE: [number, number] = [-5, 5]
const CURVE_STEPS = 180
const MORPH_MS = 260
const FLASH_MS = 600
/** A local commit announced within this window is not replayed as an agent flash. */
const LOCAL_COMMIT_WINDOW_MS = 1500
const CURVE_INDEX = ['f₁', 'f₂', 'f₃', 'f₄', 'f₅', 'f₆']

const humanPut = (summary: string, object: GraphObject | EquationObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const stopCanvasDrag = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }
const short = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Round tick steps (1, 2, 5 × 10ⁿ) so a [0, 0.26] range still gets grid lines. */
function ticks([min, max]: [number, number], target = 6): number[] {
  const span = max - min
  if (!(span > 0) || !Number.isFinite(span)) return []
  const rough = span / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1) * magnitude
  const values: number[] = []
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    values.push(Number(value.toFixed(10)))
    if (values.length > 40) break
  }
  return values
}

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

/**
 * Which fields changed from outside this widget. Every key is a serialised
 * committed value; a change that was not announced through `local` (an agent
 * tool, undo, replay) turns its field on for FLASH_MS.
 */
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

/**
 * A number that commits once, on Enter or blur, and never mid-keystroke.
 * Escape restores the committed value.
 */
function NumberField({
  value,
  label,
  onCommit,
  step = 'any',
  small = false,
  flash = false,
}: {
  value: number
  label: string
  onCommit: (next: number) => void
  step?: number | 'any'
  small?: boolean
  flash?: boolean
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])
  const commit = () => {
    const next = Number(text)
    if (text.trim() !== '' && Number.isFinite(next) && next !== value) onCommit(next)
    else setText(String(value))
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setText(String(value))
      event.currentTarget.blur()
    }
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`graph-number${small ? ' is-small' : ''}${flash ? ' is-flash' : ''}`}
      aria-label={label}
      step={step}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  )
}

type PlotDrag =
  | { kind: 'tangent'; pointerId: number }
  | { kind: 'shade'; edge: 0 | 1; pointerId: number }
  | { kind: 'pan'; pointerId: number; clientX: number; clientY: number; xDomain: [number, number]; yDomain: [number, number]; moved: boolean }

export default function LiveGraph({
  object,
  world,
  run,
}: {
  object: GraphObject
  world: WorldState
  run: (action: WorldAction) => void
}) {
  const linked = world.objects[object.equationId]
  const equation: EquationObject | null = linked?.kind === 'equation' ? linked : null
  const committedLatex = equation?.latex ?? ''

  // Fields this widget committed itself, so their arrival is not replayed as an agent flash.
  const localCommits = useRef(new Map<string, number>())
  const commit = (field: string, summary: string, next: GraphObject | EquationObject) => {
    localCommits.current.set(field, performance.now())
    run(humanPut(summary, next))
  }

  // ---- equation draft: previews live, commits on Enter/blur ---------------
  const [draftLatex, setDraftLatex] = useState<string | null>(null)
  const latex = draftLatex ?? committedLatex
  const expressions = useMemo(() => (latex.trim() ? splitGraphExpressions(latex) : []), [latex])
  const primary = expressions[0] ?? ''
  const commitLatex = () => {
    if (draftLatex === null) return
    const next = draftLatex
    setDraftLatex(null)
    if (!equation || next === equation.latex) return
    commit('latex', 'Edited graph equation', { ...equation, latex: next })
  }
  const onLatexKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraftLatex(null)
      event.currentTarget.blur()
    }
  }

  // ---- parameters: detected from the LaTeX, previewed during a drag --------
  const parameterNames = useMemo(() => detectGraphParameters(latex), [latex])
  const [parameterDraft, setParameterDraft] = useState<Record<string, number>>({})
  const [ranges, setRanges] = useState<Record<string, [number, number]>>({})
  const parameters = useMemo(() => {
    const merged: Record<string, number> = { ...object.parameters }
    for (const name of parameterNames) if (merged[name] === undefined) merged[name] = DEFAULT_PARAMETER
    return { ...merged, ...parameterDraft }
  }, [object.parameters, parameterNames, parameterDraft])
  const committedParameter = (name: string) => object.parameters?.[name] ?? DEFAULT_PARAMETER
  const commitParameterValue = (name: string, value: number) => {
    if (Math.abs(value - committedParameter(name)) < 1e-9) return
    commit(`param:${name}`, `Changed graph parameter ${name}`, {
      ...object,
      parameters: { ...object.parameters, [name]: value },
    })
  }
  const commitParameter = (name: string) => {
    const value = parameterDraft[name]
    if (value === undefined) return
    setParameterDraft((draft) => {
      const rest = { ...draft }
      delete rest[name]
      return rest
    })
    commitParameterValue(name, value)
  }
  const rangeOf = (name: string): [number, number] => {
    const stored = ranges[name] ?? DEFAULT_RANGE
    const value = parameters[name] ?? DEFAULT_PARAMETER
    return [Math.min(stored[0], value), Math.max(stored[1], value)]
  }

  // ---- domain (with a wheel/pan draft), colour, tangent, area --------------
  const [domainDraft, setDomainDraft] = useState<{ x: [number, number]; y: [number, number] } | null>(null)
  const xDomain = domainDraft?.x ?? object.xDomain
  const yDomain = domainDraft?.y ?? object.yDomain
  const [xMin, xMax] = xDomain
  const [yMin, yMax] = yDomain
  const commitDomain = (next: { xMin?: number; xMax?: number; yMin?: number; yMax?: number }) => {
    const nextX: [number, number] = [next.xMin ?? xMin, next.xMax ?? xMax]
    const nextY: [number, number] = [next.yMin ?? yMin, next.yMax ?? yMax]
    if (!(nextX[0] < nextX[1]) || !(nextY[0] < nextY[1])) return
    setDomainDraft(null)
    commit('domain', 'Changed graph domain', { ...object, xDomain: nextX, yDomain: nextY })
  }
  const commitColor = (color: string) => {
    if (color === object.color) return
    commit('color', 'Changed graph color', { ...object, color })
  }
  const toggleTangent = (on: boolean) => {
    if (on) {
      commit('tangent', 'Changed graph tangent', { ...object, showTangentAt: Number(((xMin + xMax) / 2).toFixed(3)) })
    } else {
      const { showTangentAt: _omit, ...rest } = object
      void _omit
      commit('tangent', 'Changed graph tangent', rest)
    }
  }
  const commitTangentAt = (x: number, summary = 'Changed graph tangent') => {
    if (object.showTangentAt !== undefined && Math.abs(x - object.showTangentAt) < 1e-9) return
    commit('tangent', summary, { ...object, showTangentAt: x })
  }
  const toggleArea = (on: boolean) => {
    if (on) {
      const span = xMax - xMin
      commit('shade', 'Changed graph shaded area', {
        ...object,
        shadeIntegral: [Number((xMin + span * 0.25).toFixed(3)), Number((xMin + span * 0.75).toFixed(3))],
      })
    } else {
      const { shadeIntegral: _omit, ...rest } = object
      void _omit
      commit('shade', 'Changed graph shaded area', rest)
    }
  }
  const commitArea = (bounds: [number, number]) => {
    if (!(bounds[0] < bounds[1])) return
    if (object.shadeIntegral && Math.abs(bounds[0] - object.shadeIntegral[0]) < 1e-9 && Math.abs(bounds[1] - object.shadeIntegral[1]) < 1e-9) return
    commit('shade', 'Changed graph shaded area', { ...object, shadeIntegral: bounds })
  }

  // ---- geometry -----------------------------------------------------------
  const { ref: plotRef, size } = usePlotSize({
    width: Math.max(220, object.bounds.width),
    height: Math.max(90, object.bounds.height - 120),
  })
  const width = size.width
  const height = size.height
  const plot = { left: 44, top: 8, right: width - 12, bottom: height - 20 }
  const plotBox: LabelBox = { x: plot.left, y: plot.top, width: Math.max(0, plot.right - plot.left), height: Math.max(0, plot.bottom - plot.top) }
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)
  const unmapX = (px: number) => xMin + ((px - plot.left) / Math.max(1, plot.right - plot.left)) * (xMax - xMin)
  const unmapY = (py: number) => yMin + ((plot.bottom - py) / Math.max(1, plot.bottom - plot.top)) * (yMax - yMin)
  /** Pointer position in viewBox units, independent of the stage zoom. */
  const localPoint = (clientX: number, clientY: number) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return { x: 0, y: 0 }
    return { x: ((clientX - rect.left) / rect.width) * width, y: ((clientY - rect.top) / rect.height) * height }
  }

  // ---- plot drags: tangent point, shaded edges, pan ------------------------
  const dragRef = useRef<PlotDrag | null>(null)
  const [dragging, setDragging] = useState<PlotDrag['kind'] | null>(null)
  const [tangentDraft, setTangentDraft] = useState<number | null>(null)
  const [shadeDraft, setShadeDraft] = useState<[number, number] | null>(null)
  const beginDrag = (event: ReactPointerEvent<SVGElement>, drag: PlotDrag) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    try { event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId) } catch { /* capture unavailable */ }
    dragRef.current = drag
    setDragging(drag.kind)
  }
  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* capture unavailable */ }
    dragRef.current = { kind: 'pan', pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, xDomain, yDomain, moved: false }
    setDragging('pan')
  }
  const movePlot = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const local = localPoint(event.clientX, event.clientY)
    if (drag.kind === 'tangent') {
      setTangentDraft(Number(clamp(unmapX(local.x), xMin, xMax).toFixed(3)))
    } else if (drag.kind === 'shade') {
      const current = shadeDraft ?? object.shadeIntegral
      if (!current) return
      const x = Number(clamp(unmapX(local.x), xMin, xMax).toFixed(3))
      const next: [number, number] = drag.edge === 0 ? [Math.min(x, current[1] - 1e-3), current[1]] : [current[0], Math.max(x, current[0] + 1e-3)]
      setShadeDraft(next)
    } else {
      const rect = plotRef.current?.getBoundingClientRect()
      if (!rect) return
      const dx = ((event.clientX - drag.clientX) / rect.width) * width
      const dy = ((event.clientY - drag.clientY) / rect.height) * height
      if (!drag.moved && Math.hypot(dx, dy) < 3) return
      drag.moved = true
      const spanX = drag.xDomain[1] - drag.xDomain[0]
      const spanY = drag.yDomain[1] - drag.yDomain[0]
      setDomainDraft({
        x: panDomain(drag.xDomain, (-dx / Math.max(1, plot.right - plot.left)) * spanX),
        y: panDomain(drag.yDomain, (dy / Math.max(1, plot.bottom - plot.top)) * spanY),
      })
    }
  }
  const endPlot = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    setDragging(null)
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    if (drag.kind === 'tangent') {
      const x = tangentDraft
      setTangentDraft(null)
      if (x !== null) commitTangentAt(x, `Moved the tangent to x = ${short(x, 2)}`)
    } else if (drag.kind === 'shade') {
      const bounds = shadeDraft
      setShadeDraft(null)
      if (bounds) commitArea(bounds)
    } else if (drag.moved) {
      const draft = domainDraft
      setDomainDraft(null)
      if (draft) commit('domain', 'Changed graph domain', { ...object, xDomain: draft.x, yDomain: draft.y })
    }
  }

  // Wheel zoom about the pointer; commits once the wheel has been quiet for 320 ms.
  const latest = useRef({ object, xDomain, yDomain, domainDraft, width, height, plot })
  latest.current = { object, xDomain, yDomain, domainDraft, width, height, plot }
  const wheelTimer = useRef<number | null>(null)
  useEffect(() => {
    const node = plotRef.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const { xDomain: x, yDomain: y, width: w, height: h, plot: box } = latest.current
      const rect = node.getBoundingClientRect()
      const px = ((event.clientX - rect.left) / rect.width) * w
      const py = ((event.clientY - rect.top) / rect.height) * h
      const focusX = x[0] + ((px - box.left) / Math.max(1, box.right - box.left)) * (x[1] - x[0])
      const focusY = y[0] + ((box.bottom - py) / Math.max(1, box.bottom - box.top)) * (y[1] - y[0])
      const factor = Math.exp(clamp(event.deltaY, -120, 120) * 0.0018)
      setDomainDraft({ x: zoomDomain(x, focusX, factor), y: zoomDomain(y, focusY, factor) })
      if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current)
      wheelTimer.current = window.setTimeout(() => {
        wheelTimer.current = null
        const { object: current, domainDraft: draft } = latest.current
        setDomainDraft(null)
        if (draft) {
          localCommits.current.set('domain', performance.now())
          run(humanPut('Changed graph domain', { ...current, xDomain: draft.x, yDomain: draft.y }))
        }
      }, 320)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      node.removeEventListener('wheel', onWheel)
      if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  // ---- curves: sampled on one x grid, blended from the previous shape ------
  const morphMs = dragging || domainDraft ? 0 : MORPH_MS
  const targetGrid = useMemo(
    () => expressions.flatMap((expression) => sampleGraphGrid(expression, xDomain, parameters, CURVE_STEPS)),
    [expressions, xDomain, parameters],
  )
  const tweenedGrid = useTweenedNumbers(targetGrid, morphMs)
  const shownGrid = tweenedGrid.length === targetGrid.length ? tweenedGrid : targetGrid
  const colourOf = (index: number) => (index === 0
    ? object.color
    : GRAPH_PALETTE.filter((entry) => entry.value.toLowerCase() !== object.color.toLowerCase())[(index - 1) % 3]?.value ?? '#171713')
  const curves = expressions.map((expression, index) => ({
    expression,
    colour: colourOf(index),
    samples: gridPoints(xDomain, shownGrid.slice(index * (CURVE_STEPS + 1), (index + 1) * (CURVE_STEPS + 1))),
  }))
  const invalid = Boolean(latex.trim()) && targetGrid.length > 0 && targetGrid.every((y) => !Number.isFinite(y))

  const shadeTarget = shadeDraft ?? object.shadeIntegral
  const shadeBounds = useTweenedNumbers(shadeTarget ?? [0, 0], dragging === 'shade' ? 0 : MORPH_MS)
  const shade = useMemo(() => (shadeTarget && primary && shadeBounds[0] < shadeBounds[1]
    ? sampleGraph(primary, [shadeBounds[0], shadeBounds[1]], parameters, 72)
    : []), [shadeTarget, primary, parameters, shadeBounds])
  const areaTarget = shadeTarget && primary ? estimateIntegral(primary, shadeTarget, parameters) : 0
  const area = useTweenedNumber(areaTarget, MORPH_MS)

  const tangentTarget = tangentDraft ?? object.showTangentAt
  const liveX = tangentTarget ?? (xMin + xMax) / 2
  const liveYTarget = primary ? evaluateLatexAt(primary, liveX, parameters) : null
  const slopeTarget = useMemo(() => {
    if (tangentTarget === undefined || !primary) return null
    const epsilon = Math.max(0.0001, (xMax - xMin) / 500)
    const before = evaluateLatexAt(primary, tangentTarget - epsilon, parameters)
    const after = evaluateLatexAt(primary, tangentTarget + epsilon, parameters)
    if (before === null || after === null) return null
    return (after - before) / (2 * epsilon)
  }, [primary, parameters, tangentTarget, xMax, xMin])
  const [tangentX, tangentY, slope] = useTweenedNumbers(
    [liveX, liveYTarget ?? Number.NaN, slopeTarget ?? Number.NaN],
    dragging === 'tangent' ? 0 : MORPH_MS,
  )
  const tangent = tangentTarget !== undefined && Number.isFinite(tangentY) && Number.isFinite(slope)
    ? (() => {
      const span = (xMax - xMin) * 0.18
      const firstX = Math.max(xMin, tangentX - span)
      const secondX = Math.min(xMax, tangentX + span)
      return {
        x: tangentX, y: tangentY, slope,
        first: { x: firstX, y: tangentY + slope * (firstX - tangentX) },
        second: { x: secondX, y: tangentY + slope * (secondX - tangentX) },
      }
    })()
    : null
  const liveY = liveYTarget === null ? null : (Number.isFinite(tangentY) ? tangentY : liveYTarget)

  const pathOf = (samples: { x: number; y: number }[]) => samples
    .map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`)
    .join(' ')
  const shadePath = shade.length
    ? `M ${mapX(shade[0].x).toFixed(2)} ${mapY(0).toFixed(2)} ${shade.map((point) => `L ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')} L ${mapX(shade.at(-1)!.x).toFixed(2)} ${mapY(0).toFixed(2)} Z`
    : ''

  // ---- agent parity: fields that changed without a local draft flash purple --
  const flashes = useAgentFlashes({
    latex: committedLatex,
    domain: `${object.xDomain.join(',')}|${object.yDomain.join(',')}`,
    color: object.color,
    tangent: String(object.showTangentAt ?? ''),
    shade: object.shadeIntegral?.join(',') ?? '',
    ...Object.fromEntries(parameterNames.map((name) => [`param:${name}`, String(committedParameter(name))])),
  }, localCommits)
  const curveFlash = Boolean(flashes.latex || parameterNames.some((name) => flashes[`param:${name}`]))

  // ---- staged reveal: axes → curve → area → readouts, all from drawProgress --
  const p = revealProgress(object)
  const revealing = p < 1
  const chromeT = revealStage(p, 0, 0.2)
  const axesT = revealStage(p, 0, 0.25)
  const curveT = revealStage(p, 0.25, 0.65)
  const areaT = revealStage(p, 0.65, 0.85)
  const finalT = revealStage(p, 0.85, 1)
  const areaClipId = `graph-area-clip-${object.id}`
  const clipId = `graph-clip-${object.id}`

  // Readout plate, top-right; the curve legend takes the top-left unless the
  // two would meet, in which case the legend drops to the bottom-left.
  const labels: Array<{ className: string; text: string }> = []
  if (liveY !== null) labels.push({ className: 'graph-value-label', text: `f(${short(liveX, 2)}) = ${short(liveY * finalT)}` })
  if (tangent) labels.push({ className: 'graph-slope-label', text: `slope ${short(tangent.slope * finalT)}` })
  if (shadeTarget) labels.push({ className: 'graph-area-label', text: `∫ area ≈ ${short(area * finalT)}` })
  const labelWidth = Math.min(plotBox.width, Math.max(...labels.map((label) => monoWidth(label.text, 12)), 0) + 12)
  const plate: LabelBox = { x: plot.right - labelWidth, y: plot.top + 2, width: labelWidth, height: labels.length * 16 + 6 }
  const legendRows = curves.length > 1 ? curves : []
  const legendWidth = Math.min(plotBox.width, Math.max(...legendRows.map((_, index) => monoWidth(CURVE_INDEX[index] ?? `f${index + 1}`, 11)), 0) + 30)
  const legendHeight = legendRows.length * 14 + 6
  const legend = legendRows.length
    ? placeLabel([
      { x: plot.left + 4, y: plot.top + 2, width: legendWidth, height: legendHeight },
      { x: plot.left + 4, y: plot.bottom - legendHeight - 4, width: legendWidth, height: legendHeight },
    ], labels.length ? [plate] : [], plotBox)
    : null

  const stopWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    if (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight) event.stopPropagation()
  }
  const domainMeta = `x ∈ [${short(xMin, 2)}, ${short(xMax, 2)}]`

  return (
    <div className={`live-graph graph-widget reveal-root${revealing ? ' is-revealing' : ''}${dragging ? ` is-dragging is-dragging-${dragging}` : ''}`} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="graph-header reveal-fade" data-canvas-control="true" onPointerDown={stopCanvasDrag} style={{ opacity: chromeT }}>
        <div className="graph-header-kicker">
          <span className="graph-widget-kicker">live function</span>
          <span className="graph-header-meta">{expressions.length > 1 ? `${expressions.length} curves · ` : ''}{domainMeta}</span>
        </div>
        <div className="graph-equation-row">
          <span className="graph-fx">f(x) =</span>
          <input
            className={`graph-latex-input${flashes.latex ? ' is-flash' : ''}`}
            type="text"
            spellCheck={false}
            autoComplete="off"
            aria-label="Graph equation LaTeX"
            aria-invalid={invalid}
            disabled={!equation}
            placeholder={equation ? 'e.g. a x^2 + b; \\sin(x)' : 'no equation linked'}
            value={equation ? latex : ''}
            onChange={(event) => setDraftLatex(event.target.value)}
            onBlur={commitLatex}
            onKeyDown={onLatexKeyDown}
          />
          <div className="graph-preview" onWheel={stopWheel} aria-live="polite">
            {!equation && <span className="graph-preview-empty">no equation linked</span>}
            {equation && expressions.length === 0 && <span className="graph-preview-empty">empty</span>}
            {curves.map((curve, index) => (
              <span key={`${index}-${curve.expression}`} className="graph-preview-item">
                {curves.length > 1 && <i style={{ background: curve.colour }} aria-hidden="true" />}
                {curves.length > 1 && <span className="graph-preview-index">{CURVE_INDEX[index] ?? `f${index + 1}`}</span>}
                <Tex latex={curve.expression} ariaLabel={curve.expression} />
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="graph-widget-plot" ref={plotRef} data-canvas-control="true">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          aria-label={`Live graph of ${latex || 'nothing'}`}
          onPointerDown={beginPan}
          onPointerMove={movePlot}
          onPointerUp={endPlot}
          onPointerCancel={endPlot}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={plot.left} y={plot.top} width={plotBox.width} height={plotBox.height} />
            </clipPath>
            <clipPath id={areaClipId}>
              <rect x={plot.left} y={plot.top} width={plotBox.width * areaT} height={plotBox.height} />
            </clipPath>
          </defs>
          <rect className="graph-paper" x="0" y="0" width={width} height={height} />
          <g clipPath={`url(#${clipId})`}>
            {ticks(xDomain).map((value) => <line key={`x-${value}`} className="graph-grid" x1={mapX(value)} x2={mapX(value)} y1={plot.bottom} y2={plot.top} pathLength={1} style={revealDash(axesT)} />)}
            {ticks(yDomain).map((value) => <line key={`y-${value}`} className="graph-grid" x1={plot.left} x2={plot.right} y1={mapY(value)} y2={mapY(value)} pathLength={1} style={revealDash(axesT)} />)}
            {yMin <= 0 && yMax >= 0 && <line className="graph-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} pathLength={1} style={revealDash(axesT)} />}
            {xMin <= 0 && xMax >= 0 && <line className="graph-axis" x1={mapX(0)} x2={mapX(0)} y1={plot.bottom} y2={plot.top} pathLength={1} style={revealDash(axesT)} />}
            {shadePath && areaT > 0 && <g clipPath={`url(#${areaClipId})`}><path className={`graph-area${flashes.shade ? ' is-flash' : ''}`} d={shadePath} /></g>}
            {shadeTarget && finalT > 0 && shadeBounds[0] < shadeBounds[1] && ([0, 1] as const).map((edge) => (
              <g key={`shade-edge-${edge}`} className={`graph-shade-edge${dragging === 'shade' ? ' is-dragging' : ''}`} style={{ opacity: finalT }}>
                <line x1={mapX(shadeBounds[edge])} x2={mapX(shadeBounds[edge])} y1={plot.top} y2={plot.bottom} />
                <rect
                  className="graph-shade-grip"
                  x={mapX(shadeBounds[edge]) - 7}
                  y={plot.top}
                  width={14}
                  height={plotBox.height}
                  role="slider"
                  aria-label={edge === 0 ? 'Shaded area lower bound' : 'Shaded area upper bound'}
                  aria-valuenow={shadeTarget[edge]}
                  onPointerDown={(event) => beginDrag(event, { kind: 'shade', edge, pointerId: event.pointerId })}
                />
              </g>
            ))}
            {curves.map((curve, index) => curve.samples.length > 1 && curveT > 0 && (
              <path
                key={`curve-${index}`}
                className={`graph-curve${index ? ' is-secondary' : ''}${curveFlash || flashes.color ? ' is-flash' : ''}`}
                d={pathOf(curve.samples)}
                pathLength={1}
                style={{ stroke: curve.colour, ...revealDash(curveT) }}
              />
            ))}
            {tangent && finalT > 0 && <g className={`graph-tangent-group${flashes.tangent ? ' is-flash' : ''}`} style={{ opacity: finalT }}>
              <line className="graph-tangent" x1={mapX(tangent.first.x)} y1={mapY(tangent.first.y)} x2={mapX(tangent.second.x)} y2={mapY(tangent.second.y)} />
              <circle
                className={`graph-focus${dragging === 'tangent' ? ' is-dragging' : ''}`}
                cx={mapX(tangent.x)}
                cy={mapY(tangent.y)}
                r="6"
                role="slider"
                aria-label="Tangent point x"
                aria-valuenow={tangentTarget}
                onPointerDown={(event) => beginDrag(event, { kind: 'tangent', pointerId: event.pointerId })}
              />
            </g>}
            {legend && (
              <g className="graph-legend" style={{ opacity: finalT }}>
                <rect className="graph-label-plate" x={legend.x} y={legend.y} width={legend.width} height={legend.height} rx="2" />
                {legendRows.map((curve, index) => (
                  <g key={`legend-${index}`}>
                    <line x1={legend.x + 5} x2={legend.x + 19} y1={legend.y + 9 + index * 14} y2={legend.y + 9 + index * 14} style={{ stroke: curve.colour }} />
                    <text className="graph-legend-label" x={legend.x + 24} y={legend.y + 12 + index * 14}>{CURVE_INDEX[index] ?? `f${index + 1}`}</text>
                  </g>
                ))}
              </g>
            )}
            {labels.length > 0 && finalT > 0 && (
              <g style={{ opacity: finalT }}>
                <rect className="graph-label-plate" x={plate.x} y={plate.y} width={plate.width} height={plate.height} rx="2" />
                {labels.map((label, index) => (
                  <text key={label.className} className={label.className} x={plot.right - 6} y={plot.top + 16 + index * 16} textAnchor="end">{label.text}</text>
                ))}
              </g>
            )}
          </g>
          <g style={{ opacity: axesT }}>
            <text className="graph-tick" x={plot.left} y={plot.bottom + 14}>{short(xMin, 2)}</text>
            <text className="graph-tick" x={plot.right} y={plot.bottom + 14} textAnchor="end">{short(xMax, 2)}</text>
            <text className="graph-tick" x={plot.left - 5} y={plot.top + 10} textAnchor="end">{short(yMax, 2)}</text>
            <text className="graph-tick" x={plot.left - 5} y={plot.bottom} textAnchor="end">{short(yMin, 2)}</text>
          </g>
        </svg>
      </div>

      <footer className="graph-footer reveal-fade" data-canvas-control="true" onPointerDown={stopCanvasDrag} onWheel={stopWheel} style={{ opacity: chromeT }}>
        <div className={`graph-row graph-domain${flashes.domain ? ' is-flash' : ''}`}>
          <span className="graph-row-label">x</span>
          <NumberField label="x minimum" value={xMin} onCommit={(value) => commitDomain({ xMin: value })} />
          <span className="graph-range-sep">–</span>
          <NumberField label="x maximum" value={xMax} onCommit={(value) => commitDomain({ xMax: value })} />
          <span className="graph-row-label">y</span>
          <NumberField label="y minimum" value={yMin} onCommit={(value) => commitDomain({ yMin: value })} />
          <span className="graph-range-sep">–</span>
          <NumberField label="y maximum" value={yMax} onCommit={(value) => commitDomain({ yMax: value })} />
          <div className={`graph-swatches${flashes.color ? ' is-flash' : ''}`} role="group" aria-label="Curve colour">
            {GRAPH_PALETTE.map((entry) => (
              <button
                key={entry.value}
                type="button"
                className="graph-swatch"
                aria-label={`${entry.name} curve`}
                aria-pressed={entry.value.toLowerCase() === object.color.toLowerCase()}
                style={{ background: entry.value }}
                onClick={() => commitColor(entry.value)}
              />
            ))}
          </div>
        </div>

        {parameterNames.map((name) => {
          const value = parameters[name] ?? DEFAULT_PARAMETER
          const [min, max] = rangeOf(name)
          return (
            <div key={name} className={`graph-param${flashes[`param:${name}`] ? ' is-flash' : ''}`}>
              <span className="graph-param-name">{name} =</span>
              <NumberField small label={`Parameter ${name} value`} value={committedParameter(name)} onCommit={(next) => commitParameterValue(name, next)} />
              <NumberField small label={`${name} slider minimum`} value={min} onCommit={(next) => setRanges((current) => ({ ...current, [name]: [next, Math.max(next + 0.1, max)] }))} />
              <input
                type="range"
                aria-label={`Parameter ${name}`}
                min={min}
                max={max}
                step={Math.max(0.001, (max - min) / 200)}
                value={value}
                onChange={(event) => setParameterDraft((draft) => ({ ...draft, [name]: Number(event.target.value) }))}
                onPointerUp={() => commitParameter(name)}
                onKeyUp={() => commitParameter(name)}
                onBlur={() => commitParameter(name)}
              />
              <NumberField small label={`${name} slider maximum`} value={max} onCommit={(next) => setRanges((current) => ({ ...current, [name]: [Math.min(next - 0.1, min), next] }))} />
            </div>
          )
        })}

        <div className="graph-row graph-analysis">
          <span className={`graph-analysis-group${flashes.tangent ? ' is-flash' : ''}`}>
            <label className={`graph-toggle${object.showTangentAt !== undefined ? ' is-on' : ''}`}>
              <input type="checkbox" checked={object.showTangentAt !== undefined} onChange={(event) => toggleTangent(event.target.checked)} />
              tangent at x
            </label>
            {object.showTangentAt !== undefined && (
              <NumberField label="Tangent point x" value={object.showTangentAt} onCommit={(x) => commitTangentAt(x)} />
            )}
          </span>
          <span className={`graph-analysis-group${flashes.shade ? ' is-flash' : ''}`}>
            <label className={`graph-toggle${object.shadeIntegral ? ' is-on' : ''}`}>
              <input type="checkbox" checked={Boolean(object.shadeIntegral)} onChange={(event) => toggleArea(event.target.checked)} />
              shade area from
            </label>
            {object.shadeIntegral && <>
              <NumberField label="Shaded area lower bound" value={object.shadeIntegral[0]} onCommit={(value) => commitArea([value, object.shadeIntegral![1]])} />
              <span className="graph-row-label">to</span>
              <NumberField label="Shaded area upper bound" value={object.shadeIntegral[1]} onCommit={(value) => commitArea([object.shadeIntegral![0], value])} />
            </>}
          </span>
        </div>
      </footer>
    </div>
  )
}
