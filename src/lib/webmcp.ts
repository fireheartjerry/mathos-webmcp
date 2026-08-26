export const DIAGNOSIS_ID = 'shared-path-omission-v1'
export const LESSON_ID = 'shared-path-two-routes-v1'

export type Stage = 'initial' | 'diagnosis' | 'lesson' | 'initial_correct' | 'transfer' | 'receipt'
export type ActivitySource = 'agent' | 'learner'

export type Activity = {
  id: string
  source: ActivitySource
  action: string
  revision: number
}

export type StudioState = {
  session_id: string
  stage: Stage
  revision: number
  initial_attempted: boolean
  transfer_attempted: boolean
  initial_message: string
  transfer_message: string
  used_lesson: boolean
  activities: Activity[]
}

export type SemanticAction =
  | { type: 'CHECK_ATTEMPT'; attempt: string }
  | { type: 'SHOW_LESSON'; diagnosisId: string }
  | { type: 'START_TRANSFER'; lessonId?: string }
  | { type: 'RESET' }

type ActionSuccess = {
  ok: true
  state: StudioState
  activity: Activity
  data: Record<string, unknown>
}

type ActionFailure = {
  ok: false
  code: 'invalid_phase' | 'invalid_input'
  message: string
  recovery: string
}

export type ActionResult = ActionSuccess | ActionFailure

type ToolError = {
  code: 'stale_revision' | 'invalid_phase' | 'invalid_input' | 'aborted'
  message: string
  recovery: string
}

export type ToolEnvelope =
  | { ok: true; revision: number; activityId: string | null; data: Record<string, unknown> }
  | { ok: false; revision: number; error: ToolError }

type ToolExecutionContext = { signal?: AbortSignal }

type WebMcpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: {
    readOnlyHint: boolean
    untrustedContentHint: boolean
  }
  execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolEnvelope>
}

type ToolBridge = {
  getState: () => StudioState
  runAction: (action: SemanticAction, source: ActivitySource) => Promise<ActionResult>
  requestCache: Map<string, ToolEnvelope | Promise<ToolEnvelope>>
}

export type LearningBridgeDelegates = {
  getState: () => StudioState
  runAction: (action: SemanticAction, source: ActivitySource) => ActionResult
  afterCommit: (revision: number) => Promise<void>
}

const EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/

function failure(state: StudioState, code: ToolError['code'], message: string, recovery: string): ToolEnvelope {
  return { ok: false, revision: state.revision, error: { code, message, recovery } }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

function hasOnlyKeys(input: Record<string, unknown>, keys: string[]) {
  return Object.keys(input).every((key) => keys.includes(key))
}

function validRevision(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000
}

function validRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID.test(value)
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 96
}

function workspaceData(state: StudioState) {
  const transferVisible = state.stage === 'transfer' || state.stage === 'receipt'
  const validNextActions: Record<Stage, string[]> = {
    initial: ['check_current_attempt'],
    diagnosis: ['show_targeted_lesson'],
    lesson: ['start_transfer_problem'],
    initial_correct: ['start_transfer_problem'],
    transfer: ['check_current_attempt'],
    receipt: ['get_learning_receipt'],
  }

  return {
    session_id: state.session_id,
    stage: state.stage,
    revision: state.revision,
    problem: transferVisible
      ? { id: 'transfer-shared-path-v1', prompt: 'Find ds/dx at x = 1.', display: ['q = 2x', 'k = x²', 's = q · k + q'] }
      : { id: 'initial-shared-path-v1', prompt: 'Find dy/dx at x = 2.', display: ['a = x²', 'b = 3x', 'y = a · b + a'] },
    hasAttempt: transferVisible ? state.transfer_attempted : state.initial_attempted,
    validNextActions: validNextActions[state.stage],
    activeConcept: 'Add the derivative contribution from every path through a shared value.',
    visibleIds: {
      diagnosisId: state.stage === 'diagnosis' ? DIAGNOSIS_ID : null,
      lessonId: state.stage === 'lesson' || state.stage === 'initial_correct' ? LESSON_ID : null,
    },
  }
}

