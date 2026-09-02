# Mathburst film v2 — the story (draft 2, after Jerry's review)

Status: DRAFT 2, 2026-09-02. No timings. Every beat names the frame, the URL in the omnibox, the action, the tools that fire, and the on-screen result. **[BUILD]** marks product work still needed; the parity work (handles, shapes, arrows, graph LaTeX field, geometry toolbar, matrix editor, 48 tools, animation runtime, ledger, toast, agent console, project URLs) is being built now and is assumed present.

## Rules the whole film obeys

- **The film runs in the ChatGPT desktop app's built-in browser**, with Mathburst deployed as a ChatGPT Site (`<name>.openai.chatgpt.site`, this repo is already linked via `.openai/hosting.json`). ChatGPT (GPT-5.6 Sol or Terra) is the **real agent**: it discovers the 48 site tools from the address bar's **Site tools** menu and calls them live. The chat sits beside the page; the learner's prompt is typed into it on camera. No scripted console: the agent's words are the model's own, so the shot list below is the *prompt plan* (what the learner asks for, act by act) plus the product's guaranteed visual reactions (toast, ledger, aura, animations). Takes are not deterministic; expect several.
- **The system cursor performs every human action, visibly.** Nothing human happens without the cursor travelling to it first.
- **The agent is unmistakable.** When the console activates, an intrusive purple pulse sweeps the whole canvas border and the console card slides in. Every tool call fires a large toast ("Used 3 WebMCP tools" + named chips), a purple flash on the object it changed, and a tick in the left-hand ledger. Nothing the agent does is quiet.
- **Left side of the screen = WebMCP.** The toast, the running totals ("12 / 48 tools · 38 calls"), and the tool-call activity log live in a left column next to the tool rail. The right sidebar is the whiteboard's own (inspector, activity).
- **Agent console** docks top-centre, below the header (top-left if it collides with the ledger; decide on the first take). Its words are scripted and labelled "Agent replay · scripted words, real tool calls". Its tone: professional, friendly, casual. It teaches in short sentences while it acts.
- **Purple aura.** Whatever the agent is about to touch gets a purple glow first (point P, a matrix cell, a vertex, an equation), then the tool fires, then the change lands. The aura is the visual grammar of "agent intent".
- **Every construction is a 3Blue1Brown-style animation** driven by the real animation tools (`create_timeline`, `add_keyframes`, `play_timeline`): objects draw in dependency order, equations morph, colours persist across representations, the camera moves only to establish focus. This is non-negotiable in Acts 2, 4, 6 and 7.
- **Approvals look like Claude's**: when the agent proposes something it shows a card with Accept / Decline and waits; the cursor clicks.
- **Space**: when the agent needs room it pans itself (`set_viewport` / `focus_objects`), which is the parity of the human's right-drag pan.

---

## Act 0 — Cold open

**0.1 The browser.** URL: the public site. Chrome with Jerry's profile, ordinary tabs, Mathburst gallery with four cards. Cursor drifts in from the tab strip.

**0.2 New project.** Cursor: **New project** → types `Pipeline` → **Blank canvas**. URL becomes `/p/<id>`. Empty ivory canvas, tool rail left.

**0.3 The left column.** Cursor pins the WebMCP ledger on the **left** (`0 / 48 tools · 0 calls`, empty log) **[BUILD: move ledger + toast to the left column]**.

**0.4 The agent arrives.** Cursor clicks **Agent replay**. Intrusive purple sweep around the canvas, console slides in top-centre. Learner line: *"Walk me through the whole pipeline. Use everything you've got."* Agent: *"On it. Reading the page first."* Toast: `Used 4 · get_world, list_projects, get_scene_catalog, get_session_context`. Reading glow on the canvas. Ledger `4 / 48`.

---

## Act 1 — The Gamma recurrence (human writes, agent reads and marks)

