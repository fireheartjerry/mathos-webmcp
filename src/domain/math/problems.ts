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
  /**
   * The quantity being differentiated, written out in the problem's variable. The
   * learner's first line is checked against this; without it a derivation about some
   * unrelated expression would be judged internally consistent and passed.
   */
  premiseLatex: string
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
    premiseLatex: y.simplify().latex,
    answer: { latex: correct.latex, value: correct.value },
    errorModes: errors,
  }
}

/**
 * The nested-power family: `y = (a(x))^n`.
 *
 * Chosen because the chain rule's failure is a *missing factor*, not a wrong one. A
 * learner who forgets the inner derivative still produces something that looks like a
 * derivative and is often right at x = 1, which is exactly why the collision guard
 * matters here more than anywhere else.
 */
function buildNestedPower(seed: number): Problem | null {
  const ce = computeEngine()
  const rng = rngFrom(seed)

  const inner = pick(rng, [2, 3, 4, 5])
  const shift = pick(rng, [1, 2, 3, -1, -2])
  const power = pick(rng, [2, 2, 3])
  const point = pick(rng, [-2, -1, 1, 2, 2, 3])

  const variable = 'x'
  const aLatex = shift >= 0 ? `${inner}x + ${shift}` : `${inner}x - ${Math.abs(shift)}`

  const a = ce.parse(aLatex)
  const y = ce.box(['Power', a, power])
  const da = derivative(a, variable)

  const candidates: Array<Omit<ErrorMode, 'latex' | 'value'> & { expr: BoxedExpression }> = [
    { id: 'correct', label: 'Outer power and inner derivative both counted', teach: '', expr: derivative(y, variable) },
    {
      id: 'omits_inner_derivative',
      label: 'Brought the power down but did not differentiate what was inside',
      teach: 'the bracket is itself a function of x, so its own derivative multiplies the result.',
      expr: ce.box(['Multiply', power, ce.box(['Power', a, power - 1])]),
    },
    {
      id: 'inner_only',
      label: 'Differentiated only what was inside the bracket',
      teach: 'the power is still there; differentiating the inside is one factor of the answer, not all of it.',
      expr: da,
    },
    {
      id: 'kept_the_power',
      label: 'Multiplied by the inner derivative but did not reduce the power',
      teach: 'bringing the power down also lowers the exponent by one.',
      expr: ce.box(['Multiply', power, ce.box(['Power', a, power]), da]),
    },
  ]

  return finishFamily('nested-power', seed, variable, point, candidates, {
    prompt: `Find dy/dx at x = ${point}.`,
    definitions: [
      { name: 'a', latex: aLatex },
      { name: 'y', latex: `a^${power}` },
    ],
    premise: y,
  })
}

/**
 * The quotient family: `y = a(x) / b(x)`.
 *
 * Chosen because its two commonest failures are *sign order* and *a missing square*,
 * and both stay wrong under every evaluation point rather than only some - so a
 * diagnosis here is about structure, not about arithmetic luck.
 */
function buildQuotient(seed: number): Problem | null {
  const ce = computeEngine()
  const rng = rngFrom(seed)

  const aCoefficient = pick(rng, [1, 2, 3, 4])
  const aPower = pick(rng, [2, 2, 3])
  const bCoefficient = pick(rng, [1, 2, 3])
  const bShift = pick(rng, [1, 2, 3])
  const point = pick(rng, [-2, -1, 1, 2, 2, 3])

  const variable = 'x'
  const aLatex = aCoefficient === 1 ? `x^${aPower}` : `${aCoefficient}x^${aPower}`
  const bLatex = bCoefficient === 1 ? `x + ${bShift}` : `${bCoefficient}x + ${bShift}`

  const a = ce.parse(aLatex)
  const b = ce.parse(bLatex)
  // A denominator that vanishes at the evaluation point would make every mode Infinity.
  if (Math.abs(valueAt(b, variable, point)) < 1e-9) return null

  const y = ce.box(['Divide', a, b])
  const da = derivative(a, variable)
  const db = derivative(b, variable)
  const bSquared = ce.box(['Power', b, 2])

  const candidates: Array<Omit<ErrorMode, 'latex' | 'value'> & { expr: BoxedExpression }> = [
    { id: 'correct', label: 'Quotient rule applied in the right order', teach: '', expr: derivative(y, variable) },
    {
      id: 'reversed_numerator',
      label: 'Subtracted the two numerator terms the wrong way round',
      teach: 'the numerator is a\u2032b \u2212 ab\u2032; the term that keeps the denominator undifferentiated comes first.',
      expr: ce.box(['Divide', ce.box(['Subtract', a.mul(db), da.mul(b)]), bSquared]),
    },
    {
      id: 'quotient_of_derivatives',
      label: 'Divided the two derivatives instead of applying the quotient rule',
      teach: 'the derivative of a quotient is not the quotient of the derivatives.',
      expr: ce.box(['Divide', da, db]),
    },
    {
      id: 'denominator_not_squared',
      label: 'Got the numerator right but did not square the denominator',
      teach: 'the quotient rule divides by b squared, not by b.',
      expr: ce.box(['Divide', ce.box(['Subtract', da.mul(b), a.mul(db)]), b]),
    },
  ]

  return finishFamily('quotient', seed, variable, point, candidates, {
    prompt: `Find dy/dx at x = ${point}.`,
    definitions: [
      { name: 'a', latex: aLatex },
      { name: 'b', latex: bLatex },
      { name: 'y', latex: '\\dfrac{a}{b}' },
    ],
    premise: y,
  })
}

