# Mathburst Four-Project Universe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Mathburst as a submit-ready hackathon product with four saved projects, eight live and mathematically connected scenes, thirteen editable Director Review shots, and exactly eighteen WebMCP tools that can inspect and mutate the entire shared world.

**Architecture:** Keep one persisted `WorldState`, one reducer, and one attributed history. Saved projects are deterministic viewport bookmarks over eight seeded scene frames. Five focused semantic object kinds own the new interactive mathematics; small pure math modules compute every displayed invariant. Human UI and WebMCP actions continue to compile into the same world operations.

**Tech Stack:** React 19, Vinext/Next app router, TypeScript, SVG/HTML, KaTeX, browser `localStorage`, imperative `document.modelContext.registerTool`, and the existing Mathburst world kernel.

**Spec:** `docs/superpowers/specs/2026-09-01-mathburst-four-projects-design.md`

## Global Constraints

- This is an ambitious but deliberately simple hackathon implementation. Do not add automated tests, CI/CD, deployment, auth, databases, multiplayer, production hardening, or recovery infrastructure.
- Do not create, record, narrate, render, edit, or otherwise modify the video pipeline or its currently dirty files.
- Use typecheck, production build, deterministic browser interactions, and visible mathematical invariants as verification.
- Keep exactly eighteen registered WebMCP tools. Expand schemas and concept cases instead of adding tools.
- Every saved project is a camera bookmark in the same world; scene switching must preserve objects, attribution, selection, and undo/redo.
- Every displayed number is computed from serializable object state. No fake training metrics, fake geometry labels, or hardcoded coefficient claims.
- Keep the truth boundaries explicit: Gamma masses initialize attention logits; the model is tiny; the tetrahedron is a projection; lattice compositions are not unrestricted partitions; Ramanujan is finitely verified and stated as a theorem.
- Optimize for the judge path and the approved eight scenes. Edge cases outside that path are out of scope.
- Make focused commits after coherent task groups. Never stage the pre-existing dirty video/media files.

---

### Task 1: Install the four-project catalog and camera navigation

**Files:**
- Create: `src/domain/world/projects.ts`
- Create: `src/components/ProjectNavigator.tsx`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/WorldCanvas.tsx`
- Delete: `src/components/DemoNavigator.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Produces: `ProjectId`, `SceneId`, `SavedProject`, `ProjectScene`, `PROJECTS`, `SCENES`, `OVERVIEW_VIEWPORT`, `getSceneForViewport()`.
- Consumed by: seed layout, workspace navigation, Director Review, WebMCP world metadata.

- [ ] **Step 1: Define the deterministic catalog**

Create four projects and these eight exact scene IDs: `gamma-clinic`, `gamma-probability`, `attention-geometry`, `train-from-scratch`, `attention-barycentrics`, `spiral-similarity`, `tetrahedral-probability`, and `partition-observatory`. Give every scene a title, subtitle, center, zoom, frame ID, keyboard number, and narrative transition. Export an overview viewport that fits all eight frames.

- [ ] **Step 2: Replace demo navigation with saved-project navigation**

Render four project tabs, the selected project's two scene controls, an overview control, and a visible “4 saved projects · 8 live scenes” proof line. A project click opens its first scene; a scene click dispatches the existing viewport operation. Keep the navigator compact enough for 1440×900.

- [ ] **Step 3: Centralize scene-camera behavior**

Update workspace and canvas imports to use the catalog. Support keyboard shortcuts `1` through `8` plus `0` for overview. Scene changes alter only the viewport and UI focus; they never replace the world.

- [ ] **Step 4: Verify and commit**

Run `pnpm typecheck`. In Chrome, visit all eight bookmarks and overview, edit one object, switch projects, and confirm the edit and undo history survive.

```powershell
git add src/domain/world/projects.ts src/domain/world/seed.ts src/components/ProjectNavigator.tsx src/components/MathburstWorkspace.tsx src/components/WorldCanvas.tsx src/components/DemoNavigator.tsx src/styles/mathburst.css
git commit -m "feat: add four saved math projects"
```

