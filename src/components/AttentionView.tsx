'use client'

import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { evaluateTinyModel } from '../domain/math/transformer'
import { logMasses } from '../domain/math/probability'
import type {
  AttentionObject,
  TinyModelState,
  TrainingObject,
  Vector2,
  WorldAction,
  WorldState,
} from '../domain/world/types'
import { revealDash, revealItem, revealLerp, revealProgress, revealStage } from '../domain/animation/evaluate'
import '../styles/reveal.css'

type Props = { object: AttentionObject; world: WorldState; run: (action: WorldAction) => void }
type MatrixKey = 'wq' | 'wk' | 'wv'
type CellDraft = { key: MatrixKey; row: number; column: number; value: string }

const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({
  id: crypto.randomUUID(), source: 'human', summary, operations,
})

/** The one matrix cell the film edits: W_Q[1,1]. */
export const HERO_CELL = { key: 'wq' as MatrixKey, row: 0, column: 0 }
const MATRIX_LABELS: Record<MatrixKey, string> = { wq: 'W_Q', wk: 'W_K', wv: 'W_V' }

// Plane geometry: one unit is PLANE_SCALE pixels, origin near the lower-left.
const PLANE = { width: 392, height: 296 }
const PLANE_SCALE = 150
const ORIGIN = { x: 64, y: 244 }
const toPlane = (vector: Vector2) => ({ x: ORIGIN.x + vector[0] * PLANE_SCALE, y: ORIGIN.y - vector[1] * PLANE_SCALE })
const angleOf = (vector: Vector2) => Math.atan2(-vector[1], vector[0])

function arcPath(from: Vector2, to: Vector2, radius: number) {
  const start = angleOf(from)
  let delta = angleOf(to) - start
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  const first = { x: ORIGIN.x + Math.cos(start) * radius, y: ORIGIN.y + Math.sin(start) * radius }
  const last = { x: ORIGIN.x + Math.cos(start + delta) * radius, y: ORIGIN.y + Math.sin(start + delta) * radius }
  const middle = start + delta / 2
  return {
    d: `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} A ${radius} ${radius} 0 0 ${delta > 0 ? 1 : 0} ${last.x.toFixed(1)} ${last.y.toFixed(1)}`,
    label: { x: ORIGIN.x + Math.cos(middle) * (radius + 13), y: ORIGIN.y + Math.sin(middle) * (radius + 13) },
    degrees: Math.abs(delta) * 180 / Math.PI,
  }
}

