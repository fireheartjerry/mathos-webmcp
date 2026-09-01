'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWorldTools } from '../domain/tools/definitions'
import type { ToolResult, WorldBridge } from '../domain/tools/definitions'
import { registerWorldTools } from '../domain/tools/registry'
import type { RegistrationStatus } from '../domain/tools/registry'
import { loadWorld, saveWorld } from '../domain/world/persistence'
import { dispatchWorldAction, stepWorldHistory } from '../domain/world/reducer'
import { createSeedWorld, HERO_EQUATION_ID, HERO_GRAPH_ID, SOURCE_IMAGE_ID } from '../domain/world/seed'
import { findDependentIds } from '../domain/world/dependencies'
import {
  approveReconstruction,
  auditReconstruction,
  proposeReconstruction,
  rejectReconstruction,
} from '../domain/world/reconstruction'
import {
  buildDeleteOperations,
  buildDuplicateOperations,
  buildTransformOperations,
  expandTargetIds,
  unionBounds,
} from '../domain/world/operations'
import type { AgentPresenceState, WorldAction, WorldObject, WorldOperation, WorldState } from '../domain/world/types'
import ActivityRail from './ActivityRail'
import AgentPresence from './AgentPresence'
import ReconstructionPanel from './ReconstructionPanel'
import ToolRail from './ToolRail'
import type { ToolMode } from './ToolRail'
import WebMCPInspector from './WebMCPInspector'
import WorldCanvas from './WorldCanvas'

const humanAction = (summary: string, operations: WorldOperation[]): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

const quietPresence: AgentPresenceState = { visible: false, x: 0, y: 0, label: 'Tutor', action: '' }

