/**
 * Diagnosis.
 *
 * The shipped build compared the learner's answer to the literal `'36'`. This
 * compares it against every mistake the family predicts *for this instance*, each of
 * which was computed by differentiating a different (wrong) derivation. So the
 * diagnosis moves with the coefficients, and the same five modes correctly name a
 * mistake on a problem the code has never seen.
 *
 * The discipline that matters is what happens when the mathematics does not entitle
 * us to name anything:
 *
 *   - more than one mode matches      -> `ambiguous`, never a guess
 *   - nothing matches                 -> `unrecognised`, and we say so plainly
 *   - the answer could not be read    -> `invalid`, with the parser's reason
 *   - the comparison came back        -> `uncertain`, surfaced rather than rounded
 *     `uncertain`                        to "wrong"
 *
 * A learner is told "that is not one of the mistakes I know how to name" rather than
 * being handed a confident wrong story about their own thinking.
 */

import { compareExpressions } from './equivalence'
import type { Problem } from './problems'

export type Diagnosis =
  | { kind: 'correct' }
  | { kind: 'diagnosed'; modeId: string; label: string; teach: string }
  | { kind: 'ambiguous'; modeIds: string[] }
  | { kind: 'unrecognised' }
  | { kind: 'uncertain' }
  | { kind: 'invalid'; code: string; message: string }

/**
 * Learners may answer with the value of the derivative at the point, or with the
 * derivative as a function. Both are legitimate; both are diagnosable.
 */
export type AnswerShape = 'value' | 'expression'

export function detectAnswerShape(latex: string, variable: string): AnswerShape {
  return new RegExp(`(^|[^A-Za-z])${variable}([^A-Za-z]|$)`).test(latex) ? 'expression' : 'value'
}

export function diagnose(problem: Problem, rawAnswer: unknown): Diagnosis {
  if (typeof rawAnswer !== 'string' || !rawAnswer.trim()) {
    return { kind: 'invalid', code: 'empty', message: 'Enter an answer.' }
  }
  const answer = rawAnswer.trim()
  const shape = detectAnswerShape(answer, problem.variable)
  const allowed = shape === 'expression' ? [problem.variable] : []

  const targets: Array<{ id: string; reference: string; label: string; teach: string }> = [
    { id: 'correct', reference: shape === 'expression' ? problem.answer.latex : String(problem.answer.value), label: '', teach: '' },
    ...problem.errorModes.map((mode) => ({
      id: mode.id,
      reference: shape === 'expression' ? mode.latex : String(mode.value),
      label: mode.label,
      teach: mode.teach,
    })),
  ]

  const matches: typeof targets = []
  let sawUncertain = false
  let firstInvalid: { code: string; message: string } | null = null

  for (const target of targets) {
    const result = compareExpressions(answer, target.reference, allowed)
    if (result.status === 'invalid') {
      // The learner's own input failed the contract; the reason is the same for
      // every target, so record it once.
      if (!firstInvalid && !result.code.startsWith('reference_')) {
        firstInvalid = { code: result.code, message: result.message }
      }
      continue
    }
    if (result.status === 'match') matches.push(target)
    if (result.status === 'uncertain') sawUncertain = true
  }

  if (firstInvalid) return { kind: 'invalid', ...firstInvalid }
  if (matches.length === 1) {
    const [hit] = matches
    if (hit.id === 'correct') return { kind: 'correct' }
    return { kind: 'diagnosed', modeId: hit.id, label: hit.label, teach: hit.teach }
  }
  if (matches.length > 1) return { kind: 'ambiguous', modeIds: matches.map((m) => m.id) }
  if (sawUncertain) return { kind: 'uncertain' }
  return { kind: 'unrecognised' }
}
