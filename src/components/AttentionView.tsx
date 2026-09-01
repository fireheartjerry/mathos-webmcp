'use client'

import { useMemo } from 'react'
import { evaluateTinyModel } from '../domain/math/transformer'
import type { AttentionObject, Matrix2, WorldAction } from '../domain/world/types'

type Props = { object: AttentionObject; run: (action: WorldAction) => void }
const humanPut = (summary: string, object: AttentionObject): WorldAction => ({ id: crypto.randomUUID(), source: 'human', summary, operations: [{ type: 'put', object }] })
const fmt = (value: number, digits = 3) => Number(value.toFixed(digits)).toString()

export default function AttentionView({ object, run }: Props) {
  const pass = useMemo(() => evaluateTinyModel(object.model, object.bridgeMasses, object.temperature), [object.model, object.bridgeMasses, object.temperature])
  const width = Math.max(420, object.bounds.width)
  const updateModel = (patch: Partial<AttentionObject['model']>, summary: string) => run(humanPut(summary, { ...object, model: { ...object.model, ...patch } }))
  const updateWq = (row: number, column: number, value: number) => {
    const wq = object.model.wq.map((line) => [...line]) as Matrix2
    wq[row][column] = value
    updateModel({ wq }, `Edited W_Q[${row + 1},${column + 1}]`)
  }
  const matrix = (label: string, values: Matrix2, onCell?: (row: number, column: number, value: number) => void) => (
    <div className="attention-matrix"><span>{label}</span><div className="attention-matrix-grid">{values.map((row, rowIndex) => row.map((value, columnIndex) => onCell ? <input key={`${rowIndex}-${columnIndex}`} aria-label={`${label} row ${rowIndex + 1} column ${columnIndex + 1}`} type="number" step="0.01" value={value} onChange={(event) => onCell(rowIndex, columnIndex, Number(event.target.value) || 0)} /> : <b key={`${rowIndex}-${columnIndex}`}>{fmt(value, 2)}</b>))}</div></div>
  )
  const ribbons = pass.attentionWeights.map((weight, index) => ({ index, weight, width: 48 + weight * Math.max(120, width * 0.33) }))

  return (
    <section className="attention-view" onPointerDown={(event) => event.stopPropagation()}>
      <header className="attention-header"><div><span className="math-object-kicker">TINY TRANSFORMER / ONE HEAD</span><h3>Attention is a weighted sum</h3></div><label><span>temperature <b>{fmt(object.temperature, 2)}</b></span><input type="range" min="0.25" max="2" step="0.05" value={object.temperature} aria-label="Attention temperature" onChange={(event) => run(humanPut('Adjusted attention temperature', { ...object, temperature: Number(event.target.value) }))} /></label></header>
      <div className="attention-token-row"><div className="attention-embeddings"><small>TOKEN EMBEDDINGS</small>{object.model.tokens.map((token, index) => <div className="attention-token" key={token}><b>{token}</b><code>[{object.model.embeddings[index].map((value) => fmt(value, 2)).join(', ')}]</code></div>)}</div><div className="attention-matrices">{matrix('W_Q', object.model.wq, updateWq)}{matrix('W_K', object.model.wk)}{matrix('W_V', object.model.wv)}</div></div>
      <div className="attention-flow" aria-label="Scaled dot product attention">
        <div className="attention-score-block"><small>scaled QKᵀ / √2</small>{pass.scores.map((score, index) => <div key={index}><span>{object.model.tokens[index]}</span><b>{fmt(score)}</b></div>)}</div>
        <div className="attention-ribbon-block"><small>softmax weights</small>{ribbons.map(({ index, weight, width: ribbonWidth }) => <div className="attention-ribbon-row" key={index}><span>{object.model.tokens[index]}</span><i style={{ width: ribbonWidth }} /><b>{fmt(weight)}</b></div>)}</div>
        <div className="attention-context"><small>context z = Σ αᵢVᵢ</small><strong>[{pass.context.map((value) => fmt(value)).join(', ')}]</strong></div>
      </div>
      <div className="attention-output"><div><small>OUTPUT LOGITS</small><code>[{pass.logits.map((value) => fmt(value)).join(', ')}]</code></div><div><small>NEXT TOKEN PROBABILITIES</small>{pass.probabilities.map((probability, index) => <span className={index === object.model.targetIndex ? 'is-target' : ''} key={index}>{object.model.tokens[index]} <b>{fmt(probability)}</b></span>)}</div><strong>target p = {fmt(pass.targetProbability)} · cross-entropy = {fmt(pass.loss)}</strong></div>
      <div className="attention-bridge">Gamma bin masses initialize this head through <b>ℓ = log(w)</b> → <b>softmax(ℓ) = w</b>.</div>
    </section>
  )
}
