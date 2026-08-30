import { describe, expect, it, beforeEach } from 'vitest'
import { createTools } from './definitions'
import type { ToolBridge, ToolDefinition } from './definitions'
import { applyAction, createSession } from '../session/reducer'
import type { SessionAction, SessionState } from '../session/types'

const ENV = { now: () => 1_000_000 }

function harness(initial?: SessionState, onToolSuccess: () => void = () => {}) {
  let state: SessionState | null = initial ?? createSession(2026, 'session-tools')
  const bridge: ToolBridge = {
    getState: () => state,
    run: async (action: SessionAction) => {
      const result = applyAction(state as SessionState, action, 'agent', ENV)
      if (result.ok) state = result.state
      return result
    },
    requestCache: new Map(),
    onToolSuccess,
    probePlatform: async () => [],
  }
  const tools = createTools(bridge)
  const byName = (name: string) => tools.find((t) => t.name === name) as ToolDefinition
  return {
    tools,
    byName,
    get state() {
      return state as SessionState
    },
    unmount: () => {
      state = null
    },
    /** Applies a learner action directly, as the UI would. */
    learner: (action: SessionAction) => {
      const result = applyAction(state as SessionState, action, 'learner', ENV)
      if (!result.ok) throw new Error(`${action.type}: ${result.message}`)
      state = result.state
    },
  }
}

let h: ReturnType<typeof harness>
beforeEach(() => {
  h = harness()
})

const call = (tool: ToolDefinition, input: unknown) => tool.execute(input)

