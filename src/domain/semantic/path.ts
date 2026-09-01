import type { EquationObject, GraphObject, MatrixObject, WorldObject } from '../world/types'
import type { SemanticEntity } from './types'

/** A narrow scalar value that can travel through a semantic binding. */
export type SemanticPathValue = number | string

export type SemanticEntityPath =
  { kind: 'value' } | { kind: 'latex' } | { kind: 'parameter'; name: string } | { kind: 'matrix-cell'; row: number; column: number }

export type SemanticTargetPath = { kind: 'latex' } | { kind: 'parameter'; name: string } | { kind: 'matrix-cell'; row: number; column: number } | { kind: 'point-coordinate'; coordinate: 'x' | 'y' }

/**
 * A point target is intentionally not part of WorldObject yet. GeometryObject
 * stores many primitives and its `at.x`/`at.y` path has no primitive ID, so a
 * binding to a GeometryObject is rejected rather than guessing a point. This
 * exact shape is accepted by the path helpers for a future native point view.
 */
export type ExactPointTarget = {
  id: string
  kind: 'point'
  at: { x: number; y: number }
}

export class SemanticPathError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SemanticPathError'
  }
}

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])
const IDENTIFIER_SEGMENT = /^[^.[\]\\/\s]+$/
const INDEX_SEGMENT = /^(?:0|[1-9][0-9]*)$/

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

const pathError = (path: unknown, detail: string): SemanticPathError => new SemanticPathError(`Unsupported semantic path ${String(path)}: ${detail}`)

function assertPathString(path: unknown): asserts path is string {
  if (typeof path !== 'string' || path.length === 0) throw pathError(path, 'a non-empty path is required.')
  const segments = path.split('.')
  if (segments.some((segment) => segment.length === 0)) throw pathError(path, 'empty path segments are not allowed.')
  if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
    throw pathError(path, 'prototype paths are not allowed.')
  }
}

function parseName(path: string, container: string, position: number): string {
  const parts = path.split('.')
  const name = parts[position]
  if (parts[0] !== container || parts.length !== position + 1 || !name || !IDENTIFIER_SEGMENT.test(name)) {
    throw pathError(path, `${container}.<name> must contain exactly one safe name.`)
  }
  if (FORBIDDEN_SEGMENTS.has(name)) throw pathError(path, 'prototype names are not allowed.')
  return name
}

function parseIndex(path: string, segment: string, label: string): number {
  if (!INDEX_SEGMENT.test(segment)) throw pathError(path, `${label} must be a non-negative integer index.`)
  const index = Number(segment)
  if (!Number.isSafeInteger(index)) throw pathError(path, `${label} is outside the safe integer range.`)
  return index
}

/** Parse one of the explicitly supported canonical entity paths. */
export function parseSemanticEntityPath(path: string): SemanticEntityPath {
  assertPathString(path)
  if (path === 'value') return { kind: 'value' }
  if (path === 'latex') return { kind: 'latex' }

  const parameterParts = path.split('.')
  if (parameterParts[0] === 'parameters') {
    if (parameterParts.length !== 2) throw pathError(path, 'only parameters.<name> is supported.')
    return { kind: 'parameter', name: parseName(path, 'parameters', 1) }
  }

  const valueParts = path.split('.')
  if (valueParts[0] === 'values') {
    if (valueParts.length === 3) {
      return {
        kind: 'matrix-cell',
        row: parseIndex(path, valueParts[1], 'matrix row'),
        column: parseIndex(path, valueParts[2], 'matrix column')
      }
    }
    throw pathError(path, 'only values.<row>.<column> is supported for matrices.')
  }

  throw pathError(path, 'only value, latex, parameters.<name>, and values cell paths are supported.')
}

/** Parse one of the explicitly supported visible-target paths. */
export function parseSemanticTargetPath(path: string): SemanticTargetPath {
  assertPathString(path)
  if (path === 'latex') return { kind: 'latex' }
  if (path === 'at.x' || path === 'at.y') {
    return { kind: 'point-coordinate', coordinate: path.slice(3) as 'x' | 'y' }
  }

  const parameterParts = path.split('.')
  if (parameterParts[0] === 'parameters') {
    if (parameterParts.length !== 2) throw pathError(path, 'only parameters.<name> is supported.')
    return { kind: 'parameter', name: parseName(path, 'parameters', 1) }
  }

  const valueParts = path.split('.')
  if (valueParts[0] === 'values') {
    if (valueParts.length !== 3) throw pathError(path, 'only values.<row>.<column> is supported for matrix views.')
    return {
      kind: 'matrix-cell',
      row: parseIndex(path, valueParts[1], 'matrix row'),
      column: parseIndex(path, valueParts[2], 'matrix column')
    }
  }

  throw pathError(path, 'only latex, parameters.<name>, values.<row>.<column>, and exact at.x/at.y point paths are supported.')
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw pathError(path, 'writes must be finite numbers.')
  }
  return value
}

