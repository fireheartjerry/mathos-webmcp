# Mathburst four-project cinematic product design

**Status:** AUTO-APPROVED by the user on 2026-09-01
**Scope:** Finish the submit-ready Mathburst product. Do not create, capture, narrate, edit, render, or deploy the video.
**Delivery style:** Hackathon-simple, deterministic, visually complete, no tests or CI/CD.

## Product thesis

Mathburst ships with four saved mathematical projects containing eight live scenes. Together they form one continuous mathematical argument and one emotional learning loop:

`Gamma error → normalized area → attention → real tiny-model training → barycentrics → spiral similarity → tetrahedral simplex → partitions/Ramanujan`

The factual invariant is normalized nonnegative weight, which becomes affine weight, then an integer total. The emotional invariant is intelligence improving: a learner makes an error, the Tutor localizes it, a tiny model learns from a real loss, geometry explains what its weights mean, and learner plus Tutor reveal a theorem together.

The representations change, but the normalized structure survives—until it becomes arithmetic.

## Saved-project model

The four projects are persistent viewport bookmarks inside one shared mathematical world, not four disconnected application databases. This preserves the core product claim: every object, human edit, Tutor edit, undo action, and WebMCP call belongs to one world and one reducer.

Each project contains exactly two named scenes:

| Saved project | Scene A | Scene B |
|---|---|---|
| **Gamma Lab** | Recurrence Clinic | Area Becomes Probability |
| **Tiny Transformer** | Attention Geometry | Train From Scratch |
| **Olympiad Geometry** | Attention Becomes Barycentrics | Homothety & Spiral Similarity |
| **Simplex → Ramanujan** | Tetrahedral Probability | Partition Observatory |

The project library is always reachable from the product header or navigator. Selecting a project reveals its two scenes and moves the shared camera to the corresponding frame. User edits persist across project changes. An overview camera shows all eight scenes as islands.

## End-to-end mathematical connective tissue

### 1. Gamma recurrence becomes a normalized density

The learner starts with the incorrect recurrence

`Γ(9/2) = ∫₀∞ x^(7/2)e^(−x) dx = [−x^(7/2)e^(−x)]₀∞ − (7/2)Γ(7/2)`.

The Tutor marks the lost sign using real WebMCP-created ink, and the learner commits the corrected `+ (7/2)Γ(7/2)` line separately. Reconstruction converts photographed/handwritten work into semantic LaTeX without destroying the source.

The integrand becomes the Gamma density

`g_a(x) = x^(a−1)e^(−x) / Γ(a)`, with `∫₀∞ g_a(x)dx = 1`.

A draggable bound `b` controls a real numerical CDF region. Three bins produce masses

`w_j = ∫_(B_j) g_a(x)dx`, where `w_j ≥ 0` and `Σw_j = 1`.

### 2. Probability becomes attention without a false equivalence

Gamma bin masses are not attention scores. The explicit bridge is

`ℓ_j = log(w_j)` and therefore `softmax(ℓ)_j = w_j` for positive masses.

The bins first become log-masses, then pass through softmax. The film and product label this as an initialization/representation bridge, not as a claim that Gamma distributions and attention are the same mechanism.

### 3. Attention becomes honest tiny-model training

The Tiny Transformer is a deterministic one-head, low-dimensional language model whose complete visible state fits on the board: token embeddings, `W_Q`, `W_K`, `W_V`, attention scores, softmax ribbons, output logits, target probability, and cross-entropy loss.

`TRAIN 1 STEP` performs a genuine numerical-gradient update over the tiny visible parameter set. A small backtracking line search selects a deterministic step that decreases cross-entropy. At least one displayed matrix entry changes, the correct-token probability rises, and loss falls. The product calls this “training a tiny language model from scratch,” never training a frontier LLM.

Optimization belongs here. It is not forced into the number-theory finale.

### 4. Attention output becomes barycentric geometry

For three value vectors placed at triangle vertices,

`z = αA + βB + γC`, with `α,β,γ ≥ 0` and `α+β+γ = 1`.

This is an exact barycentric point, not a metaphor. Dragging the point updates signed subtriangle areas and coordinates; changing the attention weights moves the same point.

### 5. Barycentrics survive homothety and spiral similarity

For an affine/similarity map `S`, normalized affine combinations commute:

`S(αA+βB+γC) = αS(A)+βS(B)+γS(C)`.

The triangle is transformed by a homothety and then a direct spiral similarity

