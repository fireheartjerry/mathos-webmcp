# Mathburst cinematic product — round log

## Round 0 — baseline 36/100

**Scorer:** fresh-context `gpt-5.6-luna`, high reasoning, live app at 16:9  
**Instrumentation note:** an initial 8/100 run was discarded because the production server
was stale after a parent build and served a missing JavaScript chunk. The server was restarted,
hydration and an empty console were independently verified, and the same pinned configuration
rescored the untouched artifact.

### Gates

| Gate | Result | Evidence |
|---|---|---|
| G1 App health | PASS | Type-check and build exited 0. |
| G2 WebMCP integrity | PASS | Browser discovery and inspector exposed exactly 18 tools; live calls changed the world. |
| G3 Mathematical truth | PASS | Calculus, determinant, angle, and homothety spot checks matched the displayed state. |
| G4 Shared-world truth | FAIL | The approved opening and barycentric tutor/learner choreography do not exist yet. |
| G5 Demo reliability | FAIL | The complete storyboard path cannot run because several acts and overview are absent. |
| G6 Hackathon boundary | PASS | Parent diff/package inspection found no tests, CI/CD, auth, or production systems. |
| G7 Media freeze | PASS | Parent dirty-file snapshot confirms no existing media/capture/narration/deployment file changed during baseline. |

### Per-criterion

| # | Criterion | Score | Evidence |
|---|---|---:|---|
| C1 | First-thirteen-second comprehension | 0/16 | No algebra cold open or tutor annotation. |
| C2 | Mathematical escalation and continuity | 6/13 | Three real worlds exist; transitions are abrupt and later acts are missing. |
| C3 | WebMCP causality and indispensability | 8/16 | Real tools/actions exist, but causality lives mainly in the inspector/activity log. |
| C4 | Human–tutor shared-world choreography | 6/12 | Human and tutor commits exist; approved opening and complete sequence are absent. |
| C5 | Calculus as a living relationship | 0/10 | No direct integral-bound manipulation; reactive presentation is incomplete. |
| C6 | Attention as geometry | 5/10 | Matrix/vector transform works; Q/K scores, softmax, and ribbons are absent. |
| C7 | Olympiad geometry depth | 5/10 | Dynamic homothety works; spiral similarity and barycentrics are absent. |
| C8 | Cinematic shot readiness | 3/7 | Three targets exist; opening, overview, and safe overlay composition do not. |
| C9 | Legibility and visual discipline | 2/4 | Brand is strong; framing, empty space, and dense labels weaken shots. |
| C10 | Visible feature density without fakery | 1/2 | Existing heroes are real; several planned heroes do not exist. |

## Round 1 — blind hostile-review triage

**Reviewer:** fresh-context `gpt-5.6-luna`, high reasoning, blind to rubric/weights  
**Accepted:** 6 · **Rejected:** 2 · **Deferred:** 0

### DO NOW

- Default/scene camera exposes blank space and clipped neighboring worlds — true in a
  2560×1440 capture and directly damages C1/C8.
- “Check step” ignores the submitted expression — source-verified and covered by C10's
  no-fakery requirement; add one honest success path.
- WebMCP inspector collides with activity/zoom evidence — CSS/source-verified and damages
  C3/C4/C9.
- Agent viewport movement and reload can disagree with the scene label — source-verified;
  derive visible scene state from the shared camera.
- Approved reconstruction objects are not added to their frame's child list — source-verified
  and a cheap shared-world consistency fix.
- The approved algebra opening, real tool trace, and opening/overview camera targets are
  absent — baseline-scored gaps and the dominant Round-1 implementation slice.

### REJECTED

- “Topologically resolve arbitrary out-of-order geometry primitives” — real generality gap,
  but explicitly outside the deterministic filmed path and too expensive for its rubric value.
- “Track localStorage save failure in the header” — production-resilience detail outside the
  approved hackathon/video boundary; the filmed browser has working local storage.

### Rubric audit

No criterion was added. The blind review's meaningful surprise—the fake answer checker—is
already covered by C10 (“every visible control and response is real”), while all camera and
overlay findings are covered by C8/C9. Reweighting would therefore duplicate existing intent.

## User-approved scope amendment — before Round 1 scoring

The user rejected the elementary distributive-property opening and the simple `xe^x`
integral as intellectually below the film's ambition. They explicitly added a real
tiny-transformer training visualization, a rigorous bridge into Olympiad geometry, a 3D
mathematical object, and an advanced number-theory/Ramanujan finale.

The storyboard and rubric were therefore amended before Round 1 was scored. The new
continuity spine is:

`Γ(9/2) sign error → normalized Gamma area → softmax/training → attention as barycentrics →
homothety/spiral similarity → tetrahedral probability simplex → partition lattice/Ramanujan`.

### Truth decisions

- Use “repeated integration by parts,” not “double integration by parts.”
- Call the model a tiny transformer and show one real gradient update; never claim a
  frontier LLM was trained.
- Attention weights are barycentric coordinates only when used as convex coefficients of
  the visible value-vector vertices.
- A homothety does not rotate; rotation plus scaling is reserved for spiral similarity.
- The partition act may compute and reveal Ramanujan's congruence, but may not claim to prove
  it unless a complete proof is genuinely implemented.
- Telescoping and induction are not inserted as disconnected theorem salad. Optimization is
  represented honestly by the entropy-regularized softmax interpretation; Gaussian smoothing
  is reserved for the lattice-to-generating-function transition.

### Rubric consequence

Rubric v1's 36/100 baseline is retained for audit but is not numerically comparable to the
amended v2 rubric. A clean v2 baseline will be re-established against commit `e9db560`
before the first v2 improvement score is accepted.

## User-authored ink checkpoint — Round 1 paused before scoring

The user correctly rejected the handwriting-style font after seeing the live `Γ(9/2)`
opening. The repeated glyph shapes and uniform stroke weight visibly read as a font, which is
fatal in the film's hero close-up.

A temporary same-origin `/handwriting` studio now presents three exact LaTeX references next
to a large mouse/pen canvas:

1. the incorrect two-line recurrence;
2. the learner's corrected reduction;
3. the Tutor's compact diagnostic note.

Captured points are stored locally, smoothed, cropped, aspect-fitted, recolored by author,
and hydrated as semantic multi-stroke ink objects. The correction is a separate human-authored
undoable commit. No screenshot or font substitution is used.

Round 1 scoring remains paused until the user supplies these three handwriting samples; this
is required creative input, not a product or infrastructure blocker.
