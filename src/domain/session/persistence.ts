/**
 * Session persistence.
 *
 * The point is narrow: a judge who refreshes mid-demo should not lose the session.
 * That is the whole requirement, so the implementation stays small and fails safe.
 *
 * A stored session is only restored when it is structurally intact and carries the
 * current version. Anything else is discarded to a clean session. A half-restored
 * scratchpad - steps present but verdicts missing, or verdicts describing steps that
 * no longer exist - would let the interface display a badge that no longer refers to
 * anything, which is worse than starting over.
 */

import type { SessionState } from './types'
import { MAX_NOTE_CHARS, MAX_STEPS, MAX_STEP_CHARS } from './types'

export const STORAGE_KEY = 'second-try.session.v1'
export const STORAGE_VERSION = 1

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isString = (value: unknown, max = Number.POSITIVE_INFINITY): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0

const isSource = (value: unknown) =>
  value === 'learner' || value === 'agent' || value === 'local-inspector'

const isRound = (value: unknown) => value === 'practice' || value === 'transfer'

function isProblem(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!isString(value.id) || !isString(value.familyId) || !isCount(value.seed)) return false
  if (!isString(value.variable) || !isFiniteNumber(value.evaluationPoint)) return false
  if (!isString(value.prompt) || !isString(value.resultName) || !isString(value.premiseLatex)) return false
  if (!Array.isArray(value.definitions) || value.definitions.length === 0) return false
  for (const definition of value.definitions) {
    if (!isRecord(definition) || !isString(definition.name) || !isString(definition.latex)) return false
  }
  if (!isRecord(value.answer) || !isString(value.answer.latex) || !isFiniteNumber(value.answer.value)) return false
  if (!Array.isArray(value.errorModes)) return false
  for (const mode of value.errorModes) {
    if (
      !isRecord(mode) ||
      !isString(mode.id) ||
      !isString(mode.label) ||
      !isString(mode.teach) ||
      !isString(mode.latex) ||
      !isFiniteNumber(mode.value)
    ) return false
  }
  return true
}

function isProvenanceCounts(value: unknown): boolean {
  return (
    isRecord(value) &&
    isCount(value.agent) &&
    isCount(value.localInspector) &&
    isCount(value.unattributed)
  )
}

function isTally(value: unknown): boolean {
  return (
    isRecord(value) &&
    isCount(value.checks) &&
    isProvenanceCounts(value.annotations) &&
    isProvenanceCounts(value.proposalsOffered) &&
    isProvenanceCounts(value.proposalsAccepted)
  )
}

const migratedCounts = (value: unknown) =>
  isCount(value)
    ? { agent: 0, localInspector: 0, unattributed: value }
    : value

/** Preserves old totals as unattributed instead of falsely assigning an actor. */
function migrateLegacyInterventionCounts(value: unknown): unknown {
  if (!isRecord(value) || value.version !== STORAGE_VERSION) return value
  if (isRecord(value.tally)) {
    // Sessions saved before line authorship was recorded have no stepWrites. They are
    // migrated to zeroes rather than discarded: the counts are unknown for that round,
    // and zero is the only honest stand-in that keeps the session loadable.
    if (!isRecord(value.tally.stepWrites)) {
      value.tally.stepWrites = { learner: 0, agent: 0, localInspector: 0 }
    }
    value.tally.annotations = migratedCounts(value.tally.annotations)
    value.tally.proposalsOffered = migratedCounts(value.tally.proposalsOffered)
    value.tally.proposalsAccepted = migratedCounts(value.tally.proposalsAccepted)
  }
  if (Array.isArray(value.history)) {
    for (const summary of value.history) {
      if (!isRecord(summary)) continue
      summary.annotations = migratedCounts(
        summary.annotations ?? summary.agentAnnotations,
      )
      summary.proposalsOffered = migratedCounts(
        summary.proposalsOffered ?? summary.agentProposalsOffered,
      )
      summary.proposalsAccepted = migratedCounts(
        summary.proposalsAccepted ?? summary.agentProposalsAccepted,
      )
    }
  }
  return value
}

/**
 * Structural validation. This is not a schema library; it checks the invariants the
 * interface actually depends on.
 */
