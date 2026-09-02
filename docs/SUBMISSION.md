# Mathburst submission pack

Submission target: **The WebMCP Challenge**

Deadline: **September 3, 2026 at 1:00 PM Pacific Time**

## Product build checklist

- [x] Mathburst opens directly into the working local product.
- [x] Four saved projects expose eight connected mathematical scenes.
- [x] Exactly 48 page tools register and are visible in the in-product inspector.
- [x] Photograph reconstruction, audit, and approval work on the seeded Gamma scene.
- [x] Human and agent actions use the same world kernel, authorship, history, and undo.
- [x] Gamma probability, attention, deterministic tiny-model training, barycentrics, spiral similarity, simplex, and partition views are implemented.
- [x] Director Review exposes thirteen editable keyframes across the eight scenes.
- [x] `pnpm typecheck` and `pnpm build` pass.

The submission film lives at `video/out/mathburst-final.mp4` (2560×1440, 60 fps, 2:41) and is reproduced from source by `docs/video/FILM_REPRODUCTION.md`. Every frame of it is the real product performing the thirteen Director frames; narration describes only what is on screen. Deployment and public hosting remain separate submission-owner steps.

Source: <https://github.com/fireheartjerry/mathos-webmcp>

## Scored against the four judging criteria

### 1. WebMCP Leverage

Mathburst is not a chatbot with one decorative browser tool. Its product model is the tool surface.

- It registers exactly forty-eight discoverable tools: reads, direct object actions, mathematical workflows, project and scene navigation, tutoring (focus, explain, evaluate, annotate, spotlight), per-lab controls, ink and shapes, text and math editing, and animation timelines.
- The tools expose the whole typed object vocabulary: ink, text, images, shapes, arrows, equations, graphs, geometry, matrices, attention, training, barycentrics, simplex, number theory, frames, and groups.
- Every write compiles into the same canonical operations used by the learner interface. Tool calls never bypass the world reducer.
- Tool results produce visible commits: a tutor cursor, target reveal, attributed activity, changed IDs, and global undo.
- Reconstruction uses a deliberate two-pass agent workflow: semantic proposal, source audit, then learner approval.
- The inspector invokes the same execute callbacks registered through `document.modelContext`, making the complete surface judge-visible without an embedded chatbot.

The visible proof is immediate: open **WebMCP · 48/48**, run a tool, watch the tutor act on the canvas, then undo it from the learner UI.

### 2. Execution

The app is a coherent human-first instrument even when WebMCP is unavailable.

- The local route opens directly into one finished workspace with no setup ceremony.
- Every visible whiteboard control performs a real action.
- The complete Gamma path covers image reconstruction, an audit pass, clean conversion, normalized probability, and a linked representation switch.
- Attention, tiny-model training, barycentric geometry, spiral similarity, simplex projection, lattice counting, and finite partition arithmetic are real computed scenes.
- The activity rail, author markers, selection tools, context controls, undo/redo, and local persistence make the shared world legible.

The implementation is intentionally hackathon-sized: one browser document, one polished judge path, no accounts, backend, CI/CD, or speculative production architecture.

### 3. Potential Impact

The problem is specific: AI tutors explain *around* a learner's work because the live mathematical state is usually trapped in a photograph, canvas, or local document.

Mathburst lets the page own that state while any external tutor can inspect and manipulate it. The learner can move from photograph to equation to graph or construction without rebuilding context in chat. Long-term, that shared world can become the durable interface for Primer-style individualized tutoring across calculus, geometry, linear algebra, and proof.

The hackathon version proves the hard interaction model without pretending to ship the long-term memory system or production infrastructure.

### 4. Creativity & Ambition

Mathburst combines the directness of a whiteboard, the semantic power of Desmos and GeoGebra, the mathematical notation of LaTeX, and an agent-operable world model.

Its key inversion is that AI does not generate a disposable answer beside the work. The agent enters the work itself. Equations remain equations, constructions remain constructions, dependencies remain live, and both participants can act with equivalent control.

The eight-scene mathematical spine makes the ambition concrete: one WebMCP command kernel spans photographed calculus, normalized probability, attention and training, Olympiad geometry, a tetrahedral simplex, and a finite Ramanujan verification surface.

## Claims a judge can verify on screen

1. **Photo to live scene:** `Reconstruct photo` → `AI double-check` → `Approve clean conversion`.
2. **Probability bridge:** Gamma area updates its three normalized masses and explicit `log mass → softmax` representation.
3. **Tiny training:** `TRAIN 1 STEP` performs a deterministic numerical-gradient update that lowers loss and raises target probability.
4. **Geometric invariant:** attention weights locate a barycentric point and remain invariant under spiral similarity.
5. **Arithmetic lift:** the projected simplex displays its integer lattice count and finite partition/Ramanujan verification.
6. **Agent parity:** the inspector runs the same handlers registered to WebMCP; activity is labeled Tutor and can be undone by the learner.
7. **Full surface:** the inspector reports 48 page tools in twelve compact groups.
8. **Director Review:** all thirteen keyframes are reachable, editable, and independently approvable.

Do not claim general OCR, long-term memory, multiplayer, cloud sync, or production readiness. They are not part of this submission.

## Feature list

- One canvas, one reducer: pen, highlighter, text, LaTeX equations, images, shapes, arrows, frames, groups, layers, transforms, and global undo/redo, with every object carrying its author.
- Photograph reconstruction as a three-state agent workflow: propose, audit, approve, with the source ink staying linked to the semantic equations it produced.
- Gamma density with a draggable CDF bound, a live shape parameter, three tail-owning probability bins, and the explicit mass → log-mass → softmax bridge.
- A one-head tiny transformer with an editable W_Q/W_K/W_V path, a vector plane with angle arcs, softmax ribbons, and an honest deterministic gradient step whose sparkline records every step.
- Barycentric coordinates linked to the attention weights, with a draggable point and a draggable vertex proving the affine invariant.
- An Olympiad construction: homothety with tangent circles, plus a spiral-similarity centre computed from four points that survives dragging the source.
- A projected tetrahedral probability simplex with a ratio-preserving weight slider, a section plane that recovers the barycentric triangle, and the Pascal lattice count.
- A finite Euler-product partition observatory that verifies p(5n+4) ≡ 0 (mod 5) for the computed range and labels the general statement as a theorem.
- Exactly forty-eight WebMCP tools across twelve families, an inspector that runs the registered handlers, attached trace chips, and Tutor attribution in the shared history.
- Director review: thirteen editable frames, deterministic cues and Tutor beats, camera bookmarks per canvas size, product-side match transitions, and a film mode for capture.

## Final owner actions

1. If submission requires hosting, publish this repository separately and verify the resulting URL.
2. Upload `video/out/mathburst-final.mp4` and paste its public URL into the form.
3. Flip the repository to public when ready.
4. Paste the fields from [DEVPOST_FORM.md](DEVPOST_FORM.md).
