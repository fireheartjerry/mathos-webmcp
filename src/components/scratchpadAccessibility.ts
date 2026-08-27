import type { ActionSource } from '../domain/session/types'
import { actorLabel } from './proofPresentation'

export function stepExpressionAccessibleName(position: number, latex: string): string {
  return `Line ${position}: ${latex}. Select to rewrite this expression.`
}

export function interventionLiveMessage(
  source: ActionSource,
  kind: 'annotation' | 'proposal',
  position: number,
): string {
  const actor = actorLabel(source)
  return kind === 'proposal'
    ? `${actor} proposed a replacement for line ${position}. Choose Use this or Keep mine.`
    : `${actor} added an annotation to line ${position}.`
}

export function proposalDecisionLiveMessage(accepted: boolean, position: number): string {
  return `Replacement ${accepted ? 'accepted' : 'rejected'} for line ${position}. Focus returned to that line.`
}
