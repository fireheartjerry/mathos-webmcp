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
})
