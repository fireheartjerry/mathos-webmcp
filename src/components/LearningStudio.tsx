import { useReducer } from 'react'
import type { Dispatch, SyntheticEvent } from 'react'
import './learning-studio.css'

type Stage = 'initial' | 'diagnosis' | 'lesson' | 'initial_correct' | 'transfer' | 'receipt'

type StudioState = {
  stage: Stage
  initial_answer: string
  transfer_answer: string
  initial_message: string
  transfer_message: string
  used_lesson: boolean
}

type StudioAction =
  | { type: 'SET_INITIAL'; value: string }
  | { type: 'SUBMIT_INITIAL' }
  | { type: 'OPEN_LESSON' }
  | { type: 'START_TRANSFER' }
  | { type: 'SET_TRANSFER'; value: string }
  | { type: 'SUBMIT_TRANSFER' }
  | { type: 'RESET' }

const INITIAL_STATE: StudioState = {
  stage: 'initial',
  initial_answer: '',
  transfer_answer: '',
  initial_message: '',
  transfer_message: '',
  used_lesson: false,
}

const PATHWAY = [
  { number: '01', label: 'Differentiate a graph', meta: 'Calculus', tone: 'orange' },
  { number: '02', label: 'Track every path', meta: 'Local lesson', tone: 'green' },
  { number: '03', label: 'Move through vectors', meta: 'Next', tone: 'blue' },
  { number: '04', label: 'Build attention', meta: 'Tiny transformer', tone: 'ink' },
]

function reduceStudio(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, initial_answer: action.value, initial_message: '' }
    case 'SUBMIT_INITIAL':
      if (state.initial_answer.trim() === '40') {
        return { ...state, stage: 'initial_correct', initial_message: '' }
      }
      if (state.initial_answer.trim() === '36') {
        return { ...state, stage: 'diagnosis', initial_message: '' }
      }
      return { ...state, initial_message: 'Not yet. Recheck every route from x to y.' }
    case 'OPEN_LESSON':
      return { ...state, stage: 'lesson', used_lesson: true }
    case 'START_TRANSFER':
      return { ...state, stage: 'transfer', transfer_answer: '', transfer_message: '' }
    case 'SET_TRANSFER':
      return { ...state, transfer_answer: action.value, transfer_message: '' }
    case 'SUBMIT_TRANSFER':
      if (state.transfer_answer.trim() === '8') {
        return { ...state, stage: 'receipt', transfer_message: '' }
      }
      return { ...state, transfer_message: 'Not yet. Count the q → s path and the q → product → s path.' }
    case 'RESET':
      return INITIAL_STATE
  }
}

function EquationBlock({ transfer = false }: { transfer?: boolean }) {
  if (transfer) {
    return (
      <div className="equations" aria-label="Transfer problem equations">
        <p><span>q</span> = 2x</p>
        <p><span>k</span> = x²</p>
        <p><span>s</span> = q · k + q</p>
      </div>
    )
  }
  return (
    <div className="equations" aria-label="Initial problem equations">
      <p><span>a</span> = x²</p>
      <p><span>b</span> = 3x</p>
      <p><span>y</span> = a · b + a</p>
    </div>
  )
}

function AnswerForm({
  value,
  on_change,
  on_submit,
  message,
  label,
}: {
  value: string
  on_change: (value: string) => void
  on_submit: () => void
  message: string
  label: string
}) {
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    on_submit()
  }

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label htmlFor="answer">{label}</label>
      <div className="answer-row">
        <input
          id="answer"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => on_change(event.target.value)}
          placeholder="Enter a number"
          autoFocus
        />
        <button type="submit">Check answer <span aria-hidden="true">↗</span></button>
      </div>
      <p className="form-message" aria-live="polite">{message || 'Your reasoning stays local to this session.'}</p>
    </form>
  )
}