**1.1 Human handwriting.** Cursor picks **Pen** and writes Γ(9/2) = ∫x^{7/2}e^{−x}dx = [−x^{7/2}e^{−x}]₀^∞ − (7/2)Γ(7/2), replayed from the saved sample through the pen tool, pen tip under the cursor, sign error included.

**1.2 Agent reads.** Agent: *"Let me read that."* Reading glow. Toast: `Used 3 · get_objects, get_selection, inspect_math`.

**1.3 Agent marks the break.** Agent: *"Integration by parts flips a sign here. I'll mark it, you fix it."* Purple aura on the glyph, then `Used 2 · draw_ink, annotate_object`: the circle is drawn stroke by stroke, the note *v = −e^{−x}. Two negatives.* is handwritten beside it.

**1.4 Human corrects.** Cursor picks **Pen**, writes the corrected tail down to 105√π/16 (stroke replay). The agent says nothing about it.

**1.5 Agent offers live math.** Agent: *"Want me to turn that into live math?"* with **Accept / Decline**. Cursor clicks Accept. Toast: `Used 1 · create_objects` — an equation object appears **empty**, then the LaTeX is typed into it live by the agent (purple caret) **[BUILD: agent typing animation for equations/text via edit_equation with a `typewriter` option]**, and `Used 1 · transform_objects` scales it up ×1.6 with the resize handles visibly animating. (No photo, no reconstruction: the equation tool is the parity beat.)

**1.6 Human parity.** Cursor grabs the same equation's corner handle and shrinks it back a little, then rotates it a few degrees and back. Agent: *"Same handles I just used."*

---

## Act 2 — The Gamma density (the first 3Blue1Brown construction)

**2.1 Room to work.** Agent: *"I need space below."* `Used 1 · set_viewport` pans the world down (the human equivalent is a right-drag).

**2.2 Construct the widget.** Agent: *"Your corrected recurrence normalises into a density. I'll build it from nothing."* `Used 1 · graph_expression` creates an **empty** graph widget; the agent types `\frac{x^{a-1}e^{-x}}{\Gamma(a)}` into the widget's own LaTeX field (purple caret); `Used 3 · create_timeline, add_keyframes, play_timeline`: axes draw in, the curve draws left to right, the shaded area fills from 0 to b, the three bin edges rise as dashed lines, the mass labels count up. Widget header reads "NORMALISED GAMMA DENSITY · TOTAL AREA 1".

**2.3 Human plays while the agent explains.** Cursor drags shape a → 5.5 and bound b → 4.4; masses update live. **At the same time** the agent explains: *"The three bins split the area into masses w₁ w₂ w₃. Take logs and you have the scores a softmax will see."* `Used 2 · explain_object, evaluate_expression` prints the three live numbers into a typed note beside the widget (`Used 1 · create_objects`), fitting inside the frame.

**2.4 The second 3Blue1Brown animation.** Agent: *"Here is the bridge."* `Used 3 · create_timeline, add_keyframes, play_timeline`: the bin edges slide, the shaded masses re-flow, and the equation morphs w_j = ∫g_a dx → ℓ_j = log w_j → softmax(ℓ)_j = w_j, each term keeping its colour. The timeline scrubber is visible in the sidebar; when it ends the widget is editable again (cursor nudges the slider to prove it).

---

## Act 3 — Attention (agent edits a cell while teaching; human trains eight steps)

**3.1 Space, then the card.** `Used 1 · set_viewport` pans right. `Used 2 · visualize_concept, focus_objects`: the attention card is built (masses flow in as the softmax inputs, drawn in with a timeline).

**3.2 Agent edits a cell, teaching as it goes.** Purple aura on W_Q[0][0]. Agent: *"W_Q turns each token into a query. Raising this entry makes the query lean toward the first embedding dimension, so the dot products with the keys change, and so do the weights."* `Used 1 · set_attention_weight` → 1.4; scores, weights, probabilities recompute in place. Agent: *"Weights still sum to one. That's the softmax doing its job."*

