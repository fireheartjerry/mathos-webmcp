import type { ReplayScript, ReplayStep } from './types'

/**
 * The film v2 choreography (docs/video/FILM_V2_STORY.md, draft 2, Act 0 → Act 8).
 * Every line is scripted; every tool call goes through the real tool object.
 *
 * Grammar the whole script obeys:
 * - `spotlight_objects` runs before every change to an existing object.
 * - `set_viewport` pulls back before every new region is built; focus_objects
 *   tightens the shot only after the new object exists.
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
 *   Act 7  matrix                   x 7060..7860
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
 * Staging camera that shows the world region whose top-left corner is (x, y).
 *
 * The card used to arrive at 1.25x before focus_objects could measure it. At that
 * scale an 800px visualizer is wider than the lane between the left rail and the
 * replay console, so its first frames were born underneath the console and only
 * became legible after the camera corrected itself. Pull back first: the complete
 * card now enters a clear visual plane, then focus_objects makes the precise shot.
 */
const STAGING_ZOOM = 0.82
const LEFT_CHROME = 300
const TOP_CHROME = 120
const camera = (x: number, y: number) => ({ viewport: { x: LEFT_CHROME - x * STAGING_ZOOM, y: TOP_CHROME - y * STAGING_ZOOM, zoom: STAGING_ZOOM } })

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
      waitMs: 276,
    }),
    step({ tool: 'focus_objects', input: { ids: [`${id}_frame_0`, `${id}_frame_${cards.length - 1}`], emphasis: 'feature' }, optional: true, waitMs: 338 }),
    step({ tool: 'focus_objects', input: { ids: [`${id}_frame_1`], emphasis: 'detail', anchor: 'cursor' }, optional: true, waitMs: 369 }),
  ]
}
/**
 * The one-line reason this scene follows the last one, written above it as live math.
 *
 * The reviewer's complaint was that the widgets felt disconnected — each scene arrives
 * and nobody says what produced it. The concept map answers that at the end; this
 * answers it at the moment of arrival, in the notation the scene is about. It is
 * created empty and then typed, so the link is *derived* on camera rather than
 * appearing pre-written, and it is a plain equation object so no new tool is needed.
 */
const LINEAGE_H = 78
const LINEAGE_GAP = 26
const liveLineage = (
  id: string,
  scene: { x: number; y: number; width: number },
  latex: string,
  typewriterMs = 1180,
): ReplayStep[] => [
  // Stage every scene here rather than relying on its enclosing act. Attention →
  // training and geometry → barycentric each contain two visualizers; when the pan
  // lived only at the act boundary, the second card was born behind Agent Replay.
  step({ tool: 'set_viewport', input: camera(scene.x - 60, scene.y - 140), waitMs: 167 }),
  step({
    tool: 'create_objects',
    input: {
      summary: `Tutor opened the ${id} lineage line`,
      objects: [{
        // create_objects refuses empty latex, so seed an invisible phantom: the line
        // still arrives blank on camera and the typewriter writes over it.
        id, kind: 'equation', latex: '\\phantom{x}', color: PURPLE,
        bounds: { x: scene.x, y: scene.y - LINEAGE_H - LINEAGE_GAP, width: scene.width, height: LINEAGE_H },
        rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    waitMs: 110,
  }),
  step({ tool: 'edit_equation', input: { objectId: id, latex, typewriter: true, typewriterMs }, waitMs: 120 }),
]

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
    waitMs: 200,
  }),
]

// ---------------------------------------------------------------------------
// Act 1 — The Gamma recurrence. Human writes, agent reads and marks.
// ---------------------------------------------------------------------------

