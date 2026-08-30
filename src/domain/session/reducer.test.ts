import { describe, expect, it } from 'vitest'
import { applyAction, createSession } from './reducer'
import type { ActionSource, SessionAction, SessionState } from './types'
import { PROPOSAL_ATTEMPT_GATE } from './types'

const ENV = { now: () => 1_000_000 }

const start = () => createSession(2026, 'session-test')

function run(state: SessionState, action: SessionAction, source: ActionSource = 'learner') {
  const result = applyAction(state, action, source, ENV)
  if (!result.ok) throw new Error(`${action.type} failed: ${result.code} ${result.message}`)
  return result.state
}

/** A correct three-line derivation for whatever problem this session generated. */
function soundWork(state: SessionState) {
  const a = state.problem.definitions[0].latex
  const b = state.problem.definitions[1].latex
  return [
    `(${a})\\cdot(${b}) + (${a})`,
    state.problem.answer.latex,
    String(state.problem.answer.value),
  ]
}

describe('revisions and the activity log', () => {
  it('increments the revision on every commit and never reuses one', () => {
    let state = start()
    const seen = new Set([state.revision])
    for (const latex of ['x^2', 'x^3', 'x^4']) {
      state = run(state, { type: 'ADD_STEP', latex })
      expect(seen.has(state.revision)).toBe(false)
      seen.add(state.revision)
    }
    expect(state.revision).toBe(3)
  })

  it('does not advance the revision when an action is refused', () => {
    const state = start()
    const before = state.revision
    const result = applyAction(state, { type: 'CHECK_WORK' }, 'learner', ENV)
    expect(result.ok).toBe(false)
    expect(state.revision).toBe(before)
  })

  it('records the source of every action', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' }, 'learner')
    state = run(state, { type: 'CHECK_WORK' }, 'agent')
    expect(state.activities.map((a) => a.source)).toEqual(['learner', 'agent'])
  })
})

describe('who is allowed to do what', () => {
  // These five actions used to be refused outright when the source was not the
  // learner. They are now allowed, and what carries the product's claim instead is
  // that each one records who caused it. The assertion therefore moves from "an agent
  // is stopped" to "an agent is attributed" - a weaker promise, and one that survives
  // into the receipt rather than living only in this file.
  it.each<[SessionAction, ActionSource]>([
    [{ type: 'ADD_STEP', latex: 'x' }, 'agent'],
    [{ type: 'RESET' }, 'agent'],
  ])('allows %s from an agent and records the source', (action, source) => {
    const result = applyAction(start(), action, source, ENV)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.activity.source).toBe(source)
  })

  it('attributes an agent edit and a learner edit differently', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const byAgent = applyAction(state, { type: 'EDIT_STEP', stepId: state.steps[0].id, latex: '2x' }, 'agent', ENV)
    expect(byAgent.ok).toBe(true)
    if (byAgent.ok) {
      expect(byAgent.activity.source).toBe('agent')
      expect(byAgent.state.activities.at(-1)?.source).toBe('agent')
      expect(byAgent.state.activities.some((a) => a.source === 'learner')).toBe(true)
    }
  })

  it('lets an agent check work', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const result = applyAction(state, { type: 'CHECK_WORK' }, 'agent', ENV)
    expect(result.ok).toBe(true)
  })
})

