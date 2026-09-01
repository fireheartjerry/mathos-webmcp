# Mathburst Advanced Saved Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the four saved projects as advanced, editable proofs that demonstrate the semantic editor, WebMCP construction, and animation runtime without leaking objects across projects.

**Architecture:** Each project is seeded as its own version-two world. Specialized views become presets composed from semantic entities, native views, controls, and bindings. They may keep concise custom renderers where that materially improves the hackathon demo, but no mathematical value may be hidden from the inspector or WebMCP.

**Tech Stack:** Existing math modules, semantic kernel, native editors, WebMCP tools, browser animation runtime, KaTeX/SVG.

**Spec:** `docs/superpowers/specs/2026-09-01-bidirectional-semantic-editing-design.md`

## Global Constraints

- No tests, CI, video capture, narration, or video-generator work.
- Prefer deterministic seeded values and short honest computations over production-grade generality.
- Every displayed invariant must be computed from editable state.
- Every project must fit at 1440×900 and remain usable at ordinary laptop sizes.

---

### Task 1: Rebuild Gamma Function as linked calculus

**Files:**
- Modify: `src/domain/world/seed.ts`
- Modify: `src/components/GammaProbabilityView.tsx`
- Modify: `src/domain/math/probability.ts`
- Modify: `src/domain/world/handwriting.ts`

- [ ] Keep captured handwriting as ink/image while binding reconstructed Gamma expressions to separate semantic entities.
- [ ] Link `Γ(s+1)=sΓ(s)` to normalized density `x^{s-1}e^{-x}/Γ(s)` and show the integration-by-parts dependency.
- [ ] Add editable `s`, exponent, bounds, mode, incomplete Gamma, CDF, normalization, tangent, and shaded-area views.
- [ ] Ensure Reasoning Check stays visible through zoom and only Gamma IDs exist in this project.
- [ ] Add one short timeline that transforms recurrence into density and area without creating a visual duplicate.
- [ ] Verify normalization is approximately one and all views update when `s` changes.

---

### Task 2: Finish Tiny Transformer as a completely exposed model

**Files:**
- Modify: `src/components/AttentionView.tsx`
- Modify: `src/components/TrainingView.tsx`
- Modify: `src/domain/math/transformer.ts`
- Modify: `src/domain/world/seed.ts`

- [ ] Bind tokens, embeddings, `W_Q`, `W_K`, `W_V`, classifier, bias, query/target selection, temperature, and learning rate to semantic entities.
- [ ] Add draggable 2D handles for embeddings, Q/K/V vectors, and context. Each handle edits its supported source values.
- [ ] Keep scores, softmax, context, logits, probabilities, loss, and training history computed and visibly linked.
- [ ] Replace native number steppers with compact fields and keep pen input above the full widget.
- [ ] Add forward-pass and single-gradient-step tracks that highlight the actual active values.
- [ ] Verify a token/vector/matrix edit propagates everywhere and the seeded training step lowers loss.

---

### Task 3: Build the barycentric isogonal-conjugate problem

**Files:**
- Modify: `src/domain/math/barycentric.ts`
- Modify: `src/components/BarycentricView.tsx`
- Modify: `src/domain/world/seed.ts`

- [ ] Seed the exact approved problem with free `A,B,C,P`; derive side lengths and normalized signed-area coordinates `P=(x:y:z)`.
- [ ] Derive and lock `Q=(a²/x:b²/y:c²/z)`, cevians, intersections `D,D'`, and their cyclic analogues.
- [ ] Compute live side ratios, Ceva products, symbolic line/circle/locus equations, and the three product identities.
- [ ] Present the proof sequence as native equations bound to the construction, not static explanatory text.
- [ ] Let valid free-point drags update every ratio; let Detach convert a selected derived point into a free one.
- [ ] Verify `(BD/DC)(BD'/D'C)=c²/b²` and cyclic analogues numerically across several safe drags.

---

### Task 4: Build the spiral-similarity proof

**Files:**
- Modify: `src/domain/math/geometry.ts`
- Modify: `src/components/MathObjectView.tsx`
- Modify: `src/domain/world/seed.ts`

