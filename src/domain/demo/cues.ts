import { evaluateTinyModel, createInitialTinyModel, trainOneStep } from '../math/transformer'
import { setSimplexWeight } from '../math/simplex'
import { handwritingSampleToInk, handwritingStrokeWorldBox, type HandwritingSample } from '../world/handwriting'
import type { ProjectId } from '../world/projects'
import { approveReconstruction } from '../world/reconstruction'
import {
  ATTENTION_ID,
  BARYCENTRIC_ID,
  GAMMA_BIN_EDGES,
  GAMMA_BOUND,
  GAMMA_SHAPE,
  GEOMETRY_ID,
  HERO_EQUATION_ID,
  HERO_GRAPH_ID,
  NUMBER_THEORY_ID,
  OPENING_ATTEMPT_ID,
  OPENING_CORRECTION_ID,
  OPENING_FRAME_ID,
  RECON_RECURRENCE_ID,
  RECON_WORK_ID,
  SIMPLEX_ID,
  SOURCE_IMAGE_ID,
  SPIRAL_ANGLE,
  SPIRAL_FACTOR,
  TRAINING_ID,
} from '../world/seed'
import type {
  AttentionObject,
  BarycentricObject,
  Bounds,
  GraphObject,
  NumberTheoryObject,
  SimplexObject,
  TrainingObject,
  WorldAction,
  WorldObject,
  WorldState,
} from '../world/types'
import type { DemoCueId } from './shotContract'

/**
 * One step of a cue. Tool steps go through the real WebMCP tool objects (so
 * they produce traces, Tutor attribution, and undoable commits); human steps
 * go through the ordinary learner reducer path.
 */
export type CueStep =
  | { kind: 'tool'; name: string; input: unknown }
  | { kind: 'human'; action: WorldAction }
  | { kind: 'pause'; ms: number }

/** Steps are resolved lazily against the world as it exists when they run. */
export type CueThunk = (world: WorldState) => CueStep | null

export type PreparedCue = {
  steps: CueThunk[]
  selectIds?: string[]
}

export type CueContext = {
  samples: Record<string, HandwritingSample>
  activeProject: ProjectId | null
}

/** Ids of the exact Tutor marks created by the opening annotation commit. */
export const TUTOR_MARK_IDS = [
  'opening_annotation_circle',
  'opening_annotation_strike',
  'opening_annotation_question',
] as const

/** Stroke index of the wrong minus inside the captured `opening-attempt` sample. */
const WRONG_MINUS_STROKE = 42

const TUTOR_NOTE_TEXT = 'v = −e⁻ˣ. Two negatives.'
const APPROXIMATELY = (left: number, right: number, epsilon = 1e-9) => Math.abs(left - right) < epsilon

const humanAction = (summary: string, operations: WorldAction['operations']): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations,
})

const tool = (name: string, input: unknown): CueStep => ({ kind: 'tool', name, input })
const human = (summary: string, operations: WorldAction['operations']): CueStep => ({ kind: 'human', action: humanAction(summary, operations) })
const pause = (ms: number): CueStep => ({ kind: 'pause', ms })
const constant = (step: CueStep): CueThunk => () => step

const objectOf = <K extends WorldObject['kind']>(world: WorldState, id: string, kind: K): Extract<WorldObject, { kind: K }> | null => {
  const object = world.objects[id]
  return object?.kind === kind ? object as Extract<WorldObject, { kind: K }> : null
}

const sameJson = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)

// ---------------------------------------------------------------------------
// Shot 1–3 · the Gamma opening
// ---------------------------------------------------------------------------