describe('the pedagogy firewall', () => {
  it('refuses a proposal before the learner has really tried', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const result = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '2x', rationale: 'because' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('refused_policy')
      expect(result.message).toBe(
        'The learner has made one attempt on step 1 since the most recent check. Second Try requires two learner attempts since the most recent check before offering a replacement.',
      )
      expect(result.recovery).toContain('annotate_step')
    }
  })

  it('allows a proposal once the gate is met', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    for (let i = 1; i < PROPOSAL_ATTEMPT_GATE; i++) {
      state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: `x^${2 + i}` })
    }
    const result = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '2x', rationale: 'the power rule' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('pending_learner_acceptance')
  })

  it('never applies a proposal by itself', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: 'WRONG', rationale: 'r' },
      'agent',
    )
    expect(state.steps[0].latex).toBe('x^3')
    expect(state.proposal).not.toBeNull()
  })

  it('applies it only when the learner accepts', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'r' }, 'agent')
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: true })
    expect(state.steps[0].latex).toBe('5x')
    expect(state.proposal).toBeNull()
  })

  it('requires a new genuine attempt before another proposal after acceptance', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'r' }, 'agent')
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: true })
    const second = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '6x', rationale: 'again' },
      'agent',
      ENV,
    )
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('refused_policy')
  })

  it('discards a proposal the learner rejects', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'r' }, 'agent')
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: false })
    expect(state.steps[0].latex).toBe('x^3')
    expect(state.proposal).toBeNull()
  })

  it('requires a new genuine attempt before another proposal after rejection', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'r' }, 'agent')
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: false })

    const second = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '6x', rationale: 'again' },
      'agent',
      ENV,
    )

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('refused_policy')
  })

  it('does not overwrite a proposal while the learner is deciding', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'first' }, 'agent')
    const original = state.proposal

    const second = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '6x', rationale: 'second' },
      'agent',
      ENV,
    )

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('invalid_phase')
    expect(state.proposal).toEqual(original)
  })

  it('drops a proposal that the learner has edited past', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x', rationale: 'r' }, 'agent')
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^4' })
    expect(state.proposal).toBeNull()
  })

  it('does not count saving the identical expression as another learner attempt', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const before = state
    const result = applyAction(
      state,
      { type: 'EDIT_STEP', stepId: 'step-1', latex: '  x^2  ' },
      'learner',
      ENV,
    )
    expect(result.ok).toBe(false)
    expect(state.steps[0].attempts).toBe(before.steps[0].attempts)
    expect(state.revision).toBe(before.revision)
  })
})

describe('checking', () => {
  it('finds the first broken step and reports its 1-based position', () => {
    let state = start()
    for (const latex of soundWork(state).slice(0, 2)) state = run(state, { type: 'ADD_STEP', latex })
    state = run(state, { type: 'ADD_STEP', latex: '0' })
    const result = applyAction(state, { type: 'CHECK_WORK' }, 'learner', ENV)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.allSound).toBe(false)
      expect(result.data.firstBrokenStep).toBe(3)
    }
  })

  it('records an unreadable line as unresolved without claiming a break', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: '((((' })
    const result = applyAction(state, { type: 'CHECK_WORK' }, 'learner', ENV)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.activity.action).toBe(
        'Checked the derivation · first unresolved line at step 1',
      )
      expect(result.data.firstBrokenStep).toBeNull()
      expect(result.data.firstUnresolvedStep).toBe(1)
      expect(result.data.firstUnresolvedDetail).toEqual(
        expect.objectContaining({ status: 'unreadable' }),
      )
    }
  })

  it('records an uncertain relation as unresolved without claiming a break', () => {
    let state = start()
    state = {
      ...state,
      problem: {
        ...state.problem,
        variable: 'x',
        premiseLatex: 'x',
        answer: { latex: '1', value: 1 },
      },
    }
    state = run(state, { type: 'ADD_STEP', latex: 'e^{\\ln x}' })
    const result = applyAction(state, { type: 'CHECK_WORK' }, 'learner', ENV)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.activity.action).toBe(
        'Checked the derivation · first unresolved line at step 1',
      )
      expect(result.data.firstBrokenStep).toBeNull()
      expect(result.data.firstUnresolvedDetail).toEqual({ status: 'uncertain' })
    }
  })

  it('passes a fully sound derivation', () => {
    let state = start()
    for (const latex of soundWork(state)) state = run(state, { type: 'ADD_STEP', latex })
    state = run(state, { type: 'CHECK_WORK' })
    expect(state.report?.allSound).toBe(true)
  })

  it('refuses to check nothing', () => {
    const result = applyAction(start(), { type: 'CHECK_WORK' }, 'learner', ENV)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_phase')
  })

  it('invalidates the report when the work changes', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'CHECK_WORK' })
    expect(state.report).not.toBeNull()
    state = run(state, { type: 'ADD_STEP', latex: '2x' })
    expect(state.report).toBeNull()
  })
})

