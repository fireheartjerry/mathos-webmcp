'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWorldTools } from '../domain/tools/definitions'
import type { ToolResult, WorldBridge, WorldTraceEvent } from '../domain/tools/definitions'
import { registerWorldTools } from '../domain/tools/registry'
import type { RegistrationStatus } from '../domain/tools/registry'
import { loadWorld, saveWorld } from '../domain/world/persistence'
import { dispatchWorldAction, stepWorldHistory } from '../domain/world/reducer'
import { createSeedWorld, HERO_EQUATION_ID, HERO_GRAPH_ID, OPENING_ATTEMPT_ID, OPENING_CORRECTION_ID, OPENING_FRAME_ID, SOURCE_IMAGE_ID } from '../domain/world/seed'
import {
  getProjectForScene,
  getSceneForViewport,
  getScenesForProject,
  getViewportForScene,
  SCENES,
  type CatalogSceneId,
  type ProjectId,
  type SceneId,
} from '../domain/world/projects'
import { DIRECTOR_SHOTS, EMPTY_DIRECTOR_REVIEW, loadDirectorReview, saveDirectorReview } from '../domain/world/director'
import type { DirectorShotEdit } from '../domain/world/director'
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
import ProjectNavigator from './ProjectNavigator'
import DirectorReviewPanel from './DirectorReviewPanel'
import ReconstructionPanel from './ReconstructionPanel'
import ToolRail from './ToolRail'
import type { ToolMode } from './ToolRail'
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
const nearestSceneForViewport = (viewport: WorldState['viewport'], width: number, height: number) => getSceneForViewport(viewport, width, height)

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
  const [hydrated, setHydrated] = useState(false)
  const [activeScene, setActiveScene] = useState<CatalogSceneId>('gamma-clinic')
  const [activeProject, setActiveProject] = useState<ProjectId>('gamma-lab')
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

  useEffect(() => {
    const samples = loadHandwritingSamples()
    handwritingSamplesRef.current = samples
    const stored = loadWorld()
    if (stored) {
      const captured = applyCapturedOpeningAttempt(stored, samples)
      worldRef.current = captured
      setWorld(captured)
      const restoredScene = nearestSceneForViewport(captured.viewport, Math.max(1, window.innerWidth - 58), Math.max(1, window.innerHeight - 54))
      setActiveScene(restoredScene)
      if (restoredScene !== 'overview') setActiveProject(getProjectForScene(restoredScene).id)
    } else {
      const seeded = createSeedWorld()
      const captured = applyCapturedOpeningAttempt(seeded, samples)
      const centered = { ...captured, viewport: cameraViewport('gamma-clinic', Math.max(1, window.innerWidth - 58), Math.max(1, window.innerHeight - 54)) }
      worldRef.current = centered
      setWorld(centered)
    }
    setDirectorState(loadDirectorReview())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWorld(world)
  }, [hydrated, world])

  useEffect(() => {
    if (hydrated) saveDirectorReview(directorState)
  }, [directorState, hydrated])

  useEffect(() => {
    if (!hydrated || directorOpen) return
    const nearest = nearestSceneForViewport(world.viewport, Math.max(1, window.innerWidth - 58), Math.max(1, window.innerHeight - 54))
    setActiveScene((current) => current === nearest ? current : nearest)
    if (nearest !== 'overview') setActiveProject((current) => {
      const next = getProjectForScene(nearest).id
      return current === next ? current : next
    })
  }, [directorOpen, hydrated, world.viewport])

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

  const navigateToScene = useCallback((scene: CatalogSceneId) => {
    const canvasWidth = Math.max(1, window.innerWidth - 58)
    const canvasHeight = Math.max(1, window.innerHeight - 54)
    // Camera navigation is intentionally not a world commit: changing scenes should
    // never pollute learner history or the activity rail.
    const viewport = cameraViewport(scene, canvasWidth, canvasHeight)
    const next = { ...worldRef.current, viewport }
    worldRef.current = next
    setWorld(next)
    setActiveScene(scene)
    if (scene !== 'overview') setActiveProject(getProjectForScene(scene).id)
    setMode('select')
    setEditorId(null)
    setEditorMatrix(null)
  }, [])

  const bridge = useMemo<WorldBridge>(() => ({
    getWorld: () => worldRef.current,
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

  const directorDefaultViewport = (scene: CatalogSceneId): Viewport => cameraViewport(
    scene,
    Math.max(1, window.innerWidth - 58),
    Math.max(1, window.innerHeight - 54),
  )

  const activeDirectorShot = DIRECTOR_SHOTS.find((shot) => shot.id === directorState.activeShotId) ?? DIRECTOR_SHOTS[0]
  const activeDirectorEdit = directorState.shots[activeDirectorShot.id]
  const directorViewport = activeDirectorEdit?.viewport ?? world.viewport
  const directorOverrides = useMemo(() => {
    const overrides = { ...(activeDirectorEdit?.overrides ?? {}) }
    for (const id of activeDirectorShot.hiddenObjectIds ?? []) {
      overrides[id] = { ...overrides[id], opacity: 0 }
    }
    return overrides
  }, [activeDirectorEdit?.overrides, activeDirectorShot])

  const updateDirectorEdit = (update: (edit: DirectorShotEdit) => DirectorShotEdit) => {
    setDirectorState((current) => {
      const shot = DIRECTOR_SHOTS.find((candidate) => candidate.id === current.activeShotId) ?? DIRECTOR_SHOTS[0]
      const existing = current.shots[shot.id] ?? {
        viewport: directorDefaultViewport(shot.scene),
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
    if (!shot) return
    setDirectorState((current) => ({
      ...current,
      activeShotId: shot.id,
      shots: current.shots[shot.id] ? current.shots : {
        ...current.shots,
        [shot.id]: {
          viewport: directorDefaultViewport(shot.scene),
          overrides: {},
          approved: false,
          updatedAt: Date.now(),
        },
      },
    }))
    setActiveScene(shot.scene)
    setDirectorSelection([])
    setMode('select')
    setEditorId(null)
    setEditorMatrix(null)
  }

  const openDirectorReview = () => {
    setDirectorControlsHidden(false)
    setDirectorOpen(true)
    selectDirectorShot(activeDirectorShot.id)
  }

  const closeDirectorReview = () => {
    setDirectorControlsHidden(false)
    setDirectorOpen(false)
    setDirectorSelection([])
    setActiveScene(nearestSceneForViewport(
      worldRef.current.viewport,
      Math.max(1, window.innerWidth - 58),
      Math.max(1, window.innerHeight - 54),
    ))
  }

  const setDirectorViewport = (viewport: Viewport) => updateDirectorEdit((edit) => ({
    ...edit,
    viewport,
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
          viewport: directorDefaultViewport(shot.scene),
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
    const index = DIRECTOR_SHOTS.findIndex((shot) => shot.id === activeDirectorShot.id)
    const next = DIRECTOR_SHOTS[(index + 1) % DIRECTOR_SHOTS.length]
    setDirectorCameraPreviewing(true)
    window.requestAnimationFrame(() => selectDirectorShot(next.id))
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
    const seed = createSeedWorld()
    const samples = { ...handwritingSamplesRef.current, ...loadHandwritingSamples() }
    handwritingSamplesRef.current = samples
    const captured = applyCapturedOpeningAttempt(seed, samples)
    const centered = { ...captured, viewport: cameraViewport('gamma-clinic', Math.max(1, window.innerWidth - 58), Math.max(1, window.innerHeight - 54)) }
    worldRef.current = centered
    setWorld(centered)
    setActiveScene(directorOpen ? activeDirectorShot.scene : 'gamma-clinic')
    setActiveProject(directorOpen && activeDirectorShot.scene !== 'overview' ? getProjectForScene(activeDirectorShot.scene).id : 'gamma-lab')
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
      } else if (/^[0-8]$/.test(event.key)) {
        const scene = event.key === '0'
          ? 'overview'
          : (Object.values(SCENES).find((candidate) => candidate.keyboard === Number(event.key))?.id ?? 'gamma-clinic')
        navigateToScene(scene)
      } else {
        const shortcuts: Record<string, ToolMode> = { v: 'select', h: 'hand', p: 'pen', e: 'eraser', t: 'text', m: 'equation', g: 'graph', c: 'geometry', x: 'matrix', s: 'shape', a: 'arrow', f: 'frame' }
        const next = shortcuts[event.key.toLowerCase()]
        if (next) setMode(next)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelection, duplicateSelection, groupSelection, history, navigateToScene])

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
        <div className="world-title"><b>{activeScene === 'overview' ? 'One mathematical world' : SCENES[activeScene].title}</b><span>/</span><em>shared mathematical world</em></div>
        <div className="header-actions">
          <button
            type="button"
            className="director-trigger"
            aria-pressed={directorOpen}
            onClick={directorOpen ? closeDirectorReview : openDirectorReview}
          >
            {directorOpen ? 'Close review' : 'Director review'}
          </button>
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
        tutorOverlay={activeScene === 'gamma-clinic' && (!directorOpen || activeDirectorShot.id !== 'opening-attempt') ? (
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
      ) : (
        <ProjectNavigator
          activeProject={activeProject}
          activeScene={activeScene}
          onProjectChange={(projectId) => {
            setActiveProject(projectId)
            navigateToScene(getScenesForProject(projectId)[0].id)
          }}
          onSceneChange={(sceneId: SceneId) => navigateToScene(sceneId)}
          onOverview={() => navigateToScene('overview')}
        />
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
          <button type="button" aria-label="Zoom out" onClick={() => zoomTo(world.viewport.zoom / 1.2)}>−</button>
          <span>{Math.round(world.viewport.zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => zoomTo(world.viewport.zoom * 1.2)}>+</button>
        </div>
      )}

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
