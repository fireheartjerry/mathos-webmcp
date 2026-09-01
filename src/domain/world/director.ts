import type { Bounds, Viewport, WorldState } from './types'
import type { CatalogSceneId } from './projects'

export const DIRECTOR_STORAGE_KEY = 'mathburst.director.v1'

export type DirectorObjectOverride = {
  bounds?: Bounds
  rotation?: number
  opacity?: number
}

/** A saved camera may carry the canvas size it was authored against. */
export type DirectorShotViewport = Viewport & {
  canvasWidth?: number
  canvasHeight?: number
}

export type DirectorShotEdit = {
  viewport: DirectorShotViewport
  overrides: Record<string, DirectorObjectOverride>
  approved: boolean
  updatedAt: number
}

export type DirectorReviewState = {
  version: 1
  activeShotId: string
  shots: Record<string, DirectorShotEdit>
}

export type DirectorShot = {
  id: string
  number: string
  timecode: string
  title: string
  intent: string
  scene: CatalogSceneId
  editable: Array<{ id: string; label: string }>
  transition: string
  status: 'live' | 'planned'
  prepare?: 'tutor' | 'correction'
  hiddenObjectIds?: string[]
}

export const DIRECTOR_SHOTS: DirectorShot[] = [
  {
    id: 'opening-attempt', number: '01', timecode: '0:00–0:05', title: 'The hidden sign',
    intent: 'Hold on the human recurrence before the Tutor enters.', scene: 'gamma-clinic',
    editable: [{ id: 'opening_attempt', label: 'Human attempt' }],
    transition: 'Macro drift', status: 'live',
    hiddenObjectIds: ['opening_annotation_circle', 'opening_annotation_strike', 'opening_annotation_question', 'opening_correction'],
  },
  {
    id: 'opening-tutor', number: '02', timecode: '0:05–0:11', title: 'Tutor marks the break',
    intent: 'Circle only the wrong minus; keep the note clear of the recurrence.', scene: 'gamma-clinic',
    editable: [
      { id: 'opening_annotation_circle', label: 'Circle' },
      { id: 'opening_annotation_strike', label: 'Underline' },
      { id: 'opening_annotation_question', label: 'Tutor note' },
    ],
    transition: 'Rack focus', status: 'live', prepare: 'tutor',
    hiddenObjectIds: ['opening_correction'],
  },
  {
    id: 'opening-correction', number: '03', timecode: '0:11–0:14', title: 'Learner repairs it',
    intent: 'The graphite correction lands separately and remains visibly human.', scene: 'gamma-clinic',
    editable: [
      { id: 'opening_correction', label: 'Correction' },
      { id: 'opening_annotation_circle', label: 'Circle' },
      { id: 'opening_annotation_question', label: 'Tutor note' },
    ],
    transition: 'Minus → integral', status: 'live', prepare: 'correction',
  },
  {
    id: 'reconstruction', number: '04', timecode: '0:14–0:29', title: 'Ink becomes semantic math',
    intent: 'Photo and reconstructed objects remain linked in one readable composition.', scene: 'gamma-clinic',
    editable: [
      { id: 'source', label: 'Source photo' },
      { id: 'opening_attempt', label: 'Source handwriting' },
      { id: 'gamma_clinic_frame', label: 'Clinic frame' },
    ],
    transition: 'Lateral track', status: 'live',
  },
  {
    id: 'gamma-probability', number: '05', timecode: '0:29–0:49', title: 'Area becomes probability',
    intent: 'The linked curve, normalization, and shaded area own the frame.', scene: 'gamma-probability',
    editable: [
      { id: 'eq_integrand', label: 'Density equation' },
      { id: 'graph_integrand', label: 'Live graph' },
      { id: 'gamma_bridge_equation', label: 'Softmax bridge' },
    ],
    transition: 'Area → bins', status: 'live',
  },
  {
    id: 'attention', number: '06', timecode: '0:49–1:08', title: 'Attention geometry',
    intent: 'Matrix, vectors, logits, and ribbons read as one mechanism.', scene: 'attention-geometry',
    editable: [
      { id: 'attention_mechanism', label: 'Attention mechanism' },
      { id: 'attention_bridge_label', label: 'Live model note' },
    ],
    transition: 'Bins → logits', status: 'live',
  },
  {
    id: 'training-step', number: '07', timecode: '1:08–1:18', title: 'One honest training step',
    intent: 'Probability rises and loss falls without implying frontier-model training.', scene: 'train-from-scratch',
    editable: [
      { id: 'training_panel', label: 'Training state' },
      { id: 'training_truth_label', label: 'Gradient note' },
    ],
    transition: 'Ribbons → triangle', status: 'live',
  },
  {
    id: 'barycentrics', number: '08', timecode: '1:18–1:32', title: 'Weights become barycentrics',
    intent: 'The weighted sum and triangle point share the same visible coefficients.', scene: 'attention-barycentrics',
    editable: [
      { id: 'barycentric_geometry', label: 'Barycentric triangle' },
      { id: 'barycentric_equation', label: 'Weighted sum' },
    ],
    transition: 'Weights → areas', status: 'live',
  },
  {
    id: 'homothety', number: '09', timecode: '1:32–1:46', title: 'Homothety and spiral similarity',
    intent: 'Ratios, tangency, and angle marks stay clear while the construction moves.', scene: 'spiral-similarity',
    editable: [
      { id: 'geometry_construction', label: 'Construction' },
      { id: 'geometry_ratio', label: 'Ratio' },
      { id: 'geometry_prompt', label: 'Problem' },
      { id: 'geometry_hint', label: 'Tutor hint' },
    ],
    transition: 'Triangle → simplex', status: 'live',
  },
  {
    id: 'simplex', number: '10', timecode: '1:46–2:03', title: 'Probability simplex',
    intent: 'A projected tetrahedron stays mathematically readable during the section sweep.', scene: 'tetrahedral-probability',
    editable: [
      { id: 'simplex_projection', label: 'Tetrahedron' },
      { id: 'simplex_equation', label: 'Four weights' },
    ],
    transition: 'Simplex → lattice', status: 'live',
  },
  {
    id: 'ramanujan', number: '11', timecode: '2:03–2:23', title: 'Integer lattice to Ramanujan',
    intent: 'Computed coefficients and the mod-five invariant remain the only spectacle.', scene: 'partition-observatory',
    editable: [
      { id: 'partition_observatory', label: 'Partition observatory' },
      { id: 'partition_equation', label: 'Generating function' },
    ],
    transition: 'Lattice → tool lanes', status: 'live',
  },
  {
    id: 'webmcp-crescendo', number: '12', timecode: '2:23–2:34', title: 'WebMCP crescendo',
    intent: 'Real target highlights resolve into 18 / 18 without covering the world.', scene: 'overview',
    editable: [], transition: 'Tool lanes → world', status: 'live',
  },
  {
    id: 'one-world', number: '13', timecode: '2:34–2:42', title: 'One mathematical world',
    intent: 'Every island is legible and the final lockup has room to breathe.', scene: 'overview',
    editable: [
      { id: 'gamma_clinic_frame', label: 'Gamma clinic' },
      { id: 'attention_geometry_frame', label: 'Attention island' },
      { id: 'spiral_similarity_frame', label: 'Geometry island' },
      { id: 'partition_observatory_frame', label: 'Arithmetic island' },
    ],
    transition: 'Final pullback', status: 'live',
  },
]