---

### Task 2: Add semantic object types and the mathematical computation kernel

**Files:**
- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/world/dependencies.ts`
- Create: `src/domain/math/probability.ts`
- Create: `src/domain/math/transformer.ts`
- Create: `src/domain/math/barycentric.ts`
- Create: `src/domain/math/simplex.ts`
- Create: `src/domain/math/partitions.ts`

**Interfaces:**
- Adds object kinds: `attention`, `training`, `barycentric`, `simplex`, `numberTheory`.
- Produces: Gamma density/CDF/bin masses; softmax/log-mass bridge; deterministic attention and one-step training; barycentric conversions; tetrahedral projection/lattice counts; finite partition coefficients/Ferrers data.

- [ ] **Step 1: Extend the serializable world union**

Define compact payloads for the five kinds, including all control values required to restore a scene exactly after reload. Preserve the existing `BaseObject` contract so generic select/move/create/update/delete/history code continues to work.

- [ ] **Step 2: Implement Gamma probability functions**

Implement positive-domain Gamma evaluation, normalized density, Simpson integration, CDF, three normalized bin masses, `logMasses`, and stable `softmax`. Clamp only where necessary for a finite demo and return values suitable for three-decimal display.

- [ ] **Step 3: Implement the honest tiny transformer**

Use a fixed three-token, two-dimensional one-head model with visible embeddings and small visible matrices. Compute Q/K/V, scaled dot-product logits, attention weights, context, output logits, probabilities, and cross-entropy. Implement central numerical gradients plus deterministic backtracking so `trainOneStep` only returns a step with lower loss and higher target probability.

- [ ] **Step 4: Implement geometry, simplex, and partition functions**

Add normalized barycentric weights, point/area conversion, affine transform helpers, a rotated 2D tetrahedron projection, integer simplex points, `C(N+3,3)`, Pascal recurrence values, partition DP coefficients from finite Euler factors, Ferrers rows, and residue-lane verification.

- [ ] **Step 5: Verify and commit**

Run `pnpm typecheck` and a short `tsx`-free Node/TypeScript inspection through the app build path. Manually compare the displayed helper outputs against known values such as `softmax(log(w)) = w`, `C(8,3)=56`, and `p(4)=5`.

```powershell
git add src/domain/world/types.ts src/domain/world/dependencies.ts src/domain/math
git commit -m "feat: add the connected mathematics kernel"
```

---

### Task 3: Seed the complete eight-scene shared world

**Files:**
- Modify: `src/domain/world/seed.ts`
- Modify: `src/domain/world/handwriting.ts`
- Modify: `src/domain/world/projects.ts`

**Interfaces:**
- Produces: eight named frame islands and deterministic semantic objects with stable IDs used by renderers, tools, and Director Review.

- [ ] **Step 1: Lay out the eight scene frames**

Arrange two scenes per project in four coherent project regions. Preserve the bundled source photo, captured human ink, Tutor correction, reconstruction state, and all existing user-facing Gamma work. Use stable frame IDs matching the project catalog.

- [ ] **Step 2: Seed the connective state**

Seed the Gamma graph with shape/bound/bins; attention from its computed log-mass bridge; training at deterministic step zero; barycentric geometry from the same three weights; spiral similarity with live center/scale/angle; a normalized four-weight simplex; and number theory initialized from the simplex denominator.

- [ ] **Step 3: Seed explanatory equations and transition labels**

Place only concise canonical equations inside each frame. Explicitly label each bridge—especially `log mass → softmax`, attention output as a barycentric point, composition-to-partition quotienting, and finite verification of Ramanujan.

- [ ] **Step 4: Verify and commit**

Reset local state, load overview, and confirm all eight frame islands and their semantic objects appear without console errors. Run `pnpm typecheck`.

```powershell
git add src/domain/world/seed.ts src/domain/world/handwriting.ts src/domain/world/projects.ts
git commit -m "feat: seed eight connected mathematical scenes"
```

---

### Task 4: Build Gamma probability and attention renderers

**Files:**
- Create: `src/components/GammaProbabilityView.tsx`
- Create: `src/components/AttentionView.tsx`
- Modify: `src/components/MathObjectView.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Gamma graph consumes its parameters and renders a density, CDF shade, draggable bound, tangent/mode, bin masses, and bridge logits.
- Attention consumes `AttentionObject`, renders visible Q/K/V state, logits, softmax ribbons, context vector, and editable matrix cells.

