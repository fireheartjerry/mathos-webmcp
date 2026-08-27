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

/** Keeps form and policy feedback aligned with the latest action outcome. */
export function actionFeedbackAfterResult(
  current: ActionFeedback,
  result: ActionResult,
  source: ActionSource,
): ActionFeedback {
  if (result.ok) return EMPTY_ACTION_FEEDBACK

  if (result.code === 'refused_policy' && source !== 'learner') {
    return {
      flash: '',
      refusal: { source, message: result.message, recovery: result.recovery },
    }
  }

  if (source === 'learner') {
    return { ...current, flash: result.message }
  }

  return current
}
