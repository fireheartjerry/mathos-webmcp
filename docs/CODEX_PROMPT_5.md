You are auditing and finishing a hackathon submission at
/Users/fireheartjerry/Code/mathos-webmcp. Unlike the previous four rounds you are
working alone: Claude has stood down for this one, so the repository is yours.

**Read this whole prompt before touching anything, and read it as a specification, not
as a report card.** Below is the complete reviewer feedback this project is being built
against, and a claim-by-claim account of what has been done about each item. Treat the
existing work as if it were written by someone you have never met and have no reason to
trust. Do not assume an item is fixed because this document says it is. Several things
in here were claimed fixed once and were not; two were fixed and then silently broken
again by a later change. Your job is to check every entry against the code and the
running product, fix what is still wrong, and improve what is merely adequate.

## Working arrangement — no worktree this round

**You have the main checkout to yourself.** Claude has stood down: it will not edit
files or run captures while you work, so there is nobody to collide with and no
ownership split to respect beyond the two paths in section 7.

    cd /Users/fireheartjerry/Code/mathos-webmcp   # already on hackathon-build
    pnpm install                                   # if node_modules is stale

Work on `hackathon-build` directly, or branch from it if you prefer — your call.

### Everything already merged into `hackathon-build`

Four of your branches are in, each merged with zero conflicts:

| Branch | Worktree | What it landed |
|---|---|---|
| `codex/render-layer` | `../mathos-codex` | staged construction motion, computed olympiad primitives, simplex orbit |
| `codex/render-layer-2` | `../mathos-codex-2` | exact containing-arc midpoint and drag-stable mixtilinear collinearity, deeper construction across seven views, the final lockup |
| `codex/narration-schedule` | `../mathos-codex-3` | beat-anchored narration scheduler |
| `codex/framing` | `../mathos-codex-4` | the deterministic framing solver and its headless harness |

Claude's own work is merged on the same branch — the film script, the capture driver,
the tool-side contracts, the two scene cuts, the layout guard, and the wiring for your
lockup and your scheduler.

**Those four worktrees are stale and safe to delete.** Everything in them is merged;
`git branch --merged hackathon-build` confirms all four. Clean them up if you like:

    git worktree remove ../mathos-codex   ../mathos-codex-2 \
                        ../mathos-codex-3 ../mathos-codex-4
    git branch -d codex/render-layer codex/render-layer-2 \
                  codex/narration-schedule codex/framing
    git worktree prune

There is also a detached-HEAD worktree at `~/.codex/worktrees/7332/mathos-webmcp`
sitting on the original clone commit `3202fd6`, far behind. It holds nothing that was
not superseded; remove it too if it is yours.

---

# 1. What the thing is

Mathburst is an infinite canvas where a learner and an AI tutor edit the same document
through **48 WebMCP tools** registered with the browser via
`document.modelContext.registerTool`. A tool call and a toolbar click compile to the
same typed operations against the same reducer (`src/domain/world/reducer.ts`).

The submission includes a film under three minutes. It is **not** a mockup: every call
in it is a real tool call against the real product, performed in one continuous take by
`scripts/film/capture.mjs` driving a headful Chrome over CDP. The scripted sequence is
`src/domain/replay/script.ts`.

The argument the whole submission rests on: *an agent edit the student cannot reverse
is a demo, not a tool.* Everything the film claims must be literally true on screen.
**A false claim is worse than a missing feature.**

Current spine after two scenes were cut:

    gamma density → attention → training → geometry → barycentric → matrix

---

# 2. The reviewer's thirteen frame-by-frame notes

Quotes are the reviewer's own words.

**1 — Everything too small.** *"the first thing i notice is that everything is really
small and zoomed out, making it hard to see text and widgets and that stuff. This is
true for all other frames."* Also: the opening handwriting sat in the bottom-right; it
should be centre or top-left.
*Done:* `viewportForBounds` was inflating the subject by an additive margin before
fitting (an 800×560 card became 1440×1200 and solved to zoom 0.71, about a fifth of
frame). Replaced with coverage fractions, then replaced again by your own constraint
solver in `src/domain/animation/framing.ts`.
*Check:* does the opening ink actually land centre/top-left, or was only the zoom fixed?

**2 — The circle marked nothing.** The tutor says it will circle where the sign is lost;
it ringed empty canvas. The ink also ran under the agent console.
*Done:* position derived from the captured strokes — mapped through `cropAndFit`, then
fraction bars separated from operators by testing for digits above *and* below. The
minus is stroke 42 at world (849, 330).
*Check:* verify the ring is on the minus in the current build, not merely closer.

**3 — Pans went too far.** *"instead of panning it top left, pan it completely left
because that's more realistic."*
*Done:* world re-laid as one horizontal strip on a 1000px pitch; acts exit stage-left,
camera only pans right.

