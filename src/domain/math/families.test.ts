import { describe, expect, it } from 'vitest'
import { FAMILY_IDS, generateProblem } from './problems'
import { checkDerivation } from './derivation'

/**
 * Every family must be generatable, diagnosable and solvable — not merely present.
 * A family that produces instances the checker cannot verify would be a menu entry
 * that leads nowhere, which is worse than not offering it.
 */
describe('every problem family', () => {
  it('offers three families', () => {
    expect(FAMILY_IDS).toEqual(['shared-path', 'nested-power', 'quotient'])
  })

  it.each(FAMILY_IDS)('%s generates across many seeds without throwing', (familyId) => {
    for (let seed = 1; seed <= 40; seed++) {
      const problem = generateProblem(familyId, seed * 101)
      expect(problem.familyId).toBe(familyId)
      expect(problem.definitions.length).toBeGreaterThan(0)
      expect(Number.isFinite(problem.answer.value)).toBe(true)
      expect(problem.premiseLatex.length).toBeGreaterThan(0)
    }
  })

  it.each(FAMILY_IDS)('%s names at least three distinct ways to get it wrong', (familyId) => {
    const problem = generateProblem(familyId, 4242)
    expect(problem.errorModes.length).toBeGreaterThanOrEqual(3)
    for (const mode of problem.errorModes) {
      expect(mode.label.length, `${familyId}/${mode.id} label`).toBeGreaterThan(0)
      expect(mode.teach.length, `${familyId}/${mode.id} teach`).toBeGreaterThan(0)
    }
  })

  it.each(FAMILY_IDS)('%s keeps every wrong answer distinguishable from the right one', (familyId) => {
    for (let seed = 1; seed <= 25; seed++) {
      const problem = generateProblem(familyId, seed * 977)
      const values = [problem.answer.value, ...problem.errorModes.map((m) => m.value)]
      const unique = new Set(values.map((v) => v.toFixed(6)))
      expect(unique.size, `${familyId} seed ${seed} collides`).toBe(values.length)
    }
  })

  it.each(FAMILY_IDS)('%s accepts a correct derivation as sound', (familyId) => {
    const problem = generateProblem(familyId, 31337)
    const report = checkDerivation(
      [
        { id: 'step-1', latex: problem.premiseLatex },
        { id: 'step-2', latex: problem.answer.latex },
      ],
      problem.variable,
      problem.evaluationPoint,
      problem.premiseLatex,
      problem.answer,
    )
    expect(report.allSound, `${familyId}: ${JSON.stringify(report.verdicts)}`).toBe(true)
  })
})
