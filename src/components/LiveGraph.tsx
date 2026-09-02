'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import {
  detectGraphParameters,
  estimateIntegral,
  evaluateLatexAt,
  sampleGraph,
  splitGraphExpressions,
} from '../domain/math/graph'
import type { EquationObject, GraphObject, WorldAction, WorldState } from '../domain/world/types'
import { Tex } from './Tex'
import '../styles/graph.css'
import '../styles/overflow.css'

/** Graphite for the human, purple for the Tutor, teal and orange as accents. */
export const GRAPH_PALETTE: ReadonlyArray<{ name: string; value: string }> = [
  { name: 'graphite', value: '#171713' },
  { name: 'purple', value: '#7c5cff' },
  { name: 'teal', value: '#1f8a70' },
  { name: 'orange', value: '#d2691e' },
]

const DEFAULT_PARAMETER = 1
const DEFAULT_RANGE: [number, number] = [-5, 5]

const humanPut = (summary: string, object: GraphObject | EquationObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const stopCanvasDrag = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }
const short = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()

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
 * A number that commits once, on Enter or blur, and never mid-keystroke.
 * Escape restores the committed value.
 */
function NumberField({
  value,
  label,
  onCommit,
  step = 'any',
  small = false,
}: {
  value: number
  label: string
  onCommit: (next: number) => void
  step?: number | 'any'
  small?: boolean
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
      className={`graph-number${small ? ' is-small' : ''}`}
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
    run(humanPut('Edited graph equation', { ...equation, latex: next }))
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
  const commitParameter = (name: string) => {
    const value = parameterDraft[name]
    if (value === undefined) return
    setParameterDraft((draft) => {
      const rest = { ...draft }
      delete rest[name]
      return rest
    })
    if (Math.abs(value - committedParameter(name)) < 1e-9) return
    run(humanPut(`Changed graph parameter ${name}`, {
      ...object,
      parameters: { ...object.parameters, [name]: value },
    }))
  }
  const rangeOf = (name: string): [number, number] => {
    const stored = ranges[name] ?? DEFAULT_RANGE
    const value = parameters[name] ?? DEFAULT_PARAMETER
    return [Math.min(stored[0], value), Math.max(stored[1], value)]
  }

  // ---- domain, colour, tangent, area --------------------------------------
  const [xMin, xMax] = object.xDomain
  const [yMin, yMax] = object.yDomain
  const commitDomain = (next: { xMin?: number; xMax?: number; yMin?: number; yMax?: number }) => {
    const xDomain: [number, number] = [next.xMin ?? xMin, next.xMax ?? xMax]
    const yDomain: [number, number] = [next.yMin ?? yMin, next.yMax ?? yMax]
    if (!(xDomain[0] < xDomain[1]) || !(yDomain[0] < yDomain[1])) return
    run(humanPut('Changed graph domain', { ...object, xDomain, yDomain }))
  }
  const commitColor = (color: string) => {
    if (color === object.color) return
    run(humanPut('Changed graph color', { ...object, color }))
  }
  const toggleTangent = (on: boolean) => {
    if (on) {
      run(humanPut('Changed graph tangent', { ...object, showTangentAt: Number(((xMin + xMax) / 2).toFixed(3)) }))
    } else {
      const { showTangentAt: _omit, ...rest } = object
      void _omit
      run(humanPut('Changed graph tangent', rest))
    }
  }
  const commitTangentAt = (x: number) => run(humanPut('Changed graph tangent', { ...object, showTangentAt: x }))
  const toggleArea = (on: boolean) => {
    if (on) {
      const span = xMax - xMin
      run(humanPut('Changed graph shaded area', {
        ...object,
        shadeIntegral: [Number((xMin + span * 0.25).toFixed(3)), Number((xMin + span * 0.75).toFixed(3))],
      }))
    } else {
      const { shadeIntegral: _omit, ...rest } = object
      void _omit
      run(humanPut('Changed graph shaded area', rest))
    }
  }
  const commitArea = (bounds: [number, number]) => {
    if (!(bounds[0] < bounds[1])) return
    run(humanPut('Changed graph shaded area', { ...object, shadeIntegral: bounds }))
  }

  // ---- geometry -----------------------------------------------------------
  const { ref: plotRef, size } = usePlotSize({
    width: Math.max(220, object.bounds.width),
    height: Math.max(90, object.bounds.height - 120),
  })
  const width = size.width
  const height = size.height
  const plot = { left: 44, top: 10, right: width - 12, bottom: height - 22 }
  const mapX = (x: number) => plot.left + ((x - xMin) / (xMax - xMin)) * (plot.right - plot.left)
  const mapY = (y: number) => plot.bottom - ((y - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)

  const curves = useMemo(() => expressions.map((expression, index) => {
    const colour = index === 0
      ? object.color
      : GRAPH_PALETTE.filter((entry) => entry.value.toLowerCase() !== object.color.toLowerCase())[(index - 1) % 3]?.value ?? '#171713'
    return { expression, colour, samples: sampleGraph(expression, object.xDomain, parameters) }
  }), [expressions, object.color, object.xDomain, parameters])

  const shade = useMemo(() => (object.shadeIntegral && primary
    ? sampleGraph(primary, object.shadeIntegral, parameters, 72)
    : []), [object.shadeIntegral, primary, parameters])
  const area = object.shadeIntegral && primary ? estimateIntegral(primary, object.shadeIntegral, parameters) : null
  const liveX = object.showTangentAt ?? (xMin + xMax) / 2
  const liveY = primary ? evaluateLatexAt(primary, liveX, parameters) : null
  const tangent = useMemo(() => {
    if (object.showTangentAt === undefined || !primary) return null
    const x = object.showTangentAt
    const epsilon = Math.max(0.0001, (xMax - xMin) / 500)
    const y = evaluateLatexAt(primary, x, parameters)
    const before = evaluateLatexAt(primary, x - epsilon, parameters)
    const after = evaluateLatexAt(primary, x + epsilon, parameters)
    if (y === null || before === null || after === null) return null
    const slope = (after - before) / (2 * epsilon)
    const span = (xMax - xMin) * 0.18
    const firstX = Math.max(xMin, x - span)
    const secondX = Math.min(xMax, x + span)
    return {
      x, y, slope,
      first: { x: firstX, y: y + slope * (firstX - x) },
      second: { x: secondX, y: y + slope * (secondX - x) },
    }
  }, [primary, parameters, object.showTangentAt, xMax, xMin])

  const pathOf = (samples: { x: number; y: number }[]) => samples
    .map((point, index) => `${index ? 'L' : 'M'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`)
    .join(' ')
  const shadePath = shade.length
    ? `M ${mapX(shade[0].x).toFixed(2)} ${mapY(0).toFixed(2)} ${shade.map((point) => `L ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')} L ${mapX(shade.at(-1)!.x).toFixed(2)} ${mapY(0).toFixed(2)} Z`
    : ''

  const labels: Array<{ className: string; text: string }> = []
  if (liveY !== null) labels.push({ className: 'graph-value-label', text: `f(${short(liveX, 2)}) = ${short(liveY)}` })
  if (tangent) labels.push({ className: 'graph-slope-label', text: `slope ${short(tangent.slope)}` })
  if (area !== null) labels.push({ className: 'graph-area-label', text: `∫ area ≈ ${short(area)}` })
  const labelWidth = Math.max(...labels.map((label) => label.text.length), 0) * 7.4 + 12
  const clipId = `graph-clip-${object.id}`
  const stopWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    if (node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight) event.stopPropagation()
  }
  const invalid = Boolean(latex.trim()) && curves.every((curve) => curve.samples.length === 0)

  return (
    <div className="live-graph graph-widget">
      <header className="graph-header" data-canvas-control="true" onPointerDown={stopCanvasDrag}>
        <div className="graph-header-kicker">
          <span className="graph-widget-kicker">live function</span>
          {expressions.length > 1 && <span className="graph-widget-kicker">{expressions.length} curves</span>}
        </div>
        <div className="graph-equation-row">
          <span className="graph-fx">f(x) =</span>
          <input
            className="graph-latex-input"
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
                <Tex latex={curve.expression} ariaLabel={curve.expression} />
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="graph-widget-plot" ref={plotRef}>
        <svg viewBox={`0 0 ${width} ${height}`} aria-label={`Live graph of ${latex || 'nothing'}`}>
          <defs>
            <clipPath id={clipId}>
              <rect x={plot.left} y={plot.top} width={Math.max(0, plot.right - plot.left)} height={Math.max(0, plot.bottom - plot.top)} />
            </clipPath>
          </defs>
          <rect className="graph-paper" x="0" y="0" width={width} height={height} />
          <g clipPath={`url(#${clipId})`}>
            {ticks(object.xDomain).map((value) => <line key={`x-${value}`} className="graph-grid" x1={mapX(value)} x2={mapX(value)} y1={plot.top} y2={plot.bottom} />)}
            {ticks(object.yDomain).map((value) => <line key={`y-${value}`} className="graph-grid" x1={plot.left} x2={plot.right} y1={mapY(value)} y2={mapY(value)} />)}
            {yMin <= 0 && yMax >= 0 && <line className="graph-axis" x1={plot.left} x2={plot.right} y1={mapY(0)} y2={mapY(0)} />}
            {xMin <= 0 && xMax >= 0 && <line className="graph-axis" x1={mapX(0)} x2={mapX(0)} y1={plot.top} y2={plot.bottom} />}
            {shadePath && <path className="graph-area" d={shadePath} />}
            {curves.map((curve, index) => curve.samples.length > 1 && (
              <path
                key={`curve-${index}`}
                className={`graph-curve${index ? ' is-secondary' : ''}`}
                d={pathOf(curve.samples)}
                style={{ stroke: curve.colour }}
              />
            ))}
            {tangent && <>
              <line className="graph-tangent" x1={mapX(tangent.first.x)} y1={mapY(tangent.first.y)} x2={mapX(tangent.second.x)} y2={mapY(tangent.second.y)} />
              <circle className="graph-focus" cx={mapX(tangent.x)} cy={mapY(tangent.y)} r="4.5" />
            </>}
            {labels.length > 0 && (
              <g>
                <rect className="graph-label-plate" x={plot.right - labelWidth} y={plot.top + 2} width={labelWidth} height={labels.length * 16 + 6} rx="2" />
                {labels.map((label, index) => (
                  <text key={label.className} className={label.className} x={plot.right - 6} y={plot.top + 16 + index * 16} textAnchor="end">{label.text}</text>
                ))}
              </g>
            )}
          </g>
          <text className="graph-tick" x={plot.left} y={plot.bottom + 15}>{short(xMin, 2)}</text>
          <text className="graph-tick" x={plot.right} y={plot.bottom + 15} textAnchor="end">{short(xMax, 2)}</text>
          <text className="graph-tick" x={plot.left - 5} y={plot.top + 10} textAnchor="end">{short(yMax, 2)}</text>
          <text className="graph-tick" x={plot.left - 5} y={plot.bottom} textAnchor="end">{short(yMin, 2)}</text>
        </svg>
      </div>

      <footer className="graph-footer" data-canvas-control="true" onPointerDown={stopCanvasDrag} onWheel={stopWheel}>
        <div className="graph-row graph-domain">
          <span className="graph-row-label">x</span>
          <NumberField label="x minimum" value={xMin} onCommit={(value) => commitDomain({ xMin: value })} />
          <span className="graph-range-sep">–</span>
          <NumberField label="x maximum" value={xMax} onCommit={(value) => commitDomain({ xMax: value })} />
          <span className="graph-row-label">y</span>
          <NumberField label="y minimum" value={yMin} onCommit={(value) => commitDomain({ yMin: value })} />
          <span className="graph-range-sep">–</span>
          <NumberField label="y maximum" value={yMax} onCommit={(value) => commitDomain({ yMax: value })} />
          <div className="graph-swatches" role="group" aria-label="Curve colour">
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
            <div key={name} className="graph-param">
              <span>{name} = <b>{short(value, 2)}</b></span>
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
          <span className="graph-analysis-group">
            <label className={`graph-toggle${object.showTangentAt !== undefined ? ' is-on' : ''}`}>
              <input type="checkbox" checked={object.showTangentAt !== undefined} onChange={(event) => toggleTangent(event.target.checked)} />
              tangent at x
            </label>
            {object.showTangentAt !== undefined && (
              <NumberField label="Tangent point x" value={object.showTangentAt} onCommit={commitTangentAt} />
            )}
          </span>
          <span className="graph-analysis-group">
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
