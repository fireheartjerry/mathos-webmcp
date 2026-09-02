'use client'

import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { groupTools } from '../domain/tools/groups'
import type { ToolResult, WorldTool } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import type { WorldObject, WorldState } from '../domain/world/types'

const inspectorNote = (): WorldObject => ({
  id: 'inspector_note', kind: 'text', text: 'Created through WebMCP', color: '#171713', fontSize: 20,
  bounds: { x: 820, y: 610, width: 260, height: 54 }, rotation: 0, author: 'agent', opacity: 1,
})

const firstOfKind = (world: WorldState, kind: WorldObject['kind']) => world.order.find((id) => world.objects[id]?.kind === kind) ?? `no_${kind}`

function seededInput(name: string, world: WorldState): unknown {
  const note = world.objects.inspector_note
  const targetId = note ? note.id : 'source'
  const timelineId = Object.keys(world.timelines)[0] ?? 'no_timeline'
  switch (name) {
    case 'get_world': return { includeObjects: false }
    case 'get_objects': return { kinds: ['equation', 'graph'], limit: 12 }
    case 'get_selection': return {}
    case 'get_session_context': return {}
    case 'get_history': return { limit: 8 }
    case 'inspect_math': return { objectId: 'graph_integrand' }
    case 'create_objects': return { summary: 'Created the inspector proof note', objects: [inspectorNote()] }
    case 'update_objects': return { summary: 'Edited an object through WebMCP', updates: [{ id: targetId, patch: note ? { text: 'WebMCP can edit this live' } : { rotation: -2 } }] }
    case 'transform_objects': return { summary: 'Moved an object through WebMCP', ids: [targetId], translate: { x: 18, y: -10 }, rotate: 2 }
    case 'delete_objects': return { summary: 'Deleted the inspector proof note', ids: ['inspector_note'] }
    case 'apply_actions': return {
      summary: 'Applied an atomic WebMCP batch',
      operations: [{ type: 'put', object: { ...inspectorNote(), id: 'inspector_batch', text: 'One atomic batch', bounds: { x: 850, y: 670, width: 220, height: 48 } } }],
    }
    case 'step_history': return { direction: 'undo' }
    case 'set_viewport': return { viewport: { ...world.viewport, zoom: Math.max(0.7, Math.min(1.2, world.viewport.zoom)) } }
    case 'reconstruct_problem': return {
      sourceImageId: 'source',
      proposedObjects: [{
        id: 'inspector_reconstruction', kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713',
        bounds: { x: 430, y: 160, width: 270, height: 70 }, rotation: 0, author: 'agent', opacity: 1,
      }],
      uncertainObjectIds: [],
    }
    case 'audit_reconstruction': return { auditSummary: 'Inspector audit matched the expression to the source image.', uncertainObjectIds: [] }
    case 'graph_expression': return { latex: 'a(x^2-4x+3)', parameters: { a: 1 }, showTangentAt: 2, shadeIntegral: [1, 3], bounds: { x: 700, y: 150, width: 470, height: 330 } }
    case 'construct_geometry': return {
      bounds: { x: 430, y: 170, width: 430, height: 330 },
      primitives: [
        { kind: 'point', id: 'A', at: { x: 70, y: 260 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 350, y: 260 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 210, y: 65 }, label: 'C', draggable: true },
        { kind: 'polygon', id: 'ABC', points: ['A', 'B', 'C'] },
        { kind: 'midpoint', id: 'M', of: ['A', 'B'], label: 'M' },
      ],
    }
    case 'visualize_concept': return { concept: 'matrix-transform', bounds: { x: 680, y: 170, width: 500, height: 330 } }
    case 'draw_ink': return { mode: 'highlighter', piecewise: [{ latex: '600+40\sin(x/40)', from: 820, to: 1080 }] }
    case 'erase_ink': return { own: true }
    case 'edit_text': return { objectId: note ? note.id : firstOfKind(world, 'text'), text: 'Edited through WebMCP', presentation: 'handwritten' }
    case 'edit_equation': return { objectId: firstOfKind(world, 'equation'), latex: 'x^2-2x+1' }
    case 'create_shape': return { shape: 'polygon', points: [{ x: 840, y: 700 }, { x: 960, y: 690 }, { x: 990, y: 780 }, { x: 860, y: 800 }], fill: 'rgba(124, 92, 255, 0.14)' }
    case 'edit_shape': return { objectId: firstOfKind(world, 'shape'), stroke: '#7c5cff', strokeWidth: 3 }
    case 'set_matrix_cells': return { objectId: firstOfKind(world, 'matrix'), cells: [{ row: 0, column: 1, value: 0.5 }] }
    case 'set_graph': return { objectId: firstOfKind(world, 'graph'), showTangentAt: 1 }
    case 'set_arrow': return { objectId: firstOfKind(world, 'arrow'), to: { x: 900, y: 620 } }
    case 'create_timeline': return { name: 'Inspector camera pulse', duration: 4, tracks: [{ target: { kind: 'camera', path: 'zoom' }, keyframes: [{ time: 0, value: world.viewport.zoom }, { time: 2, value: Math.min(1.6, world.viewport.zoom * 1.2) }, { time: 4, value: world.viewport.zoom }] }] }
    case 'add_keyframes': return { timelineId, target: { kind: 'camera', path: 'x' }, keyframes: [{ time: 0, value: world.viewport.x }, { time: 3, value: world.viewport.x + 40 }] }
    case 'play_timeline': return { timelineId, action: 'play' }
    case 'get_timelines': return {}
    default: return {}
  }
}