export const EMPTY_DIRECTOR_REVIEW: DirectorReviewState = {
  version: 1,
  activeShotId: DIRECTOR_SHOTS[0].id,
  shots: {},
}

export function loadDirectorReview(): DirectorReviewState {
  if (typeof window === 'undefined') return EMPTY_DIRECTOR_REVIEW
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DIRECTOR_STORAGE_KEY) ?? 'null') as Partial<DirectorReviewState> | null
    return parsed?.version === 1 && parsed.shots && typeof parsed.shots === 'object'
      ? { version: 1, activeShotId: String(parsed.activeShotId || DIRECTOR_SHOTS[0].id), shots: parsed.shots }
      : EMPTY_DIRECTOR_REVIEW
  } catch {
    return EMPTY_DIRECTOR_REVIEW
  }
}

export function saveDirectorReview(state: DirectorReviewState) {
  try { window.localStorage.setItem(DIRECTOR_STORAGE_KEY, JSON.stringify(state)) } catch { /* live review still works */ }
}

export function applyDirectorOverrides(
  world: WorldState,
  overrides: Record<string, DirectorObjectOverride>,
): WorldState['objects'] {
  const objects = { ...world.objects }
  for (const [id, override] of Object.entries(overrides)) {
    const object = objects[id]
    if (!object) continue
    objects[id] = {
      ...object,
      ...override,
      bounds: override.bounds ? { ...object.bounds, ...override.bounds } : object.bounds,
    }
  }
  return objects
}
