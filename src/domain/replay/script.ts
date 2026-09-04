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
 * World layout: ONE HORIZONTAL STRIP, so every act exits stage-left and the camera
 * only ever pans right. Panning diagonally left the previous act hanging in frame,
 * and a strip also makes the closing pull-back read as a chain of related ideas.
 * Cards are 800 wide on a 1000 pitch, so 200px of clear canvas separates neighbours.
 *   Act 1  ink + live equation      x  120..1020, y 210..500
 *   Act 2  density + caption        x 1200..2000, y 640..1320
 *   Act 3  attention, training      x 2200..3000, 3200..4000
 *   Act 4  geometry, barycentric    x 4200..4930, 5130..5860
 *   Act 6  simplex, partitions      x 6060..6860, 7060..7860
 *   Act 7  matrix                   x 8060..8860
 */

const PURPLE = '#7c5cff'
const GRAPHITE = '#171713'
const HIGHLIGHT = 'rgba(124, 92, 255, 0.35)'
const GAMMA_LATEX = '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)}'
const RECURRENCE_LATEX = '\\Gamma\\left(\\tfrac{9}{2}\\right)=\\tfrac{7}{2}\\,\\Gamma\\left(\\tfrac{7}{2}\\right)=\\tfrac{7}{2}\\cdot\\tfrac{5}{2}\\cdot\\tfrac{3}{2}\\cdot\\tfrac{1}{2}\\sqrt{\\pi}=\\tfrac{105\\sqrt{\\pi}}{16}'
const BRIDGE_MASS_LATEX = 'w_j=\\int_{b_{j-1}}^{b_j} g_a(x)\\,dx'
const BRIDGE_LOG_LATEX = '\\ell_j=\\log w_j'
const BRIDGE_SOFTMAX_LATEX = '\\operatorname{softmax}(\\ell)_j=\\frac{e^{\\ell_j}}{\\sum_k e^{\\ell_k}}=w_j'

/**
 * Camera that shows the world region whose top-left corner is (x, y).
 *
 * The old 40px margin put that corner underneath the film's left column — the rail is
 * rendered expanded at 188px and the ledger, timelines and activity panels stack
 * beside it — so a pan parked the new act behind the chrome. Clear the column and the
 * header instead; focus_objects still does the precise framing afterwards.
 */
const ZOOM = 1.25
const LEFT_CHROME = 300
const TOP_CHROME = 120
const camera = (x: number, y: number) => ({ viewport: { x: LEFT_CHROME - x * ZOOM, y: TOP_CHROME - y * ZOOM, zoom: ZOOM } })

const step = (entry: ReplayStep): ReplayStep => entry

/**
 * Educational sub-frames: when the agent changes something meaningful, it grows a small
 * flow chart of explainers off the widget rather than just narrating.
 *
 * They sit BELOW the strip (the strip is y 640..1320, these start at y 1460), so they
 * never compete with the row for space, and each is joined to its parent by a real
 * arrow — the zoom-out then reads as a graph of related ideas instead of scattered
 * cards. Composed from create_objects and set_arrow on purpose: no new tool, so the
 * page still registers exactly 48.
 */
