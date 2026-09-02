import type { ToolResult } from '../tools/definitions'

/**
 * One beat of an agent replay. The words are scripted; the tool call is real.
 * A step may carry any combination of a line to say, a tool to call, a pause,
 * and a note describing what the human does at this point of the film.
 */
export type ReplayStep = {
  /** Stable handle so later steps can reference this step's result via `$ref`. */
  id?: string
  /** The agent's scripted line, shown before the tool call. */
  say?: string
  /** Name of a registered WebMCP tool; executed through the real tool object. */
  tool?: string
  /**
   * Tool input. Any nested `{ $ref: 'stepId.path.into.result' }` is replaced
   * with the value at that path inside the referenced step's ToolResult
   * (for example `{ $ref: 'graph.changedIds.1' }` or `{ $ref: 'ink.data.objects.0.id' }`).
   */
  input?: unknown
  /** Pause after the step, in milliseconds. */
  waitMs?: number
  /** What the human does here; shown in graphite, never executed. */
  humanNote?: string
  /** A failing result does not stop the script. Use for steps that depend on human work. */
  optional?: boolean
  /**
   * Extra tool calls fired at the same time as `tool` (Promise.all). The console
   * groups them under one line. Each call's result is keyed by its `id`, or by
   * `<stepKey>_<n>` (n counted from 1) when it has none.
   */
  calls?: ReplayCall[]
  /**
   * Show an Accept / Decline card and pause the runner until the learner decides.
   * On accept the step's `tool` (if any) runs; on decline the runner jumps to the
   * step whose `id` equals `onDecline` when given, else continues with the next step.
   */
  proposal?: ReplayProposal
}

export type ReplayCall = {
  id?: string
  tool: string
  input?: unknown
  /** A failing result does not stop the script. */
  optional?: boolean
}

export type ReplayProposal = {
  /** Card heading, e.g. "Turn ink into live math". */
  title: string
  /** Accept button label. */
  accept: string
  /** Decline button label. */
  decline: string
  /** Step id to skip to when declined. */
  onDecline?: string
}

export type ReplayDecision = 'accept' | 'decline'

export type ReplayScript = {
  id: string
  title: string
  /** The scripted learner prompt that opens the console. */
  prompt?: string
  steps: ReplayStep[]
}

export type ReplayOutcome = {
  index: number
  step: ReplayStep
  /** Present when the step called a tool (the step's own `tool`, or the first of `calls`). */
  result?: ToolResult
  /** Every call the step made, in order, when it made more than one. */
  calls?: { call: ReplayCall; result: ToolResult; error?: string }[]
  /** Set when the tool was missing or threw; the result, if any, is then synthetic. */
  error?: string
  /** The learner's answer to the step's proposal, when it had one. */
  decision?: ReplayDecision
}

export type ReplayHooks = {
  onSay?: (text: string, index: number) => void
  onHumanNote?: (text: string, index: number) => void
  /** Fired just before each tool executes, with the resolved input; `callIndex` counts the step's calls. */
  onStep?: (step: ReplayStep, index: number, input: unknown, call: ReplayCall, callIndex: number) => void
  onResult?: (step: ReplayStep, index: number, result: ToolResult, call: ReplayCall, callIndex: number) => void
  /** Polled before every step and during waits; return true to abort. */
  shouldStop?: () => boolean
  /** Awaited before every step; the console uses it as a pause / single-step gate. */
  beforeStep?: (index: number, step: ReplayStep) => Promise<void> | void
  /**
   * Awaited for every step carrying `proposal`, after its `say` line is shown.
   * When absent, proposals are accepted immediately.
   */
  awaitDecision?: (step: ReplayStep, index: number) => Promise<ReplayDecision>
  /** Fired once the decision is in, before the tool (accept) or the jump (decline). */
  onDecision?: (step: ReplayStep, index: number, decision: ReplayDecision) => void
}

export type ReplayRun = {
  /** True when every step ran (optional failures included). */
  completed: boolean
  /** Index of the step that stopped the run, when it did not complete. */
  stoppedAt?: number
  outcomes: ReplayOutcome[]
  /** Results keyed by step id (or `step<index>` when the step has no id). */
  results: Record<string, ToolResult>
}
