import type { StepVerdict } from '../domain/math/derivation'
import type { ActionSource } from '../domain/session/types'
import type { RegistrationStatus } from '../domain/tools/registry'

export function registrationStatusLabel(status: RegistrationStatus): string {
  switch (status.state) {
    case 'live':
      return `${status.registered} page tools available`
    case 'partial':
      return `${status.registered} of ${status.total} page tools available`
    case 'failed':
      return 'Page tool registration failed'
    case 'unsupported':
      return status.detail.startsWith('Checking')
        ? 'Checking page tool availability'
        : 'WebMCP unavailable'
  }
}

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

export function relationDetail(verdict: StepVerdict | undefined): string | null {
  if (!verdict) return null

  switch (verdict.status) {
    case 'uncertain':
      return 'The page engine could not verify this relation. Rewrite it in a simpler equivalent form, then check again.'
    case 'unreadable': {
      const parserMessage = verdict.message.trim()
      const separator = /[.!?]$/.test(parserMessage) ? ' ' : '. '
      return `${parserMessage}${separator}Rewrite it as a complete expression, then check again.`
    }
    default:
      return null
  }
}
