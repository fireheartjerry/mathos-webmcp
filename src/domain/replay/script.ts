import type { ReplayScript, ReplayStep } from './types'

/**
 * The film v2 choreography (docs/video/FILM_V2_STORY.md, Act 0 → Act 8).
 * Every line is scripted; every tool call goes through the real tool object.
 * Steps that depend on something the human draws on camera are `optional`,
 * so a dry run on an empty canvas still reaches the end. Object ids created
 * by earlier steps are threaded through `$ref` and are never guessed.
 */

const PURPLE = '#7c5cff'
const GRAPHITE = '#171713'
const GAMMA_LATEX = '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)}'

const step = (entry: ReplayStep): ReplayStep => entry

const ACT_0: ReplayStep[] = [
  step({ id: 'world0', say: 'Reading the page first.', tool: 'get_world', input: { includeObjects: false } }),
  step({ tool: 'list_projects', input: {} }),
  step({ tool: 'get_scene_catalog', input: {} }),
  step({ tool: 'get_session_context', input: {}, waitMs: 600 }),
]

const ACT_1: ReplayStep[] = [
  step({ humanNote: 'The learner writes the Gamma recurrence by hand, with the sign error.' }),
  step({ id: 'ink1', say: 'Let me read what you wrote.', tool: 'get_objects', input: { kinds: ['ink'], limit: 20 } }),
  step({ tool: 'get_selection', input: {} }),
  step({ id: 'math1', tool: 'get_objects', input: { kinds: ['equation', 'graph'], limit: 5 } }),
  step({ tool: 'inspect_math', input: { objectId: { $ref: 'math1.data.objects.0.id' } }, optional: true, waitMs: 400 }),
  step({
    id: 'mark1',
    say: 'The sign flips during integration by parts. I will mark it, not fix it.',
    tool: 'create_objects',
    input: {
      summary: 'Tutor marked the sign lost in integration by parts',
      objects: [{
        id: 'replay_mark_circle', kind: 'ink',
        points: [
          { x: 4, y: 27 }, { x: 10, y: 10 }, { x: 28, y: 3 }, { x: 48, y: 7 },
          { x: 58, y: 21 }, { x: 57, y: 38 }, { x: 44, y: 50 }, { x: 24, y: 52 },
          { x: 8, y: 43 }, { x: 4, y: 27 },
        ],
        color: PURPLE, width: 4, bounds: { x: 300, y: 200, width: 62, height: 56 }, rotation: -3, author: 'agent', opacity: 1,
      }],
    },
  }),
  step({
    tool: 'annotate_object',
    input: { objectId: { $ref: 'ink1.data.objects.0.id' }, text: 'v = −e⁻ˣ. Two negatives.', presentation: 'handwritten', placement: 'below' },
    optional: true, waitMs: 500,
  }),
  step({ humanNote: 'The learner corrects the tail: + (7/2)Γ(7/2) … = 105√π/16.' }),
  step({ humanNote: 'The learner drops the photographed recurrence onto the canvas.' }),
  step({ id: 'photo1', say: 'I can turn that photo into live math. You approve it.', tool: 'get_objects', input: { kinds: ['image'], limit: 1 } }),
  step({
    tool: 'reconstruct_problem',
    input: {
      sourceImageId: { $ref: 'photo1.data.objects.0.id' },
      proposedObjects: [{
        id: 'replay_recon_recurrence', kind: 'equation',
        latex: '\\Gamma(\\alpha+1)=\\int_0^{\\infty}x^{\\alpha}e^{-x}\\,dx=\\alpha\\,\\Gamma(\\alpha)',
        color: GRAPHITE, bounds: { x: 300, y: 420, width: 500, height: 52 }, rotation: 0, author: 'agent', opacity: 1,
      }],
      uncertainObjectIds: [],
    },
    optional: true,
  }),
  step({ tool: 'audit_reconstruction', input: { auditSummary: 'Upper bound read as ∞ from the source stroke; the glyph after 7/2 is 5, not s.', uncertainObjectIds: [] }, optional: true, waitMs: 500 }),
  step({ humanNote: 'The learner approves the clean conversion, then shrinks and straightens the photo with the handles.' }),
  step({ say: 'Same controls, from my side.', tool: 'transform_objects', input: { summary: 'Tutor nudged the typeset block into alignment', ids: [{ $ref: 'photo1.data.objects.0.id' }], translate: { x: 0, y: -12 }, rotate: 0 }, optional: true, waitMs: 400 }),
]

