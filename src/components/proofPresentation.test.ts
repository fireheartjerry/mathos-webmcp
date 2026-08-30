import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkDerivation, getFirstIssue } from '../domain/math/derivation'
import type { DerivationIssue, StepVerdict } from '../domain/math/derivation'
import type { ActionSource } from '../domain/session/types'
import type { RegistrationStatus } from '../domain/tools/registry'
import {
  actorLabel,
  isBrokenVerdict,
  registrationAllowsDirectCalls,
  registrationRecovery,
  registrationStatusLabel,
  relationDetail,
  relationLabel,
  reportStatusMessage,
} from './proofPresentation'

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

describe('partial registration recovery', () => {
  it('does not treat zero confirmed tools as connected', () => {
    const status: RegistrationStatus = {
      state: 'partial',
      registered: 0,
      total: 6,
      failures: ['get_scratchpad'],
    }
    expect(registrationAllowsDirectCalls(status)).toBe(false)
    expect(registrationRecovery(status)).toBe(
      'Only 0 of 6 page tools were confirmed. Missing: get_scratchpad. Reload this page once; if they remain missing, use a supported Chrome/WebMCP setup.',
    )
  })

  it('keeps a usable partial connection and gives actionable recovery', () => {
    const status: RegistrationStatus = {
      state: 'partial',
      registered: 2,
      total: 6,
      failures: ['annotate_step', 'propose_step'],
    }
    expect(registrationAllowsDirectCalls(status)).toBe(true)
    expect(registrationRecovery(status)).toBe(
      'Only 2 of 6 page tools were confirmed. Missing: annotate_step, propose_step. Reload this page once; if they remain missing, use a supported Chrome/WebMCP setup.',
    )
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
    expect(relationLabel(verdict, 'broken')).toBe('After the first break')
  })

  it('labels a line after unreadable work as not checked after the unresolved line', () => {
    const report = checkDerivation(
      [
        { id: 's1', latex: 'x' },
        { id: 's2', latex: '((((' },
        { id: 's3', latex: 'x' },
      ],
      'x',
    )
    expect(report.verdicts.s3).toEqual({ status: 'downstream' })
    expect(relationLabel(report.verdicts.s3, getFirstIssue(report)?.kind)).toBe(
      'Not checked after the unresolved line',
    )
  })

  it('labels a line after an uncertain comparison as not checked after the unresolved line', () => {
    const report = checkDerivation(
      [
        { id: 's1', latex: 'x' },
        { id: 's2', latex: 'e^{\\ln x}' },
        { id: 's3', latex: 'x' },
      ],
      'x',
    )
    expect(report.verdicts.s2).toEqual({ status: 'uncertain' })
    expect(report.verdicts.s3).toEqual({ status: 'downstream' })
    expect(relationLabel(report.verdicts.s3, getFirstIssue(report)?.kind)).toBe(
      'Not checked after the unresolved line',
    )
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

describe('relationDetail', () => {
  it('gives an uncertain step a useful recovery path', () => {
    const verdict: StepVerdict = { status: 'uncertain' }
    expect(relationDetail(verdict)).toBe(
      'The page engine could not verify this relation. Rewrite it in a simpler equivalent form, then check again.',
    )
  })

  it('preserves parser detail and adds a concrete recovery for an unreadable step', () => {
    const verdict: StepVerdict = {
      status: 'unreadable',
      code: 'parse_error',
      message: 'Use a complete expression.',
    }
    expect(relationDetail(verdict)).toBe(
      'Use a complete expression. Rewrite it as a complete expression, then check again.',
    )
  })

  it('makes the generic unreadable parser message actionable', () => {
    const verdict: StepVerdict = {
      status: 'unreadable',
      code: 'parse_error',
      message: 'That expression could not be read.',
    }
    expect(relationDetail(verdict)).toBe(
      'That expression could not be read. Rewrite it as a complete expression, then check again.',
    )
  })

  it('does not invent detail for a checked step', () => {
    const verdict: StepVerdict = { status: 'sound', relation: 'equals' }
    expect(relationDetail(verdict)).toBeNull()
  })
})

describe('unresolved report presentation', () => {
  it('does not style unreadable or uncertain relations as broken', () => {
    expect(
      isBrokenVerdict({
        status: 'unreadable',
        code: 'parse_error',
        message: 'That expression could not be read.',
      }),
    ).toBe(false)
    expect(isBrokenVerdict({ status: 'uncertain' })).toBe(false)
    expect(isBrokenVerdict({ status: 'broken', reason: 'not_equivalent' })).toBe(true)
  })

  it('calls an unreadable first issue unresolved, not a broken relation', () => {
    expect(
      reportStatusMessage({
        verdicts: {
          'step-2': {
            status: 'unreadable',
            code: 'parse_error',
            message: 'That expression could not be read.',
          },
        },
        firstBrokenIndex: 1,
        firstBrokenId: 'step-2',
        allSound: false,
        reachesAnswer: false,
      }),
    ).toBe('Line 2 is the first unresolved line.')
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

/**
 * The README tells a judge, step by step, what to look for on screen. Step 4 named the
 * badges — and named them wrong: it said a proven failure reads "not equivalent" when
 * the page has always rendered "Does not follow". A judge following the instructions
 * literally would have gone looking for a string that is not in the product.
 *
 * Wording is allowed to change. What is not allowed is for it to change on screen and
 * not in the document that promises it, so the promise is now a test.
 */
describe('the verdict labels the README quotes', () => {
  const README = readFileSync('README.md', 'utf8')

  const LABELS: Array<[string, StepVerdict, DerivationIssue['kind'] | undefined]> = [
    ['Does not follow', { status: 'broken', reason: 'not_equivalent' } as StepVerdict, undefined],
    ['After the first break', { status: 'downstream' } as StepVerdict, 'broken'],
    ['Not checked after the unresolved line', { status: 'downstream' } as StepVerdict, 'unresolved'],
    ['Could not read', { status: 'unreadable' } as StepVerdict, undefined],
    ['Could not determine', { status: 'uncertain' } as StepVerdict, undefined],
    ['Starting line', { status: 'sound', relation: 'first' } as StepVerdict, undefined],
    ['equals', { status: 'sound', relation: 'equals' } as StepVerdict, undefined],
    ['differentiates', { status: 'sound', relation: 'differentiates' } as StepVerdict, undefined],
    ['evaluates', { status: 'sound', relation: 'evaluates' } as StepVerdict, undefined],
  ]

  it.each(LABELS)('%s is what the page renders', (label, verdict, kind) => {
    expect(relationLabel(verdict, kind)).toBe(label)
  })

  it.each(LABELS)('%s is what the README tells a judge to look for', (label) => {
    expect(README).toContain(label)
  })

  it('does not leave the old wording in the README', () => {
    // The exact string that was wrong, so this test fails if it is ever pasted back.
    expect(README).not.toContain('reads `not equivalent`')
  })
})
