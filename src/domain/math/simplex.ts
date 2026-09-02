import type { Point } from '../world/types'
import { normalizeWeights } from './barycentric'

export type Vec3 = { x: number; y: number; z: number }
export type Tetrahedron = [Vec3, Vec3, Vec3, Vec3]
export type SimplexWeights = [number, number, number, number]
export type IntegerSimplexPoint = [number, number, number, number]
export type EulerRotation = { x: number; y: number; z: number }
export type ProjectionOptions = {
  scale?: number
  distance?: number
  offset?: Point
}

const DEFAULT_PROJECTION: Required<ProjectionOptions> = {
  scale: 1,
  distance: 7,
  offset: { x: 0, y: 0 },
}

export function normalizeSimplexWeights(weights: readonly number[]): SimplexWeights {
  const normalized = normalizeWeights(weights)
  return [
    normalized[0] ?? 1 / 4,
    normalized[1] ?? 1 / 4,
    normalized[2] ?? 1 / 4,
    normalized[3] ?? 1 / 4,
  ]
}

/**
 * Set one weight and redistribute the remainder over the other three so they
 * keep their relative ratios. The result always sums to exactly one.
 */
export function setSimplexWeight(weights: SimplexWeights, index: number, value: number): SimplexWeights {
  const nextValue = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
  const others = weights.reduce((sum, item, current) => current === index ? sum : sum + Math.max(0, item), 0)
  const remainder = 1 - nextValue
  return weights.map((item, current) => {
    if (current === index) return nextValue
    if (others > 1e-12) return Math.max(0, item) * remainder / others
    return remainder / 3
  }) as SimplexWeights
}

export function pointFromSimplexWeights(vertices: Tetrahedron, weights: SimplexWeights): Vec3 {
  const normalized = normalizeSimplexWeights(weights)
  return vertices.reduce(
    (point, vertex, index) => ({
      x: point.x + vertex.x * normalized[index],
      y: point.y + vertex.y * normalized[index],
      z: point.z + vertex.z * normalized[index],
    }),
    { x: 0, y: 0, z: 0 },
  )
}

export const simplexPointFromWeights = pointFromSimplexWeights
export const pointFromWeights4 = pointFromSimplexWeights

export function rotate3D(point: Vec3, rotation: EulerRotation): Vec3 {
  const cx = Math.cos(rotation.x)
  const sx = Math.sin(rotation.x)
  const cy = Math.cos(rotation.y)
  const sy = Math.sin(rotation.y)
  const cz = Math.cos(rotation.z)
  const sz = Math.sin(rotation.z)

  // Rz * Ry * Rx, a stable convention for the scene's orbit controls.
  const y1 = point.y * cx - point.z * sx
  const z1 = point.y * sx + point.z * cx
  const x2 = point.x * cy + z1 * sy
  const z2 = -point.x * sy + z1 * cy
  return {
    x: x2 * cz - y1 * sz,
    y: x2 * sz + y1 * cz,
    z: z2,
  }
}

export function project3D(point: Vec3, options: ProjectionOptions = {}): Point {
  const projection = { ...DEFAULT_PROJECTION, ...options }
  const depth = Math.max(0.25, projection.distance - point.z)
  const perspective = projection.distance / depth
  return {
    x: projection.offset.x + point.x * projection.scale * perspective,
    y: projection.offset.y + point.y * projection.scale * perspective,
  }
}

export function rotateAndProject(point: Vec3, rotation: EulerRotation, options: ProjectionOptions = {}): Point {
  return project3D(rotate3D(point, rotation), options)
}

export function projectTetrahedron(
  vertices: Tetrahedron,
  rotation: EulerRotation = { x: 0, y: 0, z: 0 },
  options: ProjectionOptions = {},
): Point[] {
  return vertices.map((vertex) => rotateAndProject(vertex, rotation, options))
}

export function simplexEdgePairs(vertexCount = 4): Array<[number, number]> {
  const edges: Array<[number, number]> = []
  for (let first = 0; first < vertexCount; first += 1) {
    for (let second = first + 1; second < vertexCount; second += 1) edges.push([first, second])
  }
  return edges
}

export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) return 0
  const reduced = Math.min(k, n - k)
  let result = 1
  for (let index = 1; index <= reduced; index += 1) result = (result * (n - reduced + index)) / index
  return Math.round(result)
}

/** Number of nonnegative integer d-simplex coordinates summing to N. */
export function simplexLatticeCount(N: number, dimension = 3): number {
  if (!Number.isInteger(N) || N < 0 || !Number.isInteger(dimension) || dimension < 0) return 0
  return choose(N + dimension, dimension)
}

export const tetrahedralLatticeCount = (N: number): number => simplexLatticeCount(N, 3)

export function simplexLatticePoints(N: number): IntegerSimplexPoint[] {
  if (!Number.isInteger(N) || N < 0) return []
  const points: IntegerSimplexPoint[] = []
  for (let a = 0; a <= N; a += 1) {
    for (let b = 0; b <= N - a; b += 1) {
      for (let c = 0; c <= N - a - b; c += 1) {
        points.push([a, b, c, N - a - b - c])
      }
    }
  }
  return points
}

export const integerSimplexLattice = simplexLatticePoints
export const integerSimplexPoints = simplexLatticePoints

export function normalizedSimplexLatticePoints(N: number): SimplexWeights[] {
  if (!Number.isInteger(N) || N <= 0) return []
  return simplexLatticePoints(N).map(([a, b, c, d]) => [a / N, b / N, c / N, d / N])
}

export type PascalRecurrence = {
  dimension: number
  N: number
  total: number
  previous: number
  lowerDimension: number
  sum: number
  verified: boolean
  identity: string
  inductionStep: string
}

/** Data for the Pascal/induction recurrence L_d(N)=L_d(N-1)+L_(d-1)(N). */
export function pascalRecurrence(N: number, dimension = 3): PascalRecurrence {
  const total = simplexLatticeCount(N, dimension)
  const previous = simplexLatticeCount(Math.max(0, N - 1), dimension)
  const lowerDimension = simplexLatticeCount(N, Math.max(0, dimension - 1))
  return {
    dimension,
    N,
    total,
    previous,
    lowerDimension,
    sum: previous + lowerDimension,
    verified: N > 0 && total === previous + lowerDimension,
    identity: `L_${dimension}(${N}) = L_${dimension}(${Math.max(0, N - 1)}) + L_${Math.max(0, dimension - 1)}(${N})`,
    inductionStep: `C(${N + dimension},${dimension}) = C(${N + dimension - 1},${dimension}) + C(${N + dimension - 1},${Math.max(0, dimension - 1)})`,
  }
}

export const inductionData = pascalRecurrence