function entityShapeError(entity: SemanticEntity, detail: string): SemanticPathError {
  return new SemanticPathError(`Entity ${entity.id} (${entity.kind}) is malformed: ${detail}`)
}

/** Validate the serializable shape and numerical leaves of one entity. */
export function validateSemanticEntity(entity: unknown): string | null {
  if (!isRecord(entity)) return 'Semantic entity must be an object.'
  if (typeof entity.id !== 'string' || entity.id.length === 0) return 'Semantic entity needs a non-empty id.'
  if (typeof entity.kind !== 'string') return `Entity ${entity.id} needs a kind.`

  const rejectUnsafeRecordKeys = (record: Record<string, unknown>, label: string): string | null => {
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_SEGMENTS.has(key)) return `Entity ${entity.id} contains a forbidden ${label} name.`
    }
    return null
  }
  const finiteRecord = (record: unknown, label: string): string | null => {
    if (!isRecord(record)) return `Entity ${entity.id} ${label} must be a record.`
    const unsafe = rejectUnsafeRecordKeys(record, label)
    if (unsafe) return unsafe
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `Entity ${entity.id} ${label}.${key} must be finite.`
      }
    }
    return null
  }
  const finiteArrayRecord = (record: unknown, label: string): string | null => {
    if (!isRecord(record)) return `Entity ${entity.id} ${label} must be a record.`
    for (const [key, value] of Object.entries(record)) {
      if (FORBIDDEN_SEGMENTS.has(key) || !IDENTIFIER_SEGMENT.test(key)) {
        return `Entity ${entity.id} contains an unsafe ${label} name.`
      }
      if (!Array.isArray(value)) return `Entity ${entity.id} ${label}.${key} must be an array.`
      for (let index = 0; index < value.length; index += 1) {
        if (!hasOwn(value, String(index)) || typeof value[index] !== 'number' || !Number.isFinite(value[index])) {
          return `Entity ${entity.id} ${label}.${key} must contain finite numbers.`
        }
      }
    }
    return null
  }

  switch (entity.kind) {
    case 'expression':
      if (typeof entity.latex !== 'string') return `Entity ${entity.id} latex must be a string.`
      return finiteRecord(entity.parameters, 'parameters')
    case 'scalar':
      return typeof entity.name === 'string' && typeof entity.value === 'number' && Number.isFinite(entity.value) ? null : `Entity ${entity.id} scalar needs a name and finite value.`
    case 'vector':
      if (typeof entity.name !== 'string' || !Array.isArray(entity.values)) return `Entity ${entity.id} vector is malformed.`
      for (let index = 0; index < entity.values.length; index += 1) {
        if (!hasOwn(entity.values, String(index)) || typeof entity.values[index] !== 'number' || !Number.isFinite(entity.values[index])) return `Entity ${entity.id} vector values must be finite.`
      }
      return null
    case 'matrix':
      if (typeof entity.name !== 'string' || !Array.isArray(entity.values)) return `Entity ${entity.id} matrix is malformed.`
      for (let rowIndex = 0; rowIndex < entity.values.length; rowIndex += 1) {
        const row = entity.values[rowIndex]
        if (!hasOwn(entity.values, String(rowIndex)) || !Array.isArray(row)) return `Entity ${entity.id} matrix values must be finite rows.`
        for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
          if (!hasOwn(row, String(columnIndex)) || typeof row[columnIndex] !== 'number' || !Number.isFinite(row[columnIndex])) return `Entity ${entity.id} matrix values must be finite rows.`
        }
      }
      return null
    case 'data':
      return finiteArrayRecord(entity.columns, 'columns')
    default:
      return `Entity ${entity.id} has unsupported kind ${String(entity.kind)}.`
  }
}

