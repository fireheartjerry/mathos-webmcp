# Mathburst cinematic product film

**Status:** APPROVED by user on 2026-08-31  
**Target:** 2:42 maximum, 2560×1440, 60 fps  
**Narration:** deliberately deferred  
**Subject:** the real Mathburst product in every frame

## The film in one sentence

An ordinary handwritten mistake opens into a living mathematical universe—calculus,
attention geometry, and Olympiad constructions—while visible WebMCP calls prove that an
external tutor is not commenting on the work but inhabiting the same world.

## Cinematic thesis

The film must feel like one continuous journey through a single mathematical world. It is
not a feature reel, screen recording, or sequence of dashboard cuts. Every transition is
caused by mathematics already on the canvas: a circled term becomes an integral sign, graph
axes become a vector basis, a dot-product angle becomes a triangle angle, and the final
camera pullback reveals that every scene has occupied one shared world all along.

The learner is graphite. The tutor is purple. LaTeX is mathematical truth; handwriting is
intent, emphasis, and conversation. WebMCP calls are shown as restrained evidence attached
to visible consequences, never as a terminal or developer overlay.

## Shot plan

### 0:00–0:13 — Cold open: “show me where my reasoning breaks”

**Opening frame.** Macro view of ivory graph paper. A learner finishes the handwritten line
`2(x + 3) = 2x + 3`. The prompt sits beside the ink: “Don’t solve it. Show me where my
reasoning breaks.” There is no title card and no visible application chrome for the first
two seconds—only the living canvas.

**Action.** A purple tutor cursor enters from outside the frame. A tiny trace reads
`get_selection → get_objects`. The tutor circles the final `3`, strikes a short purple mark
beneath it, and writes one compact handwritten question: “What multiplies the 3?” The
learner writes `6`; the original expression remains visible and undoable.

**Camera.** Begin at roughly 180% product scale. Drift twelve pixels with the learner's last
stroke, then rack attention to the purple cursor through depth-by-opacity: surrounding ink
dims to 72%, never blurs. Pull back just enough at 0:10 to reveal the Mathburst wordmark,
Tutor attribution, and one activity entry.

**WebMCP proof.** The annotation is a real `create_objects` commit containing ink and text
objects. The activity rail attributes it to Tutor, and the learner's correction is a
separate human commit in the same history.

**Product capability required.** A seeded everyday-algebra scene; agent-authored ink,
circle, strike, and short handwritten note; visible author styling; a deterministic cold-open
camera target.

**Match transition.** The long purple curve of the circle continues across the canvas and
becomes the spine of an integral sign.

### 0:13–0:28 — Ink becomes semantic mathematics

**Frame.** The camera tracks right into a neighboring calculus frame where the learner has
written `∫₀¹ x eˣ dx`. The source looks handwritten for one beat.

**Action.** A compact `reconstruct_problem` trace appears. The handwritten expression lifts
into clean, editable LaTeX while the source ink remains faintly pinned beneath it. The tutor
double-checks the conversion; uncertain symbols briefly receive purple hairline brackets,
then resolve. The learner approves the clean conversion.

**Camera.** A 420 ms lateral track, followed by a 300 ms settle on the typeset integral. The
semantic equation should occupy at least one third of the frame height at the moment it
resolves.

**WebMCP proof.** `reconstruct_problem` proposes; `audit_reconstruction` verifies; human
approval commits. The three phases appear in the same tiny trace and in normal activity.

**Product capability required.** A visual ink/source-to-LaTeX relationship and a compact
approval state that does not cover the mathematics.

**Match transition.** The integral's baseline extends into the graph's x-axis.

### 0:28–0:51 — Calculus becomes area

**Frame.** A graph grows from the live equation instead of appearing as a separate card.
The curve is drawn left to right. The region from `x = 0` to `x = 1` fills with a restrained
purple hatch; a tangent appears at `x = 1`.

**Action.** `graph_expression` links the graph to the equation. The learner drags the upper
integral bound from `1.0` to `1.6`; the shaded region, numeric area, and boundary guide move
together. The tutor changes parameter `a`; equation, curve, tangent value, and area update in
one coherent response.