const ACT_2: ReplayStep[] = [
  step({
    id: 'graph2',
    say: 'The corrected recurrence normalises into a density. Watch me build it.',
    tool: 'graph_expression',
    input: { latex: GAMMA_LATEX, parameters: { a: 4.5 }, shadeIntegral: [0, 4.4], visualization: 'gamma-density', binEdges: [0, 2.5, 5, 12], bounds: { x: 700, y: 150, width: 470, height: 330 } },
    waitMs: 900,
  }),
  step({ humanNote: 'The learner drags the shape to 5.5 and the bound to 4.4.' }),
  step({ tool: 'explain_object', input: { objectId: { $ref: 'graph2.changedIds.1' } } }),
  step({ tool: 'evaluate_expression', input: { latex: GAMMA_LATEX, x: [1, 2.5, 5], parameters: { a: 4.5 } } }),
  step({
    tool: 'create_objects',
    input: {
      summary: 'Tutor explained the three bins',
      objects: [{
        id: 'replay_bins_note', kind: 'text',
        text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs are the scores softmax will see.',
        color: PURPLE, fontSize: 16, presentation: 'typed', bounds: { x: 700, y: 500, width: 470, height: 60 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    waitMs: 500,
  }),
  step({ id: 'timeline2', say: 'Here is why the bins matter.', tool: 'create_timeline', input: { title: 'Bins to softmax', durationMs: 4000 }, optional: true }),
  step({
    tool: 'add_keyframes',
    input: {
      timelineId: { $ref: 'timeline2.data.timelineId' },
      objectId: { $ref: 'graph2.changedIds.1' },
      keyframes: [
        { atMs: 0, patch: { binEdges: [0, 2.5, 5, 12] } },
        { atMs: 2000, patch: { binEdges: [0, 3.5, 6, 12] } },
        { atMs: 4000, patch: { binEdges: [0, 2.5, 5, 12] } },
      ],
    },
    optional: true,
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'timeline2.data.timelineId' }, action: 'play' }, optional: true, waitMs: 1200 }),
]

const ACT_3: ReplayStep[] = [
  step({ id: 'att3', tool: 'visualize_concept', input: { concept: 'attention', bounds: { x: 1230, y: 150, width: 470, height: 330 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }] }, waitMs: 700 }),
  step({ say: 'I will raise W_Q[0][0].', tool: 'set_attention_weight', input: { objectId: { $ref: 'att3.changedIds.0' }, matrix: 'wq', row: 0, column: 0, value: 1.4 }, waitMs: 500 }),
  step({ id: 'train3', tool: 'visualize_concept', input: { concept: 'training', bounds: { x: 1230, y: 520, width: 470, height: 330 } }, optional: true }),
  step({ humanNote: 'The learner clicks train 1 step on the training card.' }),
  step({ say: 'One honest step: a numerical gradient on the visible parameters.', tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true }),
  step({ tool: 'get_history', input: { limit: 6 } }),
  step({ tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 500 }),
]

const ACT_4: ReplayStep[] = [
  step({ humanNote: 'The learner places A, B, C with the geometry toolbar and draws the triangle.' }),
  step({
    id: 'geo4',
    tool: 'construct_geometry',
    input: {
      bounds: { x: 300, y: 620, width: 430, height: 330 },
      primitives: [
        { kind: 'point', id: 'A', at: { x: 70, y: 260 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 350, y: 260 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 210, y: 65 }, label: 'C', draggable: true },
        { kind: 'polygon', id: 'ABC', points: ['A', 'B', 'C'] },
        { kind: 'midpoint', id: 'M', of: ['A', 'B'], label: 'M' },
        { kind: 'point', id: 'O', at: { x: 210, y: 200 }, label: 'O', draggable: true },
        { kind: 'homothety', id: 'A2', center: 'O', source: 'A', factor: 0.72, label: 'A′' },
        { kind: 'homothety', id: 'B2', center: 'O', source: 'B', factor: 0.72, label: 'B′' },
        { kind: 'segment', id: 'A2B2', from: 'A2', to: 'B2' },
      ],
    },
    waitMs: 700,
  }),
  step({ tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: 24, y: -18 } }, waitMs: 500 }),
  step({ id: 'bary4', tool: 'visualize_concept', input: { concept: 'barycentric', bounds: { x: 760, y: 620, width: 430, height: 330 } } }),
  step({ tool: 'set_barycentric_weights', input: { objectId: { $ref: 'bary4.changedIds.0' }, preset: 'attention' }, optional: true, waitMs: 600 }),
]

