import type { Actor, Bounds, Point, WorldObject, WorldOperation, WorldState } from './types'
import { buildSemanticEdit } from '../semantic/transactions'
import type { SemanticEdit } from '../semantic/transactions'
import type { WorldAction } from './types'

export function expandTargetIds(world: WorldState, ids: string[]): string[] {
  const expanded = new Set<string>()
  const visit = (id: string) => {
    if (expanded.has(id) || !world.objects[id]) return
    expanded.add(id)
    const object = world.objects[id]
    if (object.kind === 'group') object.childIds.forEach(visit)
  }
  ids.forEach(visit)
  return world.order.filter((id) => expanded.has(id))
}

export function unionBounds(world: WorldState, ids: string[]): Bounds | null {
  const objects = ids.map((id) => world.objects[id]).filter(Boolean)
  if (objects.length === 0) return null
  const left = Math.min(...objects.map((object) => object.bounds.x))
  const top = Math.min(...objects.map((object) => object.bounds.y))
  const right = Math.max(...objects.map((object) => object.bounds.x + object.bounds.width))
  const bottom = Math.max(...objects.map((object) => object.bounds.y + object.bounds.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function buildTransformOperations(world: WorldState, ids: string[], transform: { translate?: Point; scale?: number; rotate?: number }): WorldOperation[] {
  return expandTargetIds(world, ids).map((id) => {
    const object = world.objects[id]
    const translate = transform.translate ?? { x: 0, y: 0 }
    const scale = transform.scale ?? 1
    const center = {
      x: object.bounds.x + object.bounds.width / 2,
      y: object.bounds.y + object.bounds.height / 2
    }
    return {
      type: 'put' as const,
      object: {
        ...object,
        bounds: {
          x: center.x - (object.bounds.width * scale) / 2 + translate.x,
          y: center.y - (object.bounds.height * scale) / 2 + translate.y,
          width: Math.max(12, object.bounds.width * scale),
          height: Math.max(12, object.bounds.height * scale)
        },
        rotation: object.rotation + (transform.rotate ?? 0)
      }
    }
  })
}

export function buildDuplicateOperations(world: WorldState, ids: string[], author: Actor, offset: Point = { x: 24, y: 24 }): WorldOperation[] {
  const targets = expandTargetIds(world, ids)
  const remap = new Map(targets.map((id) => [id, crypto.randomUUID()]))
  return targets.map((id) => {
    const object = world.objects[id]
    const copy: WorldObject = {
      ...object,
      id: remap.get(id)!,
      author,
      bounds: {
        ...object.bounds,
        x: object.bounds.x + offset.x,
        y: object.bounds.y + offset.y
      },
      ...(object.kind === 'group'
        ? {
            childIds: object.childIds.map((childId) => remap.get(childId) ?? childId)
          }
        : {})
    } as WorldObject
    return { type: 'put' as const, object: copy }
  })
}

export function buildDeleteOperations(world: WorldState, ids: string[]): WorldOperation[] {
  return expandTargetIds(world, ids)
    .reverse()
    .map((id) => ({ type: 'remove', id }))
}

/** Wrap a semantic transaction in the same action shape used by the reducer. */
export function buildSemanticEditAction(world: WorldState, edit: SemanticEdit, source: Actor = 'human'): WorldAction {
  return {
    id: crypto.randomUUID(),
    source,
    summary: `Edit ${edit.entityId}.${edit.path}`,
    operations: buildSemanticEdit(world, edit)
  }
}

/* ------------------------------------------------------------------------ */
/* Direct-manipulation geometry: resize, rotate and node editing helpers.    */
/* ------------------------------------------------------------------------ */

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const MIN_OBJECT_SIZE = 8

export function boundsCenter(bounds: Bounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

export function rotatePoint(point: Point, center: Point, degrees: number): Point {
  if (!degrees) return { x: point.x, y: point.y }
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }
}

/** World point -> coordinates local to an object's unrotated bounds (origin at bounds.x/y). */
export function worldToObjectLocal(object: WorldObject, point: Point): Point {
  const local = rotatePoint(point, boundsCenter(object.bounds), -object.rotation)
  return { x: local.x - object.bounds.x, y: local.y - object.bounds.y }
}

/** Object-local point -> world coordinates, honouring the object's rotation. */
export function objectLocalToWorld(object: WorldObject, point: Point): Point {
  return rotatePoint({ x: object.bounds.x + point.x, y: object.bounds.y + point.y }, boundsCenter(object.bounds), object.rotation)
}

/**
 * Resize an axis-aligned box from one of its eight handles, keeping the opposite
 * side or corner fixed. Proportional corner drags keep the aspect ratio.
 */
export function resizeBoundsFromHandle(origin: Bounds, handle: ResizeHandle, pointer: Point, proportional: boolean): Bounds {
  let left = origin.x
  let top = origin.y
  let right = origin.x + origin.width
  let bottom = origin.y + origin.height
  if (handle.includes('w')) left = Math.min(pointer.x, right - MIN_OBJECT_SIZE)
  if (handle.includes('e')) right = Math.max(pointer.x, left + MIN_OBJECT_SIZE)
  if (handle.includes('n')) top = Math.min(pointer.y, bottom - MIN_OBJECT_SIZE)
  if (handle.includes('s')) bottom = Math.max(pointer.y, top + MIN_OBJECT_SIZE)

  const isCorner = handle.length === 2
  if (proportional && isCorner && origin.width > 0 && origin.height > 0) {
    const scale = Math.max(
      (right - left) / origin.width,
      (bottom - top) / origin.height,
      MIN_OBJECT_SIZE / Math.max(origin.width, origin.height),
    )
    const width = origin.width * scale
    const height = origin.height * scale
    if (handle.includes('w')) left = right - width
    else right = left + width
    if (handle.includes('n')) top = bottom - height
    else bottom = top + height
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Affinely map a box from one reference frame to another. */
export function mapBounds(bounds: Bounds, from: Bounds, to: Bounds): Bounds {
  const sx = from.width > 0 ? to.width / from.width : 1
  const sy = from.height > 0 ? to.height / from.height : 1
  return {
    x: to.x + (bounds.x - from.x) * sx,
    y: to.y + (bounds.y - from.y) * sy,
    width: Math.max(MIN_OBJECT_SIZE, bounds.width * sx),
    height: Math.max(MIN_OBJECT_SIZE, bounds.height * sy),
  }
}

/**
 * Scale an object so that its bounds move from the `from` frame to the `to` frame.
 * Local geometry (ink points, shape nodes, arrow endpoints) is scaled with it.
 */
export function scaleObjectBetweenFrames(object: WorldObject, from: Bounds, to: Bounds): WorldObject {
  const bounds = mapBounds(object.bounds, from, to)
  const sx = object.bounds.width > 0 ? bounds.width / object.bounds.width : 1
  const sy = object.bounds.height > 0 ? bounds.height / object.bounds.height : 1
  const scalePoint = (point: Point): Point => ({ x: point.x * sx, y: point.y * sy })
  switch (object.kind) {
    case 'ink':
      return {
        ...object,
        bounds,
        points: object.points.map(scalePoint),
        strokes: object.strokes?.map((stroke) => ({ points: stroke.points.map(scalePoint) })),
      }
    case 'shape':
      return { ...object, bounds, points: object.points?.map(scalePoint) }
    case 'arrow':
      return { ...object, bounds, from: scalePoint(object.from), to: scalePoint(object.to) }
    default:
      return { ...object, bounds }
  }
}

/** Resize every target so the union frame becomes `to`. A rotated single object resizes in its own frame. */
export function buildResizeObjects(objects: WorldObject[], from: Bounds, to: Bounds): WorldObject[] {
  if (objects.length === 1 && objects[0].rotation) {
    const object = objects[0]
    const resized = scaleObjectBetweenFrames(object, from, to)
    const worldCenter = rotatePoint(boundsCenter(resized.bounds), boundsCenter(object.bounds), object.rotation)
    return [{
      ...resized,
      bounds: {
        ...resized.bounds,
        x: worldCenter.x - resized.bounds.width / 2,
        y: worldCenter.y - resized.bounds.height / 2,
      },
    } as WorldObject]
  }
  return objects.map((object) => scaleObjectBetweenFrames(object, from, to))
}

/** Rotate every target by `delta` degrees about `center`, orbiting their centres. */
export function buildRotateObjects(objects: WorldObject[], center: Point, delta: number, snap?: number): WorldObject[] {
  return objects.map((object) => {
    let rotation = object.rotation + delta
    if (snap) rotation = Math.round(rotation / snap) * snap
    const applied = rotation - object.rotation
    const objectCenter = rotatePoint(boundsCenter(object.bounds), center, objects.length === 1 ? 0 : applied)
    return {
      ...object,
      rotation,
      bounds: {
        ...object.bounds,
        x: objectCenter.x - object.bounds.width / 2,
        y: objectCenter.y - object.bounds.height / 2,
      },
    } as WorldObject
  })
}

/**
 * Fit an object's bounds around a set of local points with padding, translating
 * the points so they stay inside. Rotation is preserved about the visual position.
 */
export function refitObjectToLocalPoints(object: WorldObject, points: Point[], padding: number): { bounds: Bounds; points: Point[] } {
  if (points.length === 0) return { bounds: object.bounds, points }
  const minX = Math.min(...points.map((point) => point.x)) - padding
  const minY = Math.min(...points.map((point) => point.y)) - padding
  const maxX = Math.max(...points.map((point) => point.x)) + padding
  const maxY = Math.max(...points.map((point) => point.y)) + padding
  const width = Math.max(MIN_OBJECT_SIZE, maxX - minX)
  const height = Math.max(MIN_OBJECT_SIZE, maxY - minY)
  const localCenter = { x: object.bounds.x + minX + width / 2, y: object.bounds.y + minY + height / 2 }
  const worldCenter = rotatePoint(localCenter, boundsCenter(object.bounds), object.rotation)
  return {
    bounds: { x: worldCenter.x - width / 2, y: worldCenter.y - height / 2, width, height },
    points: points.map((point) => ({ x: point.x - minX, y: point.y - minY })),
  }
}

/** Points of an object that expose draggable nodes, in local coordinates. */
export function editableNodes(object: WorldObject): Point[] {
  if (object.kind === 'arrow') return [object.from, object.to]
  if (object.kind === 'shape' && (object.shape === 'polygon' || object.shape === 'freeform')) return object.points ?? []
  return []
}

/** Apply edited local nodes back to the object; `refit` also re-fits the bounds around them. */
export function withEditedNodes(object: WorldObject, nodes: Point[], refit: boolean): WorldObject {
  if (object.kind === 'arrow') {
    const [from, to] = nodes
    if (!refit) return { ...object, from, to }
    const fitted = refitObjectToLocalPoints(object, [from, to], 8)
    return { ...object, bounds: fitted.bounds, from: fitted.points[0], to: fitted.points[1] }
  }
  if (object.kind === 'shape') {
    if (!refit) return { ...object, points: nodes }
    const fitted = refitObjectToLocalPoints(object, nodes, 6)
    return { ...object, bounds: fitted.bounds, points: fitted.points }
  }
  return object
}
