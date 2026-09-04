'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  RAY_PREFIX,
  changedPointIds,
  constrainToAxis,
  dependentIds,
  isLineLike,
  isPointLike,
  isRayId,
  nextPointLabel,
  primitivesKey,
  resolveGeometry,
  spiralSimilarityParameters,
  uniquePrimitiveId,
} from '../domain/math/geometry'
import type { ResolvedAngle, ResolvedGeometry, ResolvedPoint } from '../domain/math/geometry'
import type { GeometryObject, GeometryPrimitive, GraphObject, MatrixObject, Point, WorldAction } from '../domain/world/types'
import GeometryToolbar, { GEOMETRY_TOOLS } from './GeometryToolbar'
import type { GeometryTool } from './GeometryToolbar'
import { revealDash, revealItem, revealProgress, revealRiseStyle, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumbers } from './useTweenedNumber'
import '../styles/geometry.css'
import '../styles/reveal.css'

const humanPut = (summary: string, object: GraphObject | GeometryObject | MatrixObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const RAY_LENGTH = 1200
const POINT_TWEEN_MS = 320
const ENTER_MS = 260
const PULSE_MS = 700

/** Figure accents: the same four inks the rest of Mathburst draws with. */
const ACCENTS: Array<{ id: string; label: string; value: string }> = [
  { id: 'graphite', label: 'graphite', value: '#171713' },
  { id: 'purple', label: 'purple', value: '#7c5cff' },
  { id: 'teal', label: 'teal', value: '#2f8f88' },
  { id: 'orange', label: 'orange', value: '#d46b4c' },
]

/** Ids a primitive is built from; base points reference nothing. */
function primitiveRefs(primitive: GeometryPrimitive): string[] {
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
    case 'incenter':
    case 'circumcircle':
    case 'arcMidpoint':
    case 'mixtilinearIncircle': return [...primitive.of]
    case 'circleTangency': return [...primitive.circles]
  }
}

/** Within one dependency layer: points, then segments/lines/polygons, then circles, then derived points, then angles. */
const REVEAL_RANK: Record<GeometryPrimitive['kind'], number> = {
  point: 0, segment: 1, line: 1, polygon: 1, perpendicular: 1, parallel: 1, circle: 2,
  midpoint: 3, intersection: 3, homothety: 3, similarity: 3, spiralCenter: 3, angle: 4,
  // Olympiad primitives: centres resolve with the derived points, the circles they
  // determine draw with the other circles, tangency points last.
  incenter: 3, circumcircle: 2, arcMidpoint: 3, mixtilinearIncircle: 2, circleTangency: 3,
}

/**
 * Drawing order for the staged reveal: a primitive joins the order once every
 * id it references has been revealed, so the figure builds the way it was
 * constructed. Hidden points are revealed silently (they take no slot).
 */
function revealOrder(primitives: GeometryPrimitive[]): string[] {
  const known = new Set(primitives.map((primitive) => primitive.id))
  const revealed = new Set<string>()
  const order: string[] = []
  let pending = primitives.slice()
  while (pending.length) {
    let ready = pending.filter((primitive) => primitiveRefs(primitive).every((id) => revealed.has(id) || !known.has(id)))
    if (!ready.length) ready = pending
    ready.sort((a, b) => REVEAL_RANK[a.kind] - REVEAL_RANK[b.kind])
    for (const primitive of ready) {
      revealed.add(primitive.id)
      if (!(primitive.kind === 'point' && primitive.hidden)) order.push(primitive.id)
    }
    pending = pending.filter((primitive) => !revealed.has(primitive.id))
  }
  return order
}

/** Live ratio and angle readouts computed from the resolved figure, never from the primitive factors. */
function constructionReadouts(points: ResolvedPoint[]): Array<{ id: string; label: string; value: string; tone: 'invariant' | 'tutor' }> {
  const at = (id: string) => points.find((point) => point.id === id)?.point
  const readouts: Array<{ id: string; label: string; value: string; tone: 'invariant' | 'tutor' }> = []
  const O = at('O')
  for (const vertex of ['A', 'B', 'C']) {
    const source = at(vertex)
    const image = at(`H-${vertex}`)
    if (O && source && image && distance(O, source) > 1e-6) {
      readouts.push({ id: `ratio-${vertex}`, label: `O${vertex}ₕ / O${vertex}`, value: (distance(O, image) / distance(O, source)).toFixed(3), tone: 'invariant' })
    }
  }
  const S = at('S')
  const A = at('A'); const B = at('B'); const A2 = at('S-A'); const B2 = at('S-B')
  if (S && A && B && A2 && B2) {
    const parameters = spiralSimilarityParameters(A, B, A2, B2)
    if (parameters) {
      readouts.push({ id: 'spiral-ratio', label: "SA′ / SA = SB′ / SB", value: `${(distance(S, A2) / Math.max(1e-9, distance(S, A))).toFixed(3)} = ${(distance(S, B2) / Math.max(1e-9, distance(S, B))).toFixed(3)}`, tone: 'tutor' })
      readouts.push({ id: 'spiral-angle', label: '∠ASA′ = ∠BSB′', value: `${Math.abs(parameters.angle).toFixed(1)}°`, tone: 'tutor' })
    }
  }
  return readouts
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function angleArc(angle: ResolvedAngle, width: number, height: number) {
  const radius = 28
  const start = Math.atan2(angle.a.y - angle.vertex.y, angle.a.x - angle.vertex.x)
  const finish = Math.atan2(angle.b.y - angle.vertex.y, angle.b.x - angle.vertex.x)
  let delta = finish - start
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  const first = { x: angle.vertex.x + Math.cos(start) * radius, y: angle.vertex.y + Math.sin(start) * radius }
  const last = { x: angle.vertex.x + Math.cos(start + delta) * radius, y: angle.vertex.y + Math.sin(start + delta) * radius }
  const middle = start + delta / 2
  return {
    path: `M ${first.x} ${first.y} A ${radius} ${radius} 0 0 ${delta > 0 ? 1 : 0} ${last.x} ${last.y}`,
    label: {
      x: clamp(angle.vertex.x + Math.cos(middle) * 44, 8, width - 8),
      y: clamp(angle.vertex.y + Math.sin(middle) * 44, 8, height - 8),
    },
  }
}

/** Endpoints of a resolved line for drawing: rays start at their first point, lines extend both ways. */
function lineEndpoints(line: { id: string; through: Point; direction: Point }) {
  const length = Math.hypot(line.direction.x, line.direction.y) || 1
  const unit = { x: line.direction.x / length, y: line.direction.y / length }
  const ray = isRayId(line.id)
  return {
    x1: ray ? line.through.x : line.through.x - unit.x * RAY_LENGTH,
    y1: ray ? line.through.y : line.through.y - unit.y * RAY_LENGTH,
    x2: line.through.x + unit.x * RAY_LENGTH,
    y2: line.through.y + unit.y * RAY_LENGTH,
  }
}

const polygonArea = (points: Point[]) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length]
  return sum + point.x * next.y - next.x * point.y
}, 0)) / 2

