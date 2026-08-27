/**
 * Problem generation.
 *
 * A problem family is a parameterised derivation, not a list of literals. Every
 * number a learner sees - the correct answer and each predicted wrong answer - is
 * computed by the Compute Engine from the instance's own coefficients. Nothing is
 * written down in advance, so "try a fresh problem" produces a genuinely fresh one.
 *
 * The non-obvious part is `errorModes`. Each mode is a DIFFERENT WAY OF DOING THE
 * CALCULUS, expressed as its own derivation. That is what lets a diagnosis survive
 * generation: change the coefficients and every predicted mistake changes with them.
 *
 * The other non-obvious part is the collision guard. For some coefficient choices
 * two distinct mistakes produce the same number - `y = 2x^3 + x^2` at `x = 1` gives
 * 6 for three different errors. A system that named one of them would be inventing a
 * diagnosis it cannot support, so the generator rejects such instances outright.
 */

import type { BoxedExpression } from '@cortex-js/compute-engine'
import { computeEngine } from './expression'

export type ErrorMode = {
  id: string
  /** What the learner did, in their terms. Never jargon-first. */
  label: string
  /** The single idea that repairs it. */
  teach: string
  latex: string
  value: number
}

export type ProblemDefinition = { name: string; latex: string }

export type Problem = {
  id: string
  familyId: string
  seed: number
  variable: string
  evaluationPoint: number
  /** e.g. "Find dy/dx at x = 2." */
  prompt: string
  /** The named intermediate values, in the order they should be displayed. */
  definitions: ProblemDefinition[]
  /** The quantity being differentiated, e.g. "y". */
  resultName: string
  answer: { latex: string; value: number }
  errorModes: ErrorMode[]
}

const COLLISION_TOLERANCE = 1e-9

function rngFrom(seed: number): () => number {
  let state = (seed >>> 0) || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const pick = <T,>(rng: () => number, options: readonly T[]): T =>
  options[Math.floor(rng() * options.length) % options.length]

const derivative = (expr: BoxedExpression, variable: string): BoxedExpression =>
  computeEngine().box(['D', expr, variable]).evaluate().simplify()

function valueAt(expr: BoxedExpression, variable: string, point: number): number {
  const substituted = expr.subs({ [variable]: computeEngine().box(point) })
  const numeric = substituted.N()
  const re = typeof numeric.re === 'number' ? numeric.re : Number.NaN
  return re
}

/**
 * The shared-path family: `y = a(x)·b(x) + a(x)`.
 *
 * Chosen because `a` reaches `y` by two routes, so the single most common mistake -
 * counting the product route and forgetting the direct one - is structural rather
 * than arithmetic, and is therefore diagnosable.
 */
function buildSharedPath(seed: number): Problem | null {
  const ce = computeEngine()
  const rng = rngFrom(seed)

  const aCoefficient = pick(rng, [1, 1, 2, 3, 4])
  const aPower = pick(rng, [2, 2, 3])
  const bCoefficient = pick(rng, [2, 3, 4, 5])
  const point = pick(rng, [-2, -1, 1, 2, 2, 3])

  const variable = 'x'
  const aLatex = aCoefficient === 1 ? `x^${aPower}` : `${aCoefficient}x^${aPower}`
  const bLatex = `${bCoefficient}x`

  const a = ce.parse(aLatex)
  const b = ce.parse(bLatex)
  const y = a.mul(b).add(a)

  const da = derivative(a, variable)
  const db = derivative(b, variable)

  const candidates: Array<Omit<ErrorMode, 'latex' | 'value'> & { expr: BoxedExpression }> = [
    {
      id: 'correct',
      label: 'Both routes counted',
      teach: '',
      expr: derivative(y, variable),
    },
    {
      id: 'omits_direct_route',
      label: `Counted the route through the product, but not the direct + ${'a'} route`,
      teach: 'a reaches y twice — through the product a·b, and directly through + a. Both contributions add.',
      expr: derivative(a.mul(b), variable),
    },
    {
      id: 'omits_product_route',
      label: 'Counted the direct route, but not the route through the product',
      teach: 'the product a·b also changes when a changes, so that route contributes too.',
      expr: da,
    },
    {
      id: 'multiplied_derivatives',
      label: 'Multiplied the two derivatives instead of applying the product rule',
      teach: 'the derivative of a product is a′b + ab′, not a′b′.',
      expr: da.mul(db).add(da),
    },
    {
      id: 'half_product_rule',
      label: 'Applied the product rule to only one factor',
      teach: 'the product rule has two terms; each factor takes a turn being differentiated.',
      expr: da.mul(b).add(da),
    },
  ]

  const modes: ErrorMode[] = []
  for (const candidate of candidates) {
    const simplified = candidate.expr.simplify()
    const value = valueAt(simplified, variable, point)
    if (!Number.isFinite(value)) return null
    modes.push({
      id: candidate.id,
      label: candidate.label,
      teach: candidate.teach,
      latex: simplified.latex,
      value,
    })
  }

  // Reject any instance in which two mistakes are indistinguishable at this point.
  for (let i = 0; i < modes.length; i++) {
    for (let j = i + 1; j < modes.length; j++) {
      const scale = Math.max(1, Math.abs(modes[i].value), Math.abs(modes[j].value))
      if (Math.abs(modes[i].value - modes[j].value) <= COLLISION_TOLERANCE * scale) return null
    }
  }

  const [correct, ...errors] = modes
  return {
    id: `shared-path-${seed}`,
    familyId: 'shared-path',
    seed,
    variable,
    evaluationPoint: point,
    prompt: `Find dy/dx at x = ${point}.`,
    definitions: [
      { name: 'a', latex: aLatex },
      { name: 'b', latex: bLatex },
      { name: 'y', latex: 'a \\cdot b + a' },
    ],
    resultName: 'y',
    answer: { latex: correct.latex, value: correct.value },
    errorModes: errors,
  }
}

const FAMILIES: Record<string, (seed: number) => Problem | null> = {
  'shared-path': buildSharedPath,
}

export const FAMILY_IDS = Object.keys(FAMILIES)

/**
 * Generates a usable instance, resampling past any that fail the collision guard.
 * Deterministic in `seed`, so a session can be reproduced exactly.
 */
export function generateProblem(familyId: string, seed: number, exclude: readonly string[] = []): Problem {
  const build = FAMILIES[familyId]
  if (!build) throw new Error(`Unknown problem family: ${familyId}`)
  for (let attempt = 0; attempt < 200; attempt++) {
    const problem = build(seed + attempt * 7919)
    if (!problem) continue
    // Avoid handing back a problem the learner has already seen this session.
    const signature = `${problem.definitions.map((d) => d.latex).join('|')}@${problem.evaluationPoint}`
    if (exclude.includes(signature)) continue
    return problem
  }
  throw new Error(`Could not generate a usable ${familyId} problem from seed ${seed}`)
}

export function problemSignature(problem: Problem): string {
  return `${problem.definitions.map((d) => d.latex).join('|')}@${problem.evaluationPoint}`
}
