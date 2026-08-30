/**
 * The WebMCP tool surface: 18 tools, one per capability in docs/webmcp/capabilities.md.
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
import { getFirstIssue } from '../math/derivation'
import { computeEngine, parseExpression } from '../math/expression'
import { compareExpressions } from '../math/equivalence'
import { FAMILY_IDS } from '../math/problems'
import type { PlatformFeature } from './platform'

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
  | {
      ok: false
      revision: number
      error: {
        code: ToolErrorCode
        message: string
        recovery: string
        /**
         * The argument at fault, when exactly one is. An agent should not have to
         * parse prose to learn which field to change, so the name is carried in a
         * property of its own; `message` remains the human sentence.
         */
        field?: string
      }
    }

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
  /**
   * Runs the WebMCP platform probes. Injected rather than imported so this module
   * stays free of browser dependencies and the whole surface remains testable.
   */
  probePlatform: () => Promise<PlatformFeature[]>
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

function failure(
  revision: number,
  code: ToolErrorCode,
  message: string,
  recovery: string,
  field?: string,
): ToolEnvelope {
  return { ok: false, revision, error: { code, message, recovery, ...(field ? { field } : {}) } }
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
  const firstIssueIndex = state.report?.firstBrokenIndex ?? -1
  const shown = state.steps.slice(0, limit).map((step, index) => ({ step, index }))
  if (firstIssueIndex >= limit && state.steps[firstIssueIndex]) {
    shown[limit - 1] = { step: state.steps[firstIssueIndex], index: firstIssueIndex }
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
  const firstIssue = state.report ? getFirstIssue(state.report) : null
  const firstBroken = firstIssue?.kind === 'broken'
    ? { position: firstIssue.index + 1, stepId: firstIssue.id }
    : null
  const firstUnresolved = firstIssue?.kind === 'unresolved'
    ? {
        position: firstIssue.index + 1,
        stepId: firstIssue.id,
        status: firstIssue.verdict.status,
      }
    : null

  // Writing is always open to an agent. The product no longer withholds actions to
  // keep the learner in charge; it records who took each one instead, and the receipt
  // reports the split. `availableActions` therefore lists what would succeed right
  // now, which is a statement about state rather than about permission.
  const available: string[] = ['add_step', 'reset_session']
  if (state.steps.length > 0) available.push('check_work', 'edit_step', 'remove_step')
  if (state.round === 'practice' && state.steps.length > 0) {
    available.push('annotate_step')
    if (state.steps.some((s) => s.attempts >= 2)) available.push('propose_step')
  }
  if (state.proposal) available.push('resolve_proposal')
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
    firstUnresolvedStep: firstUnresolved,
    pendingProposal: state.proposal ? { stepId: state.proposal.stepId } : null,
    availableActions: available,
    note:
      state.round === 'transfer'
        ? 'Unaided attempt. annotate_step and propose_step are closed until it ends; every other tool is open, and anything you do here is recorded as agent work in the receipt.'
        : 'You can read, write, edit, delete, check and reset. Every change records whether the learner or an agent made it, and get_receipt reports the split.',
  }
}

const RECEIPT_ROUND_LIMIT = 8

