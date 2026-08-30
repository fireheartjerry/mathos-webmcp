import { describe, expect, it } from 'vitest'
import {
  interventionLiveMessage,
  proposalDecisionLiveMessage,
  stepExpressionAccessibleName,
} from './scratchpadAccessibility'

describe('scratchpad accessibility copy', () => {
  // This previously asserted the raw LaTeX was preserved verbatim, which is the
  // defect rather than the requirement: a screen reader announced the source,
  // backslashes and braces included. The name now carries a spoken form.
  it('speaks the learner expression in the rewrite button name', () => {
    expect(stepExpressionAccessibleName(2, '36x^2 + 8x')).toBe(
      'Line 2: 36x squared plus 8x. Select to rewrite this expression.',
    )
  })

  it('leaves no LaTeX source in the rewrite button name', () => {
    const name = stepExpressionAccessibleName(1, '\\frac{dy}{dx} = 12x^2 + 2x')
    expect(name).not.toMatch(/[{}\\]/)
    expect(name).toContain('d y by d x')
  })

  it('announces an incoming annotation with its actor and line', () => {
    expect(interventionLiveMessage('agent', 'annotation', 3)).toBe(
      'Agent added an annotation to line 3.',
    )
  })

  it('announces an incoming proposal with the required learner choice', () => {
    expect(interventionLiveMessage('local-inspector', 'proposal', 2)).toBe(
      'Local inspection proposed a replacement for line 2. Choose Use this or Keep mine.',
    )
  })

  it('announces proposal outcomes and restored focus', () => {
    expect(proposalDecisionLiveMessage(true, 2)).toBe(
      'Replacement accepted for line 2. Focus returned to that line.',
    )
    expect(proposalDecisionLiveMessage(false, 2)).toBe(
      'Replacement rejected for line 2. Focus returned to that line.',
    )
  })
})
