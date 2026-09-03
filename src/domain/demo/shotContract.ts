import type { CatalogSceneId } from '../world/projects'
import {
  ATTENTION_ID,
  BARYCENTRIC_ID,
  GEOMETRY_ID,
  HERO_EQUATION_ID,
  HERO_GRAPH_ID,
  NUMBER_THEORY_ID,
  OPENING_ATTEMPT_ID,
  OPENING_CORRECTION_ID,
  OPENING_FRAME_ID,
  SIMPLEX_ID,
  SOURCE_IMAGE_ID,
  TRAINING_ID,
} from '../world/seed'

/**
 * Every deterministic shot preparation the Director can fire. A cue is a
 * pure description of ordinary world actions and real WebMCP tool calls; it
 * never mutates state on its own and is safe to run twice.
 */
export type DemoCueId =
  | 'gamma-source'
  | 'gamma-tutor'
  | 'gamma-corrected'
  | 'gamma-approved'
  | 'gamma-area'
  | 'gamma-tutor-shape'
  | 'attention-edit'
  | 'training-zero'
  | 'training-human-step'
  | 'training-tutor-step'
  | 'barycentric-live'
  | 'barycentric-centroid'
  | 'spiral-live'
  | 'spiral-construct'
  | 'simplex-live'
  | 'simplex-tutor-weight'
  | 'partition-live'
  | 'partition-reveal'
  | 'parity-shapes'
  | 'parity-shapes-match'
  | 'parity-ink-erase'
  | 'webmcp-crescendo'
  | 'one-world'

/** Presentational match transitions between consecutive frames. */
export type BridgeTransition =
  | 'minus-integral'
  | 'area-bins'
  | 'bins-logits'
  | 'ribbons-triangle'
  | 'triangle-simplex'
  | 'lattice-lanes'

export type ShotBeat = { cue: DemoCueId; label: string; actor: 'human' | 'agent' }

export type ShotContract = {
  id: string
  /** The cue that produces this frame's rest state. */
  cue: DemoCueId
  /** Optional Tutor or learner turns performed on camera after the rest state. */
  beats: readonly ShotBeat[]
  scene: CatalogSceneId
  requiredObjectIds: readonly string[]
  visibleInvariant: string
  gesture: string
  /** The presentational bridge played by "Preview next" toward the following frame. */
  bridgeToNext?: BridgeTransition
}

const OPENING_MARK_IDS = ['opening_annotation_circle', 'opening_annotation_strike', 'opening_annotation_question'] as const