const EXPLAINER_W = 280
const EXPLAINER_H = 300
const EXPLAINER_Y = 1460
const EXPLAINER_GAP = 40
const explainers = (
  id: string,
  parent: { x: number; y: number; width: number; height: number },
  cards: { title: string; latex: string; note: string }[],
): ReplayStep[] => {
  const span = cards.length * EXPLAINER_W + (cards.length - 1) * EXPLAINER_GAP
  const startX = parent.x + parent.width / 2 - span / 2
  const objects = cards.flatMap((card, index) => {
    const x = startX + index * (EXPLAINER_W + EXPLAINER_GAP)
    return [
      // The frame owns its equation and note, so it reports "2 objects" rather than
      // "0 objects" and the group moves as one when anything drags it.
      { id: `${id}_frame_${index}`, kind: 'frame', title: card.title, childIds: [`${id}_eq_${index}`, `${id}_note_${index}`],
        bounds: { x, y: EXPLAINER_Y, width: EXPLAINER_W, height: EXPLAINER_H }, rotation: 0, author: 'agent', opacity: 1 },
      { id: `${id}_eq_${index}`, kind: 'equation', latex: card.latex, color: GRAPHITE,
        bounds: { x: x + 18, y: EXPLAINER_Y + 66, width: EXPLAINER_W - 36, height: 74 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: `${id}_note_${index}`, kind: 'text', text: card.note, color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: x + 18, y: EXPLAINER_Y + 158, width: EXPLAINER_W - 36, height: 112 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: `${id}_link_${index}`, kind: 'arrow', color: PURPLE,
        from: { x: parent.x + parent.width / 2 - x, y: parent.y + parent.height - EXPLAINER_Y },
        to: { x: EXPLAINER_W / 2, y: 0 },
        bounds: { x, y: parent.y + parent.height, width: EXPLAINER_W, height: EXPLAINER_Y - (parent.y + parent.height) },
        rotation: 0, author: 'agent', opacity: 1 },
    ]
  })
  return [
    step({
      id,
      say: 'That change has consequences worth their own cards. Let me put them underneath.',
      tool: 'create_objects',
      input: { summary: `Tutor spawned ${cards.length} explainers off the ${id.replace(/[0-9]/g, '')}`, objects },
      waitMs: 540,
    }),
    step({ tool: 'focus_objects', input: { ids: [`${id}_frame_0`, `${id}_frame_${cards.length - 1}`], emphasis: 'feature' }, optional: true, waitMs: 660 }),
    step({ tool: 'focus_objects', input: { ids: [`${id}_frame_1`], emphasis: 'detail', anchor: 'cursor' }, optional: true, waitMs: 720 }),
  ]
}
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
    waitMs: 391,
  }),
]

// ---------------------------------------------------------------------------
// Act 1 — The Gamma recurrence. Human writes, agent reads and marks.
// ---------------------------------------------------------------------------

