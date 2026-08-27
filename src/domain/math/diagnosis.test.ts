import { describe, expect, it } from 'vitest'
import { diagnose, detectAnswerShape } from './diagnosis'
import { generateProblem } from './problems'

const problem = generateProblem('shared-path', 2026) // y = 2x^3 + x^2 at x = 2, answer 28

describe('answer shape', () => {
  it.each([
    ['28', 'value'],
    ['6x^2+2x', 'expression'],
    ['-4', 'value'],
    ['2x', 'expression'],
    ['\\frac{28}{1}', 'value'],
  ])('reads %s as a %s', (input, expected) => {
    expect(detectAnswerShape(input, 'x')).toBe(expected)
  })
})

describe('numeric answers', () => {
  it('recognises the correct value', () => {
    expect(diagnose(problem, String(problem.answer.value))).toEqual({ kind: 'correct' })
  })

  it('recognises the correct value written differently', () => {
    // The bug that started this rebuild.
    expect(diagnose(problem, `${problem.answer.value}.0`)).toEqual({ kind: 'correct' })
  })

  it('names each predicted mistake', () => {
    for (const mode of problem.errorModes) {
      const result = diagnose(problem, String(mode.value))
      expect(result.kind).toBe('diagnosed')
      if (result.kind === 'diagnosed') {
        expect(result.modeId).toBe(mode.id)
        expect(result.teach.length).toBeGreaterThan(10)
      }
    }
  })

  it('says so plainly when the answer is not a mistake it knows', () => {
    expect(diagnose(problem, '99999').kind).toBe('unrecognised')
  })
})

describe('symbolic answers', () => {
  it('recognises the correct derivative', () => {
    expect(diagnose(problem, problem.answer.latex)).toEqual({ kind: 'correct' })
  })

  it('recognises the correct derivative with terms reordered', () => {
    expect(diagnose(problem, '2x + 6x^2')).toEqual({ kind: 'correct' })
  })

  it('names the omitted-route mistake from the expression alone', () => {
    const omission = problem.errorModes.find((m) => m.id === 'omits_direct_route')!
    const result = diagnose(problem, omission.latex)
    expect(result.kind).toBe('diagnosed')
    if (result.kind === 'diagnosed') expect(result.modeId).toBe('omits_direct_route')
  })
})

describe('the diagnosis transfers to unseen problems', () => {
  it('names the same mistakes correctly across many generated instances', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = generateProblem('shared-path', seed * 29 + 11)
      expect(diagnose(p, String(p.answer.value))).toEqual({ kind: 'correct' })
      for (const mode of p.errorModes) {
        const result = diagnose(p, String(mode.value))
        expect(result.kind).toBe('diagnosed')
        if (result.kind === 'diagnosed') expect(result.modeId).toBe(mode.id)
      }
    }
  })
})

describe('refusing to over-claim', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['((((', 'parse_error'],
    ['\\infty', 'unsupported_value'],
    ['x'.repeat(400), 'too_long'],
  ])('reports %s as invalid (%s) rather than wrong', (input, code) => {
    const result = diagnose(problem, input)
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.code).toBe(code)
  })

  it('treats an unrelated variable as unreadable, not as a wrong answer', () => {
    const result = diagnose(problem, 'q^2')
    expect(result.kind).toBe('invalid')
    if (result.kind === 'invalid') expect(result.code).toBe('unknown_symbol')
  })

  it('never reports `diagnosed` for two modes at once', () => {
    // The generator's collision guard should make this unreachable, but the
    // diagnoser must not depend on that to behave honestly.
    for (let seed = 1; seed <= 120; seed++) {
      const p = generateProblem('shared-path', seed)
      for (const mode of p.errorModes) {
        const result = diagnose(p, String(mode.value))
        expect(result.kind).not.toBe('ambiguous')
      }
    }
  })
})
