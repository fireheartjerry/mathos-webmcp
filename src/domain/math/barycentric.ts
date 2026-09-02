import type { Point } from '../world/types'

/** A normalized weight triple for a point in a triangle. */
export type BarycentricWeights = [number, number, number]

export type Triangle = [Point, Point, Point]

export type SimilarityTransform = {
  center: Point
  scale: number
  angle: number
}

export type TriangleAreas = {
  signed: BarycentricWeights
  absolute: BarycentricWeights
  totalSigned: number
  total: number
  weights: BarycentricWeights
}

const EPSILON = 1e-9

/**
 * Normalize a vector of weights. Negative values are clipped because these
 * weights represent a probability/simplex point in the UI. A zero vector is
 * given a uniform distribution so every visual state remains finite.
 */
export function normalizeWeights(weights: readonly number[], epsilon = EPSILON): number[] {
  const positive = weights.map((weight) => Math.max(0, Number.isFinite(weight) ? weight : 0))
  const total = positive.reduce((sum, weight) => sum + weight, 0)
  if (total <= epsilon) {
    return positive.map(() => 1 / Math.max(1, positive.length))
  }
  return positive.map((weight) => weight / total)
}

export function normalizeBarycentricWeights(weights: readonly number[]): BarycentricWeights {
  const normalized = normalizeWeights(weights)
  return [normalized[0] ?? 1 / 3, normalized[1] ?? 1 / 3, normalized[2] ?? 1 / 3]
}

export const normalizeWeights3 = normalizeBarycentricWeights

/** Weighted affine combination. Weights are normalized by default. */
export function pointFromWeights(
  vertices: readonly Point[],
  weights: readonly number[],
  normalize = true,
): Point {
  if (vertices.length === 0) return { x: 0, y: 0 }
  const usable = normalize ? normalizeWeights(weights) : weights
  const scale = normalize ? 1 : 1
  return vertices.reduce(
    (point, vertex, index) => ({
      x: point.x + vertex.x * (usable[index] ?? 0) * scale,
      y: point.y + vertex.y * (usable[index] ?? 0) * scale,
    }),
    { x: 0, y: 0 },
  )
}

export function barycentricPoint(vertices: Triangle, weights: BarycentricWeights): Point {
  return pointFromWeights(vertices, weights)
}

function twiceSignedArea(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** Return signed sub-triangle areas and their normalized barycentric ratios. */
export function triangleAreas(point: Point, vertices: Triangle): TriangleAreas {
  const [a, b, c] = vertices
  const totalSigned = twiceSignedArea(a, b, c) / 2
  const signed: BarycentricWeights = [
    twiceSignedArea(point, b, c) / 2,
    twiceSignedArea(point, c, a) / 2,
    twiceSignedArea(point, a, b) / 2,
  ]
  const absolute: BarycentricWeights = [Math.abs(signed[0]), Math.abs(signed[1]), Math.abs(signed[2])]
  const weights: BarycentricWeights = Math.abs(totalSigned) <= EPSILON
    ? [1 / 3, 1 / 3, 1 / 3]
    : [signed[0] / totalSigned, signed[1] / totalSigned, signed[2] / totalSigned]
  return {
    signed,
    absolute,
    totalSigned,
    total: Math.abs(totalSigned),
    weights,
  }
}

export function weightsFromPoint(point: Point, vertices: Triangle): BarycentricWeights {
  return triangleAreas(point, vertices).weights
}

export const barycentricWeightsFromPoint = weightsFromPoint

export function signedSubareas(point: Point, vertices: Triangle): BarycentricWeights {
  return triangleAreas(point, vertices).signed
}

/** A general affine combination, useful when signed coefficients are desired. */
export function affineCombination(vertices: readonly Point[], weights: readonly number[]): Point {
  return pointFromWeights(vertices, weights, false)
}

export function applySimilarity(point: Point, transform: SimilarityTransform): Point {
  const cosine = Math.cos(transform.angle)
  const sine = Math.sin(transform.angle)
  const dx = point.x - transform.center.x
  const dy = point.y - transform.center.y
  return {
    x: transform.center.x + transform.scale * (cosine * dx - sine * dy),
    y: transform.center.y + transform.scale * (sine * dx + cosine * dy),
  }
}

export function applyHomothety(point: Point, center: Point, scale: number): Point {
  return applySimilarity(point, { center, scale, angle: 0 })
}

export function transformTriangle(vertices: Triangle, transform: SimilarityTransform): Triangle {
  return vertices.map((vertex) => applySimilarity(vertex, transform)) as Triangle
}

/**
 * Similarities commute with normalized affine combinations. Both sides are
 * returned so the UI can display the invariant and its floating-point drift.
 */
export function similarityCombinationInvariant(
  vertices: Triangle,
  weights: BarycentricWeights,
  transform: SimilarityTransform,
): { before: Point; afterTransform: Point; transformedCombination: Point; error: number } {
  const before = pointFromWeights(vertices, weights)
  const mappedVertices = transformTriangle(vertices, transform)
  const afterTransform = applySimilarity(before, transform)
  const transformedCombination = pointFromWeights(mappedVertices, weights)
  return {
    before,
    afterTransform,
    transformedCombination,
    error: Math.hypot(
      afterTransform.x - transformedCombination.x,
      afterTransform.y - transformedCombination.y,
    ),
  }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Weights of `point`, clipped to the closed simplex so a dragged P never leaves the triangle. */
export function clampWeightsToSimplex(weights: readonly number[]): BarycentricWeights {
  return normalizeBarycentricWeights(weights)
}

/** Nearest in-triangle position (in barycentric terms) for a point that may be dragged outside. */
export function clampPointToTriangle(point: Point, vertices: Triangle): Point {
  return pointFromWeights(vertices, clampWeightsToSimplex(triangleAreas(point, vertices).weights))
}

/**
 * Set one weight exactly and spread the remainder over the other two in their
 * existing ratio, so a typed or slid α is honoured rather than renormalised away.
 */
export function setWeightKeepingRatio(weights: readonly number[], index: number, value: number): BarycentricWeights {
  const current = normalizeBarycentricWeights(weights)
  const target = Math.max(0, Math.min(1, Number.isFinite(value) ? value : current[index] ?? 0))
  const rest = 1 - target
  const others = [0, 1, 2].filter((candidate) => candidate !== index)
  const othersTotal = others.reduce((sum, candidate) => sum + current[candidate], 0)
  const next: BarycentricWeights = [...current]
  next[index] = target
  for (const candidate of others) {
    next[candidate] = othersTotal <= EPSILON ? rest / others.length : (current[candidate] / othersTotal) * rest
  }
  return next
}

/** `[a : b : c]` with a fixed number of decimals, for commit summaries and readouts. */
export function formatWeightTriple(weights: readonly number[], digits = 2): string {
  return `[${weights.map((weight) => weight.toFixed(digits)).join(' : ')}]`
}