type PendingItem = { id: string; role: 'point' | 'line' }
type DragState =
  | { mode: 'point'; id: string; pointerId: number; start: Point }
  | { mode: 'shape'; id: string; pointerId: number; origin: Point; starts: Record<string, Point> }
type Pulse = { id: string; at: number }

const POINT_TOOL_ARITY: Partial<Record<GeometryTool, number>> = {
  segment: 2, line: 2, ray: 2, circle: 2, midpoint: 2, homothety: 2, angle: 3,
}
const LINE_THEN_POINT_TOOLS: GeometryTool[] = ['perpendicular', 'parallel']
const CONSTRUCTION_TOOLS: GeometryTool[] = ['point', 'segment', 'line', 'ray', 'circle', 'polygon', 'midpoint', 'perpendicular', 'parallel', 'intersection', 'angle', 'homothety']

/** Point-like primitives are the ones that carry an editable label. */
const hasLabel = (primitive: GeometryPrimitive) => isPointLike(primitive)

/**
 * Ids that appeared since the previous render, for the draw-in animation.
 * Computed synchronously so a new primitive never paints un-animated first;
 * a timeout re-renders once to drop the class after the animation.
 */
function useEnteringIds(primitives: GeometryPrimitive[], enabled: boolean): Set<string> {
  const knownRef = useRef<Set<string> | null>(null)
  const enteredRef = useRef<Map<string, number>>(new Map())
  const [, setTick] = useState(0)
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const ids = primitives.map((primitive) => primitive.id)
  if (knownRef.current === null) knownRef.current = new Set(ids)
  else {
    const known = knownRef.current
    for (const id of ids) if (!known.has(id)) { if (enabled) enteredRef.current.set(id, now); known.add(id) }
    for (const id of Array.from(known)) if (!ids.includes(id)) { known.delete(id); enteredRef.current.delete(id) }
  }
  const entering = new Set<string>()
  for (const [id, at] of enteredRef.current) if (now - at < ENTER_MS + 140) entering.add(id)
  useEffect(() => {
    if (!entering.size) return
    const timer = window.setTimeout(() => setTick((value) => value + 1), ENTER_MS + 160)
    return () => window.clearTimeout(timer)
  })
  return entering
}

