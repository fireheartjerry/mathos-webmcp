'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { DEFAULT_LEARNING_RATE, createInitialTinyModel, evaluateTinyModel, trainOneStep } from '../domain/math/transformer'
import type { TrainStepResult } from '../domain/math/transformer'
import type { AttentionObject, Matrix2, TinyModelState, TrainingObject, WorldAction, WorldObject, WorldState } from '../domain/world/types'
import { revealDash, revealItem, revealProgress, revealRiseStyle, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumber, useTweenedNumbers } from './useTweenedNumber'
import { Derived, EditableNumber, useFlash } from './AttentionView'
import '../styles/reveal.css'
import '../styles/attention.css'

type Props = { object: TrainingObject; world: WorldState; run: (action: WorldAction) => void }
const fmt = (value: number, digits = 3) => value.toFixed(digits)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()
const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({ id: crypto.randomUUID(), source: 'human', summary, operations })
const LEARNING_RATE_RANGE = { min: 0.01, max: 2 }
const easeOut = (t: number) => 1 - (1 - t) ** 3

function linkedAttention(world: WorldState, id: string): AttentionObject | null {
  const candidate: WorldObject | undefined = world.objects[id]
  return candidate?.kind === 'attention' ? candidate : null
}

/** The truth boundary: a step counts only if the loss fell and the target probability rose. */
const improved = (result: TrainStepResult) => (
  result.accepted && result.after.loss < result.before.loss && result.after.targetProbability > result.before.targetProbability
)

/**
 * 1 normally; when `count` grows, starts at the fraction of the polyline that
 * was already drawn and eases to 1 so only the new segment draws in.
 */
function useSegmentDraw(count: number, ms = 420): number {
  const [draw, setDraw] = useState(1)
  const previousCount = useRef(count)
  useEffect(() => {
    const previous = previousCount.current
    previousCount.current = count
    if (count <= previous || count < 2) { setDraw(1); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setDraw(1); return }
    const from = (previous - 1) / (count - 1)
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / ms)
      setDraw(from + (1 - from) * easeOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setDraw(from)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [count, ms])
  return draw
}

const SPARK = { width: 250, height: 190, pad: 12 }

/** `draw` (0..1) draws the polyline left→right; dots and end labels follow the pen. Hover shows step and value. */
function Sparkline({ values, tone, label, draw = 1 }: { values: number[]; tone: 'loss' | 'probability'; label: string; draw?: number }) {
  const { width, height, pad } = SPARK
  const [hover, setHover] = useState<number | null>(null)
  const segment = useSegmentDraw(values.length)
  const t = Math.min(draw, segment)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1e-6, max - min)
  const x = (index: number) => pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2)
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2)
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  const reached = (index: number) => (values.length <= 1 ? t : t >= index / (values.length - 1) - 1e-6 ? 1 : 0)
  const last = values.length - 1

  const onMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    // The svg letterboxes with `meet`; map through the rendered scale so hover lands on the right step.
    const scale = Math.min(rect.width / width, rect.height / height)
    const offsetX = (rect.width - width * scale) / 2
    const fx = (event.clientX - rect.left - offsetX) / scale
    const index = Math.round(((fx - pad) / (width - pad * 2)) * Math.max(1, values.length - 1))
    setHover(Math.max(0, Math.min(last, index)))
  }
  // The hover index can outlive a history reset, so clamp it to the points that exist.
  const hoverIndex = hover !== null && values.length > 0 ? Math.min(hover, last) : null
  const tip = hoverIndex !== null
    ? { x: x(hoverIndex), y: y(values[hoverIndex]), text: `step ${hoverIndex} · ${fmt(values[hoverIndex])}` }
    : null
  const tipWidth = tip ? tip.text.length * 6.6 + 12 : 0
  const tipX = tip ? Math.max(2, Math.min(width - tipWidth - 2, tip.x - tipWidth / 2)) : 0
  const tipY = tip ? (tip.y < 34 ? tip.y + 12 : tip.y - 30) : 0

  return (
    <svg className={`training-sparkline is-${tone}`} viewBox={`0 0 ${width} ${height}`} aria-label={label} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <line className="training-sparkline-base" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
      {t > 0 && <polyline points={points} pathLength={1} style={revealDash(t)} />}
      {values.map((value, index) => (
        <circle key={index} className={index === last ? 'is-last' : undefined} cx={x(index)} cy={y(value)} r={(index === last ? 3.6 : 2.4) * reached(index)} />
      ))}
      <text x={x(0)} y={y(values[0]) + (values[0] >= values[last] ? -8 : 14)} textAnchor="start" style={{ opacity: revealStage(t, 0, 0.2) }}>{fmt(values[0])}</text>
      {values.length > 1 && (
        <text x={x(last)} y={y(values[last]) + (values[0] >= values[last] ? 15 : -9)} textAnchor="end" style={{ opacity: revealStage(t, 0.85, 1) }}>{fmt(values[last])}</text>
      )}
      {tip && (
        <g className="training-sparkline-tip" transform={`translate(${tipX.toFixed(1)} ${tipY.toFixed(1)})`}>
          <line x1={tip.x - tipX} x2={tip.x - tipX} y1={tip.y - tipY} y2={tip.y < 34 ? 0 : 22} />
          <rect width={tipWidth} height={22} rx={4} />
          <text x={tipWidth / 2} y={15} textAnchor="middle">{tip.text}</text>
        </g>
      )}
    </svg>
  )
}

