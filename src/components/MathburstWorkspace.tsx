'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWorldTools } from '../domain/tools/definitions'
import type { ToolResult, WorldBridge, WorldTraceEvent } from '../domain/tools/definitions'
import { registerWorldTools } from '../domain/tools/registry'
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
import { createSeedWorld, HERO_EQUATION_ID, HERO_GRAPH_ID, OPENING_ATTEMPT_ID, OPENING_CORRECTION_ID, OPENING_FRAME_ID, SOURCE_IMAGE_ID } from '../domain/world/seed'
import {
  getProjectForScene,
  getSceneObjectIds,
  getScenesForProject,
  getViewportForScene,
  SCENES,
  type CatalogSceneId,
  type ProjectId,
} from '../domain/world/projects'
import { DIRECTOR_SHOTS, EMPTY_DIRECTOR_REVIEW, loadDirectorReview, saveDirectorReview } from '../domain/world/director'
import type { DirectorShotEdit, DirectorShotViewport } from '../domain/world/director'
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

const humanAction = (summary: string, operations: WorldOperation[]): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

const quietPresence: AgentPresenceState = { visible: false, x: 0, y: 0, label: 'Tutor', action: '' }

const cameraViewport = (scene: CatalogSceneId, width: number, height: number) => getViewportForScene(scene, width, height)

const isUsableViewport = (viewport: Viewport | undefined): viewport is Viewport => Boolean(
  viewport
  && Number.isFinite(viewport.x)
  && Number.isFinite(viewport.y)
  && Number.isFinite(viewport.zoom)
  && viewport.zoom > 0,
)

const canvasSize = () => ({
  width: Math.max(1, window.innerWidth - 58),
  height: Math.max(1, window.innerHeight - 54),
})

const sceneViewportBookmark = (viewport: Viewport, width: number, height: number): SceneViewport => ({
  ...viewport,
  canvasWidth: width,
  canvasHeight: height,
})

const boundedViewportZoom = (zoom: number) => Math.min(2.5, Math.max(0.25, zoom))

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