/** The three Tutor marks, positioned from the captured stroke of the wrong minus. */
export function buildOpeningMarks(world: WorldState, samples: Record<string, HandwritingSample>): WorldObject[] {
  const attempt = world.objects[OPENING_ATTEMPT_ID]
  const strokeBox: Bounds | null = attempt
    ? handwritingStrokeWorldBox(samples, 'opening-attempt', WRONG_MINUS_STROKE, { bounds: attempt.bounds, rotation: attempt.rotation })
    : null
  const centre = strokeBox
    ? { x: strokeBox.x + strokeBox.width / 2, y: strokeBox.y + strokeBox.height / 2 }
    : { x: -439, y: 352 }

  const circle: WorldObject = {
    id: 'opening_annotation_circle', kind: 'ink',
    points: [
      { x: 4, y: 27 }, { x: 10, y: 10 }, { x: 28, y: 3 }, { x: 48, y: 7 },
      { x: 58, y: 21 }, { x: 57, y: 38 }, { x: 44, y: 50 }, { x: 24, y: 52 },
      { x: 8, y: 43 }, { x: 4, y: 27 },
    ],
    color: '#7c5cff', width: 4,
    bounds: { x: centre.x - 31, y: centre.y - 28, width: 62, height: 56 },
    rotation: -3, author: 'agent', opacity: 1,
  }
  const strike: WorldObject = {
    id: 'opening_annotation_strike', kind: 'ink',
    points: [{ x: 0, y: 8 }, { x: 18, y: 6 }, { x: 37, y: 7 }, { x: 57, y: 3 }],
    color: '#7c5cff', width: 5,
    bounds: { x: centre.x - 30, y: centre.y + 30, width: 62, height: 14 },
    rotation: -4, author: 'agent', opacity: 1,
  }
  const noteBounds: Bounds = { x: -815, y: 396, width: 360, height: 58 }
  const note: WorldObject = handwritingSampleToInk(samples, 'tutor-note', {
    id: 'opening_annotation_question',
    bounds: noteBounds,
    color: '#7c5cff',
    width: 7.5,
    rotation: -1.6,
    author: 'agent',
    opacity: 1,
  }) ?? {
    id: 'opening_annotation_question', kind: 'text', text: TUTOR_NOTE_TEXT, color: '#7c5cff', fontSize: 23,
    presentation: 'handwritten', bounds: noteBounds, rotation: -1.6, author: 'agent', opacity: 1,
  }
  return [circle, strike, note]
}

const openingTutorSteps = (samples: Record<string, HandwritingSample>): CueThunk[] => [
  (world) => world.objects.opening_annotation_question ? null : tool('get_selection', {}),
  (world) => world.objects.opening_annotation_question ? null : tool('get_objects', { ids: [OPENING_ATTEMPT_ID] }),
  (world) => world.objects.opening_annotation_question ? null : tool('create_objects', {
    summary: 'Tutor marked the sign lost in integration by parts',
    objects: buildOpeningMarks(world, samples),
  }),
]

/** The learner's graphite correction: `+ (7/2)Γ(7/2)` and the full unfolding to 105√π/16. */
export function buildOpeningCorrection(world: WorldState, samples: Record<string, HandwritingSample>): WorldObject | null {
  const attempt = world.objects[OPENING_ATTEMPT_ID]
  if (!attempt) return null
  const captured = handwritingSampleToInk(samples, 'opening-correction', {
    id: OPENING_CORRECTION_ID,
    bounds: { x: -613, y: 402, width: 460, height: 125 },
    color: '#171713',
    width: 7.5,
    rotation: -0.8,
    author: 'human',
    opacity: 1,
  })
  if (captured) return captured
  return {
    id: OPENING_CORRECTION_ID, kind: 'text',
    text: '+ (7/2)Γ(7/2)\n= (7/2)(5/2)(3/2)(1/2)√π = 105√π/16',
    color: '#171713', fontSize: 26, presentation: 'handwritten',
    bounds: { x: -613, y: 402, width: 460, height: 125 }, rotation: -0.8, author: 'human', opacity: 1,
  }
}

