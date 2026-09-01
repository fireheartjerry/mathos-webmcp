import type { Point, Viewport, WorldState } from './types'

/** The four persistent project templates. */
export type ProjectId =
  | 'gamma-lab'
  | 'tiny-transformer'
  | 'olympiad-geometry'
  | 'simplex-ramanujan'

/** The eight live scenes. `overview` is a camera mode, not a scene. */
export type SceneId =
  | 'gamma-clinic'
  | 'gamma-probability'
  | 'attention-geometry'
  | 'train-from-scratch'
  | 'attention-barycentrics'
  | 'spiral-similarity'
  | 'tetrahedral-probability'
  | 'partition-observatory'

export type CatalogSceneId = SceneId | 'overview'

export type ProjectScene = {
  id: SceneId
  projectId: ProjectId
  title: string
  subtitle: string
  center: Point
  zoom: number
  frameId: string
  keyboard: number
  /** The sentence used to connect this scene to the next one in the video. */
  transition: string
}

export type SavedProject = {
  id: ProjectId
  title: string
  eyebrow: string
  description: string
  accent: string
  sceneIds: readonly [SceneId, SceneId]
}

const scene = <T extends ProjectScene>(value: T): T => value

/**
 * Scene locations are intentionally arranged as two rows of four.  This gives
 * the overview a readable world-map silhouette while keeping each saved
 * project as a pair of adjacent camera bookmarks.
 */
export const SCENES: Readonly<Record<SceneId, ProjectScene>> = {
  'gamma-clinic': scene({
    id: 'gamma-clinic', projectId: 'gamma-lab',
    title: 'Gamma Recurrence', subtitle: 'Correct the sign',
    center: { x: -450, y: 340 }, zoom: 1.05, frameId: 'gamma_clinic_frame', keyboard: 1,
    transition: 'The corrected recurrence normalizes into a probability density.',
  }),
  'gamma-probability': scene({
    id: 'gamma-probability', projectId: 'gamma-lab',
    title: 'Gamma Density', subtitle: 'Area under the curve',
    center: { x: 650, y: 340 }, zoom: 0.95, frameId: 'gamma_probability_frame', keyboard: 2,
    transition: 'Log-masses pass through softmax and become attention weights.',
  }),
  'attention-geometry': scene({
    id: 'attention-geometry', projectId: 'tiny-transformer',
    title: 'Attention', subtitle: 'Compute a weighted sum',
    center: { x: 1750, y: 340 }, zoom: 1.05, frameId: 'attention_geometry_frame', keyboard: 3,
    transition: 'The weighted value vector is an exact point inside a triangle.',
  }),
  'train-from-scratch': scene({
    id: 'train-from-scratch', projectId: 'tiny-transformer',
    title: 'Gradient Step', subtitle: 'Update the model weights',
    center: { x: 2850, y: 340 }, zoom: 0.95, frameId: 'train_from_scratch_frame', keyboard: 4,
    transition: 'A learned attention mixture becomes barycentric geometry.',
  }),
  'attention-barycentrics': scene({
    id: 'attention-barycentrics', projectId: 'olympiad-geometry',
    title: 'Barycentric Coordinates', subtitle: 'Weights locate a point',
    center: { x: -450, y: 1030 }, zoom: 0.95, frameId: 'attention_barycentrics_frame', keyboard: 5,
    transition: 'Similarity preserves the normalized combination while the figure moves.',
  }),
  'spiral-similarity': scene({
    id: 'spiral-similarity', projectId: 'olympiad-geometry',
    title: 'Spiral Similarity', subtitle: 'Preserve the ratio',
    center: { x: 650, y: 1030 }, zoom: 0.95, frameId: 'spiral_similarity_frame', keyboard: 6,
    transition: 'Three weights lift into a fourth dimension without losing their sum.',
  }),
  'tetrahedral-probability': scene({
    id: 'tetrahedral-probability', projectId: 'simplex-ramanujan',
    title: 'Simplex', subtitle: 'Add a dimension',
    center: { x: 1750, y: 1030 }, zoom: 0.9, frameId: 'tetrahedral_probability_frame', keyboard: 7,
    transition: 'Quantized weights form an integer lattice counted by Pascal.',
  }),
  'partition-observatory': scene({
    id: 'partition-observatory', projectId: 'simplex-ramanujan',
    title: 'Integer Partitions', subtitle: 'Compute the coefficients',
    center: { x: 2850, y: 1030 }, zoom: 0.9, frameId: 'partition_observatory_frame', keyboard: 8,
    transition: 'The finite coefficient stream reveals the five-fold congruence.',
  }),
}