function demoReconstruction(audited: boolean): WorldObject[] {
  return [
    {
      id: HERO_EQUATION_ID,
      kind: 'equation',
      latex: '\\Gamma\\!\\left(\\frac92\\right)=\\int_0^\\infty x^{7/2}e^{-x}\\,dx',
      color: '#171713',
      bounds: { x: -595, y: 410, width: 485, height: 66 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'recon_prompt',
      kind: 'text',
      text: 'Repeated integration by parts · sign audited against source',
      color: '#171713',
      fontSize: 17,
      bounds: { x: -585, y: 485, width: 465, height: 34 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'recon_work',
      kind: 'equation',
      latex: audited ? '\\frac72\\Gamma\\!\\left(\\frac72\\right)' : '-\\frac72\\Gamma\\!\\left(\\frac72\\right)\\;?',
      color: audited ? '#171713' : '#f05f44',
      bounds: { x: -575, y: 530, width: 410, height: 58 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
  ]
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

export default function MathburstWorkspace() {
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
  const handwritingSamplesRef = useRef<Record<string, HandwritingSample>>({})
  const [directorOpen, setDirectorOpen] = useState(false)
  const [directorState, setDirectorState] = useState(EMPTY_DIRECTOR_REVIEW)
  const [directorSelection, setDirectorSelection] = useState<string[]>([])
  const [directorCameraPreviewing, setDirectorCameraPreviewing] = useState(false)
  const [directorControlsHidden, setDirectorControlsHidden] = useState(false)
  const directorSceneSnapshotRef = useRef<{ scene: CatalogSceneId; viewport: SceneViewport } | null>(null)
  const directorOpenRef = useRef(false)
  const directorPreviewFrameRef = useRef<number | null>(null)

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
  }, [])

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

  const run = useCallback((action: WorldAction) => {
    const next = dispatchWorldAction(worldRef.current, action)
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
    const next = { ...object, ...patch, id: object.id, kind: object.kind, author: object.author } as WorldObject
    run(humanAction(summary, [{ type: 'put', object: next }]))
  }, [run])

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
        if (action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
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
  }), [persistActiveViewport])

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
      if (commit.action.operations.some((operation) => operation.type === 'viewport')) persistActiveViewport(next.viewport)
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
  }), [persistActiveViewport])

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
    const currentProject = stashActiveProject()
    if (!currentProject?.templateId || scene === 'overview') return
    const ownsScene = getScenesForProject(currentProject.templateId).some((candidate) => candidate.id === scene)
    if (!ownsScene) return
    const canvasWidth = Math.max(1, window.innerWidth - 58)
    const canvasHeight = Math.max(1, window.innerHeight - 54)
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
    const canvasWidth = Math.max(1, window.innerWidth - 58)
    const canvasHeight = Math.max(1, window.innerHeight - 54)
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
    onTrace: (event) => {
      setTraceEvents((current) => [
        ...current.filter((existing) => existing.invocationId !== event.invocationId),
        event,
      ].slice(-6))
      if (traceTimerRef.current !== null) window.clearTimeout(traceTimerRef.current)
      traceTimerRef.current = window.setTimeout(() => setTraceEvents([]), 5200)
    },
  }), [runAgent, runHistoryBridge])
  const webMcpTools = useMemo(() => createWorldTools(bridge), [bridge])

  const openingTutor = async () => {
    const getSelection = webMcpTools.find((tool) => tool.name === 'get_selection')
    const getObjects = webMcpTools.find((tool) => tool.name === 'get_objects')
    const createObjects = webMcpTools.find((tool) => tool.name === 'create_objects')
    if (!getSelection || !getObjects || !createObjects || worldRef.current.objects[OPENING_ATTEMPT_ID] === undefined) return
    await getSelection.execute({})
    await getObjects.execute({ ids: [OPENING_ATTEMPT_ID] })
    const samples = { ...handwritingSamplesRef.current, ...loadHandwritingSamples() }
    const tutorNote = handwritingSampleToInk(samples, 'tutor-note', {
      id: 'opening_annotation_question',
      bounds: { x: -730, y: 448, width: 360, height: 58 },
      color: '#7c5cff',
      width: 7.5,
      rotation: -1.8,
      author: 'agent',
      opacity: 1,
    }) ?? {
      id: 'opening_annotation_question', kind: 'text' as const, text: 'v = −e⁻ˣ. Two negatives.', color: '#7c5cff', fontSize: 23,
      presentation: 'handwritten' as const, bounds: { x: -730, y: 448, width: 360, height: 58 }, rotation: -1.8, author: 'agent' as const, opacity: 1,
    }
    await createObjects.execute({
      summary: 'Tutor annotated the reasoning break',
      objects: [
        {
          id: 'opening_annotation_circle', kind: 'ink',
          points: [
            { x: 4, y: 27 }, { x: 10, y: 10 }, { x: 28, y: 3 }, { x: 48, y: 7 },
            { x: 58, y: 21 }, { x: 57, y: 38 }, { x: 44, y: 50 }, { x: 24, y: 52 },
            { x: 8, y: 43 }, { x: 4, y: 27 },
          ],
          color: '#7c5cff', width: 4, bounds: { x: -470, y: 324, width: 62, height: 56 }, rotation: -3, author: 'agent', opacity: 1,
        },
        {
          id: 'opening_annotation_strike', kind: 'ink',
          points: [{ x: 0, y: 8 }, { x: 18, y: 6 }, { x: 37, y: 7 }, { x: 57, y: 3 }],
          color: '#7c5cff', width: 5, bounds: { x: -468, y: 376, width: 62, height: 14 }, rotation: -6, author: 'agent', opacity: 1,
        },
        tutorNote,
      ],
    })
  }

  const correctGammaSign = () => {
    const attempt = worldRef.current.objects[OPENING_ATTEMPT_ID]
    if (!attempt) return
    const samples = { ...handwritingSamplesRef.current, ...loadHandwritingSamples() }
    const capturedCorrection = handwritingSampleToInk(samples, 'opening-correction', {
      id: OPENING_CORRECTION_ID,
      bounds: { x: attempt.bounds.x, y: attempt.bounds.y + attempt.bounds.height + 12, width: attempt.bounds.width, height: 125 },
      color: '#171713',
      width: 7.5,
      rotation: -0.8,
      author: 'human',
      opacity: 1,
    })
    if (capturedCorrection) {
      const frame = worldRef.current.objects[OPENING_FRAME_ID]
      run(humanAction('Corrected the Gamma recurrence sign', [
        { type: 'put', object: capturedCorrection },
        ...(frame?.kind === 'frame' && !frame.childIds.includes(OPENING_CORRECTION_ID)
          ? [{ type: 'put' as const, object: { ...frame, childIds: [...frame.childIds, OPENING_CORRECTION_ID] } }]
          : []),
        { type: 'select', ids: [OPENING_CORRECTION_ID] },
      ]))
      return
    }
    if (attempt.kind !== 'text') return
    run(humanAction('Corrected the Gamma recurrence sign', [{
      type: 'put', object: {
        ...attempt,
        text: 'Γ(9/2) = ∫₀∞ x⁷ᐟ²e⁻ˣ dx\n= [−x⁷ᐟ²e⁻ˣ]₀∞ + (7/2)Γ(7/2)\n= (7/2)(5/2)(3/2)(1/2)√π = 105√π/16',
        bounds: { ...attempt.bounds, height: 205 },
        author: 'human',
      },
    }]))
  }

  const isDirectorShotAllowed = (shot: { scene: CatalogSceneId }) => {
    const project = libraryProjectsRef.current.find((candidate) => candidate.id === activeDocumentIdRef.current)
    if (!project?.templateId || shot.scene === 'overview') return false
    return getScenesForProject(project.templateId).some((scene) => scene.id === shot.scene)
  }

  const directorDefaultViewport = (scene: CatalogSceneId): Viewport => {
    const { width, height } = canvasSize()
    const viewport = cameraViewport(scene, width, height)
    return { ...viewport, zoom: boundedViewportZoom(viewport.zoom) }
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
    setDirectorControlsHidden(false)
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
    const width = Math.max(1, window.innerWidth - 58)
    const height = Math.max(1, window.innerHeight - 54)
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

  const previewNextDirectorShot = () => {
    const availableShots = DIRECTOR_SHOTS.filter(isDirectorShotAllowed)
    if (!availableShots.length) return
    const index = availableShots.findIndex((shot) => shot.id === activeDirectorShot.id)
    const next = availableShots[(index + 1) % availableShots.length]
    setDirectorCameraPreviewing(true)
    directorPreviewFrameRef.current = window.requestAnimationFrame(() => {
      directorPreviewFrameRef.current = null
      if (directorOpenRef.current) selectDirectorShot(next.id)
    })
    window.setTimeout(() => setDirectorCameraPreviewing(false), 920)
  }

  const prepareDirectorShot = async () => {
    if (activeDirectorShot.prepare === 'tutor' && !worldRef.current.objects.opening_annotation_question) {
      await openingTutor()
    } else if (activeDirectorShot.prepare === 'correction') {
      if (!worldRef.current.objects.opening_annotation_question) await openingTutor()
      if (!worldRef.current.objects[OPENING_CORRECTION_ID]) correctGammaSign()
    }
  }

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

  const openEditor = useCallback((id: string) => {
    const object = world.objects[id]
    if (!object) return
    setEditorMatrix(null)
    if (object.kind === 'text') setEditorValue(object.text)
    else if (object.kind === 'equation') setEditorValue(object.latex)
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
      } else if (/^[0-8]$/.test(event.key)) {
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
    const width = Math.max(1, window.innerWidth - 58)
    const height = Math.max(1, window.innerHeight - 54)
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
        ? cameraViewport(sceneId, Math.max(1, window.innerWidth - 58), Math.max(1, window.innerHeight - 54))
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
    <main className="mathburst-app" id="main" data-hydrated={hydrated} data-gallery-open={galleryOpen}>
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
        world={world}
        scene={activeScene}
        mode={directorOpen ? (mode === 'hand' ? 'hand' : 'select') : mode}
        run={run}
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
              <button type="button" disabled={agentBusy} onClick={() => { void openingTutor() }}>Ask WebMCP tutor</button>
            ) : (
              <button
                type="button"
                onClick={correctGammaSign}
                disabled={agentBusy || Boolean(world.objects[OPENING_CORRECTION_ID]) || (world.objects[OPENING_ATTEMPT_ID]?.kind === 'text' && world.objects[OPENING_ATTEMPT_ID].text.includes('105√π/16'))}
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
          availableObjectIds={new Set(Object.values(world.objects).filter((object) => object.opacity > 0).map((object) => object.id))}
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
          onPrepareShot={activeDirectorShot.prepare ? () => { void prepareDirectorShot() } : undefined}
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
      <WebMCPInspector tools={webMcpTools} status={registrationStatus} world={world} />
      <WebMCPTrace events={traceEvents} />

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
          onSave={saveEditor}
          onCancel={() => { setEditorId(null); setEditorMatrix(null) }}
        />
      )}
    </main>
  )
}
