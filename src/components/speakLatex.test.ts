import { describe, expect, it } from 'vitest'
import { speakLatex } from './speakLatex'

describe('the step controls must be readable by ear', () => {
  it.each([
    ['y = 4x^3 + x^2', 'y equals 4x cubed plus x squared'],
    ['\\frac{dy}{dx} = 12x^2 + 2x', 'd y by d x equals 12x squared plus 2x'],
    ['36x^2', '36x squared'],
    ['x^{10}', 'x to the power 10'],
    ['2 \\cdot 3', '2 times 3'],
  ])('speaks %s', (latex, spoken) => {
    expect(speakLatex(latex)).toBe(spoken)
  })

  it('never leaves a backslash or a brace in the spoken form', () => {
    const spoken = speakLatex('\\frac{dy}{dx}\\bigg|_{x=2} = 160')
    expect(spoken).not.toMatch(/[{}\\]/)
    expect(spoken).toContain('evaluated at')
  })

  it('passes plain text through unchanged', () => {
    expect(speakLatex('160')).toBe('160')
  })
})
