import type { Problem } from '../math/problems'
import type { DerivationReport } from '../math/derivation'

/**
 * Who caused a state change. Every activity records this, and the receipt is built
 * from it - which is the only reason the product can honestly distinguish what a
 * learner did unaided from what an agent did for them.
 */
export type ActionSource = 'learner' | 'agent' | 'local-inspector'

/** `practice` allows agent help. `transfer` is the unaided attempt. */
export type Round = 'practice' | 'transfer'

export type Step = {
  id: string
  latex: string
  /** Learner writes or edits to this step since it was last checked. Gates `propose_step`. */
  attempts: number
}

export type Annotation = {
  id: string
  stepId: string
  note: string
  source: ActionSource
  revision: number
  at: number
}

export type Proposal = {
  id: string
  stepId: string
  latex: string
  rationale: string
  source: ActionSource
  revision: number
  at: number
}

export type Activity = {
  id: string
  source: ActionSource
  /** Human-readable, rendered directly in the activity list. */
  action: string
  revision: number
  at: number
}

export type ProvenanceCounts = {
  agent: number
  localInspector: number
  /** Counts migrated from sessions saved before actor-specific tallies existed. */
  unattributed: number
}

export type InterventionTally = {
  checks: number
  annotations: ProvenanceCounts
  proposalsOffered: ProvenanceCounts
  proposalsAccepted: ProvenanceCounts
}

export type RoundSummary = {
  round: Round
  problemId: string
  /** Whether the derivation was fully sound when the round ended. */
  sound: boolean
  checks: number
  annotations: ProvenanceCounts
  proposalsAccepted: ProvenanceCounts
  proposalsOffered: ProvenanceCounts
}

export type SessionState = {
  version: 1
  sessionId: string
  revision: number
  round: Round
  problem: Problem
  steps: Step[]
  /** Null until `CHECK_WORK` runs; cleared by any edit, because it is then stale. */
  report: DerivationReport | null
  annotations: Annotation[]
  /** At most one pending proposal: two would make "accept" ambiguous. */
  proposal: Proposal | null
  activities: Activity[]
  /** Problem signatures already served, so a fresh problem is genuinely fresh. */
  seenSignatures: string[]
  history: RoundSummary[]
  /** Counters for deterministic id generation. */
  nextStepNumber: number
  nextEventNumber: number
  /** Per-round tallies, folded into `history` when the round ends. */
  tally: InterventionTally
}

export type SessionAction =
  | { type: 'ADD_STEP'; latex: string }
  | { type: 'EDIT_STEP'; stepId: string; latex: string }
  | { type: 'REMOVE_STEP'; stepId: string }
  | { type: 'CHECK_WORK' }
  | { type: 'ANNOTATE_STEP'; stepId: string; note: string; focus?: boolean }
  | { type: 'PROPOSE_STEP'; stepId: string; latex: string; rationale: string }
  | { type: 'RESOLVE_PROPOSAL'; accept: boolean }
  | { type: 'NEW_PROBLEM'; familyId?: string }
  | { type: 'RESET' }

export type FailureCode =
  | 'invalid_phase'
  | 'invalid_input'
  | 'refused_policy'
  | 'not_found'

export type ActionResult =
  | { ok: true; state: SessionState; activity: Activity; data: Record<string, unknown> }
  | { ok: false; code: FailureCode; message: string; recovery: string }

/** Injected so tests are deterministic and the reducer stays pure. */
export type SessionEnv = { now: () => number }

export const DEFAULT_ENV: SessionEnv = { now: () => Date.now() }

/** The number of learner attempts on a step before an agent may propose a replacement. */
export const PROPOSAL_ATTEMPT_GATE = 2

export const MAX_STEPS = 12
export const MAX_STEP_CHARS = 256
export const MAX_NOTE_CHARS = 400
