You are continuing on the Mathburst repo at /Users/fireheartjerry/Code/mathos-webmcp,
in parallel with a Claude agent. `codex/narration-schedule` is merged — the beat
scheduler took silence from 20.5s to 61.2s and bounded worst-case drift from 14.2s to
5.2s, and the precise failure messages are exactly right. Same shape of problem here.

Fresh worktree from the merged tip:

  cd /Users/fireheartjerry/Code/mathos-webmcp
  git worktree add ../mathos-codex-4 -b codex/framing hackathon-build
  cd ../mathos-codex-4
  pnpm install

---

F1 — Make framing a solver instead of a heuristic

**Why this is being handed over.** Framing has cost more review cycles than anything
else in this project. The reviewer's recurring complaints are all one underlying
problem: *"everything is really small and zoomed out"*, *"the next widget is covered by
some existing ones"*, *"it's being blocked by the agent replay widget"*, *"you zoom in
too much sometimes and zoom out too much sometimes"*. Each was patched individually and
the next capture surfaced another. It needs a model, not more patches.

**Where it lives.** Two functions in `src/components/MathburstWorkspace.tsx`:

- `chromeInsets()` — measures floating chrome (header, tool rail, WebMCP ledger,
  timelines panel, activity rail, docked agent console, reconstruction panel) and
  returns `{left, right, top, bottom}` for the region actually free for content.
- `viewportForBounds(bounds, emphasis, anchor)` — solves a `{x, y, zoom}` viewport,
  currently by fitting the target then keeping a coverage fraction
  (`SHOT_COVERAGE = { detail: .94, feature: .78, establish: .44 }`).

**For this round those two functions and `SHOT_COVERAGE` are YOURS.** Claude will not
touch them until you report. Everything else in that file, and the rest of the
ownership boundary in handoff section 3, still belongs to Claude — do not edit the
replay script, the tools, or anything in `scripts/film/`.

**The constraints a frame must satisfy.** State them explicitly and solve against them:

1. The subject is fully inside the free region — never clipped by a window edge, never
   underneath the docked console or the left column.
2. The subject fills a stated fraction of the free region, so a card reads at 720p.
   `detail` / `feature` / `establish` should be visibly different shots, not three
   names for the same zoom (that was the old bug: an additive margin made an 800x560
   card solve to 0.71 and occupy a fifth of the frame).
3. Neighbouring widgets do not intrude at the edges unless the shot is deliberately an
   `establish`. The world is a horizontal strip on a 1000px pitch — cards 800 wide,
   200 clear between — so a neighbour is always exactly one pitch away.
4. `anchor: 'cursor'` holds the world point under the pointer fixed while the zoom
   changes, so a push-in moves closer to what is being pointed at rather than
   recentring. Fall back to centring when that point is off-picture.
5. The camera must be stable: framing the same target twice must give the same answer.
6. **In-between frames matter.** The camera animates over roughly a second, and a
   reviewer screenshotting mid-move sees a badly composed frame with the subject
   half off-screen. If the path from A to B can pass through a state where the subject
   is clipped, the framing should choose a path that does not.

**Verify it without a capture.** A capture costs six minutes and Claude owns the
pipeline, so build a headless harness instead: feed the solver realistic canvas sizes
(2560x1440 for the film, and a 1440x900 window), realistic inset combinations (console
docked or not, timelines panel open or not, ledger pinned or not) and every widget size
the film uses (800x560, 730x560, 300x300 explainer frames, 420x80 captions), then assert
the constraints above hold. Report a table of shot -> resulting zoom and coverage. That
harness is the deliverable as much as the solver is.

**Do not** change the world layout in `src/domain/replay/script.ts` (Claude's, and being
actively edited). If the layout itself makes a constraint unsatisfiable, say so in
`docs/CODEX_REQUESTS.md` with the numbers and Claude will move the widgets.

---

Constraints (unchanged)
  - Keep `npx tsc --noEmit` clean at every commit.
  - Never run anything in `scripts/film/`; check `lsof -i :3000` before a dev server.
  - Do not change tool names, tool schemas, or the number of registered tools; exactly
    48 must register and all 48 must succeed.
  - Tool descriptions cap at 500 characters, parameter descriptions at 150. The app
    throws at construction and the whole page 500s if either is exceeded.

Commit to `codex/framing`. When done, report the harness table plus anything logged in
`docs/CODEX_REQUESTS.md`.
