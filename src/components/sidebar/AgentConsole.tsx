'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ToolResult, WorldTool } from '../../domain/tools/definitions'
import { runReplayScript } from '../../domain/replay/runner'
import { FILM_V2_SCRIPT } from '../../domain/replay/script'
import type { ReplayCall, ReplayDecision, ReplayProposal, ReplayRun, ReplayScript, ReplayStep } from '../../domain/replay/types'
import '../../styles/sidebar.css'
import '../../styles/console.css'

export type AgentConsoleToolCall = {
  name: string
  /** Step index inside the script. */
  index: number
  /** Position of this call inside the step (0 is the step's own tool). */
  callIndex: number
  readOnly: boolean
  input: unknown
}

export type AgentConsoleEvent =
  | { type: 'start'; script: ReplayScript }
  | { type: 'say'; text: string; index: number }
  | { type: 'tool'; name: string; index: number; result: ToolResult }
  | { type: 'decision'; index: number; decision: ReplayDecision; proposal: ReplayProposal }
  | { type: 'finish'; run: ReplayRun }
  | { type: 'reset' }

type CallLine = { name: string; readOnly: boolean; result: ToolResult | null }

type ConsoleLine =
  | { id: string; kind: 'prompt' | 'say' | 'human'; text: string }
  | { id: string; kind: 'tool'; index: number; calls: CallLine[] }
  | { id: string; kind: 'proposal'; index: number; proposal: ReplayProposal; line: string; decision: ReplayDecision | null }

type Status = 'idle' | 'running' | 'paused' | 'done' | 'stopped'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'ready',
  running: 'running',
  paused: 'paused',
  done: 'finished',
  stopped: 'stopped',
}

const callState = (call: CallLine) => (call.result === null ? 'running' : call.result.ok ? 'complete' : 'error')
const callGlyph = (call: CallLine) => (call.result === null ? '…' : call.result.ok ? '✓' : '!')
const callSummary = (call: CallLine) => (call.result === null ? 'running' : call.result.ok ? call.result.summary : (call.result.error ?? call.result.summary))

/**
 * "Agent replay": a console docked top-centre whose words are scripted and
 * whose tool calls are real. Each step runs through the registered WorldTool
 * objects, so the trace, the ledger, Tutor attribution and undo all see it.
 * Steps with a `proposal` show an Accept / Decline card and wait for the learner.
 */
