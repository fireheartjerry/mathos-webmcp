import type { Point } from '../../domain/world/types'

/** Width multipliers for velocity-thinned pen strokes. */
export const INK_MIN_FACTOR = 0.75
export const INK_MAX_FACTOR = 1.25

/**
 * Per-point width multipliers derived from local speed. Pointer samples arrive
 * at a steady cadence, so the spacing between consecutive points is a faithful
 * stand-in for velocity: slow, deliberate strokes thicken towards 1.25×, fast
 * flicks thin towards 0.75×. A three-tap average keeps the outline from
 * jittering between samples.
 */
export function inkWidthFactors(points: Point[]): number[] {
  const count = points.length
  if (count < 3) return points.map(() => 1)
  const speeds = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(count - 1, index + 1)]
    return (Math.hypot(point.x - previous.x, point.y - previous.y) + Math.hypot(next.x - point.x, next.y - point.y)) / 2
  })
  const sorted = [...speeds].sort((a, b) => a - b)
  const median = sorted[Math.floor(count / 2)] || 1
  const raw = speeds.map((speed) => Math.min(INK_MAX_FACTOR, Math.max(INK_MIN_FACTOR, 1.5 - 0.5 * (speed / median))))
  return raw.map((factor, index) => (raw[Math.max(0, index - 1)] + factor + raw[Math.min(count - 1, index + 1)]) / 3)
}

/** Quadratic midpoint smoothing for one side of an outline; no leading M. */
function smoothSegments(points: Point[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) return ` L ${points[1].x} ${points[1].y}`
  let path = ''
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`
  }
  const penultimate = points[points.length - 2]
  const last = points[points.length - 1]
  path += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`
  return path
}

/**
 * A closed, fillable outline for a pen stroke whose width varies with speed.
 * Both sides are offset along the local normal and joined with round caps, so
 * the result is one filled path rather than many stroked segments.
 */
export function variableWidthInkPath(source: Point[], width: number): string {
  const points = source.filter((point, index) => index === 0 || Math.hypot(point.x - source[index - 1].x, point.y - source[index - 1].y) > 0.01)
  if (points.length === 0) return ''
  if (points.length === 1) {
    const radius = width / 2
    const point = points[0]
    return `M ${point.x - radius} ${point.y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`
  }
  const factors = inkWidthFactors(points)
  const left: Point[] = []
  const right: Point[] = []
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    let dx = next.x - previous.x
    let dy = next.y - previous.y
    const length = Math.hypot(dx, dy) || 1
    dx /= length
    dy /= length
    const half = (width * factors[index]) / 2
    left.push({ x: points[index].x - dy * half, y: points[index].y + dx * half })
    right.push({ x: points[index].x + dy * half, y: points[index].y - dx * half })
  }
  const startRadius = (width * factors[0]) / 2
  const endRadius = (width * factors[points.length - 1]) / 2
  const rightReversed = [...right].reverse()
  return `M ${left[0].x} ${left[0].y}`
    + smoothSegments(left)
    + ` A ${endRadius} ${endRadius} 0 0 0 ${rightReversed[0].x} ${rightReversed[0].y}`
    + smoothSegments(rightReversed)
    + ` A ${startRadius} ${startRadius} 0 0 0 ${left[0].x} ${left[0].y} Z`
}
