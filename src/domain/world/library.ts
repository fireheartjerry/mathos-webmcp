import { createSeedWorld } from './seed'
import { migrateWorld } from './migrations'
import { getViewportForScene, PROJECTS, SCENES, getScenesForProject, type CatalogSceneId, type ProjectId, type SceneId } from './projects'
import type { Bounds, Viewport, WorldObject, WorldState } from './types'

export const PROJECT_LIBRARY_STORAGE_KEY = 'mathburst.project-library.v2'

export type LibraryProject = {
  id: string
  title: string
  description: string
  templateId: ProjectId | null
  startScene: CatalogSceneId
  kind: 'built-in' | 'user'
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  sceneViewports: Partial<Record<SceneId, Viewport>>
  world: WorldState
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(
  value && typeof value === 'object' && !Array.isArray(value),
)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const FORBIDDEN_LIBRARY_IDS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
])

const isSafeLibraryId = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0
  && !FORBIDDEN_LIBRARY_IDS.has(value)

const isViewport = (value: unknown): value is Viewport => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.zoom)
  && value.zoom > 0

const isSceneId = (value: string): value is SceneId => Object.prototype.hasOwnProperty.call(SCENES, value)

const cloneViewport = (viewport: Viewport): Viewport => ({ ...viewport })

const cloneSceneViewports = (
  sceneViewports: Partial<Record<SceneId, Viewport>>,
): Partial<Record<SceneId, Viewport>> => Object.fromEntries(
  Object.entries(sceneViewports).map(([sceneId, viewport]) => [sceneId, cloneViewport(viewport)]),
) as Partial<Record<SceneId, Viewport>>

const canonicalSceneViewports = (projectId: ProjectId): Partial<Record<SceneId, Viewport>> => Object.fromEntries(
  getScenesForProject(projectId).map((scene) => [scene.id, getViewportForScene(scene.id)]),
) as Partial<Record<SceneId, Viewport>>

const normalizeStartScene = (templateId: ProjectId | null, startScene: CatalogSceneId): CatalogSceneId => {
  if (!templateId) return 'overview'
  const ownScenes = getScenesForProject(templateId)
  return ownScenes.some((scene) => scene.id === startScene) ? startScene : ownScenes[0].id
}

/** Normalize optional camera bookmarks without mutating the persisted project. */
const parseSceneViewports = (
  value: unknown,
  startScene: CatalogSceneId,
  fallback: Viewport,
  allowedSceneIds: readonly SceneId[],
): Partial<Record<SceneId, Viewport>> | null => {
  const sceneViewports: Partial<Record<SceneId, Viewport>> = {}
  if (value !== undefined && !isRecord(value)) return null
  if (isRecord(value)) {
    for (const [sceneId, viewport] of Object.entries(value)) {
      // Foreign catalog scenes are intentionally ignored at the project
      // boundary. An invalid viewport for an owned scene makes the row
      // untrusted instead of silently replacing saved camera state.
      if (!isSceneId(sceneId) || !allowedSceneIds.includes(sceneId)) continue
      if (!isViewport(viewport)) return null
      sceneViewports[sceneId] = cloneViewport(viewport)
    }
  }
  if (startScene !== 'overview' && !sceneViewports[startScene]) {
    sceneViewports[startScene] = cloneViewport(fallback)
  }
  return sceneViewports
}

const containsCenter = (bounds: Bounds, object: WorldObject) => {
  const centerX = object.bounds.x + object.bounds.width / 2
  const centerY = object.bounds.y + object.bounds.height / 2
  return centerX >= bounds.x
    && centerX <= bounds.x + bounds.width
    && centerY >= bounds.y
    && centerY <= bounds.y + bounds.height
}