export default function AgentConsole({
  open,
  onClose,
  tools,
  onEvent,
  onActivate,
  onToolCall,
  script = FILM_V2_SCRIPT,
}: {
  open: boolean
  onClose: () => void
  tools: WorldTool[]
  onEvent?: (event: AgentConsoleEvent) => void
  /** Called whenever a run starts; the workspace fires its activation sweep here. */
  onActivate?: () => void
  /** Called as each tool call starts, before the tool executes. */
  onToolCall?: (event: AgentConsoleToolCall) => void
  script?: ReplayScript
}) {
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [pendingDecision, setPendingDecision] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const acceptRef = useRef<HTMLButtonElement>(null)

  const pausedRef = useRef(false)
  const stopRef = useRef(false)
  const gateRef = useRef<(() => void) | null>(null)
  const decisionRef = useRef<((decision: ReplayDecision) => void) | null>(null)
  const stepGrantRef = useRef(0)
  const runIdRef = useRef(0)
  const activeRef = useRef(false)
  const toolsRef = useRef(tools)
  const onEventRef = useRef(onEvent)
  const onActivateRef = useRef(onActivate)
  const onToolCallRef = useRef(onToolCall)
  toolsRef.current = tools
  onEventRef.current = onEvent
  onActivateRef.current = onActivate
  onToolCallRef.current = onToolCall

  const readOnlyOf = useCallback((name: string) => toolsRef.current.find((tool) => tool.name === name)?.annotations.readOnlyHint ?? false, [])

  const release = () => {
    const resolve = gateRef.current
    gateRef.current = null
    resolve?.()
  }

  const decide = useCallback((decision: ReplayDecision) => {
    const resolve = decisionRef.current
    decisionRef.current = null
    setPendingDecision(null)
    resolve?.(decision)
  }, [])

  const start = useCallback(async () => {
    if (activeRef.current) return
    activeRef.current = true
    stopRef.current = false
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    const alive = () => runIdRef.current === runId && !stopRef.current
    setLines(script.prompt ? [{ id: 'prompt', kind: 'prompt', text: script.prompt }] : [])
    setStatus(pausedRef.current ? 'paused' : 'running')
    onActivateRef.current?.()
    onEventRef.current?.({ type: 'start', script })

    const upsertCall = (index: number, call: ReplayCall, callIndex: number, result: ToolResult | null) => {
      setLines((current) => {
        const id = `tool-${index}`
        const entry: CallLine = { name: call.tool, readOnly: readOnlyOf(call.tool), result }
        const existing = current.find((line) => line.id === id)
        if (!existing || existing.kind !== 'tool') return [...current, { id, kind: 'tool', index, calls: Object.assign([], { [callIndex]: entry }) as CallLine[] }]
        const calls = [...existing.calls]
        calls[callIndex] = result === null && calls[callIndex] ? calls[callIndex] : entry
        return current.map((line) => (line.id === id ? { ...existing, calls } : line))
      })
    }

    const run = await runReplayScript(script, toolsRef.current, {
      shouldStop: () => !alive(),
      beforeStep: async (index) => {
        if (!alive()) return
        setStepIndex(index)
        if (!pausedRef.current) return
        if (stepGrantRef.current > 0) { stepGrantRef.current -= 1; return }
        setStatus('paused')
        await new Promise<void>((resolve) => { gateRef.current = resolve })
        if (alive()) setStatus(pausedRef.current ? 'paused' : 'running')
      },
      onSay: (text, index) => {
        if (!alive()) return
        const step = script.steps[index]
        // A proposal shows its line inside the card, not as a separate Tutor line.
        if (!step?.proposal) setLines((current) => [...current, { id: `say-${index}`, kind: 'say', text }])
        onEventRef.current?.({ type: 'say', text, index })
      },
      onHumanNote: (text, index) => {
        if (!alive()) return
        setLines((current) => [...current, { id: `human-${index}`, kind: 'human', text }])
      },
      awaitDecision: (step, index) => new Promise<ReplayDecision>((resolve) => {
        if (!alive() || !step.proposal) { resolve('decline'); return }
        const proposal = step.proposal
        setLines((current) => [...current, { id: `proposal-${index}`, kind: 'proposal', index, proposal, line: step.say ?? proposal.title, decision: null }])
        decisionRef.current = resolve
        setPendingDecision(index)
      }),
      onDecision: (step, index, decision) => {
        if (!alive() || !step.proposal) return
        const proposal = step.proposal
        setLines((current) => current.map((line) => (line.id === `proposal-${index}` && line.kind === 'proposal' ? { ...line, decision } : line)))
        onEventRef.current?.({ type: 'decision', index, decision, proposal })
      },
      onStep: (step, index, input, call, callIndex) => {
        if (!alive()) return
        upsertCall(index, call, callIndex, null)
        onToolCallRef.current?.({ name: call.tool, index, callIndex, readOnly: readOnlyOf(call.tool), input })
        void step
      },
      onResult: (step, index, result, call, callIndex) => {
        if (!alive()) return
        upsertCall(index, call, callIndex, result)
        onEventRef.current?.({ type: 'tool', name: call.tool, index, result })
        void step
      },
    })

    activeRef.current = false
    if (runIdRef.current !== runId) return
    setStepIndex(null)
    setPendingDecision(null)
    if (stopRef.current) { setStatus('stopped'); return }
    setStatus(run.completed ? 'done' : 'stopped')
    onEventRef.current?.({ type: 'finish', run })
  }, [script, readOnlyOf])

  const reset = useCallback(() => {
    stopRef.current = true
    pausedRef.current = false
    stepGrantRef.current = 0
    runIdRef.current += 1
    release()
    decide('decline')
    activeRef.current = false
    setLines([])
    setStepIndex(null)
    setStatus('idle')
    onEventRef.current?.({ type: 'reset' })
  }, [decide])

  const run = () => {
    if (activeRef.current) {
      if (pausedRef.current) { pausedRef.current = false; setStatus('running'); release() }
      return
    }
    pausedRef.current = false
    stepGrantRef.current = 0
    void start()
  }

  const pause = () => {
    if (!activeRef.current) return
    if (pausedRef.current) { pausedRef.current = false; setStatus('running'); release() }
    else { pausedRef.current = true; setStatus('paused') }
  }

  const step = () => {
    pausedRef.current = true
    if (!activeRef.current) { stepGrantRef.current = 1; void start(); return }
    if (gateRef.current) release()
    else stepGrantRef.current = 1
  }

  // Closing the console aborts a live run; nothing keeps calling tools off screen.
  useEffect(() => {
    if (!open && activeRef.current) reset()
  }, [open, reset])

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [lines, status, pendingDecision])

  // Enter accepts and Escape declines the pending proposal, unless the learner is typing elsewhere.
  useEffect(() => {
    if (pendingDecision === null) return
    acceptRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      const typing = target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'MATH-FIELD')
      if (typing) return
      if (event.key === 'Enter') { event.preventDefault(); decide('accept') }
      else if (event.key === 'Escape') { event.preventDefault(); decide('decline') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDecision, decide])

  const counter = useMemo(() => {
    const finished = lines.flatMap((line) => (line.kind === 'tool' ? line.calls.filter((call) => call && call.result !== null) : []))
    return { calls: finished.length, distinct: new Set(finished.map((call) => call.name)).size }
  }, [lines])

  const thinking = useMemo(() => status === 'running' && lines.some((line) => line.kind === 'tool' && line.calls.some((call) => call && call.result === null)), [lines, status])

  if (!open) return null

  const active = status === 'running' || status === 'paused'
  const total = script.steps.length
  return (
    <section className="agent-console is-docked" aria-label="Agent replay console" data-status={status} data-canvas-control>
      <header className="agent-console-header">
        <div>
          <span className="agent-console-kicker"><i aria-hidden />Agent replay</span>
          <em>scripted words, real tool calls</em>
        </div>
        <button type="button" className="agent-console-close" aria-label="Close the agent console" onClick={onClose} data-canvas-control>×</button>
      </header>
      <div className="agent-console-lines" ref={listRef}>
        {lines.length === 0 && script.prompt && (
          <p className="agent-console-line is-prompt is-pending"><span>You</span>{script.prompt}</p>
        )}
        {lines.map((line) => {
          if (line.kind === 'tool') {
            const calls = line.calls.filter(Boolean)
            const state = calls.some((call) => callState(call) === 'error') ? 'error' : calls.some((call) => callState(call) === 'running') ? 'running' : 'complete'
            if (calls.length === 1) {
              const call = calls[0]
              return (
                <p className={`agent-console-line is-tool is-${callState(call)} ${call.readOnly ? 'is-read' : 'is-write'}`} key={line.id}>
                  <i>{call.readOnly ? 'R' : 'W'}</i>
                  <b>{call.name}</b>
                  <small>{callGlyph(call)}</small>
                  <span>{callSummary(call)}</span>
                </p>
              )
            }
            const write = calls.some((call) => !call.readOnly)
            return (
              <div className={`agent-console-line is-tool is-group is-${state} ${write ? 'is-write' : 'is-read'}`} key={line.id}>
                <i>{write ? 'W' : 'R'}</i>
                <b>{calls.length} calls</b>
                <small>{state === 'running' ? '…' : state === 'error' ? '!' : '✓'}</small>
                <span>together</span>
                <ul className="agent-console-group">
                  {calls.map((call, callIndex) => (
                    <li className={`is-${callState(call)} ${call.readOnly ? 'is-read' : 'is-write'}`} key={`${line.id}-${callIndex}`}>
                      <i>{call.readOnly ? 'R' : 'W'}</i>
                      <b>{call.name}</b>
                      <small>{callGlyph(call)}</small>
                      <span>{callSummary(call)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          if (line.kind === 'proposal') {
            if (line.decision) {
              return (
                <p className={`agent-console-line is-proposal-record is-${line.decision}`} key={line.id}>
                  <span>{line.decision === 'accept' ? 'Accepted' : 'Declined'}</span>
                  {line.proposal.title}
                </p>
              )
            }
            const pending = pendingDecision === line.index
            return (
              <div className="agent-console-proposal" key={line.id} role="group" aria-label={line.proposal.title} data-canvas-control>
                <b>{line.proposal.title}</b>
                <p><span>Tutor</span>{line.line}</p>
                <div className="agent-console-proposal-actions">
                  <button type="button" className="is-accept" ref={acceptRef} onClick={() => decide('accept')} disabled={!pending} data-canvas-control>{line.proposal.accept}<kbd>↵</kbd></button>
                  <button type="button" className="is-decline" onClick={() => decide('decline')} disabled={!pending} data-canvas-control>{line.proposal.decline}<kbd>esc</kbd></button>
                </div>
              </div>
            )
          }
          return (
            <p className={`agent-console-line is-${line.kind}`} key={line.id}>
              <span>{line.kind === 'say' ? 'Tutor' : 'You'}</span>
              {line.text}
            </p>
          )
        })}
        {thinking && (
          <p className="agent-console-thinking" aria-live="polite" aria-label="The agent is working">
            <span>Tutor</span>
            <i aria-hidden><b /><b /><b /></i>
          </p>
        )}
      </div>
      <div className="agent-console-controls" role="group" aria-label="Replay controls">
        <button type="button" onClick={run} disabled={status === 'running'} aria-label={status === 'paused' ? 'Resume' : 'Run'} data-canvas-control>{status === 'paused' ? 'Resume' : 'Run'}</button>
        <button type="button" onClick={pause} disabled={!active} data-canvas-control>{status === 'paused' ? 'Resume' : 'Pause'}</button>
        <button type="button" onClick={step} disabled={status === 'running'} data-canvas-control>Step</button>
        <button type="button" onClick={reset} disabled={status === 'idle'} data-canvas-control>Reset</button>
        <span className="agent-console-status">
          {STATUS_LABEL[status]}{stepIndex !== null ? ` · ${stepIndex + 1} / ${total}` : ''}
        </span>
      </div>
      <footer className="agent-console-footer">
        <b>{counter.calls}</b> {counter.calls === 1 ? 'call' : 'calls'} · <b>{counter.distinct}</b> distinct {counter.distinct === 1 ? 'tool' : 'tools'}
      </footer>
    </section>
  )
}
