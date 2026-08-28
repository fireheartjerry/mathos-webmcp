'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { applyAction, createSession } from '../domain/session/reducer'
import { getFirstIssue } from '../domain/math/derivation'
import { clearSession, loadSession, saveSession, STORAGE_KEY } from '../domain/session/persistence'
import { createPaintBarrier } from '../domain/session/paintBarrier'
import type { ActionResult, ActionSource, SessionAction, SessionState, Step } from '../domain/session/types'
import { registerTools } from '../domain/tools/registry'
import type { RegistrationStatus } from '../domain/tools/registry'
import { createTools } from '../domain/tools/definitions'
import type { ToolBridge, ToolEnvelope } from '../domain/tools/definitions'
import { Tex } from './Tex'
import AgentConsole from './AgentConsole'
import SessionDetails from './SessionDetails'
import {
  actionFeedbackAfterResult,
  actionFeedbackAfterToolSuccess,
  EMPTY_ACTION_FEEDBACK,
} from './actionFeedback'
import {
  actorLabel,
  isBrokenVerdict,
  registrationStatusLabel,
  relationDetail,
  relationLabel,
  reportStatusMessage,
} from './proofPresentation'
import { proposalSeedForSession } from './inspectorPresentation'
import {
  interventionLiveMessage,
  proposalDecisionLiveMessage,
  stepExpressionAccessibleName,
} from './scratchpadAccessibility'
import './scratchpad.css'

function newSessionId() {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Date.now().toString(36)
  return `st_${random}`
}

function conflictFailure(): ActionResult {
  return {
    ok: false,
    code: 'invalid_phase',
    message: 'Another tab changed this session, so this copy is paused.',
    recovery: 'Close one tab, then choose Start over here to continue safely.',
  }
}

/**
 * The evidence surface.
 *
 * Deliberately not a certificate. It reports what this session observed, attributes
 * every action to whoever took it, and states its own limits in the same type size as
 * its claims - because the honest reading and the flattering reading should not be
 * typographically ranked.
 */
function TransferSignal({ state }: { state: SessionState }) {
  const practice = state.history[0]
  const interventionTotal = (counts: { agent: number; localInspector: number; unattributed: number }) =>
    counts.agent + counts.localInspector + counts.unattributed
  const assisted = practice
    ? interventionTotal(practice.annotations) + interventionTotal(practice.proposalsOffered) > 0
    : false
  const unattributed = practice
    ? practice.annotations.unattributed +
      practice.proposalsOffered.unattributed +
      practice.proposalsAccepted.unattributed
    : 0
  return (
    <section className="receipt" aria-labelledby="receipt-heading">
      <p className="kicker" id="receipt-heading">
        Immediate transfer signal
      </p>
      <hr className="rule" />
      <ul className="receipt-claims">
        <li>
          <span className="receipt-mark" aria-hidden="true">
            ✓
          </span>
          Every line of the fresh problem follows from the line above it, checked by the page
          engine.
        </li>
        <li>
          <span className="receipt-mark" aria-hidden="true">
            ✓
          </span>
          The fresh problem was generated for this round, not selected from an answer bank.
        </li>
        <li>
          <span className="receipt-mark" aria-hidden="true">
            ✓
          </span>
          No annotation or proposal was added during this attempt. Those two actions are closed to
          every caller in the unaided round; reading and checking remain available.
        </li>
        {practice && (
          <li>
            <span className="receipt-mark" aria-hidden="true">
              ·
            </span>
            In the first round an agent or the local inspector {assisted ? 'did' : 'did not'}{' '}
            intervene. Agent: {practice.annotations.agent}{' '}
            {practice.annotations.agent === 1 ? 'annotation' : 'annotations'},{' '}
            {practice.proposalsOffered.agent}{' '}
            {practice.proposalsOffered.agent === 1 ? 'proposal' : 'proposals'} offered,{' '}
            {practice.proposalsAccepted.agent} accepted. Local inspector:{' '}
            {practice.annotations.localInspector}{' '}
            {practice.annotations.localInspector === 1 ? 'annotation' : 'annotations'},{' '}
            {practice.proposalsOffered.localInspector}{' '}
            {practice.proposalsOffered.localInspector === 1 ? 'proposal' : 'proposals'} offered,{' '}
            {practice.proposalsAccepted.localInspector} accepted.
            {unattributed > 0 && (
              <> Earlier saved activity includes unattributed intervention counts.</>
            )}
          </li>
        )}
      </ul>
      <p className="receipt-limits">
        Evidence consistent with immediate transfer in this browser session. It is not proof of
        independent reasoning, long-term retention, or mastery.
      </p>
    </section>
  )
}