function GraphLesson() {
  return (
    <div className="graph-card">
      <div className="graph-heading">
        <span>One value</span>
        <span>Two paths</span>
        <span>One sum</span>
      </div>
      <svg viewBox="0 0 720 255" role="img" aria-labelledby="graph-title graph-description">
        <title id="graph-title">Computation graph showing two paths from a to y</title>
        <desc id="graph-description">The value a moves directly to y and also moves through multiplication by b before reaching y.</desc>
        <defs>
          <marker id="arrow-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c85d31" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f795f" />
          </marker>
        </defs>
        <path className="path product-path" d="M126 126 C205 126 216 74 296 74" markerEnd="url(#arrow-orange)" />
        <path className="path product-path" d="M424 74 C504 74 502 126 582 126" markerEnd="url(#arrow-orange)" />
        <path className="path direct-path" d="M126 141 C290 231 422 231 582 141" markerEnd="url(#arrow-green)" />
        <g className="node source-node">
          <rect x="32" y="94" width="94" height="64" rx="2" />
          <text x="79" y="120" textAnchor="middle">a = x²</text>
          <text className="node-note" x="79" y="142" textAnchor="middle">at x = 2</text>
        </g>
        <g className="node product-node">
          <rect x="296" y="42" width="128" height="64" rx="2" />
          <text x="360" y="69" textAnchor="middle">a · b</text>
          <text className="node-note" x="360" y="91" textAnchor="middle">product path</text>
        </g>
        <g className="node result-node">
          <rect x="582" y="94" width="106" height="64" rx="2" />
          <text x="635" y="120" textAnchor="middle">y</text>
          <text className="node-note" x="635" y="142" textAnchor="middle">add paths</text>
        </g>
        <text className="path-label product-label" x="202" y="92">contribution 36</text>
        <text className="path-label direct-label" x="305" y="218">direct contribution 4</text>
      </svg>
      <div className="graph-sum"><span>36</span><b>+</b><span>4</span><b>=</b><strong>40</strong></div>
    </div>
  )
}

function InitialProblem({ state, dispatch }: { state: StudioState; dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card enter-panel">
      <div className="section-kicker"><span>Problem 01</span><span>Calculus · computation graphs</span></div>
      <h1>Find <em>dy/dx</em> at x = 2.</h1>
      <EquationBlock />
      <div className="prompt-note"><span>Trace</span> Every way x can change y.</div>
      <AnswerForm
        value={state.initial_answer}
        on_change={(value) => dispatch({ type: 'SET_INITIAL', value })}
        on_submit={() => dispatch({ type: 'SUBMIT_INITIAL' })}
        message={state.initial_message}
        label="Your answer"
      />
    </section>
  )
}

function Diagnosis({ dispatch }: { dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card diagnosis-card enter-panel">
      <div className="result-mark" aria-hidden="true">×</div>
      <p className="result-label">Incorrect · useful signal</p>
      <h1>You found one path.<br /><em>There are two.</em></h1>
      <div className="diagnosis-box">
        <span className="diagnosis-code">shared-path omission</span>
        <p>You differentiated the product path, but missed the direct <strong>+ a</strong> path into y.</p>
      </div>
      <div className="mini-equation"><span>product path</span><b>36</b><i>+</i><span>direct path</span><b>4</b><i>=</i><strong>40</strong></div>
      <button className="primary-action" onClick={() => dispatch({ type: 'OPEN_LESSON' })}>Repair this idea <span aria-hidden="true">→</span></button>
    </section>
  )
}

function Lesson({ dispatch }: { dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card lesson-card enter-panel">
      <div className="section-kicker green"><span>Local lesson · 90 sec</span><span>Rerouted from Problem 01</span></div>
      <h1>One value can reach<br />the result <em>twice.</em></h1>
      <p className="lesson-lede">Plainly: changing <strong>a</strong> changes the product, and it also changes the final <strong>+ a</strong>. Both effects reach y, so both count.</p>
      <GraphLesson />
      <p className="technical-note"><span>Technical name</span> The multivariable chain rule adds the derivative contribution from every directed path.</p>
      <button className="primary-action green-action" onClick={() => dispatch({ type: 'START_TRANSFER' })}>Try a fresh problem <span aria-hidden="true">→</span></button>
    </section>
  )
}

function InitialCorrect({ dispatch }: { dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card success-card enter-panel">
      <div className="result-mark success" aria-hidden="true">✓</div>
      <p className="result-label">Correct · 40</p>
      <h1>You counted<br /><em>both paths.</em></h1>
      <p className="lesson-lede">The product contributes 36. The direct +a path contributes 4. Together, dy/dx = 40.</p>
      <button className="primary-action green-action" onClick={() => dispatch({ type: 'START_TRANSFER' })}>Advance to transfer <span aria-hidden="true">→</span></button>
    </section>
  )
}

function TransferProblem({ state, dispatch }: { state: StudioState; dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card transfer-card enter-panel">
      <div className="section-kicker green"><span>Transfer check</span><span>Fresh problem · no hints</span></div>
      <h1>Find <em>ds/dx</em> at x = 1.</h1>
      <EquationBlock transfer />
      <div className="prompt-note green-note"><span>Prove it</span> Use the same idea in a new setting.</div>
      <AnswerForm
        value={state.transfer_answer}
        on_change={(value) => dispatch({ type: 'SET_TRANSFER', value })}
        on_submit={() => dispatch({ type: 'SUBMIT_TRANSFER' })}
        message={state.transfer_message}
        label="Your transfer answer"
      />
    </section>
  )
}