**Camera.** Slow dolly from the equation toward the shaded region. At the parameter change,
hold the camera still—motion belongs to the mathematics. Finish with a close view of the
crossing axes.

**WebMCP proof.** Show `graph_expression`, followed later by `update_objects`. Each trace
lands exactly as the corresponding visual object changes.

**Product capability required.** Direct-manipulation integral bounds, reactive area value,
reactive tangent, visible equation linkage, and shot-safe graph labels.

**Match transition.** The graph axes straighten and widen into the basis vectors of a linear
transformation.

### 0:51–1:18 — Attention is geometry

**Frame.** The calculus grid resolves into a coordinate plane. Three source vectors become
`Q`, `K₁`, and `K₂`. An editable `W_Q` matrix sits at the edge, never as a dashboard card;
it is a native canvas object.

**Action.** The learner changes one matrix entry. The grid shears, `Q` transforms, and the
angles between `Q` and each key update. Dot products appear along the angle arcs. Softmax
weights are shown as two clean attention ribbons whose widths and numeric labels respond to
the changing geometry. Then the tutor invokes `update_objects` to alter a second value; the
same world responds with Tutor attribution.

**Camera.** Start on the matrix at 125%, slide along the transformed `Q` vector, and settle
at the angle wedge between `Q` and `K₁`. The attention ribbons animate from their source
points, never loop, and finish before the next move.

**WebMCP proof.** A visible `inspect_math` read precedes the tutor's `update_objects` commit.
The trace shows read → reason → visible change without exposing chain-of-thought.

**Product capability required.** Live query/key vectors, dot-product angle values, softmax
weights, attention ribbons, matrix editing, and deterministic agent mutation.

**Match transition.** The wedge between `Q` and `K₁` becomes the marked angle of a triangle.

### 1:18–1:48 — Olympiad geometry: homothety into spiral similarity

**Frame.** The angle wedge expands into triangle `ABC`, two externally tangent circles, and
homothety center `O`. Construction lines begin quiet graphite; only the currently explained
relationship is purple.

**Action A — homothety.** The learner drags `A`. The image points `A′, B′, C′`, both circles,
the center line, and the signed scale factor recompute. A ratio badge confirms
`OA′/OA = OB′/OB`.

**Action B — spiral similarity.** The tutor invokes `construct_geometry`. Equal-angle arcs
appear and a spiral center maps one segment to another. A short rotation arc and scale ray
make the transformation visually legible without a paragraph of proof.

**Camera.** Use one gentle orbit-like track created entirely by 2D pan, scale, and two degrees
of rotation in the final composition. Never distort the actual product capture. The camera
follows the dependent point rather than the cursor.

**WebMCP proof.** `construct_geometry` creates the additional live primitives. Dragging a
source point proves they are semantic dependencies, not a flattened illustration.

**Product capability required.** Correct homothety ratios, externally tangent circles,
spiral-similarity center and equal-angle markings, all derived from draggable sources.

**Match transition.** The three equal-angle arcs sweep into three translucent area regions.

### 1:48–2:08 — Barycentric coordinates as living areas

**Frame.** The same triangle remains. An interior point `P` appears with barycentric
coordinates `[α : β : γ]`. The three sub-triangles receive distinct purple-density hatches,
and a tiny equality shows `α + β + γ = 1`.

**Action.** The learner drags `P`. All three signed area ratios and the coordinate triple
update continuously. The tutor then moves `P` to `[1 : 1 : 1]`; it lands on the centroid and
the three regions become equal.

**Camera.** Top-down, nearly still. Let the moving area ratios provide the spectacle. At the
centroid commit, pull back to reveal the homothety and spiral construction still present as
quiet context.

**WebMCP proof.** The tutor's centroid move is a real `update_objects` or `apply_actions`
commit and is reversible from the learner's Undo button.

**Product capability required.** Draggable barycentric point, live signed-area coordinates,
centroid snap state, and visually restrained region encoding.

**Match transition.** The three region labels collapse into three tool-call chips.

### 2:08–2:29 — WebMCP crescendo

**Frame.** Six fast but readable two-to-four-second beats traverse the same world:

1. `get_world` frames all mathematical objects.
2. `inspect_math` reads the live calculus relationship.
3. `graph_expression` creates a second representation.
4. `construct_geometry` adds a dependent construction.
5. `transform_objects` moves a learner-selected group.
6. `step_history` reverses the tutor's last commit from the learner interface.

**Action.** Each tool name enters as a small monospace chip from the right, attaches to the
affected object, and resolves into an attributed activity row. Never show JSON, a terminal,
or six static inspector cards.

**Camera.** Rhythmic match cuts at mathematical landmarks: integral sign, graph origin,
matrix origin, homothety center, barycentric point. Two beats are held longer than the rest
so the montage breathes.

**Product capability required.** A real transient WebMCP trace HUD driven by actual tool
execution, object-target highlighting, and a clean compact 18/18 inspector state.

### 2:29–2:42 — One world

**Frame.** The camera pulls back until the algebra, calculus, attention, and Olympiad frames
are visible as islands on one continuous ivory world. Human graphite and tutor purple edits
remain interleaved. The WebMCP inspector opens to `18 / 18` without covering the world.

**Action.** One final tutor cursor settles beside the learner cursor. The product stays alive:
the graph trace continues settling and no scene freezes into a mockup.

**End lockup.** Mathburst wordmark over the still-visible world with the silent thesis:
“One mathematical world. Every agent can enter.” Hold for 1.8 seconds.

**Product capability required.** A deterministic world-overview camera target and a compact
inspector presentation readable at 1280×720 playback.

## Cinematography rules

- The first functioning collaboration happens by 0:05; the product thesis is visually
  undeniable by 0:13.
- No standalone title card, slide, terminal, fake chat, stock footage, or detached feature
  card appears anywhere.
- Use continuous canvas geography and match transitions. Hard cuts are reserved for the
  six-beat WebMCP crescendo.
- Camera moves have one intention each: reveal, follow a dependency, or connect two ideas.
  Never add motion merely because a shot is static.
- Human actions are graphite; tutor actions and temporary focus are purple. Do not introduce
  a rainbow palette to distinguish mathematical objects.
- Handwriting is limited to circles, strikes, arrows, and questions. Canonical equations and
  computed values remain crisp LaTeX.
- Every important animation has a clear rest state. No looping glow, orbit, particle field,
  or ambient dashboard motion.
- All meaningful labels remain inside a 7% title-safe margin and readable after downscaling
  to 1280×720.
- Cinematic transforms belong to the eventual composition. Product captures remain
  geometrically undistorted and mathematically inspectable.

## Product implementation map

| Priority | Camera-required capability | Existing foundation | Required improvement |
|---|---|---|---|
| P0 | Everyday algebra cold open | Ink, text, author attribution, shared history | Seeded algebra island, agent annotation commit, deterministic hook camera |
| P0 | Visible WebMCP causality | 18 tools, inspector, activity | Transient real-call trace HUD and affected-object focus |
| P0 | One continuous world | Three camera targets | Add opening and overview targets; make transitions composable and deterministic |
| P1 | Living integral area | Linked graph, tangent, shaded integral, parameter slider | Direct bound control, cleaner area animation, shot-safe numeric readouts |
| P1 | Attention as geometry | Editable matrix and transformed vectors | Q/K geometry, dot products, softmax weights, attention ribbons |
| P1 | Olympiad homothety | Draggable declarative construction | Ratio proof cues and more cinematic tangent-circle composition |
| P1 | Spiral similarity | Angle/homothety primitives | Live spiral-center mapping and equal-angle marks |
| P1 | Barycentric coordinates | Dynamic points/polygons | Live signed-area coordinate overlay and centroid state |
| P2 | Montage-safe polish | Purple commits and scene navigation | Stable focus states, safe framing, compact overlays, final overview composition |

## Implementation boundary

This document authorizes planning only until its paired criteria document is approved.
Narration, voice generation, music, product capture, Remotion editing, rendering, deployment,
and the existing dirty video files remain untouched. Product implementation begins only
after approval and proceeds in storyboard order so every new capability earns a specific
shot.
