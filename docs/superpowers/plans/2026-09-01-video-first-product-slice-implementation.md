# Mathburst Video-First Product Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish only the deterministic Mathburst interactions visible in the approved 2:42 film, preserving the full mathematical connective tissue at camera-grade fidelity.

**Architecture:** Keep the existing semantic world, reducer, four project documents, eight curated scenes, and specialized mathematical views. Add a thin deterministic cue layer for repeatable shot preparation; improve only the exact controls and linked states named by the storyboard. The later professional visual pass may change composition, motion, typography, and transitions, but it must not change mathematical state or invent video-only behavior.

**Tech Stack:** React 19, TypeScript, SVG, KaTeX, existing semantic reducer/WebMCP registry, browser-native CSS animation.

**Constraints:** No automated tests. No CI/CD. No general graph solver, arbitrary geometry system, universal matrix editor, generalized 3D engine, or production hardening. Use `pnpm typecheck`, `pnpm build`, and one manual Chrome rehearsal per task.

**Spec:** `docs/superpowers/specs/2026-09-01-video-first-product-slice-design.md`

---

## Handoff boundary for Claude Fable 5.1

The engineering pass owns mathematical truth, deterministic rest states, reducer actions, attribution, undo, and shot preparation. The Fable pass owns professional composition, motion curves, transition staging, typography, spacing, focus lighting, and camera rhythm.

Fable may freely polish:

- `src/styles/mathburst.css`
- `src/styles/minimal.css`
- the visual markup inside the eight specialized views
- transition-only SVG layers that read existing state
- Director Review framing and preview ergonomics

Fable must not silently change:

- numeric functions in `src/domain/math/*`
- tool count or tool semantics in `src/domain/tools/*`
- reducer/history behavior
- saved-project isolation
- the truth boundaries in the approved spec

## File map

**Create**

- `src/domain/demo/cues.ts` — named, deterministic shot preparation actions and expected rest states.
- `src/domain/demo/shotContract.ts` — exact object IDs, scene IDs, gestures, and visible invariant labels for the thirteen Director frames.
- `src/components/CinematicBridge.tsx` — state-reading transition layer; never owns mathematical truth.
- `src/styles/cinematic.css` — shot-safe transition visuals and focus states.
- `docs/video/PRODUCT_REHEARSAL.md` — literal click/drag sequence for the final product rehearsal.

**Modify**

- `src/domain/world/types.ts` — add only small presentation flags required by a named shot.
- `src/domain/world/seed.ts` — seed exact camera-visible defaults and stable IDs.
- `src/domain/world/director.ts` — attach each Director frame to a named cue and invariant.
- `src/components/MathburstWorkspace.tsx` — run cues through ordinary world actions and expose transition preview.
- `src/components/GammaProbabilityView.tsx` — stabilize the `a` and `b` interaction path and log-mass bridge.
- `src/components/AttentionView.tsx` — make the selected cell edit and resulting geometry readable.
- `src/components/TrainingView.tsx` — lock deterministic reset/train/Tutor step states.
- `src/components/BarycentricView.tsx` — add the one source-vertex drag used in the film.
- `src/components/MathObjectView.tsx` — preserve curated geometry pointer routing.
- `src/components/SimplexView.tsx` — stage the selected weight and section-plane path.
- `src/components/NumberTheoryView.tsx` — stage coefficient streaming and residue reveal.
- `src/components/WebMCPTrace.tsx` — attach traces to changed object IDs.
- `src/components/DirectorReviewPanel.tsx` — show cue readiness and transition preview.
- `src/styles/mathburst.css` and `src/styles/minimal.css` — final camera-safe layout.

---

### Task 1: Lock deterministic shot contracts

**Files:**

- Create: `src/domain/demo/shotContract.ts`
- Create: `src/domain/demo/cues.ts`
- Modify: `src/domain/world/director.ts`
- Modify: `src/components/MathburstWorkspace.tsx`

- [ ] **Step 1: Define the camera-visible contract**

Create a compact contract that references existing stable scene/object IDs:

