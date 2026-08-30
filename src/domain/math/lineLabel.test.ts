import { describe, expect, it } from 'vitest'
import { parseExpression, stripLineLabel } from './expression'

const X = ['x'] as const

describe('the interface must accept its own instruction', () => {
  // The composer's placeholder reads "write y in terms of x", and the hint says a
  // line may be "its derivative". Both of those were rejected outright.
  it.each([
    'y = 4x^3 + x^2',
    'dy/dx = 12x^2 + 2x',
    '\\frac{dy}{dx} = 12x^2 + 2x',
    '\\dfrac{dy}{dx} = 12x^2 + 2x',
    "f'(x) = 12x^2 + 2x",
  ])('accepts %s', (input) => {
    const result = parseExpression(input, X)
    expect(result.ok, JSON.stringify(result)).toBe(true)
  })

  it('reads the labelled line as the expression it labels', () => {
    const labelled = parseExpression('y = 4x^3 + x^2', X)
    const bare = parseExpression('4x^3 + x^2', X)
    expect(labelled.ok && bare.ok).toBe(true)
    if (labelled.ok && bare.ok) {
      expect(labelled.expr.isSame(bare.expr)).toBe(true)
    }
  })
})

describe('a label is not the same as a claim about a variable', () => {
  it('leaves `x = 2` alone, because x is this problem\'s variable', () => {
    expect(stripLineLabel('x = 2', X)).toBe('x = 2')
  })

  it('leaves an equation between expressions alone', () => {
    expect(stripLineLabel('x^2 = 4', X)).toBe('x^2 = 4')
  })

  it('does not strip a comparison', () => {
    expect(stripLineLabel('y == 3x', X)).toBe('y == 3x')
  })

  it('does not strip when nothing follows the label', () => {
    expect(stripLineLabel('y =', X)).toBe('y =')
  })

  it('strips only the leading label, never a later equals', () => {
    expect(stripLineLabel('y = 3x', X)).toBe('3x')
  })
})

describe('the guards still hold after stripping', () => {
  it('still rejects a foreign variable in the body', () => {
    const result = parseExpression('y = t^2', X)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unknown_symbol')
  })

  it('still rejects an unreadable body', () => {
    const result = parseExpression('y = ((((', X)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('parse_error')
  })

  it('still rejects infinity in the body', () => {
    const result = parseExpression('y = \\infty', X)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('unsupported_value')
  })
})