- [ ] Seed free `A,B,C,D` with `X=AC∩BD`; construct circumcircles `(XAB)` and `(XCD)` and their second intersection `S`.
- [ ] Render directed angles, spiral center, homothety centers, ratios, and dependency highlights.
- [ ] Compute `∠ASB=∠CSD` and `SA/SC=SB/SD=AB/CD` from live coordinates.
- [ ] Build the proof sequence from the two circumcircle dependencies using native equation and highlight tracks.
- [ ] Verify the invariants remain correct under valid free-point drags and derived points cannot be silently moved.

---

### Task 5: Rebuild Simplex as editable 3D combinatorics

**Files:**
- Modify: `src/components/SimplexView.tsx`
- Modify: `src/domain/math/simplex.ts`
- Modify: `src/components/space3d/Space3DView.tsx`
- Modify: `src/domain/world/seed.ts`

- [ ] Make all four tetrahedron vertices free and draggable; expose their 3D coordinates.
- [ ] Bind the interior point to four normalized editable weights and support inverse dragging inside the tetrahedron.
- [ ] Add an editable section plane, lattice denominator, integer compositions, and the Pascal-type recurrence.
- [ ] Show the exact projection boundary: 3D data is canonical; the screen tetrahedron is a view.
- [ ] Verify direct point drag updates weights, weight edit moves the point, and lattice count matches `C(N+3,3)`.

---

### Task 6: Finish partitions and Ramanujan truth boundaries

**Files:**
- Modify: `src/components/NumberTheoryView.tsx`
- Modify: `src/domain/math/partitions.ts`
- Modify: `src/domain/world/seed.ts`

- [ ] Compute coefficients from finite Euler products and the generalized pentagonal recurrence.
- [ ] Add Ferrers diagrams, telescoping partial sums, smoothing controls, and a Hardy–Ramanujan asymptotic comparison.
- [ ] Show residue lanes and verify `p(5n+4)≡0 mod 5` only across the visible finite cutoff.
- [ ] Label the infinite congruence as a theorem, not as something established by finite computation.
- [ ] Bind simplex denominator/composition count into the transition to unrestricted partitions without claiming they are identical.
- [ ] Verify known values `p(4)=5`, `p(5)=7`, and visible residue checks.

---

### Task 7: Add deterministic construction recipes

**Files:**
- Create: `src/domain/replay/showcaseRecipes.ts`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/components/replay/AgentConstructionOverlay.tsx`

- [ ] Define one real WebMCP recipe per scene that starts from an empty canvas or theme/layout shell.
- [ ] Order calls by dependency so points, constraints, equations, values, and animation tracks visibly build from scratch.
- [ ] Keep each scene recipe short enough for later video use but expose Skip/Instant for judges.
- [ ] Reset before replay and guarantee repeated runs produce the same IDs and final state.

---

### Task 8: Final product verification and commit

- [ ] Reset the library and open all four gallery cards. Confirm two correct scenes per project and zero cross-project object IDs.
- [ ] Pan and zoom each scene; use Fit Scene and Fit Selection; reload and confirm scene cameras persist.
- [ ] Draw across every specialized widget and edit its primary values both directly and through the inspector.
- [ ] Run all eight construction recipes through the local WebMCP inspector and inspect their real trace.
- [ ] Play and reset each saved animation; confirm the editable final state remains canonical.
- [ ] Run `pnpm typecheck` and `pnpm build`.
- [ ] Review `git diff --check` and stage only product paths named in this plan.

```powershell
git add src/domain/world/seed.ts src/domain/world/handwriting.ts src/domain/math src/domain/replay/showcaseRecipes.ts src/components/AttentionView.tsx src/components/TrainingView.tsx src/components/BarycentricView.tsx src/components/SimplexView.tsx src/components/NumberTheoryView.tsx src/components/GammaProbabilityView.tsx src/components/MathObjectView.tsx src/components/space3d src/components/replay
git commit -m "feat: rebuild four advanced editable projects"
```

