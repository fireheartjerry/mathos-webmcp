'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
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
import { useTweenedNumber, useTweenedNumbers } from './useTweenedNumber'
import '../styles/reveal.css'
import '../styles/attention.css'

type Props = { object: AttentionObject; world: WorldState; run: (action: WorldAction) => void }
type MatrixKey = 'wq' | 'wk' | 'wv'

const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({
  id: crypto.randomUUID(), source: 'human', summary, operations,
})

/** The one matrix cell the film edits: W_Q[0][0]. */
export const HERO_CELL = { key: 'wq' as MatrixKey, row: 0, column: 0 }
const MATRIX_LABELS: Record<MatrixKey, string> = { wq: 'W_Q', wk: 'W_K', wv: 'W_V' }
const MATRIX_SUBSCRIPT: Record<MatrixKey, string> = { wq: 'Q', wk: 'K', wv: 'V' }
const TEMPERATURE_RANGE = { min: 0.2, max: 3, step: 0.05 }
const FLASH_MS = 600

// Plane geometry: one unit is PLANE_SCALE pixels, origin near the lower-left.
const PLANE = { width: 392, height: 190 }
const PLANE_SCALE = 120
const ORIGIN = { x: 60, y: 154 }
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

// ---------------------------------------------------------------------------
// Shared editing primitives (TrainingView imports these too).
// ---------------------------------------------------------------------------

/**
 * True for `ms` after `key` changes. Drives the `.is-changed` flash, so a cell
 * lights whether a human typed into it or an agent tool put a new value.
 */
export function useFlash(key: string | number, ms = FLASH_MS): boolean {
  const [on, setOn] = useState(false)
  const previous = useRef(key)
  useEffect(() => {
    if (previous.current === key) return
    previous.current = key
    setOn(true)
    const timer = window.setTimeout(() => setOn(false), ms)
    return () => window.clearTimeout(timer)
  }, [key, ms])
  return on
}

type EditableNumberProps = {
  value: number
  onCommit: (value: number) => void
  label: string
  min?: number
  max?: number
  step?: number
  digits?: number
  className?: string
  demoTarget?: string
  style?: CSSProperties
}

/**
 * Inline numeric field. Local draft while typing; a single commit on Enter or
 * blur, guarded by a ref so Enter followed by blur cannot commit twice.
 * Escape drops the draft. Out-of-range values clamp instead of failing.
 */
export function EditableNumber({ value, onCommit, label, min, max, step = 0.01, digits = 2, className, demoTarget, style }: EditableNumberProps) {
  const [draft, setDraftState] = useState<string | null>(null)
  const draftRef = useRef<string | null>(null)
  const setDraft = (next: string | null) => { draftRef.current = next; setDraftState(next) }
  const changed = useFlash(value)

  const commit = () => {
    const pending = draftRef.current
    if (pending === null) return
    setDraft(null)
    if (pending.trim() === '') return
    let next = Number(pending)
    if (!Number.isFinite(next)) return
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    if (Math.abs(next - value) < 1e-12) return
    onCommit(next)
  }
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); commit() }
    if (event.key === 'Escape') { event.preventDefault(); setDraft(null); event.currentTarget.blur() }
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      aria-label={label}
      data-demo-target={demoTarget}
      className={`editable-number${className ? ` ${className}` : ''}${changed ? ' is-changed' : ''}`}
      style={style}
      value={draft ?? short(value, digits)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
    />
  )
}

/** Tag for a read-only value that is recomputed from the editable inputs. */
export const Derived = () => <i className="derived-tag" title="Recomputed from the inputs; not editable">derived</i>

// ---------------------------------------------------------------------------

