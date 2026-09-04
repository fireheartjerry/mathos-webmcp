import type { GeometryPrimitive, Point } from '../world/types'

export type ResolvedPoint = {
  kind: 'point'
  id: string
  point: Point
  label?: string
  draggable?: boolean
  derived?: boolean
  hidden?: boolean
}
export type ResolvedSegment = { kind: 'segment'; id: string; from: Point; to: Point }
export type ResolvedLine = { kind: 'line'; id: string; through: Point; direction: Point }
export type ResolvedCircle = { kind: 'circle'; id: string; center: Point; radius: number }
export type ResolvedPolygon = { kind: 'polygon'; id: string; points: Point[] }
export type ResolvedAngle = {
  kind: 'angle'
  id: string
  a: Point
  vertex: Point
  b: Point
  degrees: number
}
export type ResolvedGeometry = {
  points: ResolvedPoint[]
  segments: ResolvedSegment[]
  lines: ResolvedLine[]
  circles: ResolvedCircle[]
  polygons: ResolvedPolygon[]
  angles: ResolvedAngle[]
}

type ResolvedPrimitive =
  | ResolvedPoint
  | ResolvedSegment
  | ResolvedLine
  | ResolvedCircle
  | ResolvedPolygon
  | ResolvedAngle

const difference = (to: Point, from: Point): Point => ({ x: to.x - from.x, y: to.y - from.y })
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
const GEOMETRY_EPSILON = 1e-8

const isFinitePoint = (point: Point): boolean => Number.isFinite(point.x) && Number.isFinite(point.y)
const pointDistance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

type TriangleData = { points: [Point, Point, Point]; ids: [string, string, string] }

function triangleFrom(resolved: Map<string, ResolvedPrimitive>, ids: [string, string, string]): TriangleData | null {
  const candidates = ids.map((id) => pointFrom(resolved, id))
  if (!candidates.every((point): point is Point => Boolean(point))) return null
  const points: [Point, Point, Point] = [candidates[0], candidates[1], candidates[2]]
  if (Math.abs(cross(difference(points[1], points[0]), difference(points[2], points[0]))) < GEOMETRY_EPSILON) return null
  return { points, ids }
}

/** Incenter weighted by the three opposite side lengths. */
export function triangleIncenter(a: Point, b: Point, c: Point): Point | null {
  const sideA = pointDistance(b, c)
  const sideB = pointDistance(c, a)
  const sideC = pointDistance(a, b)
  const perimeter = sideA + sideB + sideC
  if (perimeter < GEOMETRY_EPSILON || Math.abs(cross(difference(b, a), difference(c, a))) < GEOMETRY_EPSILON) return null
  const point = {
    x: (sideA * a.x + sideB * b.x + sideC * c.x) / perimeter,
    y: (sideA * a.y + sideB * b.y + sideC * c.y) / perimeter,
  }
  return isFinitePoint(point) ? point : null
}

