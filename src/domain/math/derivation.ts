/**
 * Checking a derivation.
 *
 * A derivation is an ordered list of lines. Each line claims to follow from the one
 * above it. We do not ask the learner to say *how* it follows - that would be asking
 * them to annotate their own work, which nobody does on paper. Instead each line is
 * tested against both legal relations:
 *
 *   equals          - the line is equivalent to its predecessor (an algebraic rewrite)
 *   differentiates  - the line is equivalent to the derivative of its predecessor
 *   evaluates       - the line is the predecessor's value at the point the problem asks
 *                     about, which is the line "find dy/dx at x = 2" actually asks for
 *
 * If any holds, the step is sound and we report which one held. If neither holds,
 * the step is broken.
 *
 * The product's attention goes to the FIRST broken step, because every line after it
 * is downstream of a mistake already made. Telling a learner that lines 3, 4 and 5 are
 * all wrong when line 3 is the only real error is how software teaches people that
 * they are bad at mathematics.
 */

import type { BoxedExpression } from '@cortex-js/compute-engine'
import { compareExpressions } from './equivalence'
import { computeEngine, parseExpression } from './expression'

export type StepRelation = 'first' | 'equals' | 'differentiates' | 'evaluates'

export type StepVerdict =
  | {
      status: 'sound'
      relation: StepRelation
    }
  | {
      status: 'broken'
      reason: 'not_equivalent'
      /**
       * What is actually missing, as mathematics. `12x^2` teaches; "they differ at
       * x = 2.580159" only proves. We show the difference when it is simple enough to
       * read, and fall back to the counterexample point when it is not.
       */
      difference?: { latex: string; against: 'previous' | 'derivative' }
      counterexample?: Record<string, number>
    }
  | { status: 'uncertain' }
  | { status: 'unreadable'; code: string; message: string }
  | { status: 'downstream' }

export type DerivationLine = { id: string; latex: string }

export type DerivationReport = {
  verdicts: Record<string, StepVerdict>
  /** Index into the supplied lines, or null when nothing is broken. */
  firstBrokenIndex: number | null
  firstBrokenId: string | null
  /** True when every line is sound. */
  allSound: boolean
}

const READABLE_DIFFERENCE_CHARS = 40

/**
 * Reports what is missing rather than merely that something is.
 *
 * The step could have been intended as a rewrite or as a differentiation, and we do
 * not ask the learner which. So both differences are computed and the shorter one is
 * reported: whichever reading the learner meant, the smaller residue is the one that
 * names the actual mistake. A residue too long to read is suppressed, because an
 * unreadable wall of algebra teaches nothing.
 */
function describeDifference(
  previous: BoxedExpression,
  current: BoxedExpression,
  derived: BoxedExpression | null,
): { difference: { latex: string; against: 'previous' | 'derivative' } } | null {
  const candidates: Array<{ latex: string; against: 'previous' | 'derivative' }> = []
  const consider = (from: BoxedExpression | null, against: 'previous' | 'derivative') => {
    if (!from) return
    try {
      const residue = from.sub(current).simplify()
      if (!residue.isValid) return
      const latex = residue.latex
      if (!latex || latex.length > READABLE_DIFFERENCE_CHARS) return
      if (residue.isEqual(0) === true) return
      candidates.push({ latex, against })
    } catch {
      /* an unrepresentable difference is simply not reported */
    }
  }
  consider(previous, 'previous')
  consider(derived, 'derivative')
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.latex.length - b.latex.length)
  return { difference: candidates[0] }
}

/** The previous line's value at the problem's point, as a decimal literal, or null. */
function evaluateAt(expr: BoxedExpression, variable: string, point: number): string | null {
  try {
    const substituted = expr.subs({ [variable]: computeEngine().box(point) }).N()
    const value = typeof substituted.re === 'number' ? substituted.re : Number.NaN
    return Number.isFinite(value) ? String(value) : null
  } catch {
    return null
  }
}

function differentiate(expr: BoxedExpression, variable: string): BoxedExpression | null {
  try {
    const derived = computeEngine().box(['D', expr, variable]).evaluate().simplify()
    return derived.isValid ? derived : null
  } catch {
    return null
  }
}

/**
 * @param lines     the learner's work, in order
 * @param variable  the problem's variable, e.g. 'x'
 * @param evaluationPoint  The point the problem asks about, when it asks for a value
 *   rather than a function. Without it the last line of "find dy/dx at x = 2" - the
 *   number - is judged against the derivative it came from and marked wrong, which is
 *   exactly the line the problem asked the learner to write.
 */
export function checkDerivation(
  lines: readonly DerivationLine[],
  variable: string,
  evaluationPoint?: number,
): DerivationReport {
  const verdicts: Record<string, StepVerdict> = {}
  const allowed = [variable]
  let firstBrokenIndex: number | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Once something is broken, later lines are downstream of it. They are still
    // shown, but they are not judged - their premise is already wrong.
    if (firstBrokenIndex !== null) {
      verdicts[line.id] = { status: 'downstream' }
      continue
    }

    const parsed = parseExpression(line.latex, allowed)
    if (!parsed.ok) {
      verdicts[line.id] = { status: 'unreadable', code: parsed.code, message: parsed.message }
      firstBrokenIndex = i
      continue
    }

    if (i === 0) {
      verdicts[line.id] = { status: 'sound', relation: 'first' }
      continue
    }

    const previous = lines[i - 1]
    const previousParsed = parseExpression(previous.latex, allowed)
    if (!previousParsed.ok) {
      // Unreachable in practice: an unreadable predecessor would already have set
      // firstBrokenIndex. Handled so the function is total.
      verdicts[line.id] = { status: 'uncertain' }
      firstBrokenIndex = i
      continue
    }

    const asRewrite = compareExpressions(line.latex, previous.latex, allowed)
    if (asRewrite.status === 'match') {
      verdicts[line.id] = { status: 'sound', relation: 'equals' }
      continue
    }

    const derived = differentiate(previousParsed.expr, variable)
    let derivativeUncertain = false
    if (derived) {
      const asDerivative = compareExpressions(line.latex, derived.latex, allowed)
      if (asDerivative.status === 'match') {
        verdicts[line.id] = { status: 'sound', relation: 'differentiates' }
        continue
      }
      derivativeUncertain = asDerivative.status === 'uncertain'
    }

    // The third legal move: substituting the point the problem asks about.
    const evaluated = evaluationPoint === undefined
      ? null
      : evaluateAt(previousParsed.expr, variable, evaluationPoint)
    if (evaluated !== null) {
      const asEvaluation = compareExpressions(line.latex, evaluated, [])
      if (asEvaluation.status === 'match') {
        verdicts[line.id] = { status: 'sound', relation: 'evaluates' }
        continue
      }
    }

    // If any reading is merely undecided, we must not call the step wrong.
    if (asRewrite.status === 'uncertain' || derivativeUncertain) {
      verdicts[line.id] = { status: 'uncertain' }
      firstBrokenIndex = i
      continue
    }

    verdicts[line.id] = {
      status: 'broken',
      reason: 'not_equivalent',
      ...(describeDifference(previousParsed.expr, parsed.expr, derived) ?? {}),
      ...(asRewrite.status === 'mismatch' && asRewrite.routes.counterexample
        ? { counterexample: asRewrite.routes.counterexample }
        : {}),
    }
    firstBrokenIndex = i
  }

  return {
    verdicts,
    firstBrokenIndex,
    firstBrokenId: firstBrokenIndex === null ? null : lines[firstBrokenIndex].id,
    allSound: firstBrokenIndex === null && lines.length > 0,
  }
}
