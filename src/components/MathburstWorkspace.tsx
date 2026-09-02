'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWorldTools } from '../domain/tools/definitions'
import type { ToolResult, WorldBridge, WorldTraceEvent } from '../domain/tools/definitions'
import { registerWorldTools } from '../domain/tools/registry'
import { summarizeProject } from '../domain/tools/leverage'
import { readProjectIdFromLocation, useProjectRoute } from './useProjectRoute'
import type { RegistrationStatus } from '../domain/tools/registry'
import { saveWorld } from '../domain/world/persistence'
import {
  cloneWorld,
  createBlankWorld,
  createDefaultProjectLibrary,
  createProjectWorld,
  createUserProject,
  loadProjectLibraryResult,
  saveProjectLibrary,
  type LibraryProject,
  type SceneViewport,
} from '../domain/world/library'
import { dispatchWorldAction, stepWorldHistory } from '../domain/world/reducer'
import { migrateWorld } from '../domain/world/migrations'
import { createSeedWorld, HERO_GRAPH_ID, OPENING_ATTEMPT_ID, OPENING_CORRECTION_ID, SOURCE_IMAGE_ID } from '../domain/world/seed'
import {
  getScene,
  getProjectForScene,
  getSceneObjectIds,
  getScenesForProject,
  getViewportForScene,
  PROJECTS,
  SCENES,
  type CatalogSceneId,
  type ProjectId,
} from '../domain/world/projects'
import { DIRECTOR_SHOTS, EMPTY_DIRECTOR_REVIEW, loadDirectorReview, saveDirectorReview } from '../domain/world/director'
import type { DirectorShot, DirectorShotEdit, DirectorShotViewport } from '../domain/world/director'
import { prepareDemoCue, reconstructionObjects, RECONSTRUCTION_AUDIT_SUMMARY, RECONSTRUCTION_UNCERTAIN_IDS } from '../domain/demo/cues'
import { gammaBinMasses } from '../domain/math/probability'
import { tetrahedralLatticeCount } from '../domain/math/simplex'
import { evaluateTinyModel } from '../domain/math/transformer'
import type { BridgeTransition, DemoCueId } from '../domain/demo/shotContract'
import CinematicBridge, { bridgeAnchors } from './CinematicBridge'
import type { BridgeEndpoints } from './CinematicBridge'
import type { SemanticEdit } from '../domain/semantic/transactions'
import { validateLatex } from '../domain/semantic/expression'
import type { SemanticBinding, SemanticEntity } from '../domain/semantic/types'
import { handwritingSampleToInk, loadHandwritingSamples, type HandwritingSample } from '../domain/world/handwriting'
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
  buildSemanticEditAction,
  buildTransformOperations,
  expandTargetIds,
  unionBounds,
} from '../domain/world/operations'
import type { AgentPresenceState, Point, Viewport, WorldAction, WorldObject, WorldOperation, WorldState } from '../domain/world/types'
import ActivityRail from './ActivityRail'
import AgentPresence from './AgentPresence'
import BrandMark from './BrandMark'
import PersonalProjectNavigator from './PersonalProjectNavigator'
import ProjectGallery from './ProjectGallery'
import DirectorReviewPanel from './DirectorReviewPanel'
import ReconstructionPanel from './ReconstructionPanel'
import ToolRail from './ToolRail'
import type { ToolMode } from './ToolRail'
import ProgressiveInspector from './inspector/ProgressiveInspector'
import WebMCPInspector from './WebMCPInspector'
import WebMCPTrace from './WebMCPTrace'
import WorldCanvas from './WorldCanvas'
import FilmCursor from './FilmCursor'
import AnimationTimeline from './animation/AnimationTimeline'
import { useTimelinePlayback } from './animation/useTimelinePlayback'
import AgentConsole from './sidebar/AgentConsole'
import AgentAura from './sidebar/AgentAura'
import AgentActivation, { useOneShot } from './sidebar/AgentActivation'
import ReadingIndicator from './sidebar/ReadingIndicator'
import ToolLedger, { useLedgerPin } from './sidebar/ToolLedger'
import ToolToast from './sidebar/ToolToast'
import { collapseInvocations, groupBurst, summarizeLedger } from '../domain/tools/ledger'
import type { LedgerEvent } from '../domain/tools/ledger'

/** `?film=1` hides Director chrome and exposes the in-page film driver hook. */
/** `?film=1` enables film mode; `?film=0`, `?film=false` and `?film=` do not. */
const detectFilmMode = () => {
  if (typeof window === 'undefined') return false
  const value = new URLSearchParams(window.location.search).get('film')
  if (value === null) return false
  return value !== '0' && value.toLowerCase() !== 'false' && value !== ''
}

const humanAction = (summary: string, operations: WorldOperation[]): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

const quietPresence: AgentPresenceState = { visible: false, x: 0, y: 0, label: 'Tutor', action: '' }

/**
 * A scene's camera frames that scene's own frame object, so the authored centre
 * can never drift from the content it is meant to show. The authored responsive
 * camera is the fallback while the frame is missing (the overview, a blank
 * project, or the first paint before the world hydrates).
 */
const cameraViewportForWorld = (
  scene: CatalogSceneId,
  width: number,
  height: number,
  world?: WorldState,
): Viewport => {
  const fallback = getViewportForScene(scene, width, height)
  if (!world || scene === 'overview') return fallback
  const frame = world.objects[SCENES[scene].frameId]
  if (!frame || frame.bounds.width <= 0 || frame.bounds.height <= 0) return fallback
  // Pad by the same fraction on both axes so a wide frame and a tall frame sit
  // in the picture identically.
  const padding = Math.min(96, Math.max(24, Math.min(width, height) * 0.06))
  const zoom = Math.min(2.5, Math.max(0.25, Math.min(
    Math.max(1, width - padding * 2) / frame.bounds.width,
    Math.max(1, height - padding * 2) / frame.bounds.height,
  )))
  return {
    x: width / 2 - (frame.bounds.x + frame.bounds.width / 2) * zoom,
    y: height / 2 - (frame.bounds.y + frame.bounds.height / 2) * zoom,
    zoom,
  }
}

/** How much closer the film camera sits than the Director review camera. The clinic keeps its Tutor panel above the frame in view. */
const filmCameraFit = (scene: CatalogSceneId) => (scene === 'gamma-clinic' ? 1.04 : 1.18)

const isUsableViewport = (viewport: Viewport | undefined): viewport is Viewport => Boolean(
  viewport
  && Number.isFinite(viewport.x)
  && Number.isFinite(viewport.y)
  && Number.isFinite(viewport.zoom)
  && viewport.zoom > 0,
)

/** Width of the pinned WebMCP column; the canvas and camera fit exclude it. */
const RAIL_WIDTH = 58
const HEADER_HEIGHT = 54
/**
 * The canvas element is the single source of truth for camera geometry: any
 * chrome that takes real layout width (the pinned WebMCP column) shrinks it,
 * and every viewport we compute must agree with what is actually on screen.
 * The arithmetic fallback only runs before the first paint.
 */
const canvasSize = () => {
  const element = typeof document !== 'undefined' ? document.querySelector('.world-canvas') : null
  const rect = element?.getBoundingClientRect()
  if (rect && rect.width > 1 && rect.height > 1) return { width: rect.width, height: rect.height }
  return {
    width: Math.max(1, window.innerWidth - RAIL_WIDTH),
    height: Math.max(1, window.innerHeight - HEADER_HEIGHT),
  }
}

const sceneViewportBookmark = (viewport: Viewport, width: number, height: number): SceneViewport => ({
  ...viewport,
  canvasWidth: width,
  canvasHeight: height,
})

const boundedViewportZoom = (zoom: number) => Math.min(2.5, Math.max(0.25, zoom))

type EquationView = Extract<WorldObject, { kind: 'equation' }>
type ExpressionEntity = Extract<SemanticEntity, { kind: 'expression' }>
type GraphView = Extract<WorldObject, { kind: 'graph' }>

/** Keep equation saves deterministic while leaving unrelated entity IDs intact. */
const expressionEntityIdFor = (world: WorldState, equation: EquationView): string => {
  const linked = equation.entityId ? world.entities[equation.entityId] : undefined
  if (linked?.kind === 'expression') return linked.id

  const preferred = `entity:${equation.id}`
  const preferredEntity = world.entities[preferred]
  if (!preferredEntity || preferredEntity.kind === 'expression') return preferred

  let candidate = `${preferred}:expression`
  let suffix = 2
  while (world.entities[candidate] && world.entities[candidate].kind !== 'expression') {
    candidate = `${preferred}:expression:${suffix}`
    suffix += 1
  }
  return candidate
}

const graphViewsForExpression = (world: WorldState, equation: EquationView, entityId: string): GraphView[] => (
  Object.values(world.objects)
    .filter((candidate): candidate is GraphView => candidate.kind === 'graph')
    .filter((graph) => {
      if (graph.entityId === entityId || graph.equationId === equation.id) return true
      const linkedEquation = world.objects[graph.equationId]
      return linkedEquation?.kind === 'equation' && linkedEquation.entityId === entityId
    })
    .sort((left, right) => left.id.localeCompare(right.id))
)

const expressionParameterBinding = (graphId: string, entityId: string, name: string): SemanticBinding => ({
  id: `binding:${graphId}:parameter:${name}`,
  source: { entityId, path: `parameters.${name}` },
  target: { objectId: graphId, path: `parameters.${name}` },
  forward: 'expression-parameter',
  inverse: 'expression-parameter',
})

const isSameExpressionParameterBinding = (left: SemanticBinding, right: SemanticBinding): boolean => (
  left.source.entityId === right.source.entityId
  && left.source.path === right.source.path
  && left.target.objectId === right.target.objectId
  && left.target.path === right.target.path
  && left.forward === right.forward
  && left.inverse === right.inverse
)

/** Rebase screen-space offsets when a saved camera was recorded at another size. */
const rebaseSceneViewport = (
  viewport: SceneViewport | DirectorShotViewport | undefined,
  width: number,
  height: number,
  fallback: Viewport,
): Viewport => {
  if (!viewport || !isUsableViewport(viewport)
    || typeof viewport.canvasWidth !== 'number' || !Number.isFinite(viewport.canvasWidth) || viewport.canvasWidth <= 0
    || typeof viewport.canvasHeight !== 'number' || !Number.isFinite(viewport.canvasHeight) || viewport.canvasHeight <= 0) {
    // Legacy bookmarks only contain screen-space x/y. Their old offsets cannot
    // be translated safely, so use the scene's responsive camera instead.
    return { ...fallback }
  }
  const sourceWidth = viewport.canvasWidth
  const sourceHeight = viewport.canvasHeight
  const scale = Math.min(1.8, Math.max(0.55, Math.min(width / sourceWidth, height / sourceHeight)))
  const zoom = boundedViewportZoom(viewport.zoom * scale)
  const center = {
    x: (sourceWidth / 2 - viewport.x) / viewport.zoom,
    y: (sourceHeight / 2 - viewport.y) / viewport.zoom,
  }
  return { x: width / 2 - center.x * zoom, y: height / 2 - center.y * zoom, zoom }
}

