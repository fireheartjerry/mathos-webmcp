import { describe, expect, it } from 'vitest'
import { createSession } from './reducer'
import { isRestorable, loadSession, STORAGE_KEY } from './persistence'

function memoryStorage(value: unknown) {
  let raw = JSON.stringify(value)
  return {
    getItem: (key: string) => (key === STORAGE_KEY ? raw : null),
    setItem: (_key: string, next: string) => {
      raw = next
    },
    removeItem: () => {
      raw = ''
    },
    read: () => raw,
  }
}

describe('session persistence validation', () => {
  it('accepts a complete current session', () => {
    expect(isRestorable(createSession(2026, 'persist-ok'))).toBe(true)
  })

  it.each([
    ['missing problem definitions', (state: any) => delete state.problem.definitions],
    ['missing derived answer', (state: any) => delete state.problem.answer],
    ['negative tally', (state: any) => (state.tally.checks = -1)],
    ['malformed activity', (state: any) => state.activities.push({ source: 'learner' })],
    ['invalid seen signatures', (state: any) => state.seenSignatures.push(42)],
  ])('rejects %s before the UI can restore it', (_name, mutate) => {
    const state: any = structuredClone(createSession(2026, 'persist-bad'))
    mutate(state)
    expect(isRestorable(state)).toBe(false)
    const storage = memoryStorage(state)
    expect(loadSession(storage)).toBeNull()
    expect(storage.read()).toBe('')
  })

  it('migrates legacy aggregate intervention counts without inventing provenance', () => {
    const legacy: any = structuredClone(createSession(2026, 'persist-legacy-counts'))
    legacy.tally = { checks: 1, annotations: 2, proposalsOffered: 3, proposalsAccepted: 1 }
    legacy.history = [
      {
        round: 'practice',
        problemId: 'legacy-problem',
        sound: true,
        checks: 1,
        agentAnnotations: 2,
        agentProposalsOffered: 3,
        agentProposalsAccepted: 1,
      },
    ]

    const restored = loadSession(memoryStorage(legacy))
    expect(restored?.tally.annotations).toEqual({
      agent: 0,
      localInspector: 0,
      unattributed: 2,
    })
    expect(restored?.history[0].proposalsOffered).toEqual({
      agent: 0,
      localInspector: 0,
      unattributed: 3,
    })
  })
})