`S(X) = O + λR_θ(X−O)`.

The weights remain fixed while vertices rotate and scale. Ratio labels, rotation arcs, equal-angle marks, and mapped points recompute from the live construction. The product distinguishes homothety (scale only) from spiral similarity (rotation plus scale).

### 6. Three weights become four-dimensional probability geometry

A fourth outcome and weight `δ` lift the triangle into a projected tetrahedron:

`P = αA + βB + γC + δD`, with `α+β+γ+δ = 1`.

The tetrahedron is a mathematically projected 3-simplex, not a physics engine. The user can change one weight, rotate the projection, and sweep a section plane. A triangular section explicitly recalls the previous scene.

### 7. The simplex becomes an integer lattice

Quantize weights as `λ_i = n_i/N`, where `n_i` are nonnegative integers and `Σn_i=N`. The tetrahedral lattice contains

`L_4(N) = C(N+3,3)`

points, with generating function `(1−q)^(−4)`. The product verifies the recurrence

`L_d(N) = L_d(N−1) + L_(d−1)(N)`

and shows a compact induction/Pascal step. Induction belongs here because it proves an actually displayed finite identity.

### 8. Lattice compositions become integer partitions

The raw tetrahedral count is not the partition function. The transition is explicit:

1. Sort/quotient four-coordinate integer tuples to obtain partitions into at most four parts.
2. Change the constraint to `k_1 + 2k_2 + 3k_3 + 4k_4 = N`, producing partitions using parts at most four.
3. Unfold additional part-size axes to reach Euler’s product

   `P(q) = ∏_(m≥1)(1−q^m)^(−1) = Σ_(N≥0)p(N)q^N`.

Finite factors compute real coefficients. Ferrers diagrams display selected partitions. Coefficients stream into five residue lanes, and the `5n+4` lane reveals

`p(5n+4) ≡ 0 (mod 5)`.

Mathburst verifies computed cases and labels the general statement as Ramanujan’s theorem. It does not claim an elementary induction proof of the congruence.

A restrained Gaussian smoothing pass may serve as a visual lens on discrete lattice density, but it is never presented as a proof. Telescoping series are omitted because they do not improve this chain.

## Scene capabilities

### Project 1 — Gamma Lab

#### Scene 1: Recurrence Clinic

- Bundled human handwriting and source photo.
- Exact Tutor circle/underline/note as a separate agent-authored commit.
- Human correction as a separate undoable commit.
- Source-to-semantic reconstruction, audit, and approval.
- Director targets for every annotation and camera state.

#### Scene 2: Area Becomes Probability

- Live Gamma density with shape parameter `a`.
- Draggable CDF bound `b`, tangent, normalized shaded area, mode marker, and numeric CDF.
- Three exact bin masses whose displayed sum is `1.000`.
- Explicit `log mass → softmax` bridge.

### Project 2 — Tiny Transformer

#### Scene 3: Attention Geometry

- Visible embeddings and editable `W_Q`, `W_K`, `W_V`.
- Scaled dot-product logits and softmax weights.
- Ribbon widths tied to the displayed weights.
- Geometry moves when one matrix value changes.

#### Scene 4: Train From Scratch

- Deterministic reset-to-step-zero state.
- One real numerical-gradient training step and optional repeated steps.
- Visible changed weights, output probabilities, target token, loss, and sparkline.
- Human and Tutor training commits remain attributed and undoable.

### Project 3 — Olympiad Geometry

#### Scene 5: Attention Becomes Barycentrics

- Triangle/value-vector vertices and live point `P`.
- Weights, signed subareas, centroid preset, and drag interaction.
- Optional linkage to the transformer’s current three strongest attention weights.

#### Scene 6: Homothety & Spiral Similarity

- Existing tangent-circle/homothety construction retained.
- Direct spiral-similarity transform added with live scale and angle.
- Equal-angle arcs, mapped points, invariant ratios, and draggable sources.
- Barycentric point transforms with the vertices using unchanged weights.

### Project 4 — Simplex → Ramanujan

#### Scene 7: Tetrahedral Probability

- Projected, rotatable tetrahedron with four weights summing to one.
- Interior barycentric point, face projections, and section-plane sweep.
- Quantized lattice overlay, exact lattice count, and induction/Pascal check.

#### Scene 8: Partition Observatory

