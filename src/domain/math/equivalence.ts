/**
 * The equivalence oracle.
 *
 * Two routes decide whether two expressions are the same:
 *
 *   Route A - the Compute Engine's own simplification.
 *   Route B - an evaluator written here, walking the MathJSON tree at sampled points.
 *             It shares only the PARSER with route A. It does not use the engine's
 *             `isEqual`, `simplify`, or numeric evaluator, so it can and does catch
 *             the engine being wrong.
 *
 * The combination is deliberately asymmetric, because the two directions are not
 * epistemically alike:
 *
 *   Disproof is sound. One point at which both sides evaluate to finite values that
 *   differ is a genuine counterexample. Route B can supply one; route A usually
 *   cannot - `isEqual('9x^2+2x', '9x^2')` returns `undefined`, not `false`, and that
 *   is precisely the misconception we most need to catch. So a verified counterexample
 *   establishes `mismatch` on its own.
 *
 *   Proof is not available to us. Sampling agreement is evidence. So `match` requires
 *   both routes to agree, and even then the product says "consistent with equivalence",
 *   never "proved".
 *
 * Everything else - including the engine claiming equality while route B holds a
 * counterexample, which is what happens for `sqrt(x^2)` vs `x` - returns `uncertain`.
 * `uncertain` is a real outcome the interface displays. It never silently becomes
 * `match`.
 */

import type { BoxedExpression } from '@cortex-js/compute-engine'
import { parseExpression } from './expression'

export const SAMPLE_TARGET = 24
export const RELATIVE_TOLERANCE = 1e-9

export type EquivalenceStatus = 'match' | 'mismatch' | 'uncertain' | 'invalid'

export type RouteReport = {
  symbolic: 'equal' | 'unequal' | 'unknown'
  numeric: 'equal' | 'unequal' | 'insufficient'
  samplesCompared: number
  /** The point at which the two expressions were shown to differ, when one was found. */
  counterexample?: Record<string, number>
}

export type EquivalenceResult =
  | { status: 'match' | 'mismatch' | 'uncertain'; routes: RouteReport }
  | { status: 'invalid'; code: string; message: string }

/* -------------------------------------------------------------------------- */
/* Route B: the independent evaluator                                          */
/* -------------------------------------------------------------------------- */

class UnsupportedNode extends Error {}

export function evaluateNode(json: unknown, env: Record<string, number>): number {
  if (typeof json === 'number') return json
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    const literal = (json as { num?: unknown }).num
    if (literal !== undefined) {
      const value = Number(literal)
      if (!Number.isFinite(value)) throw new UnsupportedNode('non-finite literal')
      return value
    }
    throw new UnsupportedNode('unsupported literal')
  }
  if (typeof json === 'string') {
    if (json === 'Pi') return Math.PI
    if (json === 'ExponentialE') return Math.E
    if (json in env) return env[json]
    throw new UnsupportedNode(`unbound symbol ${json}`)
  }
  if (!Array.isArray(json)) throw new UnsupportedNode('unsupported node')

  const [head, ...rest] = json as [string, ...unknown[]]
  const v = rest.map((child) => evaluateNode(child, env))
  switch (head) {
    case 'Add': return v.reduce((a, b) => a + b, 0)
    case 'Negate': return -v[0]
    case 'Subtract': return v[0] - v[1]
    case 'Multiply': return v.reduce((a, b) => a * b, 1)
    case 'Divide':
    case 'Rational': return v[0] / v[1]
    case 'Power': return Math.pow(v[0], v[1])
    case 'Square': return v[0] * v[0]
    case 'Sqrt': return Math.sqrt(v[0])
    case 'Root': return Math.pow(v[0], 1 / v[1])
    case 'Exp': return Math.exp(v[0])
    case 'Ln': return Math.log(v[0])
    case 'Log': return v.length > 1 ? Math.log(v[0]) / Math.log(v[1]) : Math.log10(v[0])
    case 'Sin': return Math.sin(v[0])
    case 'Cos': return Math.cos(v[0])
    case 'Tan': return Math.tan(v[0])
    case 'Abs': return Math.abs(v[0])
    case 'Delimiter':
    case 'Sequence': return v[0]
    default: throw new UnsupportedNode(`unsupported operator ${head}`)
  }
}

