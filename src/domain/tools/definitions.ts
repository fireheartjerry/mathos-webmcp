/**
 * The six WebMCP tools.
 *
 * Written against what Chrome 151 actually does, which differs from the published
 * IDL in ways that matter (see docs/overnight-audit/02b). The two that bite:
 *
 *   1. `execute` receives EXACTLY ONE argument. There is no `{ signal }` second
 *      parameter. The previous implementation opened every handler with
 *      `context.signal?.aborted`, which threw a TypeError on every call - so all five
 *      tools failed in shipped Chrome while the page displayed "5 agent tools live".
 *      Handlers here take `(input)` and nothing else.
 *
 *   2. A THROWN error is flattened by the browser to a generic `UnknownError` and our
 *      message is discarded. A RETURNED envelope survives verbatim, `recovery` string
 *      and all. So nothing here throws; every failure is a value.
 *
 * These definitions are deliberately free of any browser dependency so the whole
 * surface can be executed in tests.
 */

import type { ActionResult, SessionAction, SessionState } from '../session/types'

export type ToolErrorCode =
  | 'stale_revision'
  | 'invalid_phase'
  | 'invalid_input'
  | 'refused_policy'
  | 'not_found'
  | 'not_ready'
  | 'internal_error'

export type ToolEnvelope =
  | { ok: true; revision: number; data: Record<string, unknown> }
  | { ok: false; revision: number; error: { code: ToolErrorCode; message: string; recovery: string } }

export type ToolAnnotations = {
  // Chrome 151 silently drops every other annotation key. Only these two survive.
  readOnlyHint: boolean
  untrustedContentHint: boolean
}

export type ToolDefinition = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: ToolAnnotations
  execute: (input: unknown) => Promise<ToolEnvelope>
}

