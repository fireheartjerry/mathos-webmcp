You are working on the Mathburst repo at /Users/fireheartjerry/Code/mathos-webmcp,
in parallel with a Claude agent that is editing the same repository right now.

FIRST, read docs/CODEX_HANDOFF.md end to end. It defines a hard file-ownership
boundary between you and Claude. Editing outside your list will collide with work
happening at the same time and will be thrown away.

Set up your own git worktree before you write anything:

  cd /Users/fireheartjerry/Code/mathos-webmcp
  git worktree add ../mathos-codex -b codex/render-layer
  cd ../mathos-codex
  pnpm install

Then implement, in this order, the three tasks specified in section 5 of the handoff:

  C1  Replace fade-in reveals with real construction motion across all nine widget
      views. Elements rise from below, overshoot and settle (revealRise + backOut),
      staggered, assembling into an empty frame. Curve tracing stays as it is.

  C2  Olympiad-grade geometry. Implement the incenter / circumcircle / arcMidpoint /
      mixtilinearIncircle / circleTangency primitives so tangency is computed rather
      than drawn, and make the mixtilinear configuration exact: the tangency point T,
      the incenter I and the arc midpoint stay collinear while A, B, C are dragged.

  C3  Make the tetrahedral simplex read as a real 3D solid, render orbit.x / orbit.y
      as a camera orbit, add depth cues, and support right-drag to orbit.

The exact contract for shared names (easing names, the revealRise signature, the
orbit property, the geometry primitive kinds and their fields) is in section 4 of
the handoff. Those names are fixed — Claude is implementing the other side of them
at the same time. Do not rename them and do not add the tool-side plumbing yourself.

Hard constraints:
  - Never edit files in Claude's ownership list (section 3). If you need a change
    there, write it to docs/CODEX_REQUESTS.md instead and keep going.
  - Never run anything in scripts/film/. Claude owns the capture and render.
  - Check `lsof -i :3000` before starting a dev server; Claude may be mid-capture.
  - Keep `npx tsc --noEmit` clean at every commit.
  - Do not change tool names, tool schemas, or the number of registered tools.

Verify visually by driving the real WebMCP tools from the browser console rather than
by rendering the film — section 6 of the handoff has a working snippet.

Commit to codex/render-layer as you go. When all three tasks are done and typecheck
is clean, stop and report what you changed plus anything you logged in
docs/CODEX_REQUESTS.md. Claude will merge your branch.
