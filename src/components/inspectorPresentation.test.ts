import { describe, expect, it } from 'vitest'
import { applyAction, createSession } from '../domain/session/reducer'
import type { SessionAction, SessionState } from '../domain/session/types'
import { proposalSeedForSession, suggestedInspectorArgs } from './inspectorPresentation'

function run(state: SessionState, action: SessionAction): SessionState {
  const result = applyAction(state, action, 'learner')
  if (!result.ok) throw new Error(`test setup failed: ${result.message}`)
  return result.state
}

describe('local inspector proposal defaults', () => {
  it('does not expose the canonical answer before proposal eligibility', () => {
    let state = createSession(2026, 'inspector-seed-before-gate')
    state = run(state, { type: 'ADD_STEP', latex: state.problem.premiseLatex })

    const seed = proposalSeedForSession(state)
    expect(seed).toBeNull()
    expect(suggestedInspectorArgs(seed).propose_step(state.revision)).not.toContain(
      state.problem.answer.latex,
    )
  })

  it('prefills only the eligible learner step after two attempts in practice', () => {
    let state = createSession(2026, 'inspector-seed-after-gate')
    state = run(state, { type: 'ADD_STEP', latex: state.problem.premiseLatex })
    state = run(state, {
      type: 'EDIT_STEP',
      stepId: 'step-1',
      latex: `${state.problem.premiseLatex}+0`,
    })

    const seed = proposalSeedForSession(state)
    expect(seed).toEqual({ stepId: 'step-1' })
    expect(JSON.parse(suggestedInspectorArgs(seed).propose_step(state.revision))).toEqual(
      expect.objectContaining({
        stepId: 'step-1',
        latex: '',
        rationale: '',
      }),
    )
  })

  it('never exposes the canonical answer during unaided transfer', () => {
    let state = createSession(2026, 'inspector-seed-transfer')
    state = run(state, { type: 'ADD_STEP', latex: state.problem.premiseLatex })
    state = run(state, {
      type: 'EDIT_STEP',
      stepId: 'step-1',
      latex: `${state.problem.premiseLatex}+0`,
    })
    state = { ...state, round: 'transfer' }

    const seed = proposalSeedForSession(state)
    expect(seed).toBeNull()
    expect(suggestedInspectorArgs(seed).propose_step(state.revision)).not.toContain(
      state.problem.answer.latex,
    )
  })

  it('rebuilds safe inspector arguments with the current revision', () => {
    const suggested = suggestedInspectorArgs(null)
    expect(JSON.parse(suggested.propose_step(7))).toEqual(
      expect.objectContaining({ expectedRevision: 7, latex: '' }),
    )
    expect(JSON.parse(suggested.propose_step(8))).toEqual(
      expect.objectContaining({ expectedRevision: 8, latex: '' }),
    )
  })
})
