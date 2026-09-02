'use client'

import { useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createInitialTinyModel, evaluateTinyModel, trainOneStep } from '../domain/math/transformer'
import type { AttentionObject, Matrix2, TrainingObject, WorldAction, WorldObject, WorldState } from '../domain/world/types'

type Props = { object: TrainingObject; world: WorldState; run: (action: WorldAction) => void }
const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({ id: crypto.randomUUID(), source: 'human', summary, operations })

function linkedAttention(world: WorldState, id: string): AttentionObject | null {
  const candidate: WorldObject | undefined = world.objects[id]
  return candidate?.kind === 'attention' ? candidate : null
}

function Sparkline({ values, tone, label }: { values: number[]; tone: 'loss' | 'probability'; label: string }) {
  const width = 210
  const height = 56
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1e-6, max - min)
  const pad = 6
  const x = (index: number) => pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2)
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2)
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  return (
    <svg className={`training-sparkline is-${tone}`} viewBox={`0 0 ${width} ${height}`} aria-label={label}>
      <polyline points={points} />
      {values.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r={index === values.length - 1 ? 3.4 : 2.2} />)}
      <text x={x(0)} y={y(values[0]) + (values[0] >= values[values.length - 1] ? -6 : 12)} textAnchor="start">{fmt(values[0])}</text>
      {values.length > 1 && (
        <text x={x(values.length - 1)} y={y(values[values.length - 1]) + (values[0] >= values[values.length - 1] ? 13 : -7)} textAnchor="end">{fmt(values[values.length - 1])}</text>
      )}
    </svg>
  )
}

function MatrixDrift({ label, current, initial }: { label: string; current: Matrix2; initial: Matrix2 }) {
  return (
    <div className="training-matrix">
      <span>{label}</span>
      <div>
        {current.flat().map((value, index) => {
          const before = initial.flat()[index]
          const delta = value - before
          return <b key={index} className={Math.abs(delta) > 5e-4 ? (delta > 0 ? 'is-up' : 'is-down') : undefined} title={`from ${short(before, 3)}`}>{short(value, 3)}</b>
        })}
      </div>
    </div>
  )
}

/**
 * One honest tiny-transformer training step. Reset restores the exact seeded
 * step-zero model; train calls the deterministic backtracking gradient step
 * and commits only if the loss fell and the target probability rose.
 */
export default function TrainingView({ object, world, run }: Props) {
  const attention = linkedAttention(world, object.linkedAttentionId)
  const bridgeMasses = attention?.bridgeMasses
  const temperature = attention?.temperature ?? 1
  const pass = useMemo(
    () => evaluateTinyModel(object.model, bridgeMasses, temperature),
    [object.model, bridgeMasses, temperature],
  )
  const initial = useMemo(() => createInitialTinyModel(bridgeMasses), [bridgeMasses])
  const lossHistory = object.lossHistory.length ? object.lossHistory : [pass.loss]
  const probabilityHistory = object.probabilityHistory.length ? object.probabilityHistory : [pass.targetProbability]
  const lossDelta = lossHistory[lossHistory.length - 1] - lossHistory[0]
  const probabilityDelta = probabilityHistory[probabilityHistory.length - 1] - probabilityHistory[0]

  const train = () => {
    const result = trainOneStep(object.model, bridgeMasses, temperature)
    // The truth boundary: never commit a "successful" step that did not improve.
    if (!result.accepted || !(result.after.loss < result.before.loss && result.after.targetProbability > result.before.targetProbability)) return
    const nextTraining: TrainingObject = {
      ...object,
      model: result.state,
      step: object.step + 1,
      lossHistory: [...object.lossHistory, result.lossAfter],
      probabilityHistory: [...object.probabilityHistory, result.targetProbabilityAfter],
      learningRate: result.learningRate,
    }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model: result.state } })
    run(humanAction(`Trained tiny model step ${object.step + 1}`, operations))
  }

  const reset = () => {
    const model = createInitialTinyModel(bridgeMasses)
    const initialPass = evaluateTinyModel(model, bridgeMasses, temperature)
    const nextTraining: TrainingObject = { ...object, model, step: 0, lossHistory: [initialPass.loss], probabilityHistory: [initialPass.targetProbability], learningRate: 0 }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model } })
    run(humanAction('Reset tiny model to step zero', operations))
  }

  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  return (
    <section className="training-view" onPointerDown={stop}>
      <header className="training-header">
        <div><span className="math-object-kicker">TINY TRANSFORMER · GRADIENT STEP</span><h3>One honest training step</h3></div>
        <div className="training-actions">
          <button type="button" data-demo-target="train-reset" onClick={reset}>reset</button>
          <button type="button" className="training-primary" data-demo-target="train-step" onClick={train}>train 1 step</button>
        </div>
      </header>

      <div className="training-metrics">
        <div><small>STEP</small><strong>{object.step}</strong><span>η = {object.learningRate ? short(object.learningRate, 3) : '—'}</span></div>
        <div><small>TARGET TOKEN</small><strong>{object.model.tokens[object.model.targetIndex]}</strong><span>query {object.model.tokens[object.model.queryIndex]}</span></div>
        <div className="is-loss"><small>CROSS-ENTROPY L = −log p(target)</small><strong>{fmt(pass.loss)}</strong><span>{lossDelta < 0 ? `↓ ${fmt(-lossDelta)} since step 0` : 'awaiting a step'}</span></div>
        <div className="is-probability"><small>TARGET PROBABILITY</small><strong>{fmt(pass.targetProbability)}</strong><span>{probabilityDelta > 0 ? `↑ ${fmt(probabilityDelta)} since step 0` : 'awaiting a step'}</span></div>
      </div>

      <div className="training-body">
        <div className="training-probabilities">
          <div className="training-card-heading"><span>OUTPUT DISTRIBUTION</span><b>Σ p = {fmt(pass.probabilities.reduce((sum, value) => sum + value, 0))}</b></div>
          {pass.probabilities.map((probability, index) => (
            <div className={`training-probability ${index === object.model.targetIndex ? 'is-target' : ''}`} key={index}>
              <span>{object.model.tokens[index]}</span><i><em style={{ width: `${(probability * 100).toFixed(2)}%` }} /></i><b>{fmt(probability)}</b>
            </div>
          ))}
        </div>
        <div className="training-history">
          <div className="training-history-card is-loss">
            <div className="training-card-heading"><span>LOSS</span><b>{lossHistory.map((value) => fmt(value)).join(' → ')}</b></div>
            <Sparkline values={lossHistory} tone="loss" label="Loss history" />
          </div>
          <div className="training-history-card is-probability">
            <div className="training-card-heading"><span>TARGET PROBABILITY</span><b>{probabilityHistory.map((value) => fmt(value)).join(' → ')}</b></div>
            <Sparkline values={probabilityHistory} tone="probability" label="Target probability history" />
          </div>
        </div>
      </div>

      <div className="training-drift" aria-label="Parameters moved by the gradient">
        <MatrixDrift label="W_Q" current={object.model.wq} initial={initial.wq} />
        <MatrixDrift label="W_K" current={object.model.wk} initial={initial.wk} />
        <MatrixDrift label="W_V" current={object.model.wv} initial={initial.wv} />
        <div className="training-footnote">central finite differences on every visible parameter · deterministic backtracking · {attention ? 'weights shared with the attention card' : 'standalone model state'} · a tiny transformer, not frontier-model training</div>
      </div>
    </section>
  )
}
