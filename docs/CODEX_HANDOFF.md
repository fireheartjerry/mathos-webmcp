# Codex handoff — Mathburst render layer

You are working **in parallel with a Claude agent on the same repository**. Read this
whole file before touching anything. The single most important rule is the file
ownership boundary in section 3: we are editing simultaneously, and if you write
outside your list we will produce conflicting work that has to be thrown away.

---

## 1. What the project is

Mathburst is an infinite canvas for mathematics where a learner and an AI tutor edit
the same document. The page registers **48 WebMCP tools** with the browser
(`document.modelContext.registerTool`), and the tutor drives the page through them.
A tool call and a toolbar click compile to the same typed operations against the same
reducer (`dispatchWorldAction` in `src/domain/world/reducer.ts`). Nothing bypasses it.

The submission includes a ~3 minute film. The film is **not** a mockup: it is a
scripted sequence of *real* tool calls (`src/domain/replay/script.ts`) performed
against the real product in a headful Chrome, screen-recorded by
`scripts/film/capture.mjs`.

**Claude owns the film pipeline and the script. You own how things look and compute.**

### Run it
```bash
pnpm install
pnpm dev          # serves on http://localhost:3000 (the --port flag is NOT respected)
```
Open `http://localhost:3000/?film=1` for film mode.

---

## 2. Worktree setup (do this first)

Work in a **git worktree** so our working trees never collide.

```bash
cd /Users/fireheartjerry/Code/mathos-webmcp
git worktree add ../mathos-codex -b codex/render-layer
cd ../mathos-codex
pnpm install      # node_modules is gitignored, the worktree needs its own
```

Commit early and often on `codex/render-layer`. Claude merges your branch at the end.

**Dev server coordination.** `vinext dev` ignores `--port` and binds 3000, and Claude
is running film captures against 3000 from the main checkout. Before you start a dev
server, check whether 3000 is busy (`lsof -i :3000`). If it is, a capture is probably
running — wait, or do your verification against the main checkout's server, since the
page reads from whichever tree is serving. Do **not** run `scripts/film/capture.mjs`;
that is Claude's, and two captures at once will fight over Chrome's debug port.

---

## 3. File ownership — the hard boundary

### You own (edit freely)
```
src/domain/animation/**            easing, evaluate, presets, playback, types
src/domain/math/**                 geometry.ts especially
src/components/LiveGraph.tsx
src/components/LiveGeometry.tsx
src/components/AttentionView.tsx
src/components/TrainingView.tsx
src/components/GammaProbabilityView.tsx
src/components/SimplexView.tsx
src/components/NumberTheoryView.tsx
src/components/MatrixPlane.tsx
src/components/BarycentricView.tsx
src/components/WorldObjectView.tsx
src/styles/graph.css
src/styles/geometry.css
src/styles/attention.css
src/styles/lattice.css
src/styles/minimal.css
```

### Claude owns (do NOT edit — you will be overwritten)
```
src/domain/replay/**               the film script and runner
src/domain/tools/**                all 48 tool definitions and schemas
src/domain/world/**                reducer, types, migrations, handwriting
src/domain/semantic/**
src/components/MathburstWorkspace.tsx
src/components/sidebar/**
src/components/inspector/**
src/components/animation/**        the Timelines panel UI
src/styles/mathburst.css
src/styles/cinematic.css
src/styles/console.css
src/styles/sidebar.css
scripts/**
video/*.json
docs/**  README.md  HANDOFF.md
```

If you believe you need a change in a Claude-owned file, **do not make it**. Write it
in `docs/CODEX_REQUESTS.md` (create it; that file is yours) with the exact change and
why, and Claude will apply it.

---

## 4. The contract

Claude has landed a **contract commit** on `hackathon-build`. It declares the shared
names, and it is the only time Claude touches files in your list. Branch from it (the
worktree command in section 2 does this). These names are fixed — implement against
them exactly, and do not rename them.

### 4a. Easing names
`AnimationEasing` (in `src/domain/animation/types.ts`, yours) gains:
- `'backOut'` — overshoot past the target then settle. This is the construction curve.
- `'bounceOut'` — decaying bounce.

**This is entirely yours — no tool-side work is needed.** Easing names are not
validated or enumerated anywhere outside `src/domain/animation/`, so adding them to
the type, implementing the curves, and registering them in `EASINGS` is the whole job.

### 4b. Reveal helper
Add to `src/domain/animation/evaluate.ts` (yours):