describe('the tool surface itself', () => {
  // One tool per capability in docs/webmcp/capabilities.md. The count is asserted so
  // that adding a tool without enumerating the capability it serves fails here.
  it('exposes one tool per enumerated capability, nine of them read-only', () => {
    expect(h.tools).toHaveLength(18)
    expect(h.tools.filter((t) => t.annotations.readOnlyHint)).toHaveLength(9)
  })

  it('gives every tool a name an agent can address', () => {
    for (const tool of h.tools) expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  it('tells an agent when each tool does not apply', () => {
    // An agent reads descriptions and nothing else, so "when not to call this" has to
    // be in the description or it does not exist.
    for (const tool of h.tools) {
      expect(
        /\b(do not|don't|never|only when|not when|avoid|unless|rather than)\b/i.test(tool.description),
        `${tool.name} does not say when not to call it`,
      ).toBe(true)
    }
  })

  it('gives every tool a title, because the site-tools panel renders it', () => {
    for (const tool of h.tools) expect(tool.title.length).toBeGreaterThan(0)
  })

  it('states proposal eligibility relative to the most recent check', () => {
    expect(h.byName('propose_step').description).toContain(
      'after two learner attempts since the most recent check',
    )
  })

  it('states the receipt history cap and truncation metadata', () => {
    expect(h.byName('get_receipt').description).toContain('at most 8')
    expect(h.byName('get_receipt').description).toContain('total and truncation metadata')
  })

  it('reports read-only and cached mutation successes, but not failed calls', async () => {
    let successes = 0
    const local = harness(undefined, () => {
      successes += 1
    })

    expect((await call(local.byName('get_scratchpad'), {})).ok).toBe(true)
    expect(successes).toBe(1)

    expect((await call(local.byName('get_scratchpad'), { unexpected: true })).ok).toBe(false)
    expect(successes).toBe(1)

    local.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const args = {
      expectedRevision: local.state.revision,
      requestId: 'cached-check',
    }
    expect((await call(local.byName('check_work'), args)).ok).toBe(true)
    expect(successes).toBe(2)

    expect((await call(local.byName('check_work'), args)).ok).toBe(true)
    expect(successes).toBe(3)

    expect(
      (
        await call(local.byName('check_work'), {
          expectedRevision: 0,
          requestId: 'stale-check',
        })
      ).ok,
    ).toBe(false)
    expect(successes).toBe(3)
  })

  it('describes every input property, because agents read those descriptions', () => {
    for (const tool of h.tools) {
      const properties = (tool.inputSchema as { properties: Record<string, { description?: string }> }).properties
      for (const [name, schema] of Object.entries(properties)) {
        expect(schema.description, `${tool.name}.${name}`).toBeTruthy()
        expect(schema.description!.length).toBeLessThanOrEqual(150)
      }
    }
  })

  // The hint marks exactly the tools whose payload can carry text the learner wrote.
  // get_receipt was previously marked too: it returns round tallies, fixed limit
  // sentences and a session id, none of which the learner authored. Marking every read
  // untrusted costs the hint its meaning, so only get_scratchpad, which echoes the
  // learner's own LaTeX, carries it.
  it('marks exactly the tools that return learner-authored text as untrusted', () => {
    const marked = h.tools.filter((t) => t.annotations.untrustedContentHint).map((t) => t.name)
    expect(marked).toEqual(['get_scratchpad'])
  })

  it('marks check_work as a write, because it changes what the learner sees', () => {
    expect(h.byName('check_work').annotations.readOnlyHint).toBe(false)
  })
})

describe('handlers never throw and never return undefined', () => {
  const hostile: unknown[] = [
    undefined, null, '', '{}', 'not json', 42, [], { requestId: null },
    { expectedRevision: 'x', requestId: 'abcdef' },
    { requestId: 'abcdef', expectedRevision: 0, surprise: 1 },
  ]

  it('returns an envelope for every hostile input on every tool', async () => {
    for (const tool of h.tools) {
      for (const input of hostile) {
        const result = await call(tool, input)
        expect(result, `${tool.name} <- ${JSON.stringify(input)}`).toBeDefined()
        expect(typeof result).toBe('object')
        expect(typeof result.ok).toBe('boolean')
        if (!result.ok) {
          expect(result.error.code).toBeTruthy()
          expect(result.error.recovery).toBeTruthy()
        }
      }
    }
  })

  it('reports an unmounted scratchpad instead of throwing', async () => {
    h.unmount()
    for (const tool of h.tools) {
      const result = await call(tool, { expectedRevision: 0, requestId: 'abcdef' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('not_ready')
    }
  })

  it('takes exactly one argument, as Chrome 151 supplies', () => {
    // The previous implementation read `context.signal` from a second parameter that
    // Chrome never passes, and threw a TypeError on every call.
    for (const tool of h.tools) expect(tool.execute.length).toBeLessThanOrEqual(1)
  })
})

describe('get_scratchpad', () => {
  it('advertises only the actions that would succeed right now', async () => {
    // Before anything is written, an agent can add a line or reset - but there is
    // nothing yet to check, edit, remove or annotate.
    const result = await call(h.byName('get_scratchpad'), {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.availableActions).toEqual(['add_step', 'reset_session'])
  })

  it('reads the problem and the steps', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const result = await call(h.byName('get_scratchpad'), {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.revision).toBe(h.state.revision)
      expect((result.data.steps as unknown[]).length).toBe(1)
      expect(result.data.checked).toBe(false)
    }
  })

  // This assertion used to require the note to say "Only the learner" could write.
  // The product's claim is no longer that an agent is prevented from writing - it is
  // that every change is attributed - so the note now has to carry that instead.
  it('tells the agent it may write, and that the change will be attributed', async () => {
    const result = await call(h.byName('get_scratchpad'), {})
    if (result.ok) {
      const note = String(result.data.note)
      expect(note).toContain('write')
      expect(note).toMatch(/learner or an agent|recorded as agent work/)
    }
  })

  it('accepts a JSON string as well as an object', async () => {
    const result = await call(h.byName('get_scratchpad'), '{}')
    expect(result.ok).toBe(true)
  })

  it('rejects arguments it publishes no schema for, rather than ignoring them', async () => {
    // additionalProperties:false is published; silently dropping an argument would
    // teach an agent that its mistake worked.
    for (const name of ['get_scratchpad', 'get_receipt']) {
      const result = await call(h.byName(name), { foo: 'bar' })
      expect(result.ok, name).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('invalid_input')
    }
  })

  it('truncates a long derivation explicitly rather than silently', async () => {
    for (let i = 0; i < 10; i++) h.learner({ type: 'ADD_STEP', latex: `x^${i + 1}` })
    const result = await call(h.byName('get_scratchpad'), {})
    if (result.ok) {
      expect(result.data.truncated).toBe(true)
      expect((result.data.steps as unknown[]).length).toBe(8)
    }
  })

  it('stays compact', async () => {
    for (let i = 0; i < 10; i++) h.learner({ type: 'ADD_STEP', latex: `x^${i + 1} + 3x` })
    const result = await call(h.byName('get_scratchpad'), {})
    expect(JSON.stringify(result).length).toBeLessThan(2000)
  })
})

describe('optimistic concurrency', () => {
  it('rejects a write against a revision the learner has moved past', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const stale = h.state.revision
    h.learner({ type: 'ADD_STEP', latex: '2x' })
    const result = await call(h.byName('check_work'), { expectedRevision: stale, requestId: 'req-stale-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('stale_revision')
      expect(result.error.recovery).toContain(String(h.state.revision))
    }
  })

  it('names the current revision so the agent can recover in one step', async () => {
    const result = await call(h.byName('check_work'), { expectedRevision: 99, requestId: 'req-stale-2' })
    if (!result.ok) expect(result.revision).toBe(h.state.revision)
  })
})

describe('idempotency', () => {
  it('does not apply the same requestId twice', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const input = { expectedRevision: h.state.revision, requestId: 'req-dup-1' }
    const first = await call(h.byName('check_work'), input)
    const revisionAfterFirst = h.state.revision
    const second = await call(h.byName('check_work'), input)
    expect(first).toEqual(second)
    expect(h.state.revision).toBe(revisionAfterFirst)
  })

  it('lets a corrected retry succeed after a failure', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const bad = await call(h.byName('check_work'), { expectedRevision: 999, requestId: 'req-retry-1' })
    expect(bad.ok).toBe(false)
    const good = await call(h.byName('check_work'), { expectedRevision: h.state.revision, requestId: 'req-retry-1' })
    expect(good.ok).toBe(true)
  })

  it('re-checks rather than replaying a stale verdict when the work has changed', async () => {
    // An agent asked to "check it again" often reuses its requestId. Keyed on the id
    // alone it would receive the previous verdict presented as a fresh one.
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    const first = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-again-1',
    })
    expect(first.ok).toBe(true)
    if (first.ok) expect(first.data.allSound).toBe(true)

    h.learner({ type: 'ADD_STEP', latex: '999' }) // now broken, and a new revision
    const second = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-again-1', // deliberately the same id
    })
    expect(second.ok).toBe(true)
    if (second.ok) {
      expect(second.data.allSound).toBe(false)
      expect(second.data.firstBrokenStep).toBe(2)
    }
  })

  it('a concurrent duplicate awaits the original rather than racing it', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const input = { expectedRevision: h.state.revision, requestId: 'req-race-1' }
    const [a, b] = await Promise.all([
      call(h.byName('check_work'), input),
      call(h.byName('check_work'), input),
    ])
    expect(a).toEqual(b)
  })

  it('does not replay an old cached success after the learner has moved on', async () => {
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    const input = { expectedRevision: h.state.revision, requestId: 'req-old-success' }
    const first = await call(h.byName('check_work'), input)
    expect(first.ok).toBe(true)
    h.learner({ type: 'ADD_STEP', latex: '999' })
    const replay = await call(h.byName('check_work'), input)
    expect(replay.ok).toBe(false)
    if (!replay.ok) expect(replay.error.code).toBe('stale_revision')
  })

  it('does not collide when two different tools reuse a request id and revision', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const observedRevision = h.state.revision
    const checked = await call(h.byName('check_work'), {
      expectedRevision: observedRevision,
      requestId: 'shared-cross-tool',
    })
    expect(checked.ok).toBe(true)

    const annotation = await call(h.byName('annotate_step'), {
      stepId: 'step-1',
      note: 'This must not replay check_work.',
      expectedRevision: observedRevision,
      requestId: 'shared-cross-tool',
    })
    expect(annotation.ok).toBe(false)
    if (!annotation.ok) expect(annotation.error.code).toBe('stale_revision')
  })
})

