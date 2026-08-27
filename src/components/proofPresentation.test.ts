import { describe, expect, it } from 'vitest'
import type { StepVerdict } from '../domain/math/derivation'
import type { ActionSource } from '../domain/session/types'
import type { RegistrationStatus } from '../domain/tools/registry'
import { actorLabel, registrationStatusLabel, relationLabel } from './proofPresentation'

describe('registrationStatusLabel', () => {
  it.each<[RegistrationStatus, string]>([
    [
      { state: 'unsupported', detail: 'Checking this browser…' },
      'Checking page tool availability',
    ],
    [
      { state: 'unsupported', detail: 'This browser does not expose document.modelContext.' },
      'WebMCP unavailable',
    ],
    [{ state: 'live', registered: 6, total: 6 }, '6 page tools available'],
    [
      { state: 'partial', registered: 4, total: 6, failures: ['annotate_step'] },
      '4 of 6 page tools available',
    ],
    [{ state: 'failed', detail: 'Registration threw unexpectedly.' }, 'Page tool registration failed'],
  ])('labels $status.state as %s', (status, label) => {
    expect(registrationStatusLabel(status)).toBe(label)
  })
})

describe('relationLabel', () => {
  it('labels a missing verdict as not checked', () => {
    expect(relationLabel(undefined)).toBe('Not checked')
  })

  it('labels a broken step as does not follow', () => {
    const verdict: StepVerdict = { status: 'broken', reason: 'not_equivalent' }
    expect(relationLabel(verdict)).toBe('Does not follow')
  })

  it('labels a downstream step as after the first break', () => {
    const verdict: StepVerdict = { status: 'downstream' }
    expect(relationLabel(verdict)).toBe('After the first break')
  })

  it('labels a differentiating relation', () => {
    const verdict: StepVerdict = { status: 'sound', relation: 'differentiates' }
    expect(relationLabel(verdict)).toBe('differentiates')
  })

  it('labels the first sound step as starting line', () => {
    const verdict: StepVerdict = { status: 'sound', relation: 'first' }
    expect(relationLabel(verdict)).toBe('Starting line')
  })

  it('labels an unreadable step as could not read', () => {
    const verdict: StepVerdict = { status: 'unreadable', code: 'parse_error', message: 'invalid' }
    expect(relationLabel(verdict)).toBe('Could not read')
  })

  it('labels an uncertain step as could not determine', () => {
    const verdict: StepVerdict = { status: 'uncertain' }
    expect(relationLabel(verdict)).toBe('Could not determine')
  })
})

describe('actorLabel', () => {
  it.each<[ActionSource, string]>([
    ['learner', 'Learner'],
    ['agent', 'Agent'],
    ['local-inspector', 'Local inspection'],
  ])('labels %s as %s', (source, label) => {
    expect(actorLabel(source)).toBe(label)
  })
})
