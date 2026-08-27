import { describe, expect, it } from 'vitest'
import type { StepVerdict } from '../domain/math/derivation'
import type { ActionSource } from '../domain/session/types'
import { actorLabel, relationLabel } from './proofPresentation'

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
