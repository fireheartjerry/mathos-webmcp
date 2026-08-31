'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadWorld, saveWorld } from '../domain/world/persistence'
import { dispatchWorldAction, stepWorldHistory } from '../domain/world/reducer'
import { createSeedWorld } from '../domain/world/seed'
import { findDependentIds } from '../domain/world/dependencies'
import {
  buildDeleteOperations,
  buildDuplicateOperations,
  buildTransformOperations,
  expandTargetIds,
  unionBounds,
} from '../domain/world/operations'
import type { WorldAction, WorldObject, WorldOperation, WorldState } from '../domain/world/types'
import ToolRail from './ToolRail'
import type { ToolMode } from './ToolRail'
import WorldCanvas from './WorldCanvas'

const humanAction = (summary: string, operations: WorldOperation[]): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

export default function MathburstWorkspace() {
  const [world, setWorld] = useState<WorldState>(() => createSeedWorld())
  const [hydrated, setHydrated] = useState(false)
  const [mode, setMode] = useState<ToolMode>('select')
  const [editorId, setEditorId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [editorMatrix, setEditorMatrix] = useState<[[number, number], [number, number]] | null>(null)

  useEffect(() => {
    const stored = loadWorld()
    if (stored) setWorld(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWorld(world)
  }, [hydrated, world])

  const run = useCallback((action: WorldAction) => {
    setWorld((current) => dispatchWorldAction(current, action))
  }, [])

  const history = useCallback((direction: 'undo' | 'redo') => {
    setWorld((current) => stepWorldHistory(current, direction, 'human'))
  }, [])

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
        <div className="world-status"><i /> local session · saved</div>
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

      <WorldCanvas world={world} mode={mode} run={run} onEditObject={openEditor} />

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
