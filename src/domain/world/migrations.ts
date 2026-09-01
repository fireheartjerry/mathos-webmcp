import type { WorldState } from './types'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => Boolean(
  value && typeof value === 'object' && !Array.isArray(value),
)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isViewport = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.zoom)

const isWorldShape = (value: UnknownRecord, version: 1 | 2): boolean => (
  value.version === version
  && typeof value.title === 'string'
  && isRecord(value.objects)
  && Array.isArray(value.order)
  && Array.isArray(value.selection)
  && isViewport(value.viewport)
  && Array.isArray(value.history)
  && Array.isArray(value.future)
  && Array.isArray(value.activity)
  && isRecord(value.session)
  && 'reconstruction' in value
  && (version === 1 || (isRecord(value.entities) && isRecord(value.bindings) && isRecord(value.timelines)))
)

/** Clone and normalize persisted v1/v2 world data without writing to storage. */
export function migrateWorld(value: unknown): WorldState | null {
  if (!isRecord(value)) return null

  if (isWorldShape(value, 2)) {
    return structuredClone(value) as unknown as WorldState
  }

  if (isWorldShape(value, 1)) {
    return {
      ...structuredClone(value),
      version: 2,
      entities: {},
      bindings: {},
      timelines: {},
    } as WorldState
  }

  return null
}