describe('the transfer round', () => {
  const reachTransfer = () => {
    let state = start()
    for (const latex of soundWork(state)) state = run(state, { type: 'ADD_STEP', latex })
    state = run(state, { type: 'CHECK_WORK' })
    return run(state, { type: 'NEW_PROBLEM' }, 'agent')
  }

  it('requires a check before a fresh problem, so it can target what broke', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const result = applyAction(state, { type: 'NEW_PROBLEM' }, 'agent', ENV)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_phase')
  })

  it('refuses transfer until the practice derivation is sound and reaches the answer', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: '999x' })
    state = run(state, { type: 'CHECK_WORK' })
    const result = applyAction(state, { type: 'NEW_PROBLEM' }, 'agent', ENV)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('invalid_phase')
      expect(result.recovery).toContain('repair')
    }
  })

  it('serves a genuinely different problem', () => {
    const before = start()
    const after = reachTransfer()
    expect(after.problem.id).not.toBe(before.problem.id)
    expect(after.round).toBe('transfer')
    expect(after.steps).toEqual([])
  })

  it('closes annotations during the unaided attempt', () => {
    let state = reachTransfer()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const result = applyAction(
      state,
      { type: 'ANNOTATE_STEP', stepId: 'step-3', note: 'hint' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('refused_policy')
  })

  it('closes proposals during the unaided attempt', () => {
    let state = reachTransfer()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: state.steps[0].id, latex: 'x^3' })
    const result = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: state.steps[0].id, latex: 'x', rationale: 'r' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('refused_policy')
  })

  it('records agent and local-inspector intervention provenance separately', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    state = run(state, { type: 'ANNOTATE_STEP', stepId: 'step-1', note: 'agent note' }, 'agent')
    state = run(
      state,
      { type: 'ANNOTATE_STEP', stepId: 'step-1', note: 'inspector note' },
      'local-inspector',
    )
    state = run(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '3x^2', rationale: 'agent offer' },
      'agent',
    )
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: false })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^4' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^5' })
    state = run(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '5x^4', rationale: 'inspector offer' },
      'local-inspector',
    )
    state = run(state, { type: 'RESOLVE_PROPOSAL', accept: true })

    expect(state.tally.annotations).toEqual({ agent: 1, localInspector: 1, unattributed: 0 })
    expect(state.tally.proposalsOffered).toEqual({ agent: 1, localInspector: 1, unattributed: 0 })
    expect(state.tally.proposalsAccepted).toEqual({ agent: 0, localInspector: 1, unattributed: 0 })

    state = {
      ...state,
      report: {
        verdicts: {},
        firstBrokenIndex: null,
        firstBrokenId: null,
        allSound: true,
        reachesAnswer: true,
      },
    }
    state = run(state, { type: 'NEW_PROBLEM' }, 'agent')
    expect(state.history).toHaveLength(1)
    expect(state.history[0].annotations).toEqual({ agent: 1, localInspector: 1, unattributed: 0 })
    expect(state.history[0].proposalsAccepted).toEqual({ agent: 0, localInspector: 1, unattributed: 0 })
  })
})

describe('reset', () => {
  it('clears the work, the annotations and the activity log', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'ANNOTATE_STEP', stepId: 'step-1', note: 'n' }, 'agent')
    state = run(state, { type: 'RESET' })
    expect(state.steps).toEqual([])
    expect(state.annotations).toEqual([])
    expect(state.round).toBe('practice')
    // The previous session's actions must not survive under the same session id.
    expect(state.activities).toHaveLength(1)
    expect(state.activities[0].action).toBe('Restarted the session')
  })

  it('keeps the revision monotonic across a reset', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    const before = state.revision
    state = run(state, { type: 'RESET' })
    expect(state.revision).toBeGreaterThan(before)
  })
})

describe('input limits', () => {
  it('rejects an empty step', () => {
    const result = applyAction(start(), { type: 'ADD_STEP', latex: '   ' }, 'learner', ENV)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_input')
  })

  it('rejects an over-long step', () => {
    const result = applyAction(start(), { type: 'ADD_STEP', latex: 'x'.repeat(500) }, 'learner', ENV)
    expect(result.ok).toBe(false)
  })

  it('rejects an unknown step id rather than silently doing nothing', () => {
    const result = applyAction(
      start(),
      { type: 'ANNOTATE_STEP', stepId: 'nope', note: 'n' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('not_found')
  })

  it('requires a rationale on a proposal', () => {
    let state = start()
    state = run(state, { type: 'ADD_STEP', latex: 'x^2' })
    state = run(state, { type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    const result = applyAction(
      state,
      { type: 'PROPOSE_STEP', stepId: 'step-1', latex: '2x', rationale: '' },
      'agent',
      ENV,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_input')
  })
})
