import type { MatrixObject, Point, WorldState } from '../world/types'

export const MATRIX_MIN_SIZE = 1
export const MATRIX_MAX_SIZE = 4

export type MatrixValues = number[][]

/** Rows × columns of a rectangular matrix. An empty matrix reports 0 × 0. */
export const matrixDimensions = (values: MatrixValues): { rows: number; columns: number } => ({
  rows: values.length,
  columns: values[0]?.length ?? 0,
})

export const isSquare = (values: MatrixValues): boolean => {
  const { rows, columns } = matrixDimensions(values)
  return rows > 0 && rows === columns
}

export const identity = (rows: number, columns: number = rows): MatrixValues => Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (row === column ? 1 : 0)))

export const transpose = (values: MatrixValues): MatrixValues => {
  const { rows, columns } = matrixDimensions(values)
  return Array.from({ length: columns }, (_, column) => Array.from({ length: rows }, (_, row) => values[row][column]))
}

export const cloneMatrix = (values: MatrixValues): MatrixValues => values.map((row) => [...row])

/** Standard product a·b; throws when the inner dimensions disagree. */
export const multiplyMatrices = (a: MatrixValues, b: MatrixValues): MatrixValues => {
  const left = matrixDimensions(a)
  const right = matrixDimensions(b)
  if (left.columns !== right.rows) throw new Error(`Cannot multiply a ${left.rows}×${left.columns} matrix by a ${right.rows}×${right.columns} matrix`)
  return Array.from({ length: left.rows }, (_, row) => Array.from({ length: right.columns }, (_, column) => {
    let sum = 0
    for (let k = 0; k < left.columns; k += 1) sum += a[row][k] * b[k][column]
    return sum
  }))
}

const minor = (values: MatrixValues, skipRow: number, skipColumn: number): MatrixValues => values
  .filter((_, row) => row !== skipRow)
  .map((row) => row.filter((_, column) => column !== skipColumn))

/** Determinant by Laplace expansion along the first row; square matrices only (1×1 … 4×4). */
export const determinant = (values: MatrixValues): number => {
  const { rows, columns } = matrixDimensions(values)
  if (rows !== columns) throw new Error(`Determinant needs a square matrix, got ${rows}×${columns}`)
  if (rows === 1) return values[0][0]
  if (rows === 2) return values[0][0] * values[1][1] - values[0][1] * values[1][0]
  let total = 0
  for (let column = 0; column < columns; column += 1) {
    const sign = column % 2 === 0 ? 1 : -1
    total += sign * values[0][column] * determinant(minor(values, 0, column))
  }
  return total
}

export const trace = (values: MatrixValues): number => {
  const { rows, columns } = matrixDimensions(values)
  if (rows !== columns) throw new Error(`Trace needs a square matrix, got ${rows}×${columns}`)
  let total = 0
  for (let index = 0; index < rows; index += 1) total += values[index][index]
  return total
}

/** Real eigenvalues of a 2×2 matrix (larger first), or null when they are complex or the matrix is not 2×2. */
export const eigenvalues2x2 = (values: MatrixValues): [number, number] | null => {
  const { rows, columns } = matrixDimensions(values)
  if (rows !== 2 || columns !== 2) return null
  const t = trace(values)
  const d = determinant(values)
  const discriminant = t * t - 4 * d
  if (discriminant < 0) return null
  const root = Math.sqrt(discriminant)
  return [(t + root) / 2, (t - root) / 2]
}

/** Column vectors of the matrix, each as a plain number tuple. */
export const matrixColumns = (values: MatrixValues): number[][] => transpose(values)

/**
 * Apply the first two rows and columns of the matrix to a plane point.
 * For a 2×2 this is the ordinary linear map; missing entries count as zero so
 * smaller matrices still produce a point.
 */
export const applyMatrix = (matrix: MatrixValues, point: Point): Point => ({
  x: (matrix[0]?.[0] ?? 0) * point.x + (matrix[0]?.[1] ?? 0) * point.y,
  y: (matrix[1]?.[0] ?? 0) * point.x + (matrix[1]?.[1] ?? 0) * point.y,
})

export const transformVectors = (object: MatrixObject, world: WorldState) => object.sourceIds.flatMap((id) => {
  const source = world.objects[id]
  if (source?.kind !== 'arrow') return []
  const vector = { x: source.to.x - source.from.x, y: source.to.y - source.from.y }
  return [{ id, source: vector, transformed: applyMatrix(object.values, vector) }]
})