/**
 * The shared tail of every family: evaluate each way of doing the calculus, reject the
 * instance if two of them agree at this point, and assemble the problem.
 *
 * The collision guard is the reason this is shared rather than copied. A family whose
 * guard is subtly different is a family that can name a diagnosis it cannot support.
 */
function finishFamily(
  familyId: string,
  seed: number,
  variable: string,
  point: number,
  candidates: Array<Omit<ErrorMode, 'latex' | 'value'> & { expr: BoxedExpression }>,
  shape: { prompt: string; definitions: ProblemDefinition[]; premise: BoxedExpression },
): Problem | null {
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
  for (let i = 0; i < modes.length; i++) {
    for (let j = i + 1; j < modes.length; j++) {
      const scale = Math.max(1, Math.abs(modes[i].value), Math.abs(modes[j].value))
      if (Math.abs(modes[i].value - modes[j].value) <= COLLISION_TOLERANCE * scale) return null
    }
  }
  const [correct, ...errors] = modes
  return {
    id: `${familyId}-${seed}`,
    familyId,
    seed,
    variable,
    evaluationPoint: point,
    prompt: shape.prompt,
    definitions: shape.definitions,
    resultName: 'y',
    premiseLatex: shape.premise.simplify().latex,
    answer: { latex: correct.latex, value: correct.value },
    errorModes: errors,
  }
}

/**
 * The trigonometric chain family: `y = c\u00b7sin(kx)`.
 *
 * The other three families are polynomial, so a learner could pass all of them while
 * believing differentiation is a rule about exponents. This one is transcendental, and
 * it is evaluated at x = 0 on purpose: the derivative c\u00b7k\u00b7cos(kx) is exactly c\u00b7k there,
 * so every predicted answer stays a clean integer and the mistakes stay legible rather
 * than becoming a contest between decimal expansions.
 */
function buildTrigChain(seed: number): Problem | null {
  const ce = computeEngine()
  const rng = rngFrom(seed)

  const outer = pick(rng, [2, 3, 4, 5])
  const inner = pick(rng, [2, 3, 4, 5])
  if (outer === inner) return null

  const variable = 'x'
  const innerLatex = `${inner}x`
  const yLatex = `${outer}\\sin(${innerLatex})`

  const a = ce.parse(innerLatex)
  const y = ce.parse(yLatex)
  const da = derivative(a, variable)

  const candidates: Array<Omit<ErrorMode, 'latex' | 'value'> & { expr: BoxedExpression }> = [
    { id: 'correct', label: 'Chain rule applied through the sine', teach: '', expr: derivative(y, variable) },
    {
      id: 'omits_inner_derivative',
      label: 'Differentiated the sine but not what was inside it',
      teach: 'the angle is a function of x, so its own derivative multiplies the result.',
      expr: ce.parse(`${outer}\\cos(${innerLatex})`),
    },
    {
      id: 'sign_slipped',
      label: 'Differentiated the sine as if it were a cosine',
      teach: 'sine differentiates to cosine; it is cosine that picks up the minus sign.',
      expr: ce.box(['Negate', ce.parse(`${outer * inner}\\cos(${innerLatex})`)]),
    },
    {
      id: 'left_the_sine',
      label: 'Multiplied by the inner derivative but left the sine undifferentiated',
      teach: 'the outer function has to change too: sin becomes cos.',
      expr: ce.box(['Multiply', da, y]),
    },
  ]

  return finishFamily('trig-chain', seed, variable, 0, candidates, {
    // Evaluated at zero, where cos is 1 and every candidate lands on a whole number.
    prompt: 'Find dy/dx at x = 0.',
    definitions: [
      { name: 'a', latex: innerLatex },
      { name: 'y', latex: `${outer}\\sin(a)` },
    ],
    premise: y,
  })
}

const FAMILIES: Record<string, (seed: number) => Problem | null> = {
  'shared-path': buildSharedPath,
  'nested-power': buildNestedPower,
  quotient: buildQuotient,
  'trig-chain': buildTrigChain,
}

export const FAMILY_IDS = Object.keys(FAMILIES)

/**
 * What to call each family on screen. Kept beside the families so that adding one
 * without naming it fails the build - the heading used to be the literal string
 * "Product rule", which stayed put when the quotient family arrived and told the
 * learner they were looking at the wrong rule.
 */
export const FAMILY_LABELS: Record<string, string> = {
  'shared-path': 'Product rule',
  'nested-power': 'Chain rule',
  quotient: 'Quotient rule',
  'trig-chain': 'Chain rule through a sine',
}

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
