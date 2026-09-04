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
export type DepthProjectedPoint = Point & {
  /** Rotated world z; larger values are nearer the camera. */
  z: number
  /** Positive camera-space distance. */
  depth: number
  /** Perspective scale multiplier at this depth. */
  perspective: number
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

export function project3DWithDepth(point: Vec3, options: ProjectionOptions = {}): DepthProjectedPoint {
  const projection = { ...DEFAULT_PROJECTION, ...options }
  const depth = Math.max(0.25, projection.distance - point.z)
  const perspective = projection.distance / depth
  return {
    x: projection.offset.x + point.x * projection.scale * perspective,
    y: projection.offset.y + point.y * projection.scale * perspective,
    z: point.z,
    depth,
    perspective,
  }
}

export function project3D(point: Vec3, options: ProjectionOptions = {}): Point {
  const projected = project3DWithDepth(point, options)
  return { x: projected.x, y: projected.y }
}

export function rotateAndProject(point: Vec3, rotation: EulerRotation, options: ProjectionOptions = {}): Point {
  return project3D(rotate3D(point, rotation), options)
}

export function rotateAndProjectWithDepth(point: Vec3, rotation: EulerRotation, options: ProjectionOptions = {}): DepthProjectedPoint {
  return project3DWithDepth(rotate3D(point, rotation), options)
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

// ---------------------------------------------------------------------------
// Section-plane helpers for direct manipulation of P in the projected view.
// ---------------------------------------------------------------------------

/** Vertices of the triangle cut by the plane δ = t (the face ABC slides toward D). */
export function sectionTriangle(vertices: Tetrahedron, t: number): [Vec3, Vec3, Vec3] {
  const amount = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0))
  const apex = vertices[3]
  const slide = (vertex: Vec3): Vec3 => ({
    x: vertex.x * (1 - amount) + apex.x * amount,
    y: vertex.y * (1 - amount) + apex.y * amount,
    z: vertex.z * (1 - amount) + apex.z * amount,
  })
  return [slide(vertices[0]), slide(vertices[1]), slide(vertices[2])]
}

/**
 * Signed-area barycentric coordinates of a screen point against a projected
 * triangle. A degenerate triangle returns the centroid.
 */
export function barycentric2D(point: Point, triangle: readonly [Point, Point, Point]): [number, number, number] {
  const [a, b, c] = triangle
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)
  if (Math.abs(area) < 1e-9) return [1 / 3, 1 / 3, 1 / 3]
  const u = ((b.x - point.x) * (c.y - point.y) - (c.x - point.x) * (b.y - point.y)) / area
  const v = ((c.x - point.x) * (a.y - point.y) - (a.x - point.x) * (c.y - point.y)) / area
  return [u, v, 1 - u - v]
}

/** Nearest valid barycentric triple: negatives clamp to the edge and the rest renormalise. */
export function clampBarycentric(weights: readonly [number, number, number]): [number, number, number] {
  const clamped = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0)) as [number, number, number]
  const total = clamped[0] + clamped[1] + clamped[2]
  if (total <= 1e-12) return [1 / 3, 1 / 3, 1 / 3]
  return [clamped[0] / total, clamped[1] / total, clamped[2] / total]
}

/** Four simplex weights from barycentrics on the section plane δ = t. */
export function weightsOnSection(barycentric: readonly [number, number, number], t: number): SimplexWeights {
  const delta = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0))
  const [u, v, w] = clampBarycentric(barycentric)
  return [u * (1 - delta), v * (1 - delta), w * (1 - delta), delta]
}

/**
 * Screen point → nearest valid weights on the section plane δ = t of a
 * projected tetrahedron. The projection is perspective, so the 2-D
 * barycentrics are a close (not exact) inverse; good enough to keep P under
 * the pointer.
 */
export function weightsFromScreenOnSection(
  point: Point,
  vertices: Tetrahedron,
  t: number,
  rotation: EulerRotation,
  options: ProjectionOptions = {},
): SimplexWeights {
  const triangle = sectionTriangle(vertices, t).map((vertex) => rotateAndProject(vertex, rotation, options)) as [Point, Point, Point]
  return weightsOnSection(barycentric2D(point, triangle), t)
}

/** Wrap an angle into (−π, π]. */
export function wrapAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0
  const twoPi = Math.PI * 2
  let wrapped = angle % twoPi
  if (wrapped > Math.PI) wrapped -= twoPi
  if (wrapped <= -Math.PI) wrapped += twoPi
  return wrapped
}
