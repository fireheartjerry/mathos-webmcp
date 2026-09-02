import type { GeometryPrimitive, Point, Viewport, WorldObject, WorldState } from '../world/types'
import type { SemanticEntity } from '../semantic/types'
import { interpolate, type Interpolable } from './easing'
import type { AnimationKeyframe, AnimationTargetPath, AnimationTimeline, AnimationTrack, AnimationValue } from './types'

/** Times keyed by timeline id; every listed timeline is overlaid at that time. */
export type ActivePlaybacks = Record<string, number>

const warned = new Set<string>()
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[animation] ${message}`)
}

/** Keyframes ordered by time. Cached per keyframe record since tracks are immutable in the store. */
const sortedCache = new WeakMap<Record<string, AnimationKeyframe>, AnimationKeyframe[]>()
export function sortedKeyframes(track: AnimationTrack): AnimationKeyframe[] {
  const cached = sortedCache.get(track.keyframes)
  if (cached) return cached
  const sorted = Object.values(track.keyframes).slice().sort((a, b) => a.time - b.time)
  sortedCache.set(track.keyframes, sorted)
  return sorted
}

/**
 * Value of a track at `time`. Before the first keyframe it holds the first
 * value, after the last it holds the last, and in between it interpolates with
 * the easing declared on the segment's starting keyframe.
 */
export function sampleTrack(track: AnimationTrack, time: number): AnimationValue | undefined {
  const frames = sortedKeyframes(track)
  if (frames.length === 0) return undefined
  if (time <= frames[0].time) return frames[0].value
  const last = frames[frames.length - 1]
  if (time >= last.time) return last.value
  let index = 0
  while (index < frames.length - 1 && frames[index + 1].time <= time) index += 1
  const from = frames[index]
  const to = frames[index + 1]
  const span = to.time - from.time
  const t = span <= 0 ? 1 : (time - from.time) / span
  return interpolate(from.value as Interpolable, to.value as Interpolable, t, from.easing) as AnimationValue
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isNumberArray = (value: unknown): value is number[] => Array.isArray(value) && value.every(isFiniteNumber)

/** Accept `[x, y]` (the persisted shape) or a `{x, y}` object. */
function toPoint(value: unknown): Point | null {
  if (isNumberArray(value) && value.length >= 2) return { x: value[0], y: value[1] }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as { x?: unknown; y?: unknown }
    if (isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y)) return { x: candidate.x, y: candidate.y }
  }
  return null
}

/** A rectangular, non-empty number[][] (matrix `values`); rows are copied. */
function toMatrix(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isNumberArray)) return null
  const rows = value as number[][]
  const columns = rows[0].length
  if (columns === 0 || rows.some((row) => row.length !== columns)) return null
  return rows.map((row) => row.slice())
}

const NUMBER_PATHS = new Set([
  'opacity', 'rotation', 'drawProgress', 'showTangentAt', 'section', 'width', 'fontSize', 'strokeScale',
  'temperature', 'rotationX', 'rotationY', 'step', 'learningRate', 'selectedN',
])
const POINT_PATHS = new Set(['from', 'to'])
const STRING_PATHS = new Set(['latex', 'text', 'color', 'accent', 'fill', 'stroke'])
const ARRAY_PATHS = new Set(['weights', 'shadeIntegral', 'xDomain', 'yDomain', 'bridgeMasses', 'binEdges'])

/**
 * Returns a shallow-patched copy of `object` with `path` set, or null when the
 * path is unsupported for that object (the caller warns once).
 */
export function applyObjectPath(object: WorldObject, path: string, value: AnimationValue | Point): WorldObject | null {
  const record = object as unknown as Record<string, unknown>
  const segments = path.split('.')
  const root = segments[0]

  if (segments.length === 1 && root === 'values' && object.kind === 'matrix') {
    const values = toMatrix(value)
    return values ? { ...object, values } : null
  }

  if (segments.length === 1) {
    if (NUMBER_PATHS.has(root)) {
      if (!isFiniteNumber(value)) return null
      if (root === 'drawProgress') return { ...object, drawProgress: Math.min(1, Math.max(0, value)) }
      return { ...record, [root]: value } as unknown as WorldObject
    }
    if (POINT_PATHS.has(root)) {
      const point = toPoint(value)
      return point ? ({ ...record, [root]: point } as unknown as WorldObject) : null
    }
    if (STRING_PATHS.has(root)) {
      return typeof value === 'string' ? ({ ...record, [root]: value } as unknown as WorldObject) : null
    }
    if (ARRAY_PATHS.has(root)) {
      return isNumberArray(value) ? ({ ...record, [root]: value.slice() } as unknown as WorldObject) : null
    }
    return null
  }

  if (root === 'bounds' && segments.length === 2) {
    const key = segments[1]
    if (!['x', 'y', 'width', 'height'].includes(key) || !isFiniteNumber(value)) return null
    return { ...object, bounds: { ...object.bounds, [key]: value } }
  }

  if (root === 'parameters' && segments.length === 2 && object.kind === 'graph') {
    if (!isFiniteNumber(value)) return null
    return { ...object, parameters: { ...(object.parameters ?? {}), [segments[1]]: value } }
  }

  if (root === 'primitives' && segments.length === 3 && segments[2] === 'at' && object.kind === 'geometry') {
    const point = toPoint(value)
    if (!point) return null
    const key = segments[1]
    const byIndex = /^(?:0|[1-9][0-9]*)$/.test(key) ? Number(key) : -1
    let touched = false
    const primitives: GeometryPrimitive[] = object.primitives.map((primitive, index) => {
      if (primitive.kind !== 'point') return primitive
      if (index === byIndex || primitive.id === key) {
        touched = true
        return { ...primitive, at: point }
      }
      return primitive
    })
    return touched ? { ...object, primitives } : null
  }

  if (root === 'vertices' && segments.length === 2 && object.kind === 'barycentric') {
    const index = Number(segments[1])
    const point = toPoint(value)
    if (!point || !(index >= 0 && index < 3)) return null
    const vertices = object.vertices.slice() as [Point, Point, Point]
    vertices[index] = point
    return { ...object, vertices }
  }

  return null
}

/** Generic nested set on an entity; returns null when the path does not already exist. */
function applyEntityPath(entity: SemanticEntity, path: string, value: AnimationValue): SemanticEntity | null {
  const segments = path.split('.')
  const clone = (node: unknown): Record<string, unknown> | null =>
    node && typeof node === 'object' && !Array.isArray(node) ? { ...(node as Record<string, unknown>) } : null
  const rootCopy = clone(entity)
  if (!rootCopy) return null
  let cursor = rootCopy
  for (let index = 0; index < segments.length - 1; index += 1) {
    const next = clone(cursor[segments[index]])
    if (!next) return null
    cursor[segments[index]] = next
    cursor = next
  }
  const leaf = segments[segments.length - 1]
  if (!(leaf in cursor)) return null
  cursor[leaf] = Array.isArray(value) ? value.slice() : value
  return rootCopy as unknown as SemanticEntity
}

function applyCameraPath(viewport: Viewport, path: string, value: AnimationValue): Viewport | null {
  const key = path.startsWith('viewport.') ? path.slice('viewport.'.length) : path
  if (!['x', 'y', 'zoom'].includes(key) || !isFiniteNumber(value)) return null
  return { ...viewport, [key]: value }
}

const targetKey = (target: AnimationTargetPath) =>
  target.kind === 'camera' ? `camera:${target.path}` : target.kind === 'object' ? `object:${target.path}` : `entity:${target.path}`

type Draft = {
  objects: Record<string, WorldObject> | null
  entities: Record<string, SemanticEntity> | null
  viewport: Viewport | null
}

function applyTimelineInto(draft: Draft, world: WorldState, timeline: AnimationTimeline, time: number) {
  for (const track of Object.values(timeline.tracks)) {
    const value = sampleTrack(track, time)
    if (value === undefined) continue
    const target = track.target
    if (target.kind === 'camera') {
      const next = applyCameraPath(draft.viewport ?? world.viewport, target.path, value)
      if (next) draft.viewport = next
      else warnOnce(targetKey(target), `camera path "${target.path}" is not animatable`)
    } else if (target.kind === 'object') {
      const current = (draft.objects ?? world.objects)[target.objectId]
      if (!current) continue
      const next = applyObjectPath(current, target.path, value)
      if (next) {
        if (!draft.objects) draft.objects = { ...world.objects }
        draft.objects[target.objectId] = next
      } else {
        warnOnce(`${targetKey(target)}:${current.kind}`, `object path "${target.path}" is not animatable on a ${current.kind}`)
      }
    } else {
      const current = (draft.entities ?? world.entities)[target.entityId]
      if (!current) continue
      const next = applyEntityPath(current, target.path, value)
      if (next) {
        if (!draft.entities) draft.entities = { ...world.entities }
        draft.entities[target.entityId] = next
      } else {
        warnOnce(targetKey(target), `entity path "${target.path}" is not animatable`)
      }
    }
  }
}

function commit(world: WorldState, draft: Draft): WorldState {
  if (!draft.objects && !draft.entities && !draft.viewport) return world
  return {
    ...world,
    objects: draft.objects ?? world.objects,
    entities: draft.entities ?? world.entities,
    viewport: draft.viewport ?? world.viewport,
  }
}

/**
 * Derived world with every track of `timeline` applied at `time`. Never
 * dispatch the result: it is a render overlay on top of the canonical state.
 * Returns the same reference when nothing changes.
 */
export function evaluateTimeline(world: WorldState, timeline: AnimationTimeline, time: number): WorldState {
  const draft: Draft = { objects: null, entities: null, viewport: null }
  applyTimelineInto(draft, world, timeline, time)
  return commit(world, draft)
}

/** Overlay several timelines (by id, from `world.timelines`) at their own times. Later ids win on conflicts. */
export function evaluateActiveTimelines(world: WorldState, playbacks: ActivePlaybacks): WorldState {
  const draft: Draft = { objects: null, entities: null, viewport: null }
  let touched = false
  for (const [timelineId, time] of Object.entries(playbacks)) {
    const timeline = world.timelines[timelineId]
    if (!timeline || !Number.isFinite(time)) continue
    touched = true
    applyTimelineInto(draft, world, timeline, time)
  }
  return touched ? commit(world, draft) : world
}

// ---------------------------------------------------------------------------
// Staged reveals: pure helpers the view components use to turn one
// drawProgress fraction into per-element geometry.
// ---------------------------------------------------------------------------

/** Transient reveal fraction of an object; undefined or non-finite means fully drawn (1). */
export function revealProgress(object: { drawProgress?: number } | null | undefined): number {
  const progress = object?.drawProgress
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 1
  return Math.min(1, Math.max(0, progress))
}

/** Linear sub-stage of `p` on [start, end], clamped to 0..1. */
export function revealStage(p: number, start: number, end: number): number {
  if (end <= start) return p >= end ? 1 : 0
  return Math.min(1, Math.max(0, (p - start) / (end - start)))
}

/**
 * Sequential per-item fraction: item `index` of `count` draws while
 * `stage` runs through [index/count, (index+1)/count]; `overlap` (0..1) lets
 * consecutive items share part of their window so the sweep reads continuous.
 */
export function revealItem(stage: number, index: number, count: number, overlap = 0): number {
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  if (count <= 1) return clamp(stage)
  const window = Math.min(1, (1 + Math.max(0, overlap)) / count)
  const start = (Math.min(index, count - 1) * (1 - window)) / (count - 1)
  return clamp((stage - start) / window)
}

/** Inline SVG stroke style that draws a path from its start up to fraction `t` (use with pathLength={1}). */
export function revealDash(t: number): { strokeDasharray?: number; strokeDashoffset?: number } {
  if (t >= 1) return {}
  return { strokeDasharray: 1, strokeDashoffset: 1 - t }
}

/** Linear blend of two points, for endpoints that grow from an origin. */
export function revealLerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}
