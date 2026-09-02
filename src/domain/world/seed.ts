import { gammaBinMasses } from '../math/probability'
import { createInitialTinyModel, evaluateTinyModel } from '../math/transformer'
import { migrateWorld } from './migrations'
import type {
  AttentionObject,
  BarycentricObject,
  GeometryObject,
  NumberTheoryObject,
  SimplexObject,
  TrainingObject,
  WorldObject,
  WorldState,
} from './types'

export const HERO_EQUATION_ID = 'eq_integral'
export const HERO_GRAPH_ID = 'graph_integrand'
export const SOURCE_IMAGE_ID = 'source'
export const OPENING_FRAME_ID = 'gamma_clinic_frame'
export const OPENING_ATTEMPT_ID = 'opening_attempt'
export const OPENING_CORRECTION_ID = 'opening_correction'
export const RECON_RECURRENCE_ID = 'recon_recurrence'
export const RECON_WORK_ID = 'recon_work'
export const ATTENTION_ID = 'attention_mechanism'
export const TRAINING_ID = 'training_panel'
export const BARYCENTRIC_ID = 'barycentric_geometry'
export const GEOMETRY_ID = 'geometry_construction'
export const SIMPLEX_ID = 'simplex_projection'
export const NUMBER_THEORY_ID = 'partition_observatory'

/** Camera-visible defaults shared by the seed and the deterministic cue layer. */
export const GAMMA_SHAPE = 4.5
export const GAMMA_BOUND = 6
/** The final bin owns the infinite tail; the stored edge is only the plot cutoff. */
export const GAMMA_BIN_EDGES: [number, number, number, number] = [0, 3.15, 6.075, 16]

/** Hidden spiral-similarity centre and the fixed similarity used by the construction. */
export const SPIRAL_CENTER = { x: 680, y: 360 }
export const SPIRAL_FACTOR = 0.72
export const SPIRAL_ANGLE = 28
export const HOMOTHETY_FACTOR = 0.58

const frame = (
  id: string,
  title: string,
  childIds: string[],
  x: number,
  y: number,
  width = 820,
  height = 550,
): WorldObject => ({
  id,
  kind: 'frame',
  title,
  childIds,
  bounds: { x, y, width, height },
  rotation: 0,
  author: 'human',
  opacity: 1,
})

