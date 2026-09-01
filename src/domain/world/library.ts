import { createSeedWorld } from './seed'
import { PROJECTS, getScenesForProject, type CatalogSceneId, type ProjectId } from './projects'
import type { Bounds, WorldObject, WorldState } from './types'

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
  world: WorldState
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
  return {
    ...structuredClone(source),
    title: title ?? PROJECTS.find((project) => project.id === projectId)?.title ?? source.title,
    objects,
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
  world: createProjectWorld(canonicalSeed, project.id, project.title),
}))

const isWorld = (value: unknown): value is WorldState => Boolean(
  value && typeof value === 'object' && 'version' in value && value.version === 1,
)

const isProject = (value: unknown): value is LibraryProject => {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<LibraryProject>
  return typeof project.id === 'string'
    && typeof project.title === 'string'
    && typeof project.description === 'string'
    && (project.templateId === null || PROJECTS.some((candidate) => candidate.id === project.templateId))
    && (project.kind === 'built-in' || project.kind === 'user')
    && typeof project.createdAt === 'number'
    && typeof project.updatedAt === 'number'
    && (project.deletedAt === null || typeof project.deletedAt === 'number')
    && isWorld(project.world)
}

export function createDefaultProjectLibrary(): LibraryProject[] {
  return BUILT_IN_PROJECTS.map((project) => ({ ...project, world: cloneWorld(project.world, project.title) }))
}

/** Merge stored state with the four canonical projects so app updates never orphan them. */
export function loadProjectLibrary(): LibraryProject[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROJECT_LIBRARY_STORAGE_KEY) ?? 'null')
    const stored = Array.isArray(parsed) ? parsed.filter(isProject) : []
    const storedById = new Map(stored.map((project) => [project.id, project]))
    const builtIns = BUILT_IN_PROJECTS.map((project) => {
      const saved = storedById.get(project.id)
      return saved
        ? { ...project, deletedAt: saved.deletedAt, updatedAt: saved.updatedAt, world: cloneWorld(saved.world, project.title) }
        : { ...project, world: cloneWorld(project.world, project.title) }
    })
    const userProjects = stored.filter((project) => project.kind === 'user')
    return [...builtIns, ...userProjects]
  } catch {
    return createDefaultProjectLibrary()
  }
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
  return {
    id: crypto.randomUUID(),
    title: cleanTitle,
    description: templateId
      ? `A private copy of ${PROJECTS.find((project) => project.id === templateId)?.title ?? 'a Mathburst project'}.`
      : 'A blank mathematical world ready for ink, equations, graphs, and constructions.',
    templateId,
    startScene: templateId ? getScenesForProject(templateId)[0].id : 'overview',
    kind: 'user',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    world: cloneWorld(world, cleanTitle),
  }
}