/** Circumcircle through three non-collinear points. */
export function triangleCircumcircle(a: Point, b: Point, c: Point): { center: Point; radius: number } | null {
  const denominator = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(denominator) < GEOMETRY_EPSILON) return null
  const aa = a.x * a.x + a.y * a.y
  const bb = b.x * b.x + b.y * b.y
  const cc = c.x * c.x + c.y * c.y
  const center = {
    x: (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / denominator,
    y: (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / denominator,
  }
  const radius = pointDistance(center, a)
  return isFinitePoint(center) && Number.isFinite(radius) && radius > GEOMETRY_EPSILON ? { center, radius } : null
}

/** Midpoint of the arc through `first` and `second` that excludes `other`. */
export function arcMidpointNotContaining(first: Point, second: Point, other: Point): Point | null {
  const circumcircle = triangleCircumcircle(first, second, other)
  if (!circumcircle) return null
  const { center, radius } = circumcircle
  const fromCenterA = difference(first, center)
  const fromCenterB = difference(second, center)
  let bisector = { x: fromCenterA.x + fromCenterB.x, y: fromCenterA.y + fromCenterB.y }
  let length = Math.hypot(bisector.x, bisector.y)
  // A diameter has antipodal endpoints, so either perpendicular radius bisects
  // an arc. The side-of-chord test below still selects the one excluding `other`.
  if (length < GEOMETRY_EPSILON) {
    bisector = { x: -fromCenterA.y, y: fromCenterA.x }
    length = Math.hypot(bisector.x, bisector.y)
  }
  if (length < GEOMETRY_EPSILON) return null
  const unit = { x: bisector.x / length, y: bisector.y / length }
  const candidates = [
    { x: center.x + radius * unit.x, y: center.y + radius * unit.y },
    { x: center.x - radius * unit.x, y: center.y - radius * unit.y },
  ]
  const chord = difference(second, first)
  const otherSide = cross(chord, difference(other, first))
  if (Math.abs(otherSide) < GEOMETRY_EPSILON) return null
  return candidates.find((candidate) => cross(chord, difference(candidate, first)) * otherSide < 0) ?? null
}

/** Circle tangent to both sides at `vertex` and internally tangent to the circumcircle. */
export function triangleMixtilinearIncircle(vertex: Point, first: Point, second: Point): { center: Point; radius: number } | null {
  const incenter = triangleIncenter(vertex, first, second)
  const circumcircle = triangleCircumcircle(vertex, first, second)
  if (!incenter || !circumcircle) return null
  const firstRay = difference(first, vertex)
  const secondRay = difference(second, vertex)
  const firstLength = Math.hypot(firstRay.x, firstRay.y)
  const secondLength = Math.hypot(secondRay.x, secondRay.y)
  if (firstLength < GEOMETRY_EPSILON || secondLength < GEOMETRY_EPSILON) return null
  const cosine = Math.max(-1, Math.min(1, dot(firstRay, secondRay) / (firstLength * secondLength)))
  const cosineHalfSquared = (1 + cosine) / 2
  if (cosineHalfSquared < GEOMETRY_EPSILON) return null
  // The side-contact chord is perpendicular to the angle bisector and passes
  // through I, hence AX = AI / cos²(A/2) for the mixtilinear centre X.
  const center = {
    x: vertex.x + (incenter.x - vertex.x) / cosineHalfSquared,
    y: vertex.y + (incenter.y - vertex.y) / cosineHalfSquared,
  }
  const radius = Math.abs(cross(difference(center, vertex), firstRay)) / firstLength
  if (!isFinitePoint(center) || !Number.isFinite(radius) || radius < GEOMETRY_EPSILON) return null
  // Reject numerically unstable or invalid configurations rather than drawing a
  // circle that only looks tangent after a nearly-degenerate drag.
  const centerDistance = pointDistance(center, circumcircle.center)
  const error = Math.abs(centerDistance + radius - circumcircle.radius)
  if (error > Math.max(1, circumcircle.radius) * 1e-6) return null
  return { center, radius }
}

/** Unique contact point of two externally or internally tangent circles. */
export function tangentCirclesPoint(first: ResolvedCircle, second: ResolvedCircle): Point | null {
  const centerDistance = pointDistance(first.center, second.center)
  if (centerDistance < GEOMETRY_EPSILON) return null
  const tolerance = Math.max(1, first.radius, second.radius) * 1e-6
  const direction = {
    x: (second.center.x - first.center.x) / centerDistance,
    y: (second.center.y - first.center.y) / centerDistance,
  }
  if (Math.abs(centerDistance - (first.radius + second.radius)) <= tolerance) {
    return { x: first.center.x + first.radius * direction.x, y: first.center.y + first.radius * direction.y }
  }
  if (Math.abs(centerDistance - Math.abs(first.radius - second.radius)) > tolerance) return null
  const larger = first.radius >= second.radius ? first : second
  const smaller = first.radius >= second.radius ? second : first
  const towardSmaller = {
    x: (smaller.center.x - larger.center.x) / centerDistance,
    y: (smaller.center.y - larger.center.y) / centerDistance,
  }
  return {
    x: larger.center.x + larger.radius * towardSmaller.x,
    y: larger.center.y + larger.radius * towardSmaller.y,
  }
}

function pointFrom(resolved: Map<string, ResolvedPrimitive>, id: string): Point | null {
  const value = resolved.get(id)
  return value?.kind === 'point' ? value.point : null
}

function directionFrom(resolved: Map<string, ResolvedPrimitive>, id: string): ResolvedLine | null {
  const value = resolved.get(id)
  if (value?.kind === 'line') return value
  if (value?.kind === 'segment') {
    return { kind: 'line', id: value.id, through: value.from, direction: difference(value.to, value.from) }
  }
  return null
}

function intersect(first: ResolvedLine, second: ResolvedLine): Point | null {
  const denominator = cross(first.direction, second.direction)
  if (Math.abs(denominator) < 0.00001) return null
  const between = difference(second.through, first.through)
  const amount = cross(between, second.direction) / denominator
  return {
    x: first.through.x + first.direction.x * amount,
    y: first.through.y + first.direction.y * amount,
  }
}

/**
 * Centre of the spiral similarity z -> alpha z + beta with
 * alpha = (b2 - a2)/(b - a) and beta = a2 - alpha a. The fixed point is
 * beta/(1 - alpha); it exists unless alpha = 1 (a pure translation).
 */
export function spiralSimilarityCenter(a: Point, b: Point, a2: Point, b2: Point): Point | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const denominator = dx * dx + dy * dy
  if (denominator < 1e-9) return null
  const ex = b2.x - a2.x
  const ey = b2.y - a2.y
  const alphaRe = (ex * dx + ey * dy) / denominator
  const alphaIm = (ey * dx - ex * dy) / denominator
  const betaRe = a2.x - (alphaRe * a.x - alphaIm * a.y)
  const betaIm = a2.y - (alphaRe * a.y + alphaIm * a.x)
  const oneMinusRe = 1 - alphaRe
  const oneMinusIm = -alphaIm
  const magnitude = oneMinusRe * oneMinusRe + oneMinusIm * oneMinusIm
  if (magnitude < 1e-12) return null
  return {
    x: (betaRe * oneMinusRe + betaIm * oneMinusIm) / magnitude,
    y: (betaIm * oneMinusRe - betaRe * oneMinusIm) / magnitude,
  }
}

