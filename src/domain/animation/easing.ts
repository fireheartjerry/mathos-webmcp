import type { AnimationEasing } from './types'

export type EasingFunction = (t: number) => number

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

export const linear: EasingFunction = (t) => clamp01(t)
export const easeIn: EasingFunction = (t) => { const u = clamp01(t); return u * u * u }
export const easeOut: EasingFunction = (t) => { const u = 1 - clamp01(t); return 1 - u * u * u }
export const easeInOut: EasingFunction = (t) => {
  const u = clamp01(t)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}
export const smoothStep: EasingFunction = (t) => { const u = clamp01(t); return u * u * (3 - 2 * u) }
/** A restrained overshoot used when constructed pieces settle into place. */
export const backOut: EasingFunction = (t) => {
  const u = clamp01(t) - 1
  const overshoot = 1.70158
  return 1 + (overshoot + 1) * u * u * u + overshoot * u * u
}
/** Robert Penner's decaying ease-out bounce, normalized to [0, 1]. */
export const bounceOut: EasingFunction = (t) => {
  let u = clamp01(t)
  const scale = 7.5625
  const interval = 2.75
  if (u < 1 / interval) return scale * u * u
  if (u < 2 / interval) {
    u -= 1.5 / interval
    return scale * u * u + 0.75
  }
  if (u < 2.5 / interval) {
    u -= 2.25 / interval
    return scale * u * u + 0.9375
  }
  u -= 2.625 / interval
  return scale * u * u + 0.984375
}

export const EASINGS: Record<AnimationEasing, EasingFunction> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  smoothStep,
  backOut,
  bounceOut,
}

export function resolveEasing(easing?: AnimationEasing | EasingFunction | null): EasingFunction {
  if (typeof easing === 'function') return easing
  return (easing && EASINGS[easing]) || linear
}

/** Strings cannot be tweened; they swap at the midpoint. Callers wanting a fade use this fraction. */
export function crossfade(t: number, easing?: AnimationEasing | EasingFunction | null): number {
  return resolveEasing(easing)(t)
}

export type InterpolablePoint = { x: number; y: number }
export type Interpolable = number | string | InterpolablePoint | Interpolable[]

const isPoint = (value: unknown): value is InterpolablePoint =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
  && typeof (value as InterpolablePoint).x === 'number' && typeof (value as InterpolablePoint).y === 'number'

/**
 * Interpolate between two like-shaped values. Numbers, `{x, y}` points and
 * (nested) number arrays tween elementwise; strings crossfade (a below 0.5, b at
 * or above). Mismatched shapes fall back to the string rule.
 */
export function interpolate<T extends Interpolable>(a: T, b: T, t: number, easing?: AnimationEasing | EasingFunction | null): T {
  const eased = resolveEasing(easing)(t)
  return mix(a, b, eased) as T
}

function mix(a: Interpolable, b: Interpolable, u: number): Interpolable {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u
  if (isPoint(a) && isPoint(b)) return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
  if (Array.isArray(a) && Array.isArray(b)) {
    const length = Math.max(a.length, b.length)
    const out: Interpolable[] = []
    for (let index = 0; index < length; index += 1) {
      const from = a[index]
      const to = b[index]
      if (from === undefined) out.push(to)
      else if (to === undefined) out.push(from)
      else out.push(mix(from, to, u))
    }
    return out
  }
  return u < 0.5 ? a : b
}