function assertEntityPathShape(entity: SemanticEntity, parsed: SemanticEntityPath, path: string): void {
  if (parsed.kind === 'value' && entity.kind !== 'scalar') {
    throw pathError(path, 'value is only supported by scalar entities.')
  }
  if (parsed.kind === 'latex' && entity.kind !== 'expression') {
    throw pathError(path, 'latex is only supported by expression entities.')
  }
  if (parsed.kind === 'parameter' && entity.kind !== 'expression') {
    throw pathError(path, 'parameters.<name> is only supported by expression entities.')
  }
  if (parsed.kind === 'matrix-cell' && entity.kind !== 'matrix') {
    throw pathError(path, 'values.<row>.<column> is only supported by matrix entities.')
  }
}

/** Read one supported scalar/string value from a semantic entity. */
export function readSemanticPath(entity: SemanticEntity, path: string): SemanticPathValue {
  const parsed = parseSemanticEntityPath(path)
  assertEntityPathShape(entity, parsed, path)

  if (parsed.kind === 'value') {
    const scalar = entity as Extract<SemanticEntity, { kind: 'scalar' }>
    return finiteNumber(scalar.value, path)
  }
  if (parsed.kind === 'latex') {
    const expression = entity as Extract<SemanticEntity, { kind: 'expression' }>
    if (typeof expression.latex !== 'string') throw entityShapeError(entity, 'latex must be a string.')
    return expression.latex
  }
  if (parsed.kind === 'parameter') {
    const expression = entity as Extract<SemanticEntity, { kind: 'expression' }>
    if (!isRecord(expression.parameters) || !hasOwn(expression.parameters, parsed.name)) {
      throw pathError(path, `parameter ${parsed.name} does not exist.`)
    }
    return finiteNumber(expression.parameters[parsed.name], path)
  }
  const matrix = entity as Extract<SemanticEntity, { kind: 'matrix' }>
  if (parsed.row >= matrix.values.length || !Array.isArray(matrix.values[parsed.row])) {
    throw pathError(path, `matrix row ${parsed.row} is out of range.`)
  }
  const row = matrix.values[parsed.row]
  if (parsed.column >= row.length || !hasOwn(row, String(parsed.column))) {
    throw pathError(path, `matrix column ${parsed.column} is out of range.`)
  }
  return finiteNumber(row[parsed.column], path)
}

/** Return a cloned entity with one supported path updated. */
export function writeSemanticPath(entity: SemanticEntity, path: string, value: unknown): SemanticEntity {
  const parsed = parseSemanticEntityPath(path)
  assertEntityPathShape(entity, parsed, path)
  const next = structuredClone(entity)

  if (parsed.kind === 'value') {
    ;(next as Extract<SemanticEntity, { kind: 'scalar' }>).value = finiteNumber(value, path)
    return next
  }
  if (parsed.kind === 'latex') {
    if (typeof value !== 'string') throw pathError(path, 'writes to latex must be strings.')
    ;(next as Extract<SemanticEntity, { kind: 'expression' }>).latex = value
    return next
  }
  if (parsed.kind === 'parameter') {
    const expression = next as Extract<SemanticEntity, { kind: 'expression' }>
    if (!isRecord(expression.parameters)) throw entityShapeError(entity, 'parameters must be a record.')
    expression.parameters[parsed.name] = finiteNumber(value, path)
    return expression
  }
  const matrix = next as Extract<SemanticEntity, { kind: 'matrix' }>
  if (parsed.row >= matrix.values.length || !Array.isArray(matrix.values[parsed.row])) {
    throw pathError(path, `matrix row ${parsed.row} is out of range.`)
  }
  if (parsed.column >= matrix.values[parsed.row].length || !hasOwn(matrix.values[parsed.row], String(parsed.column))) {
    throw pathError(path, `matrix column ${parsed.column} is out of range.`)
  }
  matrix.values[parsed.row][parsed.column] = finiteNumber(value, path)
  return matrix
}

function isEquationObject(object: WorldObject | ExactPointTarget): object is EquationObject {
  return object.kind === 'equation'
}

function isGraphObject(object: WorldObject | ExactPointTarget): object is GraphObject {
  return object.kind === 'graph'
}

function isMatrixObject(object: WorldObject | ExactPointTarget): object is MatrixObject {
  return object.kind === 'matrix'
}

function isExactPointTarget(object: WorldObject | ExactPointTarget): object is ExactPointTarget {
  if ((object as { kind?: unknown }).kind !== 'point') return false
  const candidate = object as ExactPointTarget
  return isRecord(candidate.at) && typeof candidate.at.x === 'number' && Number.isFinite(candidate.at.x) && typeof candidate.at.y === 'number' && Number.isFinite(candidate.at.y)
}

