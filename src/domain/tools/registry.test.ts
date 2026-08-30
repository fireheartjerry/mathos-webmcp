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
    probePlatform: async () => [],
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
      expect(registration.status.failures).toHaveLength(18)
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
    // `failures` is every tool the read-back did not confirm, not merely the ones whose
    // registerTool call rejected: a rejection is not proof of absence, and an
    // acceptance is not proof of presence.
    expect(registration.status.state).toBe('partial')
    if (registration.status.state === 'partial') {
      expect(registration.status.registered).toBe(2)
      expect(registration.status.total).toBe(18)
      expect(registration.status.failures).toHaveLength(16)
      expect(registration.status.failures).not.toContain('get_scratchpad')
      expect(registration.status.failures).toContain('annotate_step')
    }
  })
})
