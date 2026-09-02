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
}

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
  /** Present when the step called a tool. */
  result?: ToolResult
  /** Set when the tool was missing or threw; the result, if any, is then synthetic. */
  error?: string
}

export type ReplayHooks = {
  onSay?: (text: string, index: number) => void
  onHumanNote?: (text: string, index: number) => void
  /** Fired just before the tool executes, with the resolved input. */
  onStep?: (step: ReplayStep, index: number, input: unknown) => void
  onResult?: (step: ReplayStep, index: number, result: ToolResult) => void
  /** Polled before every step and during waits; return true to abort. */
  shouldStop?: () => boolean
  /** Awaited before every step; the console uses it as a pause / single-step gate. */
  beforeStep?: (index: number, step: ReplayStep) => Promise<void> | void
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
