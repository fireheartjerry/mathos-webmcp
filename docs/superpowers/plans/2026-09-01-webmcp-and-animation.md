# Mathburst WebMCP and Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the complete native editor through WebMCP and add a declarative browser-native animation system that can visibly construct real mathematical scenes.

**Architecture:** Split the current monolithic tool definitions into domain groups sharing validators and one bridge. Semantic tools compile to ordinary atomic world operations. Replay stages those expanded operations visually. Animate mode stores tracks against semantic paths and renders the live world at a timeline time—never a disconnected copy.

**Tech Stack:** Existing WebMCP registry, React, TypeScript, `requestAnimationFrame`, SVG, world reducer/history.

**Spec:** `docs/superpowers/specs/2026-09-01-bidirectional-semantic-editing-design.md`

## Global Constraints

- No generated JavaScript, Python/Manim service, fake terminal, or fake network traffic.
- No tests or CI. Verify using the local inspector, typecheck, build, and deterministic replays.
- Tool count may increase; behavioral coverage matters more than preserving eighteen tools.
- A failed semantic batch must commit nothing.

---

### Task 1: Split and strengthen the WebMCP tool kernel

**Files:**
- Create: `src/domain/tools/types.ts`
- Create: `src/domain/tools/schema.ts`
- Create: `src/domain/tools/common.ts`
- Create: `src/domain/tools/expressions.ts`
- Create: `src/domain/tools/geometry.ts`
- Create: `src/domain/tools/widgets.ts`
- Create: `src/domain/tools/matrix3d.ts`
- Create: `src/domain/tools/animation.ts`
- Modify: `src/domain/tools/definitions.ts`
- Modify: `src/domain/tools/groups.ts`

- [ ] Move `WorldTool`, `WorldBridge`, schemas, safe execution, and validators out of the current monolith without changing behavior.
- [ ] Return `semanticCall`, `expandedOperations`, and `changedIds` from every mutating semantic tool.
- [ ] Keep low-level `apply_actions` for exact replay, but make domain tools the documented path.
- [ ] Ensure validation builds the complete candidate action before calling `runAgentAction`.
- [ ] Run typecheck and confirm all existing tools still register in the local inspector.

---

### Task 2: Add full semantic tool coverage

**Files:**
- Modify: `src/domain/tools/common.ts`
- Modify: `src/domain/tools/expressions.ts`
- Modify: `src/domain/tools/geometry.ts`
- Modify: `src/domain/tools/widgets.ts`
- Modify: `src/domain/tools/matrix3d.ts`
- Modify: `src/domain/tools/groups.ts`

- [ ] Common: inspect project/scene/selection/history/entities/views/bindings/dependencies; create/update/style/arrange/group/delete; undo/redo; save/restore/fit camera.
- [ ] Expressions: create/update expression; add equation/graph/table/derivative/integral/parameter views; analyze features; add semantic handles.
- [ ] Geometry: create canvas; add/update/style/remove primitives; add constraints/transformations; inspect dependencies; detach derived primitive.
- [ ] Widgets: create container; add native view/control; bind/unbind paths; arrange regions; inspect full definition.
- [ ] Matrix/3D: create/update matrices, vectors, bases, 3D points/edges/faces/camera/section planes.
- [ ] Make every field exposed in the human inspector writable or explicitly read-only through an equivalent tool.
- [ ] Update the inspector grouping and proof line to show registered count dynamically.

---

### Task 3: Implement semantic animation state and evaluation

**Files:**
- Modify: `src/domain/animation/types.ts`
- Create: `src/domain/animation/evaluate.ts`
- Create: `src/domain/animation/easing.ts`
- Create: `src/domain/animation/operations.ts`
- Modify: `src/domain/world/reducer.ts`

- [ ] Define timelines, tracks, and keyframes against `entityId/path`, `objectId/path`, camera, reveal, draw, morph, and highlight targets.
- [ ] Support linear, ease-in, ease-out, ease-in-out, and smooth-step interpolation for numbers, points, vectors, matrices, opacity, and color.
- [ ] Evaluate a timeline as a transient render overlay; persist mathematical state only when a track explicitly commits at the end.
- [ ] Make timeline creation/edit/delete undoable through the world reducer.
- [ ] Reject missing targets and incompatible keyframe value types before commit.

---

### Task 4: Build optional Animate mode

**Files:**
- Create: `src/components/animation/AnimationTimeline.tsx`
- Create: `src/components/animation/TrackEditor.tsx`
- Create: `src/components/animation/PlaybackControls.tsx`
- Create: `src/components/animation/AnimatedWorldProvider.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/WorldCanvas.tsx`
- Modify: `src/styles/minimal.css`

- [ ] Add a quiet Animate toggle that is hidden by default and opens a bottom timeline.
- [ ] Add object, parameter, camera, reveal, draw, morph, and highlight tracks with draggable keyframes.
- [ ] Implement play, pause, seek, loop range, speed, and deterministic reset using `requestAnimationFrame`.
- [ ] Apply the evaluated overlay to existing renderers so animation preserves object identity and editability.
- [ ] Verify a parabola parameter, geometry point, equation reveal, highlight, and camera can animate together and reset exactly.

---

### Task 5: Add instrumented construction and real trace UI

**Files:**
- Create: `src/domain/replay/types.ts`
- Create: `src/domain/replay/runReplay.ts`
- Create: `src/components/replay/AgentConstructionOverlay.tsx`
- Modify: `src/components/WebMCPTrace.tsx`
- Modify: `src/domain/tools/types.ts`

- [ ] Expand each semantic batch into ordered primitive stages using dependency order.
- [ ] Show real statuses: WebMCP connected, tool started, operations expanded, transaction committed, animation played.
- [ ] Stage point/line/constraint creation, equation reveals, and values quickly enough for a 5–12 second scene construction.
- [ ] Stop on the first failed step and preserve the last committed state.
- [ ] Add Skip and Instant controls for normal product use.
- [ ] Do not fabricate a conversational model response; label deterministic runs as “Agent replay.”

---

### Task 6: Add WebMCP animation tools and deterministic replay fixtures

**Files:**
- Modify: `src/domain/tools/animation.ts`
- Create: `src/domain/replay/fixtures.ts`
- Modify: `src/components/WebMCPInspector.tsx`

- [ ] Add create/update/delete timeline, track, and keyframe tools plus play/pause/seek/reset.
- [ ] Add compact replay fixtures that construct a graph-with-area, a small geometry construction, a 2×2 transformation, and a three-token attention widget from empty containers.
- [ ] Execute fixtures through the same tool `execute` functions registered with `document.modelContext`.
- [ ] Confirm the trace exposes semantic and expanded primitive levels with real IDs.

---

### Task 7: Phase verification and commit

- [ ] On a blank project, use only the local WebMCP inspector to create an expression, graph, parameters, geometry canvas, constrained triangle, matrix/vector view, and timeline.
- [ ] Edit the result manually; then edit it again through WebMCP and confirm both use the same history.
- [ ] Deliberately send one invalid batch and confirm zero operations commit.
- [ ] Play, seek, reset, and replay twice; the final serialized world must match.
- [ ] Run `pnpm typecheck` and `pnpm build`.

```powershell
git add src/domain/tools src/domain/animation src/domain/replay src/components/animation src/components/replay src/components/WebMCPInspector.tsx src/components/WebMCPTrace.tsx src/components/MathburstWorkspace.tsx src/components/WorldCanvas.tsx src/domain/world/reducer.ts src/styles/minimal.css
git commit -m "feat: expose semantic construction and animation"
```

