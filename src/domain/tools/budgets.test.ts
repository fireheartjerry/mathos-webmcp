import { describe, expect, it } from 'vitest'
import { createTools, MAX_OUTPUT_CHARS, withinOutputBudget } from './definitions'
import type { ToolBridge } from './definitions'
import { applyAction, createSession } from '../session/reducer'
import type { SessionAction, SessionState } from '../session/types'

/**
 * Chrome's published budgets for WebMCP tool authors:
 *
 *   500 characters per tool description
 *   150 characters per parameter description
 *    30 characters per tool name and per parameter name
 *   1.5K characters per individual tool output
 *
 * The first three are properties of the source and are asserted directly. The fourth
 * is a property of runtime data, so it is enforced in the tool layer and checked here
 * against a session deliberately stuffed with long content.
 */
const ENV = { now: () => 1_000_000 }

function harness(initial?: SessionState) {
  let state: SessionState | null = initial ?? createSession(2026, 'session-budget')
  const bridge: ToolBridge = {
    getState: () => state,
    run: async (action: SessionAction) => {
      const result = applyAction(state as SessionState, action, 'agent', ENV)
      if (result.ok) state = result.state
      return result
    },
    requestCache: new Map(),
    onToolSuccess: () => {},
    probePlatform: async () => [],
  }
  return { tools: createTools(bridge), get state() { return state as SessionState } }
}

describe('Chrome tool-author budgets', () => {
  const { tools } = harness()

  it('keeps every tool name within 30 characters', () => {
    for (const tool of tools) expect(tool.name.length, tool.name).toBeLessThanOrEqual(30)
  })

  it('keeps every tool description within 500 characters', () => {
    for (const tool of tools) expect(tool.description.length, tool.name).toBeLessThanOrEqual(500)
  })

  it('keeps every parameter name and description within budget', () => {
    for (const tool of tools) {
      const props = (tool.inputSchema as { properties: Record<string, { description?: string }> }).properties
      for (const [name, schema] of Object.entries(props)) {
        expect(name.length, `${tool.name}.${name}`).toBeLessThanOrEqual(30)
        expect((schema.description ?? '').length, `${tool.name}.${name}`).toBeLessThanOrEqual(150)
      }
    }
  })

  it('holds a fat payload inside the output budget and says it truncated', () => {
    const long = 'x'.repeat(4000)
    const envelope = withinOutputBudget({ ok: true, revision: 1, data: { note: long, keep: 'short' } })
    expect(JSON.stringify(envelope).length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS)
    if (envelope.ok) expect(envelope.data.outputTruncated).toBe(true)
  })

  it('leaves a small payload untouched', () => {
    const original = { ok: true as const, revision: 1, data: { a: 'one', b: 'two' } }
    expect(withinOutputBudget(original)).toEqual(original)
  })

  it('keeps get_scratchpad inside the budget with a full, long derivation', async () => {
    const h = harness()
    const add = h.tools.find((t) => t.name === 'add_step')!
    for (let i = 0; i < 10; i++) {
      await add.execute({
        latex: `${i + 1}x^{2} + ${i}x + ${'9'.repeat(20)}`,
        expectedRevision: h.state.revision,
        requestId: `req-fat-${i}-aaaa`,
      })
    }
    const read = h.tools.find((t) => t.name === 'get_scratchpad')!
    const result = await read.execute({})
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS)
  })

  it('keeps get_platform inside the budget with six verbose verdicts', async () => {
    const verbose = Array.from({ length: 6 }, (_, i) => ({
      id: `feature-${i}`,
      label: `A feature with a fairly long label ${i}`,
      status: 'partial' as const,
      detail: `An observation long enough to matter, repeated for length. ${'detail '.repeat(20)}`,
    }))
    let state: SessionState | null = createSession(7, 'session-platform')
    const bridge: ToolBridge = {
      getState: () => state,
      run: async () => ({ ok: false, code: 'invalid_phase', message: 'x', recovery: 'y' }),
      requestCache: new Map(),
      onToolSuccess: () => {},
      probePlatform: async () => verbose,
    }
    const platform = createTools(bridge).find((t) => t.name === 'get_platform')!
    const result = await platform.execute({})
    expect(JSON.stringify(result).length).toBeLessThanOrEqual(MAX_OUTPUT_CHARS)
  })
})
