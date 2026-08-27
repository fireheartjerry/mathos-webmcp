import type { StepVerdict } from '../domain/math/derivation'
import type { ActionSource } from '../domain/session/types'

export function actorLabel(source: ActionSource): string {
  switch (source) {
    case 'learner':
      return 'Learner'
    case 'agent':
      return 'Agent'
    case 'local-inspector':
      return 'Local inspection'
  }
}

export function relationLabel(verdict: StepVerdict | undefined): string {
  if (!verdict) return 'Not checked'

  switch (verdict.status) {
    case 'broken':
      return 'Does not follow'
    case 'downstream':
      return 'After the first break'
    case 'unreadable':
      return 'Could not read'
    case 'uncertain':
      return 'Could not determine'
    case 'sound':
      return verdict.relation === 'first' ? 'Starting line' : verdict.relation
  }
}