export function createSeedWorld(): WorldState {
  const bridgeMasses = gammaBinMasses(GAMMA_SHAPE, GAMMA_BIN_EDGES)
  const model = createInitialTinyModel(bridgeMasses)
  const initialPass = evaluateTinyModel(model, bridgeMasses)

  const attention: AttentionObject = {
    id: ATTENTION_ID,
    kind: 'attention',
    model,
    bridgeMasses,
    temperature: 1,
    bounds: { x: 1345, y: 120, width: 810, height: 470 },
    rotation: 0,
    author: 'agent',
    opacity: 1,
  }
  const training: TrainingObject = {
    id: TRAINING_ID,
    kind: 'training',
    model: createInitialTinyModel(bridgeMasses),
    linkedAttentionId: attention.id,
    step: 0,
    lossHistory: [initialPass.loss],
    probabilityHistory: [initialPass.targetProbability],
    learningRate: 0,
    bounds: { x: 2445, y: 120, width: 810, height: 470 },
    rotation: 0,
    author: 'human',
    opacity: 1,
  }
  const barycentric: BarycentricObject = {
    id: BARYCENTRIC_ID,
    kind: 'barycentric',
    vertices: [{ x: 90, y: 320 }, { x: 470, y: 320 }, { x: 300, y: 48 }],
    labels: ['A', 'B', 'C'],
    weights: initialPass.attentionWeights,
    linkedAttentionId: attention.id,
    bounds: { x: -825, y: 830, width: 750, height: 440 },
    rotation: 0,
    author: 'agent',
    opacity: 1,
  }
  const similarity: GeometryObject = {
    id: GEOMETRY_ID,
    kind: 'geometry',
    accent: '#7c5cff',
    bounds: { x: 250, y: 826, width: 800, height: 400 },
    rotation: 0,
    author: 'agent',
    opacity: 1,
    primitives: [
      { kind: 'point', id: 'O', at: { x: 330, y: 250 }, label: 'O', draggable: true },
      { kind: 'point', id: 'A', at: { x: 90, y: 340 }, label: 'A', draggable: true },
      { kind: 'point', id: 'B', at: { x: 520, y: 356 }, label: 'B', draggable: true },
      { kind: 'point', id: 'C', at: { x: 250, y: 74 }, label: 'C', draggable: true },
      { kind: 'point', id: 'Z', at: SPIRAL_CENTER, hidden: true },
      { kind: 'polygon', id: 'triangle-ABC', points: ['A', 'B', 'C'] },
      { kind: 'segment', id: 'ray-OA', from: 'O', to: 'A' },
      { kind: 'segment', id: 'ray-OB', from: 'O', to: 'B' },
      { kind: 'segment', id: 'ray-OC', from: 'O', to: 'C' },
      { kind: 'homothety', id: 'H-A', center: 'O', source: 'A', factor: HOMOTHETY_FACTOR, label: 'Aₕ' },
      { kind: 'homothety', id: 'H-B', center: 'O', source: 'B', factor: HOMOTHETY_FACTOR, label: 'Bₕ' },
      { kind: 'homothety', id: 'H-C', center: 'O', source: 'C', factor: HOMOTHETY_FACTOR, label: 'Cₕ' },
      { kind: 'polygon', id: 'homothetic-triangle', points: ['H-A', 'H-B', 'H-C'] },
      // Both circles pass through O, so the homothety maps one onto the other
      // and they are tangent at its centre.
      { kind: 'circle', id: 'circle-A', center: 'A', through: 'O' },
      { kind: 'circle', id: 'circle-Ah', center: 'H-A', through: 'O' },
      { kind: 'similarity', id: 'S-A', center: 'Z', source: 'A', factor: SPIRAL_FACTOR, angle: SPIRAL_ANGLE, label: 'A′' },
      { kind: 'similarity', id: 'S-B', center: 'Z', source: 'B', factor: SPIRAL_FACTOR, angle: SPIRAL_ANGLE, label: 'B′' },
      { kind: 'similarity', id: 'S-C', center: 'Z', source: 'C', factor: SPIRAL_FACTOR, angle: SPIRAL_ANGLE, label: 'C′' },
      { kind: 'polygon', id: 'spiral-triangle', points: ['S-A', 'S-B', 'S-C'] },
    ],
  }
  const simplex: SimplexObject = {
    id: SIMPLEX_ID,
    kind: 'simplex',
    weights: [bridgeMasses[0] * 0.82, bridgeMasses[1] * 0.82, bridgeMasses[2] * 0.82, 0.18],
    rotationX: -0.32,
    rotationY: 0.49,
    section: 0.46,
    denominator: 5,
    showLattice: true,
    bounds: { x: 1345, y: 830, width: 810, height: 440 },
    rotation: 0,
    author: 'agent',
    opacity: 1,
  }
  const numberTheory: NumberTheoryObject = {
    id: NUMBER_THEORY_ID,
    kind: 'numberTheory',
    selectedN: 9,
    maxN: 24,
    finiteCutoff: 14,
    linkedSimplexId: simplex.id,
    revealTheorem: false,
    bounds: { x: 2445, y: 830, width: 810, height: 440 },
    rotation: 0,
    author: 'agent',
    opacity: 1,
  }

  const objects: WorldObject[] = [
    // The reconstructed equation is created by the approved reconstruction,
    // never pre-seeded: a draft may only propose ids the world does not hold.
    frame(OPENING_FRAME_ID, 'Gamma Function · Gamma Recurrence', [
      'opening_prompt', OPENING_ATTEMPT_ID, SOURCE_IMAGE_ID,
    ], -860, 70, 820, 650),
    {
      id: 'opening_prompt',
      kind: 'text',
      text: 'Don’t finish it. Mark the exact place my reasoning breaks.',
      color: '#171713',
      fontSize: 20,
      bounds: { x: -815, y: 112, width: 700, height: 44 },
      rotation: 0,
      author: 'human',
      opacity: 1,
    },
    {
      id: OPENING_ATTEMPT_ID,
      kind: 'text',
      text: 'Γ(9/2) = ∫₀∞ x⁷ᐟ²e⁻ˣ dx = [−x⁷ᐟ²e⁻ˣ]₀∞ − (7/2)Γ(7/2)',
      color: '#171713',
      fontSize: 29,
      presentation: 'handwritten',
      bounds: { x: -815, y: 235, width: 700, height: 155 },
      rotation: -1.2,
      author: 'human',
      opacity: 1,
    },
    {
      id: SOURCE_IMAGE_ID,
      kind: 'image',
      src: 'handwriting://opening-attempt',
      alt: 'Captured handwritten Gamma recurrence',
      bounds: { x: -815, y: 552, width: 200, height: 140 },
      rotation: -1.2,
      author: 'human',
      opacity: 1,
    },

    frame('gamma_probability_frame', 'Gamma Function · Gamma Density', [
      'eq_integrand', HERO_GRAPH_ID, 'gamma_bridge_equation',
    ], 220, 70, 860, 550),
    {
      id: 'eq_integrand',
      kind: 'equation',
      latex: 'g_a(x)=\\frac{x^{a-1}e^{-x}}{\\Gamma(a)},\\qquad\\int_0^\\infty g_a(x)\\,dx=1',
      color: '#171713',
      bounds: { x: 270, y: 116, width: 760, height: 64 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: HERO_GRAPH_ID,
      kind: 'graph',
      equationId: 'eq_integrand',
      xDomain: [0, 16],
      yDomain: [0, 0.26],
      color: '#7c5cff',
      parameters: { a: GAMMA_SHAPE, b: GAMMA_BOUND },
      showTangentAt: GAMMA_SHAPE - 1,
      shadeIntegral: [0, GAMMA_BOUND],
      visualization: 'gamma-density',
      binEdges: GAMMA_BIN_EDGES,
      bounds: { x: 255, y: 188, width: 790, height: 384 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'gamma_bridge_equation',
      kind: 'equation',
      latex: 'w_j=\\int_{b_{j-1}}^{b_j}g_a(x)\\,dx,\\qquad \\ell_j=\\log w_j,\\qquad \\operatorname{softmax}(\\ell)_j=w_j',
      color: '#7c5cff',
      bounds: { x: 290, y: 578, width: 720, height: 36 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },

    frame('attention_geometry_frame', 'Tiny Transformer · Attention', [
      attention.id, 'attention_bridge_label',
    ], 1320, 70, 860, 550),
    {
      id: 'attention_bridge_label',
      kind: 'text',
      text: 'One head, two-dimensional embeddings. Every value on this card is recomputed from the matrices you edit.',
      color: '#7c5cff',
      fontSize: 13,
      bounds: { x: 1360, y: 596, width: 780, height: 20 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    attention,

    frame('train_from_scratch_frame', 'Tiny Transformer · Gradient Step', [
      training.id, 'training_truth_label',
    ], 2420, 70, 860, 550),
    {
      id: 'training_truth_label',
      kind: 'text',
      text: 'A tiny transformer training step: one numerical gradient on the visible parameters, never frontier-model training.',
      color: '#7c5cff',
      fontSize: 13,
      bounds: { x: 2460, y: 596, width: 780, height: 20 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    training,

    frame('attention_barycentrics_frame', 'Olympiad Geometry · Barycentric Coordinates', [
      barycentric.id, 'barycentric_equation',
    ], -860, 750, 820, 550),
    {
      id: 'barycentric_equation',
      kind: 'equation',
      latex: 'P=\\alpha A+\\beta B+\\gamma C,\\qquad \\alpha+\\beta+\\gamma=1',
      color: '#171713',
      bounds: { x: -760, y: 772, width: 620, height: 50 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    barycentric,

    frame('spiral_similarity_frame', 'Olympiad Geometry · Spiral Similarity', [
      similarity.id, 'geometry_ratio', 'geometry_prompt', 'geometry_hint',
    ], 220, 750, 860, 550),
    {
      id: 'geometry_prompt',
      kind: 'text',
      text: 'Two circles tangent at O. Drag A.',
      color: '#171713',
      fontSize: 19,
      bounds: { x: 300, y: 774, width: 330, height: 36 },
      rotation: 0,
      author: 'human',
      opacity: 1,
    },
    {
      id: 'geometry_ratio',
      kind: 'equation',
      latex: '\\frac{OA_h}{OA}=\\frac{OB_h}{OB}=\\frac{OC_h}{OC}=0.58',
      color: '#171713',
      bounds: { x: 640, y: 768, width: 410, height: 48 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    {
      id: 'geometry_hint',
      kind: 'text',
      text: 'Drag A, B, C or O. Mapped points, tangent circles, ratios and equal angles recompute.',
      color: '#817d73',
      fontSize: 13,
      bounds: { x: 300, y: 1234, width: 740, height: 22 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    similarity,

    frame('tetrahedral_probability_frame', 'Simplex and Partitions · Simplex', [
      simplex.id, 'simplex_equation',
    ], 1320, 750, 860, 550),
    {
      id: 'simplex_equation',
      kind: 'equation',
      latex: 'P=\\alpha A+\\beta B+\\gamma C+\\delta D,\\qquad \\alpha+\\beta+\\gamma+\\delta=1',
      color: '#171713',
      bounds: { x: 1400, y: 772, width: 700, height: 50 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    simplex,

    frame('partition_observatory_frame', 'Simplex and Partitions · Integer Partitions', [
      numberTheory.id, 'partition_equation',
    ], 2420, 750, 860, 550),
    {
      id: 'partition_equation',
      kind: 'equation',
      latex: 'P(q)=\\prod_{m\\ge1}(1-q^m)^{-1}=\\sum_{n\\ge0}p(n)\\,q^n',
      color: '#171713',
      bounds: { x: 2520, y: 770, width: 660, height: 52 },
      rotation: 0,
      author: 'agent',
      opacity: 1,
    },
    numberTheory,
  ]

  const world: WorldState = {
    version: 2,
    title: 'Mathburst',
    objects: Object.fromEntries(objects.map((object) => [object.id, object])),
    entities: {},
    bindings: {},
    timelines: {},
    order: objects.map((object) => object.id),
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
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

  // Keep fresh canonical worlds on the same semantic path as persisted v1/v2
  // worlds. The migration is pure and deterministic, so every seed gets the
  // same entity and binding IDs without introducing a seed/migration cycle.
  const migrated = migrateWorld(world)
  if (!migrated) throw new Error('The canonical Mathburst seed could not be migrated.')
  return migrated
}