const correctionStep = (samples: Record<string, HandwritingSample>): CueThunk => (world) => {
  if (world.objects[OPENING_CORRECTION_ID]) return null
  const correction = buildOpeningCorrection(world, samples)
  if (!correction) return null
  const frame = objectOf(world, OPENING_FRAME_ID, 'frame')
  return human('Corrected the Gamma recurrence sign', [
    { type: 'put', object: correction },
    ...(frame && !frame.childIds.includes(OPENING_CORRECTION_ID)
      ? [{ type: 'put' as const, object: { ...frame, childIds: [...frame.childIds, OPENING_CORRECTION_ID] } }]
      : []),
    { type: 'select', ids: [OPENING_CORRECTION_ID] },
  ])
}

// ---------------------------------------------------------------------------
// Shot 4 · reconstruction states
// ---------------------------------------------------------------------------

/** Proposed semantic objects for the photographed plate, before and after the audit. */
export function reconstructionObjects(audited: boolean): WorldObject[] {
  const uncertain = audited ? '#171713' : '#7c5cff'
  return [
    {
      id: HERO_EQUATION_ID, kind: 'equation',
      latex: '\\Gamma\\!\\left(\\tfrac92\\right)=\\int_0^{\\infty}x^{7/2}e^{-x}\\,dx=\\tfrac72\\,\\Gamma\\!\\left(\\tfrac72\\right)',
      color: '#171713', bounds: { x: -590, y: 548, width: 500, height: 62 }, rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: RECON_RECURRENCE_ID, kind: 'equation',
      latex: audited
        ? '\\Gamma(\\alpha+1)=\\int_0^{\\infty}x^{\\alpha}e^{-x}\\,dx=\\alpha\\,\\Gamma(\\alpha)'
        : '\\Gamma(\\alpha+1)=\\int_0^{\\,\\square}x^{\\alpha}e^{-x}\\,dx=\\alpha\\,\\Gamma(\\alpha)',
      color: uncertain, bounds: { x: -590, y: 612, width: 500, height: 52 }, rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: RECON_WORK_ID, kind: 'equation',
      latex: audited
        ? '=\\tfrac72\\cdot\\tfrac52\\cdot\\tfrac32\\cdot\\tfrac12\\sqrt{\\pi}=\\tfrac{105\\sqrt{\\pi}}{16}'
        : '=\\tfrac72\\cdot\\tfrac{s}{2}\\cdot\\tfrac32\\cdot\\tfrac12\\sqrt{\\pi}\\;?',
      color: uncertain, bounds: { x: -590, y: 664, width: 500, height: 52 }, rotation: 0, author: 'agent', opacity: 1,
    },
  ]
}

export const RECONSTRUCTION_UNCERTAIN_IDS = [RECON_RECURRENCE_ID, RECON_WORK_ID]
export const RECONSTRUCTION_AUDIT_SUMMARY = 'Upper bound confirmed as ∞ from the source stroke. The glyph after 7/2 is 5, not s. Sign audited against the corrected line.'

const reconstructionSteps: CueThunk[] = [
  (world) => world.session.reconstructionStatus === 'source' && !world.reconstruction
    ? tool('reconstruct_problem', { sourceImageId: SOURCE_IMAGE_ID, proposedObjects: reconstructionObjects(false), uncertainObjectIds: RECONSTRUCTION_UNCERTAIN_IDS })
    : null,
  (world) => world.reconstruction && world.session.reconstructionStatus === 'draft'
    ? tool('audit_reconstruction', { auditSummary: RECONSTRUCTION_AUDIT_SUMMARY, proposedObjects: reconstructionObjects(true), uncertainObjectIds: [] })
    : null,
  (world) => world.reconstruction && world.session.reconstructionStatus === 'audited'
    ? { kind: 'human', action: approveReconstruction(world) }
    : null,
]

// ---------------------------------------------------------------------------
// Shot 5 · Gamma density
// ---------------------------------------------------------------------------

