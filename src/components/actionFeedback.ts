import type { ActionResult, ActionSource } from '../domain/session/types'

export type RefusalFeedback = {
  source: ActionSource
  message: string
  recovery: string
}

export type ActionFeedback = {
  flash: string
  refusal: RefusalFeedback | null
}

export const EMPTY_ACTION_FEEDBACK: ActionFeedback = {
  flash: '',
  refusal: null,
}

/** A successful tool call resolves policy feedback, not the learner's draft error. */
export function actionFeedbackAfterToolSuccess(current: ActionFeedback): ActionFeedback {
  return current.refusal ? { ...current, refusal: null } : current
}

/** Keeps form and policy feedback aligned with the latest action outcome. */
export function actionFeedbackAfterResult(
  current: ActionFeedback,
  result: ActionResult,
  source: ActionSource,
): ActionFeedback {
  if (result.ok) {
    return source === 'learner'
      ? EMPTY_ACTION_FEEDBACK
      : actionFeedbackAfterToolSuccess(current)
  }

  if (result.code === 'refused_policy' && source !== 'learner') {
    return {
      ...current,
      refusal: { source, message: result.message, recovery: result.recovery },
    }
  }

  if (source === 'learner') {
    return { ...current, flash: result.message }
  }

  return current
}