```ts
import type { CatalogSceneId } from '../world/projects'

export type DemoCueId =
  | 'gamma-source' | 'gamma-tutor' | 'gamma-corrected' | 'gamma-approved'
  | 'gamma-area' | 'gamma-bins' | 'attention-edit' | 'training-zero'
  | 'training-human-step' | 'training-tutor-step' | 'barycentric-live'
  | 'spiral-live' | 'simplex-live' | 'partition-live' | 'webmcp-crescendo'
  | 'one-world'

export type ShotContract = {
  id: string
  cue: DemoCueId
  scene: CatalogSceneId
  requiredObjectIds: readonly string[]
  visibleInvariant: string
  gesture: string
}
```

Populate all thirteen existing Director frames. The `visibleInvariant` strings must match the approved spec exactly; do not invent marketing copy.

- [ ] **Step 2: Build idempotent cue actions**

Each cue returns a normal `WorldAction[]` and optional viewport. It must be safe to run twice and produce the same visible rest state:

```ts
export type PreparedCue = {
  actions: WorldAction[]
  viewport?: Viewport
  selectIds?: string[]
}

export function prepareDemoCue(id: DemoCueId, world: WorldState): PreparedCue {
  switch (id) {
    case 'training-zero':
      return resetTrainingCue(world)
    case 'one-world':
      return { actions: [], viewport: overviewViewport() }
    // Every remaining DemoCueId receives an explicit branch.
  }
}
```

Use seeded object IDs. Never search by display text or object order.

- [ ] **Step 3: Route Director preparation through the shared reducer**

In `MathburstWorkspace.tsx`, replace shot-specific preparation branches with `prepareDemoCue(activeShot.cue, world)`. Dispatch each returned action using the existing `run` function so history, attribution, and undo remain honest.

- [ ] **Step 4: Verify the cue layer**

Run:

```powershell
pnpm typecheck
pnpm build
```

Expected: both commands exit `0`. In Chrome, prepare each Director frame twice and confirm the second preparation does not duplicate objects or alter the rest state.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/demo src/domain/world/director.ts src/components/MathburstWorkspace.tsx
git commit -m "feat: add deterministic cinematic cues"
```

---

### Task 2: Finish the Gamma opening and reconstruction path

**Files:**

- Modify: `src/domain/world/seed.ts`
- Modify: `src/domain/world/handwriting.ts`
- Modify: `src/domain/world/reconstruction.ts`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/ReconstructionPanel.tsx`
- Modify: `src/styles/mathburst.css`

- [ ] **Step 1: Preserve the captured handwriting plate**

Use `src/domain/world/captured-handwriting.json` as the source. Do not synthesize replacement Gamma glyphs. Keep the source plate and the corrected semantic equation as separate stable objects.

- [ ] **Step 2: Lock the Tutor annotation commit**

The preparation action must create exactly these agent-authored objects in one action:

```ts
const tutorMarkIds = [
  'opening_annotation_circle',
  'opening_annotation_strike',
  'opening_annotation_question',
] as const
```

The note text is exactly `v = −e⁻ˣ. Two negatives.` The human correction remains `opening_correction` in its own action.

- [ ] **Step 3: Lock reconstruction states**

The visible sequence is `source → draft → audited → approved`. The source image and handwriting stay visible in all four states. Approval commits live equation objects and clears only the draft overlay.

- [ ] **Step 4: Perform the opening rehearsal**

From a reset Gamma project: prepare source, run Tutor mark, run human correction, undo correction, redo correction, propose reconstruction, audit it, approve it. Confirm attribution and the exact sign remain readable at 1280×720.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm typecheck
pnpm build
git add src/domain/world/seed.ts src/domain/world/handwriting.ts src/domain/world/reconstruction.ts src/components/MathburstWorkspace.tsx src/components/ReconstructionPanel.tsx src/styles/mathburst.css
git commit -m "feat: lock the Gamma opening sequence"
```

---

### Task 3: Finish area, probability, and the log-mass bridge

**Files:**

- Modify: `src/components/GammaProbabilityView.tsx`
- Modify: `src/domain/math/probability.ts`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/styles/mathburst.css`

- [ ] **Step 1: Keep the only two inverse controls**