const gammaRestState = (graph: GraphObject): GraphObject => ({
  ...graph,
  parameters: { ...graph.parameters, a: GAMMA_SHAPE, b: GAMMA_BOUND },
  shadeIntegral: [0, GAMMA_BOUND],
  showTangentAt: GAMMA_SHAPE - 1,
  binEdges: GAMMA_BIN_EDGES,
})

const gammaAreaStep: CueThunk = (world) => {
  const graph = objectOf(world, HERO_GRAPH_ID, 'graph')
  if (!graph) return null
  const rest = gammaRestState(graph)
  if (sameJson(graph, rest)) return null
  return human('Returned the density to its approved frame', [{ type: 'put', object: rest }, { type: 'select', ids: [graph.id] }])
}

const GAMMA_TUTOR_SHAPE = 5.5
const gammaTutorShapeSteps: CueThunk[] = [
  (world) => {
    const graph = objectOf(world, HERO_GRAPH_ID, 'graph')
    return graph && !APPROXIMATELY(graph.parameters?.a ?? 0, GAMMA_TUTOR_SHAPE) ? tool('inspect_math', { objectId: HERO_GRAPH_ID }) : null
  },
  (world) => {
    const graph = objectOf(world, HERO_GRAPH_ID, 'graph')
    if (!graph || APPROXIMATELY(graph.parameters?.a ?? 0, GAMMA_TUTOR_SHAPE)) return null
    return tool('update_objects', {
      summary: `Tutor raised the shape a to ${GAMMA_TUTOR_SHAPE}`,
      updates: [{ id: HERO_GRAPH_ID, patch: { parameters: { ...graph.parameters, a: GAMMA_TUTOR_SHAPE }, showTangentAt: GAMMA_TUTOR_SHAPE - 1 } }],
    })
  },
]

// ---------------------------------------------------------------------------
// Shots 6–7 · attention and training
// ---------------------------------------------------------------------------

const modelResetStep = (summary: string): CueThunk => (world) => {
  const attention = objectOf(world, ATTENTION_ID, 'attention')
  const training = objectOf(world, TRAINING_ID, 'training')
  if (!attention) return null
  const model = createInitialTinyModel(attention.bridgeMasses)
  const pass = evaluateTinyModel(model, attention.bridgeMasses, attention.temperature)
  const nextAttention: AttentionObject = { ...attention, model }
  const nextTraining: TrainingObject | null = training
    ? { ...training, model: structuredClone(model), step: 0, lossHistory: [pass.loss], probabilityHistory: [pass.targetProbability], learningRate: 0 }
    : null
  const alreadyAtRest = sameJson(attention.model, model) && (!training || (training.step === 0 && sameJson(training.model, model)))
  if (alreadyAtRest) return null
  return human(summary, [
    { type: 'put', object: nextAttention },
    ...(nextTraining ? [{ type: 'put' as const, object: nextTraining }] : []),
  ])
}

const trainingHumanStep: CueThunk = (world) => {
  const training = objectOf(world, TRAINING_ID, 'training')
  const attention = objectOf(world, ATTENTION_ID, 'attention')
  if (!training) return null
  const result = trainOneStep(training.model, attention?.bridgeMasses, attention?.temperature ?? 1)
  if (!result.accepted) return null
  const next: TrainingObject = {
    ...training, model: result.state, step: training.step + 1,
    lossHistory: [...training.lossHistory, result.lossAfter],
    probabilityHistory: [...training.probabilityHistory, result.targetProbabilityAfter],
    learningRate: result.learningRate,
  }
  return human(`Trained tiny model step ${training.step + 1}`, [
    { type: 'put', object: next },
    ...(attention ? [{ type: 'put' as const, object: { ...attention, model: result.state } }] : []),
  ])
}