describe('unexpected bridge failures', () => {
  it('returns a recoverable envelope instead of throwing', async () => {
    const state = createSession(2026, 'bridge-failure')
    const bridge: ToolBridge = {
      getState: () => state,
      run: async () => {
        throw new Error('bridge exploded')
      },
      requestCache: new Map(),
      onToolSuccess: () => {},
    probePlatform: async () => [],
    }
    const tool = createTools(bridge).find((candidate) => candidate.name === 'check_work')!
    const result = await tool.execute({
      expectedRevision: state.revision,
      requestId: 'req-bridge-failure',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('internal_error')
      expect(result.error.recovery).toContain('scratchpad')
    }
  })

  it('includes the broken target even when it falls beyond the normal preview', async () => {
    for (let i = 0; i < 8; i++) {
      h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    }
    h.learner({ type: 'ADD_STEP', latex: '999' })
    h.learner({ type: 'CHECK_WORK' })
    const result = await call(h.byName('get_scratchpad'), {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      const broken = result.data.firstBrokenStep as { stepId: string }
      const steps = result.data.steps as Array<{ id: string }>
      expect(steps.some((step) => step.id === broken.stepId)).toBe(true)
    }
  })
})

describe('the policy layer is visible to the agent', () => {
  it('refuses a proposal before the learner has tried, and says what to do instead', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const result = await call(h.byName('propose_step'), {
      stepId: 'step-1',
      latex: '2x',
      rationale: 'power rule',
      expectedRevision: h.state.revision,
      requestId: 'req-prop-1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('refused_policy')
      expect(result.error.recovery).toContain('annotate_step')
    }
  })

  it('returns pending_learner_acceptance, never applied', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    h.learner({ type: 'EDIT_STEP', stepId: 'step-1', latex: 'x^3' })
    const result = await call(h.byName('propose_step'), {
      stepId: 'step-1',
      latex: 'REPLACEMENT',
      rationale: 'because',
      expectedRevision: h.state.revision,
      requestId: 'req-prop-2',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.status).toBe('pending_learner_acceptance')
    expect(h.state.steps[0].latex).toBe('x^3')
  })

  it('refuses annotation during the unaided attempt', async () => {
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.answer.latex })
    h.learner({ type: 'ADD_STEP', latex: String(h.state.problem.answer.value) })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), { expectedRevision: h.state.revision, requestId: 'req-new-1' })
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const result = await call(h.byName('annotate_step'), {
      stepId: h.state.steps[0].id,
      note: 'try this',
      expectedRevision: h.state.revision,
      requestId: 'req-ann-1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('refused_policy')
  })
})

