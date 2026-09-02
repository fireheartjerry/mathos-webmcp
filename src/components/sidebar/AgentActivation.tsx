'use client'

import { useEffect, useState } from 'react'
import '../../styles/agent-effects.css'

const ONE_SHOT_MS = 1000

/**
 * Bump a counter in the workspace and this returns true for one second, so a
 * one-shot effect (the activation sweep) can be fired without a manual timer.
 * Repeated bumps inside the window restart the second.
 */
export function useOneShot(trigger: number): boolean {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (trigger <= 0) return
    setActive(true)
    const timer = window.setTimeout(() => setActive(false), ONE_SHOT_MS)
    return () => window.clearTimeout(timer)
  }, [trigger])
  return active
}

/**
 * The agent waking up, made intrusive: a 4px purple border that travels around
 * the canvas perimeter (four bars, in sequence) and then a full-canvas purple
 * veil fading from 0.18 to 0. `console` runs 900 ms + 500 ms; `call` is a
 * short 450 ms version. Fixed overlay inset to the canvas area (top 54px,
 * left 58px), pointer-events none. Each rising edge of `active` replays it.
 */
export default function AgentActivation({ active, kind }: { active: boolean; kind: 'console' | 'call' }) {
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (active) setRun((value) => value + 1)
  }, [active])
  if (!active || run === 0) return null
  return (
    <div className={`agent-activation is-${kind}`} key={run} aria-hidden="true">
      <i className="agent-activation-bar is-top" />
      <i className="agent-activation-bar is-right" />
      <i className="agent-activation-bar is-bottom" />
      <i className="agent-activation-bar is-left" />
      <i className="agent-activation-veil" />
    </div>
  )
}