The view exposes only the camera-used parameters:

```ts
type GammaDemoParameters = {
  a: number // shape
  b: number // CDF bound
}
```

Dragging the bound updates `parameters.b` and `shadeIntegral[1]` in one action. Changing `a` also sets `showTangentAt` to the new mode `max(0, a - 1)`.

- [ ] **Step 2: Commit pointer drags once**

During pointer movement, show local preview state. On pointer release, commit one world action. Do not create dozens of history rows during the recorded drag.

- [ ] **Step 3: Show the exact bridge**

Use existing `massesToSoftmax` output and render three aligned rows:

```ts
const bridge = massesToSoftmax(masses)
// bridge.masses[j] > 0
// bridge.logs[j] === Math.log(bridge.masses[j])
// bridge.probabilities reproduces bridge.masses within display precision
```

Label the rows `probability mass`, `log mass`, and `softmax`. Display `Σw = 1.000` using the computed values.

- [ ] **Step 4: Rehearse the exact capture gestures**

Drag `b` from its seeded value to the approved destination, then move `a` once. Confirm the curve, CDF, tangent, mode, bins, Gamma value, logs, and softmax all settle before the next action.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm typecheck
pnpm build
git add src/components/GammaProbabilityView.tsx src/domain/math/probability.ts src/domain/world/seed.ts src/styles/mathburst.css
git commit -m "feat: finish the Gamma probability bridge"
```

---

### Task 4: Finish the one-head attention and training hero path

**Files:**

- Modify: `src/components/AttentionView.tsx`
- Modify: `src/components/TrainingView.tsx`
- Modify: `src/domain/math/transformer.ts`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/styles/mathburst.css`

- [ ] **Step 1: Pick and mark one hero matrix cell**

Use `W_Q[0,0]` as the recorded edit unless the seeded camera composition makes another cell more readable. Add `data-demo-target="attention-matrix-cell"` to exactly one input. Editing it must atomically reset linked training history to step zero.

- [ ] **Step 2: Make causality visually explicit**

For the hero edit, highlight the path in this order using current computed state:

`matrix cell → query vector → dot-product score → softmax ribbon → context vector → target probability`

The highlight layer may animate, but no derived value may be hardcoded.

- [ ] **Step 3: Lock reset and training rest states**

`reset` restores the exact seeded `createInitialTinyModel()` result. `train 1 step` calls existing `trainOneStep`; it commits the training object and linked attention model in one action.

Before commit, assert the visible truth boundary:

```ts
if (!(result.pass.loss < before.loss && result.pass.targetProbability > before.targetProbability)) {
  return // keep the previous state; never show a lying "successful" step
}
```

- [ ] **Step 4: Add the Tutor-authored second step**

The cue layer performs the same deterministic step with `source: 'agent'`. It must create one activity row and be reversible with the normal learner Undo button.

- [ ] **Step 5: Rehearse, verify, and commit**

Edit the hero cell, reset, train one human step, train one Tutor step, undo the Tutor step, and redo it. Confirm at least one displayed weight changes, target probability rises, loss falls, and both sparkline endpoints are readable.

```powershell
pnpm typecheck
pnpm build
git add src/components/AttentionView.tsx src/components/TrainingView.tsx src/domain/math/transformer.ts src/domain/world/seed.ts src/styles/mathburst.css
git commit -m "feat: finish the tiny transformer hero path"
```

---

### Task 5: Finish barycentrics, homothety, and spiral similarity

**Files:**

- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/math/barycentric.ts`
- Modify: `src/domain/math/geometry.ts`
- Modify: `src/components/BarycentricView.tsx`
- Modify: `src/components/MathObjectView.tsx`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/styles/mathburst.css`

- [ ] **Step 1: Add the one required vertex drag**

In `BarycentricView`, pointer-drag `A` with local preview. Commit updated `vertices` once on release. Recompute `P` from the same weights, proving the affine-combination invariant.

- [ ] **Step 2: Preserve weight linkage honestly**

When the scene is prepared, copy the three current attention weights into the barycentric object once. After that, the geometry remains independently editable unless the visible `linked` control is active.