function receiptData(state: StudioState) {
  return {
    claims: [
      'You found both paths through a shared value.',
      state.used_lesson ? 'You solved a fresh problem after the lesson during this session.' : 'You solved a fresh problem without a remedial lesson during this session.',
      'This receipt does not prove permanent mastery.',
    ],
  }
}

async function mutationExecutor(
  bridge: ToolBridge,
  input: unknown,
  context: ToolExecutionContext,
  keys: string[],
  action: (values: Record<string, unknown>) => SemanticAction,
): Promise<ToolEnvelope> {
  const state = bridge.getState()
  if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
  if (!isRecord(input) || !hasOnlyKeys(input, keys) || !validRevision(input.expectedRevision) || !validRequestId(input.requestId)) {
    return failure(state, 'invalid_input', 'The tool input is not valid.', 'Use the published input schema and try again.')
  }

  const cached = bridge.requestCache.get(input.requestId)
  if (cached) return cached
  if (input.expectedRevision !== state.revision) {
    return failure(state, 'stale_revision', 'The learning workspace changed.', 'Read the workspace again and use its current revision.')
  }

  const pending = (async (): Promise<ToolEnvelope> => {
    const result = await bridge.runAction(action(input), 'agent')
    if (!result.ok) return failure(state, result.code, result.message, result.recovery)
    return { ok: true, revision: result.state.revision, activityId: result.activity.id, data: result.data }
  })()
  bridge.requestCache.set(input.requestId, pending)
  const envelope = await pending
  if (bridge.requestCache.get(input.requestId) === pending) {
    if (envelope.ok) bridge.requestCache.set(input.requestId, envelope)
    else bridge.requestCache.delete(input.requestId)
  }
  return envelope
}

