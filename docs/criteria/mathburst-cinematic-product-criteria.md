# Criteria: Mathburst as a cinematic WebMCP mathematical world

**Status:** APPROVED, then scope-amended by user on 2026-08-31
**Sources:** user conversation; `docs/video/MATHBURST_CINEMATIC_STORYBOARD.md`;
`docs/superpowers/specs/2026-08-31-mathburst-hackathon-design.md`; WebMCP Challenge
requirements captured in project docs
**Artifact:** live Mathburst at a 16:9 desktop viewport, evaluated through the approved
storyboard; the rendered film remains out of scope
**Target:** 92/100
**Budget:** five scored improvement rounds; the user-approved scope amendment does not add
production ceremony or tests
**Pinned scorer:** fresh-context `gpt-5.6-luna`, high reasoning, worktree
`C:\Jerry\Important\Coding\Mathos\mathos-webmcp\.worktrees\hackathon-build`, scorer brief
`C:\Users\fireh\.codex\skills\iterative-improvement\references\scorer-brief.md`
**Created:** 2026-08-31
**Original v1 baseline:** 36/100
**Amended v2 baseline:** pending re-score of the pre-improvement artifact at `e9db560`

## Context

Mathburst is a human-first mathematical canvas in which an external WebMCP tutor and a
learner act on the same semantic objects. The objective is an award-caliber hackathon product,
not commercial completeness. Its real interactions must support a silent 2:42 film whose
mathematical chain is:

`Gamma recurrence → live probability → tiny-transformer training → attention/barycentrics →
Olympiad geometry → 3D simplex → integer partitions/Ramanujan`.

A sophisticated topic earns no credit if it is merely labeled. The visible invariant,
computed value, or state change must be real.

## Gates — binary, non-negotiable

- **G1. App health.** The product type-checks and builds after every round.  
  *Check:* run `pnpm typecheck` and `pnpm build`; both must exit successfully.
- **G2. WebMCP integrity.** Exactly forty-eight page tools remain discoverable and every tool
  shown invokes its real registered handler.
  *Check:* Browser discovery and inspector expose the same forty-eight names; invoke every
  storyboard tool and confirm the corresponding visible result.
- **G3. Mathematical truth.** No displayed recurrence, integral/CDF value, matrix transform,
  attention weight, loss, gradient-step claim, barycentric coordinate, homothety ratio,
  spiral relation, simplex coordinate, partition coefficient, or congruence is false for the
  visible state.
  *Check:* independently recompute at least one invariant in every mathematical act.
- **G4. Shared-world truth.** Every Tutor change shown is attributed and undoable in the same
  semantic world/history as learner changes; no video-only mutation substitutes for product
  behavior.
  *Check:* perform every hero Tutor action, inspect activity/history, and undo from learner UI.
- **G5. Demo reliability.** The complete storyboard path works twice from a fresh reset at
  2560×1440, with no uncaught console error or recovery outside visible controls.
  *Check:* run the full product path twice.
- **G6. Hackathon boundary.** No test suite, CI/CD, authentication, production infrastructure,
  generalized theorem prover, or non-demo edge-case system is added.
  *Check:* inspect each round diff and package scripts.
- **G7. Media freeze.** Until explicitly reopened, narration, audio, capture, rendering,
  deployment, and all pre-existing dirty video files remain untouched.
  *Check:* compare against the pre-loop dirty-file snapshot.

## Criteria — 100 points total

### C1. Advanced first-fourteen-second comprehension — 14 pts

**What it means:** A cold viewer immediately understands that a learner made a subtle sign
error while reducing `Γ(9/2)` and an external Tutor marked the exact reasoning break inside
the shared mathematical canvas.

**How to check it:** Run the opening without narration for a fresh reviewer. Ask what the
learner did, what the Tutor marked, and where the Tutor acted.

**Anchors:** `0` no comprehensible opening; `7` shared tutoring is clear but the exact error
or external-agent action is ambiguous; `14` the `Γ(9/2)` mistake, exact two-negatives
correction, shared world, real tool trace, attribution, and learner revision are all legible,
with captured vector ink rather than a handwriting-style font.

### C2. Mathematical escalation and continuity — 12 pts

**What it means:** Every act follows from a real mathematical structure in the previous act,
not from a navigation cut or a desire to name another advanced topic.

**How to check it:** List each exit object and next entry object. Verify this chain on canvas:
area → probability → softmax → barycentrics → simplex → lattice → coefficients.

**Anchors:** `0` random cool-math reel; `6` the order escalates but two transitions are
arbitrary; `12` every transition preserves a visible object/invariant and the overview reveals
one continuous world.

### C3. WebMCP causality and indispensability — 15 pts

**What it means:** WebMCP is visibly the control layer through which the external Tutor reads
and mutates the world, not a badge or interchangeable internal AI button.

**How to check it:** For each showcased call, record tool, visible target, visible result,
attribution, and undo. Confirm the HUD is driven by the real invocation and the inspector
resolves to exactly `18 / 18`.

**Anchors:** `0` copy/count only; `7` calls are real but detached from effects; `15` every
hero call has immediate causality and removing WebMCP would break the demonstrated product.