/** Build the actual product boundary: one project can never reveal another project by panning. */
export function createProjectWorld(source: WorldState, projectId: ProjectId, title?: string): WorldState {
  const sceneFrames = getScenesForProject(projectId).map((scene) => source.objects[scene.frameId]).filter(Boolean)
  const frameBounds = sceneFrames.map((frame) => frame.bounds)
  const ids = new Set<string>()

  const visit = (id: string) => {
    const object = source.objects[id]
    if (!object || ids.has(id)) return
    ids.add(id)
    if (object.kind === 'frame' || object.kind === 'group') object.childIds.forEach(visit)
    if (object.kind === 'graph') visit(object.equationId)
    if (object.kind === 'matrix') object.sourceIds.forEach(visit)
  }

  sceneFrames.forEach((frame) => visit(frame.id))
  for (const object of Object.values(source.objects)) {
    if (frameBounds.some((bounds) => containsCenter(bounds, object))) visit(object.id)
  }

  const order = source.order.filter((id) => ids.has(id))
  const objects = Object.fromEntries(order.map((id) => [id, structuredClone(source.objects[id])]))
  const retainedEntityIds = new Set<string>()
  for (const object of Object.values(objects)) {
    if ('entityId' in object && typeof object.entityId === 'string') retainedEntityIds.add(object.entityId)
  }
  const bindings = Object.fromEntries(
    Object.entries(source.bindings)
      .filter(([, binding]) => ids.has(binding.target.objectId))
      .map(([id, binding]) => {
        retainedEntityIds.add(binding.source.entityId)
        return [id, structuredClone(binding)]
      }),
  )
  const entities = Object.fromEntries(
    Object.entries(source.entities)
      .filter(([id]) => retainedEntityIds.has(id))
      .map(([id, entity]) => [id, structuredClone(entity)]),
  )
  return {
    ...structuredClone(source),
    title: title ?? PROJECTS.find((project) => project.id === projectId)?.title ?? source.title,
    objects,
    entities,
    bindings,
    order,
    selection: [],
    history: [],
    future: [],
    activity: [],
    reconstruction: null,
  }
}

const canonicalSeed = createSeedWorld()
const BUILT_IN_PROJECTS: LibraryProject[] = PROJECTS.map((project, index) => ({
  id: project.id,
  title: project.title,
  description: project.description,
  templateId: project.id,
  startScene: getScenesForProject(project.id)[0].id,
  kind: 'built-in',
  createdAt: index + 1,
  updatedAt: index + 1,
  deletedAt: null,
  sceneViewports: canonicalSceneViewports(project.id),
  world: createProjectWorld(canonicalSeed, project.id, project.title),
}))

export type ProjectLibraryLoadResult = {
  projects: LibraryProject[]
  /** True when storage was absent or fully parsed and migrated. */
  ok: boolean
  /** True when raw storage was present but could not be trusted for repair. */
  needsRepair: boolean
}

type ParsedProject = {
  project: LibraryProject
  needsRepair: boolean
}

const parseProject = (value: unknown): ParsedProject | null => {
  if (!isRecord(value)) return null
  const project = value as Partial<LibraryProject>
  if (!(isSafeLibraryId(project.id)
    && typeof project.title === 'string'
    && typeof project.description === 'string'
    && (project.templateId === null || PROJECTS.some((candidate) => candidate.id === project.templateId))
    && (project.kind === 'built-in' || project.kind === 'user')
    && typeof project.startScene === 'string'
    && (project.startScene === 'overview' || isSceneId(project.startScene))
    && isFiniteNumber(project.createdAt)
    && isFiniteNumber(project.updatedAt)
    && (project.deletedAt === null || (isFiniteNumber(project.deletedAt) && project.deletedAt >= 0)))) return null
  if (project.kind === 'built-in'
    && (project.templateId === null || project.id !== project.templateId
      || !PROJECTS.some((candidate) => candidate.id === project.templateId))) return null
  if (project.kind === 'user' && PROJECTS.some((candidate) => candidate.id === project.id)) return null
  const world = migrateWorld(project.world)
  if (!world) return null
  const templateId = project.templateId as ProjectId | null
  const startScene = normalizeStartScene(templateId, project.startScene)
  const allowedSceneIds = templateId ? getScenesForProject(templateId).map((scene) => scene.id) : []
  let needsRepair = startScene !== project.startScene
  if (project.sceneViewports !== undefined) {
    if (!isRecord(project.sceneViewports)) return null
    for (const sceneId of Object.keys(project.sceneViewports)) {
      if (!isSceneId(sceneId) || !allowedSceneIds.includes(sceneId)) needsRepair = true
    }
  }
  const sceneViewports = parseSceneViewports(project.sceneViewports, startScene, world.viewport, allowedSceneIds)
  if (!sceneViewports) return null
  return {
    needsRepair,
    project: {
      ...(project as LibraryProject),
      startScene,
      sceneViewports,
      world,
    },
  }
}

