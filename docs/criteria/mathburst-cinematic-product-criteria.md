# Criteria: Mathburst as a cinematic WebMCP mathematical world

**Status:** APPROVED by user on 2026-08-31  
**Sources:** user conversation; `docs/video/MATHBURST_CINEMATIC_STORYBOARD.md`;
`docs/superpowers/specs/2026-08-31-mathburst-hackathon-design.md`; WebMCP Challenge
requirements captured in the project docs  
**Artifact:** the live Mathburst app at a 16:9 desktop viewport, evaluated through the
approved storyboard; the rendered video itself is not yet in scope  
**Target:** 92/100  
**Budget:** five rounds, stopping early at 92 with every gate passing  
**Pinned scorer:** fresh-context `gpt-5.6-luna`, high reasoning, worktree
`C:\Jerry\Important\Coding\Mathos\mathos-webmcp\.worktrees\hackathon-build`, scorer brief
`C:\Users\fireh\.codex\skills\iterative-improvement\references\scorer-brief.md`  
**Created:** 2026-08-31  
**Baseline score:** pending approval and independent scoring

## Context

Mathburst is a human-first mathematical canvas in which an external WebMCP tutor and a
learner act on the same semantic objects. The immediate objective is not commercial
completeness: it is an award-caliber hackathon product whose real interactions support a
silent, cinematic 2:42 film. Judges should understand the collaboration in the first
thirteen seconds, see WebMCP cause visible mathematical changes, and finish believing they
have visited one coherent mathematical world rather than watched a feature slideshow.

## Gates — binary, non-negotiable

- **G1. App health.** The product type-checks and builds after every round.  
  *Check:* run `pnpm typecheck` and `pnpm build`; both must exit successfully.
- **G2. WebMCP integrity.** Exactly eighteen page tools remain discoverable and every tool
  shown in the storyboard invokes its real registered handler.  
  *Check:* open the live inspector and Browser WebMCP discovery; count eighteen matching
  tool names, then invoke every tool used by a shot and confirm a matching visible result.
- **G3. Mathematical truth.** No displayed equation, integral value, matrix transform,
  attention weight, homothety ratio, spiral-similarity relation, or barycentric coordinate
  is mathematically false for the visible state.  
  *Check:* independently recompute one displayed value or invariant in every mathematical
  act and compare it with the canvas.
- **G4. Shared-world truth.** Every tutor change shown in the storyboard is an attributed,
  undoable action in the same world and history as learner changes; no fake video-only
  mutation substitutes for product behavior.  
  *Check:* perform each tutor action, inspect activity/history, and undo it from the learner
  UI.
- **G5. Demo reliability.** The complete storyboard interaction path works twice from a
  fresh reset with no uncaught console error and no manual recovery outside the visible
  interface.  
  *Check:* manually run the product path twice at the target 16:9 viewport.
- **G6. Hackathon boundary.** No test suite, CI/CD, production infrastructure, authentication,
  or non-demo edge-case system is added.  
  *Check:* inspect the round diff and package scripts.
- **G7. Media freeze.** Until the user explicitly opens production, narration, audio,
  capture, rendering, deployment, and all pre-existing dirty video files remain untouched.  
  *Check:* compare the round diff against the pre-loop dirty-file snapshot.

## Criteria — 100 points total

### C1. First-thirteen-second comprehension — 16 pts

**What it means:** A cold viewer immediately understands that a learner and an external
tutor are collaborating inside the same mathematical canvas, and that the tutor marks the
reasoning rather than dumping an answer into chat.

**How to check it:** Capture the planned 0:00–0:13 interaction without narration. Give it to
a fresh reviewer with no project context and ask: “What is this product, what did the tutor
do, and where did it act?”

**Scoring anchors:**
- `0` — the viewer cannot identify the product or mistakes it for a normal chatbot.
- `8` — shared whiteboard tutoring is understood, but external-agent/WebMCP involvement or
  the precise tutor action remains ambiguous.
- `16` — the viewer accurately identifies a learner, external tutor, exact marked mistake,
  shared canvas, and visible agent action without explanatory text.

### C2. Mathematical escalation and continuity — 13 pts

**What it means:** Everyday algebra grows naturally into calculus, attention geometry, and
Olympiad geometry as one rising intellectual and visual arc.

**How to check it:** Follow the storyboard from start to finish and list the entry and exit
motif of every act. Verify that each transition reuses a visible line, curve, angle, axis,
point, or area from the preceding shot.

**Scoring anchors:**
- `0` — independent scene cuts or a random “cool math” reel.
- `6` — the order escalates, but two or more transitions are arbitrary navigation cuts.
- `13` — every act has a motivated mathematical match transition and the final overview
  confirms one continuous world.

### C3. WebMCP causality and indispensability — 16 pts

**What it means:** WebMCP is visibly the control layer connecting an external tutor to the
world, not a badge, inspector screenshot, or interchangeable internal AI call.

**How to check it:** For each of the six crescendo calls and three earlier hero calls, record
the tool name, visible target, visible change, attribution, and undo result. Inspect the HUD
to ensure it is driven by that actual invocation.

**Scoring anchors:**
- `0` — WebMCP appears only as copy or a tool count.
- `8` — real calls are visible but feel detached from their on-canvas effects.
- `16` — every showcased call has immediate, legible cause-and-effect, and the external-agent
  architecture is impossible to remove without breaking the demonstrated product.

### C4. Human–tutor shared-world choreography — 12 pts