function receiptData(state: SessionState): Record<string, unknown> {
  const completedRounds = state.history.slice(-RECEIPT_ROUND_LIMIT)
  const rounds = completedRounds.map((round) => ({
    round: round.round,
    allStepsSound: round.sound,
    // Who wrote the working, not merely who intervened on it. Without this the receipt
    // could report "no annotations, no proposals" for a round an agent had written end
    // to end, which reads as unaided and is the opposite of evidence.
    linesWritten: round.stepWrites,
    checksRun: round.checks,
    annotations: round.annotations,
    proposalsOffered: round.proposalsOffered,
    proposalsAccepted: round.proposalsAccepted,
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
    roundsTotal: state.history.length,
    roundsReturned: rounds.length,
    roundsTruncated: state.history.length > RECEIPT_ROUND_LIMIT,
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
  toolName: string,
  input: unknown,
  allowedKeys: readonly string[],
  build: (values: Record<string, unknown>) => SessionAction | { invalid: string; recovery: string; field?: string },
): Promise<ToolEnvelope> {
  const state = bridge.getState()
  if (!state) return NOT_MOUNTED

  const values = readInput(input)
  if (!values) {
    return failure(state.revision, 'invalid_input', 'The arguments were not a JSON object.', 'Send the arguments described by the input schema.')
  }
  for (const key of Object.keys(values)) {
    if (!allowedKeys.includes(key)) {
      return failure(state.revision, 'invalid_input', `Unexpected argument "${key}".`, `This tool accepts: ${allowedKeys.join(', ')}.`, key)
    }
  }
  const { expectedRevision, requestId } = values
  if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) {
    return failure(state.revision, 'invalid_input', 'requestId must be 6-64 characters of letters, digits, hyphen or underscore.', 'Invent a unique requestId for this call and try again.', 'requestId')
  }

  // Keyed by requestId AND revision, not requestId alone.
  //
  // A genuine retry repeats both, so it is served from the cache and cannot apply
  // twice. But an agent asked to "check it again" after the learner edited something
  // often reuses its id; keyed on the id alone it would receive the previous verdict,
  // presented as a fresh one. Including the revision makes that a different operation,
  // which is what it actually is.
  const cacheKey = `${toolName}:${requestId}@${String(expectedRevision)}`
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
    return failure(state.revision, 'invalid_input', 'expectedRevision must be an integer.', `Read the scratchpad and send its revision, currently ${state.revision}.`, 'expectedRevision')
  }
  if (expectedRevision !== state.revision) {
    return failure(state.revision, 'stale_revision', `The scratchpad has changed since revision ${expectedRevision}.`, `Call get_scratchpad again and retry with revision ${state.revision}.`, 'expectedRevision')
  }

  const action = build(values)
  if ('invalid' in action) {
    return failure(state.revision, 'invalid_input', action.invalid, action.recovery, action.field)
  }

  const pending = (async (): Promise<ToolEnvelope> => {
    try {
      const result = await bridge.run(action)
      if (!result.ok) {
        const after = bridge.getState()
        return failure(after?.revision ?? state.revision, result.code, result.message, result.recovery, result.field)
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

/** Every symbol a learner may legitimately mention: the variable, plus the givens. */
function allowedVariables(state: SessionState): string[] {
  return [state.problem.variable, ...state.problem.definitions.map((d) => d.name)]
}

/**
 * Argument guard for the read-only tools, which have no revision to check and so do
 * not pass through `mutate`. Rejecting an unknown key rather than ignoring it matters:
 * silently dropping an argument teaches an agent that its mistake worked.
 */
function onlyKeys(
  state: SessionState,
  values: Record<string, unknown> | null,
  allowed: readonly string[],
): { values: Record<string, unknown>; bad?: ToolEnvelope } {
  if (!values) {
    return {
      values: {},
      bad: failure(
        state.revision,
        'invalid_input',
        'The arguments were not a JSON object.',
        allowed.length === 0 ? 'This tool takes no arguments. Call it with {}.' : `This tool accepts: ${allowed.join(', ')}.`,
      ),
    }
  }
  for (const key of Object.keys(values)) {
    if (!allowed.includes(key)) {
      return {
        values,
        bad: failure(
        state.revision,
        'invalid_input',
        `Unexpected argument "${key}".`,
        allowed.length === 0 ? 'This tool takes no arguments. Call it with {}.' : `This tool accepts: ${allowed.join(', ')}.`,
        key,
      ),
      }
    }
  }
  return { values }
}

export function createTools(bridge: ToolBridge): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      name: 'get_scratchpad',
      title: 'Read the scratchpad',
      description:
        "Read the learner's current problem, every step they have written, each step's verdict, the first broken or unresolved line, and what you may do next. Call this before any write, so you hold a current revision. Do not use it to read completed rounds — get_receipt reports those.",
      inputSchema: EMPTY_SCHEMA,
      // Every step is learner-authored text. Chrome's guidance is to mark that.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), [])
        if (guard.bad) return guard.bad
        return { ok: true, revision: state.revision, data: scratchpadData(state) }
      },
    },

    {
      name: 'check_work',
      title: 'Check the derivation',
      description:
        'Ask the page computer algebra system to check the whole derivation and mark the first broken or unresolved relation. Call it again with a NEW requestId whenever the work has changed. The verdict belongs to the engine, not to you. Do not call it when no line has been written, and do not use it to test a single candidate expression — compare_expressions does that without touching the page.',
      inputSchema: {
        type: 'object',
        properties: { expectedRevision: revisionField, requestId: requestIdField },
        required: ['expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => mutate(bridge, 'check_work', input, ['expectedRevision', 'requestId'], () => ({ type: 'CHECK_WORK' })),
    },

    {
      name: 'annotate_step',
      title: 'Explain one step',
      description:
        "During guided practice, attach a short explanation beside one learner-written line. Use this to teach without solving. Do not use it to state the corrected line — propose_step carries a replacement — and it is unavailable during the unaided transfer round.",
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
        mutate(bridge, 'annotate_step', input, ['stepId', 'note', 'focus', 'expectedRevision', 'requestId'], (values) => {
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
        'During guided practice, offer a replacement after two learner attempts since the most recent check, with the reasoning the learner reads before deciding. Do not use it before those two attempts, and do not use it when a plain explanation would do — annotate_step teaches without supplying the answer.',
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
        mutate(bridge, 'propose_step', input, ['stepId', 'latex', 'rationale', 'expectedRevision', 'requestId'], (values) => {
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
        'Clear this round only after checked lines are sound and reach the requested answer, and start a fresh unaided problem; annotation and proposal tools then close. Do not use it to abandon work in progress — that is refused — and do not use it to clear the session history, which is reset_session.',
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
        mutate(bridge, 'new_problem', input, ['familyId', 'expectedRevision', 'requestId'], (values) => {
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
        'Read at most 8 recent completed rounds with total and truncation metadata, plus bounded transfer evidence. Do not use this for the current on-screen derivation or its verdicts — get_scratchpad reports those, and this returns nothing until a round has ended.',
      inputSchema: EMPTY_SCHEMA,
      // Returns only strings this product composed - round tallies, fixed limit
      // sentences, activity descriptions. No learner-authored text reaches a caller
      // here, and marking it untrusted anyway would blunt the hint where it matters.
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), [])
        if (guard.bad) return guard.bad
        if (state.history.length === 0) {
          return failure(state.revision, 'invalid_phase', 'No round has finished yet.', 'There is nothing to report until a fresh problem has been started.')
        }
        return { ok: true, revision: state.revision, data: receiptData(state) }
      },
    },

    /* ---------------------------------------------------------------------- */
    /* Writing. Previously the scratchpad told agents "you cannot write, edit,  */
    /* or accept steps". The reducer always supported all three; only the tool  */
    /* surface withheld them. What keeps the product honest is not the refusal  */
    /* but `ActionSource`, which records who did each thing and is what the     */
    /* receipt reports.                                                         */
    /* ---------------------------------------------------------------------- */

    {
      name: 'add_step',
      title: 'Write a new line of working',
      description:
        'Append a line of working to the derivation, in LaTeX, exactly as the learner would type it. Do not use this to answer the whole problem in one line, and do not use it during a transfer round unless the learner asked you to — the receipt records the line as agent-written either way.',
      inputSchema: {
        type: 'object',
        properties: {
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The line of working, in LaTeX. A leading label such as "y =" or "dy/dx =" is stripped.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['latex', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, 'add_step', input, ['latex', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.latex !== 'string' || !values.latex.trim()) {
            return { invalid: 'latex must be a non-empty string.', recovery: 'Send the line of working in LaTeX.', field: 'latex' }
          }
          if (values.latex.length > 256) {
            return { invalid: 'latex must be 256 characters or fewer.', recovery: 'Shorten the expression, or split it across two steps.', field: 'latex' }
          }
          return { type: 'ADD_STEP', latex: values.latex }
        }),
    },

    {
      name: 'edit_step',
      title: 'Rewrite an existing line',
      description:
        'Replace the text of one existing line, leaving its position and the rest of the derivation alone. Do not use this to delete a line — use remove_step — and do not use it when the line is already sound.',
      inputSchema: {
        type: 'object',
        properties: {
          stepId: { type: 'string', maxLength: 64, description: 'The id of the line to rewrite, from get_scratchpad.' },
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The replacement text, in LaTeX.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['stepId', 'latex', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, 'edit_step', input, ['stepId', 'latex', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.stepId !== 'string' || !values.stepId) {
            return { invalid: 'stepId must be a string.', recovery: 'Use a step id from get_scratchpad.', field: 'stepId' }
          }
          if (typeof values.latex !== 'string' || !values.latex.trim()) {
            return { invalid: 'latex must be a non-empty string.', recovery: 'Send the replacement line in LaTeX.', field: 'latex' }
          }
          if (values.latex.length > 256) {
            return { invalid: 'latex must be 256 characters or fewer.', recovery: 'Shorten the expression.', field: 'latex' }
          }
          return { type: 'EDIT_STEP', stepId: values.stepId, latex: values.latex }
        }),
    },

    {
      name: 'remove_step',
      title: 'Delete a line',
      description:
        'Delete one line of working. Every later line stays where it is. Do not use this to correct a line — edit_step preserves the learner\'s attempt count, and this discards it.',
      inputSchema: {
        type: 'object',
        properties: {
          stepId: { type: 'string', maxLength: 64, description: 'The id of the line to delete, from get_scratchpad.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['stepId', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, 'remove_step', input, ['stepId', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.stepId !== 'string' || !values.stepId) {
            return { invalid: 'stepId must be a string.', recovery: 'Use a step id from get_scratchpad.', field: 'stepId' }
          }
          return { type: 'REMOVE_STEP', stepId: values.stepId }
        }),
    },

    {
      name: 'resolve_proposal',
      title: 'Accept or reject the pending proposal',
      description:
        'Settle the one pending replacement proposal, accepting it into the derivation or discarding it. Do not call this when pendingProposal is null in get_scratchpad; there is nothing to settle and the call is refused.',
      inputSchema: {
        type: 'object',
        properties: {
          accept: { type: 'boolean', description: 'True to apply the proposed line, false to discard it.' },
          expectedRevision: revisionField,
          requestId: requestIdField,
        },
        required: ['accept', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, 'resolve_proposal', input, ['accept', 'expectedRevision', 'requestId'], (values) => {
          if (typeof values.accept !== 'boolean') {
            return { invalid: 'accept must be true or false.', recovery: 'Send accept: true to apply the proposal, or accept: false to discard it.', field: 'accept' }
          }
          return { type: 'RESOLVE_PROPOSAL', accept: values.accept }
        }),
    },

    {
      name: 'reset_session',
      title: 'Abandon the session and start over',
      description:
        'Discard the whole session — every step, verdict, annotation and completed round — and begin again from a fresh practice problem. Do not use this to move on after finishing a problem; new_problem keeps the receipt, and this destroys it.',
      inputSchema: {
        type: 'object',
        properties: { expectedRevision: revisionField, requestId: requestIdField },
        required: ['expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) =>
        mutate(bridge, 'reset_session', input, ['expectedRevision', 'requestId'], () => ({ type: 'RESET' })),
    },

    /* ---------------------------------------------------------------------- */
    /* Reads that compute something. Slicing the same snapshot by section would */
    /* be one tool plus a parameter, so those are deliberately absent.          */
    /* ---------------------------------------------------------------------- */

    {
      name: 'get_changes_since',
      title: 'Read what changed since a revision',
      description:
        'List the activities recorded after a revision you already hold, with who caused each. Use this to catch up cheaply while working. Do not use it to read the derivation itself — it returns the log, not the steps.',
      inputSchema: {
        type: 'object',
        properties: {
          since: { type: 'integer', minimum: 0, maximum: 1_000_000, description: 'A revision you previously read. Activities at or before it are omitted.' },
        },
        required: ['since'],
        additionalProperties: false,
      },
      // Returns only strings this product composed - round tallies, fixed limit
      // sentences, activity descriptions. No learner-authored text reaches a caller
      // here, and marking it untrusted anyway would blunt the hint where it matters.
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const values = readInput(input)
        if (!values) {
          return failure(state.revision, 'invalid_input', 'The arguments were not a JSON object.', 'Send { since: <revision> }.')
        }
        for (const key of Object.keys(values)) {
          if (key !== 'since') {
            return failure(state.revision, 'invalid_input', `Unexpected argument "${key}".`, 'This tool accepts: since.', key)
          }
        }
        if (!Number.isInteger(values.since) || (values.since as number) < 0) {
          return failure(state.revision, 'invalid_input', 'since must be an integer of 0 or more.', `Send the revision you last read, currently ${state.revision}.`, 'since')
        }
        const since = values.since as number
        const changes = state.activities
          .filter((activity) => activity.revision > since)
          .slice(-20)
          .map((activity) => ({ at: activity.revision, source: activity.source, action: activity.action }))
        return {
          ok: true,
          revision: state.revision,
          data: {
            since,
            revision: state.revision,
            upToDate: state.revision === since,
            changes,
            changeCount: changes.length,
          },
        }
      },
    },

    {
      name: 'list_problem_families',
      title: 'List the problem families',
      description:
        'List the skill families a fresh problem can be drawn from, for use as new_problem\'s familyId. Do not expect this to describe the current problem — get_scratchpad reports that.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), [])
        if (guard.bad) return guard.bad
        return {
          ok: true,
          revision: state.revision,
          data: { families: FAMILY_IDS, current: state.problem.familyId ?? FAMILY_IDS[0], count: FAMILY_IDS.length },
        }
      },
    },

    {
      name: 'validate_expression',
      title: 'Parse an expression without writing it',
      description:
        'Check whether a LaTeX expression parses under this problem\'s variables, and read the parse error if it does not. Nothing is written to the page. Do not use this to check mathematical correctness — it only reports whether the text is well formed.',
      inputSchema: {
        type: 'object',
        properties: {
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The expression to parse, in LaTeX.' },
        },
        required: ['latex'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), ['latex'])
        if (guard.bad) return guard.bad
        const latex = guard.values.latex
        if (typeof latex !== 'string' || !latex.trim()) {
          return failure(state.revision, 'invalid_input', 'latex must be a non-empty string.', 'Send the expression to parse.', 'latex')
        }
        const parsed = parseExpression(latex, allowedVariables(state))
        return {
          ok: true,
          revision: state.revision,
          data: parsed.ok
            ? { parses: true, variables: parsed.variables }
            : { parses: false, code: parsed.code, message: parsed.message },
        }
      },
    },

    {
      name: 'compare_expressions',
      title: 'Compare two expressions for equivalence',
      description:
        'Ask the page computer algebra system whether two expressions are equivalent. The answer is three-valued: equivalent, not equivalent, or could not determine — the last is a real answer and must not be read as either of the others. Do not use this to check a whole derivation; check_work does that line by line.',
      inputSchema: {
        type: 'object',
        properties: {
          left: { type: 'string', minLength: 1, maxLength: 256, description: 'The first expression, in LaTeX.' },
          right: { type: 'string', minLength: 1, maxLength: 256, description: 'The second expression, in LaTeX.' },
        },
        required: ['left', 'right'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), ['left', 'right'])
        if (guard.bad) return guard.bad
        for (const key of ['left', 'right'] as const) {
          const v = guard.values[key]
          if (typeof v !== 'string' || !v.trim()) {
            return failure(state.revision, 'invalid_input', `${key} must be a non-empty string.`, 'Send both expressions in LaTeX.', key)
          }
        }
        const result = compareExpressions(guard.values.left as string, guard.values.right as string, allowedVariables(state))
        return { ok: true, revision: state.revision, data: { ...result } }
      },
    },

    {
      name: 'differentiate_expression',
      title: 'Differentiate an expression',
      description:
        'Differentiate a LaTeX expression with respect to one variable and read the result, without writing anything to the page. Use it to verify your own reasoning before proposing a line. Do not treat the result as the learner\'s answer.',
      inputSchema: {
        type: 'object',
        properties: {
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The expression to differentiate, in LaTeX.' },
          variable: { type: 'string', minLength: 1, maxLength: 4, description: 'The variable to differentiate with respect to. Defaults to the problem variable.' },
        },
        required: ['latex'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), ['latex', 'variable'])
        if (guard.bad) return guard.bad
        const latex = guard.values.latex
        if (typeof latex !== 'string' || !latex.trim()) {
          return failure(state.revision, 'invalid_input', 'latex must be a non-empty string.', 'Send the expression in LaTeX.', 'latex')
        }
        const variable = typeof guard.values.variable === 'string' ? guard.values.variable : state.problem.variable
        const parsed = parseExpression(latex, allowedVariables(state))
        if (!parsed.ok) {
          return failure(state.revision, 'invalid_input', parsed.message, 'Fix the expression and call again.', 'latex')
        }
        try {
          const derivative = computeEngine().box(['D', parsed.expr, variable]).evaluate()
          return {
            ok: true,
            revision: state.revision,
            data: { input: latex, variable, derivative: derivative.latex, simplified: derivative.simplify().latex },
          }
        } catch {
          return failure(state.revision, 'internal_error', 'The computer algebra system could not differentiate that.', 'Try a simpler expression.', 'latex')
        }
      },
    },

    {
      name: 'evaluate_expression',
      title: 'Evaluate an expression at a point',
      description:
        'Substitute a number for the variable and read the numeric value. Use it to test a candidate line against the problem\'s answer before writing it. Do not use it to establish equivalence — one agreeing point is not equivalence, and compare_expressions exists for that.',
      inputSchema: {
        type: 'object',
        properties: {
          latex: { type: 'string', minLength: 1, maxLength: 256, description: 'The expression to evaluate, in LaTeX.' },
          at: { type: 'number', minimum: -1e6, maximum: 1e6, description: 'The value substituted for the variable.' },
          variable: { type: 'string', minLength: 1, maxLength: 4, description: 'The variable to substitute. Defaults to the problem variable.' },
        },
        required: ['latex', 'at'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), ['latex', 'at', 'variable'])
        if (guard.bad) return guard.bad
        const latex = guard.values.latex
        if (typeof latex !== 'string' || !latex.trim()) {
          return failure(state.revision, 'invalid_input', 'latex must be a non-empty string.', 'Send the expression in LaTeX.', 'latex')
        }
        const at = guard.values.at
        if (typeof at !== 'number' || !Number.isFinite(at)) {
          return failure(state.revision, 'invalid_input', 'at must be a finite number.', 'Send the point to evaluate at, for example { at: 2 }.', 'at')
        }
        const variable = typeof guard.values.variable === 'string' ? guard.values.variable : state.problem.variable
        const parsed = parseExpression(latex, allowedVariables(state))
        if (!parsed.ok) {
          return failure(state.revision, 'invalid_input', parsed.message, 'Fix the expression and call again.', 'latex')
        }
        try {
          const engine = computeEngine()
          const substituted = parsed.expr.subs({ [variable]: engine.box(at) }).N()
          const value = substituted.re
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            return failure(state.revision, 'not_ready', 'That expression did not reduce to a real number at this point.', 'Check that every symbol has a value here, then try another point.', 'at')
          }
          return { ok: true, revision: state.revision, data: { input: latex, variable, at, value } }
        } catch {
          return failure(state.revision, 'internal_error', 'The computer algebra system could not evaluate that.', 'Try a simpler expression or another point.', 'latex')
        }
      },
    },
    {
      name: 'get_platform',
      title: 'Read WebMCP platform support',
      description:
        'Probe this browser for the WebMCP features beyond plain tool registration — origin scoping, cross-origin reads, toolchange events, declarative form tools, withdrawing a tool, and annotations — and read what each one actually did. Every verdict comes from executing the feature, and "unsupported" is a real answer. Do not use this to read the tool list; that is getTools on the model context.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute(input) {
        const state = bridge.getState()
        if (!state) return NOT_MOUNTED
        const guard = onlyKeys(state, readInput(input), [])
        if (guard.bad) return guard.bad
        try {
          const features = await bridge.probePlatform()
          return {
            ok: true,
            revision: state.revision,
            data: {
              features: features.map((f) => ({ id: f.id, label: f.label, status: f.status, observed: f.detail })),
              supported: features.filter((f) => f.status === 'supported').length,
              total: features.length,
              note: 'Each status was produced by executing the feature in this page load, not read from a table.',
            },
          }
        } catch {
          return failure(state.revision, 'internal_error', 'The platform probes could not complete.', 'Reload the page and try once more.')
        }
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