/** Before → after for every cell of one matrix; arrows mark the sign of the move, flash marks a landed step. */
function MatrixDrift({ label, before, after, flash }: { label: string; before: Matrix2; after: Matrix2; flash: boolean }) {
  return (
    <div className="training-matrix">
      <span>{label}</span>
      <div>
        {after.flat().map((value, index) => {
          const previous = before.flat()[index]
          const delta = value - previous
          const moved = Math.abs(delta) > 5e-4
          return (
            <span key={index} className={`training-matrix-cell${moved ? (delta > 0 ? ' is-up' : ' is-down') : ''}${moved && flash ? ' is-changed' : ''}`} title={`Δ ${delta >= 0 ? '+' : ''}${short(delta, 4)}`}>
              <i>{short(previous, 3)}</i><em>→</em><b>{short(value, 3)}</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Honest tiny-transformer training. Reset restores the exact seeded step-zero
 * model; train calls the deterministic backtracking gradient step and commits
 * only steps that lowered the loss and raised the target probability.
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
  const startRate = object.learningRate > 0
    ? Math.min(LEARNING_RATE_RANGE.max, Math.max(LEARNING_RATE_RANGE.min, object.learningRate))
    : DEFAULT_LEARNING_RATE

  // Model before the last landed step, tracked across renders so the drift
  // panel can show "before → after" for that step; a reset or head edit
  // (step back to 0) falls back to drift since step zero.
  const [tracked, setTracked] = useState<{ model: TinyModelState; step: number; before: TinyModelState | null; steps: number }>({
    model: object.model, step: object.step, before: null, steps: 0,
  })
  if (tracked.model !== object.model) {
    const landed = object.step > tracked.step
    setTracked({ model: object.model, step: object.step, before: landed ? tracked.model : null, steps: landed ? object.step - tracked.step : 0 })
  }
  const driftBefore = tracked.before ?? initial
  const driftLabel = tracked.before ? (tracked.steps === 1 ? `LAST STEP · ${object.step - 1} → ${object.step}` : `LAST ${tracked.steps} STEPS · ${object.step - tracked.steps} → ${object.step}`) : 'SINCE STEP 0'
  const stepFlash = useFlash(object.step)

  // ---- glide every live readout -------------------------------------------
  const lossT = useTweenedNumber(pass.loss, 240)
  const probabilityT = useTweenedNumber(pass.targetProbability, 240)
  const probabilitiesT = useTweenedNumbers(pass.probabilities, 240)
  const lossDeltaT = lossT - lossHistory[0]
  const probabilityDeltaT = probabilityT - probabilityHistory[0]

  const trainSteps = (count: number) => {
    let model = object.model
    let rate = startRate
    const losses = [...object.lossHistory]
    const probabilities = [...object.probabilityHistory]
    let taken = 0
    for (let index = 0; index < count; index += 1) {
      const result = trainOneStep(model, bridgeMasses, temperature, rate)
      if (!improved(result)) break
      model = result.state
      rate = result.learningRate
      losses.push(result.lossAfter)
      probabilities.push(result.targetProbabilityAfter)
      taken += 1
    }
    if (taken === 0) return
    const nextTraining: TrainingObject = {
      ...object, model, step: object.step + taken, lossHistory: losses, probabilityHistory: probabilities, learningRate: rate,
    }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model } })
    run(humanAction(taken === 1 ? `Trained tiny model step ${object.step + 1}` : `Trained ${taken} steps`, operations))
  }

  const reset = () => {
    const model = createInitialTinyModel(bridgeMasses)
    const initialPass = evaluateTinyModel(model, bridgeMasses, temperature)
    const nextTraining: TrainingObject = { ...object, model, step: 0, lossHistory: [initialPass.loss], probabilityHistory: [initialPass.targetProbability], learningRate: 0 }
    const operations: WorldAction['operations'] = [{ type: 'put', object: nextTraining }]
    if (attention) operations.push({ type: 'put', object: { ...attention, model } })
    run(humanAction('Reset tiny model to step zero', operations))
  }

  const setLearningRate = (value: number) => {
    run(humanAction(`Set learning rate to ${short(value)}`, [{ type: 'put', object: { ...object, learningRate: value } }]))
  }

  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  // ---- staged reveal: header → metric cards → distribution → history cards → drift, then the sparklines draw --
  const p = revealProgress(object)
  const revealing = p < 1
  const headerT = revealStage(p, 0, 0.15)
  const metricT = (index: number) => revealItem(revealStage(p, 0.1, 0.4), index, 5, 1)
  const distributionT = revealStage(p, 0.3, 0.5)
  const historyT = (index: number) => revealStage(p, 0.4 + index * 0.05, 0.55 + index * 0.05)
  const driftT = revealStage(p, 0.5, 0.7)
  const sparkT = revealStage(p, 0.6, 1)
  const footerT = revealStage(p, 0.9, 1)

  return (
    <section className={`training-view reveal-root${revealing ? ' is-revealing' : ''}`} onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="training-header" style={revealRiseStyle(p, 0.01, 0.15)}>
        <div className="training-heading">
          <span className="math-object-kicker">TINY TRANSFORMER · GRADIENT STEP</span>
          <h3>One honest training step</h3>
        </div>
        <div className="training-actions">
          <button type="button" data-demo-target="train-reset" onClick={reset}>reset</button>
          <button type="button" data-demo-target="train-five" onClick={() => trainSteps(5)}>train 5 steps</button>
          <button type="button" className="training-primary" data-demo-target="train-step" onClick={() => trainSteps(1)}>train 1 step</button>
        </div>
      </header>

      <div className="training-metrics">
        <div style={revealRiseStyle(p, 0.1, 0.24)}>
          <small>STEP</small>
          <strong className={stepFlash ? 'is-changed' : undefined}>{object.step}</strong>
          <span>η {object.learningRate ? short(object.learningRate, 3) : '—'}</span>
        </div>
        <div className="is-rate" style={revealRiseStyle(p, 0.14, 0.28)}>
          <small>RATE η <span className="attention-editable-tag">editable</span></small>
          <EditableNumber value={startRate} min={LEARNING_RATE_RANGE.min} max={LEARNING_RATE_RANGE.max} step={0.01} label="Learning rate" onCommit={setLearningRate} />
          <span>line search starts here, halves until it improves</span>
        </div>
        <div style={revealRiseStyle(p, 0.18, 0.32)}>
          <small>TARGET · QUERY</small>
          <strong>{object.model.tokens[object.model.targetIndex]}</strong>
          <span>query {object.model.tokens[object.model.queryIndex]} · {attention ? 'shared with the attention card' : 'standalone'}</span>
        </div>
        <div className="is-loss" style={revealRiseStyle(p, 0.22, 0.36)}>
          <small>LOSS <Derived /></small>
          <strong>{fmt(lossT * metricT(3))}</strong>
          <span>{lossHistory.length > 1 ? `${lossDeltaT <= 0 ? '↓' : '↑'} ${fmt(Math.abs(lossDeltaT))} since step 0` : 'awaiting a step'}</span>
        </div>
        <div className="is-probability" style={revealRiseStyle(p, 0.26, 0.4)}>
          <small>P(TARGET) <Derived /></small>
          <strong>{fmt(probabilityT * metricT(4))}</strong>
          <span>{probabilityHistory.length > 1 ? `${probabilityDeltaT >= 0 ? '↑' : '↓'} ${fmt(Math.abs(probabilityDeltaT))} since step 0` : 'awaiting a step'}</span>
        </div>
      </div>

      <div className="training-body">
        <div className="training-probabilities" style={revealRiseStyle(p, 0.3, 0.5)}>
          <div className="training-card-heading"><span>OUTPUT p <Derived /></span><b>Σ p = {fmt(probabilitiesT.reduce((sum, value) => sum + value, 0) * distributionT)}</b></div>
          {probabilitiesT.map((probability, index) => (
            <div className={`training-probability${index === object.model.targetIndex ? ' is-target' : ''}`} key={index}>
              <span>{object.model.tokens[index]}</span><i><em style={{ width: `${(Math.max(0, probability) * 100 * distributionT).toFixed(2)}%` }} /></i><b>{fmt(probability * distributionT)}</b>
            </div>
          ))}
        </div>
        <div className="training-history">
          <div className="training-history-card is-loss" style={revealRiseStyle(p, 0.4, 0.55)}>
            <div className="training-card-heading"><span>LOSS · {lossHistory.length} point{lossHistory.length === 1 ? '' : 's'}</span><b style={{ flexShrink: 0 }}>{lossHistory.slice(-2).map((value) => fmt(value)).join(' → ')}</b></div>
            <Sparkline values={lossHistory} tone="loss" label="Loss history" draw={sparkT} />
          </div>
          <div className="training-history-card is-probability" style={revealRiseStyle(p, 0.45, 0.6)}>
            <div className="training-card-heading"><span>P(TARGET) · {probabilityHistory.length} point{probabilityHistory.length === 1 ? '' : 's'}</span><b style={{ flexShrink: 0 }}>{probabilityHistory.slice(-2).map((value) => fmt(value)).join(' → ')}</b></div>
            <Sparkline values={probabilityHistory} tone="probability" label="Target probability history" draw={sparkT} />
          </div>
        </div>
      </div>

      <div className="training-drift" aria-label="Parameters moved by the gradient" style={revealRiseStyle(p, 0.5, 0.7)}>
        <div className="training-card-heading"><span>WEIGHTS BEFORE → AFTER · {driftLabel}</span><b>{tracked.before ? `η = ${short(object.learningRate, 3)}` : object.step === 0 ? 'at step zero' : 'reloaded · drift since step 0'}</b></div>
        <div className="training-drift-grid">
          <MatrixDrift label="W_Q" before={driftBefore.wq} after={object.model.wq} flash={stepFlash} />
          <MatrixDrift label="W_K" before={driftBefore.wk} after={object.model.wk} flash={stepFlash} />
          <MatrixDrift label="W_V" before={driftBefore.wv} after={object.model.wv} flash={stepFlash} />
        </div>
      </div>

      <footer className="training-footnote" style={revealRiseStyle(p, 0.88, 1, { distance: 10 })}>
        central finite differences on every visible parameter · deterministic backtracking from η · a step is committed only when the loss fell and p(target) rose
      </footer>
    </section>
  )
}
