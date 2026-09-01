/**
 * Small, dependency-free probability helpers used by the Gamma scene.
 *
 * These functions intentionally operate on plain numbers so their results can
 * be copied into a serializable world object and replayed by WebMCP.
 */

const LANCZOS_G = 7
const LANCZOS_COEFFICIENTS = [
  0.9999999999998099,
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
]

const TWO_PI = 2 * Math.PI

const finiteOr = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback

/** Natural logarithm of Gamma(z), for positive z. */
export function logGamma(z: number): number {
  if (!(z > 0) || !Number.isFinite(z)) return Number.NaN

  // Reflection keeps the Lanczos approximation well behaved near zero.
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)

  const shifted = z - 1
  let sum = LANCZOS_COEFFICIENTS[0]
  for (let index = 1; index < LANCZOS_COEFFICIENTS.length; index += 1) {
    sum += LANCZOS_COEFFICIENTS[index] / (shifted + index)
  }
  const t = shifted + LANCZOS_G + 0.5
  return 0.5 * Math.log(TWO_PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum)
}

/** Positive Gamma function evaluation. */
export function gammaFunction(shape: number): number {
  const logValue = logGamma(shape)
  if (!Number.isFinite(logValue)) return Number.NaN
  if (logValue > Math.log(Number.MAX_VALUE)) return Number.POSITIVE_INFINITY
  return Math.exp(logValue)
}

// Common names make the math kernel pleasant to use from scene renderers.
export const gamma = gammaFunction

/**
 * Normalized Gamma(shape, rate) density. At x=0 we return the finite
 * boundary value for shape >= 1 and zero for shape < 1; numerical CDF uses a
 * change of variables for the latter so the integrable singularity is still
 * handled accurately.
 */
export function gammaDensity(x: number, shape: number, rate = 1): number {
  if (!(shape > 0) || !(rate > 0) || x < 0 || !Number.isFinite(shape) || !Number.isFinite(rate)) return 0
  if (x === 0) {
    if (shape === 1) return rate
    if (shape > 1) return 0
    return 0
  }
  const logDensity = shape * Math.log(rate) + (shape - 1) * Math.log(x) - rate * x - logGamma(shape)
  if (logDensity < -745) return 0
  if (logDensity > Math.log(Number.MAX_VALUE)) return Number.MAX_VALUE
  return Math.exp(logDensity)
}

/** Composite Simpson integration. The interval is always split into an even number of steps. */
export function simpsonIntegrate(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  steps = 256,
): number {
  if (!(upper > lower) || !Number.isFinite(lower) || !Number.isFinite(upper)) return 0
  let count = Math.max(2, Math.floor(steps))
  if (count % 2 !== 0) count += 1
  const width = (upper - lower) / count
  let total = finiteOr(fn(lower), 0) + finiteOr(fn(upper), 0)
  for (let index = 1; index < count; index += 1) {
    const value = finiteOr(fn(lower + index * width), 0)
    total += (index % 2 === 0 ? 2 : 4) * value
  }
  return (width / 3) * total
}

/** A practical finite cutoff for the Gamma tail used by the visual demo. */
export function gammaIntegrationLimit(shape: number, rate = 1): number {
  const safeShape = Math.max(0.05, finiteOr(shape, 1))
  const safeRate = Math.max(0.0001, finiteOr(rate, 1))
  return (safeShape + 14 * Math.sqrt(safeShape) + 12) / safeRate
}

/** Integral of the normalized Gamma density over a finite interval. */
export function gammaIntegral(
  shape: number,
  lower: number,
  upper: number,
  rate = 1,
  steps = 256,
): number {
  const start = Math.max(0, lower)
  const end = Math.max(start, upper)
  if (!(end > start)) return 0
  return simpsonIntegrate((x) => gammaDensity(x, shape, rate), start, end, steps)
}