const trainingTutorSteps: CueThunk[] = [
  (world) => objectOf(world, TRAINING_ID, 'training') ? tool('inspect_math', { objectId: TRAINING_ID }) : null,
  (world) => {
    const training = objectOf(world, TRAINING_ID, 'training')
    const attention = objectOf(world, ATTENTION_ID, 'attention')
    if (!training) return null
    const result = trainOneStep(training.model, attention?.bridgeMasses, attention?.temperature ?? 1)
    // Never show a lying step: if the deterministic search cannot lower the loss, do nothing.
    if (!result.accepted) return null
    return tool('update_objects', {
      summary: `Tutor applied gradient step ${training.step + 1}`,
      updates: [
        {
          id: TRAINING_ID,
          patch: {
            model: result.state, step: training.step + 1,
            lossHistory: [...training.lossHistory, result.lossAfter],
            probabilityHistory: [...training.probabilityHistory, result.targetProbabilityAfter],
            learningRate: result.learningRate,
          },
        },
        ...(attention ? [{ id: ATTENTION_ID, patch: { model: result.state } }] : []),
      ],
    })
  },
]

// ---------------------------------------------------------------------------
// Shots 8–9 · barycentrics and spiral similarity
// ---------------------------------------------------------------------------

const barycentricLinkStep: CueThunk = (world) => {
  const barycentric = objectOf(world, BARYCENTRIC_ID, 'barycentric')
  const attention = objectOf(world, barycentric?.linkedAttentionId ?? ATTENTION_ID, 'attention')
  if (!barycentric || !attention) return null
  const weights = evaluateTinyModel(attention.model, attention.bridgeMasses, attention.temperature).attentionWeights
  if (barycentric.weights.every((weight, index) => APPROXIMATELY(weight, weights[index], 1e-6))) return null
  const next: BarycentricObject = { ...barycentric, weights }
  return human('Copied the live attention weights into the triangle', [{ type: 'put', object: next }, { type: 'select', ids: [next.id] }])
}

const centroidSteps: CueThunk[] = [
  (world) => {
    const barycentric = objectOf(world, BARYCENTRIC_ID, 'barycentric')
    return barycentric && !barycentric.weights.every((weight) => APPROXIMATELY(weight, 1 / 3, 1e-6)) ? tool('inspect_math', { objectId: BARYCENTRIC_ID }) : null
  },
  (world) => {
    const barycentric = objectOf(world, BARYCENTRIC_ID, 'barycentric')
    if (!barycentric || barycentric.weights.every((weight) => APPROXIMATELY(weight, 1 / 3, 1e-6))) return null
    return tool('update_objects', {
      summary: 'Tutor moved P to the centroid [1:1:1]',
      updates: [{ id: BARYCENTRIC_ID, patch: { weights: [1 / 3, 1 / 3, 1 / 3] } }],
    })
  },
]

export const SPIRAL_EQUATION_ID = 'geometry_spiral_equation'

const spiralConstructSteps: CueThunk[] = [
  (world) => {
    const geometry = objectOf(world, GEOMETRY_ID, 'geometry')
    return geometry && !geometry.primitives.some((primitive) => primitive.id === 'S') ? tool('inspect_math', { objectId: GEOMETRY_ID }) : null
  },
  (world) => {
    const geometry = objectOf(world, GEOMETRY_ID, 'geometry')
    if (!geometry || geometry.primitives.some((primitive) => primitive.id === 'S')) return null
    return tool('construct_geometry', {
      objectId: GEOMETRY_ID,
      summary: 'Tutor constructed the spiral-similarity centre and its equal angles',
      primitives: [
        { kind: 'spiralCenter', id: 'S', a: 'A', b: 'B', a2: 'S-A', b2: 'S-B', label: 'S' },
        { kind: 'segment', id: 'spiral-ray-A', from: 'S', to: 'A' },
        { kind: 'segment', id: 'spiral-ray-A2', from: 'S', to: 'S-A' },
        { kind: 'segment', id: 'spiral-ray-B', from: 'S', to: 'B' },
        { kind: 'segment', id: 'spiral-ray-B2', from: 'S', to: 'S-B' },
        { kind: 'angle', id: 'spiral-angle-A', a: 'A', vertex: 'S', b: 'S-A' },
        { kind: 'angle', id: 'spiral-angle-B', a: 'B', vertex: 'S', b: 'S-B' },
      ],
    })
  },
  (world) => world.objects[SPIRAL_EQUATION_ID] ? null : tool('create_objects', {
    summary: 'Tutor wrote the spiral-similarity invariant',
    objects: [{
      id: SPIRAL_EQUATION_ID, kind: 'equation',
      latex: `\\frac{SA'}{SA}=\\frac{SB'}{SB}=${SPIRAL_FACTOR},\\qquad \\angle ASA'=\\angle BSB'=${SPIRAL_ANGLE}^\\circ`,
      color: '#7c5cff', bounds: { x: 560, y: 1256, width: 490, height: 38 }, rotation: 0, author: 'agent', opacity: 1,
    }],
  }),
]

