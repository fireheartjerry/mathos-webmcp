You are continuing work on the Mathburst repo at /Users/fireheartjerry/Code/mathos-webmcp,
in parallel with a Claude agent editing the same repository right now.

Your first branch (codex/render-layer) is MERGED into hackathon-build. Thank you — the
construction motion, the olympiad primitives and the simplex orbit all landed clean,
with zero conflicts. Re-read docs/CODEX_HANDOFF.md sections 3 (file ownership) and 6
(how to verify); the same hard boundary applies.

Start a fresh worktree from the merged tip:

  cd /Users/fireheartjerry/Code/mathos-webmcp
  git worktree add ../mathos-codex-2 -b codex/render-layer-2 hackathon-build
  cd ../mathos-codex-2
  pnpm install

CONTEXT THAT CHANGES YOUR TARGET
Two scenes are being cut from the film: the simplex/tetrahedron scene and the
partitions/Ramanujan scene. That is a film edit, not a product deletion — the widgets,
their tools and your C3 orbit work all stay in the product and keep the registered tool
count at exactly 48. It frees roughly 30 seconds of runtime, and that time is being
spent making the surviving scenes better. The surviving scenes are:

  gamma density -> attention -> training -> geometry -> barycentric -> matrix

Do NOT delete simplex or partition code. Claude handles the film edit.

---

D1 — Fix the mixtilinear collinearity (you were right, my contract was wrong)

You flagged in docs/CODEX_REQUESTS.md that `arcMidpoint { notContaining: 'A' }` is the
MINOR arc BC, while the mixtilinear theorem needs the midpoint of the MAJOR arc BAC.
That was a genuine error in my contract and you were right to refuse to fake it.

The contract now allows either field, exactly one required:

  { kind: 'arcMidpoint', id, of: [pA,pB,pC], notContaining?: <id>, containing?: <id>, label? }

`containing: 'A'` means the arc BC that passes through A — the major arc.

**`containing` is accepted by the types and the validator but is NOT yet implemented:
`resolveGeometry` still routes both fields through `arcMidpointNotContaining`, so it
currently returns the wrong point.** Implement it, then make the configuration exact:

  T (mixtilinear tangency), I (incenter) and the midpoint of arc BAC are collinear,
  and line TI passes through the midpoint of arc BC.

Both must hold to within a pixel while A, B and C are dragged anywhere non-degenerate.
Render the collinearity so a viewer can see it — the segment through T, I and the
major-arc midpoint should be drawn.

---

D2 — Deepen the construction for the six surviving scenes

C1 gave every view a staged rise. With ~30s freed, those builds can be richer and
slower rather than merely present. For each of LiveGraph, AttentionView, TrainingView,
GammaProbabilityView, LiveGeometry, BarycentricView and MatrixPlane:

- Add sub-stages. The attention card is the reference for granularity; the graph is
  currently the thinnest (axes -> curve -> area -> bins) and has the most room to grow.
- Stagger more finely, so parts arrive in a legible order rather than together.
- Give the build a beginning and an end: an empty frame first, contents assembling
  into it, the last element settling last. It should be obvious at 25%, 50% and 75%
  that different things exist.
- Keep the left-to-right curve trace exactly as it is. That is explicitly liked.
- Transform over opacity, still. Opacity fading was the original complaint.

The reviewer's words remain the target: *"like a bunch of mini pixel construction
workers"*, *"procedurally clean and frontier — 3blue1brown"*.

---

D3 — A real end card

The film currently ends by holding a workspace. It needs a closing composition that is
designed rather than incidental. Build a `.cinematic-lockup`-style end state that the
film can trigger, showing:

  - the product name,
  - the line "One mathematical world. Every agent can enter.",
  - a live 48 / 48 tools · N calls readout taken from the real ledger, not hardcoded.

It must animate in (your `backOut` is the house curve) and hold cleanly. Claude will
wire the trigger; you own how it looks and how it animates. If you need a hook or a
prop from a Claude-owned file, write it in docs/CODEX_REQUESTS.md rather than reaching
across.

---

Constraints (unchanged)
  - Never edit files in Claude's ownership list (handoff section 3). Requests go in
    docs/CODEX_REQUESTS.md.
  - Never run anything in scripts/film/.
  - Check `lsof -i :3000` before starting a dev server; Claude runs captures there.
  - Keep `npx tsc --noEmit` clean at every commit.
  - Do not change tool names, tool schemas, or the number of registered tools. The
    submission's central claim is that exactly 48 register and all 48 succeed.
  - Tool descriptions are capped at 500 characters and parameter descriptions at 150;
    the app throws at construction and the whole page 500s if either is exceeded.

On your verification note: you were right that the in-app browser could not expose the
tools. Use `window.__mathburstFilm.runTool(...)` from the page console instead — the
snippet in handoff section 6 works and does not depend on `document.modelContext`.

Commit to codex/render-layer-2. When D1, D2 and D3 are done and typecheck is clean,
stop and report what changed plus anything logged in docs/CODEX_REQUESTS.md.