export function isRestorable(value: unknown): value is SessionState {
  if (!isRecord(value)) return false
  if (value.version !== STORAGE_VERSION) return false
  if (typeof value.sessionId !== 'string' || !value.sessionId) return false
  if (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 0) return false
  if (!isRound(value.round)) return false
  if (!isProblem(value.problem)) return false
  if (!Array.isArray(value.steps) || value.steps.length > MAX_STEPS || !Array.isArray(value.activities)) return false
  if (!Array.isArray(value.annotations) || !Array.isArray(value.history)) return false
  if (!Array.isArray(value.seenSignatures) || !value.seenSignatures.every((item) => typeof item === 'string')) return false
  if (!isTally(value.tally)) return false
  if (!isCount(value.nextStepNumber) || !isCount(value.nextEventNumber)) return false

  const ids = new Set<string>()
  for (const step of value.steps) {
    if (!isRecord(step)) return false
    if (!isString(step.id, 64) || !isString(step.latex, MAX_STEP_CHARS)) return false
    if (!isCount(step.attempts)) return false
    if (ids.has(step.id)) return false
    ids.add(step.id)
  }

  // A verdict that refers to a step which no longer exists would render a badge
  // against nothing. Discard rather than display it.
  if (value.report !== null) {
    if (!isRecord(value.report) || !isRecord(value.report.verdicts)) return false
    if (typeof value.report.allSound !== 'boolean' || typeof value.report.reachesAnswer !== 'boolean') return false
    if (value.report.firstBrokenIndex !== null && !isCount(value.report.firstBrokenIndex)) return false
    if (value.report.firstBrokenId !== null && typeof value.report.firstBrokenId !== 'string') return false
    for (const stepId of Object.keys(value.report.verdicts)) {
      if (!ids.has(stepId)) return false
      const verdict = value.report.verdicts[stepId]
      if (!isRecord(verdict) || !['sound', 'broken', 'uncertain', 'unreadable', 'downstream'].includes(String(verdict.status))) return false
    }
  }
  for (const annotation of value.annotations) {
    if (
      !isRecord(annotation) ||
      !isString(annotation.id, 64) ||
      !isString(annotation.stepId, 64) ||
      !isString(annotation.note, MAX_NOTE_CHARS) ||
      !isSource(annotation.source) ||
      !isCount(annotation.revision) ||
      !isFiniteNumber(annotation.at)
    ) return false
    if (!ids.has(annotation.stepId)) return false
  }
  if (value.proposal !== null) {
    if (
      !isRecord(value.proposal) ||
      !isString(value.proposal.id, 64) ||
      !isString(value.proposal.stepId, 64) ||
      !isString(value.proposal.latex, MAX_STEP_CHARS) ||
      !isString(value.proposal.rationale, MAX_NOTE_CHARS) ||
      !isSource(value.proposal.source) ||
      !isCount(value.proposal.revision) ||
      !isFiniteNumber(value.proposal.at)
    ) return false
    if (!ids.has(value.proposal.stepId)) return false
  }
  for (const activity of value.activities) {
    if (
      !isRecord(activity) ||
      !isString(activity.id, 64) ||
      !isSource(activity.source) ||
      !isString(activity.action) ||
      !isCount(activity.revision) ||
      !isFiniteNumber(activity.at)
    ) return false
  }
  for (const summary of value.history) {
    if (
      !isRecord(summary) ||
      !isRound(summary.round) ||
      !isString(summary.problemId) ||
      typeof summary.sound !== 'boolean' ||
      !isCount(summary.checks) ||
      !isProvenanceCounts(summary.annotations) ||
      !isProvenanceCounts(summary.proposalsAccepted) ||
      !isProvenanceCounts(summary.proposalsOffered)
    ) return false
  }
  return true
}

export function saveSession(state: SessionState, storage: Storage | undefined = safeStorage()): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota, private mode, or a disabled store. Persistence is a convenience; losing
    // it must never break the session in progress.
  }
}

export function loadSession(storage: Storage | undefined = safeStorage()): SessionState | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed: unknown = migrateLegacyInterventionCounts(JSON.parse(raw))
    if (!isRestorable(parsed)) {
      clearSession(storage)
      return null
    }
    return parsed
  } catch {
    clearSession(storage)
    return null
  }
}

export function clearSession(storage: Storage | undefined = safeStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    /* see saveSession */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    // Some browsers throw on access when site data is blocked.
    return undefined
  }
}