export default function LiveGeometry({
  object,
  run,
}: {
  object: GeometryObject
  run: (action: WorldAction) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setToolState] = useState<GeometryTool>('move')
  const [pending, setPending] = useState<PendingItem[]>([])
  const [draft, setDraft] = useState<GeometryPrimitive[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(false)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [dragging, setDraggingState] = useState<DragState | null>(null)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [pulses, setPulses] = useState<Pulse[]>([])
  const draggingRef = useRef<DragState | null>(null)
  const movedRef = useRef(false)
  const activeRef = useRef(false)
  const lastPolygonClickRef = useRef<{ id: string; created: boolean } | null>(null)
  const setDragging = (next: DragState | null) => { draggingRef.current = next; setDraggingState(next) }

  // ---- staged reveal: primitives draw in dependency order from drawProgress --
  const p = revealProgress(object)
  const revealing = p < 1

  // ---- change bookkeeping: local commits vs. changes that arrived from a tool --
  const pointsKey = primitivesKey(object.primitives)
  const localKeyRef = useRef<string | null>(null)
  const snapKeyRef = useRef<string | null>(null)
  const seenRef = useRef<{ key: string; primitives: GeometryPrimitive[] }>({ key: pointsKey, primitives: object.primitives })
  const tweenMs = snapKeyRef.current === pointsKey ? 0 : POINT_TWEEN_MS

  useEffect(() => {
    const seen = seenRef.current
    if (seen.key === pointsKey) return
    seenRef.current = { key: pointsKey, primitives: object.primitives }
    if (localKeyRef.current === pointsKey || revealing) return
    const changed = changedPointIds(seen.primitives, object.primitives)
    if (!changed.length) return
    const now = Date.now()
    setPulses((current) => {
      const live = current.filter((pulse) => now - pulse.at < PULSE_MS)
      const fresh = changed.filter((id) => !live.some((pulse) => pulse.id === id))
      return fresh.length ? [...live, ...fresh.map((id) => ({ id, at: now }))] : live
    })
  }, [pointsKey, object.primitives, revealing])

  const submit = (summary: string, next: GeometryPrimitive[], snap = false) => {
    const key = primitivesKey(next)
    localKeyRef.current = key
    if (snap) snapKeyRef.current = key
    run(humanPut(summary, { ...object, primitives: next }))
  }

  // ---- tweened base points: a tool-set point glides and everything built on it follows --
  const basePoints = object.primitives.filter((primitive): primitive is Extract<GeometryPrimitive, { kind: 'point' }> => primitive.kind === 'point')
  const baseFlat = basePoints.flatMap((point) => [point.at.x, point.at.y])
  const tweenedFlat = useTweenedNumbers(baseFlat, revealing ? 0 : tweenMs)
  const shownFlat = tweenMs === 0 || revealing || tweenedFlat.length !== baseFlat.length ? baseFlat : tweenedFlat
  const tweenedPrimitives = useMemo(() => {
    let index = 0
    return object.primitives.map((primitive) => {
      if (primitive.kind !== 'point') return primitive
      const at = { x: shownFlat[index], y: shownFlat[index + 1] }
      index += 2
      return at.x === primitive.at.x && at.y === primitive.at.y ? primitive : { ...primitive, at }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.primitives, shownFlat.join(',')])

  const entering = useEnteringIds(object.primitives, !revealing)

  const isConstructing = CONSTRUCTION_TOOLS.includes(tool)
  const allPrimitives = draft.length ? [...tweenedPrimitives, ...draft] : tweenedPrimitives
  const primitives = cursor && dragging ? withDrag(allPrimitives, dragging, cursor) : allPrimitives
  const resolved = resolveGeometry(primitives)
  const primitiveById = new Map(primitives.map((primitive) => [primitive.id, primitive]))
  const renderKindClass = (id: string) => {
    const kind = primitiveById.get(id)?.kind
    if (kind === 'circumcircle') return ' is-circumcircle'
    if (kind === 'mixtilinearIncircle') return ' is-mixtilinear-incircle'
    if (kind === 'incenter') return ' is-incenter'
    if (kind === 'arcMidpoint') return ' is-arc-midpoint'
    if (kind === 'circleTangency') return ' is-circle-tangency'
    return ''
  }
  const width = Math.max(220, object.bounds.width)
  const height = Math.max(180, object.bounds.height)
  const readouts = constructionReadouts(resolved.points)
  const hasSpiral = resolved.points.some((point) => point.id === 'S')
  const pointAt = (id: string) => resolved.points.find((point) => point.id === id)?.point ?? null
  const pendingIds = new Set(pending.map((item) => item.id))

  const order = useMemo(() => revealOrder(object.primitives), [object.primitives])
  const orderIndex = useMemo(() => new Map(order.map((id, index) => [id, index])), [order])
  const drawT = (id: string) => {
    if (!revealing) return 1
    const index = orderIndex.get(id)
    return index === undefined ? 1 : revealItem(p, index, order.length, 0.7)
  }
  const kickerT = revealStage(p, 0, 0.15)
  const legendT = revealStage(p, 0.85, 1)

  const setTool = (next: GeometryTool) => {
    setToolState(next)
    setPending([])
    setDraft([])
    setEditingLabel(null)
    lastPolygonClickRef.current = null
    if (next !== 'move') setSelected(null)
  }

  const nameOf = (id: string, list: GeometryPrimitive[] = allPrimitives) => {
    const primitive = list.find((candidate) => candidate.id === id)
    return (primitive && 'label' in primitive && primitive.label) || id
  }

  const describe = (primitive: GeometryPrimitive, list: GeometryPrimitive[] = allPrimitives): string => {
    const name = (id: string) => nameOf(id, list)
    const nested = (id: string) => { const found = list.find((candidate) => candidate.id === id); return found ? describe(found, list) : id }
    switch (primitive.kind) {
      case 'point': return `point ${name(primitive.id)}`
      case 'segment': return `segment ${name(primitive.from)}${name(primitive.to)}`
      case 'line': return `${isRayId(primitive.id) ? 'ray' : 'line'} ${name(primitive.through[0])}${name(primitive.through[1])}`
      case 'circle': return `circle centre ${name(primitive.center)} through ${name(primitive.through)}`
      case 'polygon': return `polygon ${primitive.points.map(name).join('')}`
      case 'midpoint': return `midpoint ${name(primitive.id)} of ${name(primitive.of[0])}${name(primitive.of[1])}`
      case 'perpendicular': return `perpendicular through ${name(primitive.through)} to ${nested(primitive.to)}`
      case 'parallel': return `parallel through ${name(primitive.through)} to ${nested(primitive.to)}`
      case 'intersection': return `intersection ${name(primitive.id)} of ${nested(primitive.lines[0])} and ${nested(primitive.lines[1])}`
      case 'angle': return `angle ${name(primitive.a)}${name(primitive.vertex)}${name(primitive.b)}`
      case 'homothety': return primitive.factor === -1
        ? `reflection of ${name(primitive.source)} through ${name(primitive.center)}`
        : `homothety of ${name(primitive.source)} about ${name(primitive.center)} (×${primitive.factor})`
      case 'similarity': return `spiral similarity of ${name(primitive.source)} about ${name(primitive.center)}`
      case 'spiralCenter': return `spiral centre ${name(primitive.id)}`
      case 'incenter': return `incentre of ${primitive.of.map(name).join('')}`
      case 'circumcircle': return `circumcircle of ${primitive.of.map(name).join('')}`
      case 'arcMidpoint': return `midpoint of the arc not containing ${name(primitive.notContaining)}`
      case 'mixtilinearIncircle': return `${name(primitive.vertex)}-mixtilinear incircle`
      case 'circleTangency': return `tangency of ${primitive.circles.map(name).join(' and ')}`
    }
  }

  const usedNames = () => {
    const used = new Set<string>()
    for (const primitive of allPrimitives) {
      used.add(primitive.id)
      if ('label' in primitive && primitive.label) used.add(primitive.label)
    }
    return used
  }

  const localPoint = (event: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current!
    const matrix = svg.getScreenCTM?.()
    if (matrix) {
      const mapped = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      return { x: mapped.x, y: mapped.y }
    }
    const rect = svg.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }
  }

  const round = (point: Point): Point => ({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 })

  const commit = (summary: string, next: GeometryPrimitive[]) => {
    submit(summary, next)
    setPending([])
    setDraft([])
    lastPolygonClickRef.current = null
  }

  // ---- Move tool: point drag (Shift locks an axis) and whole-shape drag ----

  const beginDrag = (event: ReactPointerEvent<SVGElement>, id: string) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* synthetic or already-captured pointer */ }
    movedRef.current = false
    const start = object.primitives.find((candidate) => candidate.id === id)
    setDragging({ mode: 'point', id, pointerId: event.pointerId, start: start?.kind === 'point' ? start.at : localPoint(event) })
    setCursor(localPoint(event))
  }

  const beginShapeDrag = (event: ReactPointerEvent<SVGElement>, id: string) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const primitive = object.primitives.find((candidate) => candidate.id === id)
    if (!primitive) return
    const starts: Record<string, Point> = {}
    for (const referenced of baseFreePoints(object.primitives, primitive)) {
      const found = object.primitives.find((candidate) => candidate.id === referenced)
      if (found?.kind === 'point') starts[referenced] = found.at
    }
    setSelected(id)
    if (!Object.keys(starts).length) return
    event.preventDefault()
    try { svgRef.current?.setPointerCapture(event.pointerId) } catch { /* synthetic or already-captured pointer */ }
    movedRef.current = false
    setDragging({ mode: 'shape', id, pointerId: event.pointerId, origin: localPoint(event), starts })
    setCursor(localPoint(event))
  }

  const dragCursor = (event: { clientX: number; clientY: number; shiftKey: boolean }, active: DragState): Point => {
    const raw = localPoint(event)
    return active.mode === 'point' && event.shiftKey ? constrainToAxis(active.start, raw) : raw
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = draggingRef.current
    if (!active) {
      if (isConstructing) setCursor(localPoint(event))
      return
    }
    if (active.pointerId !== event.pointerId) return
    event.stopPropagation()
    movedRef.current = true
    setCursor(dragCursor(event, active))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = draggingRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.stopPropagation()
    const point = dragCursor(event, active)
    if (movedRef.current) {
      const next = withDrag(object.primitives, active, point)
      if (active.mode === 'point') {
        submit(`Moved ${active.id}; every dependent mark recomputed`, next, true)
      } else {
        const primitive = object.primitives.find((candidate) => candidate.id === active.id)
        submit(`Moved ${primitive ? describe(primitive, object.primitives) : active.id}`, next, true)
      }
    } else if (active.mode === 'point') {
      setSelected(active.id)
    }
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    setDragging(null)
    if (!isConstructing) setCursor(null)
  }

  // ---- Deletion ----

  const deletePrimitive = (id: string) => {
    const primitive = object.primitives.find((candidate) => candidate.id === id)
    if (!primitive) return
    const removed = dependentIds(object.primitives, [id])
    const dependents = removed.size - 1
    const summary = `Deleted ${describe(primitive, object.primitives)}${dependents ? ` and ${dependents} dependent mark${dependents === 1 ? '' : 's'}` : ''}`
    setSelected(null)
    commit(summary, object.primitives.filter((candidate) => !removed.has(candidate.id)))
  }

  // ---- Labels and accent ----

  const renameLabel = (id: string, label: string) => {
    setEditingLabel(null)
    const primitive = object.primitives.find((candidate) => candidate.id === id)
    if (!primitive || !hasLabel(primitive)) return
    const trimmed = label.trim()
    const previous = ('label' in primitive && primitive.label) || primitive.id
    if (!trimmed || trimmed === previous) return
    const next = object.primitives.map((candidate) => candidate.id === id ? { ...candidate, label: trimmed } as GeometryPrimitive : candidate)
    submit(`Renamed point ${previous} to ${trimmed}`, next)
  }

  const setAccent = (accent: { label: string; value: string }) => {
    if (object.accent === accent.value) return
    run(humanPut(`Set figure accent to ${accent.label}`, { ...object, accent: accent.value }))
  }

  // ---- Construction clicks ----

  const acquirePoint = (at: Point, hit: GeometryPrimitive | null): { id: string; created: boolean } => {
    if (hit && isPointLike(hit)) return { id: hit.id, created: false }
    const label = nextPointLabel(usedNames())
    const point: GeometryPrimitive = { kind: 'point', id: label, at: round(at), label, draggable: true }
    setDraft((current) => [...current, point])
    return { id: label, created: true }
  }

  const finishPointTool = (ids: string[], list: GeometryPrimitive[]) => {
    const name = (id: string) => nameOf(id, list)
    const pair = `${name(ids[0])}${name(ids[1])}`
    let primitive: GeometryPrimitive | null = null
    if (tool === 'segment') primitive = { kind: 'segment', id: uniquePrimitiveId(list, `segment-${pair}`), from: ids[0], to: ids[1] }
    else if (tool === 'line') primitive = { kind: 'line', id: uniquePrimitiveId(list, `line-${pair}`), through: [ids[0], ids[1]] }
    else if (tool === 'ray') primitive = { kind: 'line', id: uniquePrimitiveId(list, `${RAY_PREFIX}${pair}`), through: [ids[0], ids[1]] }
    else if (tool === 'circle') primitive = { kind: 'circle', id: uniquePrimitiveId(list, `circle-${pair}`), center: ids[0], through: ids[1] }
    else if (tool === 'midpoint') {
      const label = nextPointLabel(new Set([...usedNames(), ...list.map((item) => item.id)]))
      primitive = { kind: 'midpoint', id: label, of: [ids[0], ids[1]], label }
    } else if (tool === 'angle') primitive = { kind: 'angle', id: uniquePrimitiveId(list, `angle-${pair}${name(ids[2])}`), a: ids[0], vertex: ids[1], b: ids[2] }
    else if (tool === 'homothety') {
      const answer = window.prompt(`Scale factor for the homothety of ${name(ids[1])} about ${name(ids[0])} (−1 reflects through the centre)`, '2')
      if (answer === null) { setPending([]); setDraft([]); return }
      const factor = Number(answer.replace(',', '.'))
      if (!Number.isFinite(factor) || factor === 0) { setPending([]); setDraft([]); return }
      const label = nextPointLabel(new Set([...usedNames(), ...list.map((item) => item.id)]))
      primitive = { kind: 'homothety', id: uniquePrimitiveId(list, `homothety-${name(ids[1])}-${name(ids[0])}`), center: ids[0], source: ids[1], factor, label }
    }
    if (!primitive) return
    const next = [...list, primitive]
    commit(`Added ${describe(primitive, next)}`, next)
  }

  /** The committed figure plus any draft points, with true (untweened) positions, for commits. */
  const committedList = () => draft.length ? [...object.primitives, ...draft] : object.primitives

  const handleConstructClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!isConstructing && tool !== 'delete') return
    if (event.button !== 0) return
    event.stopPropagation()
    const at = localPoint(event)
    const target = event.target instanceof Element ? event.target.closest('[data-primitive-id]') : null
    const hitId = target?.getAttribute('data-primitive-id') ?? null
    const hit = hitId ? allPrimitives.find((candidate) => candidate.id === hitId) ?? null : null
    const list = committedList()

    if (tool === 'delete') {
      if (hit && object.primitives.some((candidate) => candidate.id === hit.id)) deletePrimitive(hit.id)
      return
    }

    if (tool === 'polygon') {
      if (event.detail >= 2) {
        // The first click of a double-click already added a vertex at this spot; drop it and close.
        const last = lastPolygonClickRef.current
        const vertices = pending.filter((item, index) => !(last?.created && index === pending.length - 1 && item.id === last.id))
        const source = last?.created ? [...object.primitives, ...draft.filter((item) => item.id !== last.id)] : list
        if (vertices.length >= 3) closePolygon(vertices.map((item) => item.id), source)
        return
      }
      if (hit && pending.length >= 3 && hit.id === pending[0].id) { closePolygon(pending.map((item) => item.id), list); return }
      if (hit && pendingIds.has(hit.id)) return
      const acquired = acquirePoint(at, hit)
      lastPolygonClickRef.current = acquired
      setPending([...pending, { id: acquired.id, role: 'point' }])
      return
    }

    if (event.detail >= 2) return

    if (tool === 'point') {
      if (hit && isPointLike(hit)) return
      const label = nextPointLabel(usedNames())
      const point: GeometryPrimitive = { kind: 'point', id: label, at: round(at), label, draggable: true }
      commit(`Added point ${label}`, [...object.primitives, point])
      return
    }

    if (tool === 'intersection') {
      if (!hit || !isLineLike(hit) || pendingIds.has(hit.id)) return
      const next = [...pending, { id: hit.id, role: 'line' as const }]
      if (next.length < 2) { setPending(next); return }
      const label = nextPointLabel(usedNames())
      const primitive: GeometryPrimitive = { kind: 'intersection', id: label, lines: [next[0].id, next[1].id], label }
      const full = [...list, primitive]
      commit(`Added ${describe(primitive, full)}`, full)
      return
    }

    if (LINE_THEN_POINT_TOOLS.includes(tool)) {
      const line = pending.find((item) => item.role === 'line')
      if (!line) {
        if (hit && isLineLike(hit)) setPending([{ id: hit.id, role: 'line' }])
        return
      }
      const acquired = acquirePoint(at, hit)
      const source = acquired.created
        ? [...list, { kind: 'point', id: acquired.id, at: round(at), label: acquired.id, draggable: true } as GeometryPrimitive]
        : list
      const kind = tool === 'perpendicular' ? 'perpendicular' : 'parallel'
      const primitive: GeometryPrimitive = { kind, id: uniquePrimitiveId(source, `${kind}-${nameOf(acquired.id, source)}-${line.id}`), through: acquired.id, to: line.id }
      const next = [...source, primitive]
      commit(`Added ${describe(primitive, next)}`, next)
      return
    }

    const arity = POINT_TOOL_ARITY[tool]
    if (!arity) return
    if (hit && pendingIds.has(hit.id) && isPointLike(hit)) return
    const acquired = acquirePoint(at, hit)
    const next = [...pending, { id: acquired.id, role: 'point' as const }]
    if (next.length < arity) { setPending(next); return }
    const source = acquired.created
      ? [...list, { kind: 'point', id: acquired.id, at: round(at), label: acquired.id, draggable: true } as GeometryPrimitive]
      : list
    finishPointTool(next.map((item) => item.id), source)
  }

  const closePolygon = (ids: string[], list: GeometryPrimitive[]) => {
    const primitive: GeometryPrimitive = { kind: 'polygon', id: uniquePrimitiveId(list, `polygon-${ids.map((id) => nameOf(id, list)).join('')}`), points: ids }
    const next = [...list, primitive]
    commit(`Added ${describe(primitive, next)}`, next)
  }

  const handleSvgPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    if (isConstructing || tool === 'delete') { event.stopPropagation(); return }
    const target = event.target instanceof Element ? event.target.closest('[data-primitive-id]') : null
    if (!target) setSelected(null)
  }

  const handleMoveSelect = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (tool !== 'move' || event.button !== 0) return
    const target = event.target instanceof Element ? event.target.closest('[data-primitive-id]') : null
    const id = target?.getAttribute('data-primitive-id') ?? null
    if (id && !movedRef.current) setSelected(id)
  }

  const cancelPending = () => { setPending([]); setDraft([]); lastPolygonClickRef.current = null }

  // ---- Keyboard: shortcuts while hovered or focused, Delete for the selection ----

  const keyRef = useRef<(event: KeyboardEvent) => void>(() => {})
  keyRef.current = (event: KeyboardEvent) => {
    if (!activeRef.current) return
    const target = event.target as HTMLElement | null
    if (target?.matches?.('input, textarea, [contenteditable="true"]')) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Escape') {
      if (editingLabel) { setEditingLabel(null); event.stopPropagation(); return }
      if (pending.length || draft.length) { cancelPending(); event.stopPropagation(); return }
      if (selected) { setSelected(null); event.stopPropagation(); return }
      if (tool !== 'move') { setTool('move'); event.stopPropagation() }
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selected) { event.preventDefault(); event.stopPropagation(); deletePrimitive(selected) }
      return
    }
    const definition = GEOMETRY_TOOLS.find((candidate) => candidate.key.toLowerCase() === event.key.toLowerCase())
    if (definition && event.key.length === 1) { event.preventDefault(); event.stopPropagation(); setTool(definition.id) }
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyRef.current(event)
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [])

  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // The capture listener already handled shortcuts; keep the canvas from re-reading handled keys.
    if (event.key === 'Delete' || event.key === 'Backspace') { if (selected) event.stopPropagation() }
  }

  // ---- Derived UI ----

  const activeTool = GEOMETRY_TOOLS.find((candidate) => candidate.id === tool)!
  const arity = POINT_TOOL_ARITY[tool]
  let hint = activeTool.hint
  if (tool === 'polygon' && pending.length) hint = pending.length >= 3 ? 'click the first vertex or double-click to close' : `${pending.length} vertex${pending.length === 1 ? '' : 'es'} · keep clicking`
  else if (arity && pending.length) hint = `${pending.length} of ${arity} · ${activeTool.hint}`
  else if (LINE_THEN_POINT_TOOLS.includes(tool) && pending.length) hint = `now click the point it passes through`
  else if (tool === 'intersection' && pending.length) hint = 'now click the second line or segment'

  const selectedPrimitive = selected ? object.primitives.find((candidate) => candidate.id === selected) ?? null : null
  const measure = selectedPrimitive ? measurementFor(selectedPrimitive, resolved, describe(selectedPrimitive, object.primitives)) : null
  const metaText = tool === 'move' ? (selectedPrimitive ? describe(selectedPrimitive, object.primitives) : 'move · click to select') : `${activeTool.label.toLowerCase()} tool`
  const selectionIsStroke = selectedPrimitive ? ['segment', 'line', 'circle', 'polygon', 'angle', 'perpendicular', 'parallel', 'circumcircle', 'mixtilinearIncircle'].includes(selectedPrimitive.kind) : false

  const previews = isConstructing && cursor ? renderPreview(tool, pending, cursor, pointAt, resolved) : null

  const freePoints = object.primitives.filter((primitive): primitive is Extract<GeometryPrimitive, { kind: 'point' }> => primitive.kind === 'point' && !primitive.hidden)
  const setCoordinate = (id: string, axis: 'x' | 'y', value: number) => {
    const primitive = object.primitives.find((candidate) => candidate.id === id)
    if (primitive?.kind !== 'point' || !Number.isFinite(value) || primitive.at[axis] === value) return
    const at = { ...primitive.at, [axis]: value }
    submit(`Set ${nameOf(id, object.primitives)} to (${at.x}, ${at.y})`, object.primitives.map((candidate) => candidate.id === id ? { ...candidate, at } as GeometryPrimitive : candidate))
  }

  const visiblePoints = resolved.points.filter((point) => !point.hidden)
  const markCount = object.primitives.filter((primitive) => !(primitive.kind === 'point')).length
  const activePulses = pulses.map((pulse) => ({ ...pulse, point: pointAt(pulse.id) })).filter((pulse): pulse is Pulse & { point: Point } => Boolean(pulse.point))
  const editingPoint = editingLabel ? resolved.points.find((point) => point.id === editingLabel) ?? null : null

  const rootClass = ['live-geometry', 'has-toolbar', 'reveal-root', revealing ? 'is-revealing' : '', tool === 'move' ? 'is-moving' : tool === 'delete' ? 'is-deleting' : 'is-constructing'].filter(Boolean).join(' ')
  const toolbarRise = revealRiseStyle(p, 0.06, 0.22, { distance: 12 })
  const rootStyle: CSSProperties = {
    ...(revealing ? { opacity: object.opacity } : {}),
    '--accent': object.accent || '#7c5cff',
    '--geometry-toolbar-opacity': toolbarRise.opacity,
    '--geometry-toolbar-transform': toolbarRise.transform,
  } as CSSProperties
  const enteringClass = (id: string) => entering.has(id) ? ' is-entering' : ''

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={rootStyle}
      tabIndex={-1}
      onPointerEnter={() => { activeRef.current = true }}
      onPointerLeave={() => { activeRef.current = rootRef.current?.contains(document.activeElement) ?? false; if (isConstructing && !draggingRef.current) setCursor(null) }}
      onFocus={() => { activeRef.current = true }}
      onBlur={(event) => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) activeRef.current = rootRef.current?.matches(':hover') ?? false }}
      onKeyDown={onRootKeyDown}
    >
      <header className="geometry-header" style={revealRiseStyle(p, 0.01, 0.15)}>
        <div className="geometry-heading">
          <span className="geometry-kicker">Dynamic geometry</span>
          <h3>Homothety · Spiral similarity</h3>
        </div>
        <div className="geometry-meta">
          <b>{visiblePoints.length} points · {markCount} marks</b>
          <small title={metaText}>{metaText}</small>
        </div>
      </header>
      <GeometryToolbar
        tool={tool}
        onSelect={setTool}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((value) => !value)}
        showCoordinates={showCoordinates}
        onToggleCoordinates={() => setShowCoordinates((value) => !value)}
        hint={hint}
      />
      <div className="geometry-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          aria-label="Dynamic geometry construction"
          data-canvas-control={isConstructing || tool === 'delete' ? 'true' : undefined}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onClick={tool === 'move' ? handleMoveSelect : handleConstructClick}
        >
          <rect className="geometry-paper" width={width} height={height} />
          {resolved.polygons.map((polygon) => {
            const t = drawT(polygon.id)
            if (t <= 0) return null
            return (
              <polygon
                key={polygon.id}
                className={`geometry-polygon is-${polygon.id}${selected === polygon.id ? ' is-selected' : ''}${enteringClass(polygon.id)}`}
                points={polygon.points.map((point) => `${point.x},${point.y}`).join(' ')}
                pathLength={1}
                style={t < 1 ? { ...revealDash(t), fillOpacity: t } : undefined}
                data-primitive-id={polygon.id}
                data-canvas-handle="true"
                onPointerDown={tool === 'move' ? (event) => beginShapeDrag(event, polygon.id) : undefined}
              />
            )
          })}
          {resolved.circles.map((circle) => {
            const t = drawT(circle.id)
            if (t <= 0) return null
            return <g key={circle.id}>
              <circle className={`geometry-circle is-${circle.id}${renderKindClass(circle.id)}${selected === circle.id ? ' is-selected' : ''}${enteringClass(circle.id)}`} cx={circle.center.x} cy={circle.center.y} r={circle.radius} pathLength={1} style={revealDash(t)} />
              <circle className="geometry-hit" cx={circle.center.x} cy={circle.center.y} r={circle.radius} data-primitive-id={circle.id} data-canvas-handle="true" onPointerDown={tool === 'move' ? (event) => beginShapeDrag(event, circle.id) : undefined} />
            </g>
          })}
          {resolved.lines.map((line) => {
            const t = drawT(line.id)
            if (t <= 0) return null
            const ends = lineEndpoints(line)
            return <g key={line.id}>
              <line className={`geometry-line is-${line.id}${selected === line.id ? ' is-selected' : ''}${pendingIds.has(line.id) ? ' is-pending' : ''}${enteringClass(line.id)}`} {...ends} pathLength={1} style={revealDash(t)} />
              <line className="geometry-hit" {...ends} data-primitive-id={line.id} data-canvas-handle="true" onPointerDown={tool === 'move' ? (event) => beginShapeDrag(event, line.id) : undefined} />
            </g>
          })}
          {resolved.segments.map((segment) => {
            const t = drawT(segment.id)
            if (t <= 0) return null
            return <g key={segment.id}>
              <line className={`geometry-segment is-${segment.id}${selected === segment.id ? ' is-selected' : ''}${pendingIds.has(segment.id) ? ' is-pending' : ''}${enteringClass(segment.id)}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} pathLength={1} style={revealDash(t)} />
              <line className="geometry-hit" x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} data-primitive-id={segment.id} data-canvas-handle="true" onPointerDown={tool === 'move' ? (event) => beginShapeDrag(event, segment.id) : undefined} />
            </g>
          })}
          {resolved.angles.map((angle) => {
            const t = drawT(angle.id)
            if (t <= 0) return null
            const arc = angleArc(angle, width, height)
            return <g key={angle.id} className={`geometry-angle-group is-${angle.id}${selected === angle.id ? ' is-selected' : ''}`}>
              <path className={`geometry-angle${enteringClass(angle.id)}`} d={arc.path} pathLength={1} style={revealDash(t)} />
              <path className="geometry-hit" d={arc.path} data-primitive-id={angle.id} data-canvas-handle="true" />
              <text className="geometry-angle-label" x={arc.label.x} y={arc.label.y} textAnchor="middle" style={revealRiseStyle(t, 0, 1, { distance: 9 })}>{angle.degrees.toFixed(1)}°</text>
            </g>
          })}
          {previews}
          {activePulses.map((pulse) => (
            <circle
              key={`pulse-${pulse.id}-${pulse.at}`}
              className="geometry-agent-pulse"
              cx={pulse.point.x}
              cy={pulse.point.y}
              r={13}
              onAnimationEnd={() => setPulses((current) => current.filter((candidate) => candidate !== pulse && !(candidate.id === pulse.id && candidate.at === pulse.at)))}
            />
          ))}
          {visiblePoints.map((point) => {
            const t = drawT(point.id)
            if (t <= 0) return null
            const radius = point.draggable ? 6 : 4.5
            const isEditing = editingLabel === point.id
            return <g key={point.id} className={`geometry-point-group is-${point.id}${renderKindClass(point.id)}${enteringClass(point.id)}`}>
              {(pendingIds.has(point.id) || selected === point.id) && <circle className={`geometry-ring${selected === point.id ? ' is-selected' : ''}`} cx={point.point.x} cy={point.point.y} r={11} />}
              <circle
                className={`geometry-point${point.draggable ? ' is-draggable' : ''}${point.derived ? ' is-derived' : ''}${point.id === 'S' ? ' is-spiral-center' : ''}${renderKindClass(point.id)}`}
                data-demo-target={point.id === 'A' ? 'geometry-vertex-a' : undefined}
                data-canvas-handle={point.draggable ? 'true' : undefined}
                data-primitive-id={point.id}
                cx={point.point.x}
                cy={point.point.y}
                r={radius * (0.25 + 0.75 * t)}
                onPointerDown={tool === 'move' && point.draggable ? (event) => beginDrag(event, point.id) : undefined}
              />
              {point.label && !isEditing && (
                <text
                  className={`geometry-label${showLabels ? '' : ' is-hidden'}${tool === 'move' ? ' is-editable' : ''}`}
                  data-canvas-control={tool === 'move' ? 'true' : undefined}
                  x={point.point.x + 9}
                  y={point.point.y - 9}
                  style={revealRiseStyle(t, 0, 1, { distance: 10 })}
                  onDoubleClick={tool === 'move' ? (event) => { event.stopPropagation(); setEditingLabel(point.id) } : undefined}
                >
                  {point.label}
                  {tool === 'move' && <title>Double-click to rename</title>}
                </text>
              )}
            </g>
          })}
          {editingPoint && (
            <foreignObject
              x={clamp(editingPoint.point.x + 4, 4, width - 100)}
              y={clamp(editingPoint.point.y - 26, 4, height - 34)}
              width={96}
              height={30}
            >
              <LabelEditor value={editingPoint.label ?? editingPoint.id} onCommit={(label) => renameLabel(editingPoint.id, label)} onCancel={() => setEditingLabel(null)} />
            </foreignObject>
          )}
        </svg>
        {measure && selectedPrimitive && (
          <div className={`geometry-measure${showCoordinates ? ' has-coordinates' : ''}`} data-canvas-control="true" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
            <small>measure</small>
            <span className="geometry-measure-name">{measure.label}</span>
            <b>{measure.value}</b>
            {selectionIsStroke && (
              <div className="geometry-measure-style" role="group" aria-label="Figure accent">
                <small>figure accent</small>
                <div className="geometry-swatches">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      className={`geometry-swatch is-${accent.id}${(object.accent || '#7c5cff').toLowerCase() === accent.value ? ' is-active' : ''}`}
                      style={{ '--swatch': accent.value } as CSSProperties}
                      aria-label={`${accent.label} accent`}
                      aria-pressed={(object.accent || '#7c5cff').toLowerCase() === accent.value}
                      title={`${accent.label} — colours the construction marks of this figure`}
                      onClick={() => setAccent(accent)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {showCoordinates && (
          <div className="geometry-coordinates" data-canvas-control="true" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
            <h4>Coordinates</h4>
            {freePoints.map((point) => (
              <div key={`${point.id}-${point.at.x}-${point.at.y}`} className="geometry-coordinate-row">
                <b>{point.label ?? point.id}</b>
                <CoordinateField value={point.at.x} label={`${point.label ?? point.id} x`} onCommit={(value) => setCoordinate(point.id, 'x', value)} />
                <CoordinateField value={point.at.y} label={`${point.label ?? point.id} y`} onCommit={(value) => setCoordinate(point.id, 'y', value)} />
              </div>
            ))}
            {!freePoints.length && <p>No free points yet.</p>}
          </div>
        )}
      </div>
      <footer className={`geometry-legend${hasSpiral ? ' has-spiral' : ''}`} style={revealRiseStyle(p, 0.84, 1)}>
        {readouts.map((readout) => <span key={readout.id} className={`geometry-readout is-${readout.tone}`}><small>{readout.label}</small><b>{readout.value}</b></span>)}
        <em>{hasSpiral ? 'S is the fixed point of the spiral similarity A→A′, B→B′, recomputed from the four points' : 'drag A, B, C or O · the two circles stay tangent at O'}</em>
      </footer>
    </div>
  )
}

/** Free (non-derived) points a primitive is built on; dragging the shape translates exactly these. */
function baseFreePoints(primitives: GeometryPrimitive[], primitive: GeometryPrimitive): string[] {
  const ids: string[] = []
  switch (primitive.kind) {
    case 'point': ids.push(primitive.id); break
    case 'segment': ids.push(primitive.from, primitive.to); break
    case 'line': ids.push(...primitive.through); break
    case 'circle': ids.push(primitive.center, primitive.through); break
    case 'polygon': ids.push(...primitive.points); break
    case 'angle': ids.push(primitive.a, primitive.vertex, primitive.b); break
    default: return []
  }
  return ids.filter((id) => { const found = primitives.find((candidate) => candidate.id === id); return found?.kind === 'point' && found.draggable })
}

function withDrag(primitives: GeometryPrimitive[], drag: DragState, cursor: Point): GeometryPrimitive[] {
  if (drag.mode === 'point') {
    return primitives.map((primitive) => primitive.kind === 'point' && primitive.id === drag.id ? { ...primitive, at: cursor } : primitive)
  }
  const dx = cursor.x - drag.origin.x
  const dy = cursor.y - drag.origin.y
  return primitives.map((primitive) => {
    const start = primitive.kind === 'point' ? drag.starts[primitive.id] : undefined
    return start ? { ...primitive, at: { x: Math.round((start.x + dx) * 10) / 10, y: Math.round((start.y + dy) * 10) / 10 } } : primitive
  })
}

function measurementFor(primitive: GeometryPrimitive, resolved: ResolvedGeometry, description: string): { label: string; value: string } | null {
  const id = primitive.id
  const point = resolved.points.find((candidate) => candidate.id === id)
  if (point) return { label: description, value: `(${point.point.x.toFixed(1)}, ${point.point.y.toFixed(1)})` }
  const segment = resolved.segments.find((candidate) => candidate.id === id)
  if (segment) return { label: description, value: `length ${distance(segment.from, segment.to).toFixed(1)}` }
  const circle = resolved.circles.find((candidate) => candidate.id === id)
  if (circle) return { label: description, value: `radius ${circle.radius.toFixed(1)} · circumference ${(2 * Math.PI * circle.radius).toFixed(1)}` }
  const angle = resolved.angles.find((candidate) => candidate.id === id)
  if (angle) return { label: description, value: `${angle.degrees.toFixed(1)}°` }
  const polygon = resolved.polygons.find((candidate) => candidate.id === id)
  if (polygon) {
    const perimeter = polygon.points.reduce((sum, point, index) => sum + distance(point, polygon.points[(index + 1) % polygon.points.length]), 0)
    return { label: description, value: `area ${polygonArea(polygon.points).toFixed(0)} · perimeter ${perimeter.toFixed(1)}` }
  }
  const line = resolved.lines.find((candidate) => candidate.id === id)
  if (line) {
    const degrees = Math.atan2(-line.direction.y, line.direction.x) * 180 / Math.PI
    return { label: description, value: `direction ${Math.round(((degrees % 180) + 180) % 180)}°` }
  }
  return { label: description, value: '' }
}

function renderPreview(tool: GeometryTool, pending: PendingItem[], cursor: Point, pointAt: (id: string) => Point | null, resolved: ResolvedGeometry) {
  const first = pending[0] ? pointAt(pending[0].id) : null
  const cursorDot = <circle key="cursor" className="geometry-preview is-point" cx={cursor.x} cy={cursor.y} r={4} />
  const dashed = (from: Point, to: Point, key: string) => <line key={key} className="geometry-preview" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
  if (tool === 'point') return cursorDot
  if (tool === 'intersection') return null
  if (tool === 'perpendicular' || tool === 'parallel') {
    const line = pending.find((item) => item.role === 'line')
    if (!line) return cursorDot
    const source = resolved.lines.find((item) => item.id === line.id) ?? (() => {
      const segment = resolved.segments.find((item) => item.id === line.id)
      return segment ? { id: segment.id, through: segment.from, direction: { x: segment.to.x - segment.from.x, y: segment.to.y - segment.from.y } } : null
    })()
    if (!source) return cursorDot
    const direction = tool === 'parallel' ? source.direction : { x: -source.direction.y, y: source.direction.x }
    const ends = lineEndpoints({ id: 'preview', through: cursor, direction })
    return <g key="preview"><line className="geometry-preview" {...ends} />{cursorDot}</g>
  }
  if (!first) return cursorDot
  if (tool === 'segment' || tool === 'homothety') return <g key="preview">{dashed(first, cursor, 'a')}{cursorDot}</g>
  if (tool === 'line' || tool === 'ray') {
    const ends = lineEndpoints({ id: tool === 'ray' ? `${RAY_PREFIX}preview` : 'preview', through: first, direction: { x: cursor.x - first.x, y: cursor.y - first.y } })
    return <g key="preview"><line className="geometry-preview" {...ends} />{cursorDot}</g>
  }
  if (tool === 'circle') return <g key="preview"><circle className="geometry-preview" cx={first.x} cy={first.y} r={distance(first, cursor)} />{cursorDot}</g>
  if (tool === 'midpoint') {
    const mid = { x: (first.x + cursor.x) / 2, y: (first.y + cursor.y) / 2 }
    return <g key="preview">{dashed(first, cursor, 'a')}<circle className="geometry-preview is-point" cx={mid.x} cy={mid.y} r={4} />{cursorDot}</g>
  }
  if (tool === 'angle') {
    const second = pending[1] ? pointAt(pending[1].id) : null
    if (!second) return <g key="preview">{dashed(first, cursor, 'a')}{cursorDot}</g>
    return <g key="preview">{dashed(second, first, 'a')}{dashed(second, cursor, 'b')}{cursorDot}</g>
  }
  if (tool === 'polygon') {
    const vertices = pending.map((item) => pointAt(item.id)).filter((point): point is Point => Boolean(point))
    const path = [...vertices, cursor].map((point) => `${point.x},${point.y}`).join(' ')
    return <g key="preview"><polyline className="geometry-preview" points={path} />{vertices.length >= 2 && dashed(cursor, vertices[0], 'close')}{cursorDot}</g>
  }
  return cursorDot
}

function CoordinateField({ value, label, onCommit }: { value: number; label: string; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value))
  const submit = () => {
    const parsed = Number(text.replace(',', '.'))
    if (Number.isFinite(parsed)) onCommit(Math.round(parsed * 10) / 10)
    else setText(String(value))
  }
  return (
    <input
      type="number"
      step="1"
      inputMode="decimal"
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={submit}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); (event.target as HTMLInputElement).blur() } event.stopPropagation() }}
    />
  )
}

function LabelEditor({ value, onCommit, onCancel }: { value: string; onCommit: (value: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value)
  const doneRef = useRef(false)
  const finish = (commit: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    if (commit) onCommit(text)
    else onCancel()
  }
  return (
    <input
      className="geometry-label-editor"
      data-canvas-control="true"
      autoFocus
      maxLength={8}
      aria-label={`Rename point ${value}`}
      value={text}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') { event.preventDefault(); finish(true) }
        if (event.key === 'Escape') finish(false)
      }}
      onBlur={() => finish(true)}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}
