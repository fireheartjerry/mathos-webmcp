import { describe, expect, it } from 'vitest'
import { applyAction, createSession } from '../domain/session/reducer'
import { actionFeedbackAfterResult, EMPTY_ACTION_FEEDBACK } from './actionFeedback'

describe('actionFeedbackAfterResult', () => {
  it('clears a stale invalid-input message after a valid learner action succeeds', () => {
    const session = createSession(2026, 'feedback-test')
    const tooLong = applyAction(
      session,
      { type: 'ADD_STEP', latex: 'x'.repeat(257) },
      'learner',
    )
    const rejected = actionFeedbackAfterResult(EMPTY_ACTION_FEEDBACK, tooLong, 'learner')

    expect(rejected.flash).toBe('Keep a step under 256 characters.')

    const accepted = applyAction(session, { type: 'ADD_STEP', latex: 'x^2' }, 'learner')
    expect(actionFeedbackAfterResult(rejected, accepted, 'learner')).toEqual(
      EMPTY_ACTION_FEEDBACK,
    )
  })

  it('clears a visible policy refusal after the next action succeeds', () => {
    let session = createSession(2026, 'refusal-feedback-test')
    const added = applyAction(session, { type: 'ADD_STEP', latex: 'x^2' }, 'learner')
    if (!added.ok) throw new Error('test setup failed')
    session = added.state

    const refused = applyAction(
      session,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '2x', rationale: 'power rule' },
      'agent',
    )
    const visibleRefusal = actionFeedbackAfterResult(
      EMPTY_ACTION_FEEDBACK,
      refused,
      'agent',
    )
    expect(visibleRefusal.refusal?.message).toContain('two learner attempts')

    const revised = applyAction(
      session,
      { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' },
      'learner',
    )
    expect(actionFeedbackAfterResult(visibleRefusal, revised, 'learner')).toEqual(
      EMPTY_ACTION_FEEDBACK,
    )
  })
})