function targetPathError(object: WorldObject | ExactPointTarget, path: string, detail: string): SemanticPathError {
  return new SemanticPathError(`Target ${object.id} (${object.kind}) cannot use ${path}: ${detail}`)
}

function assertTargetPathShape(object: WorldObject | ExactPointTarget, parsed: SemanticTargetPath, path: string): void {
  if (parsed.kind === 'latex' && !isEquationObject(object)) {
    throw targetPathError(object, path, 'latex is only supported by equation objects.')
  }
  if (parsed.kind === 'parameter' && !isGraphObject(object)) {
    throw targetPathError(object, path, 'parameters.<name> is only supported by graph objects.')
  }
  if (parsed.kind === 'matrix-cell' && !isMatrixObject(object)) {
    throw targetPathError(object, path, 'values.<row>.<column> is only supported by matrix objects.')
  }
  if (parsed.kind === 'point-coordinate' && !isExactPointTarget(object)) {
    throw targetPathError(object, path, 'an exact point target is required; GeometryObject primitives need a primitive ID and are intentionally unsupported.')
  }
}

/** Read one supported value from a visible object target. */
export function readSemanticTargetPath(object: WorldObject | ExactPointTarget, path: string): SemanticPathValue | undefined {
  const parsed = parseSemanticTargetPath(path)
  assertTargetPathShape(object, parsed, path)
  if (parsed.kind === 'latex') {
    return (object as EquationObject).latex
  }
  if (parsed.kind === 'parameter') {
    const graph = object as GraphObject
    if (!graph.parameters || !hasOwn(graph.parameters, parsed.name)) return undefined
    return finiteNumber(graph.parameters[parsed.name], path)
  }
  if (parsed.kind === 'matrix-cell') {
    const matrix = object as MatrixObject
    if (parsed.row >= matrix.values.length || !Array.isArray(matrix.values[parsed.row])) {
      throw targetPathError(object, path, `matrix row ${parsed.row} is out of range.`)
    }
    const row = matrix.values[parsed.row]
    if (parsed.column >= row.length || !hasOwn(row, String(parsed.column))) {
      throw targetPathError(object, path, `matrix column ${parsed.column} is out of range.`)
    }
    return finiteNumber(row[parsed.column], path)
  }
  return finiteNumber((object as ExactPointTarget).at[parsed.coordinate], path)
}

/** Return a cloned visible object with one supported target path updated. */
export function writeSemanticTargetPath(object: WorldObject | ExactPointTarget, path: string, value: unknown): WorldObject | ExactPointTarget {
  const parsed = parseSemanticTargetPath(path)
  assertTargetPathShape(object, parsed, path)
  const next = structuredClone(object)

  if (parsed.kind === 'latex') {
    if (typeof value !== 'string') throw targetPathError(object, path, 'writes to latex must be strings.')
    ;(next as EquationObject).latex = value
    return next
  }
  if (parsed.kind === 'parameter') {
    const graph = next as GraphObject
    if (graph.parameters !== undefined && !isRecord(graph.parameters)) {
      throw targetPathError(object, path, 'parameters must be a record.')
    }
    graph.parameters = {
      ...(graph.parameters ?? {}),
      [parsed.name]: finiteNumber(value, path)
    }
    return graph
  }
  if (parsed.kind === 'matrix-cell') {
    const matrix = next as MatrixObject
    if (parsed.row >= matrix.values.length || !Array.isArray(matrix.values[parsed.row])) {
      throw targetPathError(object, path, `matrix row ${parsed.row} is out of range.`)
    }
    if (parsed.column >= matrix.values[parsed.row].length || !hasOwn(matrix.values[parsed.row], String(parsed.column))) {
      throw targetPathError(object, path, `matrix column ${parsed.column} is out of range.`)
    }
    matrix.values[parsed.row][parsed.column] = finiteNumber(value, path)
    return matrix
  }
  ;(next as ExactPointTarget).at[parsed.coordinate] = finiteNumber(value, path)
  return next
}

/** Alias names kept short for callers that treat entity/target paths uniformly. */
export const readEntityPath = readSemanticPath
export const writeEntityPath = writeSemanticPath
export const readTargetPath = readSemanticTargetPath
export const writeTargetPath = writeSemanticTargetPath