/** Scale factor and rotation (degrees) of the similarity sending a->a2, b->b2. */
export function spiralSimilarityParameters(a: Point, b: Point, a2: Point, b2: Point): { factor: number; angle: number } | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const ex = b2.x - a2.x
  const ey = b2.y - a2.y
  const source = Math.hypot(dx, dy)
  if (source < 1e-9) return null
  let angle = (Math.atan2(ey, ex) - Math.atan2(dy, dx)) * 180 / Math.PI
  while (angle > 180) angle -= 360
  while (angle <= -180) angle += 360
  return { factor: Math.hypot(ex, ey) / source, angle }
}

export function resolveGeometry(primitives: GeometryPrimitive[]): ResolvedGeometry {
  const output: ResolvedGeometry = {
    points: [],
    segments: [],
    lines: [],
    circles: [],
    polygons: [],
    angles: [],
  }
  const resolved = new Map<string, ResolvedPrimitive>()

  const keep = (value: ResolvedPrimitive) => {
    resolved.set(value.id, value)
    if (value.kind === 'point') output.points.push(value)
    else if (value.kind === 'segment') output.segments.push(value)
    else if (value.kind === 'line') output.lines.push(value)
    else if (value.kind === 'circle') output.circles.push(value)
    else if (value.kind === 'polygon') output.polygons.push(value)
    else output.angles.push(value)
  }

  for (const primitive of primitives) {
    if (primitive.kind === 'point') {
      keep({ kind: 'point', id: primitive.id, point: primitive.at, label: primitive.label, draggable: primitive.draggable, hidden: primitive.hidden })
      continue
    }

    if (primitive.kind === 'segment') {
      const from = pointFrom(resolved, primitive.from)
      const to = pointFrom(resolved, primitive.to)
      if (from && to) keep({ kind: 'segment', id: primitive.id, from, to })
      continue
    }

    if (primitive.kind === 'line') {
      const first = pointFrom(resolved, primitive.through[0])
      const second = pointFrom(resolved, primitive.through[1])
      if (first && second) keep({ kind: 'line', id: primitive.id, through: first, direction: difference(second, first) })
      continue
    }

    if (primitive.kind === 'circle') {
      const center = pointFrom(resolved, primitive.center)
      const through = pointFrom(resolved, primitive.through)
      if (center && through) keep({ kind: 'circle', id: primitive.id, center, radius: Math.hypot(through.x - center.x, through.y - center.y) })
      continue
    }

    if (primitive.kind === 'polygon') {
      const points = primitive.points.map((id) => pointFrom(resolved, id))
      if (points.every((point): point is Point => Boolean(point))) keep({ kind: 'polygon', id: primitive.id, points })
      continue
    }

    if (primitive.kind === 'midpoint') {
      const first = pointFrom(resolved, primitive.of[0])
      const second = pointFrom(resolved, primitive.of[1])
      if (first && second) keep({
        kind: 'point',
        id: primitive.id,
        point: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        label: primitive.label,
        derived: true,
      })
      continue
    }

    if (primitive.kind === 'perpendicular' || primitive.kind === 'parallel') {
      const through = pointFrom(resolved, primitive.through)
      const target = directionFrom(resolved, primitive.to)
      if (through && target) keep({
        kind: 'line',
        id: primitive.id,
        through,
        direction: primitive.kind === 'parallel'
          ? target.direction
          : { x: -target.direction.y, y: target.direction.x },
      })
      continue
    }

    if (primitive.kind === 'intersection') {
      const first = directionFrom(resolved, primitive.lines[0])
      const second = directionFrom(resolved, primitive.lines[1])
      const point = first && second ? intersect(first, second) : null
      if (point) keep({ kind: 'point', id: primitive.id, point, label: primitive.label, derived: true })
      continue
    }

    if (primitive.kind === 'angle') {
      const a = pointFrom(resolved, primitive.a)
      const vertex = pointFrom(resolved, primitive.vertex)
      const b = pointFrom(resolved, primitive.b)
      if (a && vertex && b) {
        const first = difference(a, vertex)
        const second = difference(b, vertex)
        const radians = Math.atan2(Math.abs(cross(first, second)), first.x * second.x + first.y * second.y)
        keep({ kind: 'angle', id: primitive.id, a, vertex, b, degrees: radians * 180 / Math.PI })
      }
      continue
    }

    if (primitive.kind === 'spiralCenter') {
      const a = pointFrom(resolved, primitive.a)
      const b = pointFrom(resolved, primitive.b)
      const a2 = pointFrom(resolved, primitive.a2)
      const b2 = pointFrom(resolved, primitive.b2)
      const center = a && b && a2 && b2 ? spiralSimilarityCenter(a, b, a2, b2) : null
      if (center) keep({ kind: 'point', id: primitive.id, point: center, label: primitive.label, derived: true })
      continue
    }

    if (primitive.kind === 'incenter') {
      const triangle = triangleFrom(resolved, primitive.of)
      const point = triangle ? triangleIncenter(...triangle.points) : null
      if (point) keep({ kind: 'point', id: primitive.id, point, label: primitive.label, derived: true })
      continue
    }

    if (primitive.kind === 'circumcircle') {
      const triangle = triangleFrom(resolved, primitive.of)
      const circle = triangle ? triangleCircumcircle(...triangle.points) : null
      if (circle) keep({ kind: 'circle', id: primitive.id, ...circle })
      continue
    }

    if (primitive.kind === 'arcMidpoint') {
      const triangle = triangleFrom(resolved, primitive.of)
      const excludedIndex = triangle?.ids.indexOf(primitive.notContaining) ?? -1
      if (triangle && excludedIndex >= 0) {
        const otherIndices = [0, 1, 2].filter((index) => index !== excludedIndex)
        const point = arcMidpointNotContaining(
          triangle.points[otherIndices[0]],
          triangle.points[otherIndices[1]],
          triangle.points[excludedIndex],
        )
        if (point) keep({ kind: 'point', id: primitive.id, point, label: primitive.label, derived: true })
      }
      continue
    }

    if (primitive.kind === 'mixtilinearIncircle') {
      const triangle = triangleFrom(resolved, primitive.of)
      const vertexIndex = triangle?.ids.indexOf(primitive.vertex) ?? -1
      if (triangle && vertexIndex >= 0) {
        const otherIndices = [0, 1, 2].filter((index) => index !== vertexIndex)
        const circle = triangleMixtilinearIncircle(
          triangle.points[vertexIndex],
          triangle.points[otherIndices[0]],
          triangle.points[otherIndices[1]],
        )
        if (circle) keep({ kind: 'circle', id: primitive.id, ...circle })
      }
      continue
    }

    if (primitive.kind === 'circleTangency') {
      const first = resolved.get(primitive.circles[0])
      const second = resolved.get(primitive.circles[1])
      const point = first?.kind === 'circle' && second?.kind === 'circle' ? tangentCirclesPoint(first, second) : null
      if (point) keep({ kind: 'point', id: primitive.id, point, label: primitive.label, derived: true })
      continue
    }

    if (primitive.kind !== 'homothety' && primitive.kind !== 'similarity') continue

    const center = pointFrom(resolved, primitive.center)
    const source = pointFrom(resolved, primitive.source)
    if (center && source) {
      const angle = primitive.kind === 'similarity' ? primitive.angle * Math.PI / 180 : 0
      const offset = difference(source, center)
      const rotated = {
        x: offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
        y: offset.x * Math.sin(angle) + offset.y * Math.cos(angle),
      }
      keep({
        kind: 'point',
        id: primitive.id,
        point: {
          x: center.x + primitive.factor * rotated.x,
          y: center.y + primitive.factor * rotated.y,
        },
        label: primitive.label,
        derived: true,
      })
    }
  }

  return output
}

