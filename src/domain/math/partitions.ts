export type Partition = number[]
export type FerrersDiagram = {
  parts: Partition
  rows: string[]
  cellCount: number
}
export type ResidueValue = {
  n: number
  index: number
  value: number
  residue: number
  modulo: number
}
export type ResidueLane = {
  residue: number
  values: ResidueValue[]
}
export type RamanujanVerification = {
  cutoff: number
  verified: boolean
  checked: number[]
  counterexamples: ResidueValue[]
  lanes: ResidueLane[]
  statement: string
}

/** Coefficients of Π(1-q^m)^(-1) for m=1..maxPart, truncated at cutoff. */
export function finiteEulerProductCoefficients(maxPart: number, cutoff: number): number[] {
  const limit = Math.max(0, Math.floor(cutoff))
  const coefficients = Array.from({ length: limit + 1 }, () => 0)
  coefficients[0] = 1
  for (let part = 1; part <= Math.max(0, Math.floor(maxPart)); part += 1) {
    for (let total = part; total <= limit; total += 1) coefficients[total] += coefficients[total - part]
  }
  return coefficients
}

export const finiteEulerProduct = finiteEulerProductCoefficients

/** Convenience form used by the scene: unrestricted coefficients through N. */
export function partitionCoefficients(cutoff: number, maxPart = cutoff): number[] {
  return finiteEulerProductCoefficients(maxPart, cutoff)
}

/** Unrestricted p(n), computed by the standard coin-change form of Euler's product. */
export function partitionNumbers(cutoff: number): number[] {
  return finiteEulerProductCoefficients(cutoff, cutoff)
}

export const unrestrictedPartitionNumbers = partitionNumbers

export function partitionNumber(n: number): number {
  if (!Number.isInteger(n) || n < 0) return 0
  return partitionNumbers(n)[n] ?? 0
}

/** Enumerate partitions in non-increasing Ferrers-row order. */
export function partitionsOf(n: number, maxPart = n): Partition[] {
  if (!Number.isInteger(n) || n < 0) return []
  if (n === 0) return [[]]
  const output: Partition[] = []
  const visit = (remaining: number, cap: number, prefix: number[]) => {
    if (remaining === 0) {
      output.push(prefix)
      return
    }
    for (let part = Math.min(cap, remaining); part >= 1; part -= 1) {
      visit(remaining - part, part, [...prefix, part])
    }
  }
  visit(n, Math.max(1, Math.min(maxPart, n)), [])
  return output
}

export function ferrersDiagram(partition: readonly number[]): FerrersDiagram {
  const parts = [...partition].filter((part) => Number.isInteger(part) && part > 0).sort((a, b) => b - a)
  return {
    parts,
    rows: parts.map((length) => '▮'.repeat(length)),
    cellCount: parts.reduce((sum, length) => sum + length, 0),
  }
}

export const partitionFerrers = ferrersDiagram

export function ferrersRows(partition: readonly number[]): string[] {
  return ferrersDiagram(partition).rows
}

export function compositionToPartition(composition: readonly number[]): Partition {
  return composition.filter((part) => Number.isInteger(part) && part > 0).sort((a, b) => b - a)
}

export function partitionToComposition(partition: readonly number[]): number[] {
  return [...partition].sort((a, b) => a - b)
}

export function partitionsIntoAtMost(n: number, maxParts: number): Partition[] {
  return partitionsOf(n).filter((partition) => partition.length <= maxParts)
}

export function partitionsWithLargestPartAtMost(n: number, maxPart: number): Partition[] {
  return partitionsOf(n, maxPart)
}

export function fiveResidueLanes(cutoff: number): ResidueLane[] {
  const limit = Math.max(0, Math.floor(cutoff))
  const values = partitionNumbers(limit)
  return [0, 1, 2, 3, 4].map((residue) => ({
    residue,
    values: values
      .map((value, index) => ({
        n: Math.floor(index / 5),
        index,
        value,
        residue,
        modulo: value % 5,
      }))
      .filter((entry) => entry.index % 5 === residue),
  }))
}

export const residueLanes = fiveResidueLanes

/**
 * Finite verification of Ramanujan's p(5n+4) ≡ 0 (mod 5) congruence. This
 * deliberately reports verification only for computed values; it is not a
 * proof of the general theorem.
 */
export function verifyRamanujanFive(cutoff: number): RamanujanVerification {
  const limit = Math.max(0, Math.floor(cutoff))
  const values = partitionNumbers(limit)
  const checked: number[] = []
  const counterexamples: ResidueValue[] = []
  for (let index = 4; index <= limit; index += 5) {
    const value: ResidueValue = {
      n: (index - 4) / 5,
      index,
      value: values[index] ?? 0,
      residue: 4,
      modulo: (values[index] ?? 0) % 5,
    }
    checked.push(index)
    if (value.modulo !== 0) counterexamples.push(value)
  }
  return {
    cutoff: limit,
    verified: checked.length > 0 && counterexamples.length === 0,
    checked,
    counterexamples,
    lanes: fiveResidueLanes(limit),
    statement: 'Ramanujan: p(5n + 4) ≡ 0 (mod 5), verified here only for the displayed finite range.',
  }
}

export const verifyRamanujanCongruence = verifyRamanujanFive
export const ramanujanVerification = verifyRamanujanFive

export type RamanujanCheck = {
  n: number
  value: number
  residue: number
  applies: boolean
  modulo: number
  quotient: number
  holds: boolean
}

/**
 * Check one coefficient against p(5k + 4) ≡ 0 (mod 5). `applies` is false
 * off the n ≡ 4 lane, where the theorem says nothing; `holds` is only ever a
 * finite observation about this one value.
 */
export function ramanujanCheck(n: number, value: number): RamanujanCheck {
  const index = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0
  const residue = index % 5
  const modulo = safeValue % 5
  return {
    n: index,
    value: safeValue,
    residue,
    applies: residue === 4,
    modulo,
    quotient: Math.floor(safeValue / 5),
    holds: residue === 4 && modulo === 0,
  }
}