const ACT_1: ReplayStep[] = [
  step({ humanNote: 'The learner writes Γ(9/2) = ∫x^{7/2}e^{−x}dx = [−x^{7/2}e^{−x}]₀^∞ − (7/2)Γ(7/2) by hand, sign error included.' }),
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
  step({ tool: 'explain_object', input: { objectId: { $ref: 'ink1.data.objects.0.id' } }, optional: true, waitMs: 135 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ink1.data.objects.0.id' }], label: 'the sign', seconds: 2.9 }, optional: true, waitMs: 301 }),
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
    waitMs: 135,
  }),
  // The circle is created unbuilt, so a timeline draws it the way a hand would.
  step({
    id: 'markdraw1',
    tool: 'create_timeline',
    input: {
      name: 'Circle the sign',
      duration: 1.88,
      tracks: [{ target: object({ objectId: { $ref: 'mark1.data.objectId' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 1.88, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'markdraw1.data.timelineId' }, action: 'play' }, waitMs: 2375 }),
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
    waitMs: 135,
  }),
  step({
    say: "I'll type it in. Watch the caret.",
    tool: 'edit_equation',
    input: { objectId: 'replay_live_recurrence', latex: RECURRENCE_LATEX, typewriter: true, typewriterMs: 2700 },
    waitMs: 135,
  }),
  // The equation is live now, so inspect_math has something it accepts. The ledger
  // counts a tool as used only on a SUCCESSFUL completion, so this call is what
  // takes the on-screen counter to a true 48/48.
  step({
    say: 'Now there is live math to read.',
    tool: 'inspect_math',
    input: { objectId: 'replay_live_recurrence' },
    waitMs: 167,
  }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_live_recurrence'], label: 'scale ×1.6', seconds: 2.17 }, optional: true, waitMs: 167 }),
  step({
    tool: 'transform_objects',
    input: { summary: 'Tutor scaled the live equation up', ids: ['replay_live_recurrence'], scale: 1.6 },
    waitMs: 200,
  }),
  step({ humanNote: 'The learner grabs the same corner handle, shrinks the equation back a little, rotates it a few degrees and back.' }),
  step({ say: 'Same handles I just used.', waitMs: 234 }),
]

// ---------------------------------------------------------------------------
// Act 2 — The Gamma density. The first 3Blue1Brown construction.
// ---------------------------------------------------------------------------

const ACT_2: ReplayStep[] = [
  step({ id: 'act2', say: 'I need space below.', waitMs: 167 }),
  ...liveLineage('lineage_density', { x: 1200, y: 640, width: 800 }, '\\Gamma(a)\;\\longrightarrow\;g_a(x)=\\frac{x^{a-1}e^{-x}}{\\Gamma(a)}'),
  step({
    id: 'graph2',
    say: "Your corrected recurrence normalises into a density. I'll build it from nothing.",
    tool: 'graph_expression',
    input: { latex: '0', bounds: { x: 1200, y: 640, width: 800, height: 560 }, construct: true },
    waitMs: 167,
  }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_density', { $ref: 'graph2.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 194 }),
  step({
    tool: 'set_graph',
    input: {
      objectId: { $ref: 'graph2.changedIds.1' },
      latex: GAMMA_LATEX, typewriter: true, typewriterMs: 2900,
      parameters: { a: 4.5 }, xDomain: [0, 12], yDomain: [0, 0.25],
      visualization: 'gamma-density', binEdges: [0, 2.5, 5, 12], shadeIntegral: [0, 0.01],
    },
    waitMs: 135,
  }),
  step({
    id: 'draw2',
    tool: 'create_timeline',
    input: {
      name: 'Density draw-in',
      duration: 5.2,
      tracks: [
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 2.8, value: 1 }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 2.8, value: [0, 0.01] }, { time: 4.4, value: [0, 4.4] }] },
        { target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'opacity'), keyframes: [{ time: 0, value: 0 }, { time: 1.45, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw2.data.timelineId' }, action: 'play' }, waitMs: 4900 }),
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
    waitMs: 167,
  }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'graph2.changedIds.0' }, { $ref: 'graph2.changedIds.1' }], label: 'masses → logs → softmax', seconds: 2.17 }, optional: true, waitMs: 135 }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_bins_note'], label: 'one word', seconds: 1.74 }, optional: true, waitMs: 135 }),
  step({
    say: 'One word in the explanation, retyped where it belongs.',
    tool: 'edit_text',
    input: { objectId: 'replay_bins_note', text: 'Total area is 1. The three bins hold w₁, w₂, w₃; their logs become the scores softmax will see.', typewriter: true, typewriterMs: 2320 },
    optional: true,
    waitMs: 135,
  }),
  step({
    id: 'bridge2',
    say: 'Here is the bridge.',
    tool: 'create_timeline',
    input: {
      name: 'Masses to softmax',
      duration: 5.0,
      tracks: [
        {
          target: object({ objectId: { $ref: 'graph2.changedIds.0' } }, 'latex'),
          keyframes: [
            { time: 0, value: GAMMA_LATEX }, { time: 0.95, value: BRIDGE_MASS_LATEX }, { time: 2.3, value: BRIDGE_LOG_LATEX },
            { time: 3.65, value: BRIDGE_SOFTMAX_LATEX }, { time: 4.9, value: GAMMA_LATEX },
          ],
        },
        { target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'shadeIntegral'), keyframes: [{ time: 0, value: [0, 4.4] }, { time: 1.25, value: [0, 2.5] }, { time: 2.5, value: [2.5, 5] }, { time: 3.75, value: [5, 12] }, { time: 5.0, value: [0, 4.4] }] },
      ],
    },
  }),
  step({
    tool: 'add_keyframes',
    input: {
      timelineId: { $ref: 'bridge2.data.timelineId' },
      target: object({ objectId: { $ref: 'graph2.changedIds.1' } }, 'parameters.a'),
      keyframes: [{ time: 0, value: 5.5 }, { time: 2.5, value: 4.5 }, { time: 5.0, value: 5.5 }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'bridge2.data.timelineId' }, action: 'play' }, waitMs: 5250 }),
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
  step({ say: 'Three cards, one idea each, all hanging off the thing that produced them.', waitMs: 216 }),
]

