type Waiter = {
  sessionId: string
  revision: number
  resolve: () => void
}

/**
 * A tool mutation should not return before React has painted it. Session replacement
 * is also a terminal paint event: an old mutation must be released rather than wait
 * forever for a revision the new session will never reach.
 */
export function createPaintBarrier(initialSessionId: string, initialRevision: number) {
  let paintedSessionId = initialSessionId
  let paintedRevision = initialRevision
  const retiredSessions = new Set<string>()
  const waiters = new Set<Waiter>()

  return {
    wait(sessionId: string, revision: number) {
      if (retiredSessions.has(sessionId)) return Promise.resolve()
      if (sessionId === paintedSessionId && paintedRevision >= revision) return Promise.resolve()
      return new Promise<void>((resolve) => waiters.add({ sessionId, revision, resolve }))
    },

    mark(sessionId: string, revision: number) {
      if (sessionId !== paintedSessionId) retiredSessions.add(paintedSessionId)
      paintedSessionId = sessionId
      paintedRevision = revision
      for (const waiter of waiters) {
        if (
          retiredSessions.has(waiter.sessionId) ||
          (waiter.sessionId === sessionId && waiter.revision <= revision)
        ) {
          waiter.resolve()
          waiters.delete(waiter)
        }
      }
    },
  }
}