**3.3 The agent's step, undone; the human's eight steps.** `Used 1 · train_model_step` then `Used 1 · step_history` (undo). Agent: *"My step is undone. Your turn: it's a real widget, so train it yourself."* Cursor clicks **train 1 step** eight times; loss and target probability curves grow point by point. Agent, over the clicks: *"Every click is one honest numerical gradient on the visible parameters. I spawned this widget with a tool; it runs on pure math from here."* Ledger ticks only for agent calls.

---

## Act 4 — Geometry, led by the agent, built by both (third construction)

**4.1 Agent leads.** Agent: *"Let's move to geometry. Pick the Geometry tool and click three points for a triangle."* Cursor picks **Geometry**, the GeoGebra-style toolbar appears, cursor places A, B, C and closes the triangle.

**4.2 Agent completes the picture.** `Used 2 · construct_geometry, create_timeline` + `play_timeline`: circles tangent at O, the homothety images, and the spiral centre S draw in dependency order (points, segments, circles, angles). Agent: *"Every mark depends on your three points. Drag one and everything follows."*

**4.3 Barycentrics, connected to attention.** `Used 1 · visualize_concept` (barycentric) beside the triangle. Purple aura on **P**. Agent: *"P is a weighted average of A, B and C. Those weights can be anything that sums to one. Like attention weights."* `Used 1 · set_barycentric_weights (preset: attention)`: P glides to the live attention weights from Act 3, the three sub-triangle areas read the same decimals as the attention card. `Used 1 · move_geometry_point` drags A by tool; P moves by the same rule.

---

## Act 5 — Parity beats, made cinematic

Framed as **the agent tidying the page into a lesson sheet** while the human reacts, so nothing is random:

**5.1 Shapes.** Agent: *"Let me box the three acts."* `Used 1 · create_shape` draws a polygon around Acts 1–2 and an ellipse around Act 3; cursor resizes the ellipse with handles and rotates it slightly; `Used 1 · edit_shape` matches the human's stroke colour.

**5.2 Arrows.** Cursor drags an arrow from the density widget to the attention card, then drags its head; `Used 1 · set_arrow` re-points the tail to the exact bin.

**5.3 Highlighter, eraser.** Cursor highlights the softmax row; `Used 1 · draw_ink (highlighter)` highlights the matching barycentric weights in the same colour. Cursor erases a stray stroke; `Used 1 · erase_ink` erases the agent's own circle from Act 1, `Used 1 · step_history` brings it back. Agent: *"Everything I do is in your history. Undo works on me too."*

---

## Act 6 — Simplex and partitions (fourth and fifth constructions)

**6.1 Simplex.** `Used 1 · set_viewport` pans to empty space. `Used 3 · visualize_concept, create_timeline, play_timeline`: the tetrahedron draws in edge by edge, the lattice points appear, the section plane sweeps to δ = 0.18 and the triangle from Act 4 is recovered inside it. Agent: *"Four weights instead of three: same simplex idea, one dimension up."* `Used 1 · set_simplex_view`.

**6.2 Lattice → partitions.** `Used 2 · visualize_concept, set_partition_view (cutoff 19, n = 14)`: lattice tuples become the partition table (timeline reveals rows), p(19) = 490 arrives last.

**6.3 Ramanujan.** Cursor drags the cutoff slider; `Used 1 · set_partition_view (revealTheorem)`: the congruence card *verified for the finite cases; the general statement is a theorem* fades in. Agent: *"I can verify cases. I can't prove the theorem, and the card says so."*

---

## Act 7 — Matrix (sixth construction) and the rest of the rail

**7.1 Matrix.** Cursor picks **Matrix → 2 × 2**, types values into the grid. `Used 1 · set_matrix_cells` sets a shear; `Used 3 · create_timeline, add_keyframes, play_timeline` sweeps the lattice from identity to the sheared grid with the basis vectors gliding. Agent: *"Same idea as W_Q: a matrix moves every vector at once."* Cursor drags a basis vector; the cells update.

