import { computeEngine } from './expression'
import type { Point } from '../world/types'

export function evaluateLatexAt(
  latex: string,
  x: number,
  parameters: Record<string, number> = {},
): number | null {
  try {
    const value = computeEngine()
      .parse(latex)
      .subs({ x, ...parameters })
      .N()
      .valueOf()
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function sampleGraph(
  latex: string,
  xDomain: [number, number],
  parameters: Record<string, number> = {},
  steps = 180,
): Point[] {
  const [min, max] = xDomain
  return Array.from({ length: steps + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / steps
    return { x, y: evaluateLatexAt(latex, x, parameters) ?? Number.NaN }
  }).filter((point) => Number.isFinite(point.y))
}

export function estimateIntegral(
  latex: string,
  domain: [number, number],
  parameters: Record<string, number> = {},
): number {
  const points = sampleGraph(latex, domain, parameters, 96)
  return points.slice(1).reduce((area, point, index) => {
    const previous = points[index]
    return area + ((point.x - previous.x) * (point.y + previous.y)) / 2
  }, 0)
}