```ts
/** Entrance transform for one staged sub-element: rises from below and overshoots. */
export function revealRise(
  p: number, start: number, end: number,
  options?: { distance?: number; overshoot?: number },
): { opacity: number; translateY: number; scale: number }
```
`distance` defaults to ~18 world px, `overshoot` to ~0.12. At `p <= start` it returns
`{opacity: 0, translateY: distance, scale: 1 - overshoot/2}`; at `p >= end`,
`{opacity: 1, translateY: 0, scale: 1}`.

### 4c. Simplex orbit — already fully plumbed
Correction to an earlier draft: there is **no `orbit` property**. The simplex object
already carries **`rotationX`** and **`rotationY`** (radians), `set_simplex_view`
already accepts both, and both are already animatable (`animation/evaluate.ts:70`,
`world/migrations.ts:479`). So a timeline can rotate the solid **today**.

**Nothing is missing but the rendering.** Your whole job for C3 is to make
`SimplexView` turn those two numbers into a convincing 3D orbit.

### 4d. Geometry primitives — declarations already landed
The contract commit has **already added** these `GeometryPrimitive` kinds to
`world/types.ts`, their validation in `world/migrations.ts`, their dependency cases in
`primitiveReferences` and `primitiveRefs`, their `REVEAL_RANK` entries, and their
`describe()` strings. Everything typechecks and they simply do not render yet.

**Your job is the maths and the drawing: implement them in `resolveGeometry`
(`src/domain/math/geometry.ts`) and render them in `LiveGeometry.tsx`.** Note the
guard near the end of `resolveGeometry` that currently `continue`s past these kinds —
replace it as you implement them. Field names are fixed:

```ts
{ kind: 'incenter',            id, of: [pA, pB, pC], label? }
{ kind: 'circumcircle',        id, of: [pA, pB, pC] }
{ kind: 'arcMidpoint',         id, of: [pA, pB, pC], notContaining: <a point id from `of`>, label? }
{ kind: 'mixtilinearIncircle', id, of: [pA, pB, pC], vertex: <a point id from `of`> }
{ kind: 'circleTangency',      id, circles: [circleId, circleId], label? }
```

---

## 5. Your tasks

### C1 — Real construction motion (highest priority)

**The problem.** Every view already stages its own build off one `drawProgress`
fraction (`revealProgress`, `revealStage`, `revealItem` in `animation/evaluate.ts`).
`AttentionView.tsx:185` is the reference: header → matrix rows → vectors growing from
the origin → softmax bars → readouts. That machinery is good.

What is wrong is the **verb**. Every sub-stage expresses itself as *opacity* (plus
stroke-dash for paths). The result reads as a fade, and the reviewer's words were:
*"fading in is not the proper way. I want it to be built from the ground up… like a
bunch of mini pixel construction workers."*

**What to build.** Rewrite each view's staged reveal so elements **slide up from
below, overshoot slightly, and settle**, staggered across the build, using
`revealRise` + `backOut`. Opacity may participate but must not be the primary motion.

Specifically:
- An empty frame/chrome appears first, then its contents assemble into it.
- Rows, cells, labels, controls, legends and readouts each rise in sequence
  (`revealItem` already gives you the per-item windows; keep the ordering).
- **Curve tracing stays as it is** — the reviewer explicitly likes the left-to-right
  trace. Only the surrounding furniture changes.
- Prefer transform (`translate`/`scale`) over opacity; transforms are cheap and read
  as construction.

**Acceptance.** With `drawProgress` animated 0 → 1 over ~5s, a still taken at 25%,
50% and 75% must each show a *different, partially-built* widget — never the finished
widget at reduced opacity.

**Views to cover:** `LiveGraph`, `AttentionView`, `TrainingView`,
`GammaProbabilityView`, `SimplexView`, `NumberTheoryView`, `MatrixPlane`,
`BarycentricView`, `LiveGeometry`.

---

### C2 — Olympiad-grade geometry

**The problem.** `visualize_concept('homothety')` and the film's construction place
points by hand with a `factor: 0.72` homothety. Nothing *enforces* tangency, so the
circles are not tangent, the second triangle is not tangent to them, and the spiral
centre is unrelated to the rest of the figure. It looks like a sketch, not a
configuration. The reviewer wants figures that read like contest geometry
(Sharky-Devil / mixtilinear incircle family).

**What to build.** Implement the primitives in 4d so tangency is *computed*, then make
the canonical configuration exact:

> Triangle `ABC` with circumcircle `Ω` and incenter `I`. The `A`-mixtilinear incircle
> `ω` is tangent to `AB`, to `AC`, and internally tangent to `Ω` at `T`. Then `T`, `I`
> and the midpoint of arc `BAC` are collinear, and line `TI` passes through the
> midpoint of arc `BC`.

Those collinearities are the payoff: they must hold **exactly**, and must keep holding
while `A`, `B` or `C` is dragged. That is a far stronger product claim than a static
picture, and it is what makes the figure look like olympiad geometry.

Math notes that will save you time:
- Incenter: `(a·A + b·B + c·C)/(a+b+c)` with `a = |BC|` etc.
- Circumcentre: intersection of two perpendicular bisectors.
- Arc midpoint of `BC` not containing `A`: the second intersection of line `AI` with
  `Ω`. (This is also the circle centre of `B`, `I`, `C` — a useful check.)
- The `A`-mixtilinear incircle centre lies on `AI`; its radius follows from tangency
  to `AB`. Get the centre by solving `dist(centre, AB) = |centre − O| ... ` for the
  internal-tangency condition with `Ω`, or use the known homothety at `T`.

**Acceptance.** Drag `A` anywhere non-degenerate: `ω` stays tangent to both sides and
to `Ω`, and `T`, `I`, arc-midpoint stay collinear to within a pixel. Degenerate inputs
(collinear points) must not throw — return the primitive unresolved.

---

### C3 — Make the simplex read as 3D, and orbit it

**The problem.** The tetrahedral probability widget is drawn in a perspective
projection but does not read as a solid, and it never moves. The reviewer wants it to
visibly *be* 3D and to be rotatable by the tutor, the way right-drag orbits a CAD
model.

**What to build.**
- Render `orbit.x` / `orbit.y` (4c) as a real camera orbit around the solid.
- Add depth cues so the projection reads as a solid: depth-sorted edges, back edges
  drawn lighter/dashed, vertex occlusion, a faint ground shadow or a subtle fill on
  the front faces. Lattice points should scale slightly with depth.
- The section plane sweep already exists (`simplex.section`); keep it, and make sure
  it looks correct at any orbit angle.
- Support **right-drag to orbit** directly in the view, so a human can do what the
  tool does — parity matters in this product.

**Acceptance.** Animating `orbit.y` through a full turn produces a convincing rotating
solid with no z-fighting or popping, and the section plane stays geometrically correct
throughout.

---

## 6. How to verify without the film pipeline

Drive the real tools from the browser console — this is much faster than a capture:

```js
const f = window.__mathburstFilm
f.openProject('gamma-lab')

// create something UNBUILT, then build it
const v = await f.runTool('visualize_concept',
  { concept: 'attention', bounds: { x: 4200, y: 4200, width: 800, height: 560 }, construct: true })
const id = v.changedIds[0]
await f.runTool('focus_objects', { ids: [id], emphasis: 'feature' })

const t = await f.runTool('create_timeline', { name: 'build', duration: 5,
  tracks: [{ target: { kind: 'object', objectId: id, path: 'drawProgress' },
             keyframes: [{ time: 0, value: 0, easing: 'backOut' }, { time: 5, value: 1 }] }] })
await f.runTool('play_timeline', { timelineId: t.data.timelineId, action: 'play' })
```

`construct: true` seeds `drawProgress: 0`. Without it a new object renders **fully
built**, because `revealProgress` treats a missing `drawProgress` as 1.

Always run `npx tsc --noEmit` before committing. It must be clean.

---

## 7. Rules of engagement

1. **Never edit a Claude-owned file.** Requests go in `docs/CODEX_REQUESTS.md`.
2. **Never run `scripts/film/capture.mjs`** or any script in `scripts/film/`.
3. Work on `codex/render-layer` in the worktree. Small, described commits.
4. Keep `npx tsc --noEmit` clean at every commit.
5. Do not change tool schemas, tool names, or the tool count. The submission's central
   claim is that exactly 48 tools are registered and all 48 succeed; a schema that
   throws at construction takes the whole surface down.
6. Parameter descriptions in tool schemas are capped at 150 characters — not your
   files, but worth knowing if you read them.
7. If something in your area looks broken but is out of scope, note it in
   `docs/CODEX_REQUESTS.md` rather than fixing it silently.

## 8. Definition of done

- C1, C2, C3 implemented and visually verified via section 6.
- `npx tsc --noEmit` clean.
- Everything committed on `codex/render-layer`.
- `docs/CODEX_REQUESTS.md` lists anything you needed from Claude's files.

Claude merges `codex/render-layer`, rewires the film script to drive your new
behaviour, and runs the capture.
