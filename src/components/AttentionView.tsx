'use client'

import { useMemo } from 'react'
import { evaluateTinyModel } from '../domain/math/transformer'
import type {
  AttentionObject,
  Matrix2,
  TinyModelState,
  TrainingObject,
  Vector2,
  Vector3,
  WorldAction,
  WorldState,
} from '../domain/world/types'

type Props = { object: AttentionObject; world: WorldState; run: (action: WorldAction) => void }
type MatrixKey = 'wq' | 'wk' | 'wv'

const fmt = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()
const numeric = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

export default function AttentionView({ object, world, run }: Props) {
  const pass = useMemo(
    () => evaluateTinyModel(object.model, object.bridgeMasses, object.temperature),
    [object.model, object.bridgeMasses, object.temperature],
  )

  const commit = (next: AttentionObject, summary: string) => {
    const nextPass = evaluateTinyModel(next.model, next.bridgeMasses, next.temperature)
    const linkedTraining = Object.values(world.objects).filter((candidate): candidate is TrainingObject => (
      candidate.kind === 'training' && candidate.linkedAttentionId === object.id
    ))
    run(humanAction(summary, [
      { type: 'put', object: next },
      ...linkedTraining.map((training) => ({
        type: 'put' as const,
        object: {
          ...training,
          model: structuredClone(next.model),
          step: 0,
          lossHistory: [nextPass.loss],
          probabilityHistory: [nextPass.targetProbability],
          learningRate: 0,
        },
      })),
    ]))
  }

  const editModel = (summary: string, mutate: (model: TinyModelState) => void) => {
    const model = structuredClone(object.model)
    mutate(model)
    commit({ ...object, model }, summary)
  }

  const editMatrix = (key: MatrixKey, row: number, column: number, value: number) => {
    editModel(`Edited ${key.toUpperCase()}[${row + 1},${column + 1}]`, (model) => {
      model[key][row][column] = value
    })
  }

  const editPrior = (index: number, value: number) => {
    const masses = [...object.bridgeMasses] as Vector3
    masses[index] = Math.max(0.005, value)
    const total = masses.reduce((sum, mass) => sum + mass, 0) || 1
    const normalized = masses.map((mass) => mass / total) as Vector3
    commit({ ...object, bridgeMasses: normalized }, `Adjusted attention prior ${index + 1}`)
  }

  const matrix = (label: string, key: MatrixKey) => (
    <fieldset className="attention-matrix">
      <legend>{label}</legend>
      <div className="attention-matrix-grid">
        {object.model[key].map((row, rowIndex) => row.map((value, columnIndex) => (
          <input
            key={`${rowIndex}-${columnIndex}`}
            aria-label={`${label} row ${rowIndex + 1} column ${columnIndex + 1}`}
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => editMatrix(key, rowIndex, columnIndex, numeric(event.target.value))}
          />
        )))}
      </div>
    </fieldset>
  )

  const outputHead = () => (
    <div className="attention-output-head">
      <fieldset>
        <legend>W<sub>out</sub></legend>
        <div className="attention-classifier-grid">
          {object.model.classifier.map((row, rowIndex) => row.map((value, columnIndex) => (
            <input
              key={`${rowIndex}-${columnIndex}`}
              aria-label={`Output matrix row ${rowIndex + 1} column ${columnIndex + 1}`}
              type="number"
              step="0.01"
              value={value}
              onChange={(event) => editModel(`Edited output weight ${rowIndex + 1},${columnIndex + 1}`, (model) => {
                model.classifier[rowIndex][columnIndex] = numeric(event.target.value)
              })}
            />
          )))}
        </div>
      </fieldset>
      <fieldset>
        <legend>bias</legend>
        <div className="attention-bias-grid">
          {object.model.bias.map((value, index) => (
            <input
              key={index}
              aria-label={`Output bias ${index + 1}`}
              type="number"
              step="0.01"
              value={value}
              onChange={(event) => editModel(`Edited output bias ${index + 1}`, (model) => {
                model.bias[index] = numeric(event.target.value)
              })}
            />
          ))}
        </div>
      </fieldset>
    </div>
  )

  const derivedVector = (label: string, vector: Vector2) => (
    <span><i>{label}</i>[{fmt(vector[0], 2)}, {fmt(vector[1], 2)}]</span>
  )

  return (
    <section className="attention-view" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
      <header className="attention-header">
        <div><span className="math-object-kicker">TINY TRANSFORMER · ONE HEAD</span><h3>Attention is a weighted sum</h3></div>
        <span className="attention-live"><i /> Every value is live</span>
      </header>

      <div className="attention-workbench">
        <section className="attention-panel attention-input-panel">
          <header><span>01</span><b>Tokens + embeddings</b></header>
          <div className="attention-token-editor-list">
            {object.model.tokens.map((token, index) => (
              <article className="attention-token-editor" key={index}>
                <div className="attention-token-name">
                  <input
                    aria-label={`Token ${index + 1} name`}
                    value={token}
                    maxLength={12}
                    onChange={(event) => editModel(`Renamed token ${index + 1}`, (model) => { model.tokens[index] = event.target.value })}
                  />
                  <span>{object.model.queryIndex === index ? 'query' : object.model.targetIndex === index ? 'target' : 'token'}</span>
                </div>
                <div className="attention-vector-inputs">
                  {object.model.embeddings[index].map((value, axis) => (
                    <label key={axis}><span>e{axis}</span><input
                      aria-label={`${token} embedding component ${axis + 1}`}
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(event) => editModel(`Edited ${token} embedding ${axis + 1}`, (model) => {
                        model.embeddings[index][axis] = numeric(event.target.value)
                      })}
                    /></label>
                  ))}
                </div>
                <div className="attention-derived-vectors">
                  {derivedVector('Q', pass.queries[index])}
                  {derivedVector('K', pass.keys[index])}
                  {derivedVector('V', pass.values[index])}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="attention-panel attention-parameter-panel">
          <header><span>02</span><b>Learned parameters</b></header>
          <div className="attention-matrices">
            {matrix('WQ', 'wq')}
            {matrix('WK', 'wk')}
            {matrix('WV', 'wv')}
          </div>
          {outputHead()}
        </section>

        <section className="attention-panel attention-control-panel">
          <header><span>03</span><b>Attention controls</b></header>
          <div className="attention-selects">
            <label><span>Query token</span><select
              aria-label="Query token"
              value={object.model.queryIndex}
              onChange={(event) => editModel('Changed query token', (model) => { model.queryIndex = Number(event.target.value) })}
            >{object.model.tokens.map((token, index) => <option key={index} value={index}>{token || `token ${index + 1}`}</option>)}</select></label>
            <label><span>Training target</span><select
              aria-label="Training target token"
              value={object.model.targetIndex}
              onChange={(event) => editModel('Changed training target', (model) => { model.targetIndex = Number(event.target.value) })}
            >{object.model.tokens.map((token, index) => <option key={index} value={index}>{token || `token ${index + 1}`}</option>)}</select></label>
          </div>
          <label className="attention-temperature"><span>Temperature <b>{fmt(object.temperature, 2)}</b></span><input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={object.temperature}
            aria-label="Attention temperature"
            onChange={(event) => commit({ ...object, temperature: Number(event.target.value) }, 'Adjusted attention temperature')}
          /></label>
          <div className="attention-priors">
            <span className="attention-subheading">Logit prior · normalized</span>
            {object.bridgeMasses.map((mass, index) => (
              <label key={index}><span>{object.model.tokens[index]} <b>{fmt(mass)}</b></span><input
                type="range"
                min="0.005"
                max="0.99"
                step="0.005"
                value={mass}
                aria-label={`${object.model.tokens[index]} attention prior`}
                onChange={(event) => editPrior(index, Number(event.target.value))}
              /></label>
            ))}
          </div>
          <div className="attention-score-list">
            <span className="attention-subheading">Score → softmax</span>
            {pass.attentionWeights.map((weight, index) => (
              <div key={index}><span>{object.model.tokens[index]}</span><code>{fmt(pass.scores[index])}</code><i><em style={{ width: `${weight * 100}%` }} /></i><b>{fmt(weight)}</b></div>
            ))}
          </div>
        </section>
      </div>

      <div className="attention-readout">
        <div><small>CONTEXT · Σ αᵢVᵢ</small><strong>[{pass.context.map((value) => fmt(value)).join(', ')}]</strong></div>
        <div><small>LOGITS</small><code>[{pass.logits.map((value) => fmt(value)).join(', ')}]</code></div>
        <div className="attention-probability-list"><small>NEXT TOKEN</small>{pass.probabilities.map((probability, index) => (
          <span className={index === object.model.targetIndex ? 'is-target' : ''} key={index}>
            <i>{object.model.tokens[index]}</i><em><b style={{ width: `${probability * 100}%` }} /></em><strong>{fmt(probability)}</strong>
          </span>
        ))}</div>
        <div className="attention-loss"><small>CROSS-ENTROPY</small><strong>{fmt(pass.loss)}</strong><span>target p {fmt(pass.targetProbability)}</span></div>
      </div>
    </section>
  )
}
