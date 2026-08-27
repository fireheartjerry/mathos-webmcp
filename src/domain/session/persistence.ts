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

export const STORAGE_KEY = 'second-try.session.v1'
export const STORAGE_VERSION = 1

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  if (value.round !== 'practice' && value.round !== 'transfer') return false
  if (!isRecord(value.problem) || typeof value.problem.variable !== 'string') return false
  if (!Array.isArray(value.steps) || !Array.isArray(value.activities)) return false
  if (!Array.isArray(value.annotations) || !Array.isArray(value.history)) return false
  if (!isRecord(value.tally)) return false
  if (typeof value.nextStepNumber !== 'number' || typeof value.nextEventNumber !== 'number') return false

  const ids = new Set<string>()
  for (const step of value.steps) {
    if (!isRecord(step)) return false
    if (typeof step.id !== 'string' || typeof step.latex !== 'string') return false
    if (typeof step.attempts !== 'number') return false
    if (ids.has(step.id)) return false
    ids.add(step.id)
  }

  // A verdict that refers to a step which no longer exists would render a badge
  // against nothing. Discard rather than display it.
  if (value.report !== null) {
    if (!isRecord(value.report) || !isRecord(value.report.verdicts)) return false
    for (const stepId of Object.keys(value.report.verdicts)) {
      if (!ids.has(stepId)) return false
    }
  }
  for (const annotation of value.annotations) {
    if (!isRecord(annotation) || typeof annotation.stepId !== 'string') return false
    if (!ids.has(annotation.stepId)) return false
  }
  if (value.proposal !== null) {
    if (!isRecord(value.proposal) || typeof value.proposal.stepId !== 'string') return false
    if (!ids.has(value.proposal.stepId)) return false
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
    const parsed: unknown = JSON.parse(raw)
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
