import type { ToolResult, WorldTool } from '../tools/definitions'
import type { ReplayCall, ReplayDecision, ReplayHooks, ReplayOutcome, ReplayRun, ReplayScript, ReplayStep } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root
  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number(key)
      current = Number.isInteger(index) ? current[index] : undefined
    } else if (isRecord(current)) {
      current = current[key]
    } else {
      return undefined
    }
    if (current === undefined) return undefined
  }
  return current
}

/**
 * Replace every `{ $ref: 'stepId.path' }` inside `input` with the value found
 * at that path in the referenced step's result. Unresolvable references
 * become `undefined`, so the tool's own validation reports the problem.
 */
export function resolveRefs(input: unknown, results: Record<string, ToolResult>): unknown {
  if (Array.isArray(input)) return input.map((entry) => resolveRefs(entry, results))
  if (!isRecord(input)) return input
  if (typeof input.$ref === 'string' && Object.keys(input).length === 1) {
    const [stepId, ...path] = input.$ref.split('.')
    const result = results[stepId]
    return result ? readPath(result, path) : undefined
  }
  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) resolved[key] = resolveRefs(value, results)
  return resolved
}

const sleep = (ms: number, shouldStop?: () => boolean) => new Promise<void>((resolve) => {
  const started = Date.now()
  const tick = () => {
    if (shouldStop?.() || Date.now() - started >= ms) resolve()
    else setTimeout(tick, Math.min(80, ms))
  }
  tick()
})

const stepKey = (step: ReplayStep, index: number) => step.id ?? `step${index}`

/** The step's own tool first, then its simultaneous `calls`. */
export function stepCalls(step: ReplayStep): ReplayCall[] {
  const own: ReplayCall[] = step.tool ? [{ id: step.id, tool: step.tool, input: step.input, optional: step.optional }] : []
  return [...own, ...(step.calls ?? [])]
}

const callKey = (step: ReplayStep, index: number, call: ReplayCall, callIndex: number) => call.id ?? (callIndex === 0 ? stepKey(step, index) : `${stepKey(step, index)}_${callIndex}`)

type Settled = { call: ReplayCall; result: ToolResult; error?: string }

async function runCall(tools: WorldTool[], step: ReplayStep, index: number, call: ReplayCall, callIndex: number, results: Record<string, ToolResult>, hooks: ReplayHooks): Promise<Settled> {
  const tool = tools.find((candidate) => candidate.name === call.tool)
  if (!tool) {
    const error = `No registered tool named ${call.tool}.`
    return { call, result: { ok: false, summary: 'No changes made', error }, error }
  }
  const input = resolveRefs(call.input, results)
  hooks.onStep?.(step, index, input, call, callIndex)
  try {
    return { call, result: await tool.execute(input) }
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : 'The tool call threw.'
    return { call, result: { ok: false, summary: 'No changes made', error }, error }
  }
}

/**
 * Run a script sequentially through the real tool objects. Each step's calls
 * are awaited before the next step (a step's own `calls` run together);
 * `waitMs` pauses are honoured; a `proposal` waits for the learner's decision;
 * the first `ok: false` stops the run unless the call is `optional`.
 */
export async function runReplayScript(script: ReplayScript, tools: WorldTool[], hooks: ReplayHooks = {}): Promise<ReplayRun> {
  const outcomes: ReplayOutcome[] = []
  const results: Record<string, ToolResult> = {}
  const stopped = (index: number): ReplayRun => ({ completed: false, stoppedAt: index, outcomes, results })

  for (let index = 0; index < script.steps.length; index += 1) {
    const step = script.steps[index]
    if (hooks.shouldStop?.()) return stopped(index)
    await hooks.beforeStep?.(index, step)
    if (hooks.shouldStop?.()) return stopped(index)

    if (step.say) hooks.onSay?.(step.say, index)
    if (step.humanNote) hooks.onHumanNote?.(step.humanNote, index)

    let decision: ReplayDecision | undefined
    if (step.proposal) {
      decision = hooks.awaitDecision ? await hooks.awaitDecision(step, index) : 'accept'
      if (hooks.shouldStop?.()) return stopped(index)
      hooks.onDecision?.(step, index, decision)
      if (decision === 'decline') {
        outcomes.push({ index, step, decision })
        const target = step.proposal.onDecline
        const jump = target ? script.steps.findIndex((candidate) => candidate.id === target) : -1
        if (jump >= 0) index = jump - 1
        continue
      }
    }

    const calls = stepCalls(step)
    if (calls.length) {
      const settled = await Promise.all(calls.map((call, callIndex) => runCall(tools, step, index, call, callIndex, results, hooks)))
      settled.forEach((entry, callIndex) => { results[callKey(step, index, entry.call, callIndex)] = entry.result })
      outcomes.push({ index, step, result: settled[0].result, error: settled[0].error, ...(settled.length > 1 ? { calls: settled } : {}), ...(decision ? { decision } : {}) })
      settled.forEach((entry, callIndex) => hooks.onResult?.(step, index, entry.result, entry.call, callIndex))
      if (settled.some((entry) => !entry.result.ok && !entry.call.optional)) return stopped(index)
    } else {
      outcomes.push({ index, step, ...(decision ? { decision } : {}) })
    }

    if (step.waitMs && step.waitMs > 0) await sleep(step.waitMs, hooks.shouldStop)
  }

  return { completed: true, outcomes, results }
}