### C4. Human–Tutor shared-world choreography — 10 pts

**What it means:** Learner and Tutor alternate clear turns on the same objects without the
Tutor stealing authorship or learner control.

**How to check it:** In the opening, training, barycentric, and finale acts, confirm graphite
learner action, purple Tutor action, separate attribution, shared history, and learner undo.

**Anchors:** `0` Tutor only talks beside/replaces work; `5` both edit but ownership or
reversibility is unclear; `10` authorship, causality, revision, and control are unmistakable.

### C5. Gamma calculus as a living probability relationship — 10 pts

**What it means:** Recurrence, equation, curve, bound, tangent, shaded area, normalization,
and CDF form one reactive semantic system.

**How to check it:** Correct the recurrence, reconstruct it, drag the CDF bound, and change
the Gamma shape parameter. Recompute total area and one displayed CDF/tangent value.

**Anchors:** `0` static/unrelated graph; `5` graph reacts but bound or normalization is
passive; `10` every linked element updates correctly and remains cinematic at 16:9.

### C6. Attention geometry and honest training — 12 pts

**What it means:** Q/K/V projection, dot products, scaled softmax, attention ribbons,
prediction, cross-entropy, and a real tiny-model update form one understandable mechanism.

**How to check it:** Edit one matrix entry and recompute visible dot products/softmax. Run one
training step and verify a real weight mutation, higher target probability, lower loss, and an
undoable commit. The UI must say “tiny transformer,” not imply a frontier LLM is trained.

**Anchors:** `0` generic matrix/LLM theater; `6` attention works but training is static or
opaque; `12` a viewer can trace matrix → geometry → softmax → prediction → loss → update.

### C7. Barycentric and Olympiad geometry depth — 10 pts

**What it means:** Attention weights become real barycentric coordinates before expanding
into dynamic homothety and spiral similarity.

**How to check it:** Verify `P = αA + βB + γC`, sum-to-one, and signed areas; drag sources and
check homothety ratios plus equal-angle/segment mapping at the spiral center.

**Anchors:** `0` decorative diagram; `5` one dynamic construction but missing bridge/depth;
`10` all invariants are correct, live, and visually exceptional.

### C8. 3D simplex and number-theory finale — 10 pts

**What it means:** A mathematically correct projected tetrahedral probability simplex becomes
an integer lattice and a computed partition-generating-function visualization that honestly
reveals Ramanujan's mod-5 congruence.

**How to check it:** Change one simplex weight and verify normalized 4-way barycentrics and
the visible section. Recompute a sample of generated partition coefficients and verify all
shown `p(5n+4)` values are divisible by five. Reject any unsupported claim of a complete
proof.

**Anchors:** `0` decorative 3D/Ramanujan labels; `5` one half is real while the transition or
computation is shallow; `10` projected geometry, lattice morph, coefficients, and congruence
are correct, continuous, and tool-controlled.

### C9. Cinematic shot readiness and legibility — 5 pts

**What it means:** Every shot has a deterministic entry/action/rest state, safe framing, one
dominant idea, and readable math after 1280×720 downscaling.

**How to check it:** Reach each shot from Reset by named target/visible action at 2560×1440;
downscale keyframes and inspect labels, overlays, tool traces, and author marks.

**Anchors:** `0` brittle framing/unreadable math; `2` mostly capturable with collisions or
crowding; `5` every shot is deterministic, clean, and immediately readable.

### C10. Visible feature density without fakery — 2 pts

**What it means:** The film maximizes wow-per-second while every hero behavior is real.

**How to check it:** Mark every visible capability as interactive, computed, attributed, and
repeatable.

**Anchors:** `0` any hero behavior is fake; `1` all real but one act is thin/redundant; `2`
every act adds a distinct real capability with no theater.

## Out of scope

- Narration, voice, scriptwriting, music, capture, compositing, rendering, thumbnails,
  deployment, submission edits, or any dirty video-workspace file.
- Mobile completeness, auth, networking, production persistence, generalized OCR, generalized
  theorem proving, arbitrary 3D modeling, or non-demo edge cases.
- Automated tests, CI/CD, monitoring, analytics, enterprise architecture, and recovery systems.
- Reimplementing Desmos, GeoGebra, Miro, Overleaf, or Asymptote beyond the filmed paths.

## Constraints

- Preserve the React/TypeScript/Vinext stack, canonical world reducer, shared undo/history,
  and exactly forty-eight WebMCP tools.
- Preserve Mathburst's ivory/graphite/purple identity; use a temporary dark focus field only
  where it materially clarifies dense number-theory or 3D geometry.
- Every visible storyboard feature must function, but its implementation should be the
  cheapest deterministic hackathon path.
- No tests or CI/CD. Verification is type-check, build, browser inspection, independent math
  spot checks, and two manual golden-path runs.
- Only Luna-or-lower subagents may be used.
- Existing narration, capture, and video-workspace changes remain off-limits.

## Score log

| Round | Rubric | Score | Δ | Gates | Note |
|---|---|---:|---:|---|---|
| 0 | v1 | 36 | — | G1–G3, G6–G7 pass; G4–G5 fail | Superseded scope; retained for audit |
