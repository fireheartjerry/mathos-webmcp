'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from 'react'
import {
  boundsCenter,
  buildResizeObjects,
  buildRotateObjects,
  buildTransformOperations,
  editableNodes,
  expandTargetIds,
  resizeBoundsFromHandle,
  rotatePoint,
  unionBounds,
  withEditedNodes,
  worldToObjectLocal,
} from '../domain/world/operations'
import type { ResizeHandle } from '../domain/world/operations'
import type { DirectorObjectOverride } from '../domain/world/director'
import type { CatalogSceneId } from '../domain/world/projects'
import type { Bounds, Point, Viewport, WorldAction, WorldObject, WorldState } from '../domain/world/types'
import type { ToolMode } from './ToolRail'
import NodeEditor from './canvas/NodeEditor'
import type { NodeRef } from './canvas/NodeEditor'
import SelectionHandles from './canvas/SelectionHandles'
import type { SelectionHandleId } from './canvas/SelectionHandles'
import { isCanvasControlTarget, useCanvasInputRouter } from './canvas/useCanvasInputRouter'
import CreationPopover from './creation/CreationPopover'
import { matrixCreationOptions, shapeCreationOptions, type MatrixCreationOption, type ShapeCreationOption } from './creation/toolOptions'
import WorldObjectView, { smoothStrokePath } from './WorldObjectView'
import '../styles/handles.css'

type Gesture =
  | { kind: 'pan'; pointerId: number; client: Point; viewport: Viewport }
  | { kind: 'drag'; pointerId: number; start: Point; ids: string[] }
  | { kind: 'ink'; pointerId: number; points: Point[]; highlighter: boolean }
  | { kind: 'freeform'; pointerId: number; points: Point[] }
  | {
      kind: 'resize'
      pointerId: number
      handle: ResizeHandle
      origin: Bounds
      rotation: number
      center: Point
      originals: WorldObject[]
    }
  | { kind: 'rotate'; pointerId: number; center: Point; startAngle: number; originals: WorldObject[] }
  | { kind: 'node'; pointerId: number; node: NodeRef; original: WorldObject }

type CreationPopoverState = {
  kind: 'shape' | 'matrix'
  point: Point
  anchor: Point
}

type CreationOptionId = ShapeCreationOption['id'] | MatrixCreationOption['id']

/** Live construction of a polygon (multi-click) or freeform (drag) shape. */
type PathDraft =
  | { kind: 'polygon'; points: Point[]; cursor: Point | null }
  | { kind: 'freeform'; points: Point[] }

const SHAPE_FILL = '#f4f0e6'
const SHAPE_STROKE = '#171713'
const SHAPE_PADDING = 6
const FREEFORM_CLOSE_DISTANCE = 12
const ROTATE_SNAP_DEGREES = 15

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

/** Fit a bounds box around world points with padding and return the points local to it. */
function fitPoints(points: Point[], padding: number): { bounds: Bounds; local: Point[] } {
  const left = Math.min(...points.map((point) => point.x)) - padding
  const top = Math.min(...points.map((point) => point.y)) - padding
  const right = Math.max(...points.map((point) => point.x)) + padding
  const bottom = Math.max(...points.map((point) => point.y)) + padding
  return {
    bounds: { x: left, y: top, width: Math.max(8, right - left), height: Math.max(8, bottom - top) },
    local: points.map((point) => ({ x: point.x - left, y: point.y - top })),
  }
}

/** Drop consecutive duplicates (a double-click lands two pointer-downs on one spot). */
function dedupePoints(points: Point[], tolerance: number): Point[] {
  return points.filter((point, index) => index === 0 || Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) > tolerance)
}