export default function AttentionView({ object, world, run }: Props) {
  const [heroActive, setHeroActive] = useState(false)
  const heroTimerRef = useRef<number | null>(null)
  const [temperatureDraft, setTemperatureDraft] = useState<number | null>(null)
  const temperature = temperatureDraft ?? object.temperature
  const tokens = object.model.tokens
  const queryIndex = Math.max(0, Math.min(2, object.model.queryIndex))
  const targetIndex = Math.max(0, Math.min(2, object.model.targetIndex))

  const pass = useMemo(
    () => evaluateTinyModel(object.model, object.bridgeMasses, temperature),
    [object.model, object.bridgeMasses, temperature],
  )
  const logs = useMemo(() => logMasses(object.bridgeMasses), [object.bridgeMasses])
  const query = pass.queries[queryIndex]
  const dots = pass.keys.map((key) => (query[0] * key[0] + query[1] * key[1]) / Math.sqrt(2))
  const markerId = `attention-arrow-${object.id}`
  const contextMarkerId = `attention-context-${object.id}`

  // ---- glide every live number: plane geometry, weights, scores, readouts ----
  const geometry = useTweenedNumbers(
    [...object.model.embeddings.flat(), ...query, ...pass.keys.flat(), ...pass.values.flat(), ...pass.context],
    280,
  )
  const pair = (offset: number): Vector2 => [geometry[offset], geometry[offset + 1]]
  const embeddingsT = [pair(0), pair(2), pair(4)]
  const queryT = pair(6)
  const keysT = [pair(8), pair(10), pair(12)]
  const valuesT = [pair(14), pair(16), pair(18)]
  const contextT = pair(20)
  const weightsT = useTweenedNumbers(pass.attentionWeights, 240)
  const scoresT = useTweenedNumbers([...dots, ...logs, ...pass.scores], 240)
  const probabilitiesT = useTweenedNumbers(pass.probabilities, 240)
  const lossT = useTweenedNumber(pass.loss, 240)
  const targetProbabilityT = useTweenedNumber(pass.targetProbability, 240)
  const weightSumT = weightsT.reduce((sum, weight) => sum + weight, 0)
  const strongest = pass.attentionWeights.indexOf(Math.max(...pass.attentionWeights))

  // ---- staged reveal: matrix rows → score columns and softmax bars → readouts --
  const p = revealProgress(object)
  const revealing = p < 1
  const headerT = revealStage(p, 0, 0.15)
  const rowT = (row: number) => revealStage(p, row * 0.2, row * 0.2 + 0.2)
  const planeT = revealStage(p, 0, 0.2)
  const tokenT = (index: number) => revealStage(p, 0.2 + index * 0.05, 0.35 + index * 0.05)
  const controlT = revealStage(p, 0.3, 0.45)
  const vectorT = revealStage(p, 0.1, 0.5)
  const arcT = revealStage(p, 0.4, 0.6)
  const columnT = (column: number) => revealStage(p, 0.4 + column * 0.1, 0.5 + column * 0.1)
  const barT = (index: number) => revealItem(revealStage(p, 0.4, 0.8), index, 3, 0.6)
  const readoutT = revealStage(p, 0.8, 1)
  const footerT = revealStage(p, 0.9, 1)
  const grow = (tip: { x: number; y: number }) => revealLerp(ORIGIN, tip, vectorT)

  // The hero causality sweep plays whenever W_Q[0][0] changes, whoever changed it.
  const heroValue = object.model[HERO_CELL.key][HERO_CELL.row][HERO_CELL.column]
  const heroPrevious = useRef(heroValue)
  useEffect(() => {
    if (heroPrevious.current === heroValue) return
    heroPrevious.current = heroValue
    if (heroTimerRef.current !== null) window.clearTimeout(heroTimerRef.current)
    setHeroActive(true)
    heroTimerRef.current = window.setTimeout(() => setHeroActive(false), 1900)
    return () => { if (heroTimerRef.current !== null) window.clearTimeout(heroTimerRef.current) }
  }, [heroValue])

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

  const commitCell = (key: MatrixKey, row: number, column: number, value: number) => {
    const model: TinyModelState = structuredClone(object.model)
    model[key][row][column] = value
    commit({ ...object, model }, `Edited ${MATRIX_LABELS[key]}[${row}][${column}] to ${short(value)}`)
  }
  const commitEmbedding = (token: number, axis: number, value: number) => {
    const model: TinyModelState = structuredClone(object.model)
    model.embeddings[token][axis] = value
    commit({ ...object, model }, `Edited e${subscript(token)}[${axis}] to ${short(value)}`)
  }
  const chooseQuery = (index: number) => {
    if (index === queryIndex) return
    commit({ ...object, model: { ...structuredClone(object.model), queryIndex: index } }, `Chose ${tokens[index]} as the query`)
  }
  const chooseTarget = (index: number) => {
    if (index === targetIndex) return
    commit({ ...object, model: { ...structuredClone(object.model), targetIndex: index } }, `Chose ${tokens[index]} as the target`)
  }
  const commitTemperature = (value: number) => {
    const clamped = Math.min(TEMPERATURE_RANGE.max, Math.max(TEMPERATURE_RANGE.min, value))
    if (Math.abs(clamped - object.temperature) < 1e-9) return
    commit({ ...object, temperature: clamped }, `Set temperature to ${short(clamped)}`)
  }
  const settleSlider = () => {
    const pending = temperatureDraft
    if (pending === null) return
    setTemperatureDraft(null)
    commitTemperature(pending)
  }
  const temperatureFlash = useFlash(object.temperature)

  const matrix = (key: MatrixKey) => (
    <fieldset className={`attention-matrix is-${key}`} data-hero-path={key === HERO_CELL.key ? 'cell' : undefined}>
      <legend>W<sub>{MATRIX_SUBSCRIPT[key]}</sub></legend>
      <div className="attention-matrix-grid">
        {object.model[key].map((row, rowIndex) => row.map((value, columnIndex) => {
          const isHero = key === HERO_CELL.key && rowIndex === HERO_CELL.row && columnIndex === HERO_CELL.column
          return (
            <EditableNumber
              key={`${rowIndex}-${columnIndex}`}
              value={value}
              min={-3}
              max={3}
              label={`${MATRIX_LABELS[key]} row ${rowIndex + 1} column ${columnIndex + 1}`}
              className={isHero ? 'is-hero' : undefined}
              demoTarget={isHero ? 'attention-matrix-cell' : undefined}
              style={revealing ? { opacity: rowT(rowIndex) } : undefined}
              onCommit={(next) => commitCell(key, rowIndex, columnIndex, next)}
            />
          )
        }))}
      </div>
    </fieldset>
  )

  const arcs = keysT.map((key, index) => arcPath(queryT, key, 30 + index * 13))
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  return (
    <section className={`attention-view reveal-root${heroActive ? ' is-hero-active' : ''}${revealing ? ' is-revealing' : ''}`} onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="attention-header reveal-fade" style={{ opacity: headerT }}>
        <div className="attention-heading">
          <span className="math-object-kicker">TINY TRANSFORMER · ONE HEAD · 2-D EMBEDDINGS</span>
          <h3>Attention is a weighted sum</h3>
        </div>
        <div className="attention-meta">
          <span>softmax over (q·kⱼ/√2 + log wⱼ) / T</span>
          <b>T = {short(temperature)} · query {tokens[queryIndex]} · target {tokens[targetIndex]}</b>
        </div>
      </header>

      <div className="attention-body">
        <div className="attention-plane-wrap">
          <svg className="attention-plane" viewBox={`0 0 ${PLANE.width} ${PLANE.height}`} aria-label="Query, key and value vectors with attention angles">
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
              <marker id={contextMarkerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" /></marker>
            </defs>
            <rect className="attention-plane-paper" width={PLANE.width} height={PLANE.height} />
            <line className="attention-axis" x1={ORIGIN.x - 40} x2={PLANE.width - 10} y1={ORIGIN.y} y2={ORIGIN.y} pathLength={1} style={revealDash(planeT)} />
            <line className="attention-axis" x1={ORIGIN.x} x2={ORIGIN.x} y1={ORIGIN.y + 26} y2={30} pathLength={1} style={revealDash(planeT)} />
            <text className="attention-plane-kicker" x={12} y={15} style={{ opacity: planeT }}>
              <tspan x={12} dy="0">KEYS k = W_K e</tspan>
              <tspan x={12} dy="11">QUERY q = W_Q e</tspan>
            </text>
            {arcs.map((arc, index) => (
              <g key={`arc-${index}`} className={`attention-arc${index === strongest ? ' is-strongest' : ''}`} data-hero-path="score" style={{ opacity: arcT }}>
                <path d={arc.d} pathLength={1} style={revealDash(arcT)} />
                <text x={arc.label.x} y={arc.label.y} textAnchor="middle">{short(arc.degrees, 0)}°</text>
              </g>
            ))}
            {vectorT > 0 && valuesT.map((value, index) => {
              const tip = grow(toPlane(value))
              return <line key={`v-${index}`} className="attention-value-vector" x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} />
            })}
            {vectorT > 0 && keysT.map((key, index) => {
              const tip = grow(toPlane(key))
              return (
                <g key={`k-${index}`} className="attention-key-vector">
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${markerId})`} />
                  <text x={tip.x + 6} y={tip.y - 6} style={{ opacity: vectorT }}>k{subscript(index)}</text>
                </g>
              )
            })}
            {vectorT > 0 && (() => {
              const tip = grow(toPlane(contextT))
              // Nudge the label further from its tip when it would land on top of a key label.
              const crowded = keysT.some((key) => { const kt = grow(toPlane(key)); return Math.hypot(kt.x - tip.x, kt.y - tip.y) < 10 })
              return (
                <g className="attention-context-vector" data-hero-path="context">
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${contextMarkerId})`} />
                  <text x={tip.x + 7} y={tip.y + (crowded ? 24 : 14)} style={{ opacity: vectorT }}>c = Σ αⱼ vⱼ</text>
                </g>
              )
            })()}
            {vectorT > 0 && (() => {
              const tip = grow(toPlane(queryT))
              // Same guard for the query label, which can coincide with a key tip (e.g. editing W_Q until q≈k).
              const crowded = keysT.some((key) => { const kt = grow(toPlane(key)); return Math.hypot(kt.x - tip.x, kt.y - tip.y) < 10 })
              return (
                <g className="attention-query-vector" data-hero-path="query">
                  <line x1={ORIGIN.x} y1={ORIGIN.y} x2={tip.x} y2={tip.y} markerEnd={`url(#${markerId})`} />
                  <text x={tip.x + 7} y={tip.y + (crowded ? -20 : -8)} style={{ opacity: vectorT }}>q = W_Q e{subscript(queryIndex)}</text>
                </g>
              )
            })()}
            {embeddingsT.map((embedding, index) => {
              const at = toPlane(embedding)
              return (
                <g key={`e-${index}`} className={`attention-embedding${index === queryIndex ? ' is-query' : ''}${index === targetIndex ? ' is-target' : ''}`} style={{ opacity: planeT }}>
                  <circle cx={at.x} cy={at.y} r="4" />
                  <text x={at.x + 7} y={at.y + 4}>e{subscript(index)} · {tokens[index]}</text>
                </g>
              )
            })}
          </svg>

          <div className="attention-ribbons" data-hero-path="ribbon" aria-label="Attention weights as ribbon widths">
            <div className="attention-section-heading" style={{ opacity: revealStage(p, 0.35, 0.45) }}><span className="attention-kicker">SOFTMAX WEIGHTS α</span><Derived /><b>Σ α = {fmt(weightSumT * revealStage(p, 0.75, 0.85))}</b></div>
            {weightsT.map((weight, index) => (
              <div key={index} className={`attention-ribbon${index === targetIndex ? ' is-target' : ''}${index === strongest ? ' is-strongest' : ''}`} style={{ opacity: revealStage(p, 0.35, 0.45) }}>
                <span>α{subscript(index)} · {tokens[index]}</span>
                <i><em style={{ width: `${(Math.max(0, weight) * 100 * barT(index)).toFixed(2)}%` }} /></i>
                <b>{fmt(weight * barT(index))}</b>
              </div>
            ))}
          </div>

          <div className="attention-tokens" role="radiogroup" aria-label="Tokens and embeddings; pick one as the query">
            <div className="attention-section-heading" style={{ opacity: tokenT(0) }}><span className="attention-kicker">EMBEDDINGS e · CLICK A TOKEN TO QUERY</span><span className="attention-editable-tag">editable</span></div>
            {object.model.embeddings.map((embedding, index) => (
              <div key={index} className={`attention-token${index === queryIndex ? ' is-query' : ''}${index === targetIndex ? ' is-target' : ''}`} style={{ opacity: tokenT(index) }}>
                <button type="button" role="radio" aria-checked={index === queryIndex} onClick={() => chooseQuery(index)} title={`Make ${tokens[index]} the query`}>
                  <i aria-hidden="true" /><span>e{subscript(index)} · {tokens[index]}</span>
                </button>
                <EditableNumber value={embedding[0]} min={-3} max={3} label={`Embedding ${tokens[index]} x`} onCommit={(next) => commitEmbedding(index, 0, next)} />
                <EditableNumber value={embedding[1]} min={-3} max={3} label={`Embedding ${tokens[index]} y`} onCommit={(next) => commitEmbedding(index, 1, next)} />
                <small>{index === queryIndex && index === targetIndex ? 'query · target' : index === queryIndex ? 'query' : index === targetIndex ? 'target' : ''}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="attention-side">
          <div className="attention-matrices">{matrix('wq')}{matrix('wk')}{matrix('wv')}</div>

          <div className="attention-controls reveal-fade" style={{ opacity: controlT }}>
            <div className="attention-temperature">
              <span className="attention-kicker">TEMPERATURE T</span>
              <input
                type="range"
                min={TEMPERATURE_RANGE.min}
                max={TEMPERATURE_RANGE.max}
                step={TEMPERATURE_RANGE.step}
                value={temperature}
                aria-label="Temperature slider"
                onChange={(event) => setTemperatureDraft(Number(event.target.value))}
                onPointerUp={settleSlider}
                onKeyUp={settleSlider}
                onBlur={settleSlider}
              />
              <EditableNumber
                value={object.temperature}
                min={TEMPERATURE_RANGE.min}
                max={TEMPERATURE_RANGE.max}
                step={TEMPERATURE_RANGE.step}
                label="Temperature value"
                className={temperatureFlash ? 'is-changed' : undefined}
                onCommit={commitTemperature}
              />
            </div>
            <div className="attention-target" role="radiogroup" aria-label="Target token">
              <span className="attention-kicker">TARGET</span>
              <div>
                {tokens.map((token, index) => (
                  <button key={index} type="button" role="radio" aria-checked={index === targetIndex} className={index === targetIndex ? 'is-on' : undefined} onClick={() => chooseTarget(index)}>{token}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="attention-scores">
          <div className="attention-section-heading" style={{ opacity: revealStage(p, 0.35, 0.45) }}><span className="attention-kicker">SCORES → SOFTMAX</span><Derived /></div>
          <table className="attention-score-table" aria-label="Scores and softmax weights">
            <thead style={{ opacity: revealStage(p, 0.35, 0.45) }}>
              <tr><th scope="col">token</th><th scope="col">q·kⱼ/√2</th><th scope="col">+ log wⱼ</th><th scope="col">÷ T</th><th scope="col">αⱼ</th></tr>
            </thead>
            <tbody>
              {pass.scores.map((_, index) => (
                <tr key={index} className={index === queryIndex ? 'is-query' : undefined} data-hero-path={index === targetIndex ? 'score' : undefined}>
                  <th scope="row" style={{ opacity: revealStage(p, 0.35, 0.45) }}>{tokens[index]}</th>
                  <td style={{ opacity: columnT(0) }}>{fmt(scoresT[index])}</td>
                  <td style={{ opacity: columnT(1) }}>{fmt(scoresT[3 + index])}</td>
                  <td style={{ opacity: columnT(2) }}>{fmt(scoresT[6 + index])}</td>
                  <td className="is-weight" style={{ opacity: columnT(3) }}>{fmt(weightsT[index] * barT(index))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="attention-readout reveal-fade" style={{ opacity: readoutT }}>
            <div className="attention-readout-left">
              <div className="attention-context">
                <span className="attention-kicker">CONTEXT c <Derived /></span>
                <strong>[{fmt(contextT[0] * readoutT)}, {fmt(contextT[1] * readoutT)}]</strong>
              </div>
              <div className="attention-loss" data-hero-path="loss">
                <span className="attention-kicker">LOSS <Derived /></span>
                <strong>{fmt(lossT * readoutT)}</strong>
                <span>−log p(target), p = {fmt(targetProbabilityT * readoutT)}</span>
              </div>
            </div>
            <div className="attention-probability-list">
              <span className="attention-kicker">NEXT TOKEN p <Derived /></span>
              {probabilitiesT.map((probability, index) => (
                <div className={`attention-probability${index === targetIndex ? ' is-target' : ''}`} key={index} data-hero-path={index === targetIndex ? 'target' : undefined}>
                  <i>{tokens[index]}</i><em><b style={{ width: `${(Math.max(0, probability) * 100 * readoutT).toFixed(2)}%` }} /></em><strong>{fmt(probability * readoutT)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="attention-footnote" style={{ opacity: footerT }}>
        weights, embeddings, temperature and the query/target choice are yours · everything tagged derived is recomputed on every edit
      </footer>
    </section>
  )
}

const SUBSCRIPTS = ['₀', '₁', '₂']
function subscript(index: number) { return SUBSCRIPTS[index] ?? String(index) }