/**
 * Numerically integrated CDF. For 0 < shape < 1, x=t^p removes the endpoint
 * singularity before Simpson integration, which keeps the helper useful for
 * more than the default shape 9/2 scene.
 */
export function gammaCDF(x: number, shape: number, rate = 1, steps = 256): number {
  if (!(shape > 0) || !(rate > 0) || !(x > 0)) return 0
  const limit = gammaIntegrationLimit(shape, rate)
  if (x >= limit) return 1

  const integral = shape < 1
    ? simpsonIntegrate((t) => {
      const power = 2 / shape
      const transformed = x * Math.pow(t, power)
      return gammaDensity(transformed, shape, rate) * x * power * Math.pow(t, power - 1)
    }, 0, 1, steps)
    : gammaIntegral(shape, 0, x, rate, steps)
  return Math.min(1, Math.max(0, finiteOr(integral, 0)))
}

/** Alias that reads naturally in the graph renderer. */
export const gammaCdf = gammaCDF

export type GammaBinEdges = readonly [number, number, number, number]

const defaultEdges = (shape: number, rate: number): GammaBinEdges => {
  const mean = Math.max(0.25, shape / rate)
  return [0, mean * 0.7, mean * 1.35, Number.POSITIVE_INFINITY]
}

/**
 * Return exactly three normalized bin masses. `edges` may be four endpoints
 * (`[0, b1, b2, Infinity]`) or two internal cuts (`[b1, b2]`). The final bin
 * is computed as a complement so the displayed sum is exactly one.
 */
export function gammaBinMasses(
  shape: number,
  edges?: readonly number[],
  rate = 1,
  steps = 256,
): [number, number, number] {
  const requested = edges && edges.length >= 2 ? edges : defaultEdges(shape, rate)
  const firstCut = edges && edges.length >= 4 ? requested[1] : requested[0]
  const secondCut = edges && edges.length >= 4 ? requested[2] : requested[1]
  const left = Math.max(0, finiteOr(firstCut, 0))
  const middle = Math.max(left, finiteOr(secondCut, left))
  const first = gammaCDF(left, shape, rate, steps)
  const second = Math.max(0, gammaCDF(middle, shape, rate, steps) - first)
  const final = Math.max(0, 1 - first - second)
  const total = first + second + final
  if (!(total > 0)) return [1 / 3, 1 / 3, 1 / 3]
  return [first / total, second / total, final / total]
}

export const threeBinMasses = gammaBinMasses

/** Natural-log masses, guarded against log(0) so softmax remains finite. */
export function logMasses(masses: readonly number[]): number[] {
  return masses.map((mass) => Math.log(Math.max(Number.MIN_VALUE, finiteOr(mass, 0))))
}

/** Numerically stable softmax (including the all-nonfinite fallback). */
export function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) return []
  const finiteLogits = logits.map((value) => finiteOr(value, Number.NEGATIVE_INFINITY))
  const maximum = Math.max(...finiteLogits)
  if (!Number.isFinite(maximum)) return logits.map(() => 1 / logits.length)
  const exponentials = finiteLogits.map((value) => value === Number.NEGATIVE_INFINITY ? 0 : Math.exp(value - maximum))
  const normalizer = exponentials.reduce((sum, value) => sum + value, 0)
  if (!(normalizer > 0)) return logits.map(() => 1 / logits.length)
  return exponentials.map((value) => value / normalizer)
}

/** Explicit bridge used by the Gamma → attention scene. */
export function massesToSoftmax(masses: readonly number[]): { masses: number[]; logs: number[]; probabilities: number[] } {
  const normalized = masses.map((value) => Math.max(0, finiteOr(value, 0)))
  const total = normalized.reduce((sum, value) => sum + value, 0)
  const safe = total > 0 ? normalized.map((value) => value / total) : normalized.map(() => 1 / normalized.length)
  const logs = logMasses(safe)
  return { masses: safe, logs, probabilities: softmax(logs) }
}

