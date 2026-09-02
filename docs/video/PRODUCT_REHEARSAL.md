# Mathburst product rehearsal

**Status:** re-rehearsed 2026-09-02 at 2560×1440 (dev server, port 3400); all thirteen frames measured clean. Previously rehearsed 2026-09-01 at 1280×720 and 2560×1440.
**Scope:** the thirteen Director frames of `MATHBURST_CINEMATIC_STORYBOARD.md`, performed on the real product without reloading.
**Not covered:** capture, narration, music, Remotion editing, rendering. Product work is frozen at this document.

## Before the take

1. Open `http://localhost:3400/` in Chrome. Clear site data once (`localStorage.clear()`), reload, and confirm the console shows no `Mathburst: the stored project library is distrusted` warning.
2. Set the window to the capture size. Director cameras are saved with the canvas size they were framed at; after a resize press **Reset framing** on any frame whose camera looks wrong, then nudge and **Approve**.
3. Open **Gamma Function** from the gallery, then **Director review** in the header. The Director may select any of the thirteen frames; it opens the built-in project a frame belongs to exactly as the gallery would. Ordinary navigation stays limited to the active project's own two scenes.
4. Every frame has **Prepare rest state** (idempotent; safe to press twice) and, where the film needs a Tutor or learner turn, one or two **beat** buttons. Tutor beats call the real WebMCP tools; learner beats go through the same reducer as the canvas.

Stable ids used below: `opening_attempt`, `opening_annotation_circle`, `opening_annotation_strike`, `opening_annotation_question`, `opening_correction`, `source`, `eq_integral`, `recon_recurrence`, `recon_work`, `graph_integrand`, `attention_mechanism`, `training_panel`, `barycentric_geometry`, `geometry_construction`, `geometry_spiral_equation`, `simplex_projection`, `partition_observatory`.

## Frame sequence

### 01 · The hidden sign — `gamma-source`
- Prepare: no action. Frame 01 hides the Tutor marks and the correction.
- Hold on the captured handwriting `Γ(9/2) = ∫₀∞ x⁷ᐟ² e⁻ˣ dx = [−x⁷ᐟ² e⁻ˣ]₀∞ − (7/2)Γ(7/2)`.
- Expected: no cursor, no chrome inside the plate.

### 02 · Tutor marks the break — `gamma-tutor`
- Prepare (or press **Ask WebMCP tutor** on the plate).
- Calls, in order: `get_selection` → `get_objects {ids:[opening_attempt]}` → `create_objects` (circle, underline, note).
- Expected: purple circle on the minus before `7/2 Γ(7/2)` (stroke 42 of the captured sample, located at runtime), underline beneath it, handwritten note `v = −e⁻ˣ. Two negatives.` Activity row: *Tutor marked the sign lost in integration by parts · Tutor*. A `create_objects ✓` chip attaches to the circle.

### 03 · Learner repairs it — `gamma-corrected`
- Press **Correct the sign** (or Prepare).
- Expected: graphite `+ (7/2)Γ(7/2)` under the wrong term and `= (7/2)(5/2)(3/2)(1/2)√π = 105√π/16` beneath it, as one human row.
- Press **Undo** on the activity rail: the correction disappears, row *Undid corrected the Gamma recurrence sign*. Press **Redo** (rail button): it returns. Neither step touches the Tutor marks.

### 04 · Ink becomes semantic math — `gamma-approved`
- Press **Reconstruct photo** (header). `reconstruct_problem` proposes three equations; the panel shows `Γ(9/2)=∫₀^∞…=(7/2)Γ(7/2)` as *live* and two purple *verify* lines: the recurrence with an uncertain upper bound `□` and the unfolding with `s` in place of `5`.
- Press **AI double-check**. `audit_reconstruction` resolves the bound to `∞` and the glyph to `5`; the audit text names both.
- Press **Approve clean conversion**. The three equations join the clinic frame under the source photo; the photo stays at full opacity. Rows: *Reconstructed · Tutor*, *Audited · Tutor*, *Approved · You*.

### 05 · Area becomes probability — `gamma-area`, beat `gamma-tutor-shape`
- Scene: Gamma Density. Rest state `a = 4.5`, `b = 6`.
- Drag the purple bound handle left until the label reads `P(X ≤ 4.4)` (≈ 0.545). One row: *Moved the CDF bound b to 4.4*. The tangent follows the bound during the drag.
- Beat **Tutor changes a**: `inspect_math` → `update_objects` sets `a = 5.5`; curve, mode (`a − 1 = 4.5`), tangent, bins and Γ(a) move together.
- Truth gate: the bin table reads `w₁ w₂ w₃` with `Σ = 1.000`, `ℓⱼ = log wⱼ` beneath, and `softmax(ℓ)ⱼ` reproducing the masses with `Σ = 1.000`. Verified values at `a = 5.5`: `0.147, 0.500, 0.352`; logs `−1.915, −0.693, −1.043`.

