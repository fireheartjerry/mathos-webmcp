import type { Actor, Bounds, Point, WorldObject, WorldOperation, WorldState } from './types'

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

export function buildTransformOperations(
  world: WorldState,
  ids: string[],
  transform: { translate?: Point; scale?: number; rotate?: number },
): WorldOperation[] {
  return expandTargetIds(world, ids).map((id) => {
    const object = world.objects[id]
    const translate = transform.translate ?? { x: 0, y: 0 }
    const scale = transform.scale ?? 1
    const center = {
      x: object.bounds.x + object.bounds.width / 2,
      y: object.bounds.y + object.bounds.height / 2,
    }
    return {
      type: 'put' as const,
      object: {
        ...object,
        bounds: {
          x: center.x - (object.bounds.width * scale) / 2 + translate.x,
          y: center.y - (object.bounds.height * scale) / 2 + translate.y,
          width: Math.max(12, object.bounds.width * scale),
          height: Math.max(12, object.bounds.height * scale),
        },
        rotation: object.rotation + (transform.rotate ?? 0),
      },
    }
  })
}

export function buildDuplicateOperations(
  world: WorldState,
  ids: string[],
  author: Actor,
  offset: Point = { x: 24, y: 24 },
): WorldOperation[] {
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
        y: object.bounds.y + offset.y,
      },
      ...(object.kind === 'group'
        ? { childIds: object.childIds.map((childId) => remap.get(childId) ?? childId) }
        : {}),
    } as WorldObject
    return { type: 'put' as const, object: copy }
  })
}

export function buildDeleteOperations(world: WorldState, ids: string[]): WorldOperation[] {
  return expandTargetIds(world, ids).reverse().map((id) => ({ type: 'remove', id }))
}
