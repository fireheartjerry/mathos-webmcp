/**
 * The session reducer.
 *
 * This is the single transition function. A learner clicking a button, an agent
 * calling a WebMCP tool, and the local inspector's Run control all arrive here, with
 * the only difference being `source`. There is no second code path, and no branch
 * that validates a learner differently from an agent - what differs is *policy*,
 * which is stated explicitly below and returned as a visible refusal rather than
 * hidden in a conditional.
 *
 * The policies:
 *   - Writing, editing, deleting and accepting are open to any source. They used to be
 *     the learner's alone; what carries the claim now is that `source` is recorded on
 *     every activity and reported by the receipt, so the evidence distinguishes what
 *     the learner did from what was done for them. See LEARNER_ONLY below.
 *   - An agent may not propose a replacement for a step the learner has not genuinely
 *     attempted (PROPOSAL_ATTEMPT_GATE). This is the pedagogy firewall.
 *   - During the transfer round the agent may not annotate or propose at all. That
 *     round is what the receipt's "unaided" claim rests on, so it must actually be
 *     unaided.
 */

import { checkDerivation, getFirstIssue } from '../math/derivation'
import { generateProblem, problemSignature } from '../math/problems'
import type { Problem } from '../math/problems'
import {
  DEFAULT_ENV,
  MAX_NOTE_CHARS,
  MAX_STEP_CHARS,
  MAX_STEPS,
  PROPOSAL_ATTEMPT_GATE,
} from './types'
import type {
  ActionResult,
  ActionSource,
  Activity,
  FailureCode,
  InterventionTally,
  ProvenanceCounts,
  SessionAction,
  SessionEnv,
  SessionState,
} from './types'

/**
 * Empty, deliberately.
 *
 * This list used to hold ADD_STEP, EDIT_STEP, REMOVE_STEP, RESOLVE_PROPOSAL and RESET,
 * and every non-learner source was refused them outright. The product's claim was that
 * an agent could not do the learner's work because it was not permitted to.
 *
 * The claim is now different: an agent may take any action the learner can, and every
 * action carries the `ActionSource` that caused it, so the receipt reports the split
 * rather than the guarantee. That is a weaker promise and a more honest one — a
 * permission check in this file never bound anything outside this page, whereas an
 * attribution survives into the evidence a reader actually sees.
 *
 * The array is kept rather than deleted because the mechanism is still the right place
 * to withhold an action, should one ever need withholding.
 */
const LEARNER_ONLY: SessionAction['type'][] = []

function fail(code: FailureCode, message: string, recovery: string, field?: string): ActionResult {
  return { ok: false, code, message, recovery, ...(field ? { field } : {}) }
}

const emptyCounts = (): ProvenanceCounts => ({
  agent: 0,
  localInspector: 0,
  unattributed: 0,
})

const emptyTally = (): InterventionTally => ({
  checks: 0,
  annotations: emptyCounts(),
  proposalsOffered: emptyCounts(),
  proposalsAccepted: emptyCounts(),
})

function incrementForSource(counts: ProvenanceCounts, source: ActionSource): ProvenanceCounts {
  const key = source === 'agent'
    ? 'agent'
    : source === 'local-inspector'
      ? 'localInspector'
      : 'unattributed'
  return { ...counts, [key]: counts[key] + 1 }
}

export function createSession(seed: number, sessionId: string, familyId = 'shared-path'): SessionState {
  const problem = generateProblem(familyId, seed)
  return {
    version: 1,
    sessionId,
    revision: 0,
    round: 'practice',
    problem,
    steps: [],
    report: null,
    annotations: [],
    proposal: null,
    activities: [],
    seenSignatures: [problemSignature(problem)],
    history: [],
    nextStepNumber: 1,
    nextEventNumber: 1,
    tally: emptyTally(),
  }
}

function commit(
  state: SessionState,
  source: ActionSource,
  description: string,
  changes: Partial<SessionState>,
  data: Record<string, unknown>,
  env: SessionEnv,
): ActionResult {
  const revision = state.revision + 1
  const activity: Activity = {
    id: `event-${state.nextEventNumber}`,
    source,
    action: description,
    revision,
    at: env.now(),
  }
  // `changes` may deliberately replace the log - RESET clears it, so that a restarted
  // session does not display the previous session's actions under the same id.
  const base = changes.activities ?? state.activities
  const next: SessionState = {
    ...state,
    ...changes,
    revision,
    nextEventNumber: state.nextEventNumber + 1,
    activities: [...base, activity],
  }
  return { ok: true, state: next, activity, data }
}

