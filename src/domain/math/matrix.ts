import type { MatrixObject, Point, WorldState } from '../world/types'

export const applyMatrix = (
  matrix: [[number, number], [number, number]],
  point: Point,
): Point => ({
  x: matrix[0][0] * point.x + matrix[0][1] * point.y,
  y: matrix[1][0] * point.x + matrix[1][1] * point.y,
})

export const transformVectors = (object: MatrixObject, world: WorldState) => object.sourceIds.flatMap((id) => {
  const source = world.objects[id]
  if (source?.kind !== 'arrow') return []
  const vector = { x: source.to.x - source.from.x, y: source.to.y - source.from.y }
  return [{ id, source: vector, transformed: applyMatrix(object.values, vector) }]
})