const CALL_COUNT_STYLE: React.CSSProperties = {
  marginLeft: 6, padding: '1px 5px', borderRadius: 999, verticalAlign: 'middle',
  font: "10px/1.4 'Fira Code', monospace", fontStyle: 'normal', color: 'var(--paper, #f7f4ec)', background: 'var(--agent, #7c5cff)',
}

function statusLabel(status: RegistrationStatus | null, defined: number) {
  if (!status) return 'checking browser…'
  if (status.state === 'live') return `${status.registered} / ${status.total} registered with the browser`
  if (status.state === 'partial') return `${status.registered} / ${status.total} registered · ${status.failures.length} failed`
  if (status.state === 'unsupported') return `${defined} / ${defined} defined · browser has no document.modelContext`
  return 'registration failed'
}

export default function WebMCPInspector({
  tools,
  status,
  world,
  callCounts,
}: {
  tools: WorldTool[]
  status: RegistrationStatus | null
  world: WorldState
  /** Completed invocations per tool name (trace events with phase 'complete'); shown as a badge when present. */
  callCounts?: Record<string, number>
}) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [message, setMessage] = useState<{ name: string; result: ToolResult } | null>(null)
  const grouped = useMemo(() => groupTools(tools), [tools])
  const sections = useMemo(() => [
    ...grouped.groups.filter(({ tools: members }) => members.length > 0),
    ...(grouped.ungrouped.length ? [{ group: { id: 'other', label: 'Other', purpose: 'Not yet grouped', tools: grouped.ungrouped.map((tool) => tool.name) }, tools: grouped.ungrouped }] : []),
  ], [grouped])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target instanceof Element && target.matches('input, textarea, [contenteditable="true"]')) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.toLowerCase() === 'w') setOpen((value) => !value)
      else if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const run = async (tool: WorldTool) => {
    if (running) return
    setRunning(tool.name)
    const result = await tool.execute(seededInput(tool.name, world))
    setRunning(null)
    setMessage({ name: tool.name, result })
    window.setTimeout(() => setMessage((current) => current?.name === tool.name ? null : current), 4200)
  }

  return (
    <>
      <div className="webmcp-launcher">
        <button
          type="button"
          className="webmcp-inspector-trigger"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`${open ? 'Close' : 'Open'} the WebMCP inspector — ${tools.length} live page tools`}
        >
          <i aria-hidden />
          <b>WebMCP</b>
          <em><strong>{tools.length}</strong> <span>live page </span>tools</em>
          <u aria-hidden>W</u>
        </button>
      </div>
      {open && (
        <aside className="webmcp-inspector" aria-label="WebMCP tool inspector">
          <header>
            <div><span>Agent interface</span><h2><span className="webmcp-count"><b>{status?.state === 'live' || status?.state === 'partial' ? status.registered : tools.length}</b> / {tools.length}</span> page tools</h2></div>
            <button type="button" aria-label="Close WebMCP inspector" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className={`webmcp-registration is-${status?.state ?? 'checking'}`}><i /><span>{statusLabel(status, tools.length)}</span></div>
          <p className="webmcp-intro">The external agent and the learner operate the exact same world. Run any tool here to prove it.</p>
          <div className="webmcp-groups" style={{ minHeight: 0, flex: '1 1 auto', overflowY: 'auto' }}>
            {sections.map(({ group, tools: members }) => (
              <section key={group.id}>
                <header><div><b>{group.label}</b><span>{group.purpose}</span></div><i>{members.length}</i></header>
                {members.map((tool) => {
                  const count = callCounts?.[tool.name] ?? 0
                  return (
                    <div className="webmcp-tool" key={tool.name} data-tool-name={tool.name}>
                      <span className={tool.annotations.readOnlyHint ? 'is-read' : 'is-write'}>{tool.annotations.readOnlyHint ? 'R' : 'W'}</span>
                      <div>
                        <b>
                          {tool.name}
                          {callCounts && count > 0 && (
                            <em className="webmcp-call-count" aria-label={`${count} completed call${count === 1 ? '' : 's'}`} title={`${count} completed call${count === 1 ? '' : 's'}`} style={CALL_COUNT_STYLE}>×{count}</em>
                          )}
                        </b>
                        <small>{tool.title}</small>
                      </div>
                      <button type="button" disabled={Boolean(running)} onClick={() => run(tool)}>{running === tool.name ? 'Running…' : 'Run'}</button>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
          {message && (
            <div className={`webmcp-message${message.result.ok ? ' is-ok' : ' is-error'}`} role="status">
              <b>{message.name}</b><span>{message.result.ok ? message.result.summary : message.result.error}</span>
            </div>
          )}
        </aside>
      )}
    </>
  )
}