/** Deterministic, so a disagreement is always reproducible from the seed. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function numericRoute(
  a: unknown,
  b: unknown,
  variables: readonly string[],
  seed: number,
): { verdict: RouteReport['numeric']; compared: number; counterexample?: Record<string, number> } {
  if (variables.length === 0) {
    try {
      const va = evaluateNode(a, {})
      const vb = evaluateNode(b, {})
      if (!Number.isFinite(va) || !Number.isFinite(vb)) return { verdict: 'insufficient', compared: 0 }
      const scale = Math.max(1, Math.abs(va), Math.abs(vb))
      if (Math.abs(va - vb) > RELATIVE_TOLERANCE * scale) return { verdict: 'unequal', compared: 1 }
      return { verdict: 'equal', compared: 1 }
    } catch {
      return { verdict: 'insufficient', compared: 0 }
    }
  }

  const rng = makeRng(seed)
  let compared = 0
  for (let attempt = 0; attempt < SAMPLE_TARGET * 6 && compared < SAMPLE_TARGET; attempt++) {
    const env: Record<string, number> = {}
    // Sample away from zero and from small integers so that removable
    // singularities and coincidental agreements do not dominate. A quarter of the
    // points are negative, which is what exposes sqrt(x^2) vs x.
    for (const name of variables) {
      const magnitude = rng() * 6 + 0.37
      const sign = rng() < 0.25 ? -1 : 1
      env[name] = Number((magnitude * sign).toFixed(6))
    }
    let va: number
    let vb: number
    try {
      va = evaluateNode(a, env)
      vb = evaluateNode(b, env)
    } catch {
      continue
    }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue
    compared++
    const scale = Math.max(1, Math.abs(va), Math.abs(vb))
    if (Math.abs(va - vb) > RELATIVE_TOLERANCE * scale) {
      return { verdict: 'unequal', compared, counterexample: env }
    }
  }
  if (compared < Math.ceil(SAMPLE_TARGET / 3)) return { verdict: 'insufficient', compared }
  return { verdict: 'equal', compared }
}

/* -------------------------------------------------------------------------- */
/* Route A: the engine                                                         */
/* -------------------------------------------------------------------------- */

function symbolicRoute(a: BoxedExpression, b: BoxedExpression): RouteReport['symbolic'] {
  try {
    if (a.isSame(b)) return 'equal'
    const difference = a.sub(b).simplify()
    const json = difference.json
    if (json === 0) return 'equal'
    if (typeof json === 'object' && json !== null && 'num' in json && Number((json as { num: unknown }).num) === 0) {
      return 'equal'
    }
    if (difference.isEqual(0) === true) return 'equal'
    // A difference that reduces to a finite non-zero constant is a symbolic disproof.
    if (typeof json === 'number' && Number.isFinite(json) && json !== 0) return 'unequal'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/* -------------------------------------------------------------------------- */

export function compareExpressions(
  candidateLatex: unknown,
  referenceLatex: string,
  allowedVariables: readonly string[],
  seed = 20260826,
): EquivalenceResult {
  const candidate = parseExpression(candidateLatex, allowedVariables)
  if (!candidate.ok) return { status: 'invalid', code: candidate.code, message: candidate.message }
  const reference = parseExpression(referenceLatex, allowedVariables)
  if (!reference.ok) {
    // A malformed reference is our bug, not the learner's.
    return { status: 'invalid', code: 'reference_' + reference.code, message: reference.message }
  }

  const variables = [...new Set([...candidate.variables, ...reference.variables])]
  const symbolic = symbolicRoute(candidate.expr, reference.expr)
  const numeric = numericRoute(candidate.expr.json, reference.expr.json, variables, seed)

  const routes: RouteReport = {
    symbolic,
    numeric: numeric.verdict,
    samplesCompared: numeric.compared,
    ...(numeric.counterexample ? { counterexample: numeric.counterexample } : {}),
  }

  if (numeric.verdict === 'unequal' && symbolic !== 'equal') return { status: 'mismatch', routes }
  if (symbolic === 'equal' && numeric.verdict === 'equal') return { status: 'match', routes }
  return { status: 'uncertain', routes }
}
