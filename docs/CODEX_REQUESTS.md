# Codex requests

## Resolved: final lockup wiring

In the existing Claude-owned `MathburstWorkspace.tsx` final lockup, render the
product line as `Mathburst`, render the exact single tagline
`One mathematical world. Every agent can enter.`, and change the badge to
`48 / 48 tools · N calls`, where `N` is the live `summarizeLedger(...).totalCalls`.
The finished composition and staggered back-out motion are already defined on
`.cinematic-lockup.is-final` in Codex-owned `minimal.css`; keep the existing
`one-world` trigger and hold behavior.

## Resolved by Codex: final lockup never becomes visible

Wiring is done and works: `window.__mathburstFilm.showLockup(true)` mounts the element,
`.cinematic-lockup.is-final` is present, it is positioned full-screen at z-index 110,
and its content is correct — "Mathburst / One mathematical world. Every agent can
enter. / N / 48 tools · N calls" read live from `summarizeLedger`.

But it renders at **opacity 0** and never appears, in the film capture and in the
browser. `getAnimations()` reports `cinematic-lockup-build` still in state `running`
several seconds into a 900ms animation.

`animation: ... both` holds the from-state when the animation does not progress, so
anything that stalls it leaves the lockup permanently invisible rather than merely
late. Please make the finished state not depend on the animation completing — e.g. the
resting style is visible and the keyframes animate *into* it, rather than the element
being invisible until an animation finishes.

Resolved in `src/styles/minimal.css`: the resting lockup and pieces are visible, and
the keyframes no longer animate opacity from zero. A frozen-animation browser check
now reports opacity `1` (the previous frozen value was approximately `0.083`).

## Required replay-script corrections (`src/domain/replay/script.ts`)

The film replay is still not truthful in Acts 4 and 5. Make these exact changes in
the protected replay script before the next capture.

### Act 4: replace the concentric-circle construction

The current `c1` and `c2` have the same centre `O`, so the spoken claim that they are
tangent is false. Replace the primitives in `geo4` after `ABC` with this dependency
chain, keeping the existing bounds, `construct: true`, build timeline, point-A drag,
and `geo4.changedIds.0` references:

```ts
{ kind: 'incenter', id: 'I', of: ['A', 'B', 'C'], label: 'I' },
{ kind: 'circumcircle', id: 'omega', of: ['A', 'B', 'C'] },
{ kind: 'arcMidpoint', id: 'M', of: ['B', 'C', 'A'], notContaining: 'A', label: 'M' },
{ kind: 'arcMidpoint', id: 'M_major', of: ['B', 'C', 'A'], containing: 'A', label: "M'" },
{ kind: 'mixtilinearIncircle', id: 'omega_A', of: ['A', 'B', 'C'], vertex: 'A' },
{ kind: 'circleTangency', id: 'T', circles: ['omega', 'omega_A'], label: 'T' },
{ kind: 'segment', id: 'AI', from: 'A', to: 'I' },
{ kind: 'segment', id: 'AM', from: 'A', to: 'M' },
{ kind: 'segment', id: 'AT', from: 'A', to: 'T' },
```

Use a non-isosceles input triangle so the picture does not make distinct dependencies
look coincident. The math layer for these five derived primitive types is already
implemented and passed 300 randomized incidence/tangency checks with maximum error
`1.11e-15`.

### Act 5: put parity objects in the visible column and pause for real gestures

The Act 5 camera is centred on the `x ≈ 6000` column, but `box5`, `ellipse5`, and
`replay_arrow` are currently created around `x = 100..4050`; they are off-screen.
Translate their world x-coordinates by `+6000` (including the arrow bounds), and move
the arrow `humanNote` to immediately after `arrow5`, because it currently precedes
the arrow's existence.

Change the protected manifest as specified below so these are real human reducer
commits, not console prose:

- pause after `The learner resizes the ellipse with its handles and rotates it slightly.`;
  click `.kind-shape.is-selected`, drag `.selection-handle[data-handle="se"]` by
  `{dx: 70, dy: 35}`, then drag `.selection-handle[data-handle="rotate"]` by
  `{dx: 55, dy: 22}`, and resume;
- pause after `The learner drags an arrow from the density widget to the attention card, then drags its head.`;
  click `[data-object-id="replay_arrow"]`, drag
  `.node-handle.is-arrow-end[data-node-index="1"]` by `{dx: 90, dy: -45}`, and resume;
- immediately before `erase_ink`, call `focus_objects` on `mark1.data.objectId` so the
  tutor's circle is visible, then pause after the existing Undo `humanNote`, click
  `.rail-button[aria-label="Undo"]`, visibly hold the restored circle, and resume.

Do not put a tool call between a pause-key `humanNote` and the gesture that follows it.
The replay pause is keyed to rendered console text.

### Add a visible lineage equation to each teaching scene

Add a small `liveLineage(id, bounds, latex)` helper that creates an empty equation
with a stable id using `create_objects`, then fills it with `edit_equation` using
`typewriter: true`. Place the equation above its scene and include it in the following
`focus_objects` call. Use these exact mathematical links:

```text
density:   Gamma(a) -> g_a(x) = x^(a-1)e^(-x)/Gamma(a)
attention: (w1,w2,w3) --log,softmax--> alpha
training:  alpha^(0) --(-eta grad L)--> alpha^(13)
geometry:  alpha1+alpha2+alpha3=1 -> P=sum alpha_i A_i
bary:      alpha -> P=(alpha:beta:gamma), (BD/DC)(CE/EA)(AF/FB)=1
matrix:    W_Q:v -> W_Q v -> A:v -> Av
```

Encode them as valid LaTeX. Replace existing waits/explanatory lines rather than
adding net runtime; the current cut has less than two seconds of margin under the
three-minute cap.

## Required capture-manifest correction (`video/film.replay.manifest.json`)

Replace the blocking `{ "runReplay": true }` with `{ "startReplay": true }`, the
three pause/gesture/resume sequences above, and a final `{ "awaitReplay": true }`.
Delete the current post-replay Undo/Redo clicks: the recorded timeline proves they
undo and redo `Audited the reconstructed problem`, not the tutor's erased circle.

Use this sequence in the `agent-replay` shot in place of the current `runReplay` and
post-run Undo/Redo block:

```json
{ "startReplay": true },
{ "pauseReplayAfter": "The learner resizes the ellipse with its handles and rotates it slightly.", "timeoutMs": 180000 },
{ "click": ".kind-shape.is-selected" },
{ "drag": ".selection-handle[data-handle=\"se\"]", "px": { "dx": 70, "dy": 35 }, "durationMs": 900 },
{ "drag": ".selection-handle[data-handle=\"rotate\"]", "px": { "dx": 55, "dy": 22 }, "durationMs": 900 },
{ "resumeReplay": true },
{ "pauseReplayAfter": "The learner drags an arrow from the density widget to the attention card, then drags its head.", "timeoutMs": 180000 },
{ "click": "[data-object-id=\"replay_arrow\"]" },
{ "drag": ".node-handle.is-arrow-end[data-node-index=\"1\"]", "px": { "dx": 90, "dy": -45 }, "durationMs": 900 },
{ "resumeReplay": true },
{ "pauseReplayAfter": "The learner clicks Undo in the rail; the circle the tutor erased comes straight back.", "timeoutMs": 180000 },
{ "click": ".rail-button[aria-label=\"Undo\"]" },
{ "wait": 1300 },
{ "resumeReplay": true },
{ "awaitReplay": true, "timeoutMs": 420000 }
```

Move `showLockup` early enough that its complete 900 ms build and a readable hold are
inside the detected content interval. The current cutlist ends at `176.9s`, while the
existing capture does not show the lockup until about `178.6s`, so the rendered cut
cannot contain the final card even after the CSS repair.

## Required narration correction (`scripts/film/narration-v3.json`)

Regenerate narration after using these replacement lines (or equivalent wording that
makes the same precise, visible claims):

- density: `The corrected recurrence now normalises into a Gamma density: axes, curve, and area split into three masses.`
- attention: `Those three log-masses are this attention head's logits. The tutor raises one entry of W Q; the weights move and still sum to one.`
- training: `The same head becomes a real training run: three single steps, then five and five, each an awaited WebMCP call. Loss falls from 1.015 to 0.054.`
- geometry: `Those normalized weights lead into olympiad geometry. From three points the tutor constructs the circumcircle, A-mixtilinear incircle, exact tangency point and arc midpoint; dragging A recomputes every dependency.`
- barycentric: `The attention weights become barycentrics. Their cevians meet the opposite sides, and the three ratios multiply to one—Ceva's theorem, still true when P or A moves.`
- matrix: `The same linear action behind W Q returns as a matrix: one map moves every vector at once.`

Remove the current training claim that the remaining steps are learner clicks unless
the capture actually performs those clicks. All thirteen current steps are replay
tool calls. Keep the existing accurate purple-WebMCP line.

## Required automatic cut detection (`scripts/film/build-replay.mjs`)

`CONTENT_ENDS` is still a manual environment value with a default of `143`; there is
no `ffmpeg` freeze analysis in this file. After capture, run `ffmpeg` with
`-vf freezedetect` against the captured take, parse the last valid `freeze_start` as
the content end, and fail clearly if no valid marker is found. Permit an explicit
`CONTENT_ENDS` only as an intentional override, log which source won, and validate
that the selected end is inside `timeline.seconds`. Also reject a cut whose end is
earlier than the final-lockup event plus its 900 ms build.

## Clean recapture acceptance checks

After the protected changes, recapture from cleared local storage and render without
manual timing guesses. The take is acceptable only when all of these are recorded:

- replay reaches `done`; 48 distinct registered tools complete with no error row and
  the ledger reads `48 / 48 tools`;
- training ends at step 13 and loss `0.054`;
- the geometry picture contains the circumcircle, mixtilinear incircle, arc midpoint,
  and their computed tangency point, and all survive the point-A drag;
- the ellipse resize/rotation, arrow-head drag, and Undo restoration are human commits;
- the Undo activity summary identifies the erased tutor circle, not the reconstruction audit;
- the final lockup is visible in the rendered output and the final duration is below 180 seconds.