**What it means:** Learner and tutor take alternating, visually distinct turns on the same
objects while preserving learner agency.

**How to check it:** In the opening, attention, and barycentric acts, verify at least one
graphite learner action and one purple tutor action, separate attribution, a shared activity
history, and learner-controlled undo or revision.

**Scoring anchors:**
- `0` — the tutor talks beside the work or replaces it wholesale.
- `6` — both actors edit the canvas, but turn ownership or reversibility is unclear.
- `12` — authorship, causality, revision, and learner control are instantly legible in all
  three acts.

### C5. Calculus as a living relationship — 10 pts

**What it means:** The equation, curve, tangent, bounds, shaded area, and numeric values form
one reactive semantic system.

**How to check it:** Change the source equation or parameter, then drag an integration bound.
Confirm curve, tangent, shading, and displayed values update in the same committed state.

**Scoring anchors:**
- `0` — a static graph or unrelated equation and picture.
- `5` — the graph reacts, but bounds or derived values remain passive or visually unclear.
- `10` — every linked element updates correctly and the relationship remains readable in a
  16:9 cinematic crop.

### C6. Attention as geometry — 10 pts

**What it means:** Query/key projection, angular similarity, dot products, and softmax
attention become one understandable live spatial construction.

**How to check it:** Edit one matrix entry and independently compute the two visible query–key
dot products and their softmax. Confirm the grid, vectors, angles, ribbon widths, and labels
change consistently.

**Scoring anchors:**
- `0` — generic matrix animation with “attention” labels.
- `5` — vectors transform correctly, but attention scores are static or hard to connect.
- `10` — a viewer can visually trace matrix edit → vector geometry → dot products → softmax
  weights, with correct live values.

### C7. Olympiad geometry depth — 10 pts

**What it means:** Homothety, spiral similarity, and barycentric coordinates are real dynamic
constructions with proof-relevant invariants, not decorative diagrams.

**How to check it:** Drag each designated source point. Verify tangent-circle dependency and
homothety ratio; equal-angle/segment mapping for spiral similarity; signed-area coordinates
and centroid `[1:1:1]` for barycentrics.

**Scoring anchors:**
- `0` — static or mathematically shallow geometry artwork.
- `5` — homothety is dynamic, but spiral/barycentric layers are absent or ornamental.
- `10` — all three constructions remain correct, legible, and visually exceptional through
  the planned interactions.

### C8. Cinematic shot readiness — 7 pts

**What it means:** The live product offers deterministic states and camera targets that can
be captured cleanly without brittle coordinate improvisation.

**How to check it:** From reset, reach every storyboard shot by named target or visible action.
Capture at 2560×1440 and confirm stable framing, settled end states, and no overlay collision.

**Scoring anchors:**
- `0` — manual panning and lucky timing are required for most shots.
- `3` — core scenes are addressable, but opening, overview, or overlays require manual repair.
- `7` — every shot has a deterministic entry, action, rest state, and exit-ready composition.

### C9. Legibility and visual discipline — 4 pts

**What it means:** Ivory, graphite, and purple stay coherent while dense mathematics remains
readable after ordinary video downscaling.

**How to check it:** Downscale each keyframe to 1280×720. Inspect all equations, values,
tool traces, authorship marks, and focus states; flag clipped labels or competing focal points.

**Scoring anchors:**
- `0` — any key mathematical relationship becomes unreadable or the palette becomes noisy.
- `2` — readable overall with two or more crowded/ambiguous frames.
- `4` — every keyframe has one dominant idea, readable math, and unmistakable author color.

### C10. Visible feature density without fakery — 2 pts

**What it means:** The film earns a high wow-per-second while every visible control, value,
and mathematical response is real.

**How to check it:** Count the storyboard's distinct visible product capabilities and mark
whether each is interactive, computed, attributed, and repeatable. Flag any mock or film-only
behavior.

**Scoring anchors:**
- `0` — any hero behavior is fake or the montage repeatedly shows the same capability.
- `1` — all hero behavior is real but one act feels redundant or thin.
- `2` — every act adds a distinct real capability and no hero moment depends on fakery.

## Out of scope

- Narration, voice generation, scriptwriting, music, sound design, capture, compositing,
  rendering, thumbnails, upload, deployment, or submission edits.
- Mobile completeness, authentication, collaboration networking, production persistence,
  generalized OCR, generalized theorem proving, 3D mathematics, or non-demo edge cases.
- Automated tests, CI/CD, monitoring, analytics, enterprise architecture, or recovery systems.
- Reimplementing Desmos, GeoGebra, Miro, Overleaf, or Asymptote beyond the exact filmed paths.

## Constraints

- Keep the existing React/TypeScript/Vinext stack, canonical world reducer, shared undo/history,
  and exactly eighteen WebMCP tools.
- Preserve ivory/graphite/purple visual identity; purple is reserved for tutor authorship and
  active mathematical focus.
- Every visible storyboard feature must be a functioning product behavior, but implementation
  should remain hackathon-simple and optimized for the deterministic judge path.
- No tests or CI/CD. Verification is type-check, build, browser inspection, mathematical spot
  checks, and two manual golden-path runs.
- Only Luna-or-lower subagents may be used.
- Existing uncommitted narration, capture, and video-workspace files are off-limits.

## Score log

| Round | Score | Δ | Gates | Note |
|---|---:|---:|---|---|
| 0 | — | — | — | Baseline after approval |
