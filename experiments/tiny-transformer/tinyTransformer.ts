import * as tf from '@tensorflow/tfjs'

const CONTEXT = 16
const D_MODEL = 24
const HEADS = 2
const HEAD_DIM = 12
const FF_DIM = 48

const CORPUS = [
  'change follows a path.',
  'a gradient tells us how change flows.',
  'tokens become vectors.',
  'attention mixes useful context.',
  'a residual path keeps information moving.',
  'training changes weights to lower loss.',
  'position tells each token where it is.',
  'useful paths carry useful change.',
].join('\n').repeat(18)

type VariableMap = Record<string, tf.Variable>

export type LabSnapshot = {
  step: number
  loss: number
  sample: string
  context: string[]
  attention: number[][]
}

export type TinyTransformer = {
  backend: string
  parameters: number
  config: { context: number; dModel: number; heads: number; headSize: number; feedForward: number; vocabulary: number }
  initial: LabSnapshot
  train: (steps: number) => Promise<LabSnapshot>
  inspect: () => Promise<LabSnapshot>
  dispose: () => void
}

function seededVariable(shape: number[], seed: number, scale = 0.08) {
  return tf.variable(tf.randomNormal(shape, 0, scale, 'float32', seed))
}

function layerNorm(x: tf.Tensor, gamma: tf.Variable, beta: tf.Variable) {
  const { mean, variance } = tf.moments(x, -1, true)
  return x.sub(mean).div(variance.add(1e-5).sqrt()).mul(gamma).add(beta)
}

function dense3d(x: tf.Tensor3D, weight: tf.Variable, bias: tf.Variable, outputSize: number) {
  const [batch, length, inputSize] = x.shape
  return x.reshape([batch * length, inputSize]).matMul(weight).add(bias).reshape([batch, length, outputSize]) as tf.Tensor3D
}

async function selectBackend() {
  try {
    if (tf.findBackend('webgl')) {
      await tf.setBackend('webgl')
      await tf.ready()
      return tf.getBackend()
    }
  } catch {
  }
  await tf.setBackend('cpu')
  await tf.ready()
  return tf.getBackend()
}

