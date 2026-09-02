/** A deliberately tiny, fully inspectable one-head transformer model. */

import type { Matrix2, TinyModelState, Vector2, Vector3 } from '../world/types'
import { logMasses, softmax } from './probability'

export type TinyTransformerState = TinyModelState
export type TransformerModel = TinyModelState
export type Classifier = [Vector3, Vector3]

export type TransformerForwardPass = {
  queries: [Vector2, Vector2, Vector2]
  keys: [Vector2, Vector2, Vector2]
  values: [Vector2, Vector2, Vector2]
  q: [Vector2, Vector2, Vector2]
  k: [Vector2, Vector2, Vector2]
  v: [Vector2, Vector2, Vector2]
  query: Vector2
  scores: Vector3
  attentionWeights: Vector3
  attention: Vector3
  context: Vector2
  logits: Vector3
  probabilities: Vector3
  loss: number
  targetProbability: number
}

export type TransformerGradients = {
  embeddings: [Vector2, Vector2, Vector2]
  wq: Matrix2
  wk: Matrix2
  wv: Matrix2
  classifier: Classifier
  bias: Vector3
}

export type TrainStepResult = {
  accepted: boolean
  state: TinyModelState
  nextState: TinyModelState
  model: TinyModelState
  before: TransformerForwardPass
  after: TransformerForwardPass
  lossBefore: number
  lossAfter: number
  targetProbabilityBefore: number
  targetProbabilityAfter: number
  learningRate: number
  gradientNorm: number
  changedParameter: string
  gradients: TransformerGradients
}

const cloneVector2 = (v: Vector2): Vector2 => [v[0], v[1]]
const cloneMatrix2 = (m: Matrix2): Matrix2 => [cloneVector2(m[0]), cloneVector2(m[1])]
const cloneModel = (model: TinyModelState): TinyModelState => ({
  ...model,
  tokens: [...model.tokens] as TinyModelState['tokens'],
  embeddings: model.embeddings.map(cloneVector2) as TinyModelState['embeddings'],
  wq: cloneMatrix2(model.wq),
  wk: cloneMatrix2(model.wk),
  wv: cloneMatrix2(model.wv),
  classifier: model.classifier.map((row) => [...row] as Vector3) as TinyModelState['classifier'],
  bias: [...model.bias] as Vector3,
})

const matrixVector = (matrix: Matrix2, vector: Vector2): Vector2 => [
  matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
  matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
]
const dot = (a: Vector2, b: Vector2) => a[0] * b[0] + a[1] * b[1]
const safeLog = (p: number) => Math.log(Math.max(Number.MIN_VALUE, Math.min(1, p)))

/** Convert three positive masses into the exact log-mass attention bridge. */
export const normalizeAttentionBias = (masses: readonly number[]): Vector3 => {
  const logs = masses.length === 3 ? logMasses(masses) : [0, 0, 0]
  return [logs[0], logs[1], logs[2]]
}

/** Fixed step-zero state: three tokens, two-dimensional embeddings, one head. */
export function createInitialTinyModel(_masses: readonly number[] = [0.2, 0.5, 0.3]): TinyModelState {
  return {
    tokens: ['x₀', 'x₁', 'target'],
    embeddings: [[0.85, 0.15], [0.1, 0.9], [0.55, 0.45]],
    wq: [[0.82, -0.18], [0.22, 0.74]],
    wk: [[0.68, 0.28], [-0.16, 0.76]],
    wv: [[0.64, -0.24], [0.18, 0.7]],
    // Classifier is stored as two input rows × three output columns.
    classifier: [[0.42, 0.08, -0.24], [-0.18, 0.28, 0.16]],
    bias: [0.12, 0.1, 0.08],
    queryIndex: 2,
    targetIndex: 1,
  }
}

export const createInitialTransformerState = createInitialTinyModel
export const resetTransformer = createInitialTinyModel

/**
 * Forward pass for Q/K/V, scaled dot-product attention, and a 3-way output
 * head. `bridgeMasses` is optional: when supplied, log masses are added to
 * the attention scores to make the Gamma → softmax initialization explicit.
 */
