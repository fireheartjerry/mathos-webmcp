You are continuing on the Mathburst repo at /Users/fireheartjerry/Code/mathos-webmcp,
in parallel with a Claude agent. Round two (codex/render-layer-2) is merged — the
exact containing-arc midpoint, the deeper construction motion and the final lockup all
landed clean, and the 1.62e-14 collinearity check across 300 triangles was the right
way to prove it.

Fresh worktree from the merged tip:

  cd /Users/fireheartjerry/Code/mathos-webmcp
  git worktree add ../mathos-codex-3 -b codex/narration-schedule hackathon-build
  cd ../mathos-codex-3
  pnpm install

This round is ONE task, and it is a solver rather than a rendering job.

---

E1 — Schedule the narration against measured beats

**The problem.** `scripts/film/build-replay.mjs` places narration clips using a
hand-written table of absolute offsets, scaled by a single `NARRATION_SCALE` factor:

    const plan = [ ['01-what', 1.6], ['02-problem', 11.2], ... ]

That model is wrong and it shows. When the picture is re-paced, every anchor moves by
the same ratio even though the beats did not — some acts stretch more than others. The
current cut has one clip pushed **14.2 seconds** past its anchor by the collision
avoidance, only 20.5s of silence in a 177s film, and lines that describe things the
viewer already stopped looking at.

**What exists to work from.** `video/public/film-replay/timeline.json` is written by
the capture and holds the take's real structure:

    { seconds, frames, shots: [...], events: [ { t, kind, label }, ... ] }

`kind` is one of `take` / `shot` / `bridge` / `tutor` / `human`, `t` is seconds from
the start of the take, and `label` is the commit summary — e.g. "Visualized attention",
"Created timeline \"Density draw-in\"", "Applied gradient step 1". Roughly 65 tutor
commits and 3 human ones in a typical take. Those timestamps are ground truth: they are
when things actually happened on screen.

**What to build.** Replace the fixed table with a scheduler that places each clip
against the beat it describes. Concretely:

1. Give each narration clip a **beat predicate** instead of a number — a way of saying
   "this line belongs to the commit whose label matches X", or "…to the Nth commit
   after that one". Keep it declarative and readable; a maintainer should be able to
   see which beat a line is attached to without running anything.
2. Solve the placement subject to the real constraints:
   - a clip may start **at or after** its beat, never before it (the voice must not
     describe something the viewer has not seen);
   - clips never overlap, with a minimum gap (0.35s today);
   - the last word must land inside the film, which is `CONTENT_ENDS + HOLD`;
   - prefer spreading slack toward **more silence between clips** rather than
     bunching them — the film wants breathing room, not density.
3. When it cannot satisfy everything, **say so precisely and fail** — which clip, by
   how much, against which constraint. Do not silently push a clip 14 seconds late,
   which is what happens today.
4. Report a short schedule table on stdout: clip, its beat, beat time, start, end,
   drift from beat. That table is how a human checks the voice matches the picture.

Sanity checks worth having: total speech must fit the film with the required gaps
before you attempt placement, and every clip's beat must exist in the timeline (a
typo in a predicate should fail loudly, not place the line at zero).

**Scope.** `scripts/film/build-replay.mjs` is Claude-owned, but for this round it is
**yours** — Claude will not touch it until you report. Everything else in the ownership
boundary (handoff section 3) still applies: do not edit the replay script, the tools,
the workspace, or anything else in `scripts/film/`, and do not run any capture.

You can develop against the committed `video/public/film-replay/timeline.json` from the
latest take; run `node scripts/film/build-replay.mjs` with the same env vars Claude
uses (`CONTENT_ENDS`, `HOLD`, and whatever replaces `NARRATION_SCALE`) and inspect the
`narration.json` it writes. It must keep writing the same output shape:

    { source: 'replay', clips: [ { shot, file, duration, offset, text }, ... ] }

Keep `npx tsc --noEmit` clean (the script is plain JS, but the repo check must pass).

Commit to `codex/narration-schedule`. When it is done, report the schedule table for
the current timeline plus anything you logged in `docs/CODEX_REQUESTS.md`.