const ACT_1: ReplayStep[] = [
  step({ humanNote: 'The learner writes Γ(9/2) = ∫x^{7/2}e^{−x}dx = [−x^{7/2}e^{−x}]₀^∞ − (7/2)Γ(7/2) by hand, sign error included.' }),
  step({ tool: 'focus_objects', input: { ids: ['replay_opening_attempt'], emphasis: 'feature' }, optional: true, waitMs: 457 }),
  step({
    id: 'ink1',
    say: 'Let me read that.',
    tool: 'get_objects', input: { ids: ['replay_opening_attempt'] },
    calls: [{ tool: 'get_selection', input: {} }],
  }),
  // The opening object is ink, which carries no live mathematics, so inspect_math
  // rejects it by design and printed a red failed call in the console on camera.
  // explain_object is the tool that reads any kind, and is what that error names.
  // inspect_math still runs this act, against the live equation the agent types below.
  step({ tool: 'explain_object', input: { objectId: { $ref: 'ink1.data.objects.0.id' } }, optional: true, waitMs: 261 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ink1.data.objects.0.id' }], label: 'the sign', seconds: 2.9 }, optional: true, waitMs: 587 }),
  step({
    id: 'mark1',
    say: "Integration by parts flips a sign here. I'll mark it, you fix it.",
    tool: 'draw_ink',
    input: {
      mode: 'pen', color: PURPLE, width: 4, construct: true,
      // Ringed on the lost sign itself, not near it. The minus before (7/2)Gamma(7/2)
      // is stroke 42 of the captured sample; mapped through cropAndFit's fit into the
      // ink's bounds it lands at world (849, 330). The old circle sat at (604, 227),
      // which is empty canvas between terms.
      strokes: [[
        { x: 849, y: 296 },
        { x: 870, y: 301 },
        { x: 885, y: 313 },
        { x: 891, y: 330 },
        { x: 885, y: 347 },
        { x: 870, y: 359 },
        { x: 849, y: 364 },
        { x: 828, y: 359 },
        { x: 813, y: 347 },
        { x: 807, y: 330 },
        { x: 813, y: 313 },
        { x: 828, y: 301 },
        { x: 849, y: 296 },
      ]],
    },
    calls: [{
      tool: 'annotate_object',
      input: { objectId: { $ref: 'ink1.data.objects.0.id' }, text: 'v = −e⁻ˣ. Two negatives.', presentation: 'handwritten', placement: 'below' },
      optional: true,
    }],
    waitMs: 220,
  }),
  // The circle is created unbuilt, so a timeline draws it the way a hand would.
  step({
    id: 'markdraw1',
    tool: 'create_timeline',
    input: {
      name: 'Circle the sign',
      duration: 1.5,
      tracks: [{ target: object({ objectId: { $ref: 'mark1.data.objectId' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 1.5, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'markdraw1.data.timelineId' }, action: 'play' }, waitMs: 1900 }),
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
    waitMs: 220,
  }),
  step({
    say: "I'll type it in. Watch the caret.",
    tool: 'edit_equation',
    input: { objectId: 'replay_live_recurrence', latex: RECURRENCE_LATEX, typewriter: true, typewriterMs: 3770 },
    waitMs: 261,
  }),
  // The equation is live now, so inspect_math has something it accepts. The ledger
  // counts a tool as used only on a SUCCESSFUL completion, so this call is what
  // takes the on-screen counter to a true 48/48.
  step({
    say: 'Now there is live math to read.',
    tool: 'inspect_math',
    input: { objectId: 'replay_live_recurrence' },
    waitMs: 326,
  }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_live_recurrence'], label: 'scale ×1.6', seconds: 2.17 }, optional: true, waitMs: 326 }),
  step({
    tool: 'transform_objects',
    input: { summary: 'Tutor scaled the live equation up', ids: ['replay_live_recurrence'], scale: 1.6 },
    waitMs: 391,
  }),
  step({ humanNote: 'The learner grabs the same corner handle, shrinks the equation back a little, rotates it a few degrees and back.' }),
  step({ say: 'Same handles I just used.', waitMs: 457 }),
]

// ---------------------------------------------------------------------------
// Act 2 — The Gamma density. The first 3Blue1Brown construction.
// ---------------------------------------------------------------------------

const ACT_2: ReplayStep[] = [
  step({ id: 'act2', say: 'I need space below.', tool: 'set_viewport', input: camera(1140, 580), waitMs: 326 }),
  step({
    id: 'graph2',
    say: "Your corrected recurrence normalises into a density. I'll build it from nothing.",
    tool: 'graph_expression',
    input: { latex: '0', bounds: { x: 1200, y: 640, width: 800, height: 560 }, construct: true },
    waitMs: 326,
  }),
  step({
    tool: 'set_graph',
    input: {
      objectId: { $ref: 'graph2.changedIds.1' },
      latex: GAMMA_LATEX, typewriter: true, typewriterMs: 2900,
      parameters: { a: 4.5 }, xDomain: [0, 12], yDomain: [0, 0.25],
      visualization: 'gamma-density', binEdges: [0, 2.5, 5, 12], shadeIntegral: [0, 0.01],
    },
    waitMs: 220,
  }),
  step({
    id: 'draw2',
    tool: 'create_timeline',
    input: {
      name: 'Density draw-in',
      duration: 5.8,
      tracks: [
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 3.19, value: 1 }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 3.19, value: [0, 0.01] }, { time: 4.93, value: [0, 4.4] }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1.45, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw2.data.timelineId' }, action: 'play' }, waitMs: 6090 }),
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
        color: PURPLE, fontSize: 16, presentation: 'typed', bounds: { x: 1200, y: 1240, width: 800, height: 80 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    waitMs: 326,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'graph2.changedIds.0' }, { $ref: 'graph2.changedIds.1' }], label: 'masses → logs → softmax', seconds: 2.17 }, optional: true, waitMs: 261 }),
  step({
    id: 'bridge2',
    say: 'Here is the bridge.',
    tool: 'create_timeline',
    input: {
      name: 'Masses to softmax',
      duration: 8.7,
      tracks: [
        {
          target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'latex'),
          keyframes: [
            { time: 0, value: GAMMA_LATEX }, { time: 1.45, value: BRIDGE_MASS_LATEX }, { time: 3.77, value: BRIDGE_LOG_LATEX },
            { time: 6.09, value: BRIDGE_SOFTMAX_LATEX }, { time: 8.41, value: GAMMA_LATEX },
          ],
        },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 0, value: [0, 4.4] }, { time: 2.17, value: [0, 2.5] }, { time: 4.35, value: [2.5, 5] }, { time: 6.52, value: [5, 12] }, { time: 8.7, value: [0, 4.4] }] },
      ],
    },
  }),
  step({
    tool: 'add_keyframes',
    input: {
      timelineId: { $ref: 'bridge2.data.timelineId' },
      target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'parameters.a'),
      keyframes: [{ time: 0, value: 5.5 }, { time: 4.35, value: 4.5 }, { time: 8.7, value: 5.5 }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'bridge2.data.timelineId' }, action: 'play' }, waitMs: 8990 }),
  step({ humanNote: 'When the timeline ends the widget is editable again; the learner nudges the slider to prove it.' }),
  ...explainers('density2', { x: 1200, y: 640, width: 800, height: 560 }, [
    { title: 'Why the area is one',
      latex: '\\int_0^{\\infty} g_a(x)\\,dx = 1',
      note: 'Dividing by Gamma(a) is exactly what normalises it, so the three bins are probabilities and not just areas.' },
    { title: 'Masses become scores',
      latex: '\\ell_j = \\log w_j',
      note: 'Logs turn multiplying masses into adding scores. That is the space an attention head actually works in.' },
    { title: 'And back again',
      latex: '\\operatorname{softmax}(\\ell)_j = \\frac{e^{\\ell_j}}{\\sum_k e^{\\ell_k}} = w_j',
      note: 'Exponentiate and renormalise and you land on the same three numbers. The bridge is a round trip.' },
  ]),
  step({ say: 'Three cards, one idea each, all hanging off the thing that produced them.', waitMs: 420 }),
]

