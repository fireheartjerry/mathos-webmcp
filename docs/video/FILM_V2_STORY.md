# Mathburst film v2 — the story

Status: DRAFT for discussion (2026-09-02). No timings. Every beat names the frame (what the camera shows), the URL in Chrome's omnibox, the actions, the WebMCP tools that fire, and the end result the viewer must be able to verify on screen. Beats marked **[BUILD]** need product work before they can be filmed; the list of that work is at the end.

Ground rules that the whole film obeys:

- One real Chrome window, the user's own profile and tab strip, DevTools closed, `localhost:3400` in the omnibox. The system cursor is the only pointer; it is never hidden.
- Everything the agent does is a real `document.modelContext` tool call through the registered handlers. The agent's *words* are scripted (a deterministic choreography, labelled "Agent replay" in the product), its *actions* are not.
- Every tool call is announced on screen the instant it fires: a **tool toast** ("Used 3 WebMCP tools · get_selection, get_objects, create_objects") and a persistent **tool ledger** in the sidebar counting distinct tools used and total calls. The ledger ends at 40+ distinct tools and ≥ 120 calls.
- The camera never cuts to a card floating on ivory. Cards are always seen inside the full app: rail, header, sidebar, activity log, omnibox.
- Human and agent alternate. Every capability is shown twice: once by the hand, once by the agent, on the same object.

---

## Act 0 — Cold open

**Frame 0.1 — The browser.** URL `localhost:3400/`. Chrome window, the user's profile avatar and a handful of ordinary tabs visible, Mathburst tab active, gallery page with the four project cards. The cursor drifts in from the tab strip.
Actions: none yet.
Result: the viewer knows this is a real browser and a real localhost app.

**Frame 0.2 — New project.** Cursor clicks **New project**, types `Gamma → Ramanujan`, picks **Blank canvas**. URL becomes `localhost:3400/p/<id>` **[BUILD: project URLs]**. An empty ivory canvas with the tool rail on the left.
Result: the entire film happens in a project created on camera.

**Frame 0.3 — Sidebar pinned.** Cursor opens the right sidebar (WebMCP inspector + activity) and clicks the pin so it stays open **[BUILD: pin]**. The sidebar shows `WebMCP · 0 / 40 tools used · 0 calls` and an empty activity log.
Result: the ledger that will fill up for the rest of the film is on screen from the start.

**Frame 0.4 — The agent arrives.** A small **Agent console** docks top-left inside the app **[BUILD: agent console, honest label "Agent replay"]**. Its first line is the scripted user prompt: *"Follow me through this page. Use every tool you have."* The agent replies: *"Reading the page first."* The tool toast fires: `Used 4 WebMCP tools · get_world, list_projects, get_scene_catalog, get_session_context`. The canvas border glows purple for the duration of the reads **[BUILD: reading indicator]**.
Result: first WebMCP calls are visible, named, and counted (4 / 40).

---

## Act 1 — The Gamma recurrence (human writes, agent reads and marks)

**Frame 1.1 — Human handwriting.** Cursor picks **Pen**. The learner's saved handwriting of Γ(9/2) = ∫x^{7/2}e^{−x}dx = [−x^{7/2}e^{−x}]₀^∞ − (7/2)Γ(7/2) is replayed as a real stroke animation from the stored samples, pen tip following the cursor **[BUILD: stroke replay through the pen tool, not an SVG overlay]**. The sign error is written on purpose.
Result: ink objects in the world, authored "You", three commits in the activity log.

**Frame 1.2 — Agent reads.** Console: *"Let me read what you wrote."* Purple reading border. Toast: `Used 3 · get_objects, get_selection, inspect_math`.
Result: ledger 7 / 40.

**Frame 1.3 — Agent marks the break.** Console: *"The sign flips during integration by parts. I'll mark it, not fix it."* Toast: `Used 2 · create_objects, annotate_object`. A purple circle is *drawn* around the lost minus (stroke animation, agent-authored) and the note *v = −e^{−x}. Two negatives.* is handwritten beside it **[BUILD: agent ink drawn progressively, same stroke player as 1.1]**.
Result: purple "Tutor" pips on both new objects; activity log shows two Tutor commits.

**Frame 1.4 — Human corrects.** Cursor picks **Pen** and writes the corrected tail (+7/2 Γ(7/2) … = 105√π/16), replayed from samples.
Result: graphite commit; the page now holds both hands' ink side by side.

**Frame 1.5 — Photo → live math.** Cursor picks **Image**, the OS file dialog opens (real dialog, visible), the learner selects the photographed recurrence. Console: *"I can turn that photo into live math. You approve it."* Toast: `Used 2 · reconstruct_problem, audit_reconstruction`. Semantic draft panel opens at the right, audit passes, cursor clicks **Approve clean conversion**.
Result: three typeset equations land in the frame; the approval is the human's, on camera.