export type ToolBridge = {
  /** Never throws. Returns null when the scratchpad is not mounted. */
  getState: () => SessionState | null
  /** Runs an action through the one shared reducer and awaits the repaint. */
  run: (action: SessionAction) => Promise<ActionResult>
  requestCache: Map<string, ToolEnvelope | Promise<ToolEnvelope>>
  /** Called for every successful envelope, including reads and cached retries. */
  onToolSuccess: () => void
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/

const NOT_MOUNTED: ToolEnvelope = {
  ok: false,
  revision: -1,
  error: {
    code: 'not_ready',
    message: 'The scratchpad is not open.',
    recovery: 'Ask the learner to open the Second Try scratchpad, then read it again.',
  },
}

function failure(revision: number, code: ToolErrorCode, message: string, recovery: string): ToolEnvelope {
  return { ok: false, revision, error: { code, message, recovery } }
}

/**
 * Chrome hands the handler one argument. In Chrome 151 that is the parsed object,
 * but the caller supplies a JSON *string* to `executeTool`, and the local inspector
 * may pass either. Accept both rather than depending on which side did the parsing.
 */
function readInput(input: unknown): Record<string, unknown> | null {
  if (typeof input === 'string') {
    if (!input.trim()) return {}
    try {
      const parsed: unknown = JSON.parse(input)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (input === undefined || input === null) return {}
  if (typeof input === 'object' && !Array.isArray(input)) return input as Record<string, unknown>
  return null
}

const revisionField = {
  type: 'integer',
  minimum: 0,
  description:
    'The revision you read from get_scratchpad. If the learner has edited since, the call is rejected as stale.',
} as const

const requestIdField = {
  type: 'string',
  minLength: 6,
  maxLength: 64,
  pattern: '^[A-Za-z0-9_-]+$',
  description:
    'Unique per intent. The same id and revision replay safely; use a new id for a deliberate re-check. This cache resets on page reload.',
} as const

/** Keeps tool output small. Context is the scarce resource, not the transport. */
function summariseSteps(state: SessionState) {
  const limit = 8
  const brokenIndex = state.report?.firstBrokenIndex ?? -1
  const shown = state.steps.slice(0, limit).map((step, index) => ({ step, index }))
  if (brokenIndex >= limit && state.steps[brokenIndex]) {
    shown[limit - 1] = { step: state.steps[brokenIndex], index: brokenIndex }
  }
  const steps = shown.map(({ step, index }) => {
    const verdict = state.report?.verdicts[step.id]
    return {
      id: step.id,
      n: index + 1,
      latex: step.latex.length > 80 ? step.latex.slice(0, 77) + '...' : step.latex,
      attempts: step.attempts,
      verdict: verdict ? verdict.status : 'unchecked',
    }
  })
  return { steps, truncated: state.steps.length > limit }
}

function scratchpadData(state: SessionState): Record<string, unknown> {
  const { steps, truncated } = summariseSteps(state)
  const firstBroken =
    state.report && state.report.firstBrokenIndex !== null
      ? { position: state.report.firstBrokenIndex + 1, stepId: state.report.firstBrokenId }
      : null

  const available: string[] = []
  if (state.steps.length > 0) available.push('check_work')
  if (state.round === 'practice' && state.steps.length > 0) {
    available.push('annotate_step')
    if (state.steps.some((s) => s.attempts >= 2)) available.push('propose_step')
  }
  if (state.report?.allSound && state.report.reachesAnswer) available.push('new_problem')
  if (state.history.length > 0) available.push('get_receipt')

  return {
    sessionId: state.sessionId,
    revision: state.revision,
    round: state.round,
    problem: {
      prompt: state.problem.prompt,
      given: state.problem.definitions.map((d) => `${d.name} = ${d.latex}`),
      variable: state.problem.variable,
    },
    steps,
    ...(truncated ? { truncated: true } : {}),
    checked: state.report !== null,
    firstBrokenStep: firstBroken,
    pendingProposal: state.proposal ? { stepId: state.proposal.stepId } : null,
    availableActions: available,
    note:
      state.round === 'transfer'
        ? 'Unaided attempt. annotate_step and propose_step are closed until it ends.'
        : 'You cannot write, edit, or accept steps. Only the learner can.',
  }
}

function receiptData(state: SessionState): Record<string, unknown> {
  const rounds = state.history.map((round) => ({
    round: round.round,
    allStepsSound: round.sound,
    checksRun: round.checks,
    annotations: round.agentAnnotations,
    proposalsOffered: round.agentProposalsOffered,
    proposalsAccepted: round.agentProposalsAccepted,
  }))
  const previousTransfer = [...state.history].reverse().find((round) => round.round === 'transfer')
  const currentRoundStart = state.activities.findLastIndex(
    (activity) =>
      activity.action === 'Started the unaided transfer problem' ||
      activity.action === 'Started a fresh problem',
  )
  const currentRoundActivities = state.activities.slice(Math.max(0, currentRoundStart))
  const observedSoundBeforeEdit =
    state.round === 'transfer' &&
    !state.report &&
    currentRoundActivities.some(
      (activity) => activity.action === 'Checked the derivation · sound, and it reaches the answer',
    )
  const transfer =
    state.round === 'transfer' && state.report
      ? state.report.allSound && state.report.reachesAnswer
      : previousTransfer?.sound ?? null
  return {
    sessionId: state.sessionId,
    rounds,
    unaidedTransfer:
      observedSoundBeforeEdit && transfer === null
        ? 'previously checked sound; current work changed afterward'
        : transfer === null
        ? 'not attempted yet'
        : transfer
          ? 'every step sound, with no external annotations or proposals'
          : 'attempted, not yet sound',
    limits: [
      'This records what happened in this browser session.',
      'It does not establish that the learner could do this again tomorrow, or unassisted elsewhere.',
      'Steps were checked by the page computer algebra system, not by the agent.',
    ],
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Wraps a mutating tool: validates the envelope fields every write shares, enforces
 * idempotency, and rejects stale revisions.
 */
async function mutate(
  bridge: ToolBridge,
  input: unknown,
  allowedKeys: readonly string[],
  build: (values: Record<string, unknown>) => SessionAction | { invalid: string; recovery: string },
): Promise<ToolEnvelope> {
  const state = bridge.getState()
  if (!state) return NOT_MOUNTED

  const values = readInput(input)
  if (!values) {
    return failure(state.revision, 'invalid_input', 'The arguments were not a JSON object.', 'Send the arguments described by the input schema.')
  }
  for (const key of Object.keys(values)) {
    if (!allowedKeys.includes(key)) {
      return failure(state.revision, 'invalid_input', `Unexpected argument "${key}".`, `This tool accepts: ${allowedKeys.join(', ')}.`)
    }
  }
  const { expectedRevision, requestId } = values
  if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) {
    return failure(state.revision, 'invalid_input', 'requestId must be 6-64 characters of letters, digits, hyphen or underscore.', 'Invent a unique requestId for this call and try again.')
  }

  // Keyed by requestId AND revision, not requestId alone.
  //
  // A genuine retry repeats both, so it is served from the cache and cannot apply
  // twice. But an agent asked to "check it again" after the learner edited something
  // often reuses its id; keyed on the id alone it would receive the previous verdict,
  // presented as a fresh one. Including the revision makes that a different operation,
  // which is what it actually is.
  const cacheKey = `${requestId}@${String(expectedRevision)}`
  const cached = bridge.requestCache.get(cacheKey)
  if (cached) {
    // An in-flight duplicate must await the original. A completed duplicate is safe
    // only while the document is still at the revision produced by that operation;
    // once the learner moves on, replaying the old success would lie about current
    // state and must become a stale write instead.
    if ('then' in cached) return cached
    if (cached.ok && cached.revision === state.revision) return cached
    bridge.requestCache.delete(cacheKey)
  }

  if (!Number.isInteger(expectedRevision)) {
    return failure(state.revision, 'invalid_input', 'expectedRevision must be an integer.', `Read the scratchpad and send its revision, currently ${state.revision}.`)
  }
  if (expectedRevision !== state.revision) {
    return failure(state.revision, 'stale_revision', `The scratchpad has changed since revision ${expectedRevision}.`, `Call get_scratchpad again and retry with revision ${state.revision}.`)
  }

  const action = build(values)
  if ('invalid' in action) {
    return failure(state.revision, 'invalid_input', action.invalid, action.recovery)
  }

  const pending = (async (): Promise<ToolEnvelope> => {
    try {
      const result = await bridge.run(action)
      if (!result.ok) {
        const after = bridge.getState()
        return failure(after?.revision ?? state.revision, result.code, result.message, result.recovery)
      }
      return { ok: true, revision: result.state.revision, data: result.data }
    } catch {
      const after = bridge.getState()
      return failure(
        after?.revision ?? state.revision,
        'internal_error',
        'The page could not complete that action.',
        'Read the scratchpad again. If the state is intact, retry once with a new requestId.',
      )
    }
  })()

  bridge.requestCache.set(cacheKey, pending)
  const envelope = await pending
  // Keep successes cached so a retry is a no-op; evict failures so a corrected retry
  // can succeed.
  if (bridge.requestCache.get(cacheKey) === pending) {
    if (envelope.ok) bridge.requestCache.set(cacheKey, envelope)
    else bridge.requestCache.delete(cacheKey)
  }
  return envelope
}

const EMPTY_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const

export function createTools(bridge: ToolBridge): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'get_scratchpad',
      title: 'Read the scratchpad',
      description:
        "Read the learner's current problem, every step they have written, each step's verdict, the first step that broke, and what you may do next.",
      inputSchema: EMPTY_SCHEMA,
      // Every step is learner-authored text. Chrome's guidance is to mark that.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const values = readInput(input)
        // The published schema says additionalProperties:false, so honour it here too.
        // Accepting and silently dropping an argument teaches an agent that its
        // mistake worked.
        if (!values || Object.keys(values).length > 0) {
          return failure(state.revision, 'invalid_input', 'This tool takes no arguments.', 'Call it with {}.')
        }
        return { ok: true, revision: state.revision, data: scratchpadData(state) }
      },
    },

    {
      name: 'check_work',
      title: 'Check the derivation',
      description:
        'Ask the page computer algebra system to check the whole derivation and mark the first step that stopped being equivalent. Call it again with a NEW requestId whenever the work has changed. The verdict belongs to the engine, not to you.',
      inputSchema: {
        type: 'object',
        properties: { expectedRevision: revisionField, requestId: requestIdField },
        required: ['expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => mutate(bridge, input, ['expectedRevision', 'requestId'], () => ({ type: 'CHECK_WORK' })),
    },

    {
      name: 'annotate_step',
      title: 'Explain one step',
      description:
        "During guided practice, attach a short explanation beside one learner-written line. Use this to teach without solving; unavailable in the unaided round.",
      inputSchema: {
        type: 'object',
        properties: {
          stepId: { type: 'string', maxLength: 64, description: 'The id of the step to annotate, from get_scratchpad.' },
          note: { type: 'string', minLength: 1, maxLength: 400, description: 'The explanation the learner will read. Address the mistake, not the answer.' },
          focus: { type: 'boolean', description: 'Scroll the step into view and select it.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['stepId', 'note', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, input, ['stepId', 'note', 'focus', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.stepId !== 'string' || !values.stepId) {
            return { invalid: 'stepId must be a step id from get_scratchpad.', recovery: 'Read the scratchpad for current step ids.' }
          }
          if (typeof values.note !== 'string' || !values.note.trim()) {
            return { invalid: 'note must be a non-empty explanation.', recovery: 'Send a short explanation aimed at the broken step.' }
          }
          if (values.note.length > 400) {
            return { invalid: 'note must be 400 characters or fewer.', recovery: 'Shorten the explanation and try again.' }
          }
          if (values.focus !== undefined && typeof values.focus !== 'boolean') {
            return { invalid: 'focus must be true or false.', recovery: 'Omit focus, or send a boolean.' }
          }
          return {
            type: 'ANNOTATE_STEP',
            stepId: values.stepId,
            note: values.note,
            focus: values.focus === true,
          }
        }),
    },

    {
      name: 'propose_step',
      title: 'Offer a replacement step',
      description:
        'During guided practice, offer a replacement after two learner attempts since the most recent check. The learner must accept or reject it; you cannot apply it.',
      inputSchema: {
        type: 'object',
        properties: {
          stepId: { type: 'string', maxLength: 64, description: 'The id of the step you are offering to replace.' },
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The replacement expression, in LaTeX.' },
          rationale: { type: 'string', minLength: 1, maxLength: 400, description: 'Why this replacement is right. The learner reads this before deciding.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['stepId', 'latex', 'rationale', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, input, ['stepId', 'latex', 'rationale', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.stepId !== 'string' || !values.stepId) {
            return { invalid: 'stepId must be a step id from get_scratchpad.', recovery: 'Read the scratchpad for current step ids.' }
          }
          if (typeof values.latex !== 'string' || !values.latex.trim()) {
            return { invalid: 'latex must be the replacement expression.', recovery: 'Send the step you would write instead.' }
          }
          if (typeof values.rationale !== 'string' || !values.rationale.trim()) {
            return { invalid: 'rationale must explain the replacement.', recovery: 'Say why this step is right, so the learner can judge it.' }
          }
          if (values.latex.length > 256) {
            return { invalid: 'latex must be 256 characters or fewer.', recovery: 'Shorten the replacement expression.' }
          }
          if (values.rationale.length > 400) {
            return { invalid: 'rationale must be 400 characters or fewer.', recovery: 'Shorten the rationale.' }
          }
          return {
            type: 'PROPOSE_STEP',
            stepId: values.stepId,
            latex: values.latex,
            rationale: values.rationale,
          }
        }),
    },

    {
      name: 'new_problem',
      title: 'Start a fresh problem',
      description:
        'Clear this round only after checked lines are sound and reach the requested answer. Start a fresh unaided problem; annotation and proposal tools then close.',
      inputSchema: {
        type: 'object',
        properties: {
          familyId: { type: 'string', maxLength: 64, description: 'Optional. Omit to stay in the current skill family.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, input, ['familyId', 'expectedRevision', 'requestId'], (values) => {
          if (values.familyId !== undefined && typeof values.familyId !== 'string') {
            return { invalid: 'familyId must be a string.', recovery: 'Omit familyId to stay in the current skill family.' }
          }
          if (typeof values.familyId === 'string' && values.familyId.length > 64) {
            return { invalid: 'familyId must be 64 characters or fewer.', recovery: 'Use a current family id from get_scratchpad.' }
          }
          return {
            type: 'NEW_PROBLEM',
            ...(typeof values.familyId === 'string' ? { familyId: values.familyId } : {}),
          }
        }),
    },

    {
      name: 'get_receipt',
      title: 'Read the session evidence',
      description:
        'Read completed-round history and bounded transfer evidence. Use get_scratchpad for the current on-screen derivation and its verdicts.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const values = readInput(input)
        if (!values || Object.keys(values).length > 0) {
          return failure(state.revision, 'invalid_input', 'This tool takes no arguments.', 'Call it with {}.')
        }
        if (state.history.length === 0) {
          return failure(state.revision, 'invalid_phase', 'No round has finished yet.', 'There is nothing to report until a fresh problem has been started.')
        }
        return { ok: true, revision: state.revision, data: receiptData(state) }
      },
    },
  ]

  return tools.map((tool) => ({
    ...tool,
    async execute(input) {
      const envelope = await tool.execute(input)
      if (envelope.ok) bridge.onToolSuccess()
      return envelope
    },
  }))
}