describe('phase gating', () => {
  it('refuses new_problem before the work has been checked', async () => {
    h.learner({ type: 'ADD_STEP', latex: 'x^2' })
    const result = await call(h.byName('new_problem'), { expectedRevision: h.state.revision, requestId: 'req-np-1' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_phase')
      expect(result.error.recovery).toContain('check_work')
    }
  })

  it('refuses the receipt before any round has finished', async () => {
    const result = await call(h.byName('get_receipt'), {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid_phase')
  })

  it('reports an unknown step id as not_found', async () => {
    const result = await call(h.byName('annotate_step'), {
      stepId: 'no-such-step',
      note: 'hello',
      expectedRevision: h.state.revision,
      requestId: 'req-nf-1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('not_found')
  })
})

describe('the verdict belongs to the engine, not the agent', () => {
  it('an agent calling check_work on wrong work still gets a mismatch', async () => {
    // The demonstration the submission rests on: the agent cannot make a wrong step
    // correct, because it does not author the verdict.
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    h.learner({ type: 'ADD_STEP', latex: '9999x' }) // not the derivative of anything here
    const result = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-truth-1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.allSound).toBe(false)
      expect(result.data.firstBrokenStep).toBe(2)
    }
    expect(h.state.report?.verdicts['step-2'].status).toBe('broken')
  })

  it('returns a bounded engine-owned diagnosis for the first break', async () => {
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.errorModes[0].latex })
    const result = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-diagnosis-1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.firstBrokenDetail).toEqual(
        expect.objectContaining({ status: 'broken', reason: 'not_equivalent' }),
      )
    }
  })

  it('reports unreadable work as unresolved in both check and scratchpad output', async () => {
    h.learner({ type: 'ADD_STEP', latex: '((((' })
    const checked = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-unresolved-1',
    })
    expect(checked.ok).toBe(true)
    if (checked.ok) {
      expect(checked.data.firstBrokenStep).toBeNull()
      expect(checked.data.firstUnresolvedStep).toBe(1)
      expect(checked.data.firstUnresolvedDetail).toEqual(
        expect.objectContaining({ status: 'unreadable' }),
      )
    }

    const scratchpad = await call(h.byName('get_scratchpad'), {})
    expect(scratchpad.ok).toBe(true)
    if (scratchpad.ok) {
      expect(scratchpad.data.firstBrokenStep).toBeNull()
      expect(scratchpad.data.firstUnresolvedStep).toEqual({
        position: 1,
        stepId: 'step-1',
        status: 'unreadable',
      })
    }
  })

  it('reports an uncertain comparison as unresolved, never broken', async () => {
    const initial = createSession(2026, 'uncertain-tool-report')
    h = harness({
      ...initial,
      problem: {
        ...initial.problem,
        variable: 'x',
        premiseLatex: 'x',
        answer: { latex: '1', value: 1 },
      },
    })
    h.learner({ type: 'ADD_STEP', latex: 'e^{\\ln x}' })
    const checked = await call(h.byName('check_work'), {
      expectedRevision: h.state.revision,
      requestId: 'req-uncertain-1',
    })

    expect(checked.ok).toBe(true)
    if (checked.ok) {
      expect(checked.data.firstBrokenStep).toBeNull()
      expect(checked.data.firstUnresolvedStep).toBe(1)
      expect(checked.data.firstUnresolvedDetail).toEqual({ status: 'uncertain' })
    }
  })
})

