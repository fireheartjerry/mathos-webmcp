'use client'

import { useEffect, useMemo, useState } from 'react'
import { groupTools } from '../domain/tools/groups'
import type { ToolResult, WorldTool } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import type { WorldObject, WorldState } from '../domain/world/types'

const inspectorNote = (): WorldObject => ({
  id: 'inspector_note', kind: 'text', text: 'Created through WebMCP', color: '#171713', fontSize: 20,
  bounds: { x: 820, y: 610, width: 260, height: 54 }, rotation: 0, author: 'agent', opacity: 1,
})

function seededInput(name: string, world: WorldState): unknown {
  const note = world.objects.inspector_note
  const targetId = note ? note.id : 'source'
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
    default: return {}
  }
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
}: {
  tools: WorldTool[]
  status: RegistrationStatus | null
  world: WorldState
}) {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [message, setMessage] = useState<{ name: string; result: ToolResult } | null>(null)
  const grouped = useMemo(() => groupTools(tools), [tools])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable="true"]')) return
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
          <div className="webmcp-groups">
            {grouped.groups.map(({ group, tools: members }) => (
              <section key={group.id}>
                <header><div><b>{group.label}</b><span>{group.purpose}</span></div><i>{members.length}</i></header>
                {members.map((tool) => (
                  <div className="webmcp-tool" key={tool.name} data-tool-name={tool.name}>
                    <span className={tool.annotations.readOnlyHint ? 'is-read' : 'is-write'}>{tool.annotations.readOnlyHint ? 'R' : 'W'}</span>
                    <div><b>{tool.name}</b><small>{tool.title}</small></div>
                    <button type="button" disabled={Boolean(running)} onClick={() => run(tool)}>{running === tool.name ? 'Running…' : 'Run'}</button>
                  </div>
                ))}
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