- [ ] **Step 1: Upgrade the Gamma graph scene**

Render the normalized density from computed samples, three colored bin regions, exact mass cards summing to `1.000`, a draggable bound `b`, numeric CDF, mode marker, and tangent. Any control change must dispatch an ordinary attributed `put` operation.

- [ ] **Step 2: Render the representation bridge**

Show each `w_j`, its `log(w_j)`, and the softmax result in one visual chain. Use a restrained shape morph/ribbon treatment without asserting the mechanisms are equivalent.

- [ ] **Step 3: Build editable attention geometry**

Render tokens, small 2×2 Q/K/V matrices, scaled scores, softmax weights, proportionate ribbons, and the context vector. Matrix-cell controls recompute the diagram and commit to the world.

- [ ] **Step 4: Verify and commit**

Drag the Gamma bound, change shape, confirm mass/CDF values update, change one attention matrix entry, and confirm logits, ribbons, and context move. Run typecheck/build.

```powershell
git add src/components/GammaProbabilityView.tsx src/components/AttentionView.tsx src/components/MathObjectView.tsx src/components/WorldObjectView.tsx src/components/MathburstWorkspace.tsx src/styles/mathburst.css
git commit -m "feat: turn probability into live attention"
```

---

### Task 5: Build real tiny-model training and barycentric geometry

**Files:**
- Create: `src/components/TrainingView.tsx`
- Create: `src/components/BarycentricView.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Training controls update linked serializable model state through world commits.
- Barycentric dragging updates normalized weights and signed subareas from the rendered triangle.

- [ ] **Step 1: Build the training console as mathematical content**

Render target token, output probabilities, cross-entropy, changed visible parameters, and loss sparkline. `TRAIN 1 STEP` runs the real numerical-gradient update; `RESET` restores deterministic step zero. Label it “tiny language model from scratch.”

- [ ] **Step 2: Preserve authorship and history**

Human button presses create human commits; the existing agent/WebMCP path can make the same object update as an agent commit. Undo/redo must restore exact weights and history.

- [ ] **Step 3: Build the exact barycentric scene**

Render triangle vertices as value vectors, point `P`, the equation `P=αA+βB+γC`, signed subtriangle areas, normalized weights, and a centroid preset. Dragging `P` recomputes weights; weight sliders move `P`.

- [ ] **Step 4: Verify and commit**

Reset and train at least three steps. Confirm every accepted step lowers loss and raises target probability. Undo one step. Drag `P` and check displayed weights sum to `1.000` and match areas. Run typecheck/build.

```powershell
git add src/components/TrainingView.tsx src/components/BarycentricView.tsx src/components/WorldObjectView.tsx src/components/MathburstWorkspace.tsx src/styles/mathburst.css
git commit -m "feat: train a tiny model into geometry"
```

---

### Task 6: Build spiral similarity and tetrahedral probability

**Files:**
- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/math/geometry.ts`
- Modify: `src/components/MathObjectView.tsx`
- Create: `src/components/SimplexView.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Adds a serializable direct-similarity primitive to the existing geometry object.
- Simplex renderer consumes `SimplexObject` and displays a projected 3-simplex, normalized point, section plane, integer lattice, and recurrence.

- [ ] **Step 1: Add direct spiral similarity**

Extend geometry resolution with `S(X)=O+λRθ(X−O)`. Render source/mapped triangles, scale ratio, rotation/equal-angle marks, and the barycentric point transformed with unchanged weights. Retain the existing tangent-circle homothety construction.

- [ ] **Step 2: Build the tetrahedral projection**

Render four vertices, edges with depth styling, four normalized weights, interior point, face projections, and a rotatable projection. A section-plane control reveals the triangle link to the previous scene.

- [ ] **Step 3: Add lattice and induction mode**

Quantize by denominator `N`, draw valid lattice points, display `C(N+3,3)`, and show the computed Pascal recurrence/compact induction step. Keep the point count low enough for smooth interaction.

- [ ] **Step 4: Verify and commit**

Change scale/angle and verify mapped distances/angles and barycentric weights. Rotate the tetrahedron, sweep the section, vary `N`, and confirm displayed/drawn lattice counts agree. Run typecheck/build.

```powershell
git add src/domain/world/types.ts src/domain/math/geometry.ts src/components/MathObjectView.tsx src/components/SimplexView.tsx src/components/WorldObjectView.tsx src/styles/mathburst.css
git commit -m "feat: lift barycentrics into the simplex"
```

---

### Task 7: Build the partition observatory and Ramanujan reveal

**Files:**
- Create: `src/components/NumberTheoryView.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Consumes `NumberTheoryObject`; computes finite Euler-product coefficients, selected Ferrers diagram, five residue lanes, and verified `5n+4` cases.