/** A `line` primitive whose id starts with `ray:` is rendered as a half-line from its first point. */
export const RAY_PREFIX = 'ray:'
export const isRayId = (id: string) => id.startsWith(RAY_PREFIX)

/** Ids a primitive depends on, in declaration order. Free points depend on nothing. */
export function primitiveReferences(primitive: GeometryPrimitive): string[] {
  switch (primitive.kind) {
    case 'point': return []
    case 'segment': return [primitive.from, primitive.to]
    case 'line': return [...primitive.through]
    case 'circle': return [primitive.center, primitive.through]
    case 'polygon': return [...primitive.points]
    case 'midpoint': return [...primitive.of]
    case 'perpendicular':
    case 'parallel': return [primitive.through, primitive.to]
    case 'intersection': return [...primitive.lines]
    case 'angle': return [primitive.a, primitive.vertex, primitive.b]
    case 'homothety':
    case 'similarity': return [primitive.center, primitive.source]
    case 'spiralCenter': return [primitive.a, primitive.b, primitive.a2, primitive.b2]
    // Contract only: dependency bookkeeping so the union is exhaustive. resolveGeometry
    // does not implement these yet, so they simply do not render until it does.
    case 'incenter':
    case 'circumcircle':
    case 'arcMidpoint':
    case 'mixtilinearIncircle': return [...primitive.of]
    case 'circleTangency': return [...primitive.circles]
  }
}

