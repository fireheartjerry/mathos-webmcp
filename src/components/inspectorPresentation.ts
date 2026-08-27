import type { SessionState } from '../domain/session/types'
import { PROPOSAL_ATTEMPT_GATE } from '../domain/session/types'

export type ProposalSeed = { stepId: string; latex: string }

/** The canonical answer is available only when a practice step has earned a proposal. */
export function proposalSeedForSession(state: SessionState): ProposalSeed | null {
  if (state.round !== 'practice') return null
  const eligible = state.steps.find((step) => step.attempts >= PROPOSAL_ATTEMPT_GATE)
  return eligible ? { stepId: eligible.id, latex: state.problem.answer.latex } : null
}

export function suggestedInspectorArgs(
  proposalSeed: ProposalSeed | null,
): Record<string, (revision: number) => string> {
  return {
    get_scratchpad: () => '{}',
    get_receipt: () => '{}',
    check_work: (revision) =>
      `{ "expectedRevision": ${revision}, "requestId": "inspector-${revision}" }`,
    annotate_step: (revision) =>
      `{ "stepId": "step-1", "note": "Re-check this line against the premise.", "expectedRevision": ${revision}, "requestId": "inspector-${revision}" }`,
    propose_step: (revision) =>
      JSON.stringify({
        stepId: proposalSeed?.stepId ?? '',
        latex: proposalSeed?.latex ?? '',
        rationale: proposalSeed
          ? 'This is the derivative implied by the current premise.'
          : '',
        expectedRevision: revision,
        requestId: `inspector-${revision}`,
      }),
    new_problem: (revision) =>
      `{ "expectedRevision": ${revision}, "requestId": "inspector-${revision}" }`,
  }
}