const ACT_5: ReplayStep[] = [
  step({ humanNote: 'The learner draws a polygon and an ellipse, then resizes and rotates the ellipse.' }),
  step({
    id: 'poly5',
    tool: 'create_objects',
    input: {
      summary: 'Tutor mirrored the polygon',
      objects: [{
        id: 'replay_polygon', kind: 'shape', shape: 'polygon', fill: 'rgba(124, 92, 255, 0.12)', stroke: PURPLE, strokeWidth: 2,
        points: [{ x: 0, y: 40 }, { x: 60, y: 0 }, { x: 140, y: 20 }, { x: 120, y: 110 }, { x: 30, y: 120 }],
        bounds: { x: 1230, y: 900, width: 140, height: 120 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
  }),
  step({ tool: 'transform_objects', input: { summary: 'Tutor scaled and turned its polygon', ids: ['replay_polygon'], scale: 0.8, rotate: 15 }, waitMs: 500 }),
  step({ humanNote: 'The learner drags an arrow from the density to the attention card and re-drags its head.' }),
  step({
    tool: 'create_objects',
    input: {
      summary: 'Tutor drew an arrow',
      objects: [{ id: 'replay_arrow', kind: 'arrow', from: { x: 0, y: 40 }, to: { x: 60, y: 0 }, color: PURPLE, bounds: { x: 1170, y: 300, width: 60, height: 40 }, rotation: 0, author: 'agent', opacity: 1 }],
    },
  }),
  step({ tool: 'update_objects', input: { summary: 'Tutor re-pointed the arrow tail', updates: [{ id: 'replay_arrow', patch: { from: { x: 0, y: 20 } } }] }, waitMs: 400 }),
  step({ humanNote: 'The learner highlights the softmax row.' }),
  step({
    tool: 'draw_ink',
    input: { mode: 'highlighter', color: 'rgba(124, 92, 255, 0.35)', width: 18, points: [{ x: 780, y: 690 }, { x: 1120, y: 690 }] },
    optional: true,
  }),
  step({ humanNote: 'The learner erases a stray stroke.' }),
  step({ tool: 'erase_ink', input: { ids: ['replay_mark_circle'] }, optional: true }),
  step({ tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 500 }),
]

const ACT_6: ReplayStep[] = [
  step({ id: 'simplex6', tool: 'visualize_concept', input: { concept: 'simplex', bounds: { x: 300, y: 1000, width: 470, height: 330 } } }),
  step({ tool: 'set_simplex_view', input: { objectId: { $ref: 'simplex6.changedIds.0' }, section: 0.18, denominator: 5 }, waitMs: 700 }),
  step({ id: 'parts6', tool: 'visualize_concept', input: { concept: 'partitions', bounds: { x: 800, y: 1000, width: 470, height: 330 } } }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, finiteCutoff: 19, selectedN: 14 }, waitMs: 600 }),
  step({ humanNote: 'The learner drags the cutoff slider.' }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, revealTheorem: true }, waitMs: 600 }),
]

const ACT_7: ReplayStep[] = [
  step({ humanNote: 'The learner picks Matrix, chooses 2×2 and types the cells.' }),
  step({ id: 'matrix7', tool: 'visualize_concept', input: { concept: 'matrix-transform', bounds: { x: 1300, y: 1000, width: 470, height: 330 } } }),
  step({ tool: 'set_matrix_cells', input: { objectId: { $ref: 'matrix7.changedIds.2' }, cells: [{ row: 0, column: 1, value: 0.8 }] }, optional: true }),
  step({ tool: 'update_objects', input: { summary: 'Tutor set the shear to 0.8', updates: [{ id: { $ref: 'matrix7.changedIds.2' }, patch: { values: [[1, 0.8], [0, 1]] } }] }, waitMs: 400 }),
  step({ humanNote: 'The learner double-clicks the explanation card and edits a word.' }),
  step({ tool: 'edit_text', input: { objectId: 'replay_bins_note', text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs become the scores.' }, optional: true }),
  step({ tool: 'edit_equation', input: { objectId: { $ref: 'graph2.changedIds.0' }, latex: '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)},\\quad a=4.5' }, optional: true, waitMs: 400 }),
  step({ humanNote: 'The learner draws a Frame around the whole journey and titles it.' }),
  step({ id: 'project7', tool: 'create_project', input: { title: 'Replay scratch', templateId: 'gamma-lab' }, optional: true }),
  step({ tool: 'open_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true }),
  step({ tool: 'open_scene', input: { scene: 'gamma-clinic' }, optional: true, waitMs: 700 }),
  step({ tool: 'open_project', input: { projectId: { $ref: 'world0.data.activeProject' } }, optional: true, waitMs: 700 }),
]

const ACT_8: ReplayStep[] = [
  step({ say: 'Every tool, both hands, one world.', tool: 'get_history', input: { limit: 100 } }),
  step({ tool: 'get_world', input: { includeObjects: false } }),
]

export const FILM_V2_SCRIPT: ReplayScript = {
  id: 'film-v2',
  title: 'Film v2 — Gamma → Ramanujan',
  prompt: 'Follow me through this page. Use every tool you have.',
  steps: [...ACT_0, ...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4, ...ACT_5, ...ACT_6, ...ACT_7, ...ACT_8],
}