// ---------------------------------------------------------------------------
// Shots 10–11 · simplex and partitions
// ---------------------------------------------------------------------------

const SIMPLEX_REST: Pick<SimplexObject, 'section' | 'denominator' | 'showLattice'> = { section: 0.46, denominator: 5, showLattice: true }
const SIMPLEX_TUTOR_DELTA = 0.34

const simplexRestStep: CueThunk = (world) => {
  const simplex = objectOf(world, SIMPLEX_ID, 'simplex')
  if (!simplex) return null
  const rest: SimplexObject = { ...simplex, ...SIMPLEX_REST }
  if (sameJson(simplex, rest)) return null
  return human('Returned the simplex to its approved frame', [{ type: 'put', object: rest }, { type: 'select', ids: [simplex.id] }])
}

const simplexTutorSteps: CueThunk[] = [
  (world) => {
    const simplex = objectOf(world, SIMPLEX_ID, 'simplex')
    return simplex && !APPROXIMATELY(simplex.weights[3], SIMPLEX_TUTOR_DELTA, 1e-6) ? tool('inspect_math', { objectId: SIMPLEX_ID }) : null
  },
  (world) => {
    const simplex = objectOf(world, SIMPLEX_ID, 'simplex')
    if (!simplex || APPROXIMATELY(simplex.weights[3], SIMPLEX_TUTOR_DELTA, 1e-6)) return null
    return tool('update_objects', {
      summary: `Tutor set δ to ${SIMPLEX_TUTOR_DELTA}; α, β, γ keep their ratios`,
      updates: [{ id: SIMPLEX_ID, patch: { weights: setSimplexWeight(simplex.weights, 3, SIMPLEX_TUTOR_DELTA), section: SIMPLEX_TUTOR_DELTA } }],
    })
  },
]

const PARTITION_REST: Pick<NumberTheoryObject, 'selectedN' | 'finiteCutoff' | 'revealTheorem'> = { selectedN: 9, finiteCutoff: 14, revealTheorem: false }
const PARTITION_REVEAL_N = 14

const partitionRestStep: CueThunk = (world) => {
  const observatory = objectOf(world, NUMBER_THEORY_ID, 'numberTheory')
  if (!observatory) return null
  const rest: NumberTheoryObject = { ...observatory, ...PARTITION_REST }
  if (sameJson(observatory, rest)) return null
  return human('Returned the observatory to its approved frame', [{ type: 'put', object: rest }, { type: 'select', ids: [observatory.id] }])
}

const partitionRevealSteps: CueThunk[] = [
  (world) => {
    const observatory = objectOf(world, NUMBER_THEORY_ID, 'numberTheory')
    return observatory && !observatory.revealTheorem ? tool('inspect_math', { objectId: NUMBER_THEORY_ID }) : null
  },
  (world) => {
    const observatory = objectOf(world, NUMBER_THEORY_ID, 'numberTheory')
    if (!observatory || observatory.revealTheorem) return null
    return tool('update_objects', {
      summary: 'Tutor revealed the verified p(5n+4) lane',
      updates: [{ id: NUMBER_THEORY_ID, patch: { selectedN: PARTITION_REVEAL_N, finiteCutoff: Math.max(observatory.finiteCutoff, PARTITION_REVEAL_N), revealTheorem: true } }],
    })
  },
]

