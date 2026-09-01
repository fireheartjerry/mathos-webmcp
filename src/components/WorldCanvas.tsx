'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from 'react'
import { buildTransformOperations, expandTargetIds } from '../domain/world/operations'
import type { DirectorObjectOverride } from '../domain/world/director'
import type { CatalogSceneId } from '../domain/world/projects'
import type { Point, Viewport, WorldAction, WorldObject, WorldState } from '../domain/world/types'
import type { ToolMode } from './ToolRail'
import { isCanvasControlTarget, useCanvasInputRouter } from './canvas/useCanvasInputRouter'
import WorldObjectView from './WorldObjectView'

type Gesture =
  | { kind: 'pan'; pointerId: number; client: Point; viewport: Viewport }
  | { kind: 'drag'; pointerId: number; start: Point; ids: string[] }
  | { kind: 'ink'; pointerId: number; points: Point[]; highlighter: boolean }

const makeAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

function expandDirectorTargetIds(world: WorldState, ids: string[]): string[] {
  const expanded = new Set<string>()
  const visit = (id: string) => {
    const object = world.objects[id]
    if (!object || expanded.has(id)) return
    expanded.add(id)
    if (object.kind === 'group' || object.kind === 'frame') object.childIds.forEach(visit)
  }
  ids.forEach(visit)
  return world.order.filter((id) => expanded.has(id))
}

const sceneBreadcrumbs: Record<CatalogSceneId, { number: string; title: string; state: string }> = {
  'gamma-clinic': { number: '01', title: 'Gamma Recurrence', state: 'human + tutor' },
  'gamma-probability': { number: '02', title: 'Gamma Density', state: 'normalized mass' },
  'attention-geometry': { number: '03', title: 'Attention', state: 'live softmax' },
  'train-from-scratch': { number: '04', title: 'Gradient Step', state: 'model update' },
  'attention-barycentrics': { number: '05', title: 'Barycentric Coordinates', state: 'affine weights' },
  'spiral-similarity': { number: '06', title: 'Spiral Similarity', state: 'preserved ratio' },
  'tetrahedral-probability': { number: '07', title: 'Simplex', state: 'projected 3-simplex' },
  'partition-observatory': { number: '08', title: 'Integer Partitions', state: 'finite verification' },
  overview: { number: '—', title: 'Project overview', state: 'all scenes' },
}

