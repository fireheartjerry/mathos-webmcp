import type { GeometryPrimitive, Point } from '../world/types'

export type ResolvedPoint = {
  kind: 'point'
  id: string
  point: Point
  label?: string
  draggable?: boolean
  derived?: boolean
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
      keep({ ...primitive, kind: 'point', point: primitive.at })
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

    const center = pointFrom(resolved, primitive.center)
    const source = pointFrom(resolved, primitive.source)
    if (center && source) keep({
      kind: 'point',
      id: primitive.id,
      point: {
        x: center.x + primitive.factor * (source.x - center.x),
        y: center.y + primitive.factor * (source.y - center.y),
      },
      label: primitive.label,
      derived: true,
    })
  }

  return output
}