**4 and 6 — Widgets covering each other.** Raised twice, at different points.
*Done:* `scripts/film/check-layout.mjs` fails on widgets closer than 80px, and
distinguishes connectors (a shape *ringing* a card, an arrow *joining* two) from
widgets. The residue was framing, not layout.

**5 — The builds were fades, not construction.** *"it just looks like you sort of fade
it in and then you trace the graph out. The tracing of the graph is fine, but I don't
like fading in as the primary build… It should be a much more powerful build where it's
procedurally generated in a very bouncy and professional fashion… built from the ground
up… like a bunch of mini pixel construction workers."* Explicitly: load the empty frame
first, then parameters slide up, bounce, settle.
*Done:* `construct: true` on the creating tools seeds `drawProgress: 0` so a widget is
created **unbuilt**; `revealRise` + `backOut` drive staged entrance motion in every
view. Curve tracing was deliberately preserved — the reviewer likes it.

**7 — Zoom-out reveals are GOOD, keep them.** *"I like how you zoom out because, while
zooming out, you display the other widgets, which shows that all this is done on one
canvas. This sort of zooming-out transition, I support it."* But: after a widget spawns,
zoom back in, because at that width the text is unreadable — *"The attention is really
small as text and hard to see… This also applies to all of the small text in general"*,
including the agent console's own text.
*Check:* is `establish` visibly a different shot from `feature`, does the film return to
a readable framing after each reveal, and is the console text legible at 720p?

**8 — Training should be a real run.** Train one step three times, five steps twice,
with teaching between. Plus: interacting with a widget should spawn explainer widgets
around it.
*Done:* thirteen sequential gradient steps, loss 1.015 → 0.054. **This one was broken
once already:** the steps were batched with `calls`, which fires `Promise.all`, so five
parallel calls read the same state, four duplicated, one failed red on camera, and the
model reached step 3 while the narration said thirteen. Now sequential.
*Check:* confirm from `timeline.json` that step 13 is actually reached.

**9 — The geometry was wrong.** *"the circles are not tangent, and you don't see the
other triangles tangent to the circles… The spiral centre constructs itself
independently. I think the geometry is actually just incorrect."* Wanted contest-grade
figures — Sharky-Devil / mixtilinear family. Also: the widget spawned already drawn.
*Done:* computed primitives (incenter, circumcircle, arcMidpoint, mixtilinearIncircle,
circleTangency); exact to 1.62e-14 across 300 random triangles. `construct: true` was
missing on `construct_geometry` (a regex missed it) and is now set.

**10 — Widgets feel disconnected.** Each scene should open by naming itself and its
lineage from the previous one, in voice *and* in on-canvas LaTeX the agent writes live.
Barycentric was called *"a bit too basic"*; the reviewer wants IMO-level depth.
*Partly done:* a concept map joins each widget to the one that produced it with the
reason written on the join. **Per-scene openers naming lineage are still thin, and the
barycentric depth request was never really addressed.**

**11 — The parity act demonstrated nothing.** It claimed the learner resizes a shape by
its handles, that the tutor erases its own circle, that one undo brings it back — none
shown. *"It would be helpful if your cursor literally went to the undo button and
clicked it."* Also wanted: do this on blank canvas, not on top of existing widgets, and
in sync with narration.
*Done:* the parity act has its own empty column; the cursor travels to the rail and
clicks Undo then Redo; the timeline records three human commits where it recorded one.
**Still missing: the handle-drag on a shape, and the arrow-head drag, are still narrated
but not performed.**

**12 — The simplex.** Frames should spawn default and be styled black *by a tool call*;
construction should be worker-style, not a fade; it should read as genuinely 3D; and the
tutor should rotate it with WebMCP tools like a CAD orbit.
*Done then cut:* the orbit and depth cues were built, then the scene was cut from the
picture for runtime. The lab still runs off-canvas so `set_simplex_view` still executes.

**13 — The matrix scene** was blocked by the console and over-zoomed; after a push-in
the film must return to a standard framing or the basis-vector animation is unwatchable.
Also wanted: show how matrix / linear-transformation / the earlier widgets link.

---

# 3. The reviewer's general notes

**G1 — One standard zoom, and push in at the cursor.** *"We need just a general zoom. I
think we should have a standard zoom where one frame, or whatever, is just taking up as
much space as we would like it to… When you zoom in, though, I want you to zoom in on
where the cursor is, clicking our hard-coded cursor coordinates."* Zoom-outs remain
wanted, deliberately.
*Done:* your `framing.ts` solver, plus `focus_objects { anchor: 'cursor' }`.
**This was the single most repeated note in the entire review** — points 1, 4, 6, 7, 13
and G1 are one problem seen from six angles.