export function evaluateTinyModel(
  model: TinyModelState,
  bridgeMassesOrTemperature?: readonly number[] | number,
  requestedTemperatureOrMasses: number | readonly number[] = 1,
): TransformerForwardPass {
  const bridgeMasses = (Array.isArray(bridgeMassesOrTemperature)
    ? bridgeMassesOrTemperature
    : Array.isArray(requestedTemperatureOrMasses) ? requestedTemperatureOrMasses : undefined)
  const temperature = typeof bridgeMassesOrTemperature === 'number'
    ? bridgeMassesOrTemperature
    : typeof requestedTemperatureOrMasses === 'number' ? requestedTemperatureOrMasses : 1
  const safeTemperature = Math.max(0.05, Number.isFinite(temperature) ? temperature : 1)
  const queries = model.embeddings.map((embedding) => matrixVector(model.wq, embedding)) as [Vector2, Vector2, Vector2]
  const keys = model.embeddings.map((embedding) => matrixVector(model.wk, embedding)) as [Vector2, Vector2, Vector2]
  const values = model.embeddings.map((embedding) => matrixVector(model.wv, embedding)) as [Vector2, Vector2, Vector2]
  const query = queries[Math.max(0, Math.min(2, Math.floor(model.queryIndex)))]
  const baseScores = keys.map((key) => dot(query, key) / Math.sqrt(2)) as Vector3
  const scores = (bridgeMasses && bridgeMasses.length === 3
    ? baseScores.map((score, index) => score + normalizeAttentionBias(bridgeMasses)[index])
    : baseScores).map((score) => score / safeTemperature) as Vector3
  const attentionWeights = softmax(scores) as Vector3
  const context: Vector2 = [
    attentionWeights[0] * values[0][0] + attentionWeights[1] * values[1][0] + attentionWeights[2] * values[2][0],
    attentionWeights[0] * values[0][1] + attentionWeights[1] * values[1][1] + attentionWeights[2] * values[2][1],
  ]
  const logits: Vector3 = [
    context[0] * model.classifier[0][0] + context[1] * model.classifier[1][0] + model.bias[0],
    context[0] * model.classifier[0][1] + context[1] * model.classifier[1][1] + model.bias[1],
    context[0] * model.classifier[0][2] + context[1] * model.classifier[1][2] + model.bias[2],
  ]
  const probabilities = softmax(logits) as Vector3
  const target = Math.max(0, Math.min(2, Math.floor(model.targetIndex)))
  const targetProbability = probabilities[target]
  return {
    queries, keys, values, q: queries, k: keys, v: values, query, scores,
    attentionWeights, attention: attentionWeights, context, logits, probabilities,
    targetProbability, loss: -safeLog(targetProbability),
  }
}

export const computeTransformer = evaluateTinyModel
export const forwardPass = evaluateTinyModel
export const computeAttention = evaluateTinyModel

const zeroGradients = (): TransformerGradients => ({
  embeddings: [[0, 0], [0, 0], [0, 0]],
  wq: [[0, 0], [0, 0]], wk: [[0, 0], [0, 0]], wv: [[0, 0], [0, 0]],
  classifier: [[0, 0, 0], [0, 0, 0]], bias: [0, 0, 0],
})

type ScalarLocation = {
  path: string
  read: (model: TinyModelState) => number
  write: (model: TinyModelState, value: number) => void
}

const scalarLocations = (): ScalarLocation[] => {
  const locations: ScalarLocation[] = []
  for (let token = 0; token < 3; token += 1) for (let axis = 0; axis < 2; axis += 1) locations.push({
    path: `embeddings[${token}][${axis}]`,
    read: (model) => model.embeddings[token][axis],
    write: (model, value) => { model.embeddings[token][axis] = value },
  })
  for (const key of ['wq', 'wk', 'wv'] as const) for (let row = 0; row < 2; row += 1) for (let column = 0; column < 2; column += 1) locations.push({
    path: `${key}[${row}][${column}]`,
    read: (model) => model[key][row][column],
    write: (model, value) => { model[key][row][column] = value },
  })
  for (let row = 0; row < 2; row += 1) for (let column = 0; column < 3; column += 1) locations.push({
    path: `classifier[${row}][${column}]`,
    read: (model) => model.classifier[row][column],
    write: (model, value) => { model.classifier[row][column] = value },
  })
  for (let index = 0; index < 3; index += 1) locations.push({
    path: `bias[${index}]`, read: (model) => model.bias[index], write: (model, value) => { model.bias[index] = value },
  })
  return locations
}