export default function WorldCanvas({
  world,
  scene,
  mode,
  run,
  onEditObject,
  agentCommitIds = [],
  tutorOverlay,
  directorMode = false,
  directorViewport,
  directorOverrides = {},
  directorSelection = [],
  cameraPreviewing = false,
  onDirectorViewportChange,
  onDirectorTransform,
  onDirectorSelection,
  customBreadcrumb,
}: {
  world: WorldState
  scene: CatalogSceneId
  mode: ToolMode
  run: (action: WorldAction) => void
  onEditObject: (id: string) => void
  agentCommitIds?: string[]
  tutorOverlay?: ReactNode
  directorMode?: boolean
  directorViewport?: Viewport
  directorOverrides?: Record<string, DirectorObjectOverride>
  directorSelection?: string[]
  cameraPreviewing?: boolean
  onDirectorViewportChange?: (viewport: Viewport) => void
  onDirectorTransform?: (ids: string[], delta: Point) => void
  onDirectorSelection?: (ids: string[]) => void
  customBreadcrumb?: { number: string; title: string; state: string }
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageAnchorRef = useRef<Point>({ x: 260, y: 180 })
  const gestureRef = useRef<Gesture | null>(null)
  const [dragPreview, setDragPreview] = useState<{ ids: string[]; delta: Point } | null>(null)
  const [inkPreview, setInkPreview] = useState<{ points: Point[]; highlighter: boolean } | null>(null)
  const [viewportPreview, setViewportPreview] = useState<Viewport | null>(null)
  const effectiveViewport = directorMode && directorViewport ? directorViewport : world.viewport
  const effectiveSelection = directorMode ? directorSelection : world.selection
  const routeInput = useCanvasInputRouter(mode)

  const withDirectorOverride = (object: WorldObject): WorldObject => {
    if (!directorMode) return object
    const override = directorOverrides[object.id]
    return override ? {
      ...object,
      ...override,
      bounds: override.bounds ? { ...object.bounds, ...override.bounds } : object.bounds,
    } as WorldObject : object
  }

  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left - effectiveViewport.x) / effectiveViewport.zoom,
      y: (clientY - rect.top - effectiveViewport.y) / effectiveViewport.zoom,
    }
  }

  const capture = (pointerId: number) => {
    try { canvasRef.current?.setPointerCapture(pointerId) } catch { /* pointer already ended */ }
  }

  const startPan = (event: ReactPointerEvent) => {
    gestureRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      client: { x: event.clientX, y: event.clientY },
      viewport: effectiveViewport,
    }
    capture(event.pointerId)
  }

  const startInk = (event: ReactPointerEvent<HTMLDivElement>) => {
    const highlighter = mode === 'highlighter'
    const point = screenToWorld(event.clientX, event.clientY)
    gestureRef.current = { kind: 'ink', pointerId: event.pointerId, points: [point], highlighter }
    setInkPreview({ points: [point], highlighter })
    capture(event.pointerId)
  }

  const createAt = (point: Point) => {
    const id = crypto.randomUUID()
    const base = { id, rotation: 0, author: 'human' as const, opacity: 1 }
    let object: WorldObject | null = null

    if (mode === 'graph') {
      const equationId = crypto.randomUUID()
      const graphId = crypto.randomUUID()
      const equation: WorldObject = {
        ...base,
        id: equationId,
        kind: 'equation',
        latex: 'a(x^2-4x+3)',
        color: '#171713',
        bounds: { x: point.x, y: point.y - 60, width: 330, height: 48 },
      }
      const graph: WorldObject = {
        ...base,
        id: graphId,
        kind: 'graph',
        equationId,
        xDomain: [-1, 5],
        yDomain: [-2, 8],
        color: '#7c5cff',
        parameters: { a: 1 },
        showTangentAt: 2,
        shadeIntegral: [1, 3],
        bounds: { x: point.x, y: point.y, width: 480, height: 330 },
      }
      run(makeAction('Created a live linked graph', [
        { type: 'put', object: equation },
        { type: 'put', object: graph },
        { type: 'select', ids: [graphId] },
      ]))
      return
    }

    if (mode === 'geometry') {
      object = {
        ...base,
        kind: 'geometry',
        accent: '#7c5cff',
        bounds: { x: point.x, y: point.y, width: 430, height: 330 },
        primitives: [
          { kind: 'point', id: 'A', at: { x: 66, y: 264 }, label: 'A', draggable: true },
          { kind: 'point', id: 'B', at: { x: 360, y: 258 }, label: 'B', draggable: true },
          { kind: 'point', id: 'C', at: { x: 208, y: 62 }, label: 'C', draggable: true },
          { kind: 'polygon', id: 'triangle', points: ['A', 'B', 'C'] },
          { kind: 'segment', id: 'base-segment', from: 'A', to: 'B' },
          { kind: 'line', id: 'base-line', through: ['A', 'B'] },
          { kind: 'midpoint', id: 'M', of: ['A', 'B'], label: 'M' },
          { kind: 'circle', id: 'mid-circle', center: 'M', through: 'A' },
          { kind: 'perpendicular', id: 'altitude', through: 'C', to: 'base-line' },
          { kind: 'intersection', id: 'D', lines: ['base-line', 'altitude'], label: 'D' },
          { kind: 'segment', id: 'altitude-segment', from: 'C', to: 'D' },
          { kind: 'angle', id: 'angle-A', a: 'B', vertex: 'A', b: 'C' },
          { kind: 'homothety', id: 'C2', center: 'M', source: 'C', factor: 0.55, label: 'C′' },
        ],
      }
    }

    if (mode === 'matrix') {
      const vectors: WorldObject[] = [
        { ...base, id: crypto.randomUUID(), kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2, y: 1 }, color: '#171713', opacity: 0, bounds: { x: point.x, y: point.y, width: 1, height: 1 } },
        { ...base, id: crypto.randomUUID(), kind: 'arrow', from: { x: 0, y: 0 }, to: { x: -1, y: 2 }, color: '#171713', opacity: 0, bounds: { x: point.x, y: point.y, width: 1, height: 1 } },
        { ...base, id: crypto.randomUUID(), kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2.5, y: -1.4 }, color: '#171713', opacity: 0, bounds: { x: point.x, y: point.y, width: 1, height: 1 } },
      ]
      const matrix: WorldObject = {
        ...base,
        kind: 'matrix',
        values: [[1, 0.8], [0, 1]],
        sourceIds: vectors.map((vector) => vector.id),
        accent: '#7c5cff',
        bounds: { x: point.x, y: point.y, width: 500, height: 330 },
      }
      run(makeAction('Created a live matrix transformation', [
        ...vectors.map((vector) => ({ type: 'put' as const, object: vector })),
        { type: 'put', object: matrix },
        { type: 'select', ids: [matrix.id] },
      ]))
      return
    }

    if (mode === 'text') {
      object = { ...base, kind: 'text', text: 'Double-click to write', color: '#171713', fontSize: 24, bounds: { x: point.x, y: point.y, width: 230, height: 72 } }
    } else if (mode === 'equation') {
      object = { ...base, kind: 'equation', latex: 'x^2+y^2=1', color: '#171713', bounds: { x: point.x, y: point.y, width: 230, height: 78 } }
    } else if (mode === 'shape') {
      object = { ...base, kind: 'shape', shape: 'rectangle', fill: '#f4f0e6', stroke: '#171713', bounds: { x: point.x, y: point.y, width: 170, height: 110 } }
    } else if (mode === 'arrow') {
      object = { ...base, kind: 'arrow', from: { x: 8, y: 102 }, to: { x: 172, y: 8 }, color: '#171713', bounds: { x: point.x, y: point.y, width: 180, height: 110 } }
    } else if (mode === 'frame') {
      object = { ...base, kind: 'frame', title: 'New frame', childIds: [], bounds: { x: point.x, y: point.y, width: 520, height: 360 } }
    }

    if (!object) return
    run(makeAction(`Created ${object.kind}`, [{ type: 'put', object }, { type: 'select', ids: [id] }]))
    if (object.kind === 'text' || object.kind === 'equation') {
      requestAnimationFrame(() => onEditObject(id))
    }
  }

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Capture-phase routing handles pan/ink/object gestures first. This guard keeps
    // an unclaimed select/control event from clearing the current selection.
    if (mode === 'select' && isCanvasControlTarget(event.target)) return
    if (event.button === 2 || (event.button === 0 && mode === 'hand')) {
      event.preventDefault()
      startPan(event)
      return
    }
    if (event.button !== 0) return
    const point = screenToWorld(event.clientX, event.clientY)

    if (mode === 'pen' || mode === 'highlighter') {
      startInk(event)
      return
    }

    if (mode === 'image') {
      imageAnchorRef.current = point
      fileInputRef.current?.click()
      return
    }

    if (mode === 'select') {
      if (effectiveSelection.length) {
        if (directorMode) onDirectorSelection?.([])
        else run(makeAction('Cleared selection', [{ type: 'select', ids: [] }]))
      }
      return
    }

    createAt(point)
  }

  const handleCanvasPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = typeof Element !== 'undefined' && event.target instanceof Element ? event.target : null
    const objectElement = target?.closest('[data-object-id]')
    const objectId = objectElement?.getAttribute('data-object-id')
    const object = objectId ? world.objects[objectId] : undefined
    const owner = routeInput({
      button: event.button,
      target: event.target,
      objectId,
      objectKind: object?.kind,
    })

    if (owner === 'control' || owner === 'handle' || owner === null) return
    // Keep native focus/click/double-click behavior for selected objects. Pan and
    // ink are the only gestures whose browser defaults must be suppressed.
    if (owner === 'pan' || owner === 'ink') event.preventDefault()
    event.stopPropagation()
    if (owner === 'pan') startPan(event)
    else if (owner === 'ink') startInk(event)
    else if (owner === 'erase' || owner === 'object') handleObjectPointerDown(event, objectId!)
  }

  const handleObjectPointerDown = (event: ReactPointerEvent, id: string) => {
    const original = world.objects[id]
    const object = original ? withDirectorOverride(original) : undefined
    const owner = routeInput({
      button: event.button,
      target: event.target,
      objectId: id,
      objectKind: object?.kind,
    })
    if (owner === 'control' || owner === 'handle') return
    if (event.button === 2) {
      event.preventDefault()
      event.stopPropagation()
      startPan(event)
      return
    }
    if (event.button !== 0) return
    if (!object) return

    if (mode !== 'select' && mode !== 'eraser') return
    event.stopPropagation()

    if (mode === 'eraser' && object.kind === 'ink') {
      run(makeAction('Erased ink', [{ type: 'remove', id }]))
      return
    }
    if (mode !== 'select' || object.locked) return

    const wasSelected = effectiveSelection.includes(id)
    const selected = event.shiftKey
      ? (wasSelected ? effectiveSelection.filter((selectedId) => selectedId !== id) : [...effectiveSelection, id])
      : (wasSelected ? effectiveSelection : [id])
    if (event.shiftKey || !wasSelected) {
      if (directorMode) onDirectorSelection?.(selected)
      else run(makeAction(event.shiftKey ? 'Changed multi-selection' : 'Selected object', [{ type: 'select', ids: selected }]))
    }
    if (!selected.includes(id)) return
    const ids = directorMode ? expandDirectorTargetIds(world, selected) : expandTargetIds(world, selected)
    gestureRef.current = {
      kind: 'drag',
      pointerId: event.pointerId,
      start: screenToWorld(event.clientX, event.clientY),
      ids,
    }
    setDragPreview({ ids, delta: { x: 0, y: 0 } })
    capture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    if (gesture.kind === 'pan') {
      setViewportPreview({
        ...gesture.viewport,
        x: gesture.viewport.x + event.clientX - gesture.client.x,
        y: gesture.viewport.y + event.clientY - gesture.client.y,
      })
      return
    }

    const point = screenToWorld(event.clientX, event.clientY)
    if (gesture.kind === 'drag') {
      setDragPreview({ ids: gesture.ids, delta: { x: point.x - gesture.start.x, y: point.y - gesture.start.y } })
      return
    }

    const previous = gesture.points.at(-1)!
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return
    gesture.points.push(point)
    setInkPreview({ points: [...gesture.points], highlighter: gesture.highlighter })
  }

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    gestureRef.current = null

    if (gesture.kind === 'pan') {
      if (viewportPreview) {
        if (directorMode) onDirectorViewportChange?.(viewportPreview)
        else run(makeAction('Panned the world', [{ type: 'viewport', viewport: viewportPreview }]))
      }
      setViewportPreview(null)
    } else if (gesture.kind === 'drag') {
      const delta = dragPreview?.delta ?? { x: 0, y: 0 }
      if (Math.hypot(delta.x, delta.y) > 0.5) {
        if (directorMode) onDirectorTransform?.(gesture.ids, delta)
        else run(makeAction('Moved objects', buildTransformOperations(world, gesture.ids, { translate: delta })))
      }
      setDragPreview(null)
    } else {
      const points = gesture.points
      if (points.length > 1) {
        const padding = gesture.highlighter ? 12 : 4
        const left = Math.min(...points.map((point) => point.x)) - padding
        const top = Math.min(...points.map((point) => point.y)) - padding
        const right = Math.max(...points.map((point) => point.x)) + padding
        const bottom = Math.max(...points.map((point) => point.y)) + padding
        const object: WorldObject = {
          id: crypto.randomUUID(),
          kind: 'ink',
          points: points.map((point) => ({ x: point.x - left, y: point.y - top })),
          color: gesture.highlighter ? '#7c5cff' : '#171713',
          width: gesture.highlighter ? 18 : 3,
          bounds: { x: left, y: top, width: Math.max(8, right - left), height: Math.max(8, bottom - top) },
          rotation: 0,
          author: 'human',
          opacity: gesture.highlighter ? 0.34 : 1,
        }
        run(makeAction(gesture.highlighter ? 'Highlighted' : 'Drew ink', [{ type: 'put', object }]))
      }
      setInkPreview(null)
    }

    try { canvasRef.current?.releasePointerCapture(event.pointerId) } catch { /* already released */ }
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const zoom = Math.min(2.5, Math.max(0.25, effectiveViewport.zoom * Math.exp(-event.deltaY * 0.0012)))
    const worldPoint = screenToWorld(event.clientX, event.clientY)
    const viewport = {
      x: event.clientX - rect.left - worldPoint.x * zoom,
      y: event.clientY - rect.top - worldPoint.y * zoom,
      zoom,
    }
    if (directorMode) onDirectorViewportChange?.(viewport)
    else run(makeAction('Zoomed the world', [{ type: 'viewport', viewport }]))
  }

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const object: WorldObject = {
        id: crypto.randomUUID(),
        kind: 'image',
        src: String(reader.result),
        alt: file.name,
        bounds: { x: imageAnchorRef.current.x, y: imageAnchorRef.current.y, width: 320, height: 220 },
        rotation: 0,
        author: 'human',
        opacity: 1,
      }
      run(makeAction('Imported image', [{ type: 'put', object }, { type: 'select', ids: [object.id] }]))
    }
    reader.readAsDataURL(file)
  }

  const viewport = viewportPreview ?? effectiveViewport
  const breadcrumb = customBreadcrumb ?? sceneBreadcrumbs[scene]
  const previewBounds = inkPreview && inkPreview.points.length > 0
    ? {
        left: Math.min(...inkPreview.points.map((point) => point.x)),
        top: Math.min(...inkPreview.points.map((point) => point.y)),
        right: Math.max(...inkPreview.points.map((point) => point.x)),
        bottom: Math.max(...inkPreview.points.map((point) => point.y)),
      }
    : null

  return (
    <section
      ref={canvasRef}
      className={`world-canvas mode-${mode}`}
      data-tool={mode}
      data-demo-scene={scene}
      data-panning={Boolean(viewportPreview)}
      data-director-mode={directorMode}
      data-camera-preview={cameraPreviewing}
      onPointerDownCapture={handleCanvasPointerDownCapture}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onWheel={handleWheel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="problem-breadcrumb"><span>{breadcrumb.number}</span> {breadcrumb.title} <i>{breadcrumb.state}</i></div>
      <div
        className="world-stage"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {world.order.map((id) => {
          const original = world.objects[id]
          if (!original) return null
          if (directorMode && directorOverrides[id]?.opacity === 0) return null
          const object = withDirectorOverride(original)
          const offset = dragPreview?.ids.includes(id) ? dragPreview.delta : undefined
          return (
            <WorldObjectView
              key={id}
              object={object}
              selected={effectiveSelection.includes(id)}
              agentCommit={agentCommitIds.includes(id)}
              previewOffset={offset}
              world={world}
              run={run}
              onPointerDown={handleObjectPointerDown}
              onDoubleClick={onEditObject}
            />
          )
        })}
        {tutorOverlay && <div className="tutor-overlay" onPointerDown={(event) => { if (event.button !== 2) event.stopPropagation() }}>{tutorOverlay}</div>}
        {inkPreview && previewBounds && (
          <svg
            className="ink-preview"
            style={{
              left: previewBounds.left - 12,
              top: previewBounds.top - 12,
              width: Math.max(24, previewBounds.right - previewBounds.left + 24),
              height: Math.max(24, previewBounds.bottom - previewBounds.top + 24),
            }}
            viewBox={`0 0 ${Math.max(24, previewBounds.right - previewBounds.left + 24)} ${Math.max(24, previewBounds.bottom - previewBounds.top + 24)}`}
          >
            <polyline
              points={inkPreview.points.map((point) => `${point.x - previewBounds.left + 12},${point.y - previewBounds.top + 12}`).join(' ')}
              fill="none"
              stroke={inkPreview.highlighter ? '#7c5cff' : '#171713'}
              strokeOpacity={inkPreview.highlighter ? 0.34 : 1}
              strokeWidth={inkPreview.highlighter ? 18 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {directorMode && <div className="director-safe-frame" aria-hidden="true"><span>title safe · 7%</span></div>}
      <div className="canvas-mode"><b>{mode}</b><span>right-drag to pan</span></div>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImage} />
    </section>
  )
}
