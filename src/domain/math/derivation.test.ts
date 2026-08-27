import { describe, expect, it } from 'vitest'
import { checkDerivation } from './derivation'

const lines = (...latex: string[]) => latex.map((l, i) => ({ id: `s${i + 1}`, latex: l }))

describe('a sound derivation', () => {
  it('accepts an algebraic rewriting chain', () => {
    const report = checkDerivation(lines('(x+1)^2', 'x^2+2x+1', '1+2x+x^2'), 'x')
    expect(report.allSound).toBe(true)
    expect(report.firstBrokenIndex).toBeNull()
    expect(report.verdicts.s2).toEqual({ status: 'sound', relation: 'equals' })
  })

  it('accepts a differentiation step without being told it is one', () => {
    const report = checkDerivation(lines('3x^3 + x^2', '9x^2 + 2x'), 'x')
    expect(report.allSound).toBe(true)
    expect(report.verdicts.s2).toEqual({ status: 'sound', relation: 'differentiates' })
  })

  it('accepts a mixed chain: rewrite, then differentiate, then rewrite', () => {
    const report = checkDerivation(
      lines('x^2 \\cdot 3x + x^2', '3x^3 + x^2', '9x^2 + 2x', '2x + 9x^2'),
      'x',
    )
    expect(report.allSound).toBe(true)
    expect(report.verdicts.s2).toEqual({ status: 'sound', relation: 'equals' })
    expect(report.verdicts.s3).toEqual({ status: 'sound', relation: 'differentiates' })
    expect(report.verdicts.s4).toEqual({ status: 'sound', relation: 'equals' })
  })
})

describe('finding the FIRST broken step', () => {
  it('names the first break, not the last, and not the final answer', () => {
    // Line 3 drops the 2x term. Line 4 is a faithful rewrite of the wrong line 3.
    const report = checkDerivation(lines('3x^3 + x^2', '9x^2 + 2x', '9x^2', '3x \\cdot 3x'), 'x')
    expect(report.firstBrokenIndex).toBe(2)
    expect(report.firstBrokenId).toBe('s3')
    expect(report.verdicts.s3.status).toBe('broken')
  })

  it('marks everything after the first break as downstream, not as wrong', () => {
    const report = checkDerivation(lines('3x^3 + x^2', '9x^2', '9x^2', '9x^2'), 'x')
    expect(report.firstBrokenIndex).toBe(1)
    expect(report.verdicts.s3).toEqual({ status: 'downstream' })
    expect(report.verdicts.s4).toEqual({ status: 'downstream' })
  })

  it('supplies a counterexample when it calls a step broken', () => {
    const report = checkDerivation(lines('x^2 + 5x', 'x^2 + 6x'), 'x')
    const verdict = report.verdicts.s2
    expect(verdict.status).toBe('broken')
    if (verdict.status === 'broken') expect(verdict.counterexample).toBeDefined()
  })

  it('treats a single line as sound', () => {
    const report = checkDerivation(lines('3x^3 + x^2'), 'x')
    expect(report.allSound).toBe(true)
    expect(report.verdicts.s1).toEqual({ status: 'sound', relation: 'first' })
  })

  it('treats an empty derivation as not-yet-sound rather than passing it', () => {
    const report = checkDerivation([], 'x')
    expect(report.allSound).toBe(false)
    expect(report.firstBrokenIndex).toBeNull()
  })
})

describe('refusing to over-claim', () => {
  it('reports an unreadable line as unreadable, not as wrong', () => {
    const report = checkDerivation(lines('3x^3 + x^2', '((((' ), 'x')
    const verdict = report.verdicts.s2
    expect(verdict.status).toBe('unreadable')
    if (verdict.status === 'unreadable') expect(verdict.code).toBe('parse_error')
    expect(report.firstBrokenIndex).toBe(1)
  })

  it('reports a foreign variable as unreadable with a helpful code', () => {
    const report = checkDerivation(lines('x^2', 't^2'), 'x')
    const verdict = report.verdicts.s2
    expect(verdict.status).toBe('unreadable')
    if (verdict.status === 'unreadable') expect(verdict.code).toBe('unknown_symbol')
  })

  it('does not call a step broken when the comparison was merely undecided', () => {
    // sqrt(x^2) vs x is a case where the engine and the sampler disagree in one
    // direction; the honest outcome is that we stop, not that we accuse the learner.
    const report = checkDerivation(lines('x', 'e^{\\ln x}'), 'x')
    expect(report.verdicts.s2.status).toBe('uncertain')
  })

  it('never reports allSound when any line is uncertain', () => {
    const report = checkDerivation(lines('x', 'e^{\\ln x}', 'x'), 'x')
    expect(report.allSound).toBe(false)
  })
})

describe('the learner is not punished for a correct but unusual route', () => {
  it('accepts an expanded intermediate line', () => {
    const report = checkDerivation(
      lines('x^2 \\cdot 3x + x^2', '3x^3 + x^2', '3x^3 + x^2', '9x^2 + 2x'),
      'x',
    )
    expect(report.allSound).toBe(true)
  })

  it('accepts a factored final answer', () => {
    const report = checkDerivation(lines('3x^3 + x^2', '9x^2 + 2x', 'x(9x + 2)'), 'x')
    expect(report.allSound).toBe(true)
  })
})
