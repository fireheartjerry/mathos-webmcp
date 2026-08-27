import { describe, expect, it } from 'vitest'
import { compareExpressions, evaluateNode } from './equivalence'
import { parseExpression } from './expression'

const X = ['x'] as const
const status = (candidate: string, reference: string) =>
  compareExpressions(candidate, reference, X).status

describe('surface forms of a correct numeric answer', () => {
  // The shipped build compared strings, so `40.0` was marked wrong. Each of these
  // is the same number written the way a real learner might write it.
  it.each(['40', '40.0', '+40', '  40  ', '36+4', '4\\cdot 10', '\\frac{80}{2}', '80/2'])(
    'accepts %s as 40',
    (input) => {
      expect(status(input, '40')).toBe('match')
    },
  )

  it.each(['36', '4', '41', '0', '-40', '40.00001'])('rejects %s as 40', (input) => {
    expect(status(input, '40')).toBe('mismatch')
  })
})

describe('algebraic equivalence', () => {
  it.each([
    ['2x+3', '3+2x'],
    ['(x+1)^2', 'x^2+2x+1'],
    ['x+x', '2x'],
    ['9x^2 + 2x', '2x + 9x^2'],
    ['\\sin^2(x)+\\cos^2(x)', '1'],
  ])('treats %s and %s as equivalent', (a, b) => {
    expect(status(a, b)).toBe('match')
  })

  it.each([
    ['9x^2+2x', '9x^2'],
    ['9x^2+2x', '9x^2+3x'],
    ['9x^2+2x', '18x'],
  ])('separates %s from %s', (a, b) => {
    expect(status(a, b)).toBe('mismatch')
  })

  it('the misconception case is a mismatch, not an uncertainty', () => {
    // The engine alone returns `undefined` here. Only the independent numeric route
    // can supply the counterexample, which is why disproof does not require both.
    const result = compareExpressions('9x^2', '9x^2+2x', X)
    expect(result.status).toBe('mismatch')
    if (result.status !== 'invalid') {
      expect(result.routes.symbolic).toBe('unknown')
      expect(result.routes.numeric).toBe('unequal')
      expect(result.routes.counterexample).toBeDefined()
    }
  })
})

describe('honest uncertainty', () => {
  it('does not accept sqrt(x^2) as x, though the engine alone would', () => {
    // The engine reports these equal. They differ for every x < 0. The independent
    // route finds such a point, so we must not report `match`.
    expect(status('\\sqrt{x^2}', 'x')).not.toBe('match')
  })

  it('refuses to certify e^(ln x) = x, which holds only for x > 0', () => {
    expect(status('e^{\\ln x}', 'x')).toBe('uncertain')
  })

  it('reports a counterexample whenever it claims a mismatch', () => {
    const result = compareExpressions('x^2', 'x^3', X)
    expect(result.status).toBe('mismatch')
    if (result.status !== 'invalid') {
      const point = result.routes.counterexample
      expect(point).toBeDefined()
      // The counterexample must actually be one.
      const a = parseExpression('x^2', X)
      const b = parseExpression('x^3', X)
      if (a.ok && b.ok && point) {
        expect(evaluateNode(a.expr.json, point)).not.toBeCloseTo(evaluateNode(b.expr.json, point), 6)
      }
    }
  })

  it('is deterministic for a given seed', () => {
    const first = compareExpressions('x^2', 'x^3', X, 12345)
    const second = compareExpressions('x^2', 'x^3', X, 12345)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe('the input contract', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['((((', 'parse_error'],
    ['2+', 'parse_error'],
    ['\\infty', 'unsupported_value'],
    ['1/0', 'unsupported_value'],
    ['y+1', 'unknown_symbol'],
    ['x'.repeat(300), 'too_long'],
  ])('rejects %s with code %s', (input, code) => {
    const result = compareExpressions(input, '40', X)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.code).toBe(code)
  })

  it('rejects a script tag rather than evaluating it', () => {
    expect(compareExpressions('<script>alert(1)</script>', '40', X).status).toBe('invalid')
  })

  it('names the variable that was not recognised', () => {
    const result = compareExpressions('t^2', 'x^2', X)
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.message).toContain('t')
  })

  it('accepts a declared variable other than x', () => {
    expect(compareExpressions('2q', 'q+q', ['q']).status).toBe('match')
  })
})

describe('the independent evaluator', () => {
  it('refuses operators it does not implement rather than guessing', () => {
    expect(() => evaluateNode(['Gamma', 3], {})).toThrow()
  })

  it('refuses unbound symbols rather than defaulting them to zero', () => {
    expect(() => evaluateNode('x', {})).toThrow()
  })

  it('agrees with the engine on a value the engine computes', () => {
    const parsed = parseExpression('3x^3 + x^2', X)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(evaluateNode(parsed.expr.json, { x: 2 })).toBeCloseTo(28, 9)
  })
})