/** The given ids plus every primitive that (transitively) references one of them. */
export function dependentIds(primitives: GeometryPrimitive[], ids: string[]): Set<string> {
  const removed = new Set(ids)
  let changed = true
  while (changed) {
    changed = false
    for (const primitive of primitives) {
      if (removed.has(primitive.id)) continue
      if (primitiveReferences(primitive).some((id) => removed.has(id))) {
        removed.add(primitive.id)
        changed = true
      }
    }
  }
  return removed
}

/** Whether a primitive resolves to a point (usable as a point reference). */
export function isPointLike(primitive: GeometryPrimitive): boolean {
  return primitive.kind === 'point' || primitive.kind === 'midpoint' || primitive.kind === 'intersection'
    || primitive.kind === 'homothety' || primitive.kind === 'similarity' || primitive.kind === 'spiralCenter'
    || primitive.kind === 'incenter' || primitive.kind === 'arcMidpoint' || primitive.kind === 'circleTangency'
}

/** Whether a primitive resolves to a direction (usable by perpendicular, parallel and intersection). */
export function isLineLike(primitive: GeometryPrimitive): boolean {
  return primitive.kind === 'segment' || primitive.kind === 'line' || primitive.kind === 'perpendicular' || primitive.kind === 'parallel'
}

/** A, B, … Z, A1, B1, … skipping anything already used as an id or label. */
export function nextPointLabel(used: Iterable<string>): string {
  const taken = new Set(used)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let round = 0; round < 1000; round += 1) {
    for (const letter of letters) {
      const candidate = round === 0 ? letter : `${letter}${round}`
      if (!taken.has(candidate)) return candidate
    }
  }
  return `P${Date.now()}`
}

/** Resolve an id that is free for a new primitive, appending -2, -3 … when needed. */
export function uniquePrimitiveId(primitives: GeometryPrimitive[], base: string): string {
  const taken = new Set(primitives.map((primitive) => primitive.id))
  if (!taken.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Lock a dragged point to the dominant axis of its travel (Shift-drag): the other axis keeps the start value. */
export function constrainToAxis(start: Point, cursor: Point): Point {
  const dx = cursor.x - start.x
  const dy = cursor.y - start.y
  return Math.abs(dx) >= Math.abs(dy) ? { x: cursor.x, y: start.y } : { x: start.x, y: cursor.y }
}

/**
 * Ids of point-like primitives that appeared, or free points whose position
 * changed, between two primitive lists. Hidden helper points are ignored.
 */
export function changedPointIds(previous: GeometryPrimitive[], next: GeometryPrimitive[]): string[] {
  const before = new Map(previous.map((primitive) => [primitive.id, primitive]))
  const changed: string[] = []
  for (const primitive of next) {
    if (!isPointLike(primitive)) continue
    if (primitive.kind === 'point' && primitive.hidden) continue
    const earlier = before.get(primitive.id)
    if (!earlier) { changed.push(primitive.id); continue }
    if (primitive.kind === 'point' && earlier.kind === 'point' && (earlier.at.x !== primitive.at.x || earlier.at.y !== primitive.at.y)) changed.push(primitive.id)
  }
  return changed
}

/** Stable key of every free point position plus every primitive id, for change detection. */
export function primitivesKey(primitives: GeometryPrimitive[]): string {
  return primitives.map((primitive) => primitive.kind === 'point' ? `${primitive.id}@${primitive.at.x},${primitive.at.y}` : primitive.id).join(';')
}