### 06 · Attention geometry — `attention-edit`
- Scene: Attention (Tiny Transformer). Prepare resets the head to step zero.
- Click the highlighted cell `W_Q[1,1]` (`0.82`), type `1.4`, press Enter. One row: *Edited WQ[1,1] to 1.4*. The causality path lights in order: cell → q → angle arcs → ribbons → context → target probability → cross-entropy.
- Verified at 1.4: weights `0.278, 0.520, 0.202`, loss `1.007`. The linked training card restarts at step 0.

### 07 · One honest training step — `training-zero`, beats `training-human-step`, `training-tutor-step`
- Scene: Gradient Step. Press **train 1 step**: step 1, loss `1.007 → 0.751`, target probability `0.365 → 0.472`, both sparklines gain a labeled endpoint, W_Q/W_K/W_V cells that moved show arrows.
- Beat **Tutor step**: `inspect_math` → `update_objects` applies step 2 (`0.751 → 0.558`, `0.472 → 0.572`) as *Tutor applied gradient step 2 · Tutor*.
- Press **Undo** (step 1 returns), then **Redo** (step 2 returns). The step is never committed unless loss falls and target probability rises.

### 08 · Weights become barycentrics — `barycentric-live`, beat `barycentric-centroid`
- Scene: Barycentric Coordinates (Olympiad Geometry). Prepare copies the transformer project's live attention weights into `[α : β : γ]` once (a Director-time read; the projects stay isolated).
- Drag `P`: weights and signed subareas update, `Σ = 1.000`.
- Drag vertex `A`: the triangle changes, the weights stay, `P` follows the same weights.
- Beat **Tutor sets [1:1:1]**: `P` lands on the centroid with three equal signed subareas, as an attributed, undoable row.

### 09 · Homothety and spiral similarity — `spiral-live`, beat `spiral-construct`
- Scene: Spiral Similarity. Drag `A` once: `Aₕ, Bₕ, Cₕ`, both circles (tangent at `O`), and the readouts `OAₕ/OA = OBₕ/OB = OCₕ/OC = 0.580` recompute.
- Beat **Tutor constructs S**: `inspect_math` → `construct_geometry {objectId: geometry_construction}` appends the spiral centre `S` (the fixed point of the similarity `A→A′, B→B′`, computed from the four points), the rays, and the two equal angles; `create_objects` writes the invariant equation under the card.
- Drag `A` again: `S` stays fixed, both angles stay `28.0°`, `SA′/SA = SB′/SB = 0.720`.

### 10 · Probability simplex — `simplex-live`, beat `simplex-tutor-weight`
- Scene: Simplex. Move the `δ` slider (or run the beat, which sets `δ = 0.34`): the other three weights keep their ratios, `Σ = 1.000`, the interior point moves.
- Sweep the section plane to `δ`: the section turns bright, the label reads *holds P*, and the note shows `P`'s in-section barycentrics `(α, β, γ)/(1 − δ)`; at the seeded weights these are the Gamma masses `0.290 : 0.505 : 0.205`.
- Lattice: `56 lattice points · L₃(5) = C(8, 3)`, Pascal `35 + 21 = 56 ✓`.

### 11 · Integer lattice to Ramanujan — `partition-live`, beat `partition-reveal`
- Scene: Integer Partitions. The chain reads the simplex's nearest lattice tuple, sorts it into a partition of 5, and shows its Ferrers diagram.
- Drag **factors m ≤** from 14 to 19: the strip extends to `p(19) = 490`; lane `n ≡ 4` shows `5, 30, 135, 490`, each `≡ 0`.
- Beat **Tutor reveals p(5n+4)**: `inspect_math` → `update_objects` selects `n = 14` and reveals the theorem card: *verified · 4 finite cases* and the sentence that the general congruence is not proven here.

### 12 · WebMCP crescendo — `webmcp-crescendo`
- Frame 12 is a camera state over the composite of all four projects. Prepare fires, in order: `get_world`, `get_objects`, `get_selection`, `get_session_context`, `inspect_math`, `get_history`, `create_objects` (note), `update_objects`, `transform_objects`, `set_viewport`, `graph_expression`, `construct_geometry`, `visualize_concept`, three `step_history` undos, `delete_objects`.
- Expected: chips attach to the hero object of the active project and resolve into rows; the world ends unchanged; the proof chip reads `WebMCP 48 / 48`.