export function createDefaultProjectLibrary(): LibraryProject[] {
  return BUILT_IN_PROJECTS.map((project) => ({
    ...project,
    sceneViewports: cloneSceneViewports(project.sceneViewports),
    world: cloneWorld(project.world, project.title),
  }))
}

/** Merge stored state with canonical projects without writing or deleting raw storage. */
export function loadProjectLibraryResult(): ProjectLibraryLoadResult {
  try {
    const raw = localStorage.getItem(PROJECT_LIBRARY_STORAGE_KEY)
    if (raw === null) return { projects: createDefaultProjectLibrary(), ok: true, needsRepair: false }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return { projects: createDefaultProjectLibrary(), ok: false, needsRepair: true }
    }
    const parsedProjects = parsed.map(parseProject)
    const stored: LibraryProject[] = []
    const storedIds = new Set<string>()
    let duplicateIds = false
    for (const parsedProject of parsedProjects) {
      if (!parsedProject) continue
      if (storedIds.has(parsedProject.project.id)) {
        duplicateIds = true
        continue
      }
      storedIds.add(parsedProject.project.id)
      stored.push(parsedProject.project)
    }
    const storedById = new Map(stored.map((project) => [project.id, project]))
    const builtIns = BUILT_IN_PROJECTS.map((project) => {
      const saved = storedById.get(project.id)
      return saved
        ? {
            ...project,
            deletedAt: saved.deletedAt,
            updatedAt: saved.updatedAt,
            // Fresh built-ins receive both deterministic bookmarks. A saved
            // legacy start-scene viewport wins for that scene, preserving its
            // camera while still filling the second bookmark.
            sceneViewports: {
              ...cloneSceneViewports(project.sceneViewports),
              ...cloneSceneViewports(saved.sceneViewports),
            },
            world: cloneWorld(saved.world, project.title),
          }
        : {
            ...project,
            sceneViewports: cloneSceneViewports(project.sceneViewports),
            world: cloneWorld(project.world, project.title),
          }
    })
    const userProjects = stored.filter((project) => project.kind === 'user')
    const needsRepair = duplicateIds || parsedProjects.some((parsedProject) => (
      parsedProject === null || parsedProject.needsRepair
    ))
    return { projects: [...builtIns, ...userProjects], ok: !needsRepair, needsRepair }
  } catch {
    return { projects: createDefaultProjectLibrary(), ok: false, needsRepair: true }
  }
}

/** Backwards-compatible project-only loader. */
export function loadProjectLibrary(): LibraryProject[] {
  return loadProjectLibraryResult().projects
}

export function saveProjectLibrary(projects: LibraryProject[]) {
  try {
    localStorage.setItem(PROJECT_LIBRARY_STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // The active project remains usable when local persistence is unavailable.
  }
}

export function cloneWorld(world: WorldState, title = world.title): WorldState {
  const clone = JSON.parse(JSON.stringify(world)) as WorldState
  return {
    ...clone,
    title,
    selection: [],
    history: [],
    future: [],
    activity: [],
    reconstruction: null,
  }
}

export function createBlankWorld(title: string): WorldState {
  const seed = createSeedWorld()
  return {
    ...seed,
    title,
    objects: {},
    entities: {},
    bindings: {},
    timelines: {},
    order: [],
    selection: [],
    viewport: { x: 640, y: 390, zoom: 1 },
    history: [],
    future: [],
    activity: [],
    session: {
      attempts: 0,
      helpShown: [],
      currentMisconception: null,
      reconstructionStatus: 'source',
    },
    reconstruction: null,
  }
}

export function createUserProject(
  title: string,
  templateId: ProjectId | null,
  world: WorldState,
): LibraryProject {
  const now = Date.now()
  const cleanTitle = title.trim() || 'Untitled project'
  const startScene = templateId ? getScenesForProject(templateId)[0].id : 'overview'
  return {
    id: crypto.randomUUID(),
    title: cleanTitle,
    description: templateId
      ? `A private copy of ${PROJECTS.find((project) => project.id === templateId)?.title ?? 'a Mathburst project'}.`
    : 'A blank mathematical world ready for ink, equations, graphs, and constructions.',
    templateId,
    startScene,
    kind: 'user',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    sceneViewports: templateId ? canonicalSceneViewports(templateId) : {},
    world: cloneWorld(world, cleanTitle),
  }
}
