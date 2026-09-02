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

// ---------------------------------------------------------------------------
// Editing operations and the eigen-structure the 2×2 plane draws.
// ---------------------------------------------------------------------------

export const roundMatrix = (values: MatrixValues, digits = 3): MatrixValues =>
  values.map((row) => row.map((value) => Number(value.toFixed(digits))))

export const scaleMatrix = (values: MatrixValues, k: number): MatrixValues =>
  roundMatrix(values.map((row) => row.map((value) => value * k)))

/** Counter-clockwise rotation by `degrees` as a 2×2 matrix. */
export const rotationMatrix = (degrees: number): MatrixValues => {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [[cos, -sin], [sin, cos]]
}

/** R(θ)·A: rotates the image of a 2×2 map by θ degrees. */
export const rotateMatrix2x2 = (values: MatrixValues, degrees: number): MatrixValues =>
  roundMatrix(multiplyMatrices(rotationMatrix(degrees), values))

/** Whether a·b is defined, without throwing. */
export const canMultiply = (a: MatrixValues, b: MatrixValues): boolean =>
  matrixDimensions(a).columns === matrixDimensions(b).rows && matrixDimensions(b).columns > 0

/**
 * Real eigenpairs of a 2×2 matrix, larger eigenvalue first, each with a unit
 * eigenvector; null when the eigenvalues are complex or the matrix is not 2×2.
 */
export const eigenpairs2x2 = (values: MatrixValues): Array<{ value: number; vector: Point }> | null => {
  const eigenvalues = eigenvalues2x2(values)
  if (!eigenvalues) return null
  const [a, b] = values[0]
  const [c, d] = values[1]
  return eigenvalues.map((value, index) => {
    let vector: Point
    if (Math.abs(b) > 1e-9) vector = { x: b, y: value - a }
    else if (Math.abs(c) > 1e-9) vector = { x: value - d, y: c }
    // Diagonal: the axes are the eigenvectors, the larger entry's axis first.
    else vector = (index === 0) === (a >= d) ? { x: 1, y: 0 } : { x: 0, y: 1 }
    const length = Math.hypot(vector.x, vector.y) || 1
    return { value, vector: { x: vector.x / length, y: vector.y / length } }
  })
}