export const SHOT_CONTRACTS: readonly ShotContract[] = [
  {
    id: 'opening-attempt', cue: 'gamma-source', beats: [], scene: 'gamma-clinic',
    requiredObjectIds: [OPENING_FRAME_ID, OPENING_ATTEMPT_ID, 'opening_prompt'],
    visibleInvariant: 'Start directly on the user\'s captured handwritten Gamma plate.',
    gesture: 'Hold. No cursor enters before the Tutor.',
  },
  {
    id: 'opening-tutor', cue: 'gamma-tutor', beats: [], scene: 'gamma-clinic',
    requiredObjectIds: [OPENING_ATTEMPT_ID, ...OPENING_MARK_IDS],
    visibleInvariant: 'A purple circle, strike, and `v = −e⁻ˣ. Two negatives.` appear as one attributed commit.',
    gesture: 'Tutor calls get_selection, get_objects, and create_objects.',
  },
  {
    id: 'opening-correction', cue: 'gamma-corrected', beats: [], scene: 'gamma-clinic',
    requiredObjectIds: [OPENING_ATTEMPT_ID, ...OPENING_MARK_IDS, OPENING_CORRECTION_ID],
    visibleInvariant: 'The learner replaces the recurrence minus with a plus in a separate commit. Undo can reverse either commit.',
    gesture: 'Press Correct the sign; then Undo and Redo once from the rail.',
    bridgeToNext: 'minus-integral',
  },
  {
    id: 'reconstruction', cue: 'gamma-approved', beats: [], scene: 'gamma-clinic',
    requiredObjectIds: [SOURCE_IMAGE_ID, OPENING_ATTEMPT_ID, HERO_EQUATION_ID],
    visibleInvariant: 'Source and semantic equation remain linked.',
    gesture: 'Reconstruct photo → AI double-check → Approve clean conversion.',
  },
  {
    id: 'gamma-probability', cue: 'gamma-area',
    beats: [{ cue: 'gamma-tutor-shape', label: 'Tutor changes a', actor: 'agent' }],
    scene: 'gamma-probability',
    requiredObjectIds: ['eq_integrand', HERO_GRAPH_ID, 'gamma_bridge_equation'],
    visibleInvariant: 'Three displayed bins include the tail and sum to `1.000`.',
    gesture: 'Drag bound b from 6.00 to 4.40; then the Tutor changes a.',
    bridgeToNext: 'area-bins',
  },
  {
    id: 'attention', cue: 'attention-edit', beats: [], scene: 'attention-geometry',
    requiredObjectIds: [ATTENTION_ID],
    visibleInvariant: 'Edit the one matrix cell chosen for the capture; vectors, angles, logits, and ribbon widths update.',
    gesture: 'Edit W_Q[1,1] from 0.82 to 1.40.',
    bridgeToNext: 'bins-logits',
  },
  {
    id: 'training-step', cue: 'training-zero',
    beats: [
      { cue: 'training-human-step', label: 'Train 1 step', actor: 'human' },
      { cue: 'training-tutor-step', label: 'Tutor step', actor: 'agent' },
    ],
    scene: 'train-from-scratch',
    requiredObjectIds: [TRAINING_ID, ATTENTION_ID],
    visibleInvariant: '`TRAIN 1 STEP` changes visible weights, raises the target-token probability, lowers cross-entropy, and extends the sparkline.',
    gesture: 'Reset, train one human step, then one Tutor step; undo the Tutor step and redo it.',
    bridgeToNext: 'ribbons-triangle',
  },
  {
    id: 'barycentrics', cue: 'barycentric-live',
    beats: [{ cue: 'barycentric-centroid', label: 'Tutor sets [1:1:1]', actor: 'agent' }],
    scene: 'attention-barycentrics',
    requiredObjectIds: [BARYCENTRIC_ID, 'barycentric_equation'],
    visibleInvariant: 'The three attention weights become `P = αA + βB + γC`, `α+β+γ=1`.',
    gesture: 'Drag P; drag A; then the Tutor applies [1:1:1].',
  },
  {
    id: 'homothety', cue: 'spiral-live',
    beats: [{ cue: 'spiral-construct', label: 'Tutor constructs S', actor: 'agent' }],
    scene: 'spiral-similarity',
    requiredObjectIds: [GEOMETRY_ID, 'geometry_ratio'],
    visibleInvariant: 'Drag the chosen source point `A`; mapped points, tangent circles, homothety ratios, spiral center, scale ray, rotation arc, and equal-angle marks recompute.',
    gesture: 'Drag A once; Tutor constructs the spiral centre; drag A once more.',
    bridgeToNext: 'triangle-simplex',
  },
  {
    id: 'simplex', cue: 'simplex-live',
    beats: [{ cue: 'simplex-tutor-weight', label: 'Tutor moves δ', actor: 'agent' }],
    scene: 'tetrahedral-probability',
    requiredObjectIds: [SIMPLEX_ID, 'simplex_equation'],
    visibleInvariant: 'Edit the selected weight; the interior point moves while the sum remains one.',
    gesture: 'Move δ; sweep the section plane to δ; show the lattice.',
  },
  {
    id: 'ramanujan', cue: 'partition-live',
    beats: [{ cue: 'partition-reveal', label: 'Tutor reveals p(5n+4)', actor: 'agent' }],
    scene: 'partition-observatory',
    requiredObjectIds: [NUMBER_THEORY_ID, 'partition_equation'],
    visibleInvariant: 'Reveal verified `p(5n+4) ≡ 0 (mod 5)` cases and then the honestly labeled theorem.',
    gesture: 'Change the finite cutoff once; select N = 14; the Tutor reveals the theorem.',
    bridgeToNext: 'lattice-lanes',
  },
  {
    id: 'webmcp-crescendo', cue: 'webmcp-crescendo', beats: [], scene: 'overview',
    requiredObjectIds: [],
    visibleInvariant: 'Show the inspector at exactly `48 / 48`.',
    gesture: 'Fire the crescendo cue; every chip attaches to its object and resolves into an activity row.',
  },
  {
    id: 'one-world', cue: 'one-world', beats: [], scene: 'overview',
    requiredObjectIds: [],
    visibleInvariant: 'Pull back across the four projects/eight scenes and end on `One mathematical world. Every agent can enter.`',
    gesture: 'Hold 1.8 seconds while the product remains alive.',
  },
]

export function getShotContract(id: string): ShotContract | undefined {
  return SHOT_CONTRACTS.find((contract) => contract.id === id)
}
