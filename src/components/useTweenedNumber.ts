'use client'

import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * Tween a displayed number toward its target over `ms` so live readouts glide
 * instead of jumping. The returned value is only for display; the world holds
 * the true value. Respects prefers-reduced-motion (snaps immediately).
 */
export function useTweenedNumber(target: number, ms = 240): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!Number.isFinite(target)) { setValue(target); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || ms <= 0) { fromRef.current = target; setValue(target); return }
    const from = fromRef.current
    if (from === target) return
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms)
      const next = from + (target - from) * easeOut(t)
      fromRef.current = next
      setValue(next)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
      else { fromRef.current = target; setValue(target) }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }
  }, [target, ms])

  return value
}

/** Tween an array of numbers elementwise (weights, masses, probabilities). */
export function useTweenedNumbers(targets: readonly number[], ms = 240): number[] {
  const key = targets.join(',')
  const [values, setValues] = useState<number[]>([...targets])
  const fromRef = useRef<number[]>([...targets])
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const to = key.split(',').map(Number)
    if (reduce || ms <= 0 || fromRef.current.length !== to.length) { fromRef.current = to; setValues(to); return }
    const from = [...fromRef.current]
    if (from.every((entry, index) => entry === to[index])) return
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms)
      const next = to.map((entry, index) => from[index] + (entry - from[index]) * easeOut(t))
      fromRef.current = next
      setValues(next)
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
      else { fromRef.current = to; setValues(to) }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }
  }, [key, ms])

  return values
}
