'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ToolResult, WorldTool } from '../../domain/tools/definitions'
import { runReplayScript } from '../../domain/replay/runner'
import { FILM_V2_SCRIPT } from '../../domain/replay/script'
import type { ReplayRun, ReplayScript, ReplayStep } from '../../domain/replay/types'
import '../../styles/sidebar.css'

export type AgentConsoleEvent =
  | { type: 'start'; script: ReplayScript }
  | { type: 'say'; text: string; index: number }
  | { type: 'tool'; name: string; index: number; result: ToolResult }
  | { type: 'finish'; run: ReplayRun }
  | { type: 'reset' }

type ConsoleLine =
  | { id: string; kind: 'prompt' | 'say' | 'human'; text: string }
  | { id: string; kind: 'tool'; name: string; readOnly: boolean; result: ToolResult | null }

type Status = 'idle' | 'running' | 'paused' | 'done' | 'stopped'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'ready',
  running: 'running',
  paused: 'paused',
  done: 'finished',
  stopped: 'stopped',
}

/**
 * "Agent replay": a docked console whose words are scripted and whose tool
 * calls are real. Each step runs through the registered WorldTool objects,
 * so the trace, the ledger, Tutor attribution and undo all see it.
 */
export default function AgentConsole({
  open,
  onClose,
  tools,
  onEvent,
  script = FILM_V2_SCRIPT,
}: {
  open: boolean
  onClose: () => void
  tools: WorldTool[]
  onEvent?: (event: AgentConsoleEvent) => void
  script?: ReplayScript
}) {
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const pausedRef = useRef(false)
  const stopRef = useRef(false)
  const gateRef = useRef<(() => void) | null>(null)
  const stepGrantRef = useRef(0)
  const runIdRef = useRef(0)
  const activeRef = useRef(false)
  const toolsRef = useRef(tools)
  const onEventRef = useRef(onEvent)
  toolsRef.current = tools
  onEventRef.current = onEvent

  const readOnlyOf = useCallback((name: string) => toolsRef.current.find((tool) => tool.name === name)?.annotations.readOnlyHint ?? false, [])

  const release = () => {
    const resolve = gateRef.current
    gateRef.current = null
    resolve?.()
  }

  const start = useCallback(async () => {
    if (activeRef.current) return
    activeRef.current = true
    stopRef.current = false
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    const alive = () => runIdRef.current === runId && !stopRef.current
    setLines(script.prompt ? [{ id: 'prompt', kind: 'prompt', text: script.prompt }] : [])
    setStatus(pausedRef.current ? 'paused' : 'running')
    onEventRef.current?.({ type: 'start', script })

    const run = await runReplayScript(script, toolsRef.current, {
      shouldStop: () => !alive(),
      beforeStep: async (index, step) => {
        if (!alive()) return
        setStepIndex(index)
        if (!pausedRef.current) return
        if (stepGrantRef.current > 0) { stepGrantRef.current -= 1; return }
        setStatus('paused')
        await new Promise<void>((resolve) => { gateRef.current = resolve })
        if (alive()) setStatus(pausedRef.current ? 'paused' : 'running')
        void step
      },
      onSay: (text, index) => {
        if (!alive()) return
        setLines((current) => [...current, { id: `say-${index}`, kind: 'say', text }])
        onEventRef.current?.({ type: 'say', text, index })
      },
      onHumanNote: (text, index) => {
        if (!alive()) return
        setLines((current) => [...current, { id: `human-${index}`, kind: 'human', text }])
      },
      onStep: (step: ReplayStep, index) => {
        if (!alive() || !step.tool) return
        const name = step.tool
        setLines((current) => [...current, { id: `tool-${index}`, kind: 'tool', name, readOnly: readOnlyOf(name), result: null }])
      },
      onResult: (step, index, result) => {
        if (!alive() || !step.tool) return
        const name = step.tool
        setLines((current) => {
          const id = `tool-${index}`
          if (current.some((line) => line.id === id)) return current.map((line) => line.id === id && line.kind === 'tool' ? { ...line, result } : line)
          return [...current, { id, kind: 'tool', name, readOnly: readOnlyOf(name), result }]
        })
        onEventRef.current?.({ type: 'tool', name, index, result })
      },
    })

    activeRef.current = false
    if (runIdRef.current !== runId) return
    setStepIndex(null)
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
    activeRef.current = false
    setLines([])
    setStepIndex(null)
    setStatus('idle')
    onEventRef.current?.({ type: 'reset' })
  }, [])

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
  }, [lines.length, status])

  const counter = useMemo(() => {
    const finished = lines.filter((line): line is Extract<ConsoleLine, { kind: 'tool' }> => line.kind === 'tool' && line.result !== null)
    return { calls: finished.length, distinct: new Set(finished.map((line) => line.name)).size }
  }, [lines])

  if (!open) return null

  const active = status === 'running' || status === 'paused'
  const total = script.steps.length
  return (
    <section className="agent-console" aria-label="Agent replay console" data-status={status}>
      <header className="agent-console-header">
        <div>
          <span className="agent-console-kicker"><i aria-hidden />Agent replay</span>
          <em>scripted words, real tool calls</em>
        </div>
        <button type="button" className="agent-console-close" aria-label="Close the agent console" onClick={onClose}>×</button>
      </header>
      <div className="agent-console-lines" ref={listRef}>
        {lines.length === 0 && script.prompt && (
          <p className="agent-console-line is-prompt is-pending"><span>You</span>{script.prompt}</p>
        )}
        {lines.map((line) => {
          if (line.kind === 'tool') {
            const glyph = line.result === null ? '…' : line.result.ok ? '✓' : '!'
            const state = line.result === null ? 'running' : line.result.ok ? 'complete' : 'error'
            return (
              <p className={`agent-console-line is-tool is-${state} ${line.readOnly ? 'is-read' : 'is-write'}`} key={line.id}>
                <i>{line.readOnly ? 'R' : 'W'}</i>
                <b>{line.name}</b>
                <small>{glyph}</small>
                <span>{line.result === null ? 'running' : line.result.ok ? line.result.summary : (line.result.error ?? line.result.summary)}</span>
              </p>
            )
          }
          return (
            <p className={`agent-console-line is-${line.kind}`} key={line.id}>
              <span>{line.kind === 'prompt' ? 'You' : line.kind === 'human' ? 'You' : 'Tutor'}</span>
              {line.text}
            </p>
          )
        })}
      </div>
      <div className="agent-console-controls" role="group" aria-label="Replay controls">
        <button type="button" onClick={run} disabled={status === 'running'} aria-label={status === 'paused' ? 'Resume' : 'Run'}>{status === 'paused' ? 'Resume' : 'Run'}</button>
        <button type="button" onClick={pause} disabled={!active}>{status === 'paused' ? 'Resume' : 'Pause'}</button>
        <button type="button" onClick={step} disabled={status === 'running'}>Step</button>
        <button type="button" onClick={reset} disabled={status === 'idle'}>Reset</button>
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
