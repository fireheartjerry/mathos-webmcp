import type { BoxedExpression } from '@cortex-js/compute-engine'
import { computeEngine } from './expression'
import type { Point } from '../world/types'

/**
 * Parsing is the expensive half of evaluating a curve: one `sampleGraph` call
 * evaluates the same string a few hundred times, and a keystroke in the graph
 * header re-samples every curve. The parsed tree is cached per LaTeX string so
 * only the substitution runs per sample.
 */
const PARSE_CACHE_LIMIT = 48
const parseCache = new Map<string, BoxedExpression | null>()

function parsedLatex(latex: string): BoxedExpression | null {
  const cached = parseCache.get(latex)
  if (cached !== undefined) return cached
  let expr: BoxedExpression | null
  try {
    expr = computeEngine().parse(latex)
  } catch {
    expr = null
  }
  if (parseCache.size >= PARSE_CACHE_LIMIT) {
    const oldest = parseCache.keys().next().value
    if (oldest !== undefined) parseCache.delete(oldest)
  }
  parseCache.set(latex, expr)
  return expr
}

export function evaluateLatexAt(
  latex: string,
  x: number,
  parameters: Record<string, number> = {},
): number | null {
  try {
    const expr = parsedLatex(latex)
    if (!expr) return null
    const value = expr.subs({ x, ...parameters }).N().valueOf()
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function sampleGraph(
  latex: string,
  xDomain: [number, number],
  parameters: Record<string, number> = {},
  steps = 180,
): Point[] {
  const [min, max] = xDomain
  return Array.from({ length: steps + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / steps
    return { x, y: evaluateLatexAt(latex, x, parameters) ?? Number.NaN }
  }).filter((point) => Number.isFinite(point.y))
}

export function estimateIntegral(
  latex: string,
  domain: [number, number],
  parameters: Record<string, number> = {},
): number {
  const points = sampleGraph(latex, domain, parameters, 96)
  return points.slice(1).reduce((area, point, index) => {
    const previous = points[index]
    return area + ((point.x - previous.x) * (point.y + previous.y)) / 2
  }, 0)
}

/**
 * Splits `x^2; 2x+1` into its curves. Only top-level semicolons separate
 * expressions, so a `;` inside braces (a matrix row, a `\text{}` note) is
 * left alone. A single expression comes back as a one-element list.
 */
export function splitGraphExpressions(latex: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of latex) {
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)
    if (char === ';' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  const trimmed = parts.map((part) => part.trim()).filter(Boolean)
  return trimmed.length ? trimmed : [latex.trim()]
}

const GRAPH_FUNCTION_NAMES = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'ln', 'log', 'lg', 'exp', 'sqrt', 'abs', 'floor', 'ceil', 'min', 'max',
  'mod', 'sign', 'gamma', 'erf', 'dx', 'dy', 'dt',
])

/**
 * Every single-letter symbol other than `x` that would be free when the curve
 * is evaluated: `a x^2 + b` yields `['a', 'b']`. Command names (`\sin`,
 * `\pi`), bare function words (`sin`, `ln`), `\text{}` contents and `e` used
 * as a base (`e^{...}`) are not controls. Uppercase letters are left to the
 * engine, which reads them as constants or operator heads.
 */
export function detectGraphParameters(latex: string): string[] {
  if (typeof latex !== 'string' || !latex) return []
  let source = latex
    .replace(/%[^\n]*/g, ' ')
    .replace(/\\(?:text|mathrm|operatorname|mathit|mathbf)\s*\{[^{}]*\}/g, ' ')
    .replace(/\\(?:begin|end)\s*\{[^{}]*\}/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ')
    // `e^` is Euler's number, not a control; a bare `e` elsewhere still is.
    .replace(/e(?=\s*\^)/g, ' ')
  source = source.replace(/[^A-Za-z]+/g, ' ')
  const found = new Set<string>()
  for (const word of source.split(' ')) {
    if (!word) continue
    if (GRAPH_FUNCTION_NAMES.has(word.toLowerCase())) continue
    for (const letter of word) {
      if (letter < 'a' || letter > 'z' || letter === 'x') continue
      found.add(letter)
    }
  }
  return [...found].sort()
}

// ---------------------------------------------------------------------------
// Fixed-grid sampling, so two curves (or one curve before and after a change)
// can be blended point-for-point at the same x positions.
// ---------------------------------------------------------------------------

/** The x of grid index `index` when `[min, max]` is split into `steps` intervals. */
export const gridX = (xDomain: [number, number], steps: number, index: number): number =>
  xDomain[0] + ((xDomain[1] - xDomain[0]) * index) / steps

/**
 * `steps + 1` y values on an even x grid; NaN where the expression is
 * undefined so the array length never depends on the function.
 */
export function sampleGraphGrid(
  latex: string,
  xDomain: [number, number],
  parameters: Record<string, number> = {},
  steps = 180,
): number[] {
  return Array.from({ length: steps + 1 }, (_, index) => evaluateLatexAt(latex, gridX(xDomain, steps, index), parameters) ?? Number.NaN)
}

/** Pairs grid y values with their x positions, dropping the undefined ones. */
export function gridPoints(xDomain: [number, number], ys: readonly number[]): Point[] {
  const steps = Math.max(1, ys.length - 1)
  const points: Point[] = []
  ys.forEach((y, index) => { if (Number.isFinite(y)) points.push({ x: gridX(xDomain, steps, index), y }) })
  return points
}

/** Scale a domain about `focus` by `factor` (>1 zooms out), keeping the focus fixed. */
export function zoomDomain(domain: [number, number], focus: number, factor: number, minSpan = 1e-3, maxSpan = 1e6): [number, number] {
  const span = (domain[1] - domain[0]) * factor
  if (!(span >= minSpan) || span > maxSpan) return domain
  const t = (focus - domain[0]) / (domain[1] - domain[0])
  const min = focus - t * span
  return [Number(min.toFixed(3)), Number((min + span).toFixed(3))]
}

/** Shift a domain by `delta` in its own units. */
export const panDomain = (domain: [number, number], delta: number): [number, number] =>
  [Number((domain[0] + delta).toFixed(3)), Number((domain[1] + delta).toFixed(3))]

// ---------------------------------------------------------------------------
// Label placement inside a plot rectangle. Widths are estimates from the mono
// metrics; the caller supplies the candidates in order of preference.
// ---------------------------------------------------------------------------

export type LabelBox = { x: number; y: number; width: number; height: number }

/** Approximate advance width of mono text at `fontSize` px (Fira Code ≈ 0.6em per glyph). */
export const monoWidth = (text: string, fontSize: number): number => [...text].length * fontSize * 0.6

export const boxesOverlap = (a: LabelBox, b: LabelBox, gap = 2): boolean =>
  a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y

const boxInside = (box: LabelBox, within: LabelBox): boolean =>
  box.x >= within.x && box.y >= within.y && box.x + box.width <= within.x + within.width && box.y + box.height <= within.y + within.height

/**
 * First candidate that lies inside `within` and clears every obstacle; when
 * none does, the first candidate is clamped into `within` instead.
 */
export function placeLabel(candidates: LabelBox[], obstacles: LabelBox[], within: LabelBox): LabelBox {
  for (const candidate of candidates) {
    if (boxInside(candidate, within) && !obstacles.some((obstacle) => boxesOverlap(candidate, obstacle))) return candidate
  }
  const first = candidates[0]
  return {
    ...first,
    x: Math.min(Math.max(first.x, within.x), within.x + within.width - first.width),
    y: Math.min(Math.max(first.y, within.y), within.y + within.height - first.height),
  }
}
