import { useCallback, useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import {
  DIAGNOSIS_ID,
  LESSON_ID,
  mountLearningTools,
} from '../lib/webmcp'
import type {
  ActionResult,
  ActivitySource,
  SemanticAction,
  Stage,
  StudioState,
} from '../lib/webmcp'
import MathosVideoPanel from './MathosVideoPanel'
import './learning-studio.css'

const PATHWAY = [
  { number: '01', label: 'From slopes to learning', meta: 'calculus' },
  { number: '02', label: 'Numbers with direction', meta: 'vectors' },
  { number: '03', label: 'Following cause and effect', meta: 'computation graphs' },
  { number: '04', label: 'Learning from mistakes', meta: 'backpropagation' },
  { number: '05', label: 'Getting better step by step', meta: 'optimization' },
  { number: '06', label: 'Choosing among possibilities', meta: 'probability' },
  { number: '07', label: 'Turning words into meaning', meta: 'tokens and embeddings' },
  { number: '08', label: 'Deciding what matters', meta: 'attention' },
  { number: '09', label: 'Building a transformer', meta: 'transformer blocks' },
  { number: '10', label: 'Teach your own tiny model', meta: 'training lab' },
]

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `mathos_${crypto.randomUUID().replaceAll('-', '')}`
  return `mathos_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function createInitialState(): StudioState {
  return {
    session_id: createSessionId(),
    stage: 'initial',
    revision: 0,
    initial_attempted: false,
    transfer_attempted: false,
    initial_message: '',
    transfer_message: '',
    used_lesson: false,
    activities: [],
  }
}

function successfulAction(
  state: StudioState,
  source: ActivitySource,
  action: string,
  changes: Partial<StudioState>,
  data: Record<string, unknown>,
): ActionResult {
  const revision = state.revision + 1
  const activity = { id: `activity-${revision}`, source, action, revision }
  const nextState = { ...state, ...changes, revision, activities: [...state.activities, activity] }
  return { ok: true, state: nextState, activity, data }
}

function transitionStudio(state: StudioState, action: SemanticAction, source: ActivitySource): ActionResult {
  switch (action.type) {
    case 'CHECK_ATTEMPT': {
      const attempt = action.attempt.trim()
      if (!attempt || action.attempt.length > 256) {
        return { ok: false, code: 'invalid_input', message: 'The attempt must be 1 to 256 characters.', recovery: 'Enter a short answer and try again.' }
      }
      if (state.stage === 'initial') {
        if (attempt === '40') {
          return successfulAction(state, source, 'Checked initial attempt · both paths found', { stage: 'initial_correct', initial_attempted: true, initial_message: '' }, { outcome: 'correct', stage: 'initial_correct' })
        }
        if (attempt === '36') {
          return successfulAction(state, source, 'Checked initial attempt · one path found', { stage: 'diagnosis', initial_attempted: true, initial_message: '' }, { outcome: 'diagnosed', stage: 'diagnosis', diagnosisId: DIAGNOSIS_ID })
        }
        return successfulAction(state, source, 'Checked initial attempt · retry needed', { initial_attempted: true, initial_message: 'Not yet. Recheck every route from x to y.' }, { outcome: 'try_again', stage: 'initial' })
      }
      if (state.stage === 'transfer') {
        if (attempt === '8') {
          return successfulAction(state, source, 'Checked transfer attempt · passed', { stage: 'receipt', transfer_attempted: true, transfer_message: '' }, { outcome: 'passed', stage: 'receipt' })
        }
        return successfulAction(state, source, 'Checked transfer attempt · retry needed', { transfer_attempted: true, transfer_message: 'Not yet. Count the q → s path and the q → product → s path.' }, { outcome: 'try_again', stage: 'transfer' })
      }
      return { ok: false, code: 'invalid_phase', message: 'There is no answer to check at this stage.', recovery: 'Read the workspace and use one of its valid next actions.' }
    }
    case 'SHOW_LESSON':
      if (action.diagnosisId !== DIAGNOSIS_ID) return { ok: false, code: 'invalid_input', message: 'The diagnosis ID does not match the visible diagnosis.', recovery: 'Use the diagnosis ID from the current workspace.' }
      if (state.stage !== 'diagnosis') return { ok: false, code: 'invalid_phase', message: 'The shared-path diagnosis is not visible.', recovery: 'Check the current attempt before opening this lesson.' }
      return successfulAction(state, source, 'Opened targeted lesson', { stage: 'lesson', used_lesson: true }, { stage: 'lesson', lessonId: LESSON_ID })
    case 'START_TRANSFER':
      if (state.stage !== 'lesson' && state.stage !== 'initial_correct') return { ok: false, code: 'invalid_phase', message: 'The session is not ready for transfer.', recovery: 'Complete the current problem or lesson first.' }
      if ((source === 'agent' || state.stage === 'lesson') && action.lessonId !== LESSON_ID) return { ok: false, code: 'invalid_input', message: 'The lesson ID does not match the visible bridge.', recovery: 'Use the lesson ID from the current workspace.' }
      return successfulAction(state, source, 'Started fresh transfer problem', { stage: 'transfer', transfer_attempted: false, transfer_message: '' }, { stage: 'transfer', problemId: 'transfer-shared-path-v1' })
    case 'RESET':
      return successfulAction(state, source, 'Restarted learning path', { stage: 'initial', initial_attempted: false, transfer_attempted: false, initial_message: '', transfer_message: '', used_lesson: false }, { stage: 'initial' })
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

function InitialProblem({ draft, setDraft, onCheck, message }: { draft: string; setDraft: (value: string) => void; onCheck: () => void; message: string }) {
  return (
    <section className="work-card enter-panel">
      <div className="section-kicker"><span>Problem 01</span><span>Calculus · computation graphs</span></div>
      <h1>Find <em>dy/dx</em> at x = 2.</h1>
      <EquationBlock />
      <div className="prompt-note"><span>Trace</span> Every way x can change y.</div>
      <AnswerForm
        value={draft}
        on_change={setDraft}
        on_submit={onCheck}
        message={message}
        label="Your answer"
      />
    </section>
  )
}

function Diagnosis({ onOpenLesson }: { onOpenLesson: () => void }) {
  return (
    <section className="work-card diagnosis-card enter-panel">
      <div className="result-mark" aria-hidden="true">×</div>
      <p className="result-label">Incorrect · useful signal</p>
      <h1>You found one path.<br /><em>There are two.</em></h1>
      <div className="diagnosis-box">
        <span className="diagnosis-code">{DIAGNOSIS_ID}</span>
        <p>You differentiated the product path, but missed the direct <strong>+ a</strong> path into y.</p>
      </div>
      <div className="mini-equation"><span>product path</span><b>36</b><i>+</i><span>direct path</span><b>4</b><i>=</i><strong>40</strong></div>
      <button className="primary-action" onClick={onOpenLesson}>Repair this idea <span aria-hidden="true">→</span></button>
    </section>
  )
}

function Lesson({ onStartTransfer }: { onStartTransfer: () => void }) {
  return (
    <section className="work-card lesson-card enter-panel">
      <div className="section-kicker green"><span>Targeted repair · shared path</span><span>{LESSON_ID}</span></div>
      <h1>One value can reach<br />the result <em>twice.</em></h1>
      <p className="lesson-lede">Plainly: changing <strong>a</strong> changes the product, and it also changes the final <strong>+ a</strong>. Both effects reach y, so both count.</p>
      <GraphLesson />
      <p className="technical-note"><span>Technical name</span> The multivariable chain rule adds the derivative contribution from every directed path.</p>
      <MathosVideoPanel />
      <button className="primary-action green-action" onClick={onStartTransfer}>Try a fresh problem <span aria-hidden="true">→</span></button>
    </section>
  )
}

function InitialCorrect({ onStartTransfer }: { onStartTransfer: () => void }) {
  return (
    <section className="work-card success-card enter-panel">
      <div className="result-mark success" aria-hidden="true">✓</div>
      <p className="result-label">Correct · 40</p>
      <h1>You counted<br /><em>both paths.</em></h1>
      <p className="lesson-lede">The product contributes 36. The direct +a path contributes 4. Together, dy/dx = 40.</p>
      <button className="primary-action green-action" onClick={onStartTransfer}>Advance to transfer <span aria-hidden="true">→</span></button>
    </section>
  )
}

function TransferProblem({ draft, setDraft, onCheck, message }: { draft: string; setDraft: (value: string) => void; onCheck: () => void; message: string }) {
  return (
    <section className="work-card transfer-card enter-panel">
      <div className="section-kicker green"><span>Transfer check</span><span>Fresh problem · no hints</span></div>
      <h1>Find <em>ds/dx</em> at x = 1.</h1>
      <EquationBlock transfer />
      <div className="prompt-note green-note"><span>Prove it</span> Use the same idea in a new setting.</div>
      <AnswerForm
        value={draft}
        on_change={setDraft}
        on_submit={onCheck}
        message={message}
        label="Your transfer answer"
      />
    </section>
  )
}

function Receipt({ state, onReset }: { state: StudioState; onReset: () => void }) {
  return (
    <section className="work-card receipt-card enter-panel">
      <div className="receipt-topline"><span>Mathos evidence receipt</span><span>Session 001</span></div>
      <div className="receipt-seal"><span>✓</span> Transfer passed</div>
      <h1>Evidence,<br /><em>not a trophy.</em></h1>
      <div className="claim-list">
        <div><span>01</span><p>You found both paths through a shared value.</p></div>
        <div><span>02</span><p>{state.used_lesson ? 'You solved a fresh problem after the lesson during this session.' : 'You solved a fresh problem without a remedial lesson during this session.'}</p></div>
        <div className="limit-claim"><span>03</span><p>This receipt does not prove permanent mastery.</p></div>
      </div>
      <div className="receipt-footer">
        <span>Observed sequence</span>
        <strong>{state.used_lesson ? '36 → lesson → 8' : '40 → 8'}</strong>
      </div>
      <div className="receipt-actions">
        <a className="continue-path" href="#pathway">Continue the path <span aria-hidden="true">→</span></a>
        <button className="text-action" onClick={onReset}>Restart session ↺</button>
      </div>
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
        {state.activities.length === 0 ? <p className="empty-activity">No actions yet.</p> : <ol>
          {state.activities.slice(-6).map((activity) => (
            <li className="done" key={activity.id}>
              <span aria-hidden="true">✓</span>
              <div><small>{activity.source} · r{activity.revision}</small>{activity.action}</div>
            </li>
          ))}
        </ol>}
      </div>
      <p className="session-note">Nothing here claims more than this session observed.</p>
    </aside>
  )
}

export default function LearningStudio() {
  const [state, setState] = useState(createInitialState)
  const [initialDraft, setInitialDraft] = useState('')
  const [transferDraft, setTransferDraft] = useState('')
  const [toolStatus, setToolStatus] = useState<'unsupported' | 'live'>('unsupported')
  const stateRef = useRef(state)
  const committedRevision = useRef(state.revision)
  const commitWaiters = useRef(new Map<number, Set<() => void>>())

  const runAction = useCallback((action: SemanticAction, source: ActivitySource) => {
    const result = transitionStudio(stateRef.current, action, source)
    if (result.ok) {
      stateRef.current = result.state
      setState(result.state)
    }
    return result
  }, [])

  const afterCommit = useCallback((revision: number) => {
    if (committedRevision.current >= revision) return Promise.resolve()
    return new Promise<void>((resolve) => {
      const waiters = commitWaiters.current.get(revision) ?? new Set()
      waiters.add(resolve)
      commitWaiters.current.set(revision, waiters)
    })
  }, [])

  useEffect(() => {
    committedRevision.current = state.revision
    for (const [revision, waiters] of commitWaiters.current) {
      if (revision <= state.revision) {
        waiters.forEach((resolve) => resolve())
        commitWaiters.current.delete(revision)
      }
    }
  }, [state.revision])

  useEffect(() => {
    let active = true
    const mounted = mountLearningTools({ getState: () => stateRef.current, runAction, afterCommit })
    mounted.registration
      .then((registered) => {
        if (active) setToolStatus(registered ? 'live' : 'unsupported')
      })
      .catch(() => {
        if (active) setToolStatus('unsupported')
      })
    return () => {
      active = false
      mounted.disconnect()
      for (const waiters of commitWaiters.current.values()) waiters.forEach((resolve) => resolve())
      commitWaiters.current.clear()
    }
  }, [afterCommit, runAction])

  function checkInitial() {
    runAction({ type: 'CHECK_ATTEMPT', attempt: initialDraft }, 'learner')
  }

  function checkTransfer() {
    runAction({ type: 'CHECK_ATTEMPT', attempt: transferDraft }, 'learner')
  }

  function startTransfer(lessonId?: string) {
    setTransferDraft('')
    runAction({ type: 'START_TRANSFER', lessonId }, 'learner')
  }

  function resetSession() {
    setInitialDraft('')
    setTransferDraft('')
    runAction({ type: 'RESET' }, 'learner')
  }

  const pathway_proven = state.stage === 'receipt'

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <a className="studio-wordmark" href="/">MATHOS<span>·</span></a>
        <p>Learning studio <span>/</span> Session 001</p>
        <div className={`session-status ${toolStatus === 'live' ? 'tools-live' : 'tools-fallback'}`}><i></i>{toolStatus === 'live' ? '5 agent tools live' : 'Use Chrome 149+ or the ChatGPT browser for agent tools'}</div>
      </header>
      <div className="studio-grid">
        <aside className={`pathway-rail ${pathway_proven ? 'pathway-unlocked' : ''}`} id="pathway">
          <div className="rail-heading"><p className="rail-label">Your pathway</p><span>10 stages</span></div>
          <ol>
            {PATHWAY.map((item, index) => (
              <li key={item.number} className={`${index === 0 && !pathway_proven ? 'active' : ''} ${index === 0 && pathway_proven ? 'proven' : ''} ${index > 0 && pathway_proven ? 'unlocked' : ''}`}>
                <span className="path-number">{index === 0 && pathway_proven ? '✓' : item.number}</span>
                <div><strong>{item.label}</strong><small>{item.meta}</small></div>
              </li>
            ))}
          </ol>
          <div className="rail-footer">
            <span>{pathway_proven ? 'Stage 01 proven' : 'Current stage'}</span>
            <strong>{pathway_proven ? 'The next nine are within reach.' : '01 / 10 · calculus'}</strong>
          </div>
        </aside>
        <main id="main-content">
          {state.stage === 'initial' && <InitialProblem draft={initialDraft} setDraft={(value) => { setInitialDraft(value); if (state.initial_message) setState((current) => ({ ...current, initial_message: '' })) }} onCheck={checkInitial} message={state.initial_message} />}
          {state.stage === 'diagnosis' && <Diagnosis onOpenLesson={() => runAction({ type: 'SHOW_LESSON', diagnosisId: DIAGNOSIS_ID }, 'learner')} />}
          {state.stage === 'lesson' && <Lesson onStartTransfer={() => startTransfer(LESSON_ID)} />}
          {state.stage === 'initial_correct' && <InitialCorrect onStartTransfer={() => startTransfer()} />}
          {state.stage === 'transfer' && <TransferProblem draft={transferDraft} setDraft={(value) => { setTransferDraft(value); if (state.transfer_message) setState((current) => ({ ...current, transfer_message: '' })) }} onCheck={checkTransfer} message={state.transfer_message} />}
          {state.stage === 'receipt' && <Receipt state={state} onReset={resetSession} />}
        </main>
        <ContextPanel state={state} />
      </div>
    </div>
  )
}