// ---------------------------------------------------------------------------
// Act 3 — Attention. The agent edits a cell while teaching; the human trains.
// ---------------------------------------------------------------------------

const ACT_3: ReplayStep[] = [
  step({ say: 'Over to attention. Panning right.', waitMs: 167 }),
  ...liveLineage('lineage_attention', { x: 2200, y: 640, width: 800 }, '(w_1,w_2,w_3)\;\\xrightarrow{\;\\log,\;\\operatorname{softmax}\;}\;\\alpha'),
  step({ id: 'att3', tool: 'visualize_concept', input: { concept: 'attention', bounds: { x: 2200, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_attention', { $ref: 'att3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 216 }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }] }, waitMs: 135 }),
  step({
    id: 'draw3',
    tool: 'create_timeline',
    input: {
      name: 'Attention card draw-in',
      duration: 4.0,
      tracks: [
        { target: object({ objectId: { $ref: 'att3.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 4.0, value: 1 }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw3.data.timelineId' }, action: 'play' }, waitMs: 4250 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'att3.changedIds.0' }], label: 'W_Q[0][0]', seconds: 3.62 }, optional: true, waitMs: 234 }),
  step({
    say: 'W_Q turns each token into a query. Raising this entry leans the query toward the first embedding dimension, so the dot products with the keys change, and so do the weights.',
    tool: 'set_attention_weight',
    input: { objectId: { $ref: 'att3.changedIds.0' }, matrix: 'wq', row: 0, column: 0, value: 1.4 },
    waitMs: 301,
  }),
  step({ say: "Weights still sum to one. That's the softmax doing its job.", waitMs: 301 }),
  ...liveLineage('lineage_training', { x: 3200, y: 640, width: 800 }, '\\alpha^{(0)}\;\\xrightarrow{\;-\\eta\\nabla L\;}\;\\alpha^{(13)}'),
  step({ id: 'train3', tool: 'visualize_concept', input: { concept: 'training', bounds: { x: 3200, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_training', { $ref: 'train3.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 135 }),
  step({
    id: 'traindraw3',
    tool: 'create_timeline',
    input: {
      name: 'Training card build',
      duration: 3.7,
      tracks: [{ target: object({ objectId: { $ref: 'train3.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 3.7, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'traindraw3.data.timelineId' }, action: 'play' }, waitMs: 3500 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'train3.changedIds.0' }], label: 'one step', seconds: 2.17 }, optional: true, waitMs: 135 }),
  // One step, undone, then a real training run. A single step read as an animation;
  // watching loss fall across thirteen of them is what makes it obviously arithmetic.
  step({ say: 'One step from me, then I take it back.', tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 234 }),
  step({ tool: 'step_history', input: { direction: 'undo' }, optional: true, waitMs: 167 }),
  step({ say: 'Undone. Now let us actually train it. One step at a time first.', waitMs: 218 }),
  // SEQUENTIAL, never grouped. `calls` fires with Promise.all, so five parallel
  // train_model_step calls all read the same state: four duplicated one another and
  // the fifth failed red on camera with "Tutor is finishing another action". The
  // model reached step 3 while the voice claimed thirteen.
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 271 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 250 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 250 }),
  step({
    say: 'Loss falls and the target probability rises, every time. A step only commits when both hold.',
    tool: 'explain_object', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 396,
  }),
  step({ say: 'Now five in a row.', waitMs: 157 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ say: 'And five more. The curve is flattening, which is what convergence looks like.', waitMs: 167 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ tool: 'train_model_step', input: { objectId: { $ref: 'train3.changedIds.0' } }, optional: true, waitMs: 224 }),
  step({ say: 'Thirteen honest gradient steps on the parameters you can see. Nothing here is a canned animation.', waitMs: 468 }),
]

// ---------------------------------------------------------------------------
// Act 4 — Geometry, led by the agent, built by both. Third construction.
// ---------------------------------------------------------------------------

const ACT_4: ReplayStep[] = [
  step({ say: "Let's move to geometry. Pick the Geometry tool and click three points for a triangle.", waitMs: 167 }),
  step({ humanNote: 'The learner picks Geometry; the GeoGebra-style toolbar appears; the cursor places A, B, C and closes the triangle.' }),
  step({ id: 'geoHuman4', tool: 'get_objects', input: { kinds: ['geometry'], limit: 1 }, optional: true }),
  ...liveLineage('lineage_geometry', { x: 4200, y: 640, width: 730 }, '\\alpha_1+\\alpha_2+\\alpha_3=1\;\\longrightarrow\;P=\\textstyle\\sum_i \\alpha_i A_i'),
  step({
    id: 'geo4',
    say: 'Every mark I add depends on your three points.',
    tool: 'construct_geometry',
    input: {
      summary: 'Tutor completed the construction from the three points',
      bounds: { x: 4200, y: 640, width: 730, height: 560 },
      construct: true,
      primitives: [
        { kind: 'point', id: 'A', at: { x: 132, y: 452 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 604, y: 468 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 425, y: 104 }, label: 'C', draggable: true },
        { kind: 'polygon', id: 'ABC', points: ['A', 'B', 'C'] },
        // c1 and c2 used to share the centre O, so they were CONCENTRIC and the spoken
        // claim that they are tangent was false. Every mark below is derived, so the
        // tangency and the T-I-M' collinearity hold by construction and survive a drag.
        { kind: 'incenter', id: 'I', of: ['A', 'B', 'C'], label: 'I' },
        { kind: 'circumcircle', id: 'omega', of: ['A', 'B', 'C'] },
        { kind: 'arcMidpoint', id: 'M', of: ['B', 'C', 'A'], notContaining: 'A', label: 'M' },
        { kind: 'arcMidpoint', id: 'M_major', of: ['B', 'C', 'A'], containing: 'A', label: 'M′' },
        { kind: 'mixtilinearIncircle', id: 'omega_A', of: ['A', 'B', 'C'], vertex: 'A' },
        { kind: 'circleTangency', id: 'T', circles: ['omega', 'omega_A'], label: 'T' },
        { kind: 'segment', id: 'AI', from: 'A', to: 'I' },
        { kind: 'segment', id: 'AM', from: 'A', to: 'M' },
        { kind: 'segment', id: 'AT', from: 'A', to: 'T' },
      ],
    },
  }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_geometry', { $ref: 'geo4.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 194 }),
  step({
    id: 'draw4',
    tool: 'create_timeline',
    input: {
      name: 'Dependency order',
      duration: 4.0,
      tracks: [{ target: object({ objectId: { $ref: 'geo4.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 3.8, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw4.data.timelineId' }, action: 'play' }, waitMs: 3600 }),
  step({ say: 'Drag one point and everything follows. Let me show you with A.', tool: 'spotlight_objects', input: { ids: [{ $ref: 'geo4.changedIds.0' }], label: 'moving A', seconds: 2.17 }, optional: true, waitMs: 135 }),
  step({ tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: 41, y: -31 } }, waitMs: 200 }),
  ...liveLineage('lineage_bary', { x: 5130, y: 640, width: 730 }, '\\alpha\;\\longrightarrow\;P=(\\alpha:\\beta:\\gamma),\\quad \\frac{BD}{DC}\\cdot\\frac{CE}{EA}\\cdot\\frac{AF}{FB}=1'),
  step({ id: 'bary4', tool: 'visualize_concept', input: { concept: 'barycentric', bounds: { x: 5130, y: 640, width: 730, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_bary', { $ref: 'bary4.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 216 }),
  step({
    id: 'drawBary4',
    tool: 'create_timeline',
    input: {
      name: 'Barycentric draw-in',
      duration: 3.35,
      tracks: [{ target: object({ objectId: { $ref: 'bary4.changedIds.0' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 3.35, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'drawBary4.data.timelineId' }, action: 'play' }, waitMs: 4150 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'bary4.changedIds.0' }], label: 'P', seconds: 2.9 }, optional: true, waitMs: 167 }),
  step({
    say: 'P is a weighted average of A, B and C. Those weights can be anything that sums to one. Like attention weights.',
    tool: 'set_barycentric_weights',
    input: { objectId: { $ref: 'bary4.changedIds.0' }, preset: 'attention' },
    optional: true,
    waitMs: 234,
  }),
  step({ say: 'Same decimals as the attention card. Now I move A by tool and P follows the same rule.', tool: 'move_geometry_point', input: { objectId: { $ref: 'geo4.changedIds.0' }, pointId: 'A', by: { x: -12, y: 10 } }, waitMs: 200 }),
]

// ---------------------------------------------------------------------------
// Act 5 — Parity beats. The agent tidies the page into a lesson sheet.
// ---------------------------------------------------------------------------

const ACT_5: ReplayStep[] = [
  step({ say: 'Let me take a clean piece of canvas for this.', tool: 'set_viewport', input: camera(6000, 560), waitMs: 216 }),
  step({
    id: 'box5',
    say: 'Let me box the three acts.',
    tool: 'create_shape',
    input: {
      summary: 'Tutor boxed Acts 1 and 2',
      shape: 'polygon', fill: 'rgba(124, 92, 255, 0.06)', stroke: PURPLE, strokeWidth: 2,
      points: [{ x: 6100, y: 180 }, { x: 6760, y: 180 }, { x: 6760, y: 900 }, { x: 6100, y: 900 }],
    },
    calls: [{
      id: 'ellipse5',
      tool: 'create_shape',
      input: { summary: 'Tutor ringed Act 3', shape: 'ellipse', fill: 'none', stroke: PURPLE, strokeWidth: 2, bounds: { x: 6180, y: 960, width: 620, height: 380 } },
    }],
    waitMs: 200,
  }),
  step({ humanNote: 'The learner resizes the ellipse with its handles and rotates it slightly.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'ellipse5.data.objectId' }], label: 'match your stroke', seconds: 1.74 }, optional: true, waitMs: 135 }),
  step({ tool: 'edit_shape', input: { objectId: { $ref: 'ellipse5.data.objectId' }, stroke: GRAPHITE, strokeWidth: 3 }, waitMs: 167 }),
  step({
    tool: 'update_objects',
    input: { summary: 'Tutor matched the box to your stroke', updates: [{ id: { $ref: 'box5.data.objectId' }, patch: { stroke: GRAPHITE, strokeWidth: 3 } }] },
    waitMs: 135,
  }),
  step({
    say: 'Both boxes selected in one atomic batch, same reducer you use.',
    tool: 'apply_actions',
    input: { summary: 'Tutor selected the lesson sheet', operations: [{ type: 'select', ids: [{ $ref: 'box5.data.objectId' }, { $ref: 'ellipse5.data.objectId' }] }] },
    waitMs: 200,
  }),
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
        bounds: { x: 6260, y: 400, width: 420, height: 260 },
        rotation: 0, opacity: 1, color: GRAPHITE,
      }],
    },
    waitMs: 167,
  }),
  step({ humanNote: 'The learner watches the arrow; the tutor is about to aim it.' }),
  step({ tool: 'spotlight_objects', input: { ids: ['replay_arrow'], label: 'tail → bin 2', seconds: 1.74 }, optional: true, waitMs: 135 }),
  step({ say: "I'll point the tail at the exact bin.", tool: 'set_arrow', input: { objectId: 'replay_arrow', from: { x: 18, y: 168 }, color: PURPLE }, optional: true, waitMs: 167 }),
  step({ humanNote: 'The learner highlights the softmax row.' }),
  step({
    id: 'glow5',
    say: 'Same colour on the matching barycentric weights.',
    tool: 'draw_ink',
    input: { mode: 'highlighter', color: HIGHLIGHT, width: 18, construct: true, strokes: [[{ x: 6220, y: 1180 }, { x: 6620, y: 1180 }]] },
    waitMs: 135,
  }),
  step({
    id: 'glowdraw5',
    tool: 'create_timeline',
    input: {
      name: 'Highlighter sweep',
      duration: 1.5,
      tracks: [{ target: object({ objectId: { $ref: 'glow5.data.objectId' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0 }, { time: 1.5, value: 1 }] }],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'glowdraw5.data.timelineId' }, action: 'play' }, waitMs: 1875 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'glow5.data.objectId' }], label: 'too wide, deleting', seconds: 1.74 }, optional: true, waitMs: 135 }),
  step({ say: 'Too wide. Deleting it, like you would.', tool: 'delete_objects', input: { summary: 'Tutor deleted its highlight', ids: [{ $ref: 'glow5.data.objectId' }] }, waitMs: 167 }),
  step({ humanNote: 'The learner erases a stray stroke.' }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'mark1.data.objectId' }], label: 'my circle', seconds: 1.74 }, optional: true, waitMs: 135 }),
  step({ tool: 'focus_objects', input: { ids: [{ $ref: 'mark1.data.objectId' }], emphasis: 'feature' }, optional: true, waitMs: 314 }),
  step({ tool: 'erase_ink', input: { ids: [{ $ref: 'mark1.data.objectId' }] }, optional: true, waitMs: 200 }),
  // No tool undo here on purpose: the capture pauses the replay on this line and the
  // LEARNER undoes it, cursor travelling to the rail's Undo button. The film claimed
  // "one undo brings it back" while nothing was ever seen to be clicked.
  step({ say: 'Everything I do is in your history. Undo works on me too.', waitMs: 153 }),
  step({ humanNote: 'The learner clicks Undo in the rail; the circle the tutor erased comes straight back.' }),
  step({ say: 'There it is again.', waitMs: 673 }),
  step({ say: 'One history. Your undo reaches my edits, and mine reach yours.', waitMs: 1100 }),
]

// ---------------------------------------------------------------------------
// Act 6 — Simplex and partitions. Fourth and fifth constructions.
// ---------------------------------------------------------------------------

const ACT_6: ReplayStep[] = [
  // Show the two compact checks together. They used to run at x/y -6200, leaving the
  // picture stuck on an enormous close-up of the opening equation while the console
  // talked about simplex and partitions. One establishing camera now holds both cards.
  step({ say: 'Two compact checks, together.', tool: 'set_viewport', input: camera(8000, 500), waitMs: 216 }),
  step({
    id: 'simplex6',
    say: 'Four weights become one point in the simplex.',
    tool: 'visualize_concept',
    input: { concept: 'simplex', bounds: { x: 8060, y: 640, width: 620, height: 500 } },
    optional: true, waitMs: 152,
  }),
  step({ tool: 'set_simplex_view', input: { objectId: { $ref: 'simplex6.changedIds.0' }, section: 0.18, denominator: 5 }, optional: true, waitMs: 174 }),
  step({
    id: 'parts6',
    tool: 'visualize_concept',
    input: { concept: 'partitions', bounds: { x: 8060, y: 1240, width: 620, height: 500 } },
    optional: true, waitMs: 152,
  }),
  step({ tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, finiteCutoff: 19, selectedN: 14, revealTheorem: false }, optional: true, waitMs: 174 }),
  step({
    say: 'I can verify Ramanujan for the finite cases. I cannot prove the theorem, and the card says so.',
    tool: 'set_partition_view', input: { objectId: { $ref: 'parts6.changedIds.0' }, revealTheorem: true },
    optional: true, waitMs: 302,
  }),
]

// ---------------------------------------------------------------------------
// Act 6b — Compatibility work happens in a disposable side room. These tools are
// real product surface, but they are not the conclusion of this live lesson. Keeping
// the reconstruction inside the scratch project also guarantees that its approval
// panel disappears when the main Pipeline project returns.
// ---------------------------------------------------------------------------

const ACT_6B: ReplayStep[] = [
  step({ id: 'project7', say: 'One disposable side room checks the import without touching the live lesson.', tool: 'create_project', input: { title: 'Pipeline scratch', templateId: 'gamma-lab' }, optional: true, waitMs: 135 }),
  step({ tool: 'open_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 234 }),
  step({ tool: 'open_scene', input: { scene: 'gamma-clinic' }, optional: true, waitMs: 234 }),
  step({
    id: 'compatImage8',
    tool: 'create_objects',
    input: {
      summary: 'Prepared the visible scratch import check',
      objects: [{
        id: 'replay_compat_label', kind: 'text', text: 'Disposable import check',
        color: PURPLE, fontSize: 18,
        bounds: { x: -350, y: 420, width: 250, height: 40 }, rotation: 0, author: 'agent', opacity: 1,
      }],
    },
    optional: true,
  }),
  step({
    say: 'An imported worksheet can become live math here while the main lesson stays untouched.',
    tool: 'reconstruct_problem',
    input: {
      sourceImageId: 'source',
      proposedObjects: [{
        id: 'replay_compat_equation', kind: 'equation', latex: '\\Gamma(x+1)=x\\Gamma(x)', color: GRAPHITE,
        bounds: { x: -815, y: 415, width: 360, height: 64 }, rotation: 0, author: 'agent', opacity: 1,
      }],
      uncertainObjectIds: [],
    },
    optional: true,
  }),
  step({
    tool: 'audit_reconstruction',
    input: { auditSummary: 'Checked the scratch import against its source.' },
    optional: true,
  }),
  step({ say: 'Scratch checked. Back to the shared canvas.', tool: 'open_project', input: { projectId: { $ref: 'projects0.data.activeProjectId' } }, optional: true, waitMs: 267 }),
  step({ tool: 'delete_project', input: { projectId: { $ref: 'project7.data.projectId' } }, optional: true, waitMs: 135 }),
]

const ACT_7: ReplayStep[] = [
  step({ say: 'Last construction. Panning right.', waitMs: 167 }),
  step({ humanNote: 'The learner picks Matrix → 2 × 2 and types values into the grid.' }),
  ...liveLineage('lineage_matrix', { x: 7060, y: 640, width: 800 }, 'W_Q:v\\mapsto W_Qv\;\\longrightarrow\;A:v\\mapsto Av'),
  step({ id: 'matrix7', tool: 'visualize_concept', input: { concept: 'matrix-transform', bounds: { x: 7060, y: 640, width: 800, height: 560 }, construct: true } }),
  step({ tool: 'focus_objects', input: { ids: ['lineage_matrix', { $ref: 'matrix7.changedIds.0' }], emphasis: 'feature' }, optional: true, waitMs: 216 }),
  step({ tool: 'spotlight_objects', input: { ids: [{ $ref: 'matrix7.changedIds.2' }], label: 'shear', seconds: 2.17 }, optional: true, waitMs: 135 }),
  step({ say: 'A shear: one off-diagonal entry.', tool: 'set_matrix_cells', input: { objectId: { $ref: 'matrix7.changedIds.2' }, cells: [{ row: 0, column: 1, value: 1.2 }] }, waitMs: 135 }),
  step({
    id: 'draw7',
    tool: 'create_timeline',
    input: {
      name: 'Lattice sweep',
      duration: 3.3,
      tracks: [
        { target: object({ objectId: { $ref: 'matrix7.changedIds.2' } }, 'drawProgress'), keyframes: [{ time: 0, value: 0, easing: 'easeInOut' }, { time: 2.8, value: 1 }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.0' } }, 'to'), keyframes: [{ time: 0.9, value: [1, 0] }, { time: 3.1, value: [2, 1] }] },
        { target: object({ objectId: { $ref: 'matrix7.changedIds.1' } }, 'to'), keyframes: [{ time: 0.9, value: [0, 1] }, { time: 3.1, value: [-1, 2] }] },
      ],
    },
  }),
  step({ tool: 'play_timeline', input: { timelineId: { $ref: 'draw7.data.timelineId' }, action: 'play' }, waitMs: 4050 }),
  step({ say: 'Same idea as W_Q: a matrix moves every vector at once.', waitMs: 234 }),
  step({ humanNote: 'The learner drags a basis vector; the cells update.' }),
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
        bounds: { x: 5860, y: 1380, width: 1200, height: 80 }, rotation: 0, author: 'agent', opacity: 1 },
      { id: 'map_label_4', kind: 'text', text: 'and one matrix moves all of it', color: PURPLE, fontSize: 15, presentation: 'typed',
        bounds: { x: 5830, y: 1300, width: 1260, height: 60 }, rotation: 0, author: 'agent', opacity: 1 },
      ],
    },
    waitMs: 430,
  }),
  step({
    say: 'A density became scores, scores became attention, attention became a point in a triangle, and the triangle lifted into a simplex.',
    tool: 'set_viewport',
    // A 0.18 pull-back put the whole 10,000px strip on screen at once, so every widget
    // -- geometry, simplex, attention, the lot -- rendered simultaneously with no
    // virtualisation and the renderer stopped answering. Show the chain, not the map.
    input: { viewport: { x: -1500, y: 120, zoom: 0.45 } },
    waitMs: 1315,
  }),
]

const ACT_8: ReplayStep[] = [
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
  // The concept-map pullback repeated create_objects and set_viewport after both had
  // already succeeded on camera. Cutting that complete beat preserves all 48 tools
  // while giving the final ledger enough room to be read below the three-minute cap.
  steps: [...ACT_0, ...ACT_1, ...ACT_2, ...ACT_3, ...ACT_4, ...ACT_5, ...ACT_6B, ...ACT_6, ...ACT_7, ...ACT_8],
}