// ---------------------------------------------------------------------------
// Act 3 — Attention. The agent edits a cell while teaching; the human trains.
// ---------------------------------------------------------------------------

const ACT_3: ReplayStep[] = [
  step({ say: 'Over to attention. Panning right.', tool: 'set_viewport', input: camera(2140, 580), waitMs: 326 }),
  step({ id: 'att3', tool: 'visualize_concept', input: { concept: 'attention', bounds: { x: 2200, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 424 }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }] }, waitMs: 261 }),
  step({
    id: 'draw3',
    tool: 'create_timeline',
    input: {
      name: 'Attention card draw-in',
      duration: 5.6,
      tracks: [
        { target: object({ objectId: { $ref: 'att3.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 5.6, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw3.data.timelineId' }, action: 'play' }, waitMs: 6000 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }], label: 'W_Q[0][0]', seconds: 3.62 }, optional: true, waitMs: 457 }),
  step({
    say: 'W_Q turns each token into a query. Raising this entry leans the query toward the first embedding dimension, so the dot products with the keys change, and so do the weights.',
    tool: 'set_attention_weight',
    input: { objectId: { $ref: 'att3.changedIds.0' }, matrix: 'wq', row: 0, column: 0, value: 1.4 },
    waitMs: 587,
  }),
  step({ say: "Weights still sum to one. That's the softmax doing its job.", waitMs: 587 }),
  ...explainers('attention3', { x: 2200, y: 640, width: 800, height: 560 }, [
    { title: 'What W_Q does',
      latex: 'q = W_Q e,\\quad k = W_K e',
      note: 'Every token is projected twice: once as a question, once as an answer key.' },
    { title: 'Why divide by root d',
      latex: '\\frac{q\\cdot k}{\\sqrt{d}}',
      note: 'Without the scale the dot products grow with dimension and softmax saturates.' },
    { title: 'Still a distribution',
      latex: '\\sum_j \\alpha_j = 1,\\; \\alpha_j > 0',
      note: 'Raising one entry has to take weight from the others. That is the whole constraint.' },
  ]),
  step({ id: 'train3', tool: 'visualize_concept', input: { concept: 'training', bounds: { x: 3200, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'train3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 225 }),
  step({
    id: 'traindraw3',
    tool: 'create_timeline',
    input: {
      name: 'Training card build',
      duration: 4.2,
      tracks: [{ target: object({ objectId: { $ref: 'train3.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 4.2, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'traindraw3.data.timelineId' }, action: 'play' }, waitMs: 4600 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'train3.changedIds.0' }], label: 'one step', seconds: 2.17 }, optional: true, waitMs: 261 }),
  // One step, undone, then a real training run. A single step read as an animation;
  // watching loss fall across thirteen of them is what makes it obviously arithmetic.
  step({ say: 'One step from me, then I take it back.', tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 457 }),
  step({ tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 326 }),
  step({ say: 'Undone. Now let us actually train it. One step at a time first.', waitMs: 300 }),
  step({
    tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } },
    calls: [
      { tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true },
      { tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true },
    ],
    optional: true, waitMs: 660,
  }),
  step({
    say: 'Loss falls and the target probability rises, every time. A step only commits when both hold.',
    tool: 'explain_object', input: { objectId: { $ref: 'train3.changedIds.0' } },
    optional: true, waitMs: 540,
  }),
  step({ say: 'Now five at once.', tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } },
    calls: Array.from({ length: 4 }, () => ({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true })),
    optional: true, waitMs: 720,
  }),
  step({ say: 'And five more. The curve is flattening, which is what convergence looks like.',
    tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } },
    calls: Array.from({ length: 4 }, () => ({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true })),
    optional: true, waitMs: 780,
  }),
  step({ say: 'Thirteen honest gradient steps on the parameters you can see. Nothing here is a canned animation.', waitMs: 600 }),
]

// ---------------------------------------------------------------------------
// Act 4 — Geometry, led by the agent, built by both. Third construction.
// ---------------------------------------------------------------------------

const ACT_4: ReplayStep[] = [
  step({ say: "Let's move to geometry. Pick the Geometry tool and click three points for a triangle.", tool: 'set_viewport', input: camera(4140, 580), waitMs: 326 }),
  step({ humanNote: 'The learner picks Geometry; the GeoGebra-style toolbar appears; the cursor places A, B, C and closes the triangle.' }),
  step({ id: 'geoHuman4', tool: 'get_objects', input: { kinds: ['geometry'], limit: 1 }, optional: true }),
  step({
    id: 'geo4',
    say: 'Every mark I add depends on your three points.',
    tool: 'construct_geometry',
    input: {
      summary: 'Tutor completed the construction from the three points',
      bounds: { x: 4200, y: 640, width: 730, height: 560 },
      construct: true,
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
      name: 'Dependency order',
      duration: 4.64,
      tracks: [{ target: object({ objectId: { $ref: 'geo4.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 4.35, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw4.data.timelineId' }, action: 'play' }, waitMs: 4930 }),
  step({ say: 'Drag one point and everything follows. Let me show you with A.', tool: 'spotlight_objects', input: { ids: [{ $ref: 'geo4.changedIds.0' }], label: 'moving A', seconds: 2.17 }, optional: true, waitMs: 261 }),
  step({ tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: 41, y: -31 } }, waitMs: 391 }),
  step({ id: 'bary4', tool: 'visualize_concept', input: { concept: 'barycentric', bounds: { x: 5130, y: 640, width: 730, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'bary4.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 424 }),
  step({
    id: 'drawBary4',
    tool: 'create_timeline',
    input: {
      name: 'Barycentric draw-in',
      duration: 3.8,
      tracks: [{ target: object({ objectId: { $ref: 'bary4.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 3.8, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'drawBary4.data.timelineId' }, action: 'play' }, waitMs: 4200 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'bary4.changedIds.0' }], label: 'P', seconds: 2.9 }, optional: true, waitMs: 326 }),
  step({
    say: 'P is a weighted average of A, B and C. Those weights can be anything that sums to one. Like attention weights.',
    tool: 'set_barycentric_weights',
    input: { objectId: { $ref: 'bary4.changedIds.0' }, preset: 'attention' },
    optional: true,
    waitMs: 457,
  }),
  step({ say: 'Same decimals as the attention card. Now I move A by tool and P follows the same rule.', tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: -12, y: 10 } }, waitMs: 391 }),
]

// ---------------------------------------------------------------------------
// Act 5 — Parity beats. The agent tidies the page into a lesson sheet.
// ---------------------------------------------------------------------------

const ACT_5: ReplayStep[] = [
  step({ say: 'Let me take a clean piece of canvas for this.', tool: 'set_viewport', input: camera(6000, 560), waitMs: 420 }),
  step({
    id: 'box5',
    say: 'Let me box the three acts.',
    tool: 'create_shape',
    input: {
      summary: 'Tutor boxed Acts 1 and 2',
      shape: 'polygon', fill: 'rgba(124, 92, 255, 0.06)', stroke: PURPLE, strokeWidth: 2,
      points: [{ x: 100, y: 180 }, { x: 2060, y: 180 }, { x: 2060, y: 1340 }, { x: 100, y: 1340 }],
    },
    calls: [{
      id: 'ellipse5',
      tool: 'create_shape',
      input: { summary: 'Tutor ringed Act 3', shape: 'ellipse', fill: 'none', stroke: PURPLE, strokeWidth: 2, bounds: { x: 3150, y: 590, width: 900, height: 660 } },
    }],
    waitMs: 391,
  }),
  step({ humanNote: 'The learner resizes the ellipse with its handles and rotates it slightly.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ellipse5.data.objectId' }], label: 'match your stroke', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({ tool: 'edit_shape', input: { objectId: { $ref: 'ellipse5.data.objectId' }, stroke: GRAPHITE, strokeWidth: 3 }, waitMs: 326 }),
  step({
    tool: 'update_objects',
    input: { summary: 'Tutor matched the box to your stroke', updates: [{ id: { $ref: 'box5.data.objectId' }, patch: { stroke: GRAPHITE, strokeWidth: 3 } }] },
    waitMs: 261,
  }),
  step({
    say: 'Both boxes selected in one atomic batch, same reducer you use.',
    tool: 'apply_actions',
    input: { summary: 'Tutor selected the lesson sheet', operations: [{ type: 'select', ids: [{ $ref: 'box5.data.objectId' }, { $ref: 'ellipse5.data.objectId' }] }] },
    waitMs: 391,
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
        bounds: { x: 2000, y: 820, width: 200, height: 200 },
        rotation: 0, opacity: 1, color: GRAPHITE,
      }],
    },
    waitMs: 326,
  }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_arrow'], label: 'tail → bin 2', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({ say: "I'll point the tail at the exact bin.", tool: 'set_arrow', input: { objectId: 'replay_arrow', from: { x: 18, y: 168 }, color: PURPLE }, optional: true, waitMs: 326 }),
  step({ humanNote: 'The learner highlights the softmax row.' }),
  step({
    id: 'glow5',
    say: 'Same colour on the matching barycentric weights.',
    tool: 'draw_ink',
    input: { mode: 'highlighter', color: HIGHLIGHT, width: 18, construct: true, strokes: [[{ x: 5200, y: 1080 }, { x: 5600, y: 1080 }]] },
    waitMs: 220,
  }),
  step({
    id: 'glowdraw5',
    tool: 'create_timeline',
    input: {
      name: 'Highlighter sweep',
      duration: 1.2,
      tracks: [{ target: object({ objectId: { $ref: 'glow5.data.objectId' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 1.2, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'glowdraw5.data.timelineId' }, action: 'play' }, waitMs: 1500 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'glow5.data.objectId' }], label: 'too wide, deleting', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({ say: 'Too wide. Deleting it, like you would.', tool: 'delete_objects', input: { summary: 'Tutor deleted its highlight', ids: [{ $ref: 'glow5.data.objectId' }] }, waitMs: 326 }),
  step({ humanNote: 'The learner erases a stray stroke.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'mark1.data.objectId' }], label: 'my circle', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({ tool: 'erase_ink', input: { ids: [{ $ref: 'mark1.data.objectId' }] }, optional: true, waitMs: 391 }),
  // No tool undo here on purpose: the capture pauses the replay on this line and the
  // LEARNER undoes it, cursor travelling to the rail's Undo button. The film claimed
  // "one undo brings it back" while nothing was ever seen to be clicked.
  step({ say: 'Everything I do is in your history. Undo works on me too.', waitMs: 300 }),
  step({ humanNote: 'The learner clicks Undo in the rail; the circle the tutor erased comes straight back.' }),
]

// ---------------------------------------------------------------------------
// Act 6 — Simplex and partitions. Fourth and fifth constructions.
// ---------------------------------------------------------------------------

const ACT_6: ReplayStep[] = [
  step({ say: 'More space. Panning to the empty strip below.', tool: 'set_viewport', input: camera(7000, 580), waitMs: 326 }),
  step({ id: 'simplex6', tool: 'visualize_concept', input: { concept: 'simplex', bounds: { x: 7060, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'simplex6.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 424 }),
  step({
    id: 'draw6',
    tool: 'create_timeline',
    input: {
      name: 'Tetrahedron sweep',
      duration: 6.52,
      tracks: [
        { target: object({ objectId: { $ref: 'simplex6.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 2.9, value: 1 }] },
        { target: object({ objectId: { $ref: 'simplex6.changedIds.0' } }, 'section'), keyframes: [{ time: 2.9, value: 0.5 }, { time: 6.09, value: 0.18 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw6.data.timelineId' }, action: 'play' }, waitMs: 6815 }),
  step({ say: 'Four weights instead of three: same simplex idea, one dimension up. The section plane at δ = 0.18 holds your triangle.', tool: 'spotlight_objects', input: { ids: [{ $ref: 'simplex6.changedIds.0' }], label: 'δ = 0.18', seconds: 2.17 }, optional: true, waitMs: 220 }),
  step({ tool: 'set_simplex_view', input: { objectId: { $ref: 'simplex6.changedIds.0' }, section: 0.18, denominator: 5 }, waitMs: 457 }),
  step({ id: 'parts6', say: 'Count the lattice tuples and you are counting partitions.', tool: 'visualize_concept', input: { concept: 'partitions', bounds: { x: 8060, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'parts6.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 424 }),
  step({
    id: 'drawParts6',
    tool: 'create_timeline',
    input: {
      name: 'Partition table reveal',
      duration: 4.4,
      tracks: [
        { target: object({ objectId: { $ref: 'parts6.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 4.4, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'drawParts6.data.timelineId' }, action: 'play' }, waitMs: 4800 }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, finiteCutoff: 19, selectedN: 14, revealTheorem: false }, waitMs: 522 }),
  step({ humanNote: 'The learner drags the cutoff slider.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'parts6.changedIds.0' }], label: 'Ramanujan', seconds: 2.17 }, optional: true, waitMs: 220 }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, revealTheorem: true }, waitMs: 391 }),
  step({ say: "I can verify cases. I can't prove the theorem, and the card says so.", waitMs: 587 }),
]

// ---------------------------------------------------------------------------
// Act 7 — Matrix (sixth construction) and the rest of the rail.
// ---------------------------------------------------------------------------

const ACT_7: ReplayStep[] = [
  step({ say: 'Last construction. Panning right.', tool: 'set_viewport', input: camera(9000, 580), waitMs: 326 }),
  step({ humanNote: 'The learner picks Matrix → 2 × 2 and types values into the grid.' }),
  step({ id: 'matrix7', tool: 'visualize_concept', input: { concept: 'matrix-transform', bounds: { x: 9060, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'matrix7.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 424 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'matrix7.changedIds.2' }], label: 'shear', seconds: 2.17 }, optional: true, waitMs: 261 }),
  step({ say: 'A shear: one off-diagonal entry.', tool: 'set_matrix_cells', input: { objectId: { $ref: 'matrix7.changedIds.2' }, cells: [{ row: 0, column: 1, value: 1.2 }] }, waitMs: 261 }),
  step({
    id: 'draw7',
    tool: 'create_timeline',
    input: {
      name: 'Lattice sweep',
      duration: 4.35,
      tracks: [
        { target: object({ objectId: { $ref: 'matrix7.changedIds.2' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 3.6, value: 1 }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.0' } }, 'to'), keyframes: [{ time: 1.16, value: [1, 0] }, { time: 4.06, value: [2, 1] }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.1' } }, 'to'), keyframes: [{ time: 1.16, value: [0, 1] }, { time: 4.06, value: [-1, 2] }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw7.data.timelineId' }, action: 'play' }, waitMs: 4640 }),
  step({ say: 'Same idea as W_Q: a matrix moves every vector at once.', waitMs: 457 }),
  step({ humanNote: 'The learner drags a basis vector; the cells update.' }),
  step({ humanNote: 'The learner double-clicks the explanation note and edits a word.' }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_bins_note'], label: 'one word', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({
    say: 'One word in my note, retyped.',
    tool: 'edit_text',
    input: { objectId: 'replay_bins_note', text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs become the scores softmax will see.', typewriter: true, typewriterMs: 2320 },
    optional: true,
    waitMs: 261,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'graph2.changedIds.0' }], label: 'one term', seconds: 1.74 }, optional: true, waitMs: 220 }),
  step({
    say: 'And one LaTeX term, live.',
    tool: 'edit_equation',
    input: { objectId: { $ref: 'graph2.changedIds.0' }, latex: '\\frac{x^{a-1}e^{-x}}{\\Gamma(a)},\\quad a=5.5', typewriter: true, typewriterMs: 2320 },
    optional: true,
    waitMs: 326,
  }),
  step({ humanNote: 'The learner undoes and redoes both edits from the rail.' }),
  step({ humanNote: 'The learner draws a Frame around the whole page and titles it Pipeline.' }),
  step({ id: 'project7', say: 'A second project, so you can see the isolation.', tool: 'create_project', input: { title: 'Pipeline scratch', templateId: 'gamma-lab' }, optional: true, waitMs: 261 }),
  step({ tool: 'open_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 457 }),
  step({ tool: 'open_scene', input: { scene: 'gamma-clinic' }, optional: true, waitMs: 457 }),
  step({ say: 'Untouched. Back we go.', tool: 'open_project', input: { projectId: { $ref: 'projects0.data.activeProjectId' } }, optional: true, waitMs: 522 }),
  step({ tool: 'delete_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 261 }),
]

// ---------------------------------------------------------------------------
// Act 8 — Close.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Act 7b — The concept map. Every widget is joined to the one it produced, with the
// reason written on the join. Without this the pull-back is scattered cards; with it
// the same shot reads as one argument that happens to be spread across a canvas.
// ---------------------------------------------------------------------------

const ACT_7B: ReplayStep[] = [
  step({
    id: 'map7b',
    say: 'None of these are separate demos. Let me draw what connects them.',
    tool: 'create_objects',
    input: {
      summary: 'Tutor drew the concept map across the whole page',
      objects: [
      { id: 'map_link_0', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 2000, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_0', kind: 'text', text: 'log-masses are the logits', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 1970, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_1', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 3000, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_1', kind: 'text', text: 'same head, now trained', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 2970, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_2', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 4000, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_2', kind: 'text', text: 'weights that sum to one', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 3970, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_3', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 4930, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_3', kind: 'text', text: 'a point from three weights', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 4900, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_4', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 1192, y: 40 },
        bounds: { x: 5860, y: 880, width: 1200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_4', kind: 'text', text: 'one dimension up', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 5830, y: 800, width: 1260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_5', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 7860, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_5', kind: 'text', text: 'lattice points count partitions', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 7830, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_link_6', kind: 'arrow', color: PURPLE, from: { x: 8, y: 40 }, to: { x: 192, y: 40 },
        bounds: { x: 8860, y: 880, width: 200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_6', kind: 'text', text: 'one matrix moves all of it', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 8830, y: 800, width: 260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      ],
    },
    waitMs: 840,
  }),
  step({
    say: 'A density became scores, scores became attention, attention became a point in a triangle, and the triangle lifted into a simplex.',
    tool: 'set_viewport',
    // A 0.18 pull-back put the whole 10,000px strip on screen at once, so every widget
    // -- geometry, simplex, attention, the lot -- rendered simultaneously with no
    // virtualisation and the renderer stopped answering. Show the chain, not the map.
    input: { viewport: { x: -1500, y: 120, zoom: 0.45 } },
    waitMs: 1920,
  }),
]

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
  steps: [...ACT_0, ...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4, ...ACT_5, ...ACT_6, ...ACT_7, ...ACT_7B, ...ACT_8],
}