export default function AttentionView({ object, world, run }: Props) {
  const [draft, setDraftState] = useState<CellDraft | null>(null)
  // The draft also lives in a ref so an Enter commit followed by blur in the
  // same tick cannot commit the same edit twice.
  const draftRef = useRef<CellDraft | null>(null)
  const setDraft = (next: CellDraft | null) => { draftRef.current = next; setDraftState(next) }
  const [heroActive, setHeroActive] = useState(false)
  const heroTimerRef = useRef<number | null>(null)
  const pass = useMemo(
    () => evaluateTinyModel(object.model, object.bridgeMasses, object.temperature),
    [object.model, object.bridgeMasses, object.temperature],
  )
  const logs = useMemo(() => logMasses(object.bridgeMasses), [object.bridgeMasses])
  const queryIndex = Math.max(0, Math.min(2, object.model.queryIndex))
  const query = pass.queries[queryIndex]
  const dots = pass.keys.map((key) => (query[0] * key[0] + query[1] * key[1]) / Math.sqrt(2))
  const markerId = `attention-arrow-${object.id}`
  const contextMarkerId = `attention-context-${object.id}`

  // ---- staged reveal: matrix rows → score columns and softmax bars → readouts --
  const p = revealProgress(object)
  const revealing = p < 1
  const headerT = revealStage(p, 0, 0.15)
  const rowT = (row: number) => revealStage(p, row * 0.2, row * 0.2 + 0.2)
  const planeT = revealStage(p, 0, 0.2)
  const vectorT = revealStage(p, 0.1, 0.5)
  const arcT = revealStage(p, 0.4, 0.6)
  const columnT = (column: number) => revealStage(p, 0.4 + column * 0.1, 0.5 + column * 0.1)
  const barT = (index: number) => revealItem(revealStage(p, 0.4, 0.8), index, 3, 0.6)
  const readoutT = revealStage(p, 0.8, 1)
  const grow = (tip: { x: number; y: number }) => revealLerp(ORIGIN, tip, vectorT)

  const commit = (next: AttentionObject, summary: string) => {
    const nextPass = evaluateTinyModel(next.model, next.bridgeMasses, next.temperature)
    const linkedTraining = Object.values(world.objects).filter((candidate): candidate is TrainingObject => (
      candidate.kind === 'training' && candidate.linkedAttentionId === object.id
    ))
    run(humanAction(summary, [
      { type: 'put', object: next },
      // Editing the head restarts the linked training history at step zero,
      // so the sparkline can never claim a history the weights no longer own.
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

  const commitCell = (cell: CellDraft) => {
    if (!draftRef.current) return
    setDraft(null)
    const value = Number(cell.value)
    if (!Number.isFinite(value)) return
    if (Math.abs(object.model[cell.key][cell.row][cell.column] - value) < 1e-12) return
    const model: TinyModelState = structuredClone(object.model)
    model[cell.key][cell.row][cell.column] = value
    commit({ ...object, model }, `Edited ${MATRIX_LABELS[cell.key].replace('_', '')}[${cell.row + 1},${cell.column + 1}] to ${short(value)}`)
    if (cell.key === HERO_CELL.key && cell.row === HERO_CELL.row && cell.column === HERO_CELL.column) {
      if (heroTimerRef.current !== null) window.clearTimeout(heroTimerRef.current)
      setHeroActive(true)
      heroTimerRef.current = window.setTimeout(() => setHeroActive(false), 1900)
    }
  }

  const onCellKey = (event: KeyboardEvent<HTMLInputElement>, cell: CellDraft) => {
    if (event.key === 'Enter') { event.preventDefault(); commitCell(cell) }
    if (event.key === 'Escape') setDraft(null)
  }

  const matrix = (key: MatrixKey) => (
    <fieldset className={`attention-matrix is-${key}`} data-hero-path={key === HERO_CELL.key ? 'cell' : undefined}>
      <legend>{key === 'wq' ? 'W' : key === 'wk' ? 'W' : 'W'}<sub>{key === 'wq' ? 'Q' : key === 'wk' ? 'K' : 'V'}</sub></legend>
      <div className="attention-matrix-grid">
        {object.model[key].map((row, rowIndex) => row.map((value, columnIndex) => {
          const isHero = key === HERO_CELL.key && rowIndex === HERO_CELL.row && columnIndex === HERO_CELL.column
          const editing = draft && draft.key === key && draft.row === rowIndex && draft.column === columnIndex
          return (
            <input
              key={`${rowIndex}-${columnIndex}`}
              style={revealing ? { opacity: rowT(rowIndex) } : undefined}
              className={isHero ? 'is-hero' : undefined}
              data-demo-target={isHero ? 'attention-matrix-cell' : undefined}
              aria-label={`${MATRIX_LABELS[key]} row ${rowIndex + 1} column ${columnIndex + 1}`}
              type="number"
              step="0.01"
              value={editing ? draft.value : short(value)}
              onChange={(event) => setDraft({ key, row: rowIndex, column: columnIndex, value: event.target.value })}
              onBlur={() => { const pending = draftRef.current; if (pending && pending.key === key && pending.row === rowIndex && pending.column === columnIndex) commitCell(pending) }}
              onKeyDown={(event) => onCellKey(event, { key, row: rowIndex, column: columnIndex, value: editing ? draft.value : event.currentTarget.value })}
            />
          )
        }))}
      </div>
    </fieldset>
  )

  const arcs = pass.keys.map((key, index) => arcPath(query, key, 30 + index * 13))
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  return (
    <section className={`attention-view reveal-root${heroActive ? ' is-hero-active' : ''}${revealing ? ' is-revealing' : ''}`} onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="attention-header reveal-fade" style={{ opacity: headerT }}>
        <div><span className="math-object-kicker">TINY TRANSFORMER · ONE HEAD · 2-D EMBEDDINGS</span><h3>Attention is a weighted sum</h3></div>
        <span className="attention-truth">softmax over q·kⱼ/√2 + log wⱼ · not a frontier model</span>
      </header>

      <div className="attention-plane-wrap">
        <svg className="attention-plane" viewBox={`0 0 ${PLANE.width} ${PLANE.height}`} aria-label="Query, key and value vectors with attention angles">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
            <marker id={contextMarkerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
          </defs>
          <rect className="attention-plane-paper" width={PLANE.width} height={PLANE.height} />
          <line className="attention-axis" x1={ORIGIN.x - 40} x2={PLANE.width - 10} y1={ORIGIN.y} y2={ORIGIN.y} pathLength={1} style={revealDash(planeT)} />
          <line className="attention-axis" x1={ORIGIN.x} x2={ORIGIN.x} y1={ORIGIN.y + 34} y2={12} pathLength={1} style={revealDash(planeT)} />
          <text className="attention-plane-kicker" x={12} y={16} style={{ opacity: planeT }}>KEYS k = W_K e · QUERY q = W_Q e</text>
          {arcs.map((arc, index) => (
            <g key={`arc-${index}`} className={`attention-arc${index === pass.attentionWeights.indexOf(Math.max(...pass.attentionWeights)) ? ' is-strongest' : ''}`} data-hero-path="score" style={{ opacity: arcT }}>
              <path d={arc.d} pathLength={1} style={revealDash(arcT)} />
              <text x={arc.label.x} y={arc.label.y} textAnchor="middle">{short(arc.degrees, 0)}°</text>
            </g>
          ))}
          {vectorT > 0 && pass.values.map((value, index) => {
            const tip = grow(toPlane(value))
            return <line key={`v-${index}`} className="attention-value-vector" x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} />
          })}
          {vectorT > 0 && pass.keys.map((key, index) => {
            const tip = grow(toPlane(key))
            return (
              <g key={`k-${index}`} className="attention-key-vector">
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${markerId})`} />
                <text x={tip.x + 6} y={tip.y - 6} style={{ opacity: vectorT }}>k{index}</text>
              </g>
            )
          })}
          {vectorT > 0 && (() => {
            const tip = grow(toPlane(pass.context))
            return (
              <g className="attention-context-vector" data-hero-path="context">
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${contextMarkerId})`} />
                <text x={tip.x + 7} y={tip.y + 14} style={{ opacity: vectorT }}>c = Σ αⱼ vⱼ</text>
              </g>
            )
          })()}
          {vectorT > 0 && (() => {
            const tip = grow(toPlane(query))
            return (
              <g className="attention-query-vector" data-hero-path="query">
                <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${markerId})`} />
                <text x={tip.x + 7} y={tip.y - 8} style={{ opacity: vectorT }}>q = W_Q e{queryIndex}</text>
              </g>
            )
          })()}
          {object.model.embeddings.map((embedding, index) => {
            const at = toPlane(embedding)
            return (
              <g key={`e-${index}`} className={`attention-embedding${index === queryIndex ? ' is-query' : ''}${index === object.model.targetIndex ? ' is-target' : ''}`} style={{ opacity: planeT }}>
                <circle cx={at.x} cy={at.y} r="4" />
                <text x={at.x + 7} y={at.y + 4}>e{index} · {object.model.tokens[index]}</text>
              </g>
            )
          })}
        </svg>
        <div className="attention-ribbons" data-hero-path="ribbon" aria-label="Attention weights as ribbon widths">
          {pass.attentionWeights.map((weight, index) => (
            <div key={index} className={`attention-ribbon${index === object.model.targetIndex ? ' is-target' : ''}`} style={{ opacity: revealStage(p, 0.35, 0.45) }}>
              <span>α{index} · {object.model.tokens[index]}</span>
              <i><em style={{ width: `${(weight * 100 * barT(index)).toFixed(2)}%` }} /></i>
              <b>{fmt(weight * barT(index))}</b>
            </div>
          ))}
          <small style={{ opacity: revealStage(p, 0.75, 0.85) }}>Σ α = {fmt(pass.attentionWeights.reduce((sum, weight) => sum + weight, 0))}</small>
        </div>
      </div>

      <div className="attention-side">
        <div className="attention-matrices">{matrix('wq')}{matrix('wk')}{matrix('wv')}</div>
        <table className="attention-score-table" aria-label="Scores and softmax weights">
          <thead style={{ opacity: revealStage(p, 0.35, 0.45) }}><tr><th scope="col">token</th><th scope="col">q·kⱼ/√2</th><th scope="col">+ log wⱼ</th><th scope="col">score</th><th scope="col">αⱼ</th></tr></thead>
          <tbody>
            {pass.scores.map((score, index) => (
              <tr key={index} className={index === queryIndex ? 'is-query' : undefined} data-hero-path={index === object.model.targetIndex ? 'score' : undefined}>
                <th scope="row" style={{ opacity: revealStage(p, 0.35, 0.45) }}>{object.model.tokens[index]}</th>
                <td style={{ opacity: columnT(0) }}>{fmt(dots[index])}</td>
                <td style={{ opacity: columnT(1) }}>{fmt(logs[index])}</td>
                <td style={{ opacity: columnT(2) }}>{fmt(score)}</td>
                <td className="is-weight" style={{ opacity: columnT(3) }}>{fmt(pass.attentionWeights[index] * barT(index))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="attention-readout reveal-fade" style={{ opacity: readoutT }}>
          <div><small>CONTEXT c</small><strong>[{pass.context.map((value) => fmt(value * readoutT)).join(', ')}]</strong></div>
          <div className="attention-probability-list"><small>NEXT TOKEN · W_out c + b → softmax</small>{pass.probabilities.map((probability, index) => (
            <span className={index === object.model.targetIndex ? 'is-target' : ''} key={index} data-hero-path={index === object.model.targetIndex ? 'target' : undefined}>
              <i>{object.model.tokens[index]}</i><em><b style={{ width: `${(probability * 100 * readoutT).toFixed(2)}%` }} /></em><strong>{fmt(probability * readoutT)}</strong>
            </span>
          ))}</div>
          <div className="attention-loss" data-hero-path="loss"><small>CROSS-ENTROPY</small><strong>{fmt(pass.loss * readoutT)}</strong><span>−log p(target) · p = {fmt(pass.targetProbability * readoutT)}</span></div>
        </div>
      </div>
    </section>
  )
}