function demoReconstruction(audited: boolean): WorldObject[] {
  return [
    {
      id: HERO_EQUATION_ID,
      kind: 'equation',
      latex: '\\int x e^x\\,dx',
      color: '#171713',
      bounds: { x: 430, y: 156, width: 275, height: 72 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'recon_prompt',
      kind: 'text',
      text: 'Evaluate the integral, then explain the geometry.',
      color: '#171713',
      fontSize: 17,
      bounds: { x: 438, y: 242, width: 260, height: 50 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'recon_work',
      kind: 'equation',
      latex: audited ? 'xe^x-e^x+C' : 'xe^x-e^x x+C',
      color: audited ? '#171713' : '#f05f44',
      bounds: { x: 430, y: 308, width: 275, height: 62 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
  ]
}

export default function MathburstWorkspace() {
  const [world, setWorld] = useState<WorldState>(() => createSeedWorld())
  const worldRef = useRef(world)
  const [hydrated, setHydrated] = useState(false)
  const [mode, setMode] = useState<ToolMode>('select')
  const [editorId, setEditorId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [editorMatrix, setEditorMatrix] = useState<[[number, number], [number, number]] | null>(null)
  const [presence, setPresence] = useState<AgentPresenceState>(quietPresence)
  const [agentCommitIds, setAgentCommitIds] = useState<string[]>([])
  const [agentBusy, setAgentBusy] = useState(false)
  const agentBusyRef = useRef(false)
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null)
  const [nextStep, setNextStep] = useState('')
  const [attemptFeedback, setAttemptFeedback] = useState('')

  useEffect(() => {
    const stored = loadWorld()
    if (stored) {
      worldRef.current = stored
      setWorld(stored)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWorld(world)
  }, [hydrated, world])

  const run = useCallback((action: WorldAction) => {
    const next = dispatchWorldAction(worldRef.current, action)
    worldRef.current = next
    setWorld(next)
  }, [])

  const runAgent = useCallback((action: WorldAction, targetIds: string[] = []): Promise<ToolResult> => new Promise((resolve) => {
    if (agentBusyRef.current) {
      resolve({ ok: false, summary: 'No changes made', error: 'Tutor is finishing another action.' })
      return
    }

    const current = worldRef.current
    const target = targetIds.map((id) => current.objects[id]).find(Boolean)
    const x = target
      ? 58 + current.viewport.x + (target.bounds.x + target.bounds.width / 2) * current.viewport.zoom
      : Math.min(window.innerWidth - 260, 920)
    const y = target
      ? 54 + current.viewport.y + (target.bounds.y + target.bounds.height / 2) * current.viewport.zoom
      : 240
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const changedIds = Array.from(new Set([
      ...targetIds,
      ...action.operations.flatMap((operation) => {
        if (operation.type === 'put') return [operation.object.id]
        if (operation.type === 'remove') return [operation.id]
        return []
      }),
    ]))

    const finish = (delay: number) => {
      window.setTimeout(() => {
        setPresence(quietPresence)
        setAgentCommitIds([])
        agentBusyRef.current = false
        setAgentBusy(false)
      }, delay)
    }

    const commit = () => {
      try {
        const next = dispatchWorldAction(worldRef.current, action)
        worldRef.current = next
        setWorld(next)
        setAgentCommitIds(changedIds)
        window.requestAnimationFrame(() => resolve({
          ok: true,
          summary: action.summary,
          changedIds,
          data: { source: 'agent' },
        }))
        finish(reduceMotion ? 120 : 320)
      } catch (error) {
        agentBusyRef.current = false
        setAgentBusy(false)
        setPresence(quietPresence)
        resolve({
          ok: false,
          summary: 'No changes made',
          error: error instanceof Error ? error.message : 'The action could not be applied.',
        })
      }
    }

    agentBusyRef.current = true
    setAgentBusy(true)
    if (reduceMotion) {
      commit()
      return
    }

    setPresence({ visible: true, x, y, label: 'Tutor', action: action.summary })
    window.setTimeout(commit, 180)
  }), [])

  const runHistoryBridge = useCallback((direction: 'undo' | 'redo'): Promise<ToolResult> => new Promise((resolve) => {
    if (agentBusyRef.current) {
      resolve({ ok: false, summary: 'No changes made', error: 'Tutor is finishing another action.' })
      return
    }
    const current = worldRef.current
    const commit = (direction === 'undo' ? current.history : current.future).at(-1)
    if (!commit) {
      resolve({ ok: false, summary: 'No changes made', error: `Nothing to ${direction}.` })
      return
    }
    const changedIds = Array.from(new Set(commit.action.operations.flatMap((operation) => {
      if (operation.type === 'put') return [operation.object.id]
      if (operation.type === 'remove') return [operation.id]
      return []
    })))
    const target = changedIds.map((id) => current.objects[id]).find(Boolean)
    const x = target
      ? 58 + current.viewport.x + (target.bounds.x + target.bounds.width / 2) * current.viewport.zoom
      : Math.min(window.innerWidth - 260, 920)
    const y = target
      ? 54 + current.viewport.y + (target.bounds.y + target.bounds.height / 2) * current.viewport.zoom
      : 240
    const summary = `${direction === 'undo' ? 'Undid' : 'Redid'} ${commit.action.summary.toLowerCase()}`
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const applyHistory = () => {
      const next = stepWorldHistory(worldRef.current, direction, 'agent')
      worldRef.current = next
      setWorld(next)
      setAgentCommitIds(changedIds)
      window.requestAnimationFrame(() => resolve({ ok: true, summary, changedIds, data: { source: 'agent' } }))
      window.setTimeout(() => {
        setPresence(quietPresence)
        setAgentCommitIds([])
        agentBusyRef.current = false
        setAgentBusy(false)
      }, reduceMotion ? 120 : 320)
    }

    agentBusyRef.current = true
    setAgentBusy(true)
    if (reduceMotion) applyHistory()
    else {
      setPresence({ visible: true, x, y, label: 'Tutor', action: summary })
      window.setTimeout(applyHistory, 180)
    }
  }), [])

  const history = useCallback((direction: 'undo' | 'redo') => {
    const next = stepWorldHistory(worldRef.current, direction, 'human')
    worldRef.current = next
    setWorld(next)
  }, [])

  const bridge = useMemo<WorldBridge>(() => ({
    getWorld: () => worldRef.current,
    runAgentAction: runAgent,
    runHistory: runHistoryBridge,
  }), [runAgent, runHistoryBridge])
  const webMcpTools = useMemo(() => createWorldTools(bridge), [bridge])

  useEffect(() => {
    if (!hydrated) return
    let active = true
    void registerWorldTools(bridge).then((registration) => {
      if (active) setRegistrationStatus(registration.status)
    })
    return () => { active = false }
  }, [bridge, hydrated])

  const startReconstruction = () => {
    runAgent(
      proposeReconstruction(SOURCE_IMAGE_ID, demoReconstruction(false), ['recon_work']),
      [SOURCE_IMAGE_ID],
    )
  }

  const auditCurrentReconstruction = () => {
    if (!world.reconstruction) return
    runAgent(
      auditReconstruction(
        world.reconstruction,
        'Matched every symbol back to the photograph. Removed the duplicated x after the second integral.',
        demoReconstruction(true),
        [],
      ),
      [SOURCE_IMAGE_ID],
    )
  }

  const acceptReconstruction = () => {
    if (!world.reconstruction) return
    run(approveReconstruction(world))
  }

  const submitAttempt = () => {
    const attempts = world.session.attempts + 1
    run(humanAction('Checked a calculus step', [{
      type: 'session',
      patch: {
        attempts,
        currentMisconception: 'integration-by-parts-differential',
      },
    }]))
    setAttemptFeedback(attempts === 1
      ? 'Not quite. Write du before carrying the term forward.'
      : 'Still stuck symbolically. Ask Tutor for another representation.')
  }

  const requestTutorHelp = () => {
    if (world.session.attempts < 2 || world.session.helpShown.includes('linked-integrand-graph')) return
    const equation = world.objects.eq_integrand
    const graph = world.objects[HERO_GRAPH_ID]
    if (equation?.kind !== 'equation' || graph?.kind !== 'graph') return
    const note: WorldObject = {
      id: 'tutor_question',
      kind: 'text',
      text: 'What changes when you differentiate u?',
      color: '#171713',
      fontSize: 25,
      bounds: { x: 750, y: 505, width: 235, height: 88 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    }
    const action: WorldAction = {
      id: crypto.randomUUID(),
      source: 'agent',
      summary: 'Switched the problem into a linked graph',
      operations: [
        { type: 'put', object: { ...equation, opacity: 1 } },
        { type: 'put', object: { ...graph, opacity: 1 } },
        { type: 'put', object: note },
        { type: 'session', patch: { helpShown: [...world.session.helpShown, 'linked-integrand-graph'] } },
        { type: 'select', ids: [graph.id] },
      ],
    }
    runAgent(action, [graph.id, equation.id, note.id])
  }

  const resetDemo = () => {
    const seed = createSeedWorld()
    worldRef.current = seed
    setWorld(seed)
    setMode('select')
    setEditorId(null)
    setEditorMatrix(null)
    setPresence(quietPresence)
    setAgentCommitIds([])
    agentBusyRef.current = false
    setAgentBusy(false)
    setNextStep('')
    setAttemptFeedback('')
  }

  const groupSelection = useCallback(() => {
    if (world.selection.length < 2) return
    const childIds = expandTargetIds(world, world.selection).filter((id) => world.objects[id].kind !== 'group')
    const bounds = unionBounds(world, childIds)
    if (!bounds) return
    const object: WorldObject = {
      id: crypto.randomUUID(),
      kind: 'group',
      childIds,
      bounds,
      rotation: 0,
      author: 'human',
      opacity: 1,
    }
    run(humanAction('Grouped objects', [{ type: 'put', object }, { type: 'select', ids: [object.id] }]))
  }, [run, world])

  const duplicateSelection = useCallback(() => {
    if (!world.selection.length) return
    const operations = buildDuplicateOperations(world, world.selection, 'human')
    const ids = operations.flatMap((operation) => operation.type === 'put' ? [operation.object.id] : [])
    run(humanAction('Duplicated objects', [...operations, { type: 'select', ids }]))
  }, [run, world])

  const deleteSelection = useCallback(() => {
    if (!world.selection.length) return
    run(humanAction('Deleted objects', buildDeleteOperations(world, world.selection)))
  }, [run, world])

  const alignSelection = (axis: 'x' | 'y') => {
    const ids = expandTargetIds(world, world.selection).filter((id) => world.objects[id].kind !== 'group')
    const anchor = world.objects[ids[0]]
    if (!anchor || ids.length < 2) return
    const operations = ids.map((id): WorldOperation => {
      const object = world.objects[id]
      return {
        type: 'put',
        object: {
          ...object,
          bounds: { ...object.bounds, [axis]: anchor.bounds[axis] },
        },
      }
    })
    run(humanAction(`Aligned objects on ${axis.toUpperCase()}`, operations))
  }

  const reorderSelection = (direction: 'front' | 'back') => {
    const ids = expandTargetIds(world, world.selection)
    if (!ids.length) return
    const rest = world.order.filter((id) => !ids.includes(id))
    run(humanAction(direction === 'front' ? 'Brought objects forward' : 'Sent objects backward', [{
      type: 'order',
      ids: direction === 'front' ? [...rest, ...ids] : [...ids, ...rest],
    }]))
  }

  const rotateSelection = () => {
    if (!world.selection.length) return
    run(humanAction('Rotated objects', buildTransformOperations(world, world.selection, { rotate: 15 })))
  }

  const openEditor = useCallback((id: string) => {
    const object = world.objects[id]
    if (!object) return
    setEditorMatrix(null)
    if (object.kind === 'text') setEditorValue(object.text)
    else if (object.kind === 'equation') setEditorValue(object.latex)
    else if (object.kind === 'frame') setEditorValue(object.title)
    else if (object.kind === 'matrix') setEditorMatrix([
      [...object.values[0]],
      [...object.values[1]],
    ])
    else return
    setEditorId(id)
  }, [world.objects])

  const saveEditor = () => {
    if (!editorId) return
    const object = world.objects[editorId]
    if (!object) return
    let updated: WorldObject = object
    if (object.kind === 'text') updated = { ...object, text: editorValue }
    if (object.kind === 'equation') updated = { ...object, latex: editorValue }
    if (object.kind === 'frame') updated = { ...object, title: editorValue }
    if (object.kind === 'matrix' && editorMatrix) updated = { ...object, values: editorMatrix }
    const dependents = object.kind === 'equation' ? findDependentIds(world, [object.id]) : []
    run(humanAction(`Edited ${object.kind}`, [
      { type: 'put', object: updated },
      ...(dependents.length ? [{ type: 'select' as const, ids: [object.id, ...dependents] }] : []),
    ]))
    setEditorId(null)
    setEditorMatrix(null)
  }

  const updateMatrixCell = (row: 0 | 1, column: 0 | 1, value: number) => {
    setEditorMatrix((current) => {
      if (!current) return current
      const next: [[number, number], [number, number]] = [[...current[0]], [...current[1]]]
      next[row][column] = Number.isFinite(value) ? value : 0
      return next
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable="true"]')) return
      const command = event.ctrlKey || event.metaKey
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        history(event.shiftKey ? 'redo' : 'undo')
      } else if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelection()
      } else if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        groupSelection()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelection()
      } else {
        const shortcuts: Record<string, ToolMode> = { v: 'select', h: 'hand', p: 'pen', e: 'eraser', t: 'text', m: 'equation', g: 'graph', c: 'geometry', x: 'matrix', s: 'shape', a: 'arrow', f: 'frame' }
        const next = shortcuts[event.key.toLowerCase()]
        if (next) setMode(next)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelection, duplicateSelection, groupSelection, history])

  const selectedObjects = useMemo(
    () => world.selection.map((id) => world.objects[id]).filter(Boolean),
    [world.objects, world.selection],
  )

  const zoomTo = (zoom: number) => {
    run(humanAction('Changed zoom', [{ type: 'viewport', viewport: { ...world.viewport, zoom: Math.min(2.5, Math.max(0.25, zoom)) } }]))
  }

  return (
    <main className="mathburst-app" id="main" data-hydrated={hydrated}>
      <header className="world-header">
        <div className="wordmark"><span>∫</span> Mathburst</div>
        <div className="world-title"><b>Integration by parts</b><span>/</span><em>shared mathematical world</em></div>
        <div className="header-actions">
          <button
            type="button"
            className="reconstruct-trigger"
            disabled={agentBusy || Boolean(world.reconstruction) || world.session.reconstructionStatus === 'approved'}
            onClick={startReconstruction}
          >
            {world.session.reconstructionStatus === 'approved' ? '✓ live scene' : 'Reconstruct photo'}
          </button>
          <button type="button" className="reset-trigger" onClick={resetDemo}>Reset demo</button>
          <div className="world-status"><i /> local session · saved</div>
        </div>
      </header>

      <ToolRail
        mode={mode}
        onMode={setMode}
        onUndo={() => history('undo')}
        onRedo={() => history('redo')}
        onGroup={groupSelection}
        onDuplicate={duplicateSelection}
        onDelete={deleteSelection}
      />

      <WorldCanvas
        world={world}
        mode={mode}
        run={run}
        onEditObject={openEditor}
        agentCommitIds={agentCommitIds}
        tutorOverlay={world.session.reconstructionStatus === 'approved' ? (
          <section className="tutor-attempt-panel" aria-label="Try the next calculus step">
            <header><span>02 · Your turn</span><b>{world.session.attempts} attempts</b></header>
            <label htmlFor="next-step-input">My next step</label>
            <input
              id="next-step-input"
              value={nextStep}
              placeholder="Write the next symbolic step…"
              onChange={(event) => setNextStep(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && nextStep.trim()) submitAttempt() }}
            />
            <div className="attempt-actions">
              <button type="button" disabled={!nextStep.trim()} onClick={submitAttempt}>Check step</button>
              <button
                type="button"
                disabled={world.session.attempts < 2 || agentBusy || world.session.helpShown.includes('linked-integrand-graph')}
                onClick={requestTutorHelp}
              >
                {world.session.helpShown.includes('linked-integrand-graph') ? 'Graph linked ✓' : 'Ask Tutor'}
              </button>
            </div>
            {attemptFeedback && <p>{attemptFeedback}</p>}
          </section>
        ) : null}
      />

      {world.reconstruction && (
        <ReconstructionPanel
          draft={world.reconstruction}
          status={world.session.reconstructionStatus}
          busy={agentBusy}
          onAudit={auditCurrentReconstruction}
          onApprove={acceptReconstruction}
          onReject={() => run(rejectReconstruction())}
        />
      )}

      <ActivityRail
        activity={world.activity}
        onUndo={() => history('undo')}
        compact={world.session.helpShown.includes('linked-integrand-graph')}
      />
      <AgentPresence presence={presence} />
      <WebMCPInspector tools={webMcpTools} status={registrationStatus} world={world} />

      {selectedObjects.length > 0 && (
        <div className="object-context" aria-label="Selected object actions">
          <span>{selectedObjects.length} selected</span>
          <button type="button" onClick={() => alignSelection('x')}>Align left</button>
          <button type="button" onClick={() => alignSelection('y')}>Align top</button>
          <button type="button" onClick={rotateSelection}>Rotate 15°</button>
          <button type="button" onClick={() => reorderSelection('back')}>To back</button>
          <button type="button" onClick={() => reorderSelection('front')}>To front</button>
          <button type="button" onClick={duplicateSelection}>Duplicate</button>
          <button type="button" onClick={deleteSelection}>Delete</button>
        </div>
      )}

      <div className="zoom-controls" aria-label="Canvas zoom">
        <button type="button" aria-label="Zoom out" onClick={() => zoomTo(world.viewport.zoom / 1.2)}>−</button>
        <span>{Math.round(world.viewport.zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomTo(world.viewport.zoom * 1.2)}>+</button>
      </div>

      {editorId && (
        <div className={`object-editor${editorMatrix ? ' is-matrix-editor' : ''}`} role="dialog" aria-label="Edit object">
          <label htmlFor="object-editor-input">Edit live object</label>
          {editorMatrix ? (
            <div className="matrix-editor-grid" id="object-editor-input">
              <input autoFocus type="number" step="0.1" value={editorMatrix[0][0]} onChange={(event) => updateMatrixCell(0, 0, Number(event.target.value))} />
              <input type="number" step="0.1" value={editorMatrix[0][1]} onChange={(event) => updateMatrixCell(0, 1, Number(event.target.value))} />
              <input type="number" step="0.1" value={editorMatrix[1][0]} onChange={(event) => updateMatrixCell(1, 0, Number(event.target.value))} />
              <input type="number" step="0.1" value={editorMatrix[1][1]} onChange={(event) => updateMatrixCell(1, 1, Number(event.target.value))} />
            </div>
          ) : (
            <input
              id="object-editor-input"
              autoFocus
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') saveEditor(); if (event.key === 'Escape') setEditorId(null) }}
            />
          )}
          <button type="button" onClick={saveEditor}>Commit</button>
          <button type="button" onClick={() => { setEditorId(null); setEditorMatrix(null) }}>Cancel</button>
        </div>
      )}
    </main>
  )
}