function angleDegrees(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
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
  navigationKey,
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
  navigationKey?: string | number
  mode: ToolMode
  run: (action: WorldAction) => void
  onEditObject: (id: string, object?: WorldObject) => void
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
  const armedShapeRef = useRef<'freeform' | null>(null)
  const transformPreviewRef = useRef<Record<string, WorldObject> | null>(null)
  const [dragPreview, setDragPreview] = useState<{ ids: string[]; delta: Point } | null>(null)
  const [inkPreview, setInkPreview] = useState<{ points: Point[]; highlighter: boolean } | null>(null)
  const [transformPreview, setTransformPreviewState] = useState<Record<string, WorldObject> | null>(null)
  const [pathDraft, setPathDraft] = useState<PathDraft | null>(null)
  const [viewportPreview, setViewportPreview] = useState<Viewport | null>(null)
  const [creationPopover, setCreationPopover] = useState<CreationPopoverState | null>(null)
  const effectiveViewport = directorMode && directorViewport ? directorViewport : world.viewport
  const effectiveSelection = directorMode ? directorSelection : world.selection
  const routeInput = useCanvasInputRouter(mode)

  const setTransformPreview = (preview: Record<string, WorldObject> | null) => {
    transformPreviewRef.current = preview
    setTransformPreviewState(preview)
  }

  // A pending click belongs to the tool and canvas it was opened in. Ordinary
  // world commits deliberately do not appear here, so they cannot invalidate
  // a popover while React is simply rerendering the canvas.
  useEffect(() => {
    setCreationPopover(null)
    setPathDraft(null)
    armedShapeRef.current = null
  }, [mode, navigationKey, scene])

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
    setCreationPopover(null)
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

  const startFreeform = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = screenToWorld(event.clientX, event.clientY)
    gestureRef.current = { kind: 'freeform', pointerId: event.pointerId, points: [point] }
    setPathDraft({ kind: 'freeform', points: [point] })
    capture(event.pointerId)
  }

  const closeCreationPopover = useCallback(() => setCreationPopover(null), [])

  /* ---------------------------------------------------------------------- */
  /* Polygon construction: click adds a vertex, double-click/Enter closes.   */
  /* ---------------------------------------------------------------------- */

  const finishPolygon = useCallback((draft: Extract<PathDraft, { kind: 'polygon' }>) => {
    setPathDraft(null)
    const points = dedupePoints(draft.points, 1)
    if (points.length < 3) return
    const fitted = fitPoints(points, SHAPE_PADDING)
    const id = crypto.randomUUID()
    const object: WorldObject = {
      id,
      kind: 'shape',
      shape: 'polygon',
      points: fitted.local,
      fill: SHAPE_FILL,
      stroke: SHAPE_STROKE,
      strokeWidth: 2,
      bounds: fitted.bounds,
      rotation: 0,
      author: 'human',
      opacity: 1,
    }
    run(makeAction('Created polygon', [{ type: 'put', object }, { type: 'select', ids: [id] }]))
  }, [run])

  const polygonDraft = pathDraft?.kind === 'polygon' ? pathDraft : null
  const polygonDraftRef = useRef(polygonDraft)
  polygonDraftRef.current = polygonDraft
  const polygonDrafting = polygonDraft !== null

  useEffect(() => {
    if (!polygonDrafting) return
    const onKeyDown = (event: KeyboardEvent) => {
      const draft = polygonDraftRef.current
      if (!draft) return
      if (event.key === 'Enter') {
        event.preventDefault()
        finishPolygon(draft)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setPathDraft(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [polygonDrafting, finishPolygon])

  /* ---------------------------------------------------------------------- */
  /* Creation                                                                */
  /* ---------------------------------------------------------------------- */

  const createAt = (point: Point, anchor = point, option?: CreationOptionId) => {
    if (mode === 'shape' && !option) {
      if (armedShapeRef.current === 'freeform') return
      setCreationPopover({ kind: 'shape', point, anchor })
      return
    }
    if (mode === 'matrix' && !option) {
      setCreationPopover({ kind: 'matrix', point, anchor })
      return
    }

    const id = crypto.randomUUID()
    const base = { id, rotation: 0, author: 'human' as const, opacity: 1 }
    let object: WorldObject | null = null

    if (mode === 'graph') {
      const equationId = crypto.randomUUID()
      const graphId = crypto.randomUUID()
      const entityId = `entity:${equationId}`
      const equation: WorldObject = {
        ...base,
        id: equationId,
        kind: 'equation',
        entityId,
        latex: '',
        color: '#171713',
        bounds: { x: point.x, y: point.y - 60, width: 330, height: 48 },
      }
      const graph: WorldObject = {
        ...base,
        id: graphId,
        kind: 'graph',
        entityId,
        equationId,
        xDomain: [-5, 5],
        yDomain: [-5, 5],
        color: '#7c5cff',
        bounds: { x: point.x, y: point.y, width: 480, height: 330 },
      }
      run(makeAction('Created an empty linked graph', [
        { type: 'putEntity', entity: { id: entityId, kind: 'expression', latex: '', parameters: {} } },
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
        primitives: [],
      }
    }

    if (mode === 'matrix') {
      const match = /^(\d)x(\d)$/.exec(option ?? '')
      if (!match) return
      const rows = Number(match[1])
      const columns = Number(match[2])
      const values = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (row === column ? 1 : 0)))
      object = {
        ...base,
        kind: 'matrix',
        values,
        sourceIds: [],
        accent: '#7c5cff',
        bounds: rows === 2 && columns === 2
          ? { x: point.x, y: point.y, width: 430, height: 330 }
          : { x: point.x, y: point.y, width: 360, height: 80 + rows * 56 },
      }
    }

    if (mode === 'text') {
      object = { ...base, kind: 'text', text: '', color: '#171713', fontSize: 24, bounds: { x: point.x, y: point.y, width: 230, height: 72 } }
    } else if (mode === 'equation') {
      object = { ...base, kind: 'equation', entityId: `entity:${id}`, latex: '', color: '#171713', bounds: { x: point.x, y: point.y, width: 230, height: 78 } }
    } else if (mode === 'shape') {
      if (option === 'polygon') {
        setPathDraft({ kind: 'polygon', points: [point], cursor: point })
        return
      }
      if (option === 'freeform') {
        armedShapeRef.current = 'freeform'
        return
      }
      if (option !== 'rectangle' && option !== 'ellipse' && option !== 'triangle') return
      object = { ...base, kind: 'shape', shape: option, fill: SHAPE_FILL, stroke: SHAPE_STROKE, bounds: { x: point.x, y: point.y, width: 170, height: 110 } }
    } else if (mode === 'arrow') {
      object = { ...base, kind: 'arrow', from: { x: 8, y: 102 }, to: { x: 172, y: 8 }, color: '#171713', bounds: { x: point.x, y: point.y, width: 180, height: 110 } }
    } else if (mode === 'frame') {
      object = { ...base, kind: 'frame', title: 'Untitled', childIds: [], bounds: { x: point.x, y: point.y, width: 520, height: 360 } }
    }

    if (!object) return
    const operations: WorldAction['operations'] = [
      ...(object.kind === 'equation'
        ? [{ type: 'putEntity' as const, entity: { id: object.entityId!, kind: 'expression' as const, latex: object.latex, parameters: {} } }]
        : []),
      { type: 'put', object },
      { type: 'select', ids: [id] },
    ]
    run(makeAction(`Created ${object.kind}`, operations))
    if (object.kind === 'text' || object.kind === 'equation') onEditObject(id, object)
  }

  /* ---------------------------------------------------------------------- */
  /* Pointer routing                                                         */
  /* ---------------------------------------------------------------------- */

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

    if (polygonDraft) {
      // The second pointer-down of a double-click closes the polygon (see onDoubleClick).
      if (event.detail > 1) return
      setPathDraft({ ...polygonDraft, points: [...polygonDraft.points, point], cursor: point })
      return
    }

    if (creationPopover) {
      setCreationPopover(null)
      return
    }

    if (mode === 'pen' || mode === 'highlighter') {
      startInk(event)
      return
    }

    if (mode === 'shape' && armedShapeRef.current === 'freeform') {
      startFreeform(event)
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

    const rect = canvasRef.current!.getBoundingClientRect()
    createAt(point, { x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  const handleCanvasDoubleClick = () => {
    if (polygonDraft) finishPolygon(polygonDraft)
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

  /* ---------------------------------------------------------------------- */
  /* Handle gestures: resize, rotate, node                                   */
  /* ---------------------------------------------------------------------- */

  // Objects that carry selection handles: the expanded selection, minus locked ones.
  const handleIds = mode === 'select' && !directorMode
    ? expandTargetIds(world, world.selection).filter((id) => !world.objects[id]?.locked)
    : []
  const handleObjects = handleIds.map((id) => world.objects[id])
  const singleHandleObject = handleObjects.length === 1 ? handleObjects[0] : null

  const handleSelectionHandlePointerDown = (handle: SelectionHandleId, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || handleObjects.length === 0) return
    event.stopPropagation()
    event.preventDefault()
    const origin = singleHandleObject ? singleHandleObject.bounds : unionBounds(world, handleIds)
    if (!origin) return
    const center = boundsCenter(origin)
    const pointer = screenToWorld(event.clientX, event.clientY)
    if (handle === 'rotate') {
      gestureRef.current = {
        kind: 'rotate',
        pointerId: event.pointerId,
        center,
        startAngle: angleDegrees(center, pointer),
        originals: handleObjects,
      }
    } else {
      gestureRef.current = {
        kind: 'resize',
        pointerId: event.pointerId,
        handle,
        origin,
        rotation: singleHandleObject?.rotation ?? 0,
        center,
        originals: handleObjects,
      }
    }
    setTransformPreview(Object.fromEntries(handleObjects.map((object) => [object.id, object])))
    capture(event.pointerId)
  }

  const handleNodePointerDown = (node: NodeRef, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !singleHandleObject) return
    event.stopPropagation()
    event.preventDefault()
    gestureRef.current = { kind: 'node', pointerId: event.pointerId, node, original: singleHandleObject }
    setTransformPreview({ [singleHandleObject.id]: singleHandleObject })
    capture(event.pointerId)
  }

  const commitNodeEdit = (summary: string, nodes: Point[]) => {
    if (!singleHandleObject) return
    run(makeAction(summary, [{ type: 'put', object: withEditedNodes(singleHandleObject, nodes, true) }]))
  }

  const handleInsertNode = (afterIndex: number) => {
    if (!singleHandleObject) return
    const nodes = editableNodes(singleHandleObject)
    const a = nodes[afterIndex]
    const b = nodes[(afterIndex + 1) % nodes.length]
    if (!a || !b) return
    const next = [...nodes]
    next.splice(afterIndex + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    commitNodeEdit('Inserted shape node', next)
  }

  const handleDeleteNode = (index: number) => {
    if (!singleHandleObject) return
    const nodes = editableNodes(singleHandleObject)
    commitNodeEdit('Deleted shape node', nodes.filter((_, nodeIndex) => nodeIndex !== index))
  }

  /* ---------------------------------------------------------------------- */
  /* Move / finish                                                           */
  /* ---------------------------------------------------------------------- */

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture) {
      if (polygonDraft) setPathDraft({ ...polygonDraft, cursor: screenToWorld(event.clientX, event.clientY) })
      return
    }
    if (gesture.pointerId !== event.pointerId) return

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

    if (gesture.kind === 'resize') {
      const local = rotatePoint(point, gesture.center, -gesture.rotation)
      const target = resizeBoundsFromHandle(gesture.origin, gesture.handle, local, event.shiftKey)
      const next = buildResizeObjects(gesture.originals, gesture.origin, target)
      setTransformPreview(Object.fromEntries(next.map((object) => [object.id, object])))
      return
    }

    if (gesture.kind === 'rotate') {
      const delta = angleDegrees(gesture.center, point) - gesture.startAngle
      const next = buildRotateObjects(gesture.originals, gesture.center, delta, event.shiftKey ? ROTATE_SNAP_DEGREES : undefined)
      setTransformPreview(Object.fromEntries(next.map((object) => [object.id, object])))
      return
    }

    if (gesture.kind === 'node') {
      const nodes = [...editableNodes(gesture.original)]
      const index = gesture.node.kind === 'arrow' ? (gesture.node.end === 'from' ? 0 : 1) : gesture.node.index
      nodes[index] = worldToObjectLocal(gesture.original, point)
      const next = withEditedNodes(gesture.original, nodes, true)
      setTransformPreview({ [next.id]: next })
      return
    }

    const previous = gesture.points.at(-1)!
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.5) return
    gesture.points.push(point)
    if (gesture.kind === 'ink') setInkPreview({ points: [...gesture.points], highlighter: gesture.highlighter })
    else setPathDraft({ kind: 'freeform', points: [...gesture.points] })
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
    } else if (gesture.kind === 'resize' || gesture.kind === 'rotate' || gesture.kind === 'node') {
      const preview = transformPreviewRef.current
      const changed = preview
        ? Object.values(preview).filter((object) => object !== world.objects[object.id])
        : []
      if (changed.length > 0) {
        const summary = gesture.kind === 'resize'
          ? 'Resized objects'
          : gesture.kind === 'rotate'
            ? 'Rotated objects'
            : gesture.node.kind === 'arrow'
              ? (gesture.node.end === 'to' ? 'Moved arrow head' : 'Moved arrow tail')
              : 'Moved shape node'
        run(makeAction(summary, changed.map((object) => ({ type: 'put' as const, object }))))
      }
      setTransformPreview(null)
    } else if (gesture.kind === 'freeform') {
      armedShapeRef.current = null
      const points = gesture.points
      if (points.length > 1) {
        const first = points[0]
        const last = points[points.length - 1]
        const closed = Math.hypot(last.x - first.x, last.y - first.y) <= FREEFORM_CLOSE_DISTANCE
        const fitted = fitPoints(closed ? [...points, first] : points, SHAPE_PADDING)
        const id = crypto.randomUUID()
        const object: WorldObject = {
          id,
          kind: 'shape',
          shape: 'freeform',
          points: fitted.local,
          fill: closed ? SHAPE_FILL : 'none',
          stroke: SHAPE_STROKE,
          strokeWidth: 2,
          bounds: fitted.bounds,
          rotation: 0,
          author: 'human',
          opacity: 1,
        }
        run(makeAction('Created freeform shape', [{ type: 'put', object }, { type: 'select', ids: [id] }]))
      }
      setPathDraft(null)
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

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

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

  // What the object looks like right now: live transform preview first, then
  // Director overrides, then the committed object.
  const displayObject = (id: string): WorldObject | null => {
    const original = world.objects[id]
    if (!original) return null
    return transformPreview?.[id] ?? withDirectorOverride(original)
  }

  // Selection frame: a single object's own (rotated) frame, or the axis-aligned
  // union of a multi-selection. It follows drag and transform previews.
  const handleDisplayObjects = handleIds.map(displayObject).filter((object): object is WorldObject => Boolean(object))
  const dragOffset = dragPreview?.delta ?? { x: 0, y: 0 }
  const frame: { bounds: Bounds; rotation: number; agent: boolean } | null = handleDisplayObjects.length === 0
    ? null
    : handleDisplayObjects.length === 1
      ? {
          bounds: {
            ...handleDisplayObjects[0].bounds,
            x: handleDisplayObjects[0].bounds.x + (dragPreview?.ids.includes(handleDisplayObjects[0].id) ? dragOffset.x : 0),
            y: handleDisplayObjects[0].bounds.y + (dragPreview?.ids.includes(handleDisplayObjects[0].id) ? dragOffset.y : 0),
          },
          rotation: handleDisplayObjects[0].rotation,
          agent: handleDisplayObjects[0].author === 'agent',
        }
      : (() => {
          const boxes = handleDisplayObjects.map((object) => {
            const dragged = dragPreview?.ids.includes(object.id)
            return { ...object.bounds, x: object.bounds.x + (dragged ? dragOffset.x : 0), y: object.bounds.y + (dragged ? dragOffset.y : 0) }
          })
          const left = Math.min(...boxes.map((box) => box.x))
          const top = Math.min(...boxes.map((box) => box.y))
          const right = Math.max(...boxes.map((box) => box.x + box.width))
          const bottom = Math.max(...boxes.map((box) => box.y + box.height))
          return {
            bounds: { x: left, y: top, width: right - left, height: bottom - top },
            rotation: 0,
            agent: handleDisplayObjects.every((object) => object.author === 'agent'),
          }
        })()
  const nodeEditorObject = handleDisplayObjects.length === 1 && !dragPreview && editableNodes(handleDisplayObjects[0]).length > 0
    ? handleDisplayObjects[0]
    : null
  const showHandles = Boolean(frame) && !inkPreview && !pathDraft

  const stageStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    '--hs': 1 / viewport.zoom,
  } as CSSProperties

  const draftPoints = pathDraft
    ? (pathDraft.kind === 'polygon' && pathDraft.cursor ? [...pathDraft.points, pathDraft.cursor] : pathDraft.points)
    : []
  const draftBounds = draftPoints.length > 0
    ? {
        left: Math.min(...draftPoints.map((point) => point.x)) - 12,
        top: Math.min(...draftPoints.map((point) => point.y)) - 12,
        width: Math.max(24, Math.max(...draftPoints.map((point) => point.x)) - Math.min(...draftPoints.map((point) => point.x)) + 24),
        height: Math.max(24, Math.max(...draftPoints.map((point) => point.y)) - Math.min(...draftPoints.map((point) => point.y)) + 24),
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
      onDoubleClick={handleCanvasDoubleClick}
      onWheel={handleWheel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="problem-breadcrumb"><span>{breadcrumb.number}</span> {breadcrumb.title} <i>{breadcrumb.state}</i></div>
      <div className="world-stage" style={stageStyle}>
        {world.order.map((id) => {
          const original = world.objects[id]
          if (!original) return null
          if (directorMode && directorOverrides[id]?.opacity === 0) return null
          const object = displayObject(id) ?? withDirectorOverride(original)
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
        {showHandles && frame && (
          <SelectionHandles
            bounds={frame.bounds}
            rotation={frame.rotation}
            agent={frame.agent}
            onHandlePointerDown={handleSelectionHandlePointerDown}
          />
        )}
        {showHandles && nodeEditorObject && (
          <NodeEditor
            object={nodeEditorObject}
            onNodePointerDown={handleNodePointerDown}
            onInsertNode={handleInsertNode}
            onDeleteNode={handleDeleteNode}
          />
        )}
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
        {pathDraft && draftBounds && (
          <svg
            className="path-preview"
            style={{ left: draftBounds.left, top: draftBounds.top, width: draftBounds.width, height: draftBounds.height }}
            viewBox={`0 0 ${draftBounds.width} ${draftBounds.height}`}
          >
            {pathDraft.kind === 'polygon' ? (
              <>
                <polyline
                  points={draftPoints.map((point) => `${point.x - draftBounds.left},${point.y - draftBounds.top}`).join(' ')}
                  fill={pathDraft.points.length > 2 ? SHAPE_FILL : 'none'}
                  fillOpacity={0.5}
                  stroke={SHAPE_STROKE}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {pathDraft.points.length > 2 && (
                  <line
                    x1={pathDraft.points[pathDraft.points.length - 1].x - draftBounds.left}
                    y1={pathDraft.points[pathDraft.points.length - 1].y - draftBounds.top}
                    x2={pathDraft.points[0].x - draftBounds.left}
                    y2={pathDraft.points[0].y - draftBounds.top}
                    stroke={SHAPE_STROKE}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {pathDraft.points.map((point, index) => (
                  <rect
                    key={index}
                    className="path-preview-node"
                    x={point.x - draftBounds.left - 4 / viewport.zoom}
                    y={point.y - draftBounds.top - 4 / viewport.zoom}
                    width={8 / viewport.zoom}
                    height={8 / viewport.zoom}
                    strokeWidth={1 / viewport.zoom}
                  />
                ))}
              </>
            ) : (
              <path
                d={smoothStrokePath(pathDraft.points.map((point) => ({ x: point.x - draftBounds.left, y: point.y - draftBounds.top })))}
                fill="none"
                stroke={SHAPE_STROKE}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>
      {directorMode && <div className="director-safe-frame" aria-hidden="true"><span>title safe · 7%</span></div>}
      <div className="canvas-mode">
        <b>{mode}</b>
        <span>{polygonDraft ? 'click to add vertices · double-click or Enter to close · Esc cancels' : 'right-drag to pan'}</span>
      </div>
      {creationPopover && (
        <CreationPopover
          title={creationPopover.kind === 'shape' ? 'Choose a shape' : 'Choose matrix dimensions'}
          description={creationPopover.kind === 'shape' ? 'Pick the annotation to place here.' : 'Starts as an identity-like matrix you can edit.'}
          anchor={creationPopover.anchor}
          options={creationPopover.kind === 'shape' ? shapeCreationOptions : matrixCreationOptions}
          onSelect={(option) => {
            setCreationPopover(null)
            createAt(creationPopover.point, creationPopover.anchor, option as CreationOptionId)
          }}
          onCancel={closeCreationPopover}
        />
      )}
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImage} />
    </section>
  )
}