- [ ] **Step 3: Seed the curated Olympiad construction**

Use stable primitive IDs for `O`, `A`, `B`, `C`, mapped points, homothety rays, tangent circles, the spiral center, scale ray, rotation arc, and equal-angle marks. Do not add a general construction toolbar.

- [ ] **Step 4: Make one source point drive every dependent mark**

Dragging the chosen `A` changes only its canonical point. Resolve every mapped point, circle, ratio, and angle from the primitive graph. Commit once on release.

- [ ] **Step 5: Rehearse, verify, and commit**

Drag `P`, click centroid, drag barycentric `A`, navigate to the spiral scene, drag its `A` twice, and undo once. Confirm `[1:1:1]`, signed areas, mapped points, ratios, and equal-angle marks remain correct.

```powershell
pnpm typecheck
pnpm build
git add src/domain/world/types.ts src/domain/math/barycentric.ts src/domain/math/geometry.ts src/components/BarycentricView.tsx src/components/MathObjectView.tsx src/domain/world/seed.ts src/styles/mathburst.css
git commit -m "feat: finish the Olympiad geometry hero path"
```

---

### Task 6: Finish the simplex and partition finale

**Files:**

- Modify: `src/components/SimplexView.tsx`
- Modify: `src/components/NumberTheoryView.tsx`
- Modify: `src/domain/math/simplex.ts`
- Modify: `src/domain/math/partitions.ts`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/styles/mathburst.css`

- [ ] **Step 1: Choose one simplex weight and preserve normalization**

Use `δ` as the hero slider. Replace per-input proportional normalization with a deterministic complement distribution so the other three weights keep their relative ratios:

```ts
function setSimplexWeight(weights: [number, number, number, number], index: number, value: number) {
  const nextValue = Math.min(1, Math.max(0, value))
  const others = weights.reduce((sum, item, current) => current === index ? sum : sum + item, 0) || 1
  return weights.map((item, current) => current === index ? nextValue : item * (1 - nextValue) / others) as [number, number, number, number]
}
```

- [ ] **Step 2: Stage the section sweep**

The section slider drives one mathematically computed triangular section. Render its three vertices and a quiet recall label pointing back to the barycentric triangle. The orbit controls remain available but are not part of the recorded gesture.

- [ ] **Step 3: Stage the lattice-to-partition handoff**

Use the simplex denominator to determine the opening lattice state. The number-theory scene then explicitly sorts/quotients tuples before showing partitions; never call the tetrahedral count `p(n)`.

- [ ] **Step 4: Animate only computed finite values**

The coefficient strip and residue lanes read `finiteEulerProductCoefficients` and `fiveResidueLanes`. Reveal the theorem only after the verified finite entries have settled.

- [ ] **Step 5: Rehearse, verify, and commit**

Move `δ`, sweep the section plane, show the lattice, navigate to partitions, change the finite cutoff once, select the approved `N`, and reveal Ramanujan. Confirm all sums/counts/moduli displayed are computed and correct.

```powershell
pnpm typecheck
pnpm build
git add src/components/SimplexView.tsx src/components/NumberTheoryView.tsx src/domain/math/simplex.ts src/domain/math/partitions.ts src/domain/world/seed.ts src/styles/mathburst.css
git commit -m "feat: finish the simplex and partition finale"
```

---

### Task 7: Add restrained transition and WebMCP causality layers

**Files:**

- Create: `src/components/CinematicBridge.tsx`
- Create: `src/styles/cinematic.css`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/WebMCPTrace.tsx`
- Modify: `src/components/DirectorReviewPanel.tsx`
- Modify: `src/domain/tools/definitions.ts`

- [ ] **Step 1: Keep transition state presentational**

`CinematicBridge` receives a cue/transition ID plus source and destination screen points. It renders SVG paths and cloned labels derived from the current world. It never writes objects, weights, equations, or camera state.

```ts
type CinematicBridgeProps = {
  transition: 'minus-integral' | 'area-bins' | 'bins-logits' | 'ribbons-triangle' | 'triangle-simplex' | 'lattice-lanes' | null
  progress: number
  source: { x: number; y: number }
  target: { x: number; y: number }
}
```

