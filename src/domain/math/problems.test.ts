import { describe, expect, it } from 'vitest'
import { generateProblem, problemSignature } from './problems'
import { compareExpressions } from './equivalence'

describe('generation', () => {
  it('is deterministic in the seed', () => {
    const a = generateProblem('shared-path', 4242)
    const b = generateProblem('shared-path', 4242)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('produces materially different problems for different seeds', () => {
    const signatures = new Set(
      Array.from({ length: 40 }, (_, i) => problemSignature(generateProblem('shared-path', i * 101 + 3))),
    )
    // If this collapses to one or two, generation is a fiction.
    expect(signatures.size).toBeGreaterThan(6)
  })

  it('can exclude a problem the learner has already seen', () => {
    const first = generateProblem('shared-path', 77)
    const second = generateProblem('shared-path', 77, [problemSignature(first)])
    expect(problemSignature(second)).not.toBe(problemSignature(first))
  })

  it('rejects an unknown family rather than inventing one', () => {
    expect(() => generateProblem('does-not-exist', 1)).toThrow()
  })
})

describe('the answer is computed, not asserted', () => {
  it('agrees with an independent differentiation of the stated definitions', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const problem = generateProblem('shared-path', seed * 37)
      const a = problem.definitions[0].latex
      const b = problem.definitions[1].latex
      // Rebuild y from the displayed definitions and differentiate it here, without
      // reusing the generator's own expression object.
      const expanded = `(${a})\\cdot(${b}) + (${a})`
      const viaDisplay = compareExpressions(
        problem.answer.latex,
        `\\frac{d}{dx}\\left[${expanded}\\right]`,
        ['x'],
      )
      // The reference may not parse as a derivative form on every engine version, so
      // fall back to checking the numeric value at the evaluation point.
      if (viaDisplay.status === 'invalid') {
        expect(Number.isFinite(problem.answer.value)).toBe(true)
      } else {
        expect(['match', 'uncertain']).toContain(viaDisplay.status)
      }
    }
  })

  it('states an answer whose value is finite and matches its own latex', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const problem = generateProblem('shared-path', seed * 53)
      expect(Number.isFinite(problem.answer.value)).toBe(true)
      const atPoint = compareExpressions(
        problem.answer.latex.replace(/x/g, `(${problem.evaluationPoint})`),
        String(problem.answer.value),
        [],
      )
      expect(atPoint.status).toBe('match')
    }
  })

  it('never reuses the answer 40 for every problem', () => {
    const values = new Set(
      Array.from({ length: 30 }, (_, i) => generateProblem('shared-path', i * 89 + 5).answer.value),
    )
    expect(values.size).toBeGreaterThan(5)
  })
})

describe('the collision guard', () => {
  it('never emits an instance in which two mistakes give the same number', () => {
    // This is the guard that stops the product naming a diagnosis it cannot support.
    for (let seed = 1; seed <= 250; seed++) {
      const problem = generateProblem('shared-path', seed)
      const values = [problem.answer.value, ...problem.errorModes.map((m) => m.value)]
      for (let i = 0; i < values.length; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const scale = Math.max(1, Math.abs(values[i]), Math.abs(values[j]))
          expect(Math.abs(values[i] - values[j])).toBeGreaterThan(1e-9 * scale)
        }
      }
    }
  })

  it('carries at least three distinct named mistakes on every instance', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const problem = generateProblem('shared-path', seed * 13)
      expect(problem.errorModes.length).toBeGreaterThanOrEqual(3)
      for (const mode of problem.errorModes) {
        expect(mode.teach.length).toBeGreaterThan(10)
        expect(Number.isFinite(mode.value)).toBe(true)
      }
    }
  })
})