- [ ] **Step 1: Make the transition mathematically explicit**

Show ordered lattice compositions, sorting/quotienting to at-most-four-part partitions, weighted multiplicities `k₁+2k₂+3k₃+4k₄=N`, then the unfolding finite product. Never label the tetrahedral count as `p(N)`.

- [ ] **Step 2: Build the coefficient observatory**

Let the user choose `N` and finite product cutoff. Compute coefficients live, draw one Ferrers diagram, and stream coefficients into five residue lanes.

- [ ] **Step 3: Reveal Ramanujan honestly**

Highlight the `5n+4` lane, show its computed values modulo five, and reveal `p(5n+4)≡0 (mod 5)` as Ramanujan's theorem with a “verified here for computed cases” boundary.

- [ ] **Step 4: Verify and commit**

Check `p(4)=5`, `p(9)=30`, and all visible `5n+4` values are divisible by five. Run typecheck/build.

```powershell
git add src/components/NumberTheoryView.tsx src/components/WorldObjectView.tsx src/components/MathburstWorkspace.tsx src/styles/mathburst.css
git commit -m "feat: unfold the simplex into Ramanujan"
```

---

### Task 8: Expand all eighteen WebMCP tools across the new universe

**Files:**
- Modify: `src/domain/tools/definitions.ts`
- Modify: `src/domain/tools/groups.ts`
- Modify: `src/domain/tools/registry.ts`
- Modify: `src/components/WebMCPInspector.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`

**Interfaces:**
- Keeps the exact existing eighteen tool names.
- Extends `get_world` metadata, `get_objects`/validation kind lists, `inspect_math`, and `visualize_concept` for all semantic scenes.

- [ ] **Step 1: Extend schemas without increasing tool count**

Add the five semantic kinds everywhere object kinds are validated. Expand `visualize_concept` with `gamma-density`, `attention`, `training`, `barycentric`, `spiral-similarity`, `simplex`, and `partitions` while preserving the existing concepts.

- [ ] **Step 2: Return useful mathematical inspection payloads**

For each new object kind, return the current computed invariants—not only raw JSON. Include the inferred active project/scene in `get_world` metadata using the current viewport.

- [ ] **Step 3: Provide deterministic inspector examples**

Give every extended concept a safe seeded inspector invocation. Ensure all generic tools can read/update/transform/delete/recreate the semantic objects through the same reducer.

- [ ] **Step 4: Verify exact coverage and commit**