describe('the receipt', () => {
  it('states its own limits', async () => {
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.answer.latex })
    h.learner({ type: 'ADD_STEP', latex: String(h.state.problem.answer.value) })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), { expectedRevision: h.state.revision, requestId: 'req-r-1' })
    const result = await call(h.byName('get_receipt'), {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      const limits = result.data.limits as string[]
      expect(limits.length).toBeGreaterThanOrEqual(2)
      expect(limits.join(' ')).toContain('not')
    }
  })

  it('caps completed rounds and returns explicit provenance and truncation metadata', async () => {
    const initial = createSession(2026, 'receipt-cap')
    const counts = (agent: number, localInspector: number, unattributed = 0) => ({
      agent,
      localInspector,
      unattributed,
    })
    h = harness({
      ...initial,
      history: Array.from({ length: 10 }, (_, index) => ({
        round: index === 0 ? 'practice' as const : 'transfer' as const,
        problemId: `problem-${index}`,
        sound: true,
        stepWrites: { learner: 2, agent: 1, localInspector: 0 },
        checks: 1,
        annotations: counts(index, 1),
        proposalsOffered: counts(2, 3),
        proposalsAccepted: counts(1, 2),
      })),
    })
    const result = await call(h.byName('get_receipt'), {})
    if (result.ok) {
      const rounds = result.data.rounds as Array<{
        annotations: { agent: number; localInspector: number; unattributed: number }
        linesWritten: { learner: number; agent: number; localInspector: number }
      }>
      expect(rounds).toHaveLength(8)
      expect(rounds[0].annotations).toEqual(counts(2, 1))
      // Authorship, not merely intervention. Without this a round an agent wrote end
      // to end would report "no annotations, no proposals" and read as unaided.
      expect(rounds[0].linesWritten).toEqual({ learner: 2, agent: 1, localInspector: 0 })
      expect(result.data.roundsTotal).toBe(10)
      expect(result.data.roundsReturned).toBe(8)
      expect(result.data.roundsTruncated).toBe(true)
    }
  })

  it('does not call internally sound but incomplete transfer work successful', async () => {
    let state = h.state
    const practice = [
      state.problem.premiseLatex,
      state.problem.answer.latex,
      String(state.problem.answer.value),
    ]
    for (const latex of practice) h.learner({ type: 'ADD_STEP', latex })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), {
      expectedRevision: h.state.revision,
      requestId: 'req-transfer-incomplete',
    })
    h.learner({ type: 'ADD_STEP', latex: h.state.problem.premiseLatex })
    h.learner({ type: 'CHECK_WORK' })
    expect(h.state.report?.allSound).toBe(true)
    expect(h.state.report?.reachesAnswer).toBe(false)
    const result = await call(h.byName('get_receipt'), {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.unaidedTransfer).toBe('attempted, not yet sound')
  })

  it('retains completed transfer evidence after another fresh problem starts', async () => {
    for (const latex of [
      h.state.problem.premiseLatex,
      h.state.problem.answer.latex,
      String(h.state.problem.answer.value),
    ]) h.learner({ type: 'ADD_STEP', latex })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), {
      expectedRevision: h.state.revision,
      requestId: 'req-transfer-first',
    })
    for (const latex of [
      h.state.problem.premiseLatex,
      h.state.problem.answer.latex,
      String(h.state.problem.answer.value),
    ]) h.learner({ type: 'ADD_STEP', latex })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), {
      expectedRevision: h.state.revision,
      requestId: 'req-transfer-second',
    })

    const result = await call(h.byName('get_receipt'), {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.unaidedTransfer).toBe(
        'every step sound, with no external annotations or proposals',
      )
    }
  })

  it('retains observed transfer evidence when the learner edits afterward', async () => {
    for (const latex of [
      h.state.problem.premiseLatex,
      h.state.problem.answer.latex,
      String(h.state.problem.answer.value),
    ]) h.learner({ type: 'ADD_STEP', latex })
    h.learner({ type: 'CHECK_WORK' })
    await call(h.byName('new_problem'), {
      expectedRevision: h.state.revision,
      requestId: 'req-transfer-edit-practice',
    })
    for (const latex of [
      h.state.problem.premiseLatex,
      h.state.problem.answer.latex,
      String(h.state.problem.answer.value),
    ]) h.learner({ type: 'ADD_STEP', latex })
    h.learner({ type: 'CHECK_WORK' })
    h.learner({
      type: 'EDIT_STEP',
      stepId: h.state.steps.at(-1)!.id,
      latex: String(h.state.problem.answer.value + 1),
    })

    const result = await call(h.byName('get_receipt'), {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.unaidedTransfer).toBe(
        'previously checked sound; current work changed afterward',
      )
    }
  })
})

