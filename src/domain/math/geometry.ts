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
