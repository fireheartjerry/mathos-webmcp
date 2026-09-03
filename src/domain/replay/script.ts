import type { ReplayScript, ReplayStep } from './types'

/**
 * The film v2 choreography (docs/video/FILM_V2_STORY.md, draft 2, Act 0 → Act 8).
 * Every line is scripted; every tool call goes through the real tool object.
 *
 * Grammar the whole script obeys:
 * - `spotlight_objects` runs before every change to an existing object.
 * - `set_viewport` makes room before every new region is built.
 * - every construction is animated with `create_timeline` + `play_timeline`.
 * - equation and text edits use `typewriter: true`.
 * - steps that depend on something the human draws on camera are `optional`,
 *   so a dry run on an empty canvas still reaches the end.
 * - object ids created by earlier steps are threaded through `$ref`, never guessed.
 *
 * World layout (ivory canvas, world units):
 *   Act 1  ink + live equation      x 300..900,   y 150..560
 *   Act 2  density + note           x 300..770,   y 640..1050
 *   Act 3  attention + training     x 900..1870,  y 640..970
 *   Act 4  geometry + barycentric   x 300..1190,  y 1100..1430
 *   Act 6  simplex + partitions     x 300..1270,  y 1500..1830
 *   Act 7  matrix                   x 1300..1770, y 1500..1830
 */

const PURPLE = '#7c5cff'
const GRAPHITE = '#171713'
const HIGHLIGHT = 'rgba(124, 92, 255, 0.35)'
const GAMMA_LATEX = '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)}'
const RECURRENCE_LATEX = '\\Gamma\\left(\\tfrac{9}{2}\\right)=\\tfrac{7}{2}\\,\\Gamma\\left(\\tfrac{7}{2}\\right)=\\tfrac{7}{2}\\cdot\\tfrac{5}{2}\\cdot\\tfrac{3}{2}\\cdot\\tfrac{1}{2}\\sqrt{\\pi}=\\tfrac{105\\sqrt{\\pi}}{16}'
const BRIDGE_MASS_LATEX = 'w_j=\\int_{b_{j-1}}^{b_j} g_a(x)\\,dx'
const BRIDGE_LOG_LATEX = '\\ell_j=\\log w_j'
const BRIDGE_SOFTMAX_LATEX = '\\operatorname{softmax}(\\ell)_j=\\frac{e^{\\ell_j}}{\\sum_k e^{\\ell_k}}=w_j'

/** Camera that shows the world region whose top-left corner is (x, y) at ZOOM with a 40px margin. */
const ZOOM = 1.25
const camera = (x: number, y: number) => ({ viewport: { x: 40 - x * ZOOM, y: 40 - y * ZOOM, zoom: ZOOM } })

const step = (entry: ReplayStep): ReplayStep => entry
const object = (target: { objectId: unknown }, path: string) => ({ kind: 'object', objectId: target.objectId, path })

// ---------------------------------------------------------------------------
// Act 0 — Cold open. The agent reads the page before it touches anything.
// ---------------------------------------------------------------------------

const ACT_0: ReplayStep[] = [
  step({
    id: 'world0',
    say: 'On it. Reading the page first.',
    tool: 'get_world', input: { includeObjects: false },
    calls: [
      { id: 'projects0', tool: 'list_projects', input: {} },
      { tool: 'get_scene_catalog', input: {} },
      { tool: 'get_session_context', input: {} },
    ],
    waitMs: 600,
  }),
]

// ---------------------------------------------------------------------------
// Act 1 — The Gamma recurrence. Human writes, agent reads and marks.
// ---------------------------------------------------------------------------

