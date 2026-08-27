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
 *
 * If either holds, the step is sound and we report which one held. If neither holds,
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

export type StepRelation = 'first' | 'equals' | 'differentiates'

export type StepVerdict =
  | { status: 'sound'; relation: StepRelation }
  | { status: 'broken'; reason: 'not_equivalent'; counterexample?: Record<string, number> }
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
 */
export function checkDerivation(lines: readonly DerivationLine[], variable: string): DerivationReport {
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
    if (derived) {
      const asDerivative = compareExpressions(line.latex, derived.latex, allowed)
      if (asDerivative.status === 'match') {
        verdicts[line.id] = { status: 'sound', relation: 'differentiates' }
        continue
      }
      // If either reading is merely undecided, we must not call the step wrong.
      if (asRewrite.status === 'uncertain' || asDerivative.status === 'uncertain') {
        verdicts[line.id] = { status: 'uncertain' }
        firstBrokenIndex = i
        continue
      }
    } else if (asRewrite.status === 'uncertain') {
      verdicts[line.id] = { status: 'uncertain' }
      firstBrokenIndex = i
      continue
    }

    verdicts[line.id] = {
      status: 'broken',
      reason: 'not_equivalent',
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