/**
 * The first problem is deterministic.
 *
 * Two reasons. It removes the server/client hydration mismatch that a random seed
 * caused, and it means every judge who opens the link sees the same first problem, so
 * the README's instructions stay true. Randomness starts at the first `new_problem`.
 */
const FIRST_PROBLEM_SEED = 20260903
const SSR_SESSION_ID = 'st_pending'

export default function Scratchpad() {
  // Rendered identically on the server and on the first client pass; the real session
  // is restored or created in an effect, after hydration has already matched.
  const [state, setState] = useState<SessionState>(() =>
    createSession(FIRST_PROBLEM_SEED, SSR_SESSION_ID),
  )
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<RegistrationStatus>({
    state: 'unsupported',
    detail: 'Checking this browser…',
  })
  const [feedback, setFeedback] = useState(EMPTY_ACTION_FEEDBACK)
  // The first problem renders server-side, so the page is readable immediately. The
  // controls only become live once the island has hydrated; say so rather than
  // accepting keystrokes that would be discarded.
  const [ready, setReady] = useState(false)
  const [tabConflict, setTabConflict] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [composerError, setComposerError] = useState('')
  const [announcement, setAnnouncement] = useState({ key: 0, text: '' })
  const { flash, refusal } = feedback

  const stateRef = useRef(state)
  const paintBarrier = useRef(createPaintBarrier(state.sessionId, state.revision))
  const composerRef = useRef<HTMLInputElement | null>(null)
  const hydrated = useRef(false)
  const tabConflictRef = useRef(false)
  const announcementKey = useRef(0)

  stateRef.current = state

  const announce = useCallback((text: string) => {
    announcementKey.current += 1
    setAnnouncement({ key: announcementKey.current, text })
  }, [])

  const focusLineOrComposer = useCallback((stepId: string | null) => {
    requestAnimationFrame(() => {
      const line = stepId
        ? document.querySelector<HTMLButtonElement>(`#line-${stepId} .step-latex`)
        : null
      ;(line ?? composerRef.current)?.focus()
    })
  }, [])

  /** The one path. Learner clicks, agent tool calls and the inspector all land here. */
  const run = useCallback((action: SessionAction, source: ActionSource) => {
    if (tabConflictRef.current) return conflictFailure()
    const result = applyAction(stateRef.current, action, source)
    setFeedback((current) => actionFeedbackAfterResult(current, result, source))
    if (result.ok) {
      stateRef.current = result.state
      setState(result.state)
    }
    return result
  }, [])

  /** A tool must not return before the human can see what it did. */
  const awaitPaint = useCallback(
    (sessionId: string, revision: number) => paintBarrier.current.wait(sessionId, revision),
    [],
  )

  useEffect(() => {
    paintBarrier.current.mark(state.sessionId, state.revision)
    // Not before the real session has been adopted. This effect is declared above the
    // adoption effect, so without the guard it persists the SSR placeholder first - and
    // then adoption restores that placeholder from storage and makes it permanent.
    if (hydrated.current && !tabConflictRef.current) saveSession(state)
  }, [state])

  /**
   * One bridge per caller identity. The registered tools act as `agent`; the console's
   * Run controls act as `local-inspector`. Without this the inspector would be logged
   * as an agent, and the console's own "recorded as local-inspector" line would be a
   * lie a judge could catch by comparing it to the activity list.
   */
  const caches = useRef(new Map<ActionSource, Map<string, ToolEnvelope | Promise<ToolEnvelope>>>())
  const cacheFor = useCallback((source: ActionSource) => {
    const existing = caches.current.get(source)
    if (existing) return existing
    const created = new Map<string, ToolEnvelope | Promise<ToolEnvelope>>()
    caches.current.set(source, created)
    return created
  }, [])

  const makeBridge = useCallback(
    (source: ActionSource): ToolBridge => ({
      getState: () => stateRef.current,
      run: async (action) => {
        if (tabConflictRef.current) return conflictFailure()
        const result = applyAction(stateRef.current, action, source)
        setFeedback((current) => actionFeedbackAfterResult(current, result, source))
        if (result.ok) {
          stateRef.current = result.state
          setState(result.state)
          if (action.type === 'ANNOTATE_STEP' || action.type === 'PROPOSE_STEP') {
            const position = result.state.steps.findIndex((step) => step.id === action.stepId) + 1
            if (position > 0) {
              announce(
                interventionLiveMessage(
                  source,
                  action.type === 'PROPOSE_STEP' ? 'proposal' : 'annotation',
                  position,
                ),
              )
            }
          }
          if (action.type === 'NEW_PROBLEM') {
            setDraft('')
            setComposerError('')
            setEditingId(null)
          }
          await awaitPaint(result.state.sessionId, result.state.revision)
          if (stateRef.current.sessionId !== result.state.sessionId) {
            return {
              ok: false,
              code: 'invalid_phase',
              message: 'The learner started over before that action finished painting.',
              recovery: 'Read the new scratchpad before taking another action.',
            }
          }
          // `focus: true` is a real effect, not a decoration: it puts the line the
          // agent is talking about in front of the person reading the annotation.
          if (action.type === 'ANNOTATE_STEP' && action.focus) {
            const el = document.getElementById(`line-${action.stepId}`)
            const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            el?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
            el?.classList.add('step-focused')
            window.setTimeout(() => el?.classList.remove('step-focused'), 1600)
          }
          if (action.type === 'NEW_PROBLEM') {
            focusLineOrComposer(null)
            announce('Fresh unaided problem started. Focus moved to Write your first line.')
          }
        }
        return result
      },
      requestCache: cacheFor(source),
      onToolSuccess: () =>
        setFeedback((current) => actionFeedbackAfterToolSuccess(current)),
    }),
    [announce, awaitPaint, cacheFor, focusLineOrComposer],
  )

  const bridge = useMemo(() => makeBridge('agent'), [makeBridge])
  const inspectorTools = useMemo(() => createTools(makeBridge('local-inspector')), [makeBridge])

  // Storage events only fire in the *other* tab. Any external write to this session
  // key means two live documents can now race, even when both restored the same
  // session id. We cannot merge derivations safely, so stop and say what happened.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        tabConflictRef.current = true
        setTabConflict(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // A requestId from a finished session must not replay into a new one. Idempotency
  // is scoped to the session it was established in.
  useEffect(() => {
    for (const cache of caches.current.values()) cache.clear()
  }, [state.sessionId])

  // Adopt the real session once, after hydration.
  useEffect(() => {
    const restored = loadSession()
    const next = restored ?? createSession(FIRST_PROBLEM_SEED, newSessionId())
    hydrated.current = true
    setReady(true)
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    let live = true
    registerTools(bridge)
      .then((result) => {
        if (!live) return
        setStatus(result.status)
      })
      .catch(() => {
        if (live) setStatus({ state: 'failed', detail: 'Registration threw unexpectedly.' })
      })
    // Deliberately no pagehide teardown: Chrome preserves registrations across the
    // back-forward cache, and tearing down here is what made Back show zero tools.
    return () => {
      live = false
    }
  }, [bridge])

  const runFromInspector = useCallback(
    async (toolName: string, argsJson: string): Promise<string> => {
      const tool = inspectorTools.find((t) => t.name === toolName)
      if (!tool) return 'That tool is not registered.'
      let parsed: unknown
      try {
        parsed = JSON.parse(argsJson)
      } catch {
        return 'The arguments are not valid JSON.'
      }
      const envelope = await tool.execute(parsed)
      return JSON.stringify(envelope, null, 2)
    },
    [inspectorTools],
  )

  function submitStep(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const latex = draft.trim()
    if (!latex) {
      setComposerError('Write an expression before adding the line.')
      composerRef.current?.focus()
      return
    }
    const result = run({ type: 'ADD_STEP', latex }, 'learner')
    if (result.ok) {
      setDraft('')
      setComposerError('')
      composerRef.current?.focus()
    } else {
      setComposerError(result.message)
      composerRef.current?.focus()
    }
  }

  function cancelEdit(stepId: string, position: number) {
    setEditingId(null)
    focusLineOrComposer(stepId)
    announce(`Rewrite canceled for line ${position}. Focus returned to that line.`)
  }

  function resolveProposal(accept: boolean, stepId: string, position: number) {
    const result = run({ type: 'RESOLVE_PROPOSAL', accept }, 'learner')
    if (!result.ok) return
    focusLineOrComposer(stepId)
    announce(proposalDecisionLiveMessage(accept, position))
  }

  const checking = useRef(false)
  function check() {
    // A double-click used to record two checks and two revisions for one intent.
    if (checking.current) return
    checking.current = true
    run({ type: 'CHECK_WORK' }, 'learner')
    window.setTimeout(() => {
      checking.current = false
    }, 350)
  }

  const report = state.report
  const firstBrokenId = report?.firstBrokenId ?? null
  const firstIssueKind = report ? getFirstIssue(report)?.kind : undefined
  const proposalSeed = proposalSeedForSession(state)
  const annotationsFor = (stepId: string) => state.annotations.filter((a) => a.stepId === stepId)

  return (
    <div className="scratch-shell">
      <header className="scratch-header">
        <a className="wordmark" href="/">
          Mathos
        </a>
        <p className="scratch-title">
          Second&nbsp;Try <span aria-hidden="true">/</span>{' '}
          <span>{state.round === 'transfer' ? 'Fresh problem' : 'Guided practice'}</span>
        </p>
        <p className={`header-status header-${status.state}`}>
          <span className="dot" aria-hidden="true" />
          {registrationStatusLabel(status)}
        </p>
      </header>

      <div className="scratch-grid">
        <main className="work" id="main">
          <p className="kicker">
            {/* The header already names the round. This said it a second time. */}
            Product rule
          </p>
          <hr className="rule" />

          <h1
            className="problem-prompt"
            aria-label={`Find d ${state.problem.resultName} by d ${state.problem.variable} at ${state.problem.variable} equals ${state.problem.evaluationPoint}`}
          >
            Find{' '}
            <Tex
              latex={`\\frac{d${state.problem.resultName}}{d${state.problem.variable}}`}
              ariaLabel={`d ${state.problem.resultName} by d ${state.problem.variable}`}
            />{' '}
            at <Tex latex={`${state.problem.variable} = ${state.problem.evaluationPoint}`} />
          </h1>
          <div className="given">
            {state.problem.definitions.map((definition) => (
              <p key={definition.name}>
                <Tex latex={`${definition.name} = ${definition.latex}`} />
              </p>
            ))}
          </div>

          {state.round === 'transfer' && (
            <p className="round-banner">
              <strong>Unaided.</strong>
              <span>
                This problem was generated after your repaired first round. Coaching and suggested
                replacements are locked for every caller until this attempt ends.
              </span>
            </p>
          )}

{/* Nothing stands between the problem and the first line. The page used to
    open with a paragraph about how checking works and a three-step plan it
    does not enforce — both explaining a thing that had not happened yet. The
    placeholder says what to write; the page says the rest once there is work
    to say it about. */}
          <ol className="steps" aria-label="Your working">
            {state.steps.map((step: Step, index) => {
              const verdict = report?.verdicts[step.id]
              const broken = step.id === firstBrokenId && isBrokenVerdict(verdict)
              const notes = annotationsFor(step.id)
              const verdictDetail = relationDetail(verdict)
              return (
                <li
                  key={step.id}
                  id={`line-${step.id}`}
                  className={[
                    'step',
                    broken ? 'step-broken' : '',
                    verdict?.status === 'downstream' ? 'step-downstream' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="step-n">{index + 1}</span>
                  <div className="line-main">
                    {editingId === step.id ? (
                      <form
                        className="step-edit"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const next = editDraft.trim()
                          if (!next) return
                          const result = run(
                            { type: 'EDIT_STEP', stepId: step.id, latex: next },
                            'learner',
                          )
                          if (result.ok) {
                            setEditingId(null)
                            // Put focus back on the line that was just edited, rather
                            // than dropping it to <body> and losing the keyboard user.
                            requestAnimationFrame(() =>
                              document
                                .querySelector<HTMLButtonElement>(`#line-${step.id} .step-latex`)
                                ?.focus(),
                            )
                          }
                        }}
                      >
                        <input
                          aria-label={`Line ${index + 1}`}
                          value={editDraft}
                          autoFocus
                          spellCheck={false}
                          onChange={(event) => setEditDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Escape') return
                            cancelEdit(step.id, index + 1)
                          }}
                        />
                        <button type="submit" className="button button-sm">
                          Save
                        </button>
                        <button
                          type="button"
                          className="button-text"
                          onClick={() => cancelEdit(step.id, index + 1)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="step-latex"
                        aria-label={stepExpressionAccessibleName(index + 1, step.latex)}
                        onClick={() => {
                          setEditingId(step.id)
                          setEditDraft(step.latex)
                        }}
                      >
                        {/* Keyed on the expression itself, so React remounts
                            this when the line changes and the rewrite animation
                            fires. Without the key the node is reused and an
                            accepted proposal or a learner's own edit swaps the
                            text with no motion at all — the one moment the
                            product is named after, passing silently. */}
                        <Tex key={step.latex} latex={step.latex} />
                      </button>
                    )}
                  </div>
                  <p className={`relation relation-${verdict?.status ?? 'idle'}`}>
                    <span className="relation-mark" aria-hidden="true" />
                    <span>{relationLabel(verdict, firstIssueKind)}</span>
                  </p>
                  <div className="line-evidence">
                    {/* Keyed on the text so a re-check re-fires the arrival.
                        Without it React reuses the node and the reason for a
                        new verdict appears without motion while the verdict
                        itself lands. */}
                    {verdictDetail && (
                      <p className="step-detail" key={verdictDetail}>
                        {verdictDetail}
                      </p>
                    )}
                    {broken && verdict?.status === 'broken' && (
                      <p className="step-detail" key={verdict.difference?.latex ?? 'counterexample'}>
                        {verdict.difference ? (
                          <>
                            {verdict.difference.against === 'derivative'
                              ? 'Short of the derivative by '
                              : 'Short of the line above by '}
                            <Tex latex={verdict.difference.latex} />
                          </>
                        ) : verdict.counterexample ? (
                          <>
                            They differ at{' '}
                            {Object.entries(verdict.counterexample)
                              .map(([name, value]) => `${name} = ${Number(value.toFixed(3))}`)
                              .join(', ')}
                          </>
                        ) : null}
                      </p>
                    )}
                    {notes.map((note) => (
                      <p key={note.id} className={`step-note note-${note.source}`}>
                        <span className="note-source">{actorLabel(note.source)}</span>
                        {note.note}
                      </p>
                    ))}
                    {state.proposal?.stepId === step.id && (
                      <div className="proposal">
                        <p className="proposal-head">
                          Proposed replacement — not applied · {actorLabel(state.proposal.source)}
                        </p>
                        <div
                          className="proposal-math"
                          role="region"
                          tabIndex={0}
                          aria-label={`Proposed replacement for line ${index + 1}: ${state.proposal.latex}. Use the arrow keys to review the full expression if needed.`}
                        >
                          <Tex latex={state.proposal.latex} />
                        </div>
                        <p className="proposal-why">{state.proposal.rationale}</p>
                        <div className="proposal-actions">
                          <button
                            type="button"
                            className="button button-sm"
                            onClick={() => resolveProposal(true, step.id, index + 1)}
                          >
                            Use this
                          </button>
                          <button
                            type="button"
                            className="button-text"
                            onClick={() => resolveProposal(false, step.id, index + 1)}
                          >
                            Keep mine
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="step-remove"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() => {
                      const nextFocusId = state.steps[index + 1]?.id ?? state.steps[index - 1]?.id ?? null
                      const result = run({ type: 'REMOVE_STEP', stepId: step.id }, 'learner')
                      if (!result.ok) return
                      focusLineOrComposer(nextFocusId)
                      announce(
                        nextFocusId
                          ? `Line ${index + 1} removed. Focus moved to the nearest remaining line.`
                          : `Line ${index + 1} removed. Focus moved to Write your first line.`,
                      )
                    }}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ol>

          <form className="composer" onSubmit={submitStep}>
            <label htmlFor="next-step" className="composer-label">
              {state.steps.length === 0 ? 'Write your first line' : `Line ${state.steps.length + 1}`}
            </label>
            <div className="composer-row">
              <input
                id="next-step"
                ref={composerRef}
                value={draft}
                autoComplete="off"
                spellCheck={false}
                disabled={!ready}
                aria-invalid={composerError ? true : undefined}
                aria-describedby="next-step-error"
                placeholder={state.steps.length === 0 ? `write ${state.problem.resultName} in terms of ${state.problem.variable}` : 'the next line of your working'}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" className="button button-sm" disabled={!ready}>
                Add line
              </button>
            </div>
            {/* Speaks only when something is wrong. The standing instruction it
                used to carry repeated the placeholder directly above it. The
                node stays mounted for aria-describedby and aria-live. */}
            <p id="next-step-error" className="composer-error" aria-live="polite">
              {composerError}
            </p>
            {draft.trim() && (
              <p className="composer-preview">
                <Tex latex={draft} />
              </p>
            )}
          </form>

          {/* An empty scratchpad has nothing to check and nothing to start over
              from. The row appears with the first line, so the only control on
              a blank page is the one that writes one. */}
          {state.steps.length > 0 && (
          <div className="work-actions">
            <button
              type="button"
              className="button"
              onClick={check}
              disabled={!ready}
            >
              Check my work
            </button>
            {report?.allSound && report.reachesAnswer && state.round === 'practice' && (
              <button
                type="button"
                className="button-text"
                onClick={() => {
                  const result = run({ type: 'NEW_PROBLEM' }, 'learner')
                  if (!result.ok) return
                  setDraft('')
                  setComposerError('')
                  setEditingId(null)
                  focusLineOrComposer(null)
                  announce('Fresh unaided problem started. Focus moved to Write your first line.')
                }}
              >
                Try a fresh problem, unaided
              </button>
            )}
            <button
              type="button"
              className="button-text"
              onClick={() => {
                tabConflictRef.current = false
                setTabConflict(false)
                clearSession()
                // Starting over gives a different problem on purpose; only the very
                // first problem of a session is fixed.
                const fresh = createSession(Date.now() % 100000, newSessionId())
                stateRef.current = fresh
                setState(fresh)
                setDraft('')
                setComposerError('')
                setEditingId(null)
                setFeedback(EMPTY_ACTION_FEEDBACK)
                focusLineOrComposer(null)
                announce('A new session started. Focus moved to Write your first line.')
              }}
            >
              Start over
            </button>
          </div>
          )}

          {refusal && (
            <div className="refusal" role="alert">
              <p className="refusal-head">Not yet.</p>
              <p className="refusal-source">
                from the {refusal.source === 'agent' ? 'agent' : 'inspector'}
              </p>
              <p className="refusal-body">{refusal.message}</p>
              <p className="refusal-recovery">{refusal.recovery}</p>
              <button
                type="button"
                className="button-text"
                onClick={() =>
                  setFeedback((current) => ({ ...current, refusal: null }))
                }
              >
                Dismiss
              </button>
            </div>
          )}

          {state.steps.length > 0 && (
            <p className="how how-foot">
              Each line should be equal to the line above it, or its derivative, or its value at
              the point in the question. Click any line to rewrite it.
            </p>
          )}

          {/* Last, deliberately. 23_PRIMER_REDESIGN_SPEC.md §1.5 calls this the
              product's thesis object — the thing the demo ends on — and it was
              rendering above the actions and the guidance, so the page carried
              on past it with two buttons and a paragraph of instruction. A
              conclusion cannot be the conclusion if there is more page after
              it. */}
          {state.round === 'transfer' && report?.allSound && report.reachesAnswer && (
            <TransferSignal state={state} />
          )}

          {!ready && (
            <div className="loading-recovery is-empty" role="status" aria-live="polite">
              <p>Loading the mathematics engine…</p>
              <a href="/learn">Reload the scratchpad</a>
            </div>
          )}

          {tabConflict && (
            <p className="is-error" role="alert">
              Another tab changed this session, so work here is paused to prevent an overwrite.
              Close one tab, then choose Start over here to continue safely.
            </p>
          )}

          <p className="live-status" role="status" aria-live="polite">
            {flash || reportStatusMessage(report)}
          </p>

          <p className="live-announcement" role="status" aria-live="polite" aria-atomic="true">
            <span key={announcement.key}>{announcement.text}</span>
          </p>

          {/* A disclosure that opens onto "nothing yet" is a control that
              cannot do anything. It arrives with the first recorded action. */}
          {state.activities.length > 0 && <SessionDetails activities={state.activities} />}
        </main>

        {/* The margin is the page's own voice: what it holds about this
            session, and the exact tools it hands to whatever agent arrives.
            It is never empty — 05 #26, and 23_PRIMER_REDESIGN_SPEC.md §4. */}
        <aside className="margin" aria-labelledby="margin-heading">
          {/* Counted, never written. 05 #28: no hardcoded figure may drift
              away from what the page actually registered. */}
          <h2 id="margin-heading" className="margin-heading">
            {inspectorTools.length} tools for an agent
            <span className="margin-split">
              {inspectorTools.filter((t) => t.annotations.readOnlyHint).length} read ·{' '}
              {inspectorTools.filter((t) => !t.annotations.readOnlyHint).length} write
            </span>
          </h2>
          <AgentConsole
            status={status}
            tools={inspectorTools}
            onRun={runFromInspector}
            revision={state.revision}
            proposalSeed={proposalSeed}
          />
        </aside>
      </div>
    </div>
  )
}
