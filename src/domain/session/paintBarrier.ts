type Waiter = {
  sessionId: string
  revision: number
  resolve: (outcome: PaintOutcome) => void
}

/** Whether the caller's change was confirmed on screen before the call returned. */
export type PaintOutcome = 'painted' | 'unconfirmed'

/**
 * How long to wait for a paint before returning anyway.
 *
 * There was no deadline here, and a mutation that applied but never painted left the
 * caller's promise pending forever. That is not hypothetical: with the tab occluded,
 * `add_step` was observed writing the step and advancing the revision while its
 * `executeTool` promise never settled, so an agent could not tell that its own write
 * had succeeded. Waiting for the human to see the change is worth doing; waiting
 * indefinitely for a paint that may never come is not, and reporting `unconfirmed` is
 * more useful to a caller than silence.
 */
export const PAINT_DEADLINE_MS = 1500

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
    wait(
      sessionId: string,
      revision: number,
      deadlineMs: number = PAINT_DEADLINE_MS,
    ): Promise<PaintOutcome> {
      if (retiredSessions.has(sessionId)) return Promise.resolve('painted')
      if (sessionId === paintedSessionId && paintedRevision >= revision) return Promise.resolve('painted')
      return new Promise<PaintOutcome>((resolve) => {
        const waiter: Waiter = { sessionId, revision, resolve }
        waiters.add(waiter)
        const timer = setTimeout(() => {
          if (waiters.delete(waiter)) resolve('unconfirmed')
        }, deadlineMs)
        const settled = waiter.resolve
        waiter.resolve = (outcome) => {
          clearTimeout(timer)
          settled(outcome)
        }
      })
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
          waiter.resolve('painted')
          waiters.delete(waiter)
        }
      }
    },
  }
}