describe('the tools added when agents became able to drive the page', () => {
  let h: ReturnType<typeof harness>
  beforeEach(() => {
    h = harness()
  })

  const write = (name: string, extra: Record<string, unknown>) =>
    call(h.byName(name), { expectedRevision: h.state.revision, requestId: `req-${name}-1`, ...extra })

  it('writes, rewrites and deletes a line', async () => {
    expect((await write('add_step', { latex: 'x^2' })).ok).toBe(true)
    const id = h.state.steps[0].id
    expect((await write('edit_step', { stepId: id, latex: '2x' })).ok).toBe(true)
    expect(h.state.steps[0].latex).toBe('2x')
    expect((await write('remove_step', { stepId: id })).ok).toBe(true)
    expect(h.state.steps).toHaveLength(0)
  })

  it('names the field at fault rather than only describing it', async () => {
    const result = await write('add_step', { latex: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe('latex')
  })

  it('refuses a stale revision without touching the work', async () => {
    await write('add_step', { latex: 'x^2' })
    const before = JSON.stringify(h.state.steps)
    const stale = await call(h.byName('add_step'), {
      latex: 'nope',
      expectedRevision: h.state.revision - 1,
      requestId: 'req-stale-1',
    })
    expect(stale.ok).toBe(false)
    if (!stale.ok) {
      expect(stale.error.code).toBe('stale_revision')
      expect(stale.error.field).toBe('expectedRevision')
    }
    expect(JSON.stringify(h.state.steps)).toBe(before)
  })

  it('differentiates, evaluates and compares without writing to the page', async () => {
    const revision = h.state.revision
    const derivative = await call(h.byName('differentiate_expression'), { latex: '4x^3 + x^2' })
    expect(derivative.ok).toBe(true)

    const value = await call(h.byName('evaluate_expression'), { latex: '12x^2 + 2x', at: 2 })
    expect(value.ok).toBe(true)
    if (value.ok) expect(value.data.value).toBe(52)

    const comparison = await call(h.byName('compare_expressions'), { left: '2x + 2x', right: '4x' })
    expect(comparison.ok).toBe(true)
    if (comparison.ok) expect(comparison.data.status).toBe('match')

    expect(h.state.revision).toBe(revision)
  })

  it('reports a parse failure without writing it', async () => {
    const result = await call(h.byName('validate_expression'), { latex: '4x^^' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.parses).toBe(false)
    expect(h.state.steps).toHaveLength(0)
  })

  it('reports only what changed after a revision', async () => {
    await write('add_step', { latex: 'x^2' })
    const result = await call(h.byName('get_changes_since'), { since: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.upToDate).toBe(false)
      expect((result.data.changes as { source: string }[])[0].source).toBe('agent')
    }
  })

  it('rejects an unknown argument on a read tool, naming it', async () => {
    const result = await call(h.byName('get_changes_since'), { since: 0, nope: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe('nope')
  })
})