**Frame 1.6 — Editing parity.** Cursor selects the photo and uses the **resize handle** to shrink it and the **rotate handle** to straighten it **[BUILD: resize/rotate handles]**. Console: *"Same controls, from my side."* Toast: `Used 1 · transform_objects` and the typeset block nudges into alignment.
Result: bounds and rotation change from both sides; both appear in the activity log.

---

## Act 2 — The Gamma density (agent builds a widget in front of you)

**Frame 2.1 — Agent constructs the graph.** Console: *"The corrected recurrence normalises into a density. Watch me build it."* Toast: `Used 1 · graph_expression`. The graph widget pops in **empty** (axes only), the purple caret types the LaTeX into the widget's own equation field character by character **[BUILD: equation field on the graph widget; agent typing animation driven by the tool, not a fake]**, the curve draws itself left to right **[BUILD: draw track in the animation runtime]**.
Result: a professional density widget with `g_a(x) = x^{a−1}e^{−x}/Γ(a)` in its header, no overflow, `a = 4.5` slider visible.

**Frame 2.2 — Human plays.** Cursor drags the shape slider to 5.5 and the bound to 4.4; the shaded area and the three bin masses update live.
Result: two graphite commits; masses shown to three decimals.

**Frame 2.3 — Agent explains beside it.** Toast: `Used 3 · explain_object, evaluate_expression, create_objects`. A typed explanation card appears beside the widget: *"Total area is 1. The three bins hold w₁, w₂, w₃; their logs are the scores softmax will see."* with the three numbers evaluated live.
Result: text object authored Tutor, positioned by the tool, fits inside the frame.

**Frame 2.4 — Animation, 3Blue1Brown-style.** Console: *"Here is why the bins matter."* Toast: `Used 3 · create_timeline, add_keyframes, play_timeline` **[BUILD: animation tools + runtime]**. The bin edges slide, the shaded masses re-flow, the equation `w_j = ∫ g_a dx` morphs into `ℓ_j = log w_j` and then `softmax(ℓ)_j = w_j`, colours preserved across the three representations.
Result: the timeline scrubber in the sidebar shows the track playing; the world returns to its editable state at the end.

---

## Act 3 — Attention (agent edits a matrix cell, human trains a step)

**Frame 3.1 — Agent visualises.** Toast: `Used 2 · visualize_concept, focus_objects`. The attention card is created to the right of the density and the camera glides to it.
Result: card shows the three masses arriving as the softmax inputs.

**Frame 3.2 — Agent edits a cell.** Console: *"I'll raise W_Q[0][0]."* Toast: `Used 1 · set_attention_weight`. The cell highlights, its value ticks to 1.4, every score, weight and probability recomputes.
Result: weights [0.276, 0.523, 0.201] sum to 1.000, cross-entropy 0.751.

**Frame 3.3 — Human trains.** Cursor clicks **train 1 step** on the training card. Loss falls, target probability rises. Console: *"One honest step: a numerical gradient on the visible parameters."* Toast: `Used 2 · train_model_step, get_history`. The agent takes step 2, then **undoes** it: `Used 1 · step_history`.
Result: activity log shows You → Tutor → Tutor(undo); the human step survives.

---

## Act 4 — Geometry, GeoGebra-style (human constructs, agent completes)

**Frame 4.1 — Geometry toolbar.** Cursor picks **Geometry**. A GeoGebra-style contextual toolbar appears above the canvas: point, segment, line, ray, circle, polygon, angle, midpoint, perpendicular, intersection, transformations **[BUILD: geometry toolbar]**. The learner places A, B, C and draws the triangle.
Result: a live construction object with three draggable base points.

**Frame 4.2 — Agent adds the rest.** Toast: `Used 2 · construct_geometry, move_geometry_point`. Circles tangent at O, the homothety images, and the spiral centre S are added *in dependency order* (points, then segments, then circles, then angles) **[BUILD: staged construction reveal]**. Then the agent drags A by tool and every dependent primitive follows.
Result: the invariant `SA′/SA = SB′/SB = 0.72, ∠ASA′ = ∠BSB′ = 28°` appears as a typeset object under the frame, fitting inside it.

**Frame 4.3 — Barycentrics.** Toast: `Used 2 · visualize_concept, set_barycentric_weights (preset: attention)`. P moves to the live attention weights from Act 3; the sub-triangle areas read the same numbers.
Result: the chain attention → barycentrics is verified on screen with identical decimals.

---

## Act 5 — Shapes, arrows, highlighter, eraser (pure parity beats)