Run the inspector's judge path. Confirm all groups report registered and run:

```powershell
(rg "= tool\\(" src/domain/tools/definitions.ts).Count
pnpm typecheck
pnpm build
```

The count must be exactly `18`.

```powershell
git add src/domain/tools src/components/WebMCPInspector.tsx src/components/MathburstWorkspace.tsx
git commit -m "feat: give WebMCP the entire math universe"
```

---

### Task 9: Map all thirteen Director Review shots to live scene state

**Files:**
- Modify: `src/domain/world/director.ts`
- Modify: `src/components/DirectorReviewPanel.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/styles/mathburst.css`

**Interfaces:**
- Produces thirteen live, targetable, independently framed and approvable shots distributed over the eight scenes.

- [ ] **Step 1: Replace planned mappings with stable live targets**

Map the approved cinematic sequence to real seeded object IDs: Gamma error, probability bridge, attention, training, barycentrics, homothety/spiral, simplex, lattice, composition quotient, Euler product, residue lanes, Ramanujan reveal, and WebMCP crescendo.

- [ ] **Step 2: Keep approval honest**

Only mark a shot live when all targets exist. Preserve per-shot target edits, camera overrides, clean preview, transition preview, and approval revocation when framing changes.

- [ ] **Step 3: Verify and commit**

Open Director Review, visit all thirteen cards, confirm no card says `Needs state`, adjust and approve one card, reload, and confirm its isolated review state persists. Run typecheck/build.

```powershell
git add src/domain/world/director.ts src/components/DirectorReviewPanel.tsx src/components/MathburstWorkspace.tsx src/styles/mathburst.css
git commit -m "feat: make every director shot live"
```

---

### Task 10: Perform hackathon polish and final product verification

**Files:**
- Modify as needed: `src/components/*.tsx`
- Modify as needed: `src/styles/mathburst.css`
- Modify: `README.md`
- Modify: `docs/SUBMISSION.md`
- Modify: `docs/DEVPOST_FORM.md`

**Interfaces:**
- Produces: the submit-ready repository and documented judge path. Does not produce a video or deployment.

- [ ] **Step 1: Polish the eight rest states**

At 1440×900 and 1920×1080, eliminate clipping/overlap, keep canonical equations crisp, distinguish graphite human work from purple Tutor work, and give dense simplex/number-theory frames a controlled focus field. Motion must explain state and stop deterministically.

- [ ] **Step 2: Run the full mathematical judge path**

Reset the world and traverse all eight scenes. Verify Gamma masses, bridge, attention edit, genuine training step, barycentric drag, spiral invariants, simplex/lattice count, partition coefficients, and Ramanujan lane. Verify human/agent attribution and undo/redo at least once.

- [ ] **Step 3: Run the WebMCP and Director paths**

Confirm the inspector reports `18 / 18`, execute representative read/mutation/math tools, and confirm all thirteen Director cards are live and previewable.

- [ ] **Step 4: Run final static verification**

```powershell
pnpm typecheck
pnpm build
(rg "= tool\\(" src/domain/tools/definitions.ts).Count
rg -n "TODO|TBD|placeholder|coming soon|planned" src README.md docs/SUBMISSION.md docs/DEVPOST_FORM.md
git status --short
```

Fix product-facing placeholders and confirm the only unrelated unstaged paths are the pre-existing video/media changes.

- [ ] **Step 5: Align submission copy and commit**

Describe the four projects, eight scenes, shared world, real tiny training, honest mathematical bridges, thirteen-shot Director Review, and exact eighteen-tool WebMCP surface. Do not claim deployment or a completed video.

```powershell
git add src README.md docs/SUBMISSION.md docs/DEVPOST_FORM.md
git commit -m "feat: finish the Mathburst hackathon product"
```

The product repository is complete only when the build succeeds, all eight live scenes and thirteen shots are reachable, the key mathematical invariants visibly hold, and the WebMCP surface remains exactly eighteen tools.