// ---------------------------------------------------------------------------
// Shot 12 · WebMCP crescendo
// ---------------------------------------------------------------------------

const HERO_BY_PROJECT: Record<ProjectId, string> = {
  'gamma-lab': HERO_GRAPH_ID,
  'tiny-transformer': ATTENTION_ID,
  'olympiad-geometry': BARYCENTRIC_ID,
  'simplex-ramanujan': SIMPLEX_ID,
}

const CRESCENDO_NOTE_ID = 'crescendo_note'

function crescendoSteps(activeProject: ProjectId | null): CueThunk[] {
  const heroId = activeProject ? HERO_BY_PROJECT[activeProject] : HERO_GRAPH_ID
  const noteBounds = (world: WorldState): Bounds => {
    const hero = world.objects[heroId]
    return hero
      ? { x: hero.bounds.x + hero.bounds.width - 330, y: hero.bounds.y - 48, width: 330, height: 40 }
      : { x: 300, y: 40, width: 330, height: 40 }
  }
  const proofBounds = (world: WorldState, index: number): Bounds => {
    const hero = world.objects[heroId]
    const base = hero ? { x: hero.bounds.x + 40 + index * 250, y: hero.bounds.y + hero.bounds.height - 200 } : { x: 300 + index * 250, y: 300 }
    return { x: base.x, y: base.y, width: 220, height: 160 }
  }
  const hasHero = (world: WorldState) => Boolean(world.objects[heroId])
  return [
    constant(tool('get_world', { includeObjects: false })),
    (world) => hasHero(world) ? tool('get_objects', { ids: [heroId] }) : null,
    constant(tool('get_selection', {})),
    constant(tool('get_session_context', {})),
    (world) => hasHero(world) ? tool('inspect_math', { objectId: heroId }) : null,
    constant(tool('get_history', { limit: 6 })),
    (world) => world.objects[CRESCENDO_NOTE_ID] ? null : tool('create_objects', {
      summary: 'Tutor wrote a note beside the live object',
      objects: [{
        id: CRESCENDO_NOTE_ID, kind: 'text', text: 'Every agent can enter.', color: '#7c5cff', fontSize: 22,
        presentation: 'handwritten', bounds: noteBounds(world), rotation: -1.4, author: 'agent', opacity: 1,
      }],
    }),
    (world) => world.objects[CRESCENDO_NOTE_ID] ? tool('update_objects', {
      summary: 'Tutor rewrote the note',
      updates: [{ id: CRESCENDO_NOTE_ID, patch: { text: 'One mathematical world.' } }],
    }) : null,
    (world) => world.objects[CRESCENDO_NOTE_ID] ? tool('transform_objects', {
      summary: 'Tutor nudged the note',
      ids: [CRESCENDO_NOTE_ID], translate: { x: 0, y: -14 },
    }) : null,
    (world) => tool('set_viewport', { viewport: { ...world.viewport, zoom: Math.min(2.5, Math.max(0.25, world.viewport.zoom)) } }),
    (world) => tool('graph_expression', {
      latex: 'a\\,x\\,e^{-x}', parameters: { a: 1 }, showTangentAt: 1, shadeIntegral: [0, 2], bounds: proofBounds(world, 0),
    }),
    (world) => tool('construct_geometry', {
      bounds: proofBounds(world, 1),
      primitives: [
        { kind: 'point', id: 'A', at: { x: 30, y: 130 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 190, y: 130 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 110, y: 30 }, label: 'C', draggable: true },
        { kind: 'polygon', id: 'ABC', points: ['A', 'B', 'C'] },
        { kind: 'midpoint', id: 'M', of: ['A', 'B'], label: 'M' },
      ],
    }),
    (world) => tool('visualize_concept', { concept: 'barycentric', bounds: proofBounds(world, 2) }),
    constant(pause(420)),
    constant(tool('step_history', { direction: 'undo' })),
    constant(tool('step_history', { direction: 'undo' })),
    constant(tool('step_history', { direction: 'undo' })),
    (world) => world.objects[CRESCENDO_NOTE_ID] ? tool('delete_objects', { summary: 'Tutor removed its note', ids: [CRESCENDO_NOTE_ID] }) : null,
  ]
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function prepareDemoCue(id: DemoCueId, world: WorldState, context: CueContext): PreparedCue {
  switch (id) {
    case 'gamma-source':
      return { steps: [], selectIds: [] }
    case 'gamma-tutor':
      return { steps: openingTutorSteps(context.samples), selectIds: [...TUTOR_MARK_IDS] }
    case 'gamma-corrected':
      return { steps: [...openingTutorSteps(context.samples), correctionStep(context.samples)], selectIds: [OPENING_CORRECTION_ID] }
    case 'gamma-approved':
      return {
        steps: [...openingTutorSteps(context.samples), correctionStep(context.samples), ...reconstructionSteps],
        selectIds: [HERO_EQUATION_ID, RECON_RECURRENCE_ID, RECON_WORK_ID],
      }
    case 'gamma-area':
      return { steps: [gammaAreaStep], selectIds: [HERO_GRAPH_ID] }
    case 'gamma-tutor-shape':
      return { steps: gammaTutorShapeSteps, selectIds: [HERO_GRAPH_ID] }
    case 'attention-edit':
      return { steps: [modelResetStep('Reset the attention head to step zero')], selectIds: [ATTENTION_ID] }
    case 'training-zero':
      return { steps: [modelResetStep('Reset tiny model to step zero')], selectIds: [TRAINING_ID] }
    case 'training-human-step':
      return { steps: [trainingHumanStep], selectIds: [TRAINING_ID] }
    case 'training-tutor-step':
      return { steps: trainingTutorSteps, selectIds: [TRAINING_ID] }
    case 'barycentric-live':
      return { steps: [barycentricLinkStep], selectIds: [BARYCENTRIC_ID] }
    case 'barycentric-centroid':
      return { steps: centroidSteps, selectIds: [BARYCENTRIC_ID] }
    case 'spiral-live':
      return { steps: [], selectIds: [GEOMETRY_ID] }
    case 'spiral-construct':
      return { steps: spiralConstructSteps, selectIds: [GEOMETRY_ID] }
    case 'simplex-live':
      return { steps: [simplexRestStep], selectIds: [SIMPLEX_ID] }
    case 'simplex-tutor-weight':
      return { steps: simplexTutorSteps, selectIds: [SIMPLEX_ID] }
    case 'partition-live':
      return { steps: [partitionRestStep], selectIds: [NUMBER_THEORY_ID] }
    case 'partition-reveal':
      return { steps: partitionRevealSteps, selectIds: [NUMBER_THEORY_ID] }
    case 'webmcp-crescendo':
      return { steps: crescendoSteps(context.activeProject), selectIds: [] }
    case 'one-world':
      return { steps: [], selectIds: [] }
  }
}

/** Objects a cue is expected to leave on the board once it has run. */
export function cueRestObjectIds(id: DemoCueId): readonly string[] {
  switch (id) {
    case 'gamma-tutor': return TUTOR_MARK_IDS
    case 'gamma-corrected': return [...TUTOR_MARK_IDS, OPENING_CORRECTION_ID]
    case 'gamma-approved': return [...TUTOR_MARK_IDS, OPENING_CORRECTION_ID, HERO_EQUATION_ID, RECON_RECURRENCE_ID, RECON_WORK_ID]
    case 'spiral-construct': return [SPIRAL_EQUATION_ID]
    default: return []
  }
}
