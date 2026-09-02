# Mathburst video-first product slice

**Status:** APPROVED by the user on 2026-09-01
**Purpose:** Build only the product behavior that appears in the approved submission film, at camera-grade fidelity.
**Primary source:** `docs/video/MATHBURST_CINEMATIC_STORYBOARD.md`
**Visual review:** `.superpowers/brainstorm/video-first-storyboard/content/video-spine-01.html`

## Decision

The cinematic storyboard remains intact. We are not replacing its mathematical argument with a shorter feature reel. We are changing the implementation strategy from broad platform coverage to a narrow vertical slice.

The product must truthfully perform every action visible in the film. It does not need generalized versions of those actions, invisible edge-case support, production hardening, tests, or CI/CD.

## Non-negotiable connective tissue

The film is one mathematical transformation:

`Gamma recurrence → normalized area → probability masses → log-masses → softmax weights → attention mixture → barycentric weights → tetrahedral simplex → integer lattice → partition coefficients → Ramanujan residue lane`

Every transition preserves a visible object or invariant:

1. The circled recurrence minus stretches into the integral sign.
2. The reconstructed equation extends into the graph axis.
3. The normalized area separates into probability bins.
4. Bin masses become log-masses before softmax; Gamma probability is never falsely equated with attention.
5. Attention ribbon endpoints become triangle vertices and the weights become exact barycentric coordinates.
6. A fourth weight lifts the triangle into a tetrahedral probability simplex.
7. A simplex lattice flattens into integer tuples and finite generating-function coefficients.
8. Five residue lanes compress into the WebMCP tool-family crescendo.

If a transition cannot preserve its stated object or invariant, it is not allowed in the film.

## Visual and truth language

- Learner actions are graphite; Tutor actions and temporary focus are purple.
- Handwriting carries uncertainty, mistakes, circles, arrows, and short corrections.
- Canonical mathematics and computed values use crisp LaTeX.
- Every Tutor mutation is a real reducer/WebMCP operation with visible attribution and undo.
- Dense mathematical scenes may use a dark focus field inside the canvas while preserving Mathburst chrome.
- Motion explains one invariant, reaches a deterministic rest state, and is never decorative noise.
- The model scene is an honest tiny transformer training step, not frontier-model training.
- The tetrahedron is a correct mathematical projection, not a physics engine.
- The Ramanujan scene computes and verifies finite cases; it presents the general congruence as a theorem, not a fake induction proof.

## Camera contract

### Shot 1 — Gamma error, 00:00–00:14

Visible actions:

- Start directly on the user's captured handwritten Gamma plate.
- Tutor calls `get_selection`, `get_objects`, and `create_objects`.
- A purple circle, strike, and `v = −e⁻ˣ. Two negatives.` appear as one attributed commit.
- The learner replaces the recurrence minus with a plus in a separate commit.
- Undo can reverse either commit.

Build only the exact opening plate, marks, correction, attribution, history, and camera framing required by this sequence.

### Shot 2 — Reconstruction, 00:14–00:29

Visible actions:

- `reconstruct_problem` proposes live LaTeX without destroying the source plate.
- `audit_reconstruction` visibly resolves the ambiguous bound/Gamma glyphs.
- Human approval commits the clean conversion.
- Source and semantic equation remain linked.

No general OCR is required.

### Shot 3 — Gamma density, 00:29–00:49

Visible actions:

- Show `g_a(x) = x^(a−1)e^(−x)/Γ(a)` with normalized area one.
- Drag bound `b`; shaded CDF area, tangent, and numeric probability update continuously.
- Change `a`; equation, curve, mode, tangent, bins, and normalization update together.
- Three displayed bins include the tail and sum to `1.000`.
- Show `ℓ_j = log(w_j)` before softmax reproduces the positive weights.

Required inverse editing is limited to `a` and `b`. A general graph inverse solver is explicitly cut.

### Shot 4 — Tiny transformer, 00:49–01:18

Visible actions:

- Show embeddings, editable `W_Q`, `W_K`, `W_V`, scaled logits, softmax weights, and attention ribbons.
- Edit the one matrix cell chosen for the capture; vectors, angles, logits, and ribbon widths update.
- Reset to a deterministic step-zero model.
- `TRAIN 1 STEP` changes visible weights, raises the target-token probability, lowers cross-entropy, and extends the sparkline.
- A Tutor-authored second step remains reversible and attributed.