**7.2 Text and equation.** Cursor double-clicks the explanation note and edits a word; `Used 1 · edit_text` fixes a typo; `Used 1 · edit_equation` retypes one LaTeX term live; both undone and redone from the rail.

**7.3 Frame and projects.** Cursor draws a **Frame** around the whole page and titles it *Pipeline*. `Used 3 · create_project, open_project, open_scene` opens a second project; `Used 1 · open_project` returns. The second canvas is untouched: isolation on camera.

---

## Act 8 — Close

**8.1 Ledger.** Left column reads `48 / 48 tools · N calls`. Agent: *"That's every tool, used at least once, all through one shared history."* `Used 2 · get_history, get_world`; the console prints the You / Tutor commit counts.

**8.2 Lockup.** Cursor fits the frame; the title *One mathematical world. Every agent can enter.* is typed into the frame title by the human.

**8.3 Link.** Cursor clicks the omnibox: the public URL is already there. Hold.

---

## Decisions from the review

1. **Surface: ChatGPT Sites.** Deploy through the Sites plugin (`codex exec "Deploy this project with Sites…"` from this worktree, or the desktop app). Film inside the ChatGPT desktop browser with the chat beside it. The in-product Agent replay console stays in the product as an offline demo path but is not used in the film.
2. Console position (for the offline console): top-centre.
3. Narration: a frontier neural voice (see FILM_REPRODUCTION for the chosen voice once keys are provided).

## Prompt plan (what the learner types into ChatGPT, one message per act)

- Act 0: *"You're looking at Mathburst. Read the page with your site tools and tell me what's on it."*
- Act 1: *"I wrote the Gamma recurrence by hand and I think I made a sign mistake. Read my ink, circle the exact place it breaks with your pen tool, and leave a short handwritten note. Don't fix it."* Then: *"Offer to turn my corrected line into live math; if I accept, create the equation, type the LaTeX, and scale it up."*
- Act 2: *"Pan down to empty space, build the normalised Gamma density as a graph widget from nothing, and animate the construction like 3Blue1Brown: axes, curve, shaded area, then the three bins. Explain the masses beside it."* Then: *"Animate the bridge from masses to log-masses to softmax."*
- Act 3: *"Pan right and create the attention card from the bins. Edit one W_Q cell and teach me what changes. Take one training step, then undo it and let me train."*
- Act 4: *"Tell me to place three points with the Geometry tool, then complete the tangent circles, the homothety and the spiral centre from my points, animated in dependency order. Then add barycentrics and move P to the attention weights."*
- Act 5: *"Tidy the page into a lesson sheet: box the acts with shapes, connect them with arrows, highlight the matching weights, and show that I can undo your changes."*
- Act 6: *"Pan to space and build the four-weight simplex, sweep the section plane to recover the triangle, then turn the lattice into the partition table and verify Ramanujan's congruence for the finite cases."*
- Act 7: *"Create a 2×2 matrix, shear it, and animate the lattice. Fix one word in your note and one LaTeX term. Create a second project and come back."*
- Act 8: *"Read the history and tell me how many tools you used and how many changes were mine."*

## Build list this draft adds

- Move ledger, toast, totals and tool log to a **left column**; keep the right sidebar for the inspector.
- Intrusive console activation animation; per-call purple flash on changed objects; purple **aura** tool (`focus_objects` gains `highlight: true`, or a new `spotlight_objects` tool).
- Agent typewriter option on `edit_equation` / `edit_text` / the graph LaTeX field.
- Accept / Decline proposal cards in the console (`say` steps with `proposal: true`, the runner waits for the click).
- Timeline presets for: axes+curve draw-in, equation morph chain, attention card draw-in, geometry dependency-order draw, tetrahedron edge draw + section sweep, partition row reveal, matrix lattice sweep.
- Training card: eight consecutive human steps must stay accepted (learning-rate backoff already guarantees monotone loss).
