# Mathburst submission pack

Submission target: **The WebMCP Challenge**

Deadline: **September 3, 2026 at 1:00 PM Pacific Time**

## Final release checklist

- [x] Mathburst opens directly into the working product.
- [x] Exactly 18 page tools register and are visible in the in-product inspector.
- [x] Photograph reconstruction, audit, and approval work on the seeded calculus scene.
- [x] Human and agent actions use the same world kernel, authorship, history, and undo.
- [x] Calculus, linked graph, dynamic geometry, and editable matrix scenes are visibly interactive.
- [x] Public repository contains the full source, MIT licence, README, and provenance boundary.
- [x] `pnpm typecheck` and `pnpm build` pass.
- [ ] Republish the current commit to the existing ChatGPT Sites project and verify signed-out access.
- [ ] Record the current build and render `docs/video/mathburst-demo.mp4` under three minutes.
- [ ] Upload the video publicly and paste its URL into Devpost.
- [ ] Make the GitHub repository public before the deadline.
- [ ] Run the 60-second judge path twice on the deployed URL.

Live project: <https://mathos-second-try.fireheartjerry.chatgpt.site>

Source: <https://github.com/fireheartjerry/mathos-webmcp>

## Scored against the four judging criteria

### 1. WebMCP Leverage

Mathburst is not a chatbot with one decorative browser tool. Its product model is the tool surface.

- It registers exactly eighteen discoverable tools: six reads, seven direct actions, and five high-level mathematical workflows.
- The tools expose the whole typed object vocabulary: ink, text, images, shapes, arrows, equations, graphs, geometry, matrices, frames, and groups.
- Every write compiles into the same canonical operations used by the learner interface. Tool calls never bypass the world reducer.
- Tool results produce visible commits: a tutor cursor, target reveal, attributed activity, changed IDs, and global undo.
- Reconstruction uses a deliberate two-pass agent workflow: semantic proposal, source audit, then learner approval.
- The inspector invokes the same execute callbacks registered through `document.modelContext`, making the complete surface judge-visible without an embedded chatbot.

The visible proof is immediate: open **WebMCP · 18/18**, run a tool, watch the tutor act on the canvas, then undo it from the learner UI.

### 2. Execution

The app is a coherent human-first instrument even when WebMCP is unavailable.

- The deployed route opens directly into one finished workspace with no setup ceremony.
- Every visible whiteboard control performs a real action.
- The complete calculus path covers image reconstruction, an audit pass, clean conversion, tutoring context, and a linked representation switch.
- Dynamic geometry and matrix scenes are real: draggable construction points recompute dependencies, and editing the 2×2 matrix transforms the grid and linked vectors.
- The activity rail, author markers, selection tools, context controls, undo/redo, and local persistence make the shared world legible.

The implementation is intentionally hackathon-sized: one browser document, one polished judge path, no accounts, backend, CI/CD, or speculative production architecture.

### 3. Potential Impact

The problem is specific: AI tutors explain *around* a learner's work because the live mathematical state is usually trapped in a photograph, canvas, or local document.

Mathburst lets the page own that state while any external tutor can inspect and manipulate it. The learner can move from photograph to equation to graph or construction without rebuilding context in chat. Long-term, that shared world can become the durable interface for Primer-style individualized tutoring across calculus, geometry, linear algebra, and proof.

The hackathon version proves the hard interaction model without pretending to ship the long-term memory system.

### 4. Creativity & Ambition

Mathburst combines the directness of a whiteboard, the semantic power of Desmos and GeoGebra, the mathematical notation of LaTeX, and an agent-operable world model.

Its key inversion is that AI does not generate a disposable answer beside the work. The agent enters the work itself. Equations remain equations, constructions remain constructions, dependencies remain live, and both participants can act with equivalent control.

The frontier montage makes the ambition concrete: one WebMCP command kernel spans photographed calculus, a reactive graph, an Olympiad homothety/tangency construction, and a live matrix transformation.

## Claims a judge can verify on screen

1. **Photo to live scene:** `Reconstruct photo` → `AI double-check` → `Approve clean conversion`.
2. **Adaptive tutoring:** two attempts unlock `Ask Tutor`, which creates a linked graph and diagnostic question.
3. **Agent parity:** the inspector runs the same handlers registered to WebMCP; activity is labeled Tutor and can be undone by the learner.
4. **Full surface:** the inspector reports 18 page tools in six compact groups.
5. **Dynamic math:** dragging geometry points and editing matrix cells visibly recomputes dependent objects.
6. **Direct whiteboard:** the learner can draw, type, typeset, create math objects, transform, group, layer, duplicate, delete, and navigate without an agent.

Do not claim general OCR, long-term memory, multiplayer, cloud sync, or production readiness. They are not part of this submission.

## Final owner actions

1. Republish the existing Sites project from `.openai/hosting.json`; do not create a second project.
2. Confirm the live URL returns the current Mathburst build while signed out.
3. Upload the final video publicly and paste its URL into Devpost.
4. Flip the repository to public.
5. Paste the fields from [DEVPOST_FORM.md](DEVPOST_FORM.md).
6. Stop changing the repository, site, or submission at the deadline.