function applyCapturedOpeningAttempt(world: WorldState, samples: Record<string, HandwritingSample>): WorldState {
  const attempt = world.objects[OPENING_ATTEMPT_ID]
  if (!attempt) return world
  const captured = handwritingSampleToInk(samples, 'opening-attempt', {
    id: OPENING_ATTEMPT_ID,
    bounds: attempt.bounds,
    color: attempt.kind === 'ink' ? attempt.color : '#171713',
    width: attempt.kind === 'ink' ? attempt.width : 7.5,
    rotation: attempt.rotation,
    author: 'human',
    opacity: attempt.opacity,
  })
  return captured ? { ...world, objects: { ...world.objects, [OPENING_ATTEMPT_ID]: captured } } : world
}

/**
 * The final pull-back is a Director camera state, not cross-project leakage:
 * it reads every built-in project's own world (the live one for the active
 * document) and composes them for display only. Nothing here is written back.
 */
function buildOverviewWorld(projects: LibraryProject[], activeDocumentId: string, activeWorld: WorldState): WorldState {
  const active = projects.find((project) => project.id === activeDocumentId)
  const objects: WorldState['objects'] = {}
  const entities: WorldState['entities'] = {}
  const bindings: WorldState['bindings'] = {}
  const timelines: WorldState['timelines'] = {}
  const order: string[] = []
  for (const template of PROJECTS) {
    const source = active?.templateId === template.id
      ? activeWorld
      : projects.find((project) => project.kind === 'built-in' && project.id === template.id)?.world
    if (!source) continue
    for (const id of source.order) {
      if (objects[id] || !source.objects[id]) continue
      objects[id] = source.objects[id]
      order.push(id)
    }
    Object.assign(entities, source.entities)
    Object.assign(bindings, source.bindings)
    Object.assign(timelines, source.timelines)
  }
  return { ...activeWorld, objects, entities, bindings, timelines, order, selection: [] }
}

const sleep = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms) })

/** The honest numbers a bridge carries, read from the objects it leaves and lands on. */
function bridgeValues(transition: BridgeTransition, sourceWorld: WorldState, targetWorld: WorldState): number[] | undefined {
  const graph = sourceWorld.objects[HERO_GRAPH_ID]
  const attention = sourceWorld.objects.attention_mechanism ?? targetWorld.objects.attention_mechanism
  const training = sourceWorld.objects.training_panel
  const geometry = targetWorld.objects.simplex_projection
  switch (transition) {
    case 'area-bins':
      return graph?.kind === 'graph' ? gammaBinMasses(graph.parameters?.a ?? 4.5, graph.binEdges) : undefined
    case 'bins-logits':
      return attention?.kind === 'attention' ? [...attention.bridgeMasses] : undefined
    case 'ribbons-triangle':
      return training?.kind === 'training' && attention?.kind === 'attention'
        ? [...evaluateTinyModel(training.model, attention.bridgeMasses, attention.temperature).attentionWeights]
        : undefined
    case 'lattice-lanes':
      return geometry?.kind === 'simplex' ? [tetrahedralLatticeCount(Math.round(geometry.denominator))] : undefined
    default:
      return undefined
  }
}