Only the visible head, selected cell path, deterministic optimizer, reset, and training step must be perfect. Arbitrary architectures and universal matrix editing are cut.

### Shot 5 — Barycentrics and spiral similarity, 01:18–01:46

Visible actions:

- The three attention weights become `P = αA + βB + γC`, `α+β+γ=1`.
- Drag `P`; coordinates and signed subtriangle areas update.
- Apply `[1:1:1]`; `P` lands at the centroid.
- Drag the chosen source point `A`; mapped points, tangent circles, homothety ratios, spiral center, scale ray, rotation arc, and equal-angle marks recompute.
- Move the source once more after construction to prove it is live.

This is a curated Olympiad construction. A general GeoGebra clone and arbitrary construction engine are cut.

### Shot 6 — Tetrahedral simplex, 01:46–02:03

Visible actions:

- Add `δ` and show four normalized weights.
- Edit the selected weight; the interior point moves while the sum remains one.
- Sweep the section plane; the triangular cross-section visibly recalls the prior triangle.
- Use the single approved camera orbit needed by the capture.

General 3D modeling, arbitrary meshes, and physics are cut.

### Shot 7 — Partitions and Ramanujan, 02:03–02:23

Visible actions:

- Pause on the tetrahedral lattice and flatten its integer points.
- Show finite Euler-product factors computing real coefficients.
- Render one selected Ferrers diagram.
- Stream coefficients into five residue lanes.
- Reveal verified `p(5n+4) ≡ 0 (mod 5)` cases and then the honestly labeled theorem.

Only the finite coefficient range visible in the capture must be computed. Smoothing is a visual lens, never evidence.

### Shot 8 — WebMCP and one world, 02:23–02:42

Visible actions:

- Traverse representative real calls from read, create, update, transform, history, viewport, reconstruction, graph, geometry, and concept families.
- Attach transient call chips to affected objects, then resolve them into attributed activity rows.
- Show the inspector at exactly `18 / 18`.
- Pull back across the four projects/eight scenes and end on `One mathematical world. Every agent can enter.`

The four gallery projects remain isolated during ordinary use. The final all-scenes view is a Director/camera state for the film, not cross-project leakage.

## Product surface we keep

- Four saved projects and eight curated scenes.
- Existing project gallery, cloning, deletion, persistence, camera bookmarks, and project isolation.
- Text/equation editing already completed because it directly supports reconstruction and corrections.
- Progressive inspector controls used by the recorded gestures.
- Generic semantic reducer, history, attribution, undo, and the exact eighteen WebMCP registrations.
- Director targets and editable shot framing needed to let the user reposition annotations before capture.

## Product surface we cut

- General-purpose graph feature analysis and arbitrary inverse fitting.
- Arbitrary geometry construction menus and constraint combinations.
- Universal matrix/vector editor behavior outside the transformer shot.
- General shape/image editing beyond assets visible in the film.
- General 3D object creation and editing.
- Every edge case absent from the deterministic capture path.
- Authentication, backend collaboration, production security, CI/CD, and automated tests.

## Implementation order

Build in camera order because each scene's last frame is the next scene's first asset:

1. Gamma error and reconstruction.
2. Gamma density and log-mass bridge.
3. Attention edit and honest training step.
4. Barycentric/homothety/spiral scene.
5. Simplex and section plane.
6. Partitions and residue lanes.
7. WebMCP trace choreography and final overview.
8. Director framing polish and a manual end-to-end rehearsal.

Do not implement capture, narration, music, Remotion editing, or the final render until the product rehearsal is approved.

## Verification

There are no automated tests and no CI/CD work.

Completion of the product slice requires:

1. `pnpm typecheck` passes.
2. `pnpm build` passes.
3. A manual Chrome rehearsal performs every listed gesture in order without reloading or repairing state.
4. Every displayed numerical invariant is correct for the visible state.
5. Every Tutor mutation is attributable and undoable.
6. Project navigation never exposes another project's scenes.
7. The inspector remains exactly `18 / 18`.
8. All Director targets exist, can be repositioned, and restore their approved camera states.

Anything not named in this verification contract is optional and must not delay the film.
