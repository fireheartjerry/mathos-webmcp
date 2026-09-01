'use client'

import { useMemo } from 'react'
import { createInitialTinyModel, evaluateTinyModel, trainOneStep } from '../domain/math/transformer'
import type { AttentionObject, TrainingObject, WorldAction, WorldObject, WorldState } from '../domain/world/types'

type Props = { object: TrainingObject; world: WorldState; run: (action: WorldAction) => void }
const fmt = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({ id: crypto.randomUUID(), source: 'human', summary, operations })

function linkedAttention(world: WorldState, id: string): AttentionObject | null {
  const candidate: WorldObject | undefined = world.objects[id]
  return candidate?.kind === 'attention' ? candidate : null
}

export default function TrainingView({ object, world, run }: Props) {
  const attention = linkedAttention(world, object.linkedAttentionId)
  const bridgeMasses = attention?.bridgeMasses
  const temperature = attention?.temperature ?? 1
  const pass = useMemo(
    () => evaluateTinyModel(object.model, bridgeMasses, temperature),
    [object.model, bridgeMasses, temperature],
  )
  const history = object.lossHistory.length ? object.lossHistory : [pass.loss]
  const probabilities = object.probabilityHistory.length ? object.probabilityHistory : [pass.targetProbability]
  const spark = (values: number[], color: string) => {
    const max = Math.max(...values, 0.001)
    const min = Math.min(...values, 0)
    const span = Math.max(0.001, max - min)
    const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 180},${44 - ((value - min) / span) * 36}`).join(' ')
    return <svg className="training-sparkline" viewBox="0 0 180 48" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" /><circle cx={180} cy={44 - ((values.at(-1)! - min) / span) * 36} r="3" fill={color} /></svg>
  }
  const train = () => {
    const result = trainOneStep(object.model, bridgeMasses, temperature)
    if (!result.accepted) return
    const nextTraining: TrainingObject = { ...object, model: result.state, step: object.step + 1, lossHistory: [...object.lossHistory, result.lossAfter], probabilityHistory: [...object.probabilityHistory, result.targetProbabilityAfter], learningRate: result.learningRate }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model: result.state } })
    run(humanAction(`Trained tiny model step ${object.step + 1}`, operations))
  }
  const reset = () => {
    const model = createInitialTinyModel(attention?.bridgeMasses)
    const initial = evaluateTinyModel(model, bridgeMasses, temperature)
    const nextTraining: TrainingObject = { ...object, model, step: 0, lossHistory: [initial.loss], probabilityHistory: [initial.targetProbability], learningRate: 0 }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model } })
    run(humanAction('Reset tiny model to step zero', operations))
  }
  return (
    <section className="training-view" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>
      <header className="training-header"><div><span className="math-object-kicker">OPTIMIZATION / NUMERICAL GRADIENT</span><h3>Train a tiny language model from scratch</h3></div><div className="training-actions"><button type="button" onClick={reset}>reset</button><button type="button" className="training-primary" onClick={train}>train 1 step</button></div></header>
      <div className="training-metrics"><div><small>STEP</small><strong>{object.step}</strong></div><div><small>TARGET TOKEN</small><strong>{object.model.tokens[object.model.targetIndex]}</strong></div><div><small>CROSS-ENTROPY</small><strong>{fmt(pass.loss)}</strong><span className="training-delta">loss ↓ by gradient</span></div><div><small>TARGET PROBABILITY</small><strong>{fmt(pass.targetProbability)}</strong><span className="training-delta">probability ↑</span></div></div>
      <div className="training-probabilities"><div className="training-card-heading"><span>OUTPUT DISTRIBUTION</span><b>Σ p = {fmt(pass.probabilities.reduce((sum, value) => sum + value, 0))}</b></div>{pass.probabilities.map((probability, index) => <div className={`training-probability ${index === object.model.targetIndex ? 'is-target' : ''}`} key={index}><span>{object.model.tokens[index]}</span><i><em style={{ width: `${probability * 100}%` }} /></i><b>{fmt(probability)}</b></div>)}</div>
      <div className="training-history"><div className="training-history-card"><div className="training-card-heading"><span>LOSS HISTORY</span><b>{fmt(history[0])} → {fmt(history.at(-1)!)}</b></div>{spark(history, '#d46b4c')}</div><div className="training-history-card"><div className="training-card-heading"><span>TARGET PROBABILITY</span><b>{fmt(probabilities[0])} → {fmt(probabilities.at(-1)!)}</b></div>{spark(probabilities, '#7c5cff')}</div></div>
      <div className="training-footnote">central finite differences · deterministic backtracking · {attention ? 'shared weights linked to Attention Geometry' : 'standalone model state'}</div>
    </section>
  )
}