export async function createTinyTransformer(): Promise<TinyTransformer> {
  const backend = await selectBackend()
  const chars = [...new Set(CORPUS)].sort()
  const toIndex = new Map(chars.map((char, index) => [char, index]))
  const encoded = Array.from(CORPUS, (char) => toIndex.get(char) ?? 0)
  const vocab = chars.length
  const variables: VariableMap = {
    token: seededVariable([vocab, D_MODEL], 11),
    position: seededVariable([CONTEXT, D_MODEL], 12),
    qW: seededVariable([D_MODEL, D_MODEL], 13), qB: tf.variable(tf.zeros([D_MODEL])),
    kW: seededVariable([D_MODEL, D_MODEL], 14), kB: tf.variable(tf.zeros([D_MODEL])),
    vW: seededVariable([D_MODEL, D_MODEL], 15), vB: tf.variable(tf.zeros([D_MODEL])),
    oW: seededVariable([D_MODEL, D_MODEL], 16), oB: tf.variable(tf.zeros([D_MODEL])),
    ln1G: tf.variable(tf.ones([D_MODEL])), ln1B: tf.variable(tf.zeros([D_MODEL])),
    ln2G: tf.variable(tf.ones([D_MODEL])), ln2B: tf.variable(tf.zeros([D_MODEL])),
    lnFG: tf.variable(tf.ones([D_MODEL])), lnFB: tf.variable(tf.zeros([D_MODEL])),
    ff1W: seededVariable([D_MODEL, FF_DIM], 17), ff1B: tf.variable(tf.zeros([FF_DIM])),
    ff2W: seededVariable([FF_DIM, D_MODEL], 18), ff2B: tf.variable(tf.zeros([D_MODEL])),
    logitsW: seededVariable([D_MODEL, vocab], 19), logitsB: tf.variable(tf.zeros([vocab])),
  }
  const optimizer = tf.train.adam(0.003)
  let step = 0
  let randomState = 20260826
  let disposed = false

  function random() {
    randomState = (randomState * 1664525 + 1013904223) >>> 0
    return randomState / 4294967296
  }

  function forward(ids: tf.Tensor2D, includeAttention = false) {
    const batch = ids.shape[0]
    const length = ids.shape[1]
    const embedded = tf.gather(variables.token, ids).add(variables.position.slice([0, 0], [length, D_MODEL]).expandDims(0))
    const normalized = layerNorm(embedded, variables.ln1G, variables.ln1B)
    const project = (weight: tf.Variable, bias: tf.Variable) => dense3d(normalized as tf.Tensor3D, weight, bias, D_MODEL).reshape([batch, length, HEADS, HEAD_DIM]).transpose([0, 2, 1, 3])
    const q = project(variables.qW, variables.qB)
    const k = project(variables.kW, variables.kB)
    const v = project(variables.vW, variables.vB)
    const scores = tf.matMul(q, k, false, true).div(Math.sqrt(HEAD_DIM))
    const causal = tf.linalg.bandPart(tf.ones([length, length]), -1, 0)
    const attention = tf.softmax(scores.add(tf.onesLike(causal).sub(causal).mul(-1e9)), -1)
    const mixed = tf.matMul(attention, v).transpose([0, 2, 1, 3]).reshape([batch, length, D_MODEL])
    const afterAttention = embedded.add(dense3d(mixed as tf.Tensor3D, variables.oW, variables.oB, D_MODEL))
    const ffInput = layerNorm(afterAttention, variables.ln2G, variables.ln2B)
    const hidden = tf.relu(dense3d(ffInput as tf.Tensor3D, variables.ff1W, variables.ff1B, FF_DIM))
    const feedForward = dense3d(hidden, variables.ff2W, variables.ff2B, D_MODEL)
    const output = layerNorm(afterAttention.add(feedForward), variables.lnFG, variables.lnFB)
    const logits = dense3d(output as tf.Tensor3D, variables.logitsW, variables.logitsB, vocab)
    return { logits, attention: includeAttention ? attention : undefined }
  }

  function batch(fixed = false) {
    const xs: number[][] = []
    const ys: number[][] = []
    for (let b = 0; b < 8; b += 1) {
      const start = fixed ? b * 23 : Math.floor(random() * (encoded.length - CONTEXT - 1))
      xs.push(encoded.slice(start, start + CONTEXT))
      ys.push(encoded.slice(start + 1, start + CONTEXT + 1))
    }
    return { xs: tf.tensor2d(xs, [8, CONTEXT], 'int32'), ys: tf.tensor2d(ys, [8, CONTEXT], 'int32') }
  }

  function lossFor(xs: tf.Tensor2D, ys: tf.Tensor2D) {
    const { logits } = forward(xs)
    const labels = tf.oneHot(ys, vocab)
    return tf.neg(tf.mean(tf.sum(labels.mul(tf.logSoftmax(logits, -1)), -1))) as tf.Scalar
  }

  async function measuredLoss() {
    const value = tf.tidy(() => {
      const data = batch(true)
      const loss = lossFor(data.xs, data.ys)
      return loss.dataSync()[0]
    })
    return value
  }

  async function sampleText() {
    let text = 'change follows a'
    let ids = Array.from(text, (char) => toIndex.get(char) ?? 0)
    for (let i = 0; i < 48; i += 1) {
      const context = ids.slice(-CONTEXT)
      const next = tf.tidy(() => {
        const input = tf.tensor2d([context], [1, context.length], 'int32')
        const { logits } = forward(input)
        const last = logits.slice([0, context.length - 1, 0], [1, 1, vocab]).reshape([1, vocab]).div(0.82)
        return tf.multinomial(last as tf.Tensor2D, 1, 1000 + i).dataSync()[0]
      })
      ids.push(next)
      text += chars[next]
    }
    return text
  }

  async function attentionView() {
    const contextText = 'attention mixes'.padEnd(CONTEXT, ' ').slice(0, CONTEXT)
    const ids = Array.from(contextText, (char) => toIndex.get(char) ?? 0)
    const matrix = tf.tidy(() => {
      const input = tf.tensor2d([ids], [1, CONTEXT], 'int32')
      const weights = forward(input, true).attention!
      return weights.slice([0, 0, 0, 0], [1, 1, CONTEXT, CONTEXT]).reshape([CONTEXT, CONTEXT]).arraySync() as number[][]
    })
    return { context: Array.from(contextText), attention: matrix }
  }

  async function inspect(): Promise<LabSnapshot> {
    if (disposed) throw new Error('The model has been disposed.')
    const [loss, sample, view] = await Promise.all([measuredLoss(), sampleText(), attentionView()])
    return { step, loss, sample, ...view }
  }

  async function train(steps: number): Promise<LabSnapshot> {
    if (disposed) throw new Error('The model has been disposed.')
    for (let i = 0; i < steps; i += 1) {
      const data = batch()
      const gradients = tf.variableGrads(() => lossFor(data.xs, data.ys), Object.values(variables))
      optimizer.applyGradients(Object.entries(gradients.grads).map(([name, tensor]) => ({ name, tensor })))
      data.xs.dispose()
      data.ys.dispose()
      gradients.value.dispose()
      Object.values(gradients.grads).forEach((gradient) => gradient.dispose())
      step += 1
    }
    await tf.nextFrame()
    return inspect()
  }

  const parameters = Object.values(variables).reduce((total, variable) => total + variable.size, 0)
  const initial = await inspect()
  return {
    backend,
    parameters,
    config: { context: CONTEXT, dModel: D_MODEL, heads: HEADS, headSize: HEAD_DIM, feedForward: FF_DIM, vocabulary: vocab },
    initial,
    train,
    inspect,
    dispose() {
      if (disposed) return
      disposed = true
      optimizer.dispose()
      Object.values(variables).forEach((variable) => variable.dispose())
    },
  }
}