export const PROJECTS: readonly SavedProject[] = [
  {
    id: 'gamma-lab', title: 'Gamma Function', eyebrow: '01 / CALCULUS',
    description: 'Correct the recurrence. Then compute the area under its curve.', accent: '#8b6cf6',
    sceneIds: ['gamma-clinic', 'gamma-probability'],
  },
  {
    id: 'tiny-transformer', title: 'Tiny Transformer', eyebrow: '02 / MACHINE LEARNING',
    description: 'Edit one attention head. Then apply one gradient step.', accent: '#e38b57',
    sceneIds: ['attention-geometry', 'train-from-scratch'],
  },
  {
    id: 'olympiad-geometry', title: 'Olympiad Geometry', eyebrow: '03 / GEOMETRY',
    description: 'Use barycentric coordinates and spiral similarity to move a point.', accent: '#4c9f9a',
    sceneIds: ['attention-barycentrics', 'spiral-similarity'],
  },
  {
    id: 'simplex-ramanujan', title: 'Simplex and Partitions', eyebrow: '04 / NUMBER THEORY',
    description: 'Map the weights to a tetrahedron. Then count integer partitions.', accent: '#c5759e',
    sceneIds: ['tetrahedral-probability', 'partition-observatory'],
  },
]

export const OVERVIEW_SCENE_ID = 'overview' as const

/** A 1440×900-friendly fit for the two-row overview camera. */
export const OVERVIEW_VIEWPORT: Viewport = { x: 384, y: 258, zoom: 0.28 }

const PROJECT_BY_ID: Readonly<Record<ProjectId, SavedProject>> = Object.fromEntries(
  PROJECTS.map((project) => [project.id, project]),
) as Record<ProjectId, SavedProject>

export function getProject(projectId: ProjectId): SavedProject {
  return PROJECT_BY_ID[projectId]
}

export function getScene(sceneId: SceneId): ProjectScene {
  return SCENES[sceneId]
}

export function getScenesForProject(projectId: ProjectId): readonly [ProjectScene, ProjectScene] {
  const [first, second] = getProject(projectId).sceneIds
  return [SCENES[first], SCENES[second]]
}

const containsCenter = (bounds: { x: number; y: number; width: number; height: number }, object: { bounds: { x: number; y: number; width: number; height: number } }) => {
  const centerX = object.bounds.x + object.bounds.width / 2
  const centerY = object.bounds.y + object.bounds.height / 2
  return centerX >= bounds.x
    && centerX <= bounds.x + bounds.width
    && centerY >= bounds.y
    && centerY <= bounds.y + bounds.height
}

/** Return the frame, local contents, and direct semantic companions of a scene. */
export function getSceneObjectIds(world: WorldState, sceneId: SceneId): string[] {
  const frame = world.objects[SCENES[sceneId].frameId]
  if (!frame) return []
  const ids = new Set<string>()
  const visit = (id: string) => {
    const object = world.objects[id]
    if (!object || ids.has(id)) return
    ids.add(id)
    if (object.kind === 'frame' || object.kind === 'group') object.childIds.forEach(visit)
    if (object.kind === 'graph') visit(object.equationId)
    if (object.kind === 'matrix') object.sourceIds.forEach(visit)
  }

  visit(frame.id)
  for (const object of Object.values(world.objects)) {
    if (containsCenter(frame.bounds, object)) visit(object.id)
  }
  return world.order.filter((id) => ids.has(id))
}

/**
 * Return a camera viewport for a catalog scene at the current canvas size.
 * Keeping this here prevents each navigator/canvas from inventing its own
 * camera math.  Overview remains a fixed fit on the intended 1440×900 judge
 * canvas and scales naturally when a different size is supplied.
 */
export function getViewportForScene(sceneId: CatalogSceneId, width = 1440, height = 900): Viewport {
  if (sceneId === OVERVIEW_SCENE_ID) {
    const overviewCenter = { x: 1200, y: 685 }
    const zoom = OVERVIEW_VIEWPORT.zoom * Math.min(width / 1440, height / 900)
    return { x: width / 2 - overviewCenter.x * zoom, y: height / 2 - overviewCenter.y * zoom, zoom }
  }

  const target = SCENES[sceneId]
  // Scale down on narrow canvases so a scene remains visible on split-screen and
  // mobile layouts; keep a floor so labels never become unusably tiny.
  const responsiveScale = Math.min(1.8, Math.max(0.55, Math.min(width / 1382, height / 846)))
  const zoom = target.zoom * responsiveScale
  return { x: width / 2 - target.center.x * zoom, y: height / 2 - target.center.y * zoom, zoom }
}

export function getProjectForScene(sceneId: SceneId): SavedProject {
  return getProject(SCENES[sceneId].projectId)
}
