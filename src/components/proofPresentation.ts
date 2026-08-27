import { getFirstIssue } from '../domain/math/derivation'
import type { DerivationIssue, DerivationReport, StepVerdict } from '../domain/math/derivation'
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

export function registrationAllowsDirectCalls(status: RegistrationStatus): boolean {
  return status.state === 'live' || (status.state === 'partial' && status.registered > 0)
}

export function registrationRecovery(status: RegistrationStatus): string | null {
  if (status.state !== 'partial') return null
  return `Only ${status.registered} of ${status.total} page tools were confirmed. Missing: ${status.failures.join(', ')}. Reload this page once; if they remain missing, use a supported Chrome/WebMCP setup.`
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

export function relationLabel(
  verdict: StepVerdict | undefined,
  firstIssueKind?: DerivationIssue['kind'],
): string {
  if (!verdict) return 'Not checked'

  switch (verdict.status) {
    case 'broken':
      return 'Does not follow'
    case 'downstream':
      return firstIssueKind === 'unresolved'
        ? 'Not checked after the unresolved line'
        : 'After the first break'
    case 'unreadable':
      return 'Could not read'
    case 'uncertain':
      return 'Could not determine'
    case 'sound':
      return verdict.relation === 'first' ? 'Starting line' : verdict.relation
  }
}

export function isBrokenVerdict(verdict: StepVerdict | undefined): boolean {
  return verdict?.status === 'broken'
}

export function reportStatusMessage(report: DerivationReport | null): string {
  if (!report) return ''
  if (report.allSound) {
    return report.reachesAnswer
      ? 'Every line follows, and the last one is the answer this problem asked for.'
      : 'Every line follows from the one above it — but this is not yet the answer the problem asked for.'
  }

  const issue = getFirstIssue(report)
  if (!issue) return ''
  return issue.kind === 'broken'
    ? `Line ${issue.index + 1} is the first that does not follow.`
    : `Line ${issue.index + 1} is the first unresolved line.`
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
