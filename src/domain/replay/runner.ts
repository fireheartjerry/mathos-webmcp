import type { ToolResult, WorldTool } from '../tools/definitions'
import type { ReplayHooks, ReplayOutcome, ReplayRun, ReplayScript, ReplayStep } from './types'

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

/**
 * Run a script sequentially through the real tool objects. Each tool result is
 * awaited before the next step; `waitMs` pauses are honoured; the first
 * `ok: false` stops the run unless the step is `optional`.
 */
export async function runReplayScript(script: ReplayScript, tools: WorldTool[], hooks: ReplayHooks = {}): Promise<ReplayRun> {
  const outcomes: ReplayOutcome[] = []
  const results: Record<string, ToolResult> = {}

  for (let index = 0; index < script.steps.length; index += 1) {
    const step = script.steps[index]
    if (hooks.shouldStop?.()) return { completed: false, stoppedAt: index, outcomes, results }
    await hooks.beforeStep?.(index, step)
    if (hooks.shouldStop?.()) return { completed: false, stoppedAt: index, outcomes, results }

    if (step.say) hooks.onSay?.(step.say, index)
    if (step.humanNote) hooks.onHumanNote?.(step.humanNote, index)

    if (step.tool) {
      const tool = tools.find((candidate) => candidate.name === step.tool)
      let result: ToolResult
      let error: string | undefined
      if (!tool) {
        error = `No registered tool named ${step.tool}.`
        result = { ok: false, summary: 'No changes made', error }
      } else {
        const input = resolveRefs(step.input, results)
        hooks.onStep?.(step, index, input)
        try {
          result = await tool.execute(input)
        } catch (caught) {
          error = caught instanceof Error ? caught.message : 'The tool call threw.'
          result = { ok: false, summary: 'No changes made', error }
        }
      }
      results[stepKey(step, index)] = result
      outcomes.push({ index, step, result, error })
      hooks.onResult?.(step, index, result)
      if (!result.ok && !step.optional) return { completed: false, stoppedAt: index, outcomes, results }
    } else {
      outcomes.push({ index, step })
    }

    if (step.waitMs && step.waitMs > 0) await sleep(step.waitMs, hooks.shouldStop)
  }

  return { completed: true, outcomes, results }
}