### 13 · One mathematical world — `one-world`
- Camera pulls back over eight islands with the session's graphite and purple edits interleaved. Lockup: **One mathematical world.** *Every agent can enter.* with the `WebMCP 48 / 48` chip. Hold 1.8 s.

## Truth gates checked on 2026-09-01

| Gate | Observed |
|---|---|
| Gamma bin masses sum | `1.000` at `a = 4.5` and `a = 5.5` |
| softmax(log w) = w | `0.290/0.505/0.205` and `0.147/0.500/0.352` reproduced |
| training step | loss `1.007 → 0.751 → 0.558`, p `0.365 → 0.472 → 0.572` |
| barycentric sum / centroid | `Σ = 1.000`; centroid `0.333, 0.333, 0.333` with equal subareas |
| simplex sum / section | `Σ = 1.000`; section at `δ` holds `P` |
| lattice count | `L₃(5) = 56 = 35 + 21` |
| partitions | `p(0..19) = 1,1,2,3,5,7,11,15,22,30,42,56,77,101,135,176,231,297,385,490` |
| `p(5n+4)` | `5, 30, 135, 490` all divisible by 5 |
| Tutor attribution / undo | every Tutor row shows *Tutor*; undo and redo verified on frames 03, 07 |
| inspector | header reads `48 / 48 page tools`; registration line reports the browser's `document.modelContext` state honestly |
| Director | thirteen frames selectable, targets repositionable, cameras persisted per canvas size, six bridges previewable, approvals restorable |

## Recovery

- A cue that finds its rest state already present does nothing. Pressing Prepare on an earlier frame never deletes later state.
- **Reset project** (header) returns the active project to its seed and clears its history.
- If the Director's frame list shows *Needs state* for a frame in another project, open that frame; readiness is judged against every built-in project's world.

## Known visible weaknesses

- The Director panel covers the right 400 px while open; hide it with ⛶ before judging composition or use **Preview next**.
- Director cameras saved at one canvas size are rebased, not re-composed, at another size; reset and re-approve after changing the capture resolution.
- The trace chips that attach to objects are transient (about five seconds); the activity rail is the durable proof.

## Rehearsal — 2026-09-02

All thirteen Director frames were stepped on a cleared store at 2560×1440 with the
Director panel hidden, and each was measured for three things: text clipped inside its
own box, boxes that intersect when they should not, and anything the camera cuts off at
the canvas edge. The earlier audits only compared canvas objects to each other, so this
pass added world-space overlays and floating chrome to the comparison — which is where
every defect below was hiding.

| Frame | Finding | Resolution |
|---|---|---|
| 01 | The tutor prompt panel overlapped the frame label by 51×41 px. The panel is 520 px wide but only 493 px of clear space remains beside the label. | The panel is right-aligned to the frame's edge and reduced to one row — kicker and button, mirroring the label at the opposite corner. Its sentence is carried by the button and the narration, and stays in the DOM for screen readers. |
| 01 | `[data-demo-scene='opening']` never matched: the scene id is `gamma-clinic`, so the intended placement had never applied and the base rule always won. | Dead rule removed; the corrected geometry lives in the base rule. |
| 09, 12, 13 | The geometry card's title collapsed to **exactly 0 px**. Its uppercase kicker is `flex: 0 0 auto` and, in the crescendo's 220×160 proof tiles, is wider than the heading — so the card showed its label and no name at all. | The heading wraps, the kicker shrinks and ellipsises, and the title holds a floor of `4em`. Below 260 px the kicker steps out entirely so the name survives; below 200 px the selection meta goes too. |
| 12, 13 | The closing note was authored 40 px tall for `Every agent can enter.` but is rewritten to `One mathematical world.`, which wraps to two lines and needs 46 px — so the film's final card clipped its own last line. | The note is sized for its final text, not its first. |
| Docs | `DEMO_SCRIPT`, `SUBMISSION`, `PRODUCT_REHEARSAL` and the storyboard all claimed `WebMCP 18 / 18`, stale by thirty tools. | Corrected to 48. The live lockup chip was already right. |

**Result:** thirteen frames, 0 clipped elements, 0 unintended collisions, 0 boxes cut by
the canvas edge. `pnpm typecheck` and `pnpm build` pass.

Two classes were deliberately excluded from the audit rather than fixed, because both are
intentional: a panel floating over its own frame's top edge, and `.agent-activation`, the
full-bleed veil that sweeps on every agent write.