**Frame 5.1 — Human draws a polygon and an ellipse.** Cursor picks **Shape → Polygon**, clicks five vertices; then **Ellipse** by drag **[BUILD: polygon + freeform shapes]**. Resizes and rotates the ellipse with handles.
**Frame 5.2 — Agent mirrors it.** Toast: `Used 2 · create_objects, transform_objects`. The agent creates a matching polygon and scales it by 0.8 and rotates 15°.
**Frame 5.3 — Arrows.** Human drags an arrow from the density widget to the attention card and re-drags its head **[BUILD: arrow head/tail handles]**. Agent: `Used 1 · update_objects` re-points the arrow's tail.
**Frame 5.4 — Highlighter and eraser.** Human highlights the softmax row; agent `Used 1 · draw_ink` highlights the matching barycentric weights in the same colour **[BUILD: draw_ink tool with parametric/piecewise curves + highlighter mode]**. Human erases a stray stroke; agent `Used 1 · erase_ink` erases its own circle from Act 1, then `Used 1 · step_history` brings it back **[BUILD: erase_ink]**.
Result: each parity beat leaves paired commits, one graphite, one purple.

---

## Act 6 — Simplex and partitions (agent drives the labs)

**Frame 6.1 — Simplex.** Toast: `Used 2 · visualize_concept, set_simplex_view (section 0.18, denominator 5)`. The tetrahedron appears, the section plane sweeps down to δ = 0.18 and the triangle from Act 4 is recovered inside it.
**Frame 6.2 — Lattice → partitions.** Toast: `Used 2 · visualize_concept, set_partition_view (cutoff 19, n = 14)`. The lattice tuples become the partition table; p(19) = 490 appears at the end of the row.
**Frame 6.3 — Ramanujan.** Human drags the cutoff slider; agent `Used 1 · set_partition_view (revealTheorem)` reveals the congruence card *verified for the finite cases, stated as a theorem*.
Result: honest wording on the card is legible at 720p.

---

## Act 7 — Matrix editor and the rest of the rail

**Frame 7.1 — Matrix.** Cursor picks **Matrix**, chooses 2×2, types values into the cell grid **[BUILD: matrix editor dialog + editable grid]**. Two basis arrows appear and transform live. Agent `Used 1 · update_objects` sets the shear to 0.8.
**Frame 7.2 — Text and equation edits.** Human double-clicks the explanation card and edits a word; agent `Used 1 · update_objects` edits the LaTeX of one typeset equation; both edits are undone and redone from the rail.
**Frame 7.3 — Frame and project.** Human draws a **Frame** around the whole journey and titles it. Agent `Used 3 · create_project (template), open_project, open_scene` opens a second project and comes back: `Used 1 · open_project`.
Result: project isolation is shown: the second project's canvas is untouched by any of this.

---

## Act 8 — Close

**Frame 8.1 — Ledger.** The sidebar ledger reads `40 / 40 tools used · N calls` (N is whatever the take produced; the number is real). Console: *"Every tool, both hands, one world."* Toast: `Used 2 · get_history, get_world`; the agent reads back the whole history and the console prints the count of You vs Tutor commits.
**Frame 8.2 — Lockup.** The camera fits the frame from 7.3; the title *One mathematical world. Every agent can enter.* is typed by the human into the frame's title, not overlaid.
**Frame 8.3 — Repo and URL.** Last beat: the omnibox is clicked, the public URL is typed (the deployed site), the same gallery loads.
Result: judges see the live URL requirement satisfied on camera.

---

## Product work this story requires

Tools (current 34 → target ~42):

- `draw_ink` (pen or highlighter; explicit points, parametric `x(t), y(t)` on `[t0, t1]`, or piecewise), `erase_ink` (by ids or by rectangle), `edit_text`, `edit_equation`, `create_timeline`, `add_keyframes`, `play_timeline` (play/pause/seek/reset), `create_shape` (polygon/freeform), `set_matrix_cells`. Fold `set_graph_expression` into `graph_expression` (update mode) or add it.
- Every tool description ≤ 500 chars, parameter descriptions ≤ 150, names ≤ 30, outputs ≤ 1.5 K (Chrome security guide budgets). Read tools carry `readOnlyHint`; tools that return learner ink or text carry `untrustedContentHint`.
- Results return `content: [{type:'text'}]` plus `structuredContent` so both Chrome DevTools and MCP-shaped agents read them.

Editing parity in the UI:

- Selection handles: resize (8), rotate, for every object kind; arrow head/tail handles; polygon and freeform shapes; graph widget with its own LaTeX equation field; GeoGebra-style geometry toolbar; matrix dimension dialog and cell grid; frame titling.

Presentation:

- Tool toast + persistent ledger + activity log of tool calls (names, counts, totals) in the sidebar, pinnable.
- Reading indicator (purple canvas border while read tools run).
- Agent console ("Agent replay") inside the product, off by default, scripted lines + real calls.
- Animation runtime (timeline, tracks, draw/morph/reveal/highlight/camera) with a sidebar scrubber.
- Gamma density widget restyled as a proper widget; overflow audit on every card at 1440p and 720p.
- Stroke replay for saved handwriting through the pen tool, both authors.
- Project URLs (`/p/<id>`), sidebar pin.

Film mechanics:

- Real Chrome window capture (not a headless screencast) with the user's profile, at 2560×1440, cursor visible; under three minutes with the audio covering what was built and how WebMCP was used.
- Narration: a new voice (decision pending), music without third-party copyright.