export default function MathburstWorkspace({ initialProjectId }: { initialProjectId?: string } = {}) {
  const [world, setWorld] = useState<WorldState>(() => createSeedWorld())
  const worldRef = useRef(world)
  const mainWorldRef = useRef(world)
  const [galleryOpen, setGalleryOpen] = useState(true)
  const [libraryProjects, setLibraryProjects] = useState<LibraryProject[]>(() => createDefaultProjectLibrary())
  const libraryProjectsRef = useRef(libraryProjects)
  const [activeDocumentId, setActiveDocumentId] = useState<'main' | string>('main')
  const activeDocumentIdRef = useRef<'main' | string>('main')
  const [hydrated, setHydrated] = useState(false)
  const libraryStorageNeedsRepairRef = useRef(false)
  const [activeScene, setActiveScene] = useState<CatalogSceneId>('gamma-clinic')
  const activeSceneRef = useRef<CatalogSceneId>('gamma-clinic')
  const [canvasNavigationRevision, setCanvasNavigationRevision] = useState(0)
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
  const [traceEvents, setTraceEvents] = useState<WorldTraceEvent[]>([])
  const traceTimerRef = useRef<number | null>(null)
  /** Every tool call of the session, for the ledger, toast and inspector counters. */
  const [toolLog, setToolLog] = useState<LedgerEvent[]>([])
  const [ledgerPinned, toggleLedgerPinned] = useLedgerPin(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  /** Agent intent: purple auras around objects the agent is about to touch. */
  const [spotlightTargets, setSpotlightTargets] = useState<Array<{ id: string; until: number; label?: string }>>([])
  /** Render-only typewriter preview for a text or equation field while a tool types it live. */
  const [typingPreview, setTypingPreview] = useState<{ objectId: string; field: 'latex' | 'text'; value: string } | null>(null)
  /** Bumped to fire the one-shot activation sweep (console start, agent write). */
  const [activationTick, setActivationTick] = useState(0)
  const [activationKind, setActivationKind] = useState<'console' | 'call'>('console')
  const handwritingSamplesRef = useRef<Record<string, HandwritingSample>>({})
  const [directorOpen, setDirectorOpen] = useState(false)
  const [directorState, setDirectorState] = useState(EMPTY_DIRECTOR_REVIEW)
  const [directorSelection, setDirectorSelection] = useState<string[]>([])
  const [directorCameraPreviewing, setDirectorCameraPreviewing] = useState(false)
  const [projectSwitchPhase, setProjectSwitchPhase] = useState<'out' | 'in' | null>(null)
  const projectSwitchTimersRef = useRef<number[]>([])
  const [directorControlsHidden, setDirectorControlsHidden] = useState(false)
  /** A `/p/<id>` deep link, captured on the first render so no later URL rewrite can lose it. */
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(() => initialProjectId ?? readProjectIdFromLocation())
  const [filmMode, setFilmMode] = useState(false)
  useEffect(() => { setFilmMode(detectFilmMode()) }, [])
  const directorSceneSnapshotRef = useRef<{ scene: CatalogSceneId; viewport: SceneViewport } | null>(null)
  const directorOpenRef = useRef(false)
  const directorPreviewFrameRef = useRef<number | null>(null)
  const [cueRunning, setCueRunning] = useState<DemoCueId | null>(null)
  const cueRunningRef = useRef<DemoCueId | null>(null)
  const [bridgePlay, setBridgePlay] = useState<{ key: number; transition: BridgeTransition; endpoints: BridgeEndpoints } | null>(null)

  const updateLibraryProjects = useCallback((update: (projects: LibraryProject[]) => LibraryProject[]) => {
    setLibraryProjects((current) => {
      const next = update(current)
      libraryProjectsRef.current = next
      return next
    })
  }, [])

  const changeActiveScene = useCallback((scene: CatalogSceneId) => {
    activeSceneRef.current = scene
    setActiveScene(scene)
    setCanvasNavigationRevision((current) => current + 1)
  }, [])

  const cancelDirectorPreview = useCallback(() => {
    if (directorPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(directorPreviewFrameRef.current)
      directorPreviewFrameRef.current = null
    }
  }, [])

  // A user action that intentionally repairs a project is allowed to replace
  // malformed raw storage. Passive hydration/world effects stay blocked.
  const markLibraryStorageRepaired = useCallback(() => {
    libraryStorageNeedsRepairRef.current = false
  }, [])

  const persistActiveViewport = useCallback((viewport: Viewport) => {
    if (!hydrated || directorOpenRef.current) return
    const documentId = activeDocumentIdRef.current
    if (documentId === 'main') return
    const scene = activeSceneRef.current
    const project = libraryProjectsRef.current.find((candidate) => candidate.id === documentId)
    if (!project?.templateId || scene === 'overview') return
    if (!getScenesForProject(project.templateId).some((candidate) => candidate.id === scene)) return
    const { width, height } = canvasSize()
    updateLibraryProjects((projects) => projects.map((candidate) => candidate.id === documentId
      ? { ...candidate, sceneViewports: { ...candidate.sceneViewports, [scene]: sceneViewportBookmark(viewport, width, height) }, updatedAt: Date.now() }
      : candidate))
  }, [hydrated, updateLibraryProjects])

  const activeLibraryProject = activeDocumentId === 'main'
    ? null
    : libraryProjects.find((project) => project.id === activeDocumentId) ?? null
  const blankPersonalProject = activeLibraryProject?.templateId === null

  useEffect(() => {
    const samples = loadHandwritingSamples()
    handwritingSamplesRef.current = samples
    const libraryResult = loadProjectLibraryResult()
    libraryStorageNeedsRepairRef.current = libraryResult.needsRepair
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __mathburstDebug: { migrateWorld, loadProjectLibraryResult } })
    if (libraryResult.needsRepair) console.warn('Mathburst: the stored project library is distrusted, so saving pauses until a project is reset or created.', libraryResult.reasons)
    const storedLibrary = libraryResult.projects.map((project) => ({
      ...project,
      world: applyCapturedOpeningAttempt(project.world, samples),
    }))
    libraryProjectsRef.current = storedLibrary
    setLibraryProjects(storedLibrary)
    const galleryWorld = createBlankWorld('Projects')
    worldRef.current = galleryWorld
    mainWorldRef.current = galleryWorld
    setWorld(galleryWorld)
    activeDocumentIdRef.current = 'main'
    setActiveDocumentId('main')
    setGalleryOpen(true)
    setDirectorState(loadDirectorReview())
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A `/p/<id>` URL opens that project once the library is hydrated.
  useEffect(() => {
    if (!hydrated || pendingProjectId === null) return
    const project = libraryProjectsRef.current.find((candidate) => candidate.id === pendingProjectId && candidate.deletedAt === null)
    setPendingProjectId(null)
    if (project) openLibraryProject(project)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, pendingProjectId])
  useProjectRoute({
    activeProjectId: hydrated ? activeDocumentId : (initialProjectId ?? null),
    galleryOpen: hydrated ? galleryOpen : !initialProjectId,
    paused: pendingProjectId !== null,
  })

  /**
   * Keep the camera honest when the canvas itself changes size: the first paint
   * (the element does not exist while the opening viewport is computed), a
   * window resize, and pinning or unpinning the WebMCP column, which takes real
   * layout width. The scene's world-space centre is preserved; this is a camera
   * move, never a history commit.
   */
  const cameraViewport = useCallback(
    (scene: CatalogSceneId, width: number, height: number) => cameraViewportForWorld(scene, width, height, worldRef.current),
    [],
  )
  const canvasMetricsRef = useRef<{ width: number; height: number } | null>(null)
  useEffect(() => {
    if (!hydrated || galleryOpen) return
    const element = document.querySelector('.world-canvas')
    if (!element) return
    const reframe = (width: number, height: number) => {
      // The first pass after mounting always frames the scene: the opening
      // viewport was computed before this element existed and before the
      // WebMCP column claimed its width, so it cannot be trusted. Later
      // passes only act when the canvas actually changed size.
      const previous = canvasMetricsRef.current
      canvasMetricsRef.current = { width, height }
      if (previous && Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1) return
      if (directorOpenRef.current) return
      const scene = activeSceneRef.current
      if (scene === 'overview') return
      const viewport = cameraViewportForWorld(scene, width, height, worldRef.current)
      const current = worldRef.current
      if (Math.abs(current.viewport.x - viewport.x) < 0.5
        && Math.abs(current.viewport.y - viewport.y) < 0.5
        && Math.abs(current.viewport.zoom - viewport.zoom) < 0.001) return
      const next = { ...current, viewport }
      worldRef.current = next
      setWorld(next)
      persistActiveViewport(viewport)
    }
    // Settle on the next frame: pinning the column also runs viewport writes
    // that measured the canvas before its new width applied, and the camera
    // must be the last word.
    let frame: number | null = null
    const observer = new ResizeObserver(() => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = null
        const rect = element.getBoundingClientRect()
        if (rect.width > 1 && rect.height > 1) reframe(rect.width, rect.height)
      })
    })
    observer.observe(element)
    // Film mode and the project route both write a camera during startup, after
    // the first pass. One late settle guarantees the scene is framed however
    // that race resolves.
    const settle = window.setTimeout(() => {
      canvasMetricsRef.current = null
      const rect = element.getBoundingClientRect()
      if (rect.width > 1 && rect.height > 1) reframe(rect.width, rect.height)
    }, 420)
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      observer.disconnect()
    }
  }, [galleryOpen, hydrated, persistActiveViewport])

  useEffect(() => {
    if (!hydrated) return
    if (activeDocumentId === 'main') {
      mainWorldRef.current = world
      saveWorld(world)
      return
    }
    updateLibraryProjects((projects) => projects.map((project) => project.id === activeDocumentId
      ? { ...project, world, updatedAt: Date.now() }
      : project))
  }, [activeDocumentId, hydrated, updateLibraryProjects, world])

  useEffect(() => {
    if (hydrated && !libraryStorageNeedsRepairRef.current) saveProjectLibrary(libraryProjects)
  }, [hydrated, libraryProjects])

  useEffect(() => {
    if (hydrated) saveDirectorReview(directorState)
  }, [directorState, hydrated])

  // Selection and camera changes are not mathematical work: they apply
  // through the same reducer but never enter history, so Undo always
  // reverses a real commit and the activity rail only lists real commits.
  const run = useCallback((action: WorldAction) => {
    const transient = action.operations.every((operation) => operation.type === 'select' || operation.type === 'viewport')
    const current = worldRef.current
    const dispatched = dispatchWorldAction(current, action)
    const next = transient
      ? { ...dispatched, history: current.history, future: current.future, activity: current.activity }
      : dispatched
    worldRef.current = next
    setWorld(next)
    if (action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
  }, [persistActiveViewport])

  // Inline inspector edits intentionally stay on the same canonical human
  // action path as canvas gestures. One patch is one undoable put operation;
  // deeper inverse graph/geometry semantics remain a Phase 2 concern.
  const patchObject = useCallback((id: string, patch: Record<string, unknown>, summary = 'Updated object') => {
    const object = worldRef.current.objects[id]
    if (!object) return
    const boundsPatch = typeof patch.bounds === 'object' && patch.bounds !== null && !Array.isArray(patch.bounds)
      ? patch.bounds as Partial<typeof object.bounds>
      : undefined
    const next = {
      ...object,
      ...patch,
      ...(boundsPatch ? { bounds: { ...object.bounds, ...boundsPatch } } : {}),
      id: object.id,
      kind: object.kind,
      author: object.author,
    } as WorldObject
    if (object.kind === 'graph' && typeof patch.parameters === 'object' && patch.parameters !== null && !Array.isArray(patch.parameters)) {
      const graph = next as Extract<WorldObject, { kind: 'graph' }>
      graph.parameters = { ...(object.parameters ?? {}), ...(patch.parameters as Record<string, number>) }
    }
    run(humanAction(summary, [{ type: 'put', object: next }]))
  }, [run])

  const applySemanticEdit = useCallback((edit: SemanticEdit, summary?: string) => {
    const action = buildSemanticEditAction(worldRef.current, edit, 'human')
    if (summary) action.summary = summary
    run(action)
  }, [run])

  /** Commit text/equation drafts from the current world, including linked entities. */
  const commitEditor = useCallback((id: string, value: string): boolean => {
    const currentWorld = worldRef.current
    const object = currentWorld.objects[id]
    if (!object || (object.kind !== 'text' && object.kind !== 'equation')) return false
    if (object.kind === 'equation' && !validateLatex(value).valid) return false

    const operations: WorldOperation[] = []
    let updated: WorldObject
    if (object.kind === 'text') {
      updated = { ...object, text: value }
      operations.push({ type: 'put', object: updated })
    } else {
      const entityId = expressionEntityIdFor(currentWorld, object)
      const existing = currentWorld.entities[entityId]
      const entity: ExpressionEntity = existing?.kind === 'expression'
        ? { ...existing, latex: value }
        : { id: entityId, kind: 'expression', latex: value, parameters: {} }
      updated = { ...object, latex: value, entityId }
      operations.push({ type: 'putEntity', entity }, { type: 'put', object: updated })
    }
    if (object.kind === 'equation') {
      const dependents = findDependentIds(currentWorld, [object.id])
      if (dependents.length) operations.push({ type: 'select', ids: [object.id, ...dependents] })
    }
    run(humanAction(`Edited ${object.kind}`, operations))
    setEditorId(null)
    setEditorMatrix(null)
    return true
  }, [run])

  /** Add one detected parameter to the canonical expression and every graph view in one action. */
  const addExpressionParameter = useCallback((objectId: string, name: string) => {
    const currentWorld = worldRef.current
    const object = currentWorld.objects[objectId]
    if (!object || object.kind !== 'equation' || !name.trim()) return

    const entityId = expressionEntityIdFor(currentWorld, object)
    const existing = currentWorld.entities[entityId]
    const existingExpression = existing?.kind === 'expression' ? existing : undefined
    if (existingExpression?.parameters && Object.prototype.hasOwnProperty.call(existingExpression.parameters, name)) return

    const graphs = graphViewsForExpression(currentWorld, object, entityId)
    const graphValue = graphs
      .map((graph) => graph.parameters?.[name])
      .find((candidate): candidate is number => typeof candidate === 'number' && Number.isFinite(candidate))
    const expressionValue = existingExpression?.parameters?.[name]
    const value = typeof expressionValue === 'number' && Number.isFinite(expressionValue) ? expressionValue : graphValue ?? 1
    const entity: ExpressionEntity = {
      id: entityId,
      kind: 'expression',
      latex: existingExpression?.latex ?? object.latex,
      parameters: { ...(existingExpression?.parameters ?? {}), [name]: value },
    }
    const operations: WorldOperation[] = [{ type: 'putEntity', entity }]
    if (object.entityId !== entityId) operations.push({ type: 'put', object: { ...object, entityId } })

    for (const graph of graphs) {
      const binding = expressionParameterBinding(graph.id, entityId, name)
      const existingBinding = currentWorld.bindings[binding.id]
      const bindingIsUsable = !existingBinding || isSameExpressionParameterBinding(existingBinding, binding)
      const bindingIds = new Set(graph.bindingIds ?? [])
      if (bindingIsUsable) bindingIds.add(binding.id)
      if (!existingBinding) operations.push({ type: 'putBinding', binding })
      operations.push({
        type: 'put',
        object: {
          ...graph,
          entityId,
          parameters: { ...(graph.parameters ?? {}), [name]: value },
          bindingIds: [...bindingIds],
        },
      })
    }
    run(humanAction(`Added expression parameter ${name}`, operations))
  }, [run])

  /**
   * Tool calls arrive back to back from an agent. Rather than failing the
   * second call while the first one's presence is still settling, wait for
   * the Tutor to be free (bounded, so a stuck presence cannot hang a call).
   */
  const whenTutorFree = (deadlineMs = 4000) => new Promise<boolean>((resolve) => {
    const started = performance.now()
    const check = () => {
      if (!agentBusyRef.current) { resolve(true); return }
      if (performance.now() - started > deadlineMs) { resolve(false); return }
      window.setTimeout(check, 30)
    }
    check()
  })

  const runAgent = useCallback(async (action: WorldAction, targetIds: string[] = []): Promise<ToolResult> => {
    if (!(await whenTutorFree())) return { ok: false, summary: 'No changes made', error: 'Tutor is finishing another action.' }
    return new Promise((resolve) => {

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
        if (action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
        setAgentCommitIds(changedIds)
        // Resolve on a macrotask, not an animation frame: a background tab
        // never paints, and a cue must still finish there.
        window.setTimeout(() => resolve({
          ok: true,
          summary: action.summary,
          changedIds,
          data: { source: 'agent' },
        }), 0)
        finish(reduceMotion ? 120 : 920)
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
  })
  }, [persistActiveViewport])

  const runHistoryBridge = useCallback(async (direction: 'undo' | 'redo'): Promise<ToolResult> => {
    if (!(await whenTutorFree())) return { ok: false, summary: 'No changes made', error: 'Tutor is finishing another action.' }
    return new Promise((resolve) => {
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
      if (commit.action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
      setAgentCommitIds(changedIds)
      window.setTimeout(() => resolve({ ok: true, summary, changedIds, data: { source: 'agent' } }), 0)
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
  })
  }, [persistActiveViewport])

  const history = useCallback((direction: 'undo' | 'redo') => {
    const next = stepWorldHistory(worldRef.current, direction, 'human')
    worldRef.current = next
    setWorld(next)
    const commit = (direction === 'undo' ? next.future : next.history).at(-1)
    if (commit?.action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
  }, [persistActiveViewport])

  const stashActiveProject = useCallback(() => {
    const documentId = activeDocumentIdRef.current
    const currentWorld = worldRef.current
    if (documentId === 'main') {
      mainWorldRef.current = currentWorld
      saveWorld(currentWorld)
      return null
    }

    const snapshot = directorSceneSnapshotRef.current
    const currentScene = snapshot?.scene ?? activeSceneRef.current
    const { width, height } = canvasSize()
    const viewport = snapshot
      ? rebaseSceneViewport(snapshot.viewport, width, height, cameraViewport(currentScene, width, height))
      : currentWorld.viewport
    const currentProject = libraryProjectsRef.current.find((project) => project.id === documentId)
    if (!currentProject) return null
    const ownsScene = currentProject.templateId
      && currentScene !== 'overview'
      && getScenesForProject(currentProject.templateId).some((scene) => scene.id === currentScene)
    const sceneViewports = ownsScene
      ? { ...currentProject.sceneViewports, [currentScene]: sceneViewportBookmark(viewport, width, height) }
      : { ...currentProject.sceneViewports }
    const nextProject = { ...currentProject, sceneViewports, world: currentWorld, updatedAt: Date.now() }
    updateLibraryProjects((projects) => projects.map((project) => project.id === documentId ? nextProject : project))
    return nextProject
  }, [updateLibraryProjects])

  const navigateToScene = useCallback((scene: CatalogSceneId) => {
    if (directorOpenRef.current) return
    const currentProject = stashActiveProject()
    if (!currentProject?.templateId || scene === 'overview') return
    const ownsScene = getScenesForProject(currentProject.templateId).some((candidate) => candidate.id === scene)
    if (!ownsScene) return
    const { width: canvasWidth, height: canvasHeight } = canvasSize()
    // Camera navigation is intentionally not a world commit: changing scenes should
    // never pollute learner history or the activity rail.
    const storedViewport = currentProject.sceneViewports[scene]
    const viewport = isUsableViewport(storedViewport)
      ? rebaseSceneViewport(storedViewport, canvasWidth, canvasHeight, cameraViewport(scene, canvasWidth, canvasHeight))
      : cameraViewport(scene, canvasWidth, canvasHeight)
    const next = { ...worldRef.current, viewport }
    worldRef.current = next
    setWorld(next)
    changeActiveScene(scene)
    setGalleryOpen(false)
    setMode('select')
    setEditorId(null)
    setEditorMatrix(null)
  }, [changeActiveScene, stashActiveProject])

  const openLibraryProject = useCallback((project: LibraryProject, requestedScene?: CatalogSceneId) => {
    stashActiveProject()
    directorOpenRef.current = false
    cancelDirectorPreview()
    directorSceneSnapshotRef.current = null
    const targetProject = libraryProjectsRef.current.find((candidate) => candidate.id === project.id) ?? project
    const targetWorld = targetProject.world
    const { width: canvasWidth, height: canvasHeight } = canvasSize()
    const ownScenes = targetProject.templateId ? getScenesForProject(targetProject.templateId) : []
    const requestedOwnedScene = requestedScene && requestedScene !== 'overview'
      ? ownScenes.find((scene) => scene.id === requestedScene)?.id
      : undefined
    const configuredStartScene = targetProject.templateId && targetProject.startScene !== 'overview'
      ? ownScenes.find((scene) => scene.id === targetProject.startScene)?.id
      : undefined
    // Gallery clicks honor the project's persisted start scene. A numeric
    // shortcut may explicitly request one of this project's own scenes.
    const targetScene = targetProject.templateId
      ? requestedOwnedScene ?? configuredStartScene ?? ownScenes[0].id
      : 'overview'
    const storedViewport = targetProject.templateId && targetScene !== 'overview'
      ? targetProject.sceneViewports[targetScene]
      : undefined
    const viewport = targetProject.templateId && isUsableViewport(storedViewport)
      ? rebaseSceneViewport(storedViewport, canvasWidth, canvasHeight, cameraViewport(targetScene, canvasWidth, canvasHeight))
      : targetProject.templateId
        ? cameraViewport(targetScene, canvasWidth, canvasHeight)
      : { x: canvasWidth / 2, y: canvasHeight / 2, zoom: 1 }
    const nextWorld = { ...targetWorld, title: targetProject.title, viewport, selection: [] }
    const documentId = targetProject.id
    activeDocumentIdRef.current = documentId
    setActiveDocumentId(documentId)
    worldRef.current = nextWorld
    setWorld(nextWorld)
    setGalleryOpen(false)
    setDirectorOpen(false)
    setDirectorSelection([])
    changeActiveScene(targetScene)
    setMode('select')
    setCanvasNavigationRevision((current) => current + 1)
    setEditorId(null)
    setEditorMatrix(null)
  }, [cancelDirectorPreview, changeActiveScene, stashActiveProject])

  const openProjectGallery = useCallback(() => {
    stashActiveProject()
    directorOpenRef.current = false
    cancelDirectorPreview()
    directorSceneSnapshotRef.current = null
    setGalleryOpen(true)
    setDirectorOpen(false)
    setDirectorSelection([])
    setMode('select')
    setCanvasNavigationRevision((current) => current + 1)
    setEditorId(null)
    setEditorMatrix(null)
  }, [cancelDirectorPreview, stashActiveProject])

  const createLibraryProject = useCallback((title: string, templateId: ProjectId | null) => {
    const template = templateId
      ? libraryProjectsRef.current.find((project) => project.id === templateId)?.world
      : null
    const sourceWorld = templateId
      ? template ?? createProjectWorld(createSeedWorld(), templateId)
      : createBlankWorld(title)
    const project = createUserProject(title, templateId, sourceWorld)
    markLibraryStorageRepaired()
    updateLibraryProjects((projects) => [...projects, project])
    openLibraryProject(project)
  }, [markLibraryStorageRepaired, openLibraryProject, updateLibraryProjects])

  const duplicateLibraryProject = useCallback((project: LibraryProject) => {
    const duplicate = createUserProject(`${project.title} copy`, project.templateId, cloneWorld(project.world))
    markLibraryStorageRepaired()
    updateLibraryProjects((projects) => [...projects, duplicate])
  }, [markLibraryStorageRepaired, updateLibraryProjects])

  const trashLibraryProject = useCallback((project: LibraryProject) => {
    markLibraryStorageRepaired()
    updateLibraryProjects((projects) => projects.map((candidate) => candidate.id === project.id
      ? { ...candidate, deletedAt: Date.now(), updatedAt: Date.now() }
      : candidate))
  }, [markLibraryStorageRepaired, updateLibraryProjects])

  const restoreLibraryProject = useCallback((project: LibraryProject) => {
    markLibraryStorageRepaired()
    updateLibraryProjects((projects) => projects.map((candidate) => candidate.id === project.id
      ? { ...candidate, deletedAt: null, updatedAt: Date.now() }
      : candidate))
  }, [markLibraryStorageRepaired, updateLibraryProjects])

  const deleteLibraryProjectForever = useCallback((project: LibraryProject) => {
    if (project.kind !== 'user') return
    markLibraryStorageRepaired()
    updateLibraryProjects((projects) => projects.filter((candidate) => candidate.id !== project.id))
    if (activeDocumentIdRef.current === project.id) {
      activeDocumentIdRef.current = 'main'
      setActiveDocumentId('main')
      worldRef.current = mainWorldRef.current
      setWorld(mainWorldRef.current)
      setCanvasNavigationRevision((current) => current + 1)
    }
  }, [markLibraryStorageRepaired, updateLibraryProjects])

  const bridge = useMemo<WorldBridge>(() => ({
    getWorld: () => worldRef.current,
    getActiveScene: () => activeSceneRef.current,
    getActiveProject: () => {
      const project = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
      return project?.templateId ?? null
    },
    runAgentAction: runAgent,
    runHistory: runHistoryBridge,
    listProjects: () => libraryProjectsRef.current.map((project) => summarizeProject(project, activeDocumentIdRef.current)),
    openProject: (projectId, scene) => {
      const project = libraryProjectsRef.current.find((candidate) => candidate.id === projectId && candidate.deletedAt === null)
      if (!project) return { ok: false, summary: 'No changes made', error: `Project ${projectId} does not exist.` }
      if (scene && project.templateId && !getScenesForProject(project.templateId).some((candidate) => candidate.id === scene)) return { ok: false, summary: 'No changes made', error: `Scene ${scene} does not belong to ${project.title}.` }
      openLibraryProject(project, scene)
      return { ok: true, summary: `Opened ${project.title}`, data: { projectId: project.id, scene: scene ?? project.startScene } }
    },
    openScene: (scene) => {
      const project = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
      if (!project?.templateId) return { ok: false, summary: 'No changes made', error: 'The active project has no built-in scenes.' }
      if (!getScenesForProject(project.templateId).some((candidate) => candidate.id === scene)) return { ok: false, summary: 'No changes made', error: `Scene ${scene} belongs to another project; open that project first.` }
      if (directorOpenRef.current) return { ok: false, summary: 'No changes made', error: 'Director review owns the camera; close it first.' }
      navigateToScene(scene)
      return { ok: true, summary: `Opened scene ${getScene(scene).title}`, data: { scene } }
    },
    createProject: (title, templateId) => {
      const before = new Set(libraryProjectsRef.current.map((project) => project.id))
      createLibraryProject(title, templateId)
      const created = libraryProjectsRef.current.find((project) => !before.has(project.id))
      return { ok: true, summary: `Created project ${title}`, data: { projectId: created?.id ?? activeDocumentIdRef.current, templateId } }
    },
    deleteProject: (projectId) => {
      const project = libraryProjectsRef.current.find((candidate) => candidate.id === projectId)
      if (!project || project.deletedAt !== null) return { ok: false, summary: 'No changes made', error: `Project ${projectId} does not exist.` }
      if (project.kind !== 'user') return { ok: false, summary: 'No changes made', error: 'Built-in projects cannot be deleted.' }
      trashLibraryProject(project)
      if (activeDocumentIdRef.current === projectId) {
        // Never leave the agent inside a deleted project: fall back to the first live one.
        const fallback = libraryProjectsRef.current.find((candidate) => candidate.id !== projectId && candidate.deletedAt === null)
        if (fallback) openLibraryProject(fallback)
        else openProjectGallery()
      }
      return { ok: true, summary: `Moved ${project.title} to deleted projects`, data: { projectId } }
    },
    getAttentionWeights: () => {
      const active = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
      const transformerWorld = active?.templateId === 'tiny-transformer'
        ? worldRef.current
        : libraryProjectsRef.current.find((candidate) => candidate.kind === 'built-in' && candidate.id === 'tiny-transformer')?.world
      const attention = transformerWorld ? Object.values(transformerWorld.objects).find((candidate) => candidate.kind === 'attention') : undefined
      return attention?.kind === 'attention' ? [...evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights] : null
    },
    spotlight: (ids, seconds, label) => {
      const present = ids.filter((id) => worldRef.current.objects[id])
      if (!present.length) return { ok: false, summary: 'No changes made', error: 'None of those objects exist.' }
      const until = Date.now() + Math.max(500, Math.min(6000, seconds * 1000))
      setSpotlightTargets((current) => [...current.filter((target) => !present.includes(target.id) && target.until > Date.now()), ...present.map((id) => ({ id, until, label }))])
      window.setTimeout(() => setSpotlightTargets((current) => current.filter((target) => target.until > Date.now())), until - Date.now() + 50)
      return { ok: true, summary: `Spotlighted ${present.length} object${present.length === 1 ? '' : 's'}`, data: { ids: present, seconds, label: label ?? null } }
    },
    typewrite: (objectId, field, value, ms) => new Promise<void>((resolve) => {
      const object = worldRef.current.objects[objectId]
      if (!object) { resolve(); return }
      const total = Math.max(200, Math.min(6000, ms))
      const started = performance.now()
      const step = () => {
        const fraction = Math.min(1, (performance.now() - started) / total)
        const count = Math.max(1, Math.round(value.length * fraction))
        setTypingPreview({ objectId, field, value: value.slice(0, count) })
        if (fraction < 1) { window.setTimeout(step, 28); return }
        window.setTimeout(() => { setTypingPreview(null); resolve() }, 80)
      }
      step()
    }),
    controlTimeline: (timelineId, timelineAction, options) => {
      if (!worldRef.current.timelines[timelineId]) return { ok: false, summary: 'No changes made', error: `Timeline ${timelineId} does not exist.` }
      playbackRef.current?.control(timelineId, timelineAction, options)
      return { ok: true, summary: `${timelineAction === 'play' ? 'Played' : timelineAction === 'pause' ? 'Paused' : timelineAction === 'seek' ? 'Sought' : 'Reset'} timeline`, data: { timelineId, action: timelineAction, ...(options ?? {}) } }
    },
    focusObjects: (ids) => {
      const current = worldRef.current
      const bounds = unionBounds(current, expandTargetIds(current, ids))
      if (!bounds) return { ok: false, summary: 'No changes made', error: 'Those objects have no bounds to focus on.' }
      return runAgent({ id: crypto.randomUUID(), source: 'agent', summary: `Focused on ${ids.length} object${ids.length === 1 ? '' : 's'}`, operations: [{ type: 'viewport', viewport: viewportForBounds(bounds) }] }, ids)
    },
    onTrace: (event) => {
      setToolLog((current) => [...current, { ...event, at: Date.now() }].slice(-2000))
      if (event.phase === 'running' && !event.readOnly) { setActivationKind('call'); setActivationTick((tick) => tick + 1) }
      setTraceEvents((current) => [
        ...current.filter((existing) => existing.invocationId !== event.invocationId),
        event,
      ].slice(-6))
      if (traceTimerRef.current !== null) window.clearTimeout(traceTimerRef.current)
      traceTimerRef.current = window.setTimeout(() => setTraceEvents([]), 5200)
    },
  }), [createLibraryProject, navigateToScene, openLibraryProject, openProjectGallery, runAgent, runHistoryBridge, trashLibraryProject])
  const webMcpTools = useMemo(() => createWorldTools(bridge), [bridge])
  const playback = useTimelinePlayback(world)
  const playbackRef = useRef(playback)
  playbackRef.current = playback
  const ledgerBursts = useMemo(() => groupBurst(toolLog), [toolLog])
  const activationActive = useOneShot(activationTick)
  const readingEvent = useMemo(() => collapseInvocations(toolLog).find((event) => event.readOnly && event.phase === 'running') ?? null, [toolLog])
  const ledgerCounts = useMemo(() => Object.fromEntries(Object.entries(summarizeLedger(toolLog, webMcpTools).perTool).map(([name, entry]) => [name, entry.calls])), [toolLog, webMcpTools])

  /** Wait for the Tutor presence to settle so consecutive real tool calls never collide. */
  const waitForTutor = () => new Promise<void>((resolve) => {
    const check = () => { if (agentBusyRef.current) window.setTimeout(check, 40); else resolve() }
    check()
  })

  /**
   * Run one deterministic cue. Every Tutor step goes through the real WebMCP
   * tool objects (trace, attribution, undo); every learner step goes through
   * the same reducer the canvas uses. Cues are idempotent by construction.
   */
  const runDemoCue = useCallback(async (cue: DemoCueId) => {
    if (cueRunningRef.current) return
    cueRunningRef.current = cue
    setCueRunning(cue)
    try {
      const samples = { ...handwritingSamplesRef.current, ...loadHandwritingSamples() }
      const project = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
      // The barycentric act copies the transformer project's live weights once.
      // Reading another built-in project's world is a Director-time read; the
      // active project never gains that project's objects.
      const transformerWorld = project?.templateId === 'tiny-transformer'
        ? worldRef.current
        : libraryProjectsRef.current.find((candidate) => candidate.kind === 'built-in' && candidate.id === 'tiny-transformer')?.world
      const attention = transformerWorld?.objects.attention_mechanism
      const attentionWeights = attention?.kind === 'attention'
        ? evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights
        : undefined
      const prepared = prepareDemoCue(cue, worldRef.current, { samples, activeProject: project?.templateId ?? null, attentionWeights })
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const pace = prepared.pace ?? 1
      for (const thunk of prepared.steps) {
        const step = thunk(worldRef.current)
        if (!step) continue
        if (step.kind === 'pause') {
          if (!reduceMotion) await sleep(step.ms * pace)
          continue
        }
        if (step.kind === 'human') {
          run(step.action)
          if (!reduceMotion) await sleep(240 * pace)
          continue
        }
        const tool = webMcpTools.find((candidate) => candidate.name === step.name)
        if (!tool) continue
        await waitForTutor()
        const result = await tool.execute(step.input)
        if (!result.ok) {
          console.warn(`Cue ${cue} stopped at ${step.name}: ${result.error ?? 'tool failed'}`)
          break
        }
        await waitForTutor()
        if (!reduceMotion) await sleep((tool.annotations.readOnlyHint ? 180 : 320) * pace)
      }
      // Leave a clean stage: no editing chrome after a cue, in either mode.
      setDirectorSelection([])
      if (worldRef.current.selection.length) run(humanAction('Cleared selection', [{ type: 'select', ids: [] }]))
    } finally {
      cueRunningRef.current = null
      setCueRunning(null)
    }
  }, [run, webMcpTools])

  // The Director is a film tool: it may step through every frame, opening the
  // built-in project a frame belongs to exactly as the gallery would. Ordinary
  // navigation stays limited to the active project's own two scenes.
  const isDirectorShotAllowed = (_shot: { scene: CatalogSceneId }) => {
    const project = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
    return Boolean(project?.templateId)
  }

  /** Open the built-in project that owns a frame's scene without leaving Director review. */
  const activateProjectForScene = (scene: CatalogSceneId) => {
    if (scene === 'overview') return
    const projectId = getProjectForScene(scene).id
    const current = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
    if (current?.templateId === projectId) return
    stashActiveProject()
    const target = libraryProjectsRef.current.find((candidate) => candidate.kind === 'built-in' && candidate.id === projectId)
    if (!target) return
    const { width, height } = canvasSize()
    activeDocumentIdRef.current = target.id
    setActiveDocumentId(target.id)
    const nextWorld = { ...target.world, title: target.title, selection: [] }
    worldRef.current = nextWorld
    setWorld(nextWorld)
    const firstScene = getScenesForProject(projectId)[0].id
    directorSceneSnapshotRef.current = {
      scene: firstScene,
      viewport: sceneViewportBookmark(cameraViewport(firstScene, width, height), width, height),
    }
    setEditorId(null)
    setEditorMatrix(null)
  }

  const directorDefaultViewport = (scene: CatalogSceneId): Viewport => {
    const { width, height } = canvasSize()
    const viewport = cameraViewport(scene, width, height)
    // The film camera sits closer than the review camera so a frame's card fills
    // the picture; the overview keeps its gallery framing.
    const filmFit = filmMode && scene !== 'overview' ? filmCameraFit(scene) : 1
    const zoom = boundedViewportZoom(viewport.zoom * filmFit)
    const focus = { x: (width / 2 - viewport.x) / viewport.zoom, y: (height / 2 - viewport.y) / viewport.zoom }
    return { x: width / 2 - focus.x * zoom, y: height / 2 - focus.y * zoom, zoom }
  }

  const directorViewportBookmark = (viewport: Viewport): DirectorShotViewport => {
    const { width, height } = canvasSize()
    return { ...viewport, zoom: boundedViewportZoom(viewport.zoom), canvasWidth: width, canvasHeight: height }
  }

  const directorViewportForShot = (edit: DirectorShotEdit | undefined, scene: CatalogSceneId): Viewport => {
    const { width, height } = canvasSize()
    return rebaseSceneViewport(edit?.viewport, width, height, directorDefaultViewport(scene))
  }

  const activeDirectorShot = DIRECTOR_SHOTS.find((shot) => shot.id === directorState.activeShotId && isDirectorShotAllowed(shot))
    ?? DIRECTOR_SHOTS.find(isDirectorShotAllowed)
    ?? DIRECTOR_SHOTS[0]
  const activeDirectorEdit = directorState.shots[activeDirectorShot.id]
  const directorViewport = directorOpen
    ? directorViewportForShot(activeDirectorEdit, activeDirectorShot.scene)
    : world.viewport
  const directorOverrides = useMemo(() => {
    const overrides = { ...(activeDirectorEdit?.overrides ?? {}) }
    for (const id of activeDirectorShot.hiddenObjectIds ?? []) {
      overrides[id] = { ...overrides[id], opacity: 0 }
    }
    return overrides
  }, [activeDirectorEdit?.overrides, activeDirectorShot])

  const updateDirectorEdit = (update: (edit: DirectorShotEdit) => DirectorShotEdit) => {
    setDirectorState((current) => {
      const shot = DIRECTOR_SHOTS.find((candidate) => candidate.id === current.activeShotId && isDirectorShotAllowed(candidate))
        ?? DIRECTOR_SHOTS.find(isDirectorShotAllowed)
        ?? DIRECTOR_SHOTS[0]
      const existing = current.shots[shot.id] ?? {
        viewport: directorViewportBookmark(directorDefaultViewport(shot.scene)),
        overrides: {},
        approved: false,
        updatedAt: Date.now(),
      }
      return {
        ...current,
        shots: { ...current.shots, [shot.id]: update(existing) },
      }
    })
  }

  const selectDirectorShot = (id: string) => {
    const shot = DIRECTOR_SHOTS.find((candidate) => candidate.id === id)
    if (!shot || !isDirectorShotAllowed(shot) || !directorOpenRef.current) return
    activateProjectForScene(shot.scene)
    const shotViewport = directorViewportForShot(directorState.shots[shot.id], shot.scene)
    const nextWorld = { ...worldRef.current, viewport: { ...shotViewport } }
    worldRef.current = nextWorld
    setWorld(nextWorld)
    setDirectorState((current) => ({
      ...current,
      activeShotId: shot.id,
      shots: current.shots[shot.id] ? current.shots : {
        ...current.shots,
        [shot.id]: {
          viewport: directorViewportBookmark(directorDefaultViewport(shot.scene)),
          overrides: {},
          approved: false,
          updatedAt: Date.now(),
        },
      },
    }))
    changeActiveScene(shot.scene)
    setDirectorSelection([])
    setMode('select')
    setEditorId(null)
    setEditorMatrix(null)
  }

  const openDirectorReview = () => {
    const allowedShot = DIRECTOR_SHOTS.find((shot) => shot.id === directorState.activeShotId && isDirectorShotAllowed(shot))
      ?? DIRECTOR_SHOTS.find(isDirectorShotAllowed)
    if (!allowedShot) return
    const { width, height } = canvasSize()
    directorSceneSnapshotRef.current = {
      scene: activeSceneRef.current,
      viewport: sceneViewportBookmark(worldRef.current.viewport, width, height),
    }
    directorOpenRef.current = true
    setDirectorControlsHidden(filmMode)
    setDirectorOpen(true)
    selectDirectorShot(allowedShot.id)
  }

  const closeDirectorReview = () => {
    directorOpenRef.current = false
    cancelDirectorPreview()
    setDirectorControlsHidden(false)
    setDirectorOpen(false)
    setDirectorSelection([])
    const snapshot = directorSceneSnapshotRef.current
    directorSceneSnapshotRef.current = null
    if (snapshot) {
      const { width, height } = canvasSize()
      const restored = {
        ...worldRef.current,
        viewport: rebaseSceneViewport(snapshot.viewport, width, height, cameraViewport(snapshot.scene, width, height)),
      }
      worldRef.current = restored
      setWorld(restored)
      changeActiveScene(snapshot.scene)
    }
  }

  const setDirectorViewport = (viewport: Viewport) => updateDirectorEdit((edit) => ({
    ...edit,
    viewport: directorViewportBookmark(isUsableViewport(viewport)
      ? { ...viewport, zoom: boundedViewportZoom(viewport.zoom) }
      : directorDefaultViewport(activeDirectorShot.scene)),
    approved: false,
    updatedAt: Date.now(),
  }))

  const nudgeDirectorCamera = (dx: number, dy: number) => setDirectorViewport({
    ...directorViewport,
    x: directorViewport.x + dx,
    y: directorViewport.y + dy,
  })

  const zoomDirectorCamera = (factor: number) => {
    const { width, height } = canvasSize()
    const center = { x: width / 2, y: height / 2 }
    const zoom = Math.min(2.5, Math.max(0.25, directorViewport.zoom * factor))
    const focus = {
      x: (center.x - directorViewport.x) / directorViewport.zoom,
      y: (center.y - directorViewport.y) / directorViewport.zoom,
    }
    setDirectorViewport({ x: center.x - focus.x * zoom, y: center.y - focus.y * zoom, zoom })
  }

  const transformDirectorObjects = (ids: string[], delta: Point) => updateDirectorEdit((edit) => {
    const overrides = { ...edit.overrides }
    for (const id of ids) {
      const object = worldRef.current.objects[id]
      if (!object) continue
      const previous = overrides[id] ?? {}
      const bounds = previous.bounds ?? object.bounds
      overrides[id] = {
        ...previous,
        bounds: { ...bounds, x: bounds.x + delta.x, y: bounds.y + delta.y },
      }
    }
    return { ...edit, overrides, approved: false, updatedAt: Date.now() }
  })

  const resetDirectorShot = () => {
    const shot = activeDirectorShot
    setDirectorState((current) => ({
      ...current,
      shots: {
        ...current.shots,
        [shot.id]: {
          viewport: directorViewportBookmark(directorDefaultViewport(shot.scene)),
          overrides: {},
          approved: false,
          updatedAt: Date.now(),
        },
      },
    }))
    setDirectorSelection([])
  }

  const approveDirectorShot = () => updateDirectorEdit((edit) => ({
    ...edit,
    approved: true,
    updatedAt: Date.now(),
  }))

  /** Screen-space anchors for a bridge, computed from camera math rather than the DOM. */
  const bridgeEndpointsFor = (from: DirectorShot, to: DirectorShot): BridgeEndpoints | null => {
    if (!from.bridge) return null
    const { width, height } = canvasSize()
    const canvasRect = document.querySelector('.world-canvas')?.getBoundingClientRect()
    const canvasOrigin = canvasRect ? { x: canvasRect.left, y: canvasRect.top } : { x: window.innerWidth - width, y: window.innerHeight - height }
    const worldForScene = (scene: CatalogSceneId): WorldState => {
      if (scene === 'overview') return buildOverviewWorld(libraryProjectsRef.current, activeDocumentIdRef.current, worldRef.current)
      const projectId = getProjectForScene(scene).id
      const current = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
      if (current?.templateId === projectId) return worldRef.current
      return libraryProjectsRef.current.find((candidate) => candidate.kind === 'built-in' && candidate.id === projectId)?.world ?? worldRef.current
    }
    const project = (scene: CatalogSceneId, viewport: Viewport, world: WorldState, objectId: string, fraction: Point): Point | null => {
      const object = world.objects[objectId]
      if (!object) return scene === 'overview' ? { x: canvasOrigin.x + width / 2, y: canvasOrigin.y + height * 0.16 } : null
      return {
        x: canvasOrigin.x + viewport.x + (object.bounds.x + object.bounds.width * fraction.x) * viewport.zoom,
        y: canvasOrigin.y + viewport.y + (object.bounds.y + object.bounds.height * fraction.y) * viewport.zoom,
      }
    }
    const anchors = bridgeAnchors(from.bridge)
    const sourceWorld = worldForScene(from.scene)
    const targetWorld = worldForScene(to.scene)
    const source = project(from.scene, directorViewport, sourceWorld, anchors.source.objectId, anchors.source.fraction)
    const target = project(to.scene, directorViewportForShot(directorState.shots[to.id], to.scene), targetWorld, anchors.target.objectId, anchors.target.fraction)
    if (!source || !target) return null
    const values = bridgeValues(from.bridge, sourceWorld, targetWorld)
    return { source, target, sourceLabel: anchors.source.label, targetLabel: anchors.target.label, values }
  }

  const previewNextDirectorShot = () => {
    const availableShots = DIRECTOR_SHOTS.filter(isDirectorShotAllowed)
    if (!availableShots.length) return
    const index = availableShots.findIndex((shot) => shot.id === activeDirectorShot.id)
    const next = availableShots[(index + 1) % availableShots.length]
    const endpoints = activeDirectorShot.bridge ? bridgeEndpointsFor(activeDirectorShot, next) : null
    if (endpoints && activeDirectorShot.bridge) {
      setBridgePlay({ key: Date.now(), transition: activeDirectorShot.bridge, endpoints })
    }
    const projectOf = (scene: CatalogSceneId) => (scene === 'overview' ? null : getProjectForScene(scene).id)
    const fromProject = projectOf(activeDirectorShot.scene)
    const toProject = projectOf(next.scene)
    if (fromProject && toProject && fromProject !== toProject) {
      // Different project: never pan across its empty canvas. Dim, cut, fade in.
      for (const timer of projectSwitchTimersRef.current) window.clearTimeout(timer)
      setProjectSwitchPhase('out')
      projectSwitchTimersRef.current = [
        window.setTimeout(() => {
          if (!directorOpenRef.current) { setProjectSwitchPhase(null); return }
          selectDirectorShot(next.id)
          setProjectSwitchPhase('in')
        }, 300),
        window.setTimeout(() => setProjectSwitchPhase(null), 900),
      ]
      return
    }
    setDirectorCameraPreviewing(true)
    directorPreviewFrameRef.current = window.requestAnimationFrame(() => {
      directorPreviewFrameRef.current = null
      if (directorOpenRef.current) selectDirectorShot(next.id)
    })
    window.setTimeout(() => setDirectorCameraPreviewing(false), 920)
  }

  const prepareDirectorShot = () => { void runDemoCue(activeDirectorShot.cue) }

  useEffect(() => {
    if (!hydrated) return
    let active = true
    void registerWorldTools(bridge).then((registration) => {
      if (active) setRegistrationStatus(registration.status)
    })
    return () => { active = false }
  }, [bridge, hydrated])

  const startReconstruction = () => {
    const reconstruct = webMcpTools.find((tool) => tool.name === 'reconstruct_problem')
    if (!reconstruct) return
    void reconstruct.execute({
      sourceImageId: SOURCE_IMAGE_ID,
      proposedObjects: reconstructionObjects(false),
      uncertainObjectIds: RECONSTRUCTION_UNCERTAIN_IDS,
    })
  }

  const auditCurrentReconstruction = () => {
    if (!world.reconstruction) return
    const audit = webMcpTools.find((tool) => tool.name === 'audit_reconstruction')
    if (!audit) return
    void audit.execute({
      auditSummary: RECONSTRUCTION_AUDIT_SUMMARY,
      proposedObjects: reconstructionObjects(true),
      uncertainObjectIds: [],
    })
  }

  const acceptReconstruction = () => {
    if (!world.reconstruction) return
    run(approveReconstruction(world))
  }

  const submitAttempt = () => {
    const attempts = world.session.attempts + 1
    const normalized = nextStep
      .toLowerCase()
      .replace(/\\left|\\right|\\,/g, '')
      .replace(/[{}\\*\s]/g, '')
    const correct = normalized === 'xe^x-e^x+c' || normalized === 'e^x(x-1)+c'
    run(humanAction('Checked a calculus step', [{
      type: 'session',
        patch: {
          attempts,
          currentMisconception: correct ? null : 'integration-by-parts-differential',
        },
    }]))
    setAttemptFeedback(correct
      ? 'Correct. The antiderivative is xeˣ − eˣ + C.'
      : attempts === 1
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
    const stashedProject = stashActiveProject()
    const personalProject = stashedProject ?? (activeDocumentIdRef.current === 'main'
      ? null
      : libraryProjectsRef.current.find((project) => project.id === activeDocumentIdRef.current) ?? null)
    const seed = personalProject?.templateId === null
      ? createBlankWorld(personalProject.title)
      : personalProject?.templateId
        ? createProjectWorld(createSeedWorld(), personalProject.templateId, personalProject.title)
        : createSeedWorld()
    const samples = { ...handwritingSamplesRef.current, ...loadHandwritingSamples() }
    handwritingSamplesRef.current = samples
    const captured = personalProject?.templateId === null ? seed : applyCapturedOpeningAttempt(seed, samples)
    const resetScene = personalProject?.startScene ?? 'gamma-clinic'
    const { width, height } = canvasSize()
    const centered = {
      ...captured,
      title: personalProject?.title ?? captured.title,
      viewport: personalProject?.templateId === null
        ? { x: width / 2, y: height / 2, zoom: 1 }
        : cameraViewport(resetScene, width, height),
    }
    worldRef.current = centered
    setWorld(centered)
    setCanvasNavigationRevision((current) => current + 1)
    if (personalProject) {
      markLibraryStorageRepaired()
      updateLibraryProjects((projects) => projects.map((project) => project.id === personalProject.id
        ? {
            ...project,
            world: centered,
            sceneViewports: personalProject.templateId && resetScene !== 'overview'
              ? { ...project.sceneViewports, [resetScene]: sceneViewportBookmark(centered.viewport, width, height) }
              : project.sceneViewports,
            updatedAt: Date.now(),
          }
        : project))
    } else {
      mainWorldRef.current = centered
    }
    changeActiveScene(directorOpen ? activeDirectorShot.scene : resetScene)
    setDirectorSelection([])
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

  const openEditor = useCallback((id: string, createdObject?: WorldObject) => {
    // Newly created fields are handed over explicitly by the canvas. React has
    // not necessarily committed the reducer result to `world.objects` yet.
    const object = createdObject?.id === id ? createdObject : world.objects[id]
    if (!object) return
    setEditorMatrix(null)
    if (object.kind === 'text') setEditorValue(object.text)
    else if (object.kind === 'equation') setEditorValue(object.latex)
    else if (object.kind === 'matrix') {
      // The modal editor is 2×2 only; other sizes edit in place on the canvas.
      if (object.values.length !== 2 || object.values[0]?.length !== 2 || object.values[1]?.length !== 2) return
      setEditorMatrix([
        [object.values[0][0], object.values[0][1]],
        [object.values[1][0], object.values[1][1]],
      ])
    }
    else return
    setEditorId(id)
  }, [world.objects])

  const saveMatrixEditor = () => {
    if (!editorId) return
    const currentWorld = worldRef.current
    const object = currentWorld.objects[editorId]
    if (!object) {
      setEditorId(null)
      setEditorMatrix(null)
      return
    }
    if (object.kind !== 'matrix' || !editorMatrix) return
    const updated: WorldObject = { ...object, values: editorMatrix }
    run(humanAction('Edited matrix', [{ type: 'put', object: updated }]))
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
      if (target instanceof Element && target.matches('input, textarea, [contenteditable="true"]')) return
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
      } else if (/^[0-8]$/.test(event.key)) {
        if (directorOpenRef.current) return
        if (event.key === '0') {
          openProjectGallery()
        } else {
          const scene = Object.values(SCENES).find((candidate) => candidate.keyboard === Number(event.key))?.id ?? 'gamma-clinic'
          if (galleryOpen) {
            const projectId = getProjectForScene(scene).id
            const project = libraryProjectsRef.current.find((candidate) => candidate.id === projectId)
            if (project && project.deletedAt === null) openLibraryProject(project, scene)
          } else if (activeLibraryProject?.templateId) {
            const allowed = getScenesForProject(activeLibraryProject.templateId).find((candidate) => candidate.id === scene)
            if (allowed) navigateToScene(allowed.id)
          }
        }
      } else {
        const shortcuts: Record<string, ToolMode> = { v: 'select', h: 'hand', p: 'pen', e: 'eraser', t: 'text', m: 'equation', g: 'graph', c: 'geometry', x: 'matrix', s: 'shape', a: 'arrow', f: 'frame' }
        const next = shortcuts[event.key.toLowerCase()]
        if (next) setMode(next)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeLibraryProject?.templateId, deleteSelection, duplicateSelection, galleryOpen, groupSelection, history, navigateToScene, openLibraryProject, openProjectGallery])

  const selectedObjects = useMemo(
    () => world.selection.map((id) => world.objects[id]).filter(Boolean),
    [world.objects, world.selection],
  )

  const zoomTo = (zoom: number) => {
    run(humanAction('Changed zoom', [{ type: 'viewport', viewport: { ...world.viewport, zoom: Math.min(2.5, Math.max(0.25, zoom)) } }]))
  }

  const viewportForBounds = (bounds: { x: number; y: number; width: number; height: number }): Viewport => {
    const { width, height } = canvasSize()
    const padding = Math.min(96, Math.max(24, Math.min(width, height) * 0.08))
    const availableWidth = Math.max(1, width - padding * 2)
    const availableHeight = Math.max(1, height - padding * 2)
    const rawZoom = bounds.width > 0 && bounds.height > 0
      ? Math.min(availableWidth / bounds.width, availableHeight / bounds.height)
      : 1
    const zoom = Math.min(2.5, Math.max(0.25, Number.isFinite(rawZoom) ? rawZoom : 1))
    return {
      x: width / 2 - (bounds.x + bounds.width / 2) * zoom,
      y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
      zoom,
    }
  }

  const fitScene = (sceneId: CatalogSceneId) => {
    const currentWorld = worldRef.current
    const bounds = sceneId === 'overview'
      ? null
      : unionBounds(currentWorld, getSceneObjectIds(currentWorld, sceneId))
    const viewport = bounds
      ? viewportForBounds(bounds)
      : sceneId === 'overview'
        ? cameraViewport(sceneId, canvasSize().width, canvasSize().height)
        : null
    if (!viewport) return
    run(humanAction(`Fit ${sceneId === 'overview' ? 'overview' : 'scene'}`, [{ type: 'viewport', viewport }]))
  }

  const fitSelection = () => {
    const currentWorld = worldRef.current
    const bounds = unionBounds(currentWorld, expandTargetIds(currentWorld, currentWorld.selection))
    if (!bounds) return
    run(humanAction('Fit selection', [{ type: 'viewport', viewport: viewportForBounds(bounds) }]))
  }

  const directorOverviewWorld = useMemo(
    () => directorOpen && activeDirectorShot.scene === 'overview'
      ? buildOverviewWorld(libraryProjects, activeDocumentId, world)
      : null,
    [activeDirectorShot.scene, activeDocumentId, directorOpen, libraryProjects, world],
  )
  const canvasWorld = useMemo(() => {
    const base = playback.derivedWorld(directorOverviewWorld ?? world)
    if (!typingPreview) return base
    const target = base.objects[typingPreview.objectId]
    if (!target) return base
    if (typingPreview.field === 'latex' && target.kind === 'equation') return { ...base, objects: { ...base.objects, [target.id]: { ...target, latex: typingPreview.value } } }
    if (typingPreview.field === 'text' && target.kind === 'text') return { ...base, objects: { ...base.objects, [target.id]: { ...target, text: typingPreview.value } } }
    return base
  }, [directorOverviewWorld, playback, typingPreview, world])
  // A frame is "ready" when its targets exist in the project that owns it,
  // whichever project is active; the Director walks all four.
  const directorAvailableObjectIds = useMemo(() => {
    const ids = new Set<string>()
    const worlds = [world, ...libraryProjects.filter((project) => project.kind === 'built-in' && project.id !== activeDocumentId).map((project) => project.world)]
    for (const candidate of worlds) {
      for (const object of Object.values(candidate.objects)) if (object.opacity > 0) ids.add(object.id)
    }
    return ids
  }, [activeDocumentId, libraryProjects, world])
  const ignoreRun = useCallback((_action: WorldAction) => { /* the overview is a camera state, never a document */ }, [])
  const registeredCount = registrationStatus?.state === 'live' || registrationStatus?.state === 'partial'
    ? `${registrationStatus.registered} / ${registrationStatus.total}`
    : `${webMcpTools.length} / ${webMcpTools.length}`

  // The film driver (scripts/film/capture.mjs) drives the real product through
  // this hook: project navigation, Director frames, cues, tools. It adds no
  // behaviour of its own and exists only when the page is opened with ?film=1.
  useEffect(() => {
    if (!filmMode) return
    Object.assign(window, {
      __mathburstFilm: {
        openProject: (projectId: string) => {
          const project = libraryProjectsRef.current.find((candidate) => candidate.id === projectId && candidate.deletedAt === null)
          if (project) openLibraryProject(project)
          return Boolean(project)
        },
        openGallery: openProjectGallery,
        openDirector: openDirectorReview,
        closeDirector: closeDirectorReview,
        selectShot: selectDirectorShot,
        previewNext: previewNextDirectorShot,
        runCue: (cue: DemoCueId) => runDemoCue(cue),
        runTool: (name: string, input: unknown) => webMcpTools.find((tool) => tool.name === name)?.execute(input),
        navigateScene: navigateToScene,
        undo: () => history('undo'),
        redo: () => history('redo'),
        getWorld: () => worldRef.current,
        /** Every commit across the built-in projects plus the live document, for the film's sound design. */
        getCommits: () => {
          const seen = new Map<string, { id: string; at: number; source: string; summary: string; project: string }>()
          const worlds = [
            { id: activeDocumentIdRef.current, world: worldRef.current },
            ...libraryProjectsRef.current.map((project) => ({ id: project.id, world: project.world })),
          ]
          for (const { id, world } of worlds) {
            for (const commit of world.activity) {
              if (!seen.has(commit.action.id)) seen.set(commit.action.id, { id: commit.action.id, at: commit.at, source: commit.action.source, summary: commit.action.summary, project: id })
            }
          }
          return [...seen.values()].sort((left, right) => left.at - right.at)
        },
        isBusy: () => agentBusyRef.current || Boolean(cueRunningRef.current),
        activeShot: () => activeDirectorShot.id,
      },
    })
  })

  const projectBreadcrumb = activeLibraryProject?.templateId && activeScene !== 'overview'
    ? {
        number: String(Math.max(0, getScenesForProject(activeLibraryProject.templateId).findIndex((scene) => scene.id === activeScene)) + 1).padStart(2, '0'),
        title: SCENES[activeScene].title,
        state: activeLibraryProject.templateId === 'tiny-transformer' ? 'live model' : 'interactive',
      }
    : activeLibraryProject
      ? { number: '01', title: activeLibraryProject.title, state: 'blank canvas' }
      : undefined

  return (
    <main className="mathburst-app" id="main" data-hydrated={hydrated} data-gallery-open={galleryOpen} data-film={filmMode} data-project-switch={projectSwitchPhase ?? undefined} data-ledger-pinned={ledgerPinned && !galleryOpen}>
      {filmMode && <FilmCursor />}
      <header className="world-header">
        <button type="button" className="wordmark" onClick={openProjectGallery} aria-label="Open Mathburst project gallery"><BrandMark className="brand-mark" /><span>Mathburst</span></button>
        <div className="world-title"><b>{galleryOpen ? 'Projects' : activeLibraryProject?.title ?? 'Mathburst'}</b>{!galleryOpen && <><span>/</span><em>{activeLibraryProject?.templateId && activeScene !== 'overview' ? SCENES[activeScene].title : 'Blank canvas'}</em></>}</div>
        <div className="header-actions">
          {galleryOpen ? (
            <span className="gallery-header-count"><b>{libraryProjects.filter((project) => project.deletedAt === null).length}</b> projects</span>
          ) : (
            <>
              {!blankPersonalProject && <button
                type="button"
                className="director-trigger"
                aria-pressed={directorOpen}
                onClick={directorOpen ? closeDirectorReview : openDirectorReview}
              >
                {directorOpen ? 'Close review' : 'Director review'}
              </button>}
              {activeLibraryProject?.templateId === 'gamma-lab' && <button
                type="button"
                className="reconstruct-trigger"
                disabled={agentBusy || Boolean(world.reconstruction) || world.session.reconstructionStatus === 'approved'}
                onClick={startReconstruction}
              >
                {world.session.reconstructionStatus === 'approved' ? '✓ live scene' : 'Reconstruct photo'}
              </button>}
              <button type="button" className="console-trigger" aria-pressed={consoleOpen} onClick={() => setConsoleOpen((open) => { if (!open) { setActivationKind('console'); setActivationTick((tick) => tick + 1) } return !open })}>{consoleOpen ? 'Close agent' : 'Agent replay'}</button>
              <button type="button" className="reset-trigger" onClick={resetDemo}>{activeLibraryProject ? 'Reset project' : 'Reset demo'}</button>
            </>
          )}
          <div className="world-status"><i /> local session · saved</div>
        </div>
      </header>

      {galleryOpen && (
        <ProjectGallery
          projects={libraryProjects}
          onOpen={openLibraryProject}
          onCreate={createLibraryProject}
          onDuplicate={duplicateLibraryProject}
          onTrash={trashLibraryProject}
          onRestore={restoreLibraryProject}
          onDeleteForever={deleteLibraryProjectForever}
        />
      )}

      <ToolRail
        mode={directorOpen ? (mode === 'hand' ? 'hand' : 'select') : mode}
        onMode={(nextMode) => setMode(directorOpen ? (nextMode === 'hand' ? 'hand' : 'select') : nextMode)}
        onUndo={() => history('undo')}
        onRedo={() => history('redo')}
        onGroup={groupSelection}
        onDuplicate={duplicateSelection}
        onDelete={deleteSelection}
      />

      <WorldCanvas
        world={canvasWorld}
        scene={directorOverviewWorld ? 'overview' : activeScene}
        navigationKey={canvasNavigationRevision}
        mode={directorOpen ? (mode === 'hand' ? 'hand' : 'select') : mode}
        run={directorOverviewWorld ? ignoreRun : run}
        onEditObject={openEditor}
        agentCommitIds={agentCommitIds}
        directorMode={directorOpen}
        directorViewport={directorViewport}
        directorOverrides={directorOverrides}
        directorSelection={directorSelection}
        cameraPreviewing={directorCameraPreviewing}
        onDirectorViewportChange={setDirectorViewport}
        onDirectorTransform={transformDirectorObjects}
        onDirectorSelection={setDirectorSelection}
        customBreadcrumb={projectBreadcrumb}
        tutorOverlay={!galleryOpen && !blankPersonalProject && activeScene === 'gamma-clinic' && (!directorOpen || activeDirectorShot.id !== 'opening-attempt') ? (
          <section className="opening-tutor-panel" aria-label="Ask WebMCP tutor about the opening attempt">
            <header><span>01 · Reasoning check</span><b>human attempt</b></header>
            {!world.objects.opening_annotation_question ? (
              <button type="button" data-demo-target="ask-tutor" disabled={agentBusy || Boolean(cueRunning)} onClick={() => { void runDemoCue('gamma-tutor') }}>Ask WebMCP tutor</button>
            ) : (
              <button
                type="button"
                data-demo-target="correct-sign"
                onClick={() => { void runDemoCue('gamma-corrected') }}
                disabled={agentBusy || Boolean(cueRunning) || Boolean(world.objects[OPENING_CORRECTION_ID]) || (world.objects[OPENING_ATTEMPT_ID]?.kind === 'text' && world.objects[OPENING_ATTEMPT_ID].text.includes('105√π/16'))}
              >Correct the sign</button>
            )}
            <p>{world.objects.opening_annotation_question ? 'The Tutor marked the sign lost during integration by parts.' : 'Use the live page tools to inspect and annotate the recurrence.'}</p>
          </section>
        ) : world.session.reconstructionStatus === 'approved' ? (
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
      {directorOpen ? (
        <DirectorReviewPanel
          state={directorState}
          activeShot={activeDirectorShot}
          controlsHidden={directorControlsHidden}
          availableObjectIds={directorAvailableObjectIds}
          selectedObjectIds={directorSelection}
          onClose={closeDirectorReview}
          onToggleControls={() => setDirectorControlsHidden((hidden) => !hidden)}
          onSelectShot={selectDirectorShot}
          onSelectObject={(id) => { setDirectorSelection([id]); setMode('select') }}
          onNudgeCamera={nudgeDirectorCamera}
          onZoomCamera={zoomDirectorCamera}
          onResetShot={resetDirectorShot}
          onApproveShot={approveDirectorShot}
          onPreviewNext={previewNextDirectorShot}
          onPrepareShot={prepareDirectorShot}
          onRunCue={(cue) => { void runDemoCue(cue) }}
          cueRunning={cueRunning}
          world={world}
        />
      ) : activeLibraryProject ? (
        <PersonalProjectNavigator
          title={activeLibraryProject.title}
          templateId={activeLibraryProject.templateId}
          activeScene={activeScene}
          kind={activeLibraryProject.kind}
          onHome={openProjectGallery}
          onSceneChange={(sceneId) => navigateToScene(sceneId)}
        />
      ) : (
        null
      )}

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
        collapseOn={activeScene === 'gamma-probability' ? undefined : activeScene}
      />
      <AgentPresence presence={presence} />
      <WebMCPInspector tools={webMcpTools} status={registrationStatus} world={world} callCounts={ledgerCounts} />
      <WebMCPTrace events={traceEvents} world={canvasWorld} viewport={directorOpen ? directorViewport : world.viewport} />
      <ToolToast bursts={ledgerBursts} />
      {!galleryOpen && <ToolLedger events={toolLog} tools={webMcpTools} pinned={ledgerPinned} onTogglePin={toggleLedgerPinned} />}
      <ReadingIndicator active={Boolean(readingEvent)} label={readingEvent ? `Tutor is reading · ${readingEvent.toolName}` : undefined} />
      <AgentAura targets={spotlightTargets} world={canvasWorld} viewport={directorOpen ? directorViewport : world.viewport} />
      <AgentActivation active={activationActive} kind={activationKind} />
      <AgentConsole
        open={consoleOpen && !galleryOpen}
        onClose={() => setConsoleOpen(false)}
        tools={webMcpTools}
        onActivate={() => { setActivationKind('console'); setActivationTick((tick) => tick + 1) }}
      />
      {!galleryOpen && <AnimationTimeline world={world} playbacks={playback.playbacks} control={playback.control} onDeleteTimeline={(id) => run(humanAction('Deleted timeline', [{ type: 'removeTimeline', id }]))} />}
      {bridgePlay && (
        <CinematicBridge
          key={bridgePlay.key}
          transition={bridgePlay.transition}
          endpoints={bridgePlay.endpoints}
          onDone={() => setBridgePlay(null)}
        />
      )}
      {directorOpen && (activeDirectorShot.id === 'one-world' || activeDirectorShot.id === 'webmcp-crescendo') && (
        <div className={`cinematic-lockup${activeDirectorShot.id === 'one-world' ? ' is-final' : ''}`} aria-live="polite">
          {activeDirectorShot.id === 'one-world' && <p><b>One mathematical world.</b><span>Every agent can enter.</span></p>}
          <small><i aria-hidden="true" />WebMCP <strong>{registeredCount}</strong></small>
        </div>
      )}

      {!directorOpen && selectedObjects.length > 0 && (
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

      {!directorOpen && (
        <div className="zoom-controls" aria-label="Canvas zoom">
          <button type="button" aria-label="Fit scene" onClick={() => fitScene(activeScene)}>Fit</button>
          <button type="button" aria-label="Fit selection" disabled={selectedObjects.length === 0} onClick={fitSelection}>Selection</button>
          <button type="button" aria-label="Zoom out" onClick={() => zoomTo(world.viewport.zoom / 1.2)}>−</button>
          <span>{Math.round(world.viewport.zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoomTo(world.viewport.zoom * 1.2)}>+</button>
        </div>
      )}

      {!galleryOpen && !directorOpen && selectedObjects[0] && (
        <ProgressiveInspector
          object={selectedObjects[0]}
          world={world}
          editorId={editorId}
          editorValue={editorValue}
          editorMatrix={editorMatrix}
          onEdit={openEditor}
          onValueChange={setEditorValue}
          onMatrixChange={updateMatrixCell}
          onPatchObject={patchObject}
          onSemanticEdit={applySemanticEdit}
          onCommitEditor={commitEditor}
          onAddExpressionParameter={addExpressionParameter}
          onSave={saveMatrixEditor}
          onCancel={() => { setEditorId(null); setEditorMatrix(null) }}
        />
      )}
    </main>
  )
}