- [ ] **Step 2: Attach tool traces to consequences**

For trace events with `changedIds`, resolve the first visible changed object and draw a restrained leader line from the trace chip to that object. If no changed object is visible, keep the chip in the existing trace rail; never invent a target.

- [ ] **Step 3: Preserve exactly eighteen tools**

Do not register any new tool. Confirm the registry order still contains the existing eighteen names and the inspector reports `18 / 18` when WebMCP registration succeeds.

- [ ] **Step 4: Add transition preview to Director Review**

`Preview next` temporarily runs the presentational transition between the current and next approved camera states. It must not enter learner history or alter project data.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm typecheck
pnpm build
git add src/components/CinematicBridge.tsx src/styles/cinematic.css src/components/MathburstWorkspace.tsx src/components/WebMCPTrace.tsx src/components/DirectorReviewPanel.tsx src/domain/tools/definitions.ts
git commit -m "feat: add cinematic causality previews"
```

---

### Task 8: Claude Fable 5.1 professional pass

**Files:**

- Modify: `src/styles/mathburst.css`
- Modify: `src/styles/minimal.css`
- Modify: `src/styles/cinematic.css`
- Modify: visual markup in the specialized views only as needed

- [ ] **Step 1: Establish camera-safe composition**

At 2560×1440 and 1280×720, keep all truth-bearing labels inside a 7% safe margin. The selected control, mathematical consequence, and WebMCP proof must form one readable visual triangle in each shot.

- [ ] **Step 2: Refine motion without changing state**

Use restrained easing, clear anticipation, and deterministic rests. No ambient loops, floating particles, neon gradients, fake cursor chatter, or motion without an explanatory job.

- [ ] **Step 3: Enforce the color authorship system**

Graphite is human. Purple is Tutor/focus. Teal may distinguish geometric invariants. Orange may indicate training loss. Do not introduce scene-specific rainbow palettes.

- [ ] **Step 4: Review each transition as mathematics**

For every bridge, freeze halfway. A reviewer must still be able to name the preserved object/invariant from the frame alone. If not, simplify the transition.

- [ ] **Step 5: Commit the professional pass separately**

```powershell
git add src/styles/mathburst.css src/styles/minimal.css src/styles/cinematic.css src/components
git commit -m "style: finish the cinematic product pass"
```

---

### Task 9: Run the complete product rehearsal and freeze the handoff

**Files:**

- Create: `docs/video/PRODUCT_REHEARSAL.md`
- Modify: `docs/video/MATHBURST_CINEMATIC_STORYBOARD.md` only if a verified product constraint requires it

- [ ] **Step 1: Write the literal rehearsal sequence**

Record every click, drag start/end, typed value, button, cue, expected visible result, and recovery reset. Use stable labels and object IDs; do not use pixel coordinates except for approved drag endpoints.

- [ ] **Step 2: Rehearse from a clean project library**

Open each of the four projects from the gallery. Confirm each project exposes only its two scenes. Run the thirteen Director frames in order without refreshing the page.

- [ ] **Step 3: Check the truth gates**

Confirm:

- Gamma bin mass sum displays `1.000`.
- softmax of log-masses reproduces the displayed masses.
- target probability rises and loss falls after the training step.
- barycentric weights sum to one and the centroid preset is exact.
- simplex weights sum to one and the section is triangular.
- lattice counts and partition coefficients match their displayed formulas.
- every highlighted `5n+4` finite case is divisible by five.
- all Tutor writes are attributed and undoable.
- WebMCP reads exactly `18 / 18`.

- [ ] **Step 4: Run final repository verification**

```powershell
pnpm typecheck
pnpm build
git diff --check
```

Expected: all commands exit `0`. Do not create automated tests or CI configuration.

- [ ] **Step 5: Freeze product work before video production**

```powershell
git add docs/video/PRODUCT_REHEARSAL.md docs/video/MATHBURST_CINEMATIC_STORYBOARD.md
git commit -m "docs: freeze the cinematic product rehearsal"
```

Do not begin capture, narration, music, Remotion editing, or rendering until the user approves the live product rehearsal.
