import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerTools } from './registry'
import type { ToolBridge } from './definitions'

const bridge: ToolBridge = {
  getState: () => null,
  run: async () => {
    throw new Error('not used')
  },
  requestCache: new Map(),
  onToolSuccess: () => {},
}

afterEach(() => vi.unstubAllGlobals())

describe('browser registration read-back', () => {
  it('does not claim tools are live when the browser confirms none', async () => {
    vi.stubGlobal('document', {
      modelContext: {
        registerTool: async () => undefined,
        getTools: async () => [],
      },
    })

    const registration = await registerTools(bridge)
    expect(registration.status.state).toBe('partial')
    if (registration.status.state === 'partial') {
      expect(registration.status.registered).toBe(0)
      expect(registration.status.failures).toHaveLength(6)
    }
  })

  it('uses read-back counts even when some registration calls reject', async () => {
    const getTools = vi.fn(async () => [
      { name: 'get_scratchpad' },
      { name: 'check_work' },
    ])
    vi.stubGlobal('document', {
      modelContext: {
        registerTool: async (tool: { name: string }) => {
          if (tool.name === 'annotate_step') throw new Error('blocked')
        },
        getTools,
      },
    })

    const registration = await registerTools(bridge)
    expect(getTools).toHaveBeenCalledOnce()
    expect(registration.status).toEqual({
      state: 'partial',
      registered: 2,
      total: 6,
      failures: ['annotate_step', 'propose_step', 'new_problem', 'get_receipt'],
    })
  })
})