- Finite Euler-product coefficient computation.
- Ferrers diagram for a selected `N`.
- Five residue lanes with verified mod-five values.
- Ramanujan theorem reveal with an honest finite-verification boundary.

## Product architecture

### Catalog and navigation

`src/domain/world/projects.ts` defines four projects, eight scenes, titles, centers, zooms, and narrative transitions. `ProjectNavigator` replaces the five-button demo navigator with four saved-project tabs and two scene buttons per project. Overview remains a camera mode, not a fifth saved project.

### Shared world and persistence

All eight scene frames are seeded into the existing `WorldState`. Existing localStorage persistence continues to save the world. The catalog itself is deterministic source data. Project switching changes only the viewport and active scene; it never swaps reducers or loses history.

### New semantic objects

The world model gains five focused object kinds:

- `attention`: visible Q/K/V state, logits, weights, and value vectors;
- `training`: linked model controls, probabilities, loss, and history;
- `barycentric`: triangle, point, weights, and signed areas;
- `simplex`: projected tetrahedron, weights, section, and lattice state;
- `numberTheory`: finite products, coefficients, selected partition, and lane state.

Each renderer owns one mathematical representation. Objects remain selectable, movable, attributable, serializable, and compatible with the generic reducer.

### Data flow

- Gamma graph parameters produce bin masses.
- Attention stores its own exact softmax state initialized from the mass bridge.
- Training updates the linked attention/model object through ordinary world operations.
- Barycentric geometry may read three current attention weights but remains editable independently.
- Simplex begins with those three weights plus `δ` and normalizes all four.
- Number theory reads only the simplex quantization denominator for its opening lattice state; partition coefficients are recomputed deterministically.

No hidden global animation state is required. Every rest state is represented in serializable objects.

## WebMCP contract

The registered tool count remains exactly **18**.

- Generic read/create/update/delete/transform/history/viewport tools support all new kinds.
- `inspect_math` returns the live mathematical payload for the new semantic objects.
- `visualize_concept` expands its accepted concepts to include Gamma density, attention, training, barycentrics, spiral similarity, simplex, and partitions without adding a nineteenth tool.
- Project navigation remains expressible through `set_viewport`; the current project/scene is included in `get_world` metadata.
- Every product mutation uses the same reducer and attributed history as human actions.

## Director Review

Director Review retains thirteen cinematic keyframes mapped onto the eight product scenes. All currently planned cards become live once their target objects exist. Each card exposes editable object targets, per-shot camera framing, clean preview, transition preview, and approval. Changing a target or camera revokes approval.

The Director state stays separate from learner history and does not mutate mathematical truth.

## UI and visual language

- Mathburst remains ivory graph paper, graphite learner work, and purple Tutor actions.
- Crisp LaTeX carries canonical equations; handwriting carries mistakes, corrections, and short intent.
- Dense 3D/number-theory scenes may use a dark focus field inside their frames while preserving product chrome.
- Motion always explains an invariant and reaches a deterministic rest state.
- No decorative particle soup, fake terminals, detached feature cards, or unearned topic morphs.

## Failure and truth boundaries

- Missing scene state is labeled `Needs state`; planned or missing targets cannot be approved.
- Numerical values are computed from object state rather than hardcoded captions.
- The training UI never claims frontier-scale training.
- The tetrahedron is a correct projection, not a physics simulation.
- Tetrahedral lattice counts are never called unrestricted partition numbers.
- Ramanujan’s congruence is revealed and finitely verified, not falsely proven by induction.
- If a cinematic technique is not mathematically connected, it is omitted.

## Verification boundary

Per user instruction, there are no automated tests and no CI/CD work. Completion requires:

1. TypeScript typecheck passes.
2. Production build passes.
3. Four saved projects and eight scenes are reachable in Chrome.
4. Every primary interaction visibly changes mathematically linked state.
5. Tiny-model training changes weights, raises target probability, and lowers loss.
6. Barycentric, homothety, spiral, simplex, lattice, and partition invariants match displayed values.
7. Director Review exposes all thirteen frames with honest status.
8. WebMCP inspector still reports exactly `18 / 18`.
9. Video-generation, narration, capture, rendering, deployment, and existing dirty video files remain untouched.

## Out of scope

- General OCR or theorem proving.
- Arbitrary neural-network architectures.
- Arbitrary 3D modeling or physics.
- A full proof of Ramanujan’s congruence.
- Production hardening, authentication, collaboration backend, CI/CD, or tests.
- Any video-generation implementation.