const ACT_1: ReplayStep[] = [
  step({ humanNote: 'The learner writes Γ(9/2) = ∫x^{7/2}e^{−x}dx = [−x^{7/2}e^{−x}]₀^∞ − (7/2)Γ(7/2) by hand, sign error included.' }),
  step({ tool: 'focus_objects', input: { ids: ['replay_opening_attempt'], emphasis: 'feature' }, optional: true, waitMs: 700 }),
  step({
    id: 'ink1',
    say: 'Let me read that.',
    tool: 'get_objects', input: { ids: ['replay_opening_attempt'] },
    calls: [{ tool: 'get_selection', input: {} }],
  }),
  step({ tool: 'inspect_math', input: { objectId: { $ref: 'ink1.data.objects.0.id' } }, optional: true, waitMs: 400 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ink1.data.objects.0.id' }], label: 'the sign', seconds: 2 }, optional: true, waitMs: 900 }),
  step({
    id: 'mark1',
    say: "Integration by parts flips a sign here. I'll mark it, you fix it.",
    tool: 'draw_ink',
    input: {
      mode: 'pen', color: PURPLE, width: 4,
      strokes: [[
        { x: 604, y: 227 }, { x: 610, y: 210 }, { x: 628, y: 203 }, { x: 648, y: 207 },
        { x: 658, y: 221 }, { x: 657, y: 238 }, { x: 644, y: 250 }, { x: 624, y: 252 },
        { x: 608, y: 243 }, { x: 604, y: 227 },
      ]],
    },
    calls: [{
      tool: 'annotate_object',
      input: { objectId: { $ref: 'ink1.data.objects.0.id' }, text: 'v = −e⁻ˣ. Two negatives.', presentation: 'handwritten', placement: 'below' },
      optional: true,
    }],
    waitMs: 700,
  }),
  step({ humanNote: 'The learner corrects the tail down to 105√π/16. The agent says nothing about it.' }),
  step({
    id: 'live1',
    say: 'Want me to turn that into live math?',
    proposal: { title: 'Turn ink into live math', accept: 'Accept', decline: 'Decline', onDecline: 'act2' },
    tool: 'create_objects',
    input: {
      summary: 'Tutor placed an empty equation for the corrected line',
      objects: [{
        id: 'replay_live_recurrence', kind: 'equation', latex: '\\phantom{x}', color: GRAPHITE,
        bounds: { x: 300, y: 420, width: 800, height: 80 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    waitMs: 300,
  }),
  step({
    say: "I'll type it in. Watch the caret.",
    tool: 'edit_equation',
    input: { objectId: 'replay_live_recurrence', latex: RECURRENCE_LATEX, typewriter: true, typewriterMs: 2600 },
    waitMs: 400,
  }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_live_recurrence'], label: 'scale ×1.6', seconds: 1.5 }, optional: true, waitMs: 500 }),
  step({
    tool: 'transform_objects',
    input: { summary: 'Tutor scaled the live equation up', ids: ['replay_live_recurrence'], scale: 1.6 },
    waitMs: 600,
  }),
  step({ humanNote: 'The learner grabs the same corner handle, shrinks the equation back a little, rotates it a few degrees and back.' }),
  step({ say: 'Same handles I just used.', waitMs: 700 }),
]

// ---------------------------------------------------------------------------
// Act 2 — The Gamma density. The first 3Blue1Brown construction.
// ---------------------------------------------------------------------------

const ACT_2: ReplayStep[] = [
  step({ id: 'act2', say: 'I need space below.', tool: 'set_viewport', input: camera(240, 400), waitMs: 500 }),
  step({
    id: 'graph2',
    say: "Your corrected recurrence normalises into a density. I'll build it from nothing.",
    tool: 'graph_expression',
    input: { latex: '0', bounds: { x: 300, y: 640, width: 800, height: 560 } },
    waitMs: 500,
  }),
  step({
    tool: 'set_graph',
    input: {
      objectId: { $ref: 'graph2.changedIds.1' },
      latex: GAMMA_LATEX, typewriter: true, typewriterMs: 2000,
      parameters: { a: 4.5 }, xDomain: [0, 12], yDomain: [0, 0.25],
      visualization: 'gamma-density', binEdges: [0, 2.5, 5, 12], shadeIntegral: [0, 0.01],
    },
    waitMs: 300,
  }),
  step({
    id: 'draw2',
    tool: 'create_timeline',
    input: {
      name: 'Density draw-in',
      duration: 4,
      tracks: [
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 2.2, value: 1 }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 2.2, value: [0, 0.01] }, { time: 3.4, value: [0, 4.4] }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw2.data.timelineId' }, action: 'play' }, waitMs: 4200 }),
  step({ humanNote: 'The learner drags shape a → 5.5 and bound b → 4.4; the masses update live.' }),
  step({
    say: 'The three bins split the area into masses w₁ w₂ w₃. Take logs and you have the scores a softmax will see.',
    tool: 'explain_object', input: { objectId: { $ref: 'graph2.changedIds.1' } },
    calls: [{ tool: 'evaluate_expression', input: { latex: GAMMA_LATEX, x: [1.25, 3.75, 8.5], parameters: { a: 5.5 } } }],
  }),
  step({
    tool: 'create_objects',
    input: {
      summary: 'Tutor wrote the three masses beside the density',
      objects: [{
        id: 'replay_bins_note', kind: 'text',
        text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs are the scores softmax will see.',
        color: PURPLE, fontSize: 16, presentation: 'typed', bounds: { x: 300, y: 1240, width: 800, height: 80 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    waitMs: 500,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'graph2.changedIds.0' }, { $ref: 'graph2.changedIds.1' }], label: 'masses → logs → softmax', seconds: 1.5 }, optional: true, waitMs: 400 }),
  step({
    id: 'bridge2',
    say: 'Here is the bridge.',
    tool: 'create_timeline',
    input: {
      name: 'Masses to softmax',
      duration: 6,
      tracks: [
        {
          target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'latex'),
          keyframes: [
            { time: 0, value: GAMMA_LATEX }, { time: 1, value: BRIDGE_MASS_LATEX }, { time: 2.6, value: BRIDGE_LOG_LATEX },
            { time: 4.2, value: BRIDGE_SOFTMAX_LATEX }, { time: 5.8, value: GAMMA_LATEX },
          ],
        },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 0, value: [0, 4.4] }, { time: 1.5, value: [0, 2.5] }, { time: 3, value: [2.5, 5] }, { time: 4.5, value: [5, 12] }, { time: 6, value: [0, 4.4] }] },
      ],
    },
  }),
  step({
    tool: 'add_keyframes',
    input: {
      timelineId: { $ref: 'bridge2.data.timelineId' },
      target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'parameters.a'),
      keyframes: [{ time: 0, value: 5.5 }, { time: 3, value: 4.5 }, { time: 6, value: 5.5 }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'bridge2.data.timelineId' }, action: 'play' }, waitMs: 6200 }),
  step({ humanNote: 'When the timeline ends the widget is editable again; the learner nudges the slider to prove it.' }),
]

// ---------------------------------------------------------------------------
// Act 3 — Attention. The agent edits a cell while teaching; the human trains.
// ---------------------------------------------------------------------------

const ACT_3: ReplayStep[] = [
  step({ say: 'Over to attention. Panning right.', tool: 'set_viewport', input: camera(1180, 560), waitMs: 500 }),
  step({ id: 'att3', tool: 'visualize_concept', input: { concept: 'attention', bounds: { x: 1240, y: 640, width: 800, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }] }, waitMs: 400 }),
  step({
    id: 'draw3',
    tool: 'create_timeline',
    input: {
      name: 'Attention card draw-in',
      duration: 1.6,
      tracks: [
        { target: object({ objectId: { $ref: 'att3.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1.2, value: 1 }] },
        { target: object({ objectId: { $ref: 'att3.changedIds.0' } }, 'bounds.y'), keyframes: [{ time: 0, value: 664 }, { time: 1.2, value: 640 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw3.data.timelineId' }, action: 'play' }, waitMs: 1800 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }], label: 'W_Q[0][0]', seconds: 2.5 }, optional: true, waitMs: 700 }),
  step({
    say: 'W_Q turns each token into a query. Raising this entry leans the query toward the first embedding dimension, so the dot products with the keys change, and so do the weights.',
    tool: 'set_attention_weight',
    input: { objectId: { $ref: 'att3.changedIds.0' }, matrix: 'wq', row: 0, column: 0, value: 1.4 },
    waitMs: 900,
  }),
  step({ say: "Weights still sum to one. That's the softmax doing its job.", waitMs: 900 }),
  step({ id: 'train3', tool: 'visualize_concept', input: { concept: 'training', bounds: { x: 2180, y: 640, width: 800, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'train3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'train3.changedIds.0' }], label: 'one step', seconds: 1.5 }, optional: true, waitMs: 400 }),
  step({ say: 'One step from me, then I take it back.', tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 700 }),
  step({ tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 500 }),
  step({ say: "My step is undone. Your turn: it's a real widget, so train it yourself.", waitMs: 600 }),
  step({ humanNote: 'The learner clicks train 1 step eight times; loss and target probability grow point by point.' }),
  step({ say: 'Every click is one honest numerical gradient on the visible parameters. I spawned this widget with a tool; it runs on pure math from here.', waitMs: 1200 }),
]

// ---------------------------------------------------------------------------
// Act 4 — Geometry, led by the agent, built by both. Third construction.
// ---------------------------------------------------------------------------

const ACT_4: ReplayStep[] = [
  step({ say: "Let's move to geometry. Pick the Geometry tool and click three points for a triangle.", tool: 'set_viewport', input: camera(240, 1340), waitMs: 500 }),
  step({ humanNote: 'The learner picks Geometry; the GeoGebra-style toolbar appears; the cursor places A, B, C and closes the triangle.' }),
  step({ id: 'geoHuman4', tool: 'get_objects', input: { kinds: ['geometry'], limit: 1 }, optional: true }),
  step({
    id: 'geo4',
    say: 'Every mark I add depends on your three points.',
    tool: 'construct_geometry',
    input: {
      summary: 'Tutor completed the construction from the three points',
      bounds: { x: 300, y: 1400, width: 730, height: 560 },
      primitives: [
        { kind: 'point', id: 'A', at: { x: 119, y: 442 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 595, y: 442 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 357, y: 111 }, label: 'C', draggable: true },
        { kind: 'polygon', id: 'ABC', points: ['A', 'B', 'C'] },
        { kind: 'midpoint', id: 'M', of: ['A', 'B'], label: 'M' },
        { kind: 'point', id: 'O', at: { x: 357, y: 340 }, label: 'O', draggable: true },
        { kind: 'circle', id: 'c1', center: 'O', through: 'M' },
        { kind: 'homothety', id: 'A2', center: 'O', source: 'A', factor: 0.72, label: 'A′' },
        { kind: 'homothety', id: 'B2', center: 'O', source: 'B', factor: 0.72, label: 'B′' },
        { kind: 'segment', id: 'A2B2', from: 'A2', to: 'B2' },
        { kind: 'midpoint', id: 'M2', of: ['A2', 'B2'], label: 'M′' },
        { kind: 'circle', id: 'c2', center: 'O', through: 'M2' },
        { kind: 'similarity', id: 'A3', center: 'O', source: 'A', factor: 0.72, angle: 32, label: 'A″' },
        { kind: 'similarity', id: 'B3', center: 'O', source: 'B', factor: 0.72, angle: 32, label: 'B″' },
        { kind: 'segment', id: 'A3B3', from: 'A3', to: 'B3' },
        { kind: 'spiralCenter', id: 'S', a: 'A', b: 'B', a2: 'A3', b2: 'B3', label: 'S' },
        { kind: 'angle', id: 'ang', a: 'A', vertex: 'O', b: 'A3' },
      ],
    },
  }),
  step({
    id: 'draw4',
    tool: 'create_timeline',
    input: {
      name: 'Construction in dependency order',
      duration: 3.2,
      tracks: [{ target: object({ objectId: { $ref: 'geo4.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 3, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw4.data.timelineId' }, action: 'play' }, waitMs: 3400 }),
  step({ say: 'Drag one point and everything follows. Let me show you with A.', tool: 'spotlight_objects', input: { ids: [{ $ref: 'geo4.changedIds.0' }], label: 'moving A', seconds: 1.5 }, optional: true, waitMs: 400 }),
  step({ tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: 41, y: -31 } }, waitMs: 600 }),
  step({ id: 'bary4', tool: 'visualize_concept', input: { concept: 'barycentric', bounds: { x: 1180, y: 1400, width: 730, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'bary4.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({
    id: 'drawBary4',
    tool: 'create_timeline',
    input: {
      name: 'Barycentric draw-in',
      duration: 1.4,
      tracks: [{ target: object({ objectId: { $ref: 'bary4.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1.2, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'drawBary4.data.timelineId' }, action: 'play' }, waitMs: 1500 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'bary4.changedIds.0' }], label: 'P', seconds: 2 }, optional: true, waitMs: 500 }),
  step({
    say: 'P is a weighted average of A, B and C. Those weights can be anything that sums to one. Like attention weights.',
    tool: 'set_barycentric_weights',
    input: { objectId: { $ref: 'bary4.changedIds.0' }, preset: 'attention' },
    optional: true,
    waitMs: 700,
  }),
  step({ say: 'Same decimals as the attention card. Now I move A by tool and P follows the same rule.', tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: -12, y: 10 } }, waitMs: 600 }),
]

// ---------------------------------------------------------------------------
// Act 5 — Parity beats. The agent tidies the page into a lesson sheet.
// ---------------------------------------------------------------------------

const ACT_5: ReplayStep[] = [
  step({ tool: 'set_viewport', input: camera(240, 380), waitMs: 500 }),
  step({
    id: 'box5',
    say: 'Let me box the three acts.',
    tool: 'create_shape',
    input: {
      summary: 'Tutor boxed Acts 1 and 2',
      shape: 'polygon', fill: 'rgba(124, 92, 255, 0.06)', stroke: PURPLE, strokeWidth: 2,
      points: [{ x: 250, y: 370 }, { x: 2090, y: 370 }, { x: 2090, y: 1250 }, { x: 250, y: 1250 }],
    },
    calls: [{
      id: 'ellipse5',
      tool: 'create_shape',
      input: { summary: 'Tutor ringed Act 3', shape: 'ellipse', fill: 'none', stroke: PURPLE, strokeWidth: 2, bounds: { x: 2130, y: 590, width: 900, height: 660 } },
    }],
    waitMs: 600,
  }),
  step({ humanNote: 'The learner resizes the ellipse with its handles and rotates it slightly.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ellipse5.data.objectId' }], label: 'match your stroke', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({ tool: 'edit_shape', input: { objectId: { $ref: 'ellipse5.data.objectId' }, stroke: GRAPHITE, strokeWidth: 3 }, waitMs: 500 }),
  step({
    tool: 'update_objects',
    input: { summary: 'Tutor matched the box to your stroke', updates: [{ id: { $ref: 'box5.data.objectId' }, patch: { stroke: GRAPHITE, strokeWidth: 3 } }] },
    waitMs: 400,
  }),
  step({
    say: 'Both boxes selected in one atomic batch, same reducer you use.',
    tool: 'apply_actions',
    input: { summary: 'Tutor selected the lesson sheet', operations: [{ type: 'select', ids: [{ $ref: 'box5.data.objectId' }, { $ref: 'ellipse5.data.objectId' }] }] },
    waitMs: 600,
  }),
  step({ humanNote: 'The learner drags an arrow from the density widget to the attention card, then drags its head.' }),
  // The learner's arrow has to exist before the agent can re-aim it. This used to
  // read the world for an arrow that was never created, so the id resolved to
  // undefined and both the spotlight and set_arrow failed red on camera.
  step({
    id: 'arrow5',
    tool: 'create_objects',
    input: {
      summary: 'Drew an arrow from the density to the bridge',
      objects: [{
        id: 'replay_arrow', kind: 'arrow',
        from: { x: 24, y: 150 }, to: { x: 300, y: 20 },
        bounds: { x: 1120, y: 1250, width: 300, height: 160 },
        rotation: 0, opacity: 1, color: GRAPHITE,
      }],
    },
    waitMs: 500,
  }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_arrow'], label: 'tail → bin 2', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({ say: "I'll point the tail at the exact bin.", tool: 'set_arrow', input: { objectId: 'replay_arrow', from: { x: 18, y: 168 }, color: PURPLE }, optional: true, waitMs: 500 }),
  step({ humanNote: 'The learner highlights the softmax row.' }),
  step({
    id: 'glow5',
    say: 'Same colour on the matching barycentric weights.',
    tool: 'draw_ink',
    input: { mode: 'highlighter', color: HIGHLIGHT, width: 18, strokes: [[{ x: 1220, y: 1660 }, { x: 1620, y: 1660 }]] },
    waitMs: 500,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'glow5.data.objectId' }], label: 'too wide, deleting', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({ say: 'Too wide. Deleting it, like you would.', tool: 'delete_objects', input: { summary: 'Tutor deleted its highlight', ids: [{ $ref: 'glow5.data.objectId' }] }, waitMs: 500 }),
  step({ humanNote: 'The learner erases a stray stroke.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'mark1.data.objectId' }], label: 'my circle', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({ tool: 'erase_ink', input: { ids: [{ $ref: 'mark1.data.objectId' }] }, optional: true, waitMs: 600 }),
  step({ say: 'Everything I do is in your history. Undo works on me too.', tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 800 }),
]

// ---------------------------------------------------------------------------
// Act 6 — Simplex and partitions. Fourth and fifth constructions.
// ---------------------------------------------------------------------------

const ACT_6: ReplayStep[] = [
  step({ say: 'More space. Panning to the empty strip below.', tool: 'set_viewport', input: camera(240, 2100), waitMs: 500 }),
  step({ id: 'simplex6', tool: 'visualize_concept', input: { concept: 'simplex', bounds: { x: 300, y: 2160, width: 800, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'simplex6.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({
    id: 'draw6',
    tool: 'create_timeline',
    input: {
      name: 'Tetrahedron draw-in and section sweep',
      duration: 4.5,
      tracks: [
        { target: object({ objectId: { $ref: 'simplex6.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 2, value: 1 }] },
        { target: object({ objectId: { $ref: 'simplex6.changedIds.0' } }, 'section'), keyframes: [{ time: 2, value: 0.5 }, { time: 4.2, value: 0.18 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw6.data.timelineId' }, action: 'play' }, waitMs: 4700 }),
  step({ say: 'Four weights instead of three: same simplex idea, one dimension up. The section plane at δ = 0.18 holds your triangle.', tool: 'spotlight_objects', input: { ids: [{ $ref: 'simplex6.changedIds.0' }], label: 'δ = 0.18', seconds: 1.5 }, optional: true, waitMs: 300 }),
  step({ tool: 'set_simplex_view', input: { objectId: { $ref: 'simplex6.changedIds.0' }, section: 0.18, denominator: 5 }, waitMs: 700 }),
  step({ id: 'parts6', say: 'Count the lattice tuples and you are counting partitions.', tool: 'visualize_concept', input: { concept: 'partitions', bounds: { x: 1240, y: 2160, width: 800, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'parts6.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({
    id: 'drawParts6',
    tool: 'create_timeline',
    input: {
      name: 'Partition table reveal',
      duration: 2.2,
      tracks: [
        { target: object({ objectId: { $ref: 'parts6.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1.4, value: 1 }] },
        { target: object({ objectId: { $ref: 'parts6.changedIds.0' } }, 'bounds.y'), keyframes: [{ time: 0, value: 1524 }, { time: 1.4, value: 1500 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'drawParts6.data.timelineId' }, action: 'play' }, waitMs: 2400 }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, finiteCutoff: 19, selectedN: 14, revealTheorem: false }, waitMs: 800 }),
  step({ humanNote: 'The learner drags the cutoff slider.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'parts6.changedIds.0' }], label: 'Ramanujan', seconds: 1.5 }, optional: true, waitMs: 300 }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, revealTheorem: true }, waitMs: 600 }),
  step({ say: "I can verify cases. I can't prove the theorem, and the card says so.", waitMs: 900 }),
]

// ---------------------------------------------------------------------------
// Act 7 — Matrix (sixth construction) and the rest of the rail.
// ---------------------------------------------------------------------------

const ACT_7: ReplayStep[] = [
  step({ say: 'Last construction. Panning right.', tool: 'set_viewport', input: camera(2120, 2100), waitMs: 500 }),
  step({ humanNote: 'The learner picks Matrix → 2 × 2 and types values into the grid.' }),
  step({ id: 'matrix7', tool: 'visualize_concept', input: { concept: 'matrix-transform', bounds: { x: 2180, y: 2160, width: 800, height: 560 } } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'matrix7.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 650 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'matrix7.changedIds.2' }], label: 'shear', seconds: 1.5 }, optional: true, waitMs: 400 }),
  step({ say: 'A shear: one off-diagonal entry.', tool: 'set_matrix_cells', input: { objectId: { $ref: 'matrix7.changedIds.2' }, cells: [{ row: 0, column: 1, value: 1.2 }] }, waitMs: 400 }),
  step({
    id: 'draw7',
    tool: 'create_timeline',
    input: {
      name: 'Lattice sweep',
      duration: 3,
      tracks: [
        { target: object({ objectId: { $ref: 'matrix7.changedIds.2' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1, value: 1 }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.0' } }, 'to'), keyframes: [{ time: 0.8, value: [1, 0] }, { time: 2.8, value: [2, 1] }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.1' } }, 'to'), keyframes: [{ time: 0.8, value: [0, 1] }, { time: 2.8, value: [-1, 2] }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw7.data.timelineId' }, action: 'play' }, waitMs: 3200 }),
  step({ say: 'Same idea as W_Q: a matrix moves every vector at once.', waitMs: 700 }),
  step({ humanNote: 'The learner drags a basis vector; the cells update.' }),
  step({ humanNote: 'The learner double-clicks the explanation note and edits a word.' }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_bins_note'], label: 'one word', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({
    say: 'One word in my note, retyped.',
    tool: 'edit_text',
    input: { objectId: 'replay_bins_note', text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs become the scores softmax will see.', typewriter: true, typewriterMs: 1600 },
    optional: true,
    waitMs: 400,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'graph2.changedIds.0' }], label: 'one term', seconds: 1.2 }, optional: true, waitMs: 300 }),
  step({
    say: 'And one LaTeX term, live.',
    tool: 'edit_equation',
    input: { objectId: { $ref: 'graph2.changedIds.0' }, latex: '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)},\\quad a=5.5', typewriter: true, typewriterMs: 1600 },
    optional: true,
    waitMs: 500,
  }),
  step({ humanNote: 'The learner undoes and redoes both edits from the rail.' }),
  step({ humanNote: 'The learner draws a Frame around the whole page and titles it Pipeline.' }),
  step({ id: 'project7', say: 'A second project, so you can see the isolation.', tool: 'create_project', input: { title: 'Pipeline scratch', templateId: 'gamma-lab' }, optional: true, waitMs: 400 }),
  step({ tool: 'open_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 700 }),
  step({ tool: 'open_scene', input: { scene: 'gamma-clinic' }, optional: true, waitMs: 700 }),
  step({ say: 'Untouched. Back we go.', tool: 'open_project', input: { projectId: { $ref: 'projects0.data.activeProjectId' } }, optional: true, waitMs: 800 }),
  step({ tool: 'delete_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 400 }),
]

// ---------------------------------------------------------------------------
// Act 8 — Close.
// ---------------------------------------------------------------------------

const ACT_8: ReplayStep[] = [
  step({
    id: 'compatImage8',
    tool: 'create_objects',
    input: {
      summary: 'Prepared an off-canvas compatibility fixture',
      objects: [{
        id: 'replay_compat_image', kind: 'image',
        src: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
        alt: 'Off-canvas compatibility fixture',
        bounds: { x: -4200, y: -4200, width: 120, height: 80 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    optional: true,
  }),
  step({
    say: 'Two compatibility tools stay available for imported worksheets. They run off canvas here; the lesson itself stayed live from the first keystroke.',
    tool: 'reconstruct_problem',
    input: {
      sourceImageId: 'replay_compat_image',
      proposedObjects: [{
        id: 'replay_compat_equation', kind: 'equation', latex: '\\Gamma(x+1)=x\\Gamma(x)', color: GRAPHITE,
        bounds: { x: -4000, y: -4000, width: 320, height: 64 }, rotation: 0, author: 'agent', opacity: 1,
      }],
      uncertainObjectIds: [],
    },
    optional: true,
  }),
  step({
    tool: 'audit_reconstruction',
    input: { auditSummary: 'Compatibility import checked; the live Pipeline construction remains authoritative.' },
    optional: true,
  }),
  step({
    say: "That's every tool, used at least once, all through one shared history.",
    tool: 'get_history', input: { limit: 100 },
    calls: [{ tool: 'get_world', input: { includeObjects: false } }, { tool: 'get_timelines', input: {} }],
  }),
]

export const FILM_V2_SCRIPT: ReplayScript = {
  id: 'film-v2',
  title: 'Film v2 — Pipeline',
  prompt: "Walk me through the whole pipeline. Use everything you've got.",
  steps: [...ACT_0, ...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4, ...ACT_5, ...ACT_6, ...ACT_7, ...ACT_8],
}
