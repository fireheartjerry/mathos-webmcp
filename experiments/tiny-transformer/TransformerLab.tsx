import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LabSnapshot, TinyTransformer } from '../lib/tinyTransformer'

type LabStatus = 'loading' | 'ready' | 'training' | 'paused' | 'complete' | 'error'

const STATIONS = [
  ['Characters become coordinates', 'Token embeddings', 'Each character looks up a trainable 24-number vector.'],
  ['Order gets a signal', 'Position embeddings', 'A second vector marks where each character sits in the 16-character window.'],
  ['Useful paths get mixed', '2-head causal attention', 'Every character weighs earlier characters. The future stays hidden.'],
  ['The old route stays open', 'Residual connection', 'New context is added without erasing the incoming information path.'],
  ['Each position thinks', '24 → 48 → 24 feed-forward', 'A small neural network reshapes every position independently.'],
  ['Error moves backward', 'Cross-entropy + Adam', 'Measured prediction loss sends gradients through every trainable weight.'],
]

function LossChart({ points }: { points: Array<{ step: number; loss: number }> }) {
  const width = 520
  const height = 132
  if (!points.length) return <div className="loss-chart empty">Waiting for a real measurement.</div>
  const losses = points.map((point) => point.loss)
  const min = Math.min(...losses)
  const max = Math.max(...losses)
  const range = Math.max(max - min, 0.01)
  const maxStep = Math.max(points.at(-1)?.step ?? 1, 1)
  const path = points.map((point, index) => {
    const x = 10 + (point.step / maxStep) * (width - 20)
    const y = 10 + ((max - point.loss) / range) * (height - 28)
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="loss-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Measured loss from ${losses[0].toFixed(3)} to ${losses.at(-1)!.toFixed(3)}`}>
      <line x1="10" y1={height - 16} x2={width - 10} y2={height - 16} />
      <path d={path} />
      {points.map((point) => {
        const x = 10 + (point.step / maxStep) * (width - 20)
        const y = 10 + ((max - point.loss) / range) * (height - 28)
        return <circle key={point.step} cx={x} cy={y} r="2.7" />
      })}
      <text x="10" y={height - 3}>step 0</text>
      <text x={width - 10} y={height - 3} textAnchor="end">step {maxStep}</text>
    </svg>
  )
}

function AttentionHeatmap({ snapshot }: { snapshot: LabSnapshot }) {
  return (
    <div className="attention-inspector">
      <div className="attention-grid" style={{ '--cells': snapshot.context.length } as CSSProperties}>
        <span />
        {snapshot.context.map((char, index) => <b key={`x-${index}`}>{char === ' ' ? '·' : char}</b>)}
        {snapshot.attention.map((row, rowIndex) => [
          <b key={`y-${rowIndex}`}>{snapshot.context[rowIndex] === ' ' ? '·' : snapshot.context[rowIndex]}</b>,
          ...row.map((weight, columnIndex) => (
            <i
              key={`${rowIndex}-${columnIndex}`}
              className={columnIndex > rowIndex ? 'masked' : ''}
              style={{ '--weight': Math.max(0.04, weight) } as CSSProperties}
              title={`${snapshot.context[rowIndex]} attends to ${snapshot.context[columnIndex]}: ${(weight * 100).toFixed(1)}%`}
            />
          )),
        ])}
      </div>
      <div className="heat-legend"><span>less</span><i /><i /><i /><span>more</span></div>
    </div>
  )
}

export default function TransformerLab({ onBackPathway, onBackReceipt }: { onBackPathway: () => void; onBackReceipt: () => void }) {
  const [status, setStatus] = useState<LabStatus>('loading')
  const [model, setModel] = useState<TinyTransformer | null>(null)
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null)
  const [initialSample, setInitialSample] = useState('')
  const [points, setPoints] = useState<Array<{ step: number; loss: number }>>([])
  const [error, setError] = useState('')
  const runRef = useRef(false)
  const generationRef = useRef(0)
  const modelRef = useRef<TinyTransformer | null>(null)

  async function loadModel(generation: number) {
    setStatus('loading')
    setError('')
    try {
      const module = await import('../lib/tinyTransformer')
      const next = await module.createTinyTransformer()
      if (generation !== generationRef.current) {
        next.dispose()
        return
      }
      modelRef.current = next
      setModel(next)
      setSnapshot(next.initial)
      setInitialSample(next.initial.sample)
      setPoints([{ step: 0, loss: next.initial.loss }])
      setStatus('ready')
    } catch (reason) {
      if (generation !== generationRef.current) return
      setError(reason instanceof Error ? reason.message : 'The model could not load in this browser.')
      setStatus('error')
    }
  }

  useEffect(() => {
    const generation = generationRef.current
    void loadModel(generation)
    return () => {
      generationRef.current += 1
      runRef.current = false
      modelRef.current?.dispose()
      modelRef.current = null
    }
  }, [])

  async function runTraining() {
    const activeModel = modelRef.current
    if (!activeModel || runRef.current) return
    runRef.current = true
    setStatus('training')
    const generation = generationRef.current
    try {
      let current = snapshot?.step ?? 0
      while (runRef.current && current < 100 && generation === generationRef.current) {
        const next = await activeModel.train(Math.min(5, 100 - current))
        current = next.step
        if (generation !== generationRef.current) return
        setSnapshot(next)
        setPoints((existing) => [...existing, { step: next.step, loss: next.loss }])
      }
      if (generation === generationRef.current) setStatus(current >= 100 ? 'complete' : 'paused')
    } catch (reason) {
      if (generation !== generationRef.current) return
      runRef.current = false
      setError(reason instanceof Error ? reason.message : 'Training stopped unexpectedly.')
      setStatus('error')
    }
  }

  function pauseTraining() {
    runRef.current = false
    setStatus('paused')
  }

  function resetModel() {
    runRef.current = false
    generationRef.current += 1
    modelRef.current?.dispose()
    modelRef.current = null
    setModel(null)
    setSnapshot(null)
    setPoints([])
    setInitialSample('')
    void loadModel(generationRef.current)
  }

  const actionLabel = status === 'paused' ? 'Continue training' : status === 'complete' ? 'Training complete' : 'Train 100 real steps'

  return (
    <section className="transformer-lab enter-panel">
      <nav className="mode-nav" aria-label="Learning journey">
        <button onClick={onBackReceipt}>Evidence receipt</button><span>→</span><button onClick={onBackPathway}>Pathway</button><span>→</span><strong>Training lab</strong>
      </nav>
      <header className="lab-hero">
        <div>
          <p className="lab-kicker">Stage 10 · live destination</p>
          <h1>Teach a tiny<br /><em>transformer.</em></h1>
          <p>This is a real, small character model running in your browser—not a production LLM. It learns patterns from eight short Mathos statements.</p>
        </div>
        <div className="lab-readout" aria-live="polite">
          <span className={`lab-pulse ${status}`} />
          <small>{status === 'loading' ? 'Loading TensorFlow lazily' : status === 'error' ? 'Model unavailable' : `${model?.backend.toUpperCase()} backend`}</small>
          <strong>{snapshot ? snapshot.loss.toFixed(4) : '—'}</strong>
          <p>measured loss · step {snapshot?.step ?? 0}</p>
        </div>
      </header>

      {status === 'error' && <div className="lab-error" role="alert"><strong>The lab could not start.</strong><span>{error} The learning receipt and pathway are still available.</span></div>}

      <div className="lab-controls">
        {status === 'training'
          ? <button className="lab-primary" onClick={pauseTraining}>Pause training</button>
          : <button className="lab-primary" disabled={!model || status === 'loading' || status === 'error' || status === 'complete'} onClick={() => void runTraining()}>{actionLabel}</button>}
        <button className="lab-reset" disabled={status === 'loading'} onClick={resetModel}>Reset model</button>
        <span>Runs in 5-step chunks so the interface can breathe.</span>
      </div>

      {model && snapshot && <>
        <div className="model-strip">
          <div><span>Parameters</span><strong>{model.parameters.toLocaleString()}</strong></div>
          <div><span>Context</span><strong>{model.config.context} chars</strong></div>
          <div><span>Model width</span><strong>{model.config.dModel}</strong></div>
          <div><span>Attention</span><strong>{model.config.heads} × {model.config.headSize}</strong></div>
          <div><span>Feed-forward</span><strong>24 → {model.config.feedForward} → 24</strong></div>
          <div><span>Vocabulary</span><strong>{model.config.vocabulary} chars</strong></div>
        </div>

        <section className="lab-section stations-section">
          <div className="lab-section-heading"><span>01 / Model map</span><h2>Six stations.<br /><em>One learning path.</em></h2></div>
          <ol className="station-grid">
            {STATIONS.map(([plain, technical, copy], index) => <li key={technical}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{plain}</h3><small>{technical}</small><p>{copy}</p></div></li>)}
          </ol>
        </section>

        <section className="lab-section measurement-section">
          <div className="lab-section-heading"><span>02 / Measurement</span><h2>Loss leaves<br /><em>a trace.</em></h2><p>Every point is evaluated from the current weights on the same fixed windows. It can wobble. Learning is not a staircase.</p></div>
          <div className="loss-panel">
            <div className="loss-numbers"><span>Initial <strong>{points[0]?.loss.toFixed(4)}</strong></span><span>Current <strong>{snapshot.loss.toFixed(4)}</strong></span><span>Change <strong>{(snapshot.loss - (points[0]?.loss ?? snapshot.loss)).toFixed(4)}</strong></span></div>
            <LossChart points={points} />
          </div>
        </section>

        <section className="lab-section sample-section">
          <div className="lab-section-heading"><span>03 / Generation</span><h2>No cleanup.<br /><em>Just logits.</em></h2><p>Both samples begin with the same prompt. The rest is sampled directly from the model’s predicted character probabilities.</p></div>
          <div className="sample-pair">
            <div><span>Before training · the model’s raw sample</span><pre>{initialSample}</pre></div>
            <div><span>Step {snapshot.step} · the model’s raw sample</span><pre>{snapshot.sample}</pre></div>
          </div>
        </section>

        <section className="lab-section attention-section">
          <div className="lab-section-heading"><span>04 / One real head</span><h2>See where<br /><em>attention goes.</em></h2><p>Rows are querying characters. Columns are earlier context. Blank upper cells are the causal mask blocking future information.</p></div>
          <AttentionHeatmap snapshot={snapshot} />
        </section>
      </>}
    </section>
  )
}