function Receipt({ state, dispatch }: { state: StudioState; dispatch: Dispatch<StudioAction> }) {
  return (
    <section className="work-card receipt-card enter-panel">
      <div className="receipt-topline"><span>Mathos evidence receipt</span><span>Session 001</span></div>
      <div className="receipt-seal"><span>✓</span> Transfer passed</div>
      <h1>Evidence,<br /><em>not a trophy.</em></h1>
      <div className="claim-list">
        <div><span>01</span><p>You found both paths through a shared value.</p></div>
        <div><span>02</span><p>You solved a fresh problem after the lesson during this session.</p></div>
        <div className="limit-claim"><span>03</span><p>This receipt does not prove permanent mastery.</p></div>
      </div>
      <div className="receipt-footer">
        <span>Observed sequence</span>
        <strong>{state.used_lesson ? '36 → lesson → 8' : '40 → 8'}</strong>
      </div>
      <button className="text-action" onClick={() => dispatch({ type: 'RESET' })}>Restart session ↺</button>
    </section>
  )
}

function ContextPanel({ state }: { state: StudioState }) {
  const contexts: Record<Stage, { title: string; body: string; signal: string }> = {
    initial: { title: 'Watching the route', body: 'The final number can reveal which derivative paths you included.', signal: 'Awaiting answer' },
    diagnosis: { title: 'A specific miss', body: '36 is not random. It matches the product contribution exactly, without the direct +a contribution.', signal: 'Pattern found' },
    lesson: { title: 'A local reroute', body: 'Mathos selected one short explanation for the missing path. The rest of the course stays put.', signal: 'Repair in progress' },
    initial_correct: { title: 'Both paths found', body: 'The answer includes both the product route and the direct +a route.', signal: 'Ready for transfer' },
    transfer: { title: 'Now make it travel', body: 'A fresh problem checks whether the idea moves beyond the example that taught it.', signal: 'Transfer active' },
    receipt: { title: 'Claim boundary', body: 'The evidence is real and narrow: success on one fresh problem in this session.', signal: 'Evidence issued' },
  }
  const current = contexts[state.stage]
  const activities = [
    { label: 'Session opened', done: true },
    { label: 'Initial answer checked', done: state.stage !== 'initial' },
    { label: 'Targeted lesson viewed', done: state.used_lesson },
    { label: 'Fresh transfer passed', done: state.stage === 'receipt' },
  ]

  return (
    <aside className="context-panel">
      <div>
        <p className="aside-label">What Mathos noticed</p>
        <span className={`signal signal-${state.stage}`}>{current.signal}</span>
        <h2>{current.title}</h2>
        <p className="context-copy">{current.body}</p>
      </div>
      <div className="activity-block">
        <p className="aside-label">Session activity</p>
        <ol>
          {activities.map((activity) => (
            <li className={activity.done ? 'done' : ''} key={activity.label}>
              <span aria-hidden="true">{activity.done ? '✓' : '·'}</span>{activity.label}
            </li>
          ))}
        </ol>
      </div>
      <p className="session-note">Nothing here claims more than this session observed.</p>
    </aside>
  )
}

export default function LearningStudio() {
  const [state, dispatch] = useReducer(reduceStudio, INITIAL_STATE)
  const active_index = state.stage === 'initial' || state.stage === 'diagnosis' || state.stage === 'initial_correct' ? 0 : state.stage === 'lesson' ? 1 : 2

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a className="studio-wordmark" href="/">MATHOS<span>·</span></a>
        <p>Learning studio <span>/</span> Session 001</p>
        <div className="session-status"><i></i> Local session</div>
      </header>
      <div className="studio-grid">
        <aside className="pathway-rail">
          <p className="rail-label">Your pathway</p>
          <ol>
            {PATHWAY.map((item, index) => (
              <li key={item.number} className={`${item.tone} ${index === active_index ? 'active' : ''} ${index < active_index ? 'complete' : ''}`}>
                <span className="path-number">{index < active_index ? '✓' : item.number}</span>
                <div><strong>{item.label}</strong><small>{item.meta}</small></div>
              </li>
            ))}
          </ol>
          <div className="rail-footer"><span>Course horizon</span><strong>4 / 18 ideas</strong></div>
        </aside>
        <main id="main-content">
          {state.stage === 'initial' && <InitialProblem state={state} dispatch={dispatch} />}
          {state.stage === 'diagnosis' && <Diagnosis dispatch={dispatch} />}
          {state.stage === 'lesson' && <Lesson dispatch={dispatch} />}
          {state.stage === 'initial_correct' && <InitialCorrect dispatch={dispatch} />}
          {state.stage === 'transfer' && <TransferProblem state={state} dispatch={dispatch} />}
          {state.stage === 'receipt' && <Receipt state={state} dispatch={dispatch} />}
        </main>
        <ContextPanel state={state} />
      </div>
    </div>
  )
}