export function createLearningTools(bridge: ToolBridge): WebMcpTool[] {
  return [
    {
      name: 'get_learning_workspace',
      description: 'See the learner’s current problem, progress, and safe next actions.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, context) {
        const state = bridge.getState()
        if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
        if (!isRecord(input) || !hasOnlyKeys(input, [])) return failure(state, 'invalid_input', 'This tool takes an empty object.', 'Call the tool with {}.')
        return { ok: true, revision: state.revision, activityId: null, data: workspaceData(state) }
      },
    },
    {
      name: 'check_current_attempt',
      description: 'Check one answer and move the visible learning session to its honest result.',
      inputSchema: {
        type: 'object',
        properties: {
          attempt: { type: 'string', minLength: 1, maxLength: 256 },
          expectedRevision: { type: 'integer', minimum: 0, maximum: 1_000_000_000 },
          requestId: { type: 'string', minLength: 8, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$' },
        },
        required: ['attempt', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input, context) {
        const state = bridge.getState()
        if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
        if (!isRecord(input) || typeof input.attempt !== 'string' || input.attempt.length < 1 || input.attempt.length > 256) {
          return failure(state, 'invalid_input', 'The attempt must be 1 to 256 characters.', 'Send a short answer as the attempt.')
        }
        return mutationExecutor(bridge, input, context, ['attempt', 'expectedRevision', 'requestId'], (values) => ({ type: 'CHECK_ATTEMPT', attempt: values.attempt as string }))
      },
    },
    {
      name: 'show_targeted_lesson',
      description: 'Open the short lesson that repairs the diagnosed missing-path idea.',
      inputSchema: {
        type: 'object',
        properties: {
          diagnosisId: { type: 'string', minLength: 1, maxLength: 96 },
          expectedRevision: { type: 'integer', minimum: 0, maximum: 1_000_000_000 },
          requestId: { type: 'string', minLength: 8, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$' },
        },
        required: ['diagnosisId', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, context) {
        const state = bridge.getState()
        if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
        if (!isRecord(input) || !validId(input.diagnosisId)) {
          return failure(state, 'invalid_input', 'The diagnosis ID must be 1 to 96 characters.', 'Use the visible diagnosis ID from the workspace.')
        }
        return mutationExecutor(bridge, input, context, ['diagnosisId', 'expectedRevision', 'requestId'], (values) => ({ type: 'SHOW_LESSON', diagnosisId: values.diagnosisId as string }))
      },
    },
    {
      name: 'start_transfer_problem',
      description: 'Start a fresh problem after the lesson or a correct first answer.',
      inputSchema: {
        type: 'object',
        properties: {
          lessonId: { type: 'string', minLength: 1, maxLength: 96 },
          expectedRevision: { type: 'integer', minimum: 0, maximum: 1_000_000_000 },
          requestId: { type: 'string', minLength: 8, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$' },
        },
        required: ['lessonId', 'expectedRevision', 'requestId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input, context) {
        const state = bridge.getState()
        if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
        if (!isRecord(input) || !validId(input.lessonId)) {
          return failure(state, 'invalid_input', 'The lesson ID must be 1 to 96 characters.', 'Use the visible lesson ID from the workspace.')
        }
        return mutationExecutor(bridge, input, context, ['lessonId', 'expectedRevision', 'requestId'], (values) => ({ type: 'START_TRANSFER', lessonId: values.lessonId as string }))
      },
    },
    {
      name: 'get_learning_receipt',
      description: 'Read the three narrow evidence claims after the fresh problem passes.',
      inputSchema: EMPTY_SCHEMA,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, context) {
        const state = bridge.getState()
        if (context.signal?.aborted) return failure(state, 'aborted', 'The tool call was cancelled.', 'Call the tool again when ready.')
        if (!isRecord(input) || !hasOnlyKeys(input, [])) return failure(state, 'invalid_input', 'This tool takes an empty object.', 'Call the tool with {}.')
        if (state.stage !== 'receipt') return failure(state, 'invalid_phase', 'The learning receipt is not ready.', 'Pass the transfer problem first.')
        return { ok: true, revision: state.revision, activityId: null, data: receiptData(state) }
      },
    },
  ]
}

let delegates: LearningBridgeDelegates | undefined
let lastState: StudioState | undefined
const pageRequestCache = new Map<string, ToolEnvelope | Promise<ToolEnvelope>>()
const pageBridge: ToolBridge = {
  getState() {
    if (delegates) lastState = delegates.getState()
    if (!lastState) throw new Error('The learning studio is not mounted.')
    return lastState
  },
  async runAction(action, source) {
    const mounted = delegates
    if (!mounted) return { ok: false, code: 'invalid_phase', message: 'The learning studio is not mounted.', recovery: 'Wait for the learning studio to finish loading.' }
    const result = mounted.runAction(action, source)
    if (result.ok) {
      lastState = result.state
      await mounted.afterCommit(result.state.revision)
    }
    return result
  },
  requestCache: pageRequestCache,
}
let registration: { controller: AbortController; promise: Promise<boolean> } | undefined

function ensureRegistration() {
  if (!document.modelContext) return Promise.resolve(false)
  if (registration) return registration.promise

  const controller = new AbortController()
  const tools = createLearningTools(pageBridge)
  const current = {
    controller,
    promise: Promise.all(tools.map((tool) => document.modelContext!.registerTool(tool, { signal: controller.signal }))).then(() => true),
  }
  registration = current
  const onPageHide = () => {
    controller.abort()
    delegates = undefined
    lastState = undefined
    pageRequestCache.clear()
    if (registration === current) registration = undefined
  }
  window.addEventListener('pagehide', onPageHide, { once: true })
  current.promise.catch(() => {
    controller.abort()
    window.removeEventListener('pagehide', onPageHide)
    if (registration === current) registration = undefined
  })
  return current.promise
}

export function mountLearningTools(nextDelegates: LearningBridgeDelegates) {
  const nextState = nextDelegates.getState()
  if (lastState && lastState.session_id !== nextState.session_id) pageRequestCache.clear()
  delegates = nextDelegates
  lastState = nextState
  return {
    registration: ensureRegistration(),
    disconnect() {
      if (delegates === nextDelegates) {
        lastState = nextDelegates.getState()
        delegates = undefined
      }
    },
  }
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: WebMcpTool, options: { signal: AbortSignal }) => Promise<void>
      getTools?: () => Promise<unknown>
      executeTool?: (name: string, input: unknown) => Promise<string>
    }
  }
}
