import { describe, expect, it, vi } from 'vitest'
import { createPaintBarrier } from './paintBarrier'

describe('the paint barrier', () => {
  it('releases an old-session waiter when Start over replaces the session', async () => {
    const barrier = createPaintBarrier('session-a', 0)
    const resolved = vi.fn()
    void barrier.wait('session-a', 1).then(resolved)

    barrier.mark('session-b', 0)
    await Promise.resolve()

    expect(resolved).toHaveBeenCalledOnce()
  })

  it('waits for the committed revision in the same session', async () => {
    const barrier = createPaintBarrier('session-a', 0)
    const resolved = vi.fn()
    void barrier.wait('session-a', 2).then(resolved)
    barrier.mark('session-a', 1)
    await Promise.resolve()
    expect(resolved).not.toHaveBeenCalled()
    barrier.mark('session-a', 2)
    await Promise.resolve()
    expect(resolved).toHaveBeenCalledOnce()
  })

  it('waits for a newly adopted session until that session paints', async () => {
    const barrier = createPaintBarrier('ssr-session', 0)
    const resolved = vi.fn()
    void barrier.wait('real-session', 0).then(resolved)
    await Promise.resolve()
    expect(resolved).not.toHaveBeenCalled()
    barrier.mark('real-session', 0)
    await Promise.resolve()
    expect(resolved).toHaveBeenCalledOnce()
  })
})