/** Central finite-difference gradient of cross-entropy over all visible parameters. */
export function centralNumericalGradient(
  model: TinyModelState,
  epsilon = 1e-4,
  bridgeMasses?: readonly number[],
  temperature = 1,
): TransformerGradients {
  const gradients = zeroGradients()
  for (const location of scalarLocations()) {
    const plus = cloneModel(model)
    const minus = cloneModel(model)
    const center = location.read(model)
    location.write(plus, center + epsilon)
    location.write(minus, center - epsilon)
    const derivative = (
      evaluateTinyModel(plus, bridgeMasses, temperature).loss
      - evaluateTinyModel(minus, bridgeMasses, temperature).loss
    ) / (2 * epsilon)
    const match = location.path.match(/(?:embeddings|wq|wk|wv|classifier|bias)\[(\d+)\](?:\[(\d+)\])?/)
    if (!match) continue
    const first = Number(match[1])
    const second = match[2] === undefined ? undefined : Number(match[2])
    if (location.path.startsWith('embeddings')) gradients.embeddings[first][second!] = derivative
    else if (location.path.startsWith('wq')) gradients.wq[first][second!] = derivative
    else if (location.path.startsWith('wk')) gradients.wk[first][second!] = derivative
    else if (location.path.startsWith('wv')) gradients.wv[first][second!] = derivative
    else if (location.path.startsWith('classifier')) gradients.classifier[first][second!] = derivative
    else gradients.bias[first] = derivative
  }
  return gradients
}

export const numericalGradient = centralNumericalGradient

const gradientNorm = (g: TransformerGradients) => {
  const values = [...g.embeddings.flat(), ...g.wq.flat(), ...g.wk.flat(), ...g.wv.flat(), ...g.classifier.flat(), ...g.bias]
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))
}

const applyGradient = (model: TinyModelState, g: TransformerGradients, rate: number): TinyModelState => {
  const next = cloneModel(model)
  for (let token = 0; token < 3; token += 1) for (let axis = 0; axis < 2; axis += 1) next.embeddings[token][axis] -= rate * g.embeddings[token][axis]
  for (const key of ['wq', 'wk', 'wv'] as const) for (let row = 0; row < 2; row += 1) for (let column = 0; column < 2; column += 1) next[key][row][column] -= rate * g[key][row][column]
  for (let row = 0; row < 2; row += 1) for (let column = 0; column < 3; column += 1) next.classifier[row][column] -= rate * g.classifier[row][column]
  for (let index = 0; index < 3; index += 1) next.bias[index] -= rate * g.bias[index]
  return next
}

/** Learning rate the backtracking search starts from when the caller gives none. */
export const DEFAULT_LEARNING_RATE = 0.35

/**
 * One honest numerical-gradient update with deterministic loss/probability
 * backtracking. `initialRate` is where the line search starts (halved up to
 * 14 times until both the loss falls and the target probability rises).
 */
export function trainOneStep(
  model: TinyModelState,
  bridgeMasses?: readonly number[],
  temperature = 1,
  initialRate = DEFAULT_LEARNING_RATE,
): TrainStepResult {
  const before = evaluateTinyModel(model, bridgeMasses, temperature)
  const gradients = centralNumericalGradient(model, 1e-4, bridgeMasses, temperature)
  const norm = gradientNorm(gradients)
  let rate = Number.isFinite(initialRate) && initialRate > 0 ? initialRate : DEFAULT_LEARNING_RATE
  let candidate = model
  let after = before
  let accepted = false
  for (let attempt = 0; attempt < 14; attempt += 1) {
    candidate = applyGradient(model, gradients, rate)
    after = evaluateTinyModel(candidate, bridgeMasses, temperature)
    if (after.loss < before.loss - 1e-10 && after.targetProbability > before.targetProbability + 1e-10) {
      accepted = true
      break
    }
    rate *= 0.5
  }
  const next = cloneModel(accepted ? candidate : model)
  const changedParameter = accepted
    ? scalarLocations().find((location) => Math.abs(location.read(candidate) - location.read(model)) > 1e-12)?.path ?? 'bias[0]'
    : 'none (already optimal)'
  return {
    accepted, state: next, nextState: next, model: next, before, after: accepted ? after : before,
    lossBefore: before.loss, lossAfter: accepted ? after.loss : before.loss,
    targetProbabilityBefore: before.targetProbability,
    targetProbabilityAfter: accepted ? after.targetProbability : before.targetProbability,
    learningRate: accepted ? rate : 0, gradientNorm: norm, changedParameter, gradients,
  }
}