/** Any edit invalidates the previous check: the badges no longer describe this work. */
const clearReport = { report: null as SessionState['report'] }

export function applyAction(
  state: SessionState,
  action: SessionAction,
  source: ActionSource,
  env: SessionEnv = DEFAULT_ENV,
): ActionResult {
  if (source !== 'learner' && LEARNER_ONLY.includes(action.type)) {
    return fail(
      'refused_policy',
      'Only the learner can write, edit, delete, or accept work.',
      'Use annotate_step to explain, or propose_step to offer a replacement the learner can accept.',
    )
  }

  switch (action.type) {
    case 'ADD_STEP': {
      const latex = action.latex?.trim() ?? ''
      if (!latex) return fail('invalid_input', 'A step cannot be empty.', 'Write an expression first.')
      if (latex.length > MAX_STEP_CHARS) {
        return fail('invalid_input', `Keep a step under ${MAX_STEP_CHARS} characters.`, 'Shorten the line.')
      }
      if (state.steps.length >= MAX_STEPS) {
        return fail('invalid_phase', `A derivation is limited to ${MAX_STEPS} steps.`, 'Remove a step, or check your work.')
      }
      const step = { id: `step-${state.nextStepNumber}`, latex, attempts: 1 }
      return commit(
        state,
        source,
        `Wrote step ${state.steps.length + 1}`,
        { steps: [...state.steps, step], nextStepNumber: state.nextStepNumber + 1, ...clearReport },
        { stepId: step.id, stepCount: state.steps.length + 1 },
        env,
      )
    }

    case 'EDIT_STEP': {
      const index = state.steps.findIndex((s) => s.id === action.stepId)
      if (index === -1) return fail('not_found', 'That step is not in the scratchpad.', 'Read the scratchpad again for current step ids.', 'stepId')
      const latex = action.latex?.trim() ?? ''
      if (!latex) return fail('invalid_input', 'A step cannot be empty.', 'Write an expression, or remove the step.')
      if (latex.length > MAX_STEP_CHARS) {
        return fail('invalid_input', `Keep a step under ${MAX_STEP_CHARS} characters.`, 'Shorten the line.')
      }
      if (latex === state.steps[index].latex) {
        return fail(
          'invalid_input',
          'That line is unchanged.',
          'Make a genuine revision before saving it as another attempt.',
          'latex',
        )
      }
      const steps = state.steps.map((s, i) =>
        i === index ? { ...s, latex, attempts: s.attempts + 1 } : s,
      )
      // Editing the step a proposal targets makes that proposal stale.
      const proposal = state.proposal?.stepId === action.stepId ? null : state.proposal
      return commit(
        state,
        source,
        `Revised step ${index + 1}`,
        { steps, proposal, ...clearReport },
        { stepId: action.stepId, attempts: steps[index].attempts },
        env,
      )
    }

    case 'REMOVE_STEP': {
      const index = state.steps.findIndex((s) => s.id === action.stepId)
      if (index === -1) return fail('not_found', 'That step is not in the scratchpad.', 'Read the scratchpad again for current step ids.', 'stepId')
      return commit(
        state,
        source,
        `Removed step ${index + 1}`,
        {
          steps: state.steps.filter((s) => s.id !== action.stepId),
          annotations: state.annotations.filter((a) => a.stepId !== action.stepId),
          proposal: state.proposal?.stepId === action.stepId ? null : state.proposal,
          ...clearReport,
        },
        { stepId: action.stepId },
        env,
      )
    }

    case 'CHECK_WORK': {
      if (state.steps.length === 0) {
        return fail('invalid_phase', 'There is nothing to check yet.', 'Write at least one step first.')
      }
      const report = checkDerivation(
        state.steps,
        state.problem.variable,
        state.problem.evaluationPoint,
        state.problem.premiseLatex,
        state.problem.answer,
      )
      // A check is the moment attempts reset: the learner has committed to this work.
      const steps = state.steps.map((s) => ({ ...s, attempts: 0 }))
      const firstIssue = getFirstIssue(report)
      const description = report.allSound
        ? report.reachesAnswer
          ? 'Checked the derivation · sound, and it reaches the answer'
          : 'Checked the derivation · sound, but it does not reach the answer yet'
        : firstIssue
          ? firstIssue.kind === 'broken'
            ? `Checked the derivation · first break at step ${firstIssue.index + 1}`
            : `Checked the derivation · first unresolved line at step ${firstIssue.index + 1}`
          : 'Checked the derivation'
      return commit(
        state,
        source,
        description,
        { report, steps, tally: { ...state.tally, checks: state.tally.checks + 1 } },
        {
          allSound: report.allSound,
          reachesAnswer: report.reachesAnswer,
          firstBrokenStep: firstIssue?.kind === 'broken' ? firstIssue.index + 1 : null,
          firstBrokenId: firstIssue?.kind === 'broken' ? firstIssue.id : null,
          firstBrokenDetail: firstIssue?.kind === 'broken' ? firstIssue.verdict : null,
          firstUnresolvedStep: firstIssue?.kind === 'unresolved' ? firstIssue.index + 1 : null,
          firstUnresolvedId: firstIssue?.kind === 'unresolved' ? firstIssue.id : null,
          firstUnresolvedDetail: firstIssue?.kind === 'unresolved' ? firstIssue.verdict : null,
        },
        env,
      )
    }

    case 'ANNOTATE_STEP': {
      if (state.round === 'transfer') {
        return fail(
          'refused_policy',
          'This is the unaided attempt. Annotations are closed.',
          'Wait for the learner to finish, then read the receipt.',
        )
      }
      const index = state.steps.findIndex((s) => s.id === action.stepId)
      if (index === -1) return fail('not_found', 'That step is not in the scratchpad.', 'Read the scratchpad again for current step ids.', 'stepId')
      const note = action.note?.trim() ?? ''
      if (!note) return fail('invalid_input', 'An annotation needs text.', 'Send a short explanation.')
      if (note.length > MAX_NOTE_CHARS) {
        return fail('invalid_input', `Keep an annotation under ${MAX_NOTE_CHARS} characters.`, 'Shorten the note.')
      }
      const annotation = {
        id: `note-${state.nextEventNumber}`,
        stepId: action.stepId,
        note,
        source,
        revision: state.revision + 1,
        at: env.now(),
      }
      return commit(
        state,
        source,
        `Annotated step ${index + 1}`,
        {
          annotations: [...state.annotations, annotation],
          tally: {
            ...state.tally,
            annotations: incrementForSource(state.tally.annotations, source),
          },
        },
        { annotationId: annotation.id, stepId: action.stepId, focus: action.focus === true },
        env,
      )
    }

    case 'PROPOSE_STEP': {
      if (state.round === 'transfer') {
        return fail(
          'refused_policy',
          'This is the unaided attempt. Proposals are closed.',
          'Wait for the learner to finish, then read the receipt.',
        )
      }
      if (state.proposal) {
        return fail(
          'invalid_phase',
          'The learner is already deciding on a proposal.',
          'Wait for the learner to accept or reject it before offering another replacement.',
        )
      }
      const index = state.steps.findIndex((s) => s.id === action.stepId)
      if (index === -1) return fail('not_found', 'That step is not in the scratchpad.', 'Read the scratchpad again for current step ids.', 'stepId')
      const step = state.steps[index]
      if (step.attempts < PROPOSAL_ATTEMPT_GATE) {
        return fail(
          'refused_policy',
          step.attempts === 0
            ? `The learner has made no attempts on step ${index + 1} since the most recent check. Second Try requires two learner attempts since the most recent check before offering a replacement.`
            : `The learner has made one attempt on step ${index + 1} since the most recent check. Second Try requires two learner attempts since the most recent check before offering a replacement.`,
          'Use annotate_step to explain what is wrong, and let the learner try again.',
        )
      }
      const latex = action.latex?.trim() ?? ''
      if (!latex) return fail('invalid_input', 'A proposal needs an expression.', 'Send the replacement step.')
      if (latex.length > MAX_STEP_CHARS) {
        return fail('invalid_input', `Keep a proposal under ${MAX_STEP_CHARS} characters.`, 'Shorten the line.')
      }
      const rationale = action.rationale?.trim() ?? ''
      if (!rationale) {
        return fail('invalid_input', 'A proposal needs a rationale the learner can read.', 'Explain why this replacement is right.')
      }
      const proposal = {
        id: `proposal-${state.nextEventNumber}`,
        stepId: action.stepId,
        latex,
        rationale: rationale.slice(0, MAX_NOTE_CHARS),
        source,
        revision: state.revision + 1,
        at: env.now(),
      }
      return commit(
        state,
        source,
        `Proposed a replacement for step ${index + 1}`,
        {
          proposal,
          tally: {
            ...state.tally,
            proposalsOffered: incrementForSource(state.tally.proposalsOffered, source),
          },
        },
        { proposalId: proposal.id, status: 'pending_learner_acceptance', stepId: action.stepId },
        env,
      )
    }

    case 'RESOLVE_PROPOSAL': {
      const proposal = state.proposal
      if (!proposal) return fail('invalid_phase', 'There is no pending proposal.', 'Nothing to accept or reject.')
      const index = state.steps.findIndex((s) => s.id === proposal.stepId)
      if (!action.accept) {
        // Rejecting a replacement closes this intervention cycle. The learner must
        // genuinely work on the line again before an agent may make another offer.
        const steps = state.steps.map((s) =>
          s.id === proposal.stepId ? { ...s, attempts: 0 } : s,
        )
        return commit(
          state,
          source,
          `Rejected the proposal for step ${index + 1}`,
          { steps, proposal: null },
          { accepted: false },
          env,
        )
      }
      // Accepting an offered replacement is not a new learner attempt. Reset the
      // gate so another proposal requires the learner to work on this line again.
      const steps = state.steps.map((s) =>
        s.id === proposal.stepId ? { ...s, latex: proposal.latex, attempts: 0 } : s,
      )
      return commit(
        state,
        source,
        `Accepted the proposal for step ${index + 1}`,
        {
          steps,
          proposal: null,
          tally: {
            ...state.tally,
            proposalsAccepted: incrementForSource(
              state.tally.proposalsAccepted,
              proposal.source,
            ),
          },
          ...clearReport,
        },
        { accepted: true, stepId: proposal.stepId },
        env,
      )
    }

    case 'NEW_PROBLEM': {
      if (!state.report) {
        return fail(
          'invalid_phase',
          'The current work has not been checked yet.',
          'Call check_work first, so the fresh problem can target what actually broke.',
        )
      }
      if (!state.report.allSound || !state.report.reachesAnswer) {
        const firstIssue = getFirstIssue(state.report)
        return fail(
          'invalid_phase',
          'The practice derivation is not complete yet.',
          firstIssue?.kind === 'broken'
            ? 'Help the learner repair the first broken step, then call check_work again.'
            : firstIssue?.kind === 'unresolved'
              ? 'Help the learner rewrite the first unresolved line, then call check_work again.'
            : 'Help the learner reach the requested answer, then call check_work again.',
        )
      }
      let problem: Problem
      try {
        problem = generateProblem(action.familyId ?? state.problem.familyId, state.revision * 977 + 13, state.seenSignatures)
      } catch {
        return fail('invalid_input', 'That problem family is not available.', 'Omit familyId to stay in the current family.')
      }
      const summary = {
        round: state.round,
        problemId: state.problem.id,
        sound: state.report.allSound && state.report.reachesAnswer,
        checks: state.tally.checks,
        annotations: state.tally.annotations,
        proposalsAccepted: state.tally.proposalsAccepted,
        proposalsOffered: state.tally.proposalsOffered,
      }
      return commit(
        state,
        source,
        state.round === 'practice' ? 'Started the unaided transfer problem' : 'Started a fresh problem',
        {
          round: 'transfer',
          problem,
          steps: [],
          report: null,
          annotations: [],
          proposal: null,
          history: [...state.history, summary],
          seenSignatures: [...state.seenSignatures, problemSignature(problem)],
          tally: emptyTally(),
        },
        { problemId: problem.id, prompt: problem.prompt, round: 'transfer' },
        env,
      )
    }

    case 'RESET': {
      const fresh = createSession(state.revision * 31 + 7, state.sessionId, state.problem.familyId)
      return commit(
        state,
        source,
        'Restarted the session',
        { ...fresh, revision: state.revision, nextEventNumber: state.nextEventNumber, activities: [] },
        { problemId: fresh.problem.id },
        env,
      )
    }
  }
}