**G2 — Educational sub-frames.** When something meaningful changes, the agent should
spawn smaller sub-frames around the widget, connected like a flow chart with real edges,
each explaining behaviour relevant to what changed. The reviewer's example: for a
parabola vertex, spawn cards on the quadratic formula/discriminant, on the calculus, on
the extreme value theorem. Narration should acknowledge them, and the film should zoom
into one to show it is real content.
*Done, then halved:* implemented as frames + equations + notes joined by real arrows,
composed from `create_objects` and `set_arrow` (no new tool, so the count stays 48). Two
sets existed; one was cut for runtime. **Only the density set remains.**

**G3 — A graph of interconnectedness.** Arrows between widgets, with agent-written text
or LaTeX explaining *why* two things relate — the reviewer specifically noted it is
unclear how gamma density relates to attention.
*Done:* a concept map act draws five labelled joins across the chain.

**G4 — Purple is unexplained.** *"the text doesn't talk about purple enough. You need to
emphasise, maybe at the start, that purple is what it means."*
*Done:* the opening WebMCP line now says *"Watch for purple. Every purple glow is a tool
call landing on the page."*

---

# 4. Other feedback given along the way

- **Ledger reveal.** The reviewer asked to show the sidebar right of the tool rail that
  lists every tool used and its call count. *Done:* the film hovers `.tool-ledger` at
  the close; it opens on `:hover` alone, needing no state change.
- **The ending.** *"making the end scene a lot better as well."* A designed end card was
  built. **It is currently broken — see section 6.**
- **Dead air.** An earlier cut held a frozen frame for 19.4s with the last 12.4s silent.
  *Done:* `CONTENT_ENDS` is now measured with `ffmpeg freezedetect` rather than guessed.
- **Narration.** *"voice script would have to change asw but that is not an issue."*
  Your scheduler replaced the hand table: silence 20.5s → 60.9s, worst drift 14.2s →
  3.9s, clips 17 → 12 by dropping redundant play-by-play.
- **Two scenes cut** (simplex, partitions) to buy time. Both still run **off canvas**,
  because `set_simplex_view` and `set_partition_view` are called nowhere else and a
  naive cut would have taken the ledger to 46/48 and falsified the central claim.

---

# 5. Constraints you must not break

- **Exactly 48 tools must register and all 48 must succeed.** The ledger counts a tool
  as used only on a *successful* completion (`src/domain/tools/ledger.ts`). One failing
  call is the difference between 48/48 and 47/48 on camera. This has already bitten
  once: `inspect_math` was called on an ink object, which it rejects by design, and the
  film showed a red error for 13 seconds and a false 47/48.
- **The film must be under 3:00.** It currently sits at ~2:58.5 with ~1.5s of margin.
  Anything that adds camera moves or beats has no runtime to spend. If a fix needs time,
  say so rather than assuming room exists.
- **Tool descriptions cap at 500 characters, parameter descriptions at 150.** The app
  throws at tool construction and the entire page 500s. This has bitten twice, and
  `tsc` cannot see it — only loading the page can.
- **Never run anything in `scripts/film/`.** Claude owns capture and render. Check
  `lsof -i :3000` before starting a dev server.
- Verify through `window.__mathburstFilm.runTool(...)` from the page console rather than
  `document.modelContext`, which the sandboxed browser cannot expose.

---

# 6. Known-broken right now

**The final lockup never becomes visible.** `showLockup(true)` mounts it, the content is
correct ("Mathburst / One mathematical world. Every agent can enter. / N / 48 tools · N
calls" read live from `summarizeLedger`), it is positioned full-screen at z-index 110 —
and it renders at **opacity 0**. `getAnimations()` reports `cinematic-lockup-build`
still `running` seconds into a 900ms animation, and `animation-fill-mode: both` then
pins the from-state permanently. Make the resting state visible and animate *into* it,
so a stalled animation makes the card late rather than invisible forever.

---

# 7. What to do

1. **Audit every entry in sections 2, 3 and 4 against the code and the running page.**
   Where a claim is wrong, fix it. Where it is thin, deepen it. Assume nothing.
2. Fix section 6.
3. Finish what is honestly unfinished: the per-scene lineage openers and barycentric
   depth (note 10), the handle-drag and arrow-drag the parity act still only narrates
   (note 11), console text legibility (note 7).
4. Anywhere the film *says* something, verify the product *does* it. That failure mode
   has occurred three times in this project and is the most damaging one available.

Ownership for this round: **everything is yours except `scripts/film/**` and
`src/domain/replay/script.ts`.** Those two stay Claude's only because Claude runs the
capture and the render and needs them stable to do it — not because you should not
change them. If a fix needs either, write the exact change to `docs/CODEX_REQUESTS.md`
and Claude will apply it and re-capture.

Keep `npx tsc --noEmit` clean. Commit to `codex/audit`. Report what you checked, what
you changed, what you found already correct, and anything you deliberately left alone.
