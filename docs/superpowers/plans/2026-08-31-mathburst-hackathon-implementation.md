# Mathburst Hackathon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Second Try with a visually exceptional Mathburst workspace where a learner and an external WebMCP tutor share one semantic mathematical world with complete action parity.

**Architecture:** One client-side React workspace owns a typed scene graph and a single `dispatchWorldAction` mutation path. Human gestures and exactly eighteen WebMCP tools compile into the same small operation vocabulary; direct dependencies, attribution, history, local persistence, and visible agent presence remain deliberately local and hackathon-grade.

**Tech Stack:** React 19, Vinext/Next app router, TypeScript, SVG/HTML rendering, KaTeX, `@cortex-js/compute-engine`, browser `localStorage`, imperative `document.modelContext.registerTool`, existing Remotion video workspace.

**Spec:** `docs/superpowers/specs/2026-08-31-mathburst-hackathon-design.md`

## Global Constraints

- This is a one-shot hackathon rebuild, not a production migration.
- Do not add automated tests, test fixtures, Vitest, CI/CD, auth, cloud sync, telemetry, databases, multiplayer infrastructure, or production abstractions.
- Manual browser checkpoints replace the writing-plans skill's normal TDD cycle because the user explicitly prohibited tests.
- Every visible human action must map to the canonical `WorldOperation` vocabulary and therefore be available through WebMCP.
- Calculus is the only fully polished end-to-end path. Geometry and matrices are real, lightly interactive frontier scenes.
- General OCR, 3D rendering, full Desmos/GeoGebra/Overleaf parity, and cross-session learner memory are out of scope.
- Optimize only for the deterministic judge/video path. Do not harden hypothetical adversarial or malformed-agent edge cases beyond a returned error and no crash.
- Reuse the current KaTeX renderer, Compute Engine techniques, font assets, WebMCP registration pattern, and Remotion pipeline; replace the Second Try session, scratchpad, tool definitions, and product UI.
- Use only Luna, GPT-5.4, or Spark for any delegated sub-agent work.
- Each task ends with one manual checkpoint and one commit. Do not create a test suite as part of verification.

---

### Task 1: Replace the product shell and create the canonical world kernel

**Files:**
- Create: `src/domain/world/types.ts`
- Create: `src/domain/world/reducer.ts`
- Create: `src/domain/world/seed.ts`
- Create: `src/domain/world/persistence.ts`
- Create: `src/components/MathburstWorkspace.tsx`
- Create: `public/demo/calculus-source.png`
- Modify: `app/page.tsx`
- Modify: `app/learn/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `WorldState`, `WorldObject`, `WorldOperation`, `WorldAction`, `createSeedWorld()`, `validateWorldAction()`, `dispatchWorldAction()`, `stepWorldHistory()`, `loadWorld()`, `saveWorld()`.
- Consumed by: every later UI, math, reconstruction, and WebMCP task.

- [ ] **Step 1: Define the compact scene and action types**

Create `src/domain/world/types.ts` with these exact public shapes. Keep kind-specific payloads small; do not introduce classes or schema libraries.

```ts
export type Actor = 'human' | 'agent'
export type Point = { x: number; y: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Viewport = { x: number; y: number; zoom: number }

type BaseObject = {
  id: string
  bounds: Bounds
  rotation: number
  author: Actor
  opacity: number
  locked?: boolean
}

export type InkObject = BaseObject & { kind: 'ink'; points: Point[]; color: string; width: number }
export type TextObject = BaseObject & { kind: 'text'; text: string; color: string; fontSize: number }
export type ImageObject = BaseObject & { kind: 'image'; src: string; alt: string }
export type ShapeObject = BaseObject & {
  kind: 'shape'; shape: 'rectangle' | 'ellipse' | 'triangle'; fill: string; stroke: string
}
export type ArrowObject = BaseObject & { kind: 'arrow'; from: Point; to: Point; color: string }
export type EquationObject = BaseObject & { kind: 'equation'; latex: string; color: string }
export type GraphObject = BaseObject & {
  kind: 'graph'
  equationId: string
  xDomain: [number, number]
  yDomain: [number, number]
  color: string
  parameters?: Record<string, number>
  showTangentAt?: number
  shadeIntegral?: [number, number]
}
export type GeometryPrimitive =
  | { kind: 'point'; id: string; at: Point; label?: string; draggable?: boolean }
  | { kind: 'segment'; id: string; from: string; to: string }
  | { kind: 'line'; id: string; through: [string, string] }
  | { kind: 'circle'; id: string; center: string; through: string }
  | { kind: 'polygon'; id: string; points: string[] }
  | { kind: 'midpoint'; id: string; of: [string, string]; label?: string }
  | { kind: 'perpendicular'; id: string; through: string; to: string }
  | { kind: 'parallel'; id: string; through: string; to: string }
  | { kind: 'intersection'; id: string; lines: [string, string]; label?: string }
  | { kind: 'angle'; id: string; a: string; vertex: string; b: string }
  | { kind: 'homothety'; id: string; center: string; source: string; factor: number; label?: string }
export type GeometryObject = BaseObject & { kind: 'geometry'; primitives: GeometryPrimitive[]; accent: string }
export type MatrixObject = BaseObject & {
  kind: 'matrix'; values: [[number, number], [number, number]]; sourceIds: string[]; accent: string
}
export type FrameObject = BaseObject & { kind: 'frame'; title: string; childIds: string[] }
export type GroupObject = BaseObject & { kind: 'group'; childIds: string[] }

export type WorldObject =
  | InkObject | TextObject | ImageObject | ShapeObject | ArrowObject | EquationObject
  | GraphObject | GeometryObject | MatrixObject | FrameObject | GroupObject

export type SessionContext = {
  attempts: number
  helpShown: string[]
  currentMisconception: string | null
  reconstructionStatus: 'source' | 'draft' | 'audited' | 'approved'
}
export type ReconstructionDraft = {
  sourceImageId: string
  proposedObjects: WorldObject[]
  uncertainObjectIds: string[]
  auditSummary: string
}

export type WorldOperation =
  | { type: 'put'; object: WorldObject }
  | { type: 'remove'; id: string }
  | { type: 'select'; ids: string[] }
  | { type: 'viewport'; viewport: Viewport }
  | { type: 'order'; ids: string[] }
  | { type: 'session'; patch: Partial<SessionContext> }
  | { type: 'reconstruction'; draft: ReconstructionDraft | null }

export type WorldAction = {
  id: string
  source: Actor
  summary: string
  operations: WorldOperation[]
}

export type WorldCommit = { action: WorldAction; inverse: WorldOperation[]; at: number }

export type WorldState = {
  version: 1
  title: string
  objects: Record<string, WorldObject>
  order: string[]
  selection: string[]
  viewport: Viewport
  history: WorldCommit[]
  future: WorldCommit[]
  activity: WorldCommit[]
  session: SessionContext
  reconstruction: ReconstructionDraft | null
}
```

This is the deliberately compact refinement of spec section 1.3: `put` is the upsert primitive for create, update, transform, and group-object changes; `remove` is delete; `order` is layers/reorder; `viewport` is camera; and `select` is object selection. Human and tool-level semantic actions compile to these primitives. Undo/redo remains a canonical reducer transition through `stepWorldHistory` rather than a batchable operation, keeping history replay atomic and simple.

- [ ] **Step 2: Implement the only mutation path**

Create `src/domain/world/reducer.ts`. `validateWorldAction` only rejects an empty action or non-finite object/viewport numbers so bad demo input returns cleanly instead of crashing. `applyOperations` must calculate inverse operations while applying each operation; `dispatchWorldAction` validates and records one atomic commit; history stepping replays stored operations without creating a second nested history entry. Do not build adversarial policy enforcement around the reconstruction boundary—the submitted UI and seeded tools preserve it on the golden path.

```ts
import type { WorldAction, WorldOperation, WorldState } from './types'

function applyOperations(state: WorldState, operations: WorldOperation[]) {
  const next: WorldState = {
    ...state,
    objects: { ...state.objects },
    order: [...state.order],
    selection: [...state.selection],
    session: { ...state.session },
  }
  const inverse: WorldOperation[] = []
  for (const operation of operations) {
    if (operation.type === 'put') {
      const previous = next.objects[operation.object.id]
      inverse.unshift(previous ? { type: 'put', object: previous } : { type: 'remove', id: operation.object.id })
      next.objects[operation.object.id] = operation.object
      if (!next.order.includes(operation.object.id)) next.order.push(operation.object.id)
    } else if (operation.type === 'remove') {
      const previous = next.objects[operation.id]
      if (previous) {
        const restores: WorldOperation[] = [
          { type: 'put', object: previous },
          { type: 'order', ids: [...next.order] },
        ]
        inverse.unshift(...restores)
      }
      delete next.objects[operation.id]
      next.order = next.order.filter((id) => id !== operation.id)
      next.selection = next.selection.filter((id) => id !== operation.id)
    } else if (operation.type === 'select') {
      inverse.unshift({ type: 'select', ids: [...next.selection] })
      next.selection = operation.ids.filter((id) => Boolean(next.objects[id]))
    } else if (operation.type === 'viewport') {
      inverse.unshift({ type: 'viewport', viewport: next.viewport })
      next.viewport = operation.viewport
    } else if (operation.type === 'order') {
      inverse.unshift({ type: 'order', ids: [...next.order] })
      const requested = operation.ids.filter((id, index) => Boolean(next.objects[id]) && operation.ids.indexOf(id) === index)
      next.order = [...requested, ...next.order.filter((id) => !requested.includes(id))]
    } else if (operation.type === 'session') {
      inverse.unshift({ type: 'session', patch: { ...next.session } })
      next.session = { ...next.session, ...operation.patch }
    } else {
      inverse.unshift({ type: 'reconstruction', draft: next.reconstruction })
      next.reconstruction = operation.draft
    }
  }
  return { next, inverse }
}

export function dispatchWorldAction(state: WorldState, action: WorldAction): WorldState {
  const error = validateWorldAction(state, action)
  if (error) throw new Error(error)
  const { next, inverse } = applyOperations(state, action.operations)
  const commit = { action, inverse, at: Date.now() }
  return { ...next, history: [...state.history, commit], future: [], activity: [...state.activity, commit].slice(-30) }
}

export function stepWorldHistory(state: WorldState, direction: 'undo' | 'redo', source: WorldAction['source']): WorldState {
  const stack = direction === 'undo' ? state.history : state.future
  const commit = stack.at(-1)
  if (!commit) return state
  const operations = direction === 'undo' ? commit.inverse : commit.action.operations
  const { next, inverse } = applyOperations(state, operations)
  const replay = { action: { ...commit.action, id: crypto.randomUUID(), source }, inverse, at: Date.now() }
  return direction === 'undo'
    ? { ...next, history: state.history.slice(0, -1), future: [...state.future, commit], activity: [...state.activity, replay].slice(-30) }
    : { ...next, history: [...state.history, commit], future: state.future.slice(0, -1), activity: [...state.activity, replay].slice(-30) }
}
```

- [ ] **Step 3: Create the photographed problem asset**

Create `public/demo/calculus-source.png` at 1400×900 with this exact art direction: overhead photograph of off-white graph paper on a dark desk; natural handwritten black-ink problem “Evaluate ∫x eˣ dx and explain the geometry”; underneath, a plausible student attempt with the incorrect line `xeˣ − eˣx + C`; no logos, people, devices, or extra text. Crop it tightly enough to remain readable when rendered at 280×210.

- [ ] **Step 4: Seed the hero calculus world**

Create `src/domain/world/seed.ts` with `createSeedWorld(): WorldState`. Seed one problem frame, the source-image object, the integral equation, one linked integrand equation, and its initially hidden graph. Task 4 adds the tutor note; Task 6 adds the off-screen geometry and matrix scenes.

```ts
export const HERO_EQUATION_ID = 'eq_integral'
export const HERO_GRAPH_ID = 'graph_integrand'

export function createSeedWorld(): WorldState {
  const objects: WorldObject[] = [
    { id: 'problem', kind: 'frame', title: 'Integration by parts', childIds: ['source', HERO_EQUATION_ID], bounds: { x: 80, y: 80, width: 660, height: 520 }, rotation: 0, author: 'human', opacity: 1 },
    { id: 'source', kind: 'image', src: '/demo/calculus-source.png', alt: 'Photographed integration-by-parts problem', bounds: { x: 120, y: 150, width: 280, height: 210 }, rotation: -1.2, author: 'human', opacity: 1 },
    { id: HERO_EQUATION_ID, kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713', bounds: { x: 440, y: 155, width: 240, height: 76 }, rotation: 0, author: 'human', opacity: 0 },
    { id: 'eq_integrand', kind: 'equation', latex: 'a x e^x', color: '#171713', bounds: { x: 815, y: 100, width: 210, height: 54 }, rotation: 0, author: 'agent', opacity: 0 },
    { id: HERO_GRAPH_ID, kind: 'graph', equationId: 'eq_integrand', xDomain: [-2, 2], yDomain: [-1, 16], color: '#7c5cff', parameters: { a: 1 }, showTangentAt: 1, shadeIntegral: [0, 1], bounds: { x: 800, y: 150, width: 460, height: 330 }, rotation: 0, author: 'agent', opacity: 0 },
  ]
  return { version: 1, title: 'Mathburst', objects: Object.fromEntries(objects.map((object) => [object.id, object])), order: objects.map((object) => object.id), selection: [], viewport: { x: 0, y: 0, zoom: 1 }, history: [], future: [], activity: [], session: { attempts: 0, helpShown: [], currentMisconception: null, reconstructionStatus: 'source' }, reconstruction: null }
}
```

- [ ] **Step 5: Add deliberately tiny local persistence**

Create `src/domain/world/persistence.ts` with `STORAGE_KEY = 'mathburst.world.v1'`, `loadWorld()`, `saveWorld()`, and `clearWorld()`. Accept only objects with `version === 1`; on parse failure return `null`. Do not reproduce the old structural validator.

```ts
const STORAGE_KEY = 'mathburst.world.v1'
export const loadWorld = (): WorldState | null => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return value?.version === 1 ? value as WorldState : null
  } catch { return null }
}
export const saveWorld = (world: WorldState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(world)) } catch { /* current session still works */ }
}
export const clearWorld = () => { try { localStorage.removeItem(STORAGE_KEY) } catch {} }
```

- [ ] **Step 6: Replace both routes with one temporary workspace shell**

Create `MathburstWorkspace.tsx` as a client component that restores or seeds the world, exposes `run(action)`, persists after hydration, and temporarily renders the title plus object count. Point both `/` and `/learn` at it. Replace metadata with `Mathburst — the shared mathematical world` and remove Second Try copy.

```tsx
'use client'
export default function MathburstWorkspace() {
  const [world, setWorld] = useState<WorldState>(() => createSeedWorld())
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { const stored = loadWorld(); if (stored) setWorld(stored); setHydrated(true) }, [])
  useEffect(() => { if (hydrated) saveWorld(world) }, [world, hydrated])
  const run = useCallback((action: WorldAction) => setWorld((current) => dispatchWorldAction(current, action)), [])
  return <main className="mathburst"><h1>Mathburst</h1><p>{world.order.length} live objects</p></main>
}
```

- [ ] **Step 7: Manual checkpoint and commit**

Run `pnpm typecheck`, then `pnpm dev`. Open `/` and `/learn`; both must show Mathburst and the seeded object count. Reload once and confirm local persistence does not crash.

```powershell
git add app src/domain/world src/components/MathburstWorkspace.tsx public/demo/calculus-source.png
git commit -m "feat: create Mathburst world kernel"
```

---

### Task 2: Build the direct human whiteboard

**Files:**
- Create: `src/components/WorldCanvas.tsx`
- Create: `src/components/WorldObjectView.tsx`
- Create: `src/components/ToolRail.tsx`
- Create: `src/domain/world/operations.ts`
- Create: `src/styles/mathburst.css`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `WorldState`, `WorldObject`, `WorldAction`, `dispatchWorldAction()`.
- Produces: `ToolMode`, `WorldCanvas`, `expandTargetIds()`, `buildTransformOperations()`, `buildDuplicateOperations()`, `buildDeleteOperations()`, direct selection/drag/ink/text/shape/image/equation/frame/group/history actions.

- [ ] **Step 1: Create the compact mode rail**

Export this exact mode type and component contract from `ToolRail.tsx`:

```tsx
export type ToolMode = 'select' | 'hand' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'equation' | 'image' | 'shape' | 'arrow' | 'frame'
export default function ToolRail(props: {
  mode: ToolMode
  onMode: (mode: ToolMode) => void
  onUndo: () => void
  onRedo: () => void
  onGroup: () => void
  onDuplicate: () => void
  onDelete: () => void
}) { /* render icon buttons with visible labels in title/aria-label */ }
```

Use one vertical rail with Select, Hand, Pen, Highlighter, Eraser, Text, Math, Image, Shape, Arrow, Frame, then a divider and Undo/Redo/Group/Duplicate/Delete. Highlighter creates translucent wide ink; eraser deletes the topmost ink object it crosses. No nested tool system.

- [ ] **Step 2: Render every basic object kind**

Create `WorldObjectView.tsx` with a positioned wrapper and a switch over `object.kind`. Use `<svg>` for ink, arrows, shapes, and the temporary graph/geometry shells that Task 3 replaces; use `<img>` for images; use `Tex` for equations; use regular DOM for text/frame/group. The wrapper must carry `data-object-id`, `data-author`, a selection class, and `transform: translate(...) rotate(...)`.

```tsx
export default function WorldObjectView({ object, selected, onPointerDown, onDoubleClick }: {
  object: WorldObject
  selected: boolean
  onPointerDown: (event: React.PointerEvent, id: string) => void
  onDoubleClick: (id: string) => void
}) {
  return <div className={`world-object kind-${object.kind}${selected ? ' is-selected' : ''}`} data-object-id={object.id} data-author={object.author} style={{ left: object.bounds.x, top: object.bounds.y, width: object.bounds.width, height: object.bounds.height, transform: `rotate(${object.rotation}deg)`, opacity: object.opacity }} onPointerDown={(event) => onPointerDown(event, object.id)} onDoubleClick={() => onDoubleClick(object.id)}>{/* kind renderer */}</div>
}
```

- [ ] **Step 3: Implement camera, selection, drag, and wheel zoom**

Create `WorldCanvas.tsx` with this contract:

```tsx
export default function WorldCanvas(props: {
  world: WorldState
  mode: ToolMode
  run: (action: WorldAction) => void
  onEditObject: (id: string) => void
})
```

Convert screen coordinates to world coordinates with:

```ts
const toWorld = (clientX: number, clientY: number) => ({
  x: (clientX - rect.left - world.viewport.x) / world.viewport.zoom,
  y: (clientY - rect.top - world.viewport.y) / world.viewport.zoom,
})
```

Hand mode pans. Wheel zoom clamps to `0.25..2.5` around the pointer. Select mode dispatches `select`; dragging a selected object dispatches one final `put` operation on pointer-up, not one history commit per pixel.

- [ ] **Step 4: Implement direct creation gestures**

For pen/highlighter mode, collect points in local component state and dispatch one `ink` object on pointer-up. Eraser hit-tests the topmost ink object and dispatches `remove`. For text/equation/image/shape/arrow/frame, create one sensibly sized object at the click location. Image mode opens a hidden file input and stores the selected image as a data URL. Double-clicking text/equation opens one floating editor in `MathburstWorkspace` and commits a replacement `put` object.

Every dispatch uses:

```ts
run({ id: crypto.randomUUID(), source: 'human', summary: 'Created equation', operations: [{ type: 'put', object }] })
```

- [ ] **Step 5: Wire group, duplicate, order, align, delete, and history controls**

Implement shared operation builders in `src/domain/world/operations.ts` and call them from `MathburstWorkspace.tsx`. A group is a `group` object containing selected IDs and a union bounds rectangle. `expandTargetIds` expands selected group IDs to their child IDs so drag, rotate, scale, duplicate, and delete affect the visible group contents; duplication offsets copies by 24px and remaps duplicated group child IDs. Align uses the first selected object's x or y. Add simple Bring Forward/Send Backward actions to the object context bar; both dispatch an `order` operation and never write `world.order` directly. Task 5 must reuse these same builders for agent transforms/deletes.

- [ ] **Step 6: Create the black/ivory/purple visual foundation**

Create `mathburst.css` with a full-viewport ivory canvas, black chrome, one purple `--agent` accent, subtle dot grid, 52px tool rail, top problem breadcrumb, bottom zoom controls, selection outlines, and zero card-grid dashboard styling. Import it after the KaTeX styles through `app/globals.css`.

- [ ] **Step 7: Manual checkpoint and commit**

Open `/` at desktop size. Manually create pen/highlighter ink, text, equation, image, shape, arrow, and frame objects; erase a stroke; select, drag, zoom, pan, duplicate, group, move the group, align, reorder, delete, undo, and redo. Reload and confirm the scene returns.

```powershell
git add src/components src/domain/world/operations.ts src/styles/mathburst.css app/globals.css
git commit -m "feat: build the Mathburst whiteboard"
```

---

### Task 3: Add the three deep mathematical engines

**Files:**
- Create: `src/domain/math/graph.ts`
- Create: `src/domain/math/geometry.ts`
- Create: `src/domain/math/matrix.ts`
- Create: `src/domain/world/dependencies.ts`
- Create: `src/components/MathObjectView.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`

**Interfaces:**
- Produces: `evaluateLatexAt()`, `sampleGraph()`, `estimateIntegral()`, `resolveGeometry()`, `transformVectors()`, `findDependentIds()`.
- Consumed by: mathematical object rendering, direct edits, WebMCP math tools, demo scenes.

- [ ] **Step 1: Create the 2D graph sampler**

Reuse the Compute Engine construction technique from `src/domain/math/expression.ts`, but keep the new module small.

```ts
import { ComputeEngine } from '@cortex-js/compute-engine'
import type { Point } from '../world/types'
const ce = new ComputeEngine()

export function evaluateLatexAt(latex: string, x: number, parameters: Record<string, number> = {}): number | null {
  try {
    const substitutions = Object.fromEntries(Object.entries({ x, ...parameters }).map(([key, value]) => [key, ce.box(value)]))
    const value = ce.parse(latex).subs(substitutions).N()
    return typeof value.re === 'number' && Number.isFinite(value.re) ? value.re : null
  } catch { return null }
}

export function sampleGraph(latex: string, xDomain: [number, number], parameters: Record<string, number> = {}, steps = 180): Point[] {
  const [min, max] = xDomain
  return Array.from({ length: steps + 1 }, (_, index) => {
    const x = min + ((max - min) * index) / steps
    return { x, y: evaluateLatexAt(latex, x, parameters) ?? Number.NaN }
  }).filter((point) => Number.isFinite(point.y))
}

export function estimateIntegral(latex: string, domain: [number, number], parameters: Record<string, number> = {}): number {
  const points = sampleGraph(latex, domain, parameters, 80)
  return points.slice(1).reduce((area, point, index) => area + (point.x - points[index].x) * (point.y + points[index].y) / 2, 0)
}
```

- [ ] **Step 2: Render equations and reactive graphs**

`MathObjectView.tsx` must render equation objects through `Tex` and graph objects as an SVG grid/path. Convert sampled coordinates into object-local pixels with the object's domains. Read the linked `EquationObject` from the current `WorldState` on every render and sample from its live LaTeX plus the graph's `parameters`. Draw the optional tangent and shaded integral region, and label the live `f(x)` value plus trapezoidal area estimate. Expose the hero graph's `a` parameter as one slider that commits an updated graph object.

- [ ] **Step 3: Create lightweight dependency discovery**

Implement `findDependentIds(state, changedIds)` in `dependencies.ts`. Graphs react automatically because their renderer reads the linked equation from the same current world snapshot. This helper exists only so direct edits and agent commits can highlight and report affected graph IDs. Geometry and matrices resolve during render from their own payloads. Do not build a cache or topological engine.

```ts
export function findDependentIds(state: WorldState, changedIds: string[]): string[] {
  return state.order.filter((id) => {
    const object = state.objects[id]
    return object?.kind === 'graph' && changedIds.includes(object.equationId)
  })
}
```

- [ ] **Step 4: Implement the geometry whitelist**

Create `resolveGeometry(primitives)` returning renderable points, clipped lines, segments, circles, polygons, and angle arcs. Resolve IDs in declaration order. Midpoint, intersection, and homothety primitives resolve to derived points; perpendicular and parallel primitives resolve to derived lines using the referenced line ID. Dragging a `draggable` source point rewrites that point and the SVG resolves every dependent primitive immediately.

- [ ] **Step 5: Implement matrix geometry**

Create:

```ts
export const applyMatrix = (matrix: [[number, number], [number, number]], point: Point): Point => ({
  x: matrix[0][0] * point.x + matrix[0][1] * point.y,
  y: matrix[1][0] * point.x + matrix[1][1] * point.y,
})
export const transformVectors = (object: MatrixObject, world: WorldState) => object.sourceIds.flatMap((id) => {
  const source = world.objects[id]
  if (source?.kind !== 'arrow') return []
  const vector = { x: source.to.x - source.from.x, y: source.to.y - source.from.y }
  return [{ id, source: vector, transformed: applyMatrix(object.values, vector) }]
})
```

Render each linked source arrow and its transformed result in one SVG. Make the four matrix cells editable through the floating object editor. The Matrix creation control and `visualize_concept` matrix case must create the source arrow objects and the matrix object in one atomic action.

- [ ] **Step 6: Add graph, geometry, and matrix creation controls**

Extend `ToolMode` and the rail with Graph, Construct, and Matrix. Each inserts a useful real object rather than an empty shell: `x^2-4x+3`, a triangle with a midpoint/circle construction, and a 2×2 shear matrix linked to three arrow objects. Equation selection remains object-level for the hackathon path; do not build term-span selection unless it becomes necessary for the recorded demo.

- [ ] **Step 7: Manual checkpoint and commit**

Edit the linked `a x e^x` equation and confirm the graph redraws. Move the `a` slider and confirm the graph, tangent, and shaded region redraw together. Drag one geometry point and confirm connected primitives move. Change a matrix cell and confirm transformed vectors move. Confirm all changes appear in undo history.

```powershell
git add src/domain/math src/domain/world/dependencies.ts src/components
git commit -m "feat: add live mathematical objects"
```

---

### Task 4: Add reconstruction, tutoring context, and visible agent presence

**Files:**
- Create: `src/components/ReconstructionPanel.tsx`
- Create: `src/components/AgentPresence.tsx`
- Create: `src/components/ActivityRail.tsx`
- Create: `src/domain/world/reconstruction.ts`
- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/world/reducer.ts`
- Modify: `src/domain/world/seed.ts`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/WorldCanvas.tsx`

**Interfaces:**
- Consumes: the `ReconstructionDraft`, `session`, and `reconstruction` world shapes established in Task 1.
- Produces: `AgentPresenceState`, `proposeReconstruction()`, `auditReconstruction()`, `approveReconstruction()`.
- Consumed by: WebMCP bridge and hero demo choreography.

- [ ] **Step 1: Create the three reconstruction action builders**

Create `src/domain/world/reconstruction.ts`. `proposeReconstruction(sourceImageId, proposedObjects, uncertainObjectIds)` returns one agent action with both a `reconstruction` draft and `session.reconstructionStatus = 'draft'`. `auditReconstruction(currentDraft, auditSummary, proposedObjects?, uncertainObjectIds?)` returns one agent action with the corrected draft and status `audited`. `approveReconstruction(world)` returns one human action that puts the draft objects, fades the source image to opacity `0.18`, sets status `approved`, and clears the draft. Reject is one human reconstruction-clear action. These are deterministic action compilers, not an OCR or model layer.

- [ ] **Step 2: Define ephemeral tutor presence**

Add only this local presentation shape; `ReconstructionDraft` and `WorldState.reconstruction` already exist from Task 1:

```ts
export type AgentPresenceState = { visible: boolean; x: number; y: number; label: string; action: string }
```

Keep `agentPresence` as ephemeral React state. It is neither persisted nor inserted into the scene graph.

- [ ] **Step 3: Build the reconstruction preview and approval boundary**

`ReconstructionPanel` overlays proposed semantic objects beside the source image and lists uncertainty. Proposal and audit dispatch `reconstruction` operations. Accept dispatches one atomic action that puts every proposed object, fades the source image, patches `reconstructionStatus: 'approved'`, and clears the draft. Reject dispatches only `{ type: 'reconstruction', draft: null }`. No other agent action asks permission.

- [ ] **Step 4: Implement the tutoring attempt beat**

Add a small “My next step” equation editor in the problem frame. On the first incorrect attempt, dispatch a `session` patch setting `currentMisconception = 'integration-by-parts-differential'` and incrementing attempts. On the next request for help, dispatch one agent action that patches `helpShown`, reveals the linked equation/graph, and adds the note “What changes when you differentiate u?” This is the visible representation switch; do not build a general tutor policy engine.

- [ ] **Step 5: Implement semantic commits with presence**

Before an agent action, set presence to the center of its first target object, wait 180ms, then dispatch. Keep the cursor visible during a 320ms `.is-agent-commit` highlight and then clear it. `AgentPresence` renders a purple cursor, “Tutor” label, and short action sentence. Respect `prefers-reduced-motion` by committing immediately.

- [ ] **Step 6: Add the compact activity rail**

Show the latest six `world.activity` commits with source dot, summary, timestamp, and an Undo button. Keep it collapsed by default on narrow viewports. This replaces the old receipt and platform-probe UI.

- [ ] **Step 7: Manual checkpoint and commit**

Start from a reset session. Show the photograph, populate a reconstruction draft, audit it, approve it, enter the incorrect calculus step twice, and trigger the graph representation switch. Confirm purple presence, attribution, activity, and undo are visible.

```powershell
git add src/domain/world src/components
git commit -m "feat: create the shared tutoring flow"
```

---

### Task 5: Replace the WebMCP surface with complete Mathburst coverage

**Files:**
- Replace: `src/domain/tools/definitions.ts`
- Replace: `src/domain/tools/registry.ts`
- Replace: `src/domain/tools/groups.ts`
- Create: `src/components/WebMCPInspector.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`

**Interfaces:**
- Consumes: `WorldState`, `WorldAction`, Task 2's shared transform/delete builders, reconstruction callbacks, agent-presence runner.
- Produces: `WorldTool`, `WorldBridge`, `createWorldTools()`, `registerWorldTools()` and exactly eighteen registered tool names.

- [ ] **Step 1: Define one bridge and one tool shape**

```ts
export type ToolResult = { ok: boolean; summary: string; changedIds?: string[]; data?: Record<string, unknown>; error?: string }
export type WorldBridge = {
  getWorld: () => WorldState
  runAgentAction: (action: WorldAction, targetIds?: string[]) => Promise<ToolResult>
  runHistory: (direction: 'undo' | 'redo') => Promise<ToolResult>
}
export type WorldTool = {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
  execute: (input: unknown) => Promise<ToolResult>
}
```

- [ ] **Step 2: Register the exact read tools**

Implement `get_world`, `get_objects`, `get_selection`, `get_session_context`, `get_history`, and `inspect_math`. Read tools return bounded summaries and never dispatch. `inspect_math` accepts `{ objectId }` and returns equation source, graph linkage, geometry primitives, or matrix values depending on kind.

Use these exact input contracts: `get_world { includeObjects?: boolean }`, `get_objects { ids?: string[]; kinds?: WorldObject['kind'][]; limit?: number }`, `get_selection {}`, `get_session_context {}`, `get_history { limit?: number }`, and `inspect_math { objectId: string }`. Clamp read limits to 100 and include `{ truncated: true }` when more objects or commits exist.

- [ ] **Step 3: Register the exact direct-action tools**

Implement `create_objects`, `update_objects`, `delete_objects`, `transform_objects`, `apply_actions`, `step_history`, and `set_viewport`. All accept typed JSON. Mutation tools translate to `WorldOperation[]` and call `runAgentAction`; `step_history` calls `runHistory`, which uses the same `stepWorldHistory` function as human undo/redo. `apply_actions` is the universal atomic batch; no tool writes state directly.

Use these exact per-tool public payloads (the registered tool name is the discriminator and is not repeated inside the JSON input):

```ts
type CreateObjectsInput = { summary?: string; objects: WorldObject[] }
type UpdateObjectsInput = { summary?: string; updates: Array<{ id: string; patch: Record<string, unknown> }> }
type DeleteObjectsInput = { summary?: string; ids: string[] }
type TransformObjectsInput = { summary?: string; ids: string[]; translate?: Point; scale?: number; rotate?: number }
type ApplyActionsInput = { summary: string; operations: WorldOperation[] }
type StepHistoryInput = { direction: 'undo' | 'redo' }
type SetViewportInput = { viewport: Viewport }
```

`update_objects` merges only fields valid for the target kind and always preserves `id`/`kind`. `transform_objects` and `delete_objects` call Task 2's shared operation builders so a group behaves identically for humans and agents; scale is applied around each object's center. Validate the complete input before dispatch so one bad ID or field returns `{ ok: false, error }` without a partial commit.

- [ ] **Step 4: Register the exact mathematical/tutoring tools**

Implement `reconstruct_problem`, `audit_reconstruction`, `graph_expression`, `construct_geometry`, and `visualize_concept`. The first two compile to `reconstruction` operations passed through `runAgentAction`; the latter three compile high-level inputs into ordinary object `put` operations.

Use these per-tool public payloads:

```ts
type ReconstructProblemInput = { sourceImageId: string; proposedObjects: WorldObject[]; uncertainObjectIds?: string[] }
type AuditReconstructionInput = { auditSummary: string; proposedObjects?: WorldObject[]; uncertainObjectIds?: string[] }
type GraphExpressionInput = { latex?: string; equationId?: string; bounds?: Bounds; parameters?: Record<string, number>; showTangentAt?: number; shadeIntegral?: [number, number] }
type ConstructGeometryInput = { primitives: GeometryPrimitive[]; bounds?: Bounds; accent?: string }
type VisualizeConceptInput = { concept: 'integral' | 'tangent' | 'homothety' | 'matrix-transform'; sourceIds?: string[]; bounds?: Bounds }
```

Require exactly one of `latex` or `equationId` for `graph_expression`. `visualize_concept` is a four-case switch that emits a curated graph/geometry/matrix object bundle; it is not a general AI renderer.

The final array order is:

```ts
[
  getWorld, getObjects, getSelection, getSessionContext, getHistory, inspectMath,
  createObjects, updateObjects, deleteObjects, transformObjects, applyActions, stepHistory, setViewport,
  reconstructProblem, auditReconstruction, graphExpression, constructGeometry, visualizeConcept,
]
```

- [ ] **Step 5: Adapt the proven Chrome registration code**

Keep the current `Promise.allSettled` registration and optional `getTools()` read-back from the existing registry. Rename exports to `registerWorldTools`; remove platform probes, revision/request-id bureaucracy, Second Try wording, and old tool types. Preserve the tested `Document.modelContext` global declaration, one-argument `execute(input)` handlers, returned error envelopes, and the rule that page navigation must not unregister tools.

- [ ] **Step 6: Add an honest local inspector fallback**

`WebMCPInspector` shows “18 page tools”, registration state, six compact groups, and one Run control per tool using safe seeded arguments. It invokes the same tool `execute` callback. It is a judge/debug surface, not an embedded chat.

Each tool executor catches validation/runtime errors and returns `{ ok: false, summary: 'No changes made', error }`. Show that error as one temporary inline message in the inspector; do not add retry queues or an error framework.

- [ ] **Step 7: Wire registration and agent presence into the workspace**

Create the bridge once from `worldRef`, `setWorld`, `runAgentAction`, and `runHistory`. Both bridge mutation functions update through the canonical reducer helpers, update `worldRef` synchronously inside the state setter, and return changed IDs. Register tools in an effect after hydration. Ensure a tool does not resolve until its semantic commit has painted; a single `requestAnimationFrame` after state update is sufficient for this hackathon build.

- [ ] **Step 8: Manual checkpoint and commit**

In the local inspector, run all eighteen tools once with their seeded arguments. In a supported WebMCP browser, confirm `document.modelContext.getTools()` lists exactly eighteen names. Drive reconstruction, graph creation, direct transform, deletion, and undo through tools and confirm human-visible parity.

```powershell
git add src/domain/tools src/components/WebMCPInspector.tsx src/components/MathburstWorkspace.tsx
git commit -m "feat: expose the complete Mathburst WebMCP world"
```

---

### Task 6: Create the frontier scenes and award-level visual polish

**Files:**
- Modify: `src/domain/world/seed.ts`
- Create: `src/components/DemoNavigator.tsx`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/components/WorldCanvas.tsx`
- Modify: `src/styles/mathburst.css`
- Replace: `public/favicon.svg`
- Replace: `public/og.png`

**Interfaces:**
- Produces: deterministic camera targets `calculus`, `geometry`, `matrix`; polished agent/human states used by the video.

- [ ] **Step 1: Add the real geometry frontier scene**

Seed a triangle, two circles, a center line, labeled points, and a homothety center at world coordinates around `(1500, 100)`. Make two base points draggable and keep the derived circle/segments tied to them through the geometry payload. Add a short problem frame: “Prove the circles are tangent after the homothety.”

- [ ] **Step 2: Add the real transformer-matrix scene**

Seed query/key arrow objects and a matrix object around `(2400, 120)`, with the matrix `sourceIds` linked to those arrows, a small companion equation `Q=XW_Q`, and editable matrix cells. Use purple for the tutor-created transformed basis and black for the original basis.

- [ ] **Step 3: Add deterministic camera navigation**

`DemoNavigator` contains three text buttons: Calculus, Geometry, Transformer. Each dispatches one viewport action to center its scene. Add keyboard shortcuts `1`, `2`, `3`. No animated tour framework; use one CSS transition on the world transform.

- [ ] **Step 4: Polish the resting composition**

The first viewport must show the source/problem frame dominating the center, the tool rail at left, tutor presence/activity at right, and enough empty world to imply expansion. Remove all remaining old proof-margin styles. Use STIX for prose/math-adjacent UI, Fira Code only for tool names, one purple accent, 1px graphite lines, ivory canvas, and no gradients or dashboard cards.

- [ ] **Step 5: Polish every interaction that appears in the video**

Add short CSS transitions for camera motion, selection outline, graph reveal, geometry construction, matrix transform, and agent commit. Add `prefers-reduced-motion` fallbacks. Keep each transition between 180ms and 520ms; no looping animation.

- [ ] **Step 6: Replace branding assets**

Create a simple Mathburst favicon from an integral curve crossing a four-point grid. Capture the finished calculus viewport at 1200×630 for `public/og.png`; do not design a separate mock image.

- [ ] **Step 7: Manual visual checkpoint and commit**

Inspect at 1440×900 and 1920×1080. Run the three camera targets and every visible interaction. Confirm no control overlaps the world, all math remains readable, the purple tutor authorship is unmistakable, and the opening frame communicates the product without narration.

```powershell
git add src public/favicon.svg public/og.png
git commit -m "feat: polish the Mathburst frontier demo"
```

---

### Task 7: Remove Second Try and align the public repository

**Files:**
- Delete: `src/components/Scratchpad.tsx`
- Delete: `src/components/AgentConsole.tsx`
- Delete: `src/components/SessionDetails.tsx`
- Delete: `src/components/actionFeedback.ts`
- Delete: `src/components/inspectorPresentation.ts`
- Delete: `src/components/proofPresentation.ts`
- Delete: `src/components/scratchpadAccessibility.ts`
- Delete: `src/components/speakLatex.ts`
- Delete: `src/components/scratchpad.css`
- Delete: `src/domain/session/`
- Delete: obsolete `src/domain/math/diagnosis.ts`, `derivation.ts`, and `problems.ts`
- Delete: `src/domain/tools/platform.ts`
- Delete: unreferenced `src/styles/landing.css` and `src/styles/tokens.css`
- Delete: every committed `*.test.ts` and `*.test.tsx` under `src/`
- Delete: `vitest.config.ts`
- Delete: `scripts/checks/`
- Delete: `scripts/agent-call.mjs`, `background-check.mjs`, `capture-browser-state.mjs`, `console-watch.mjs`, `final-webmcp-e2e.mjs`, `layout-check.mjs`, `narrate.py`, `net-check.mjs`, `net-check2.mjs`, `no-webmcp.mjs`, `perf.mjs`, `responsive.mjs`, `run-calls.mjs`, `shot.mjs`, `sync-citations.mjs`, and `webmcp-eval.mjs`
- Delete: old audit/evidence directories `docs/anti-slop-reaudit-2026-08-27/`, `docs/criteria/`, `docs/overnight-audit/`, `docs/webmcp/`, and `docs/images/`
- Delete: `docs/README.md`, `docs/video/second-try-demo.mp4`, and `docs/superpowers/plans/2026-08-27-proof-margin-sites-migration.md`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Replace: `README.md`
- Replace: `PROVENANCE.md`
- Replace: `docs/SUBMISSION.md`
- Replace: `docs/DEVPOST_FORM.md`

**Interfaces:**
- Produces: a public tree and install path that describe only Mathburst while preserving Git history as old/new evidence.

- [ ] **Step 1: Remove unreferenced Second Try implementation files**

Use `rg` before deletion to confirm the new app imports only the new world/math/tool files plus `Tex.tsx`. Resolve each deletion target and verify it is inside this worktree before removing it with PowerShell/Git in the same shell. Remove only the exact files/directories listed above. Preserve `scripts/build-narration.ps1`, `scripts/record-demo.mjs`, and `scripts/demo-driver.js` until Task 8; that task rewrites the recorder, inlines the useful driver sequence, then removes the old driver. Also keep `Tex.tsx`, `src/domain/math/expression.ts`, `src/domain/math/equivalence.ts`, `katex-font-display.css`, font assets, `.openai/hosting.json`, the current Mathburst spec/plan, and the new tool registry. Git history remains the old/new evidence.

- [ ] **Step 2: Remove the automated-test surface**

Delete all committed Vitest files and the old WebMCP E2E/check scripts. Use this PowerShell sequence so the destructive target set is explicit and verified inside `src/`:

```powershell
$workspaceRoot = (Resolve-Path -LiteralPath '.').Path
$testFiles = @(git ls-files ':(glob)src/**/*.test.ts' ':(glob)src/**/*.test.tsx')
$resolvedTests = @($testFiles | ForEach-Object { (Resolve-Path -LiteralPath $_).Path })
if ($resolvedTests | Where-Object { -not $_.StartsWith((Join-Path $workspaceRoot 'src') + [IO.Path]::DirectorySeparatorChar) }) { throw 'Refusing to delete outside src' }
$testFiles | ForEach-Object { git rm -- $_ }
```

In `package.json`, rename the package to `mathburst`, remove `test`, `test:watch`, and `test:webmcp`, and remove root `vitest` and `@babel/parser` dev dependencies. Do not touch the separate video workspace's parser dependency. Run `pnpm install --lockfile-only` to update the lockfile.

- [ ] **Step 3: Rewrite the README around the winning mechanism**

Lead with: “A photograph becomes a living mathematical world that a student and any WebMCP tutor can inhabit together.” Include the live URL, 60-second judge path, the exact eighteen tools, human/agent parity explanation, calculus/geometry/matrix capabilities, local run commands, manual WebMCP enablement, and explicit hackathon/new-work provenance. Rewrite `docs/DEVPOST_FORM.md` as paste-ready submission fields using the same claims.

- [ ] **Step 4: Rewrite provenance and submission copy**

State plainly that Second Try predates the final pivot and that Mathburst's world model, canvas, math objects, reconstruction workflow, WebMCP surface, and demo were created during the submission period. Update `docs/SUBMISSION.md` against the four judging criteria and keep claims limited to visible behavior.

- [ ] **Step 5: Static build checkpoint and commit**

Run only:

```powershell
pnpm typecheck
pnpm build
```

Fix compiler/build failures directly. Do not create regression tests. Then commit:

```powershell
git add -A
git commit -m "chore: complete the Mathburst hackathon pivot"
```

---

### Task 8: Rebuild the under-three-minute demo and perform final judge-path verification

**Files:**
- Replace: `docs/DEMO_SCRIPT.md`
- Replace: `docs/narration.json`
- Replace: `scripts/record-demo.mjs`
- Delete: `scripts/demo-driver.js` after its useful CDP sequence is inlined into the new recorder
- Modify: `scripts/build-narration.ps1`
- Replace: `video/src/Demo.tsx`
- Modify: `video/package.json`
- Modify: `video/package-lock.json`
- Replace: `video/public/screen.mp4`
- Replace: `video/public/beats.json`
- Replace: `video/public/narration.json`
- Replace: `video/public/seg00.wav` through `video/public/seg06.wav`
- Modify: `video/README.md`
- Create: `docs/video/mathburst-demo.mp4`

**Interfaces:**
- Consumes: deterministic camera targets, exact eighteen tools, seeded calculus/geometry/matrix scenes.
- Produces: final public demo video and authoritative hands-on verification evidence.

- [ ] **Step 1: Write the final 2:35 demo script**

Use this beat structure:

1. `0:00–0:15` — source photograph becomes audited live objects; thesis spoken immediately.
2. `0:15–0:48` — learner's integration-by-parts mistake; tutor asks one question.
3. `0:48–1:18` — tutor creates a linked graph; equation edit changes graph and derived values.
4. `1:18–1:42` — direct agent edit, grouping, transform, attribution, and undo.
5. `1:42–2:05` — geometry construction and draggable homothety.
6. `2:05–2:25` — transformer matrix changes vector geometry.
7. `2:25–2:35` — eighteen tools and closing thesis.

Keep narration below 370 words. Never show a terminal, Devpost page, or slide.

- [ ] **Step 2: Rewrite the recorder around the deterministic tool path**

Adapt the current CDP recorder rather than replacing its capture mechanics. Change the default URL and CDP target lookup from `/learn` to `/`, default `OUT` to `video/public/screen.mp4`, and default `BEATS_OUT` to `video/public/beats.json`. Inline the useful driver calls into the recorder, then delete `scripts/demo-driver.js`. Reset `mathburst.world.v1`, drive the exact WebMCP sequence from the script, use stable `data-*` selectors for camera targets, and record one uninterrupted product take.

- [ ] **Step 3: Rebuild narration and Remotion composition**

Update narration segments to the seven beats. Run `scripts/build-narration.ps1` with `video/public` as its output directory and copy the same segment metadata to `video/public/narration.json`. Rename the video package to `mathburst-video` and refresh its lockfile. Keep the real product as the subject, one quiet beat marker, and one caption band. Remove all Second Try copy. Render at 2560×1440 or 1920×1080 with the existing installed Chrome path.

- [ ] **Step 4: Run the manual judge path twice**

Against the production build, manually confirm:

- the deployed/root route opens Mathburst directly;
- exactly eighteen WebMCP tools are discoverable;
- source → reconstruction → audit → approval works;
- the calculus misconception and graph representation switch work;
- human and agent can create/edit/delete/transform the same object kinds;
- attribution, cursor, activity, undo, and redo work;
- geometry drag and matrix edit work;
- reload restores the current local document; and
- the ordinary-browser local inspector can drive the same actions.

Cut any optional montage beat that fails rather than building recovery infrastructure.

- [ ] **Step 5: Inspect and publish the final artifact**

Run the existing recorder to replace `video/public/screen.mp4` and `beats.json`, generate the seven narration WAVs, then render the Remotion composition. Check duration is below 180 seconds, audio is intelligible, and the first frame is the functioning product. Copy the final render to `docs/video/mathburst-demo.mp4` and update README/submission links.

```powershell
node scripts/record-demo.mjs
pwsh -File scripts/build-narration.ps1 -Json docs/narration.json -OutDir video/public
Copy-Item -LiteralPath docs/narration.json -Destination video/public/narration.json -Force
npm --prefix video install --package-lock-only
npm --prefix video run render
New-Item -ItemType Directory -Force -Path docs/video | Out-Null
Copy-Item -LiteralPath video/out/demo.mp4 -Destination docs/video/mathburst-demo.mp4 -Force
```

Read and follow the `sites:sites-hosting` skill, build once more, and republish the existing Sites project identified by `.openai/hosting.json`; do not create a second project. Open the deployed URL and run the 60-second judge path there. If publishing requires an interactive owner login, stop only at that exact prompt and hand the user the single required action.

- [ ] **Step 6: Final commit**

```powershell
git add docs scripts video README.md
git commit -m "video: tell the Mathburst WebMCP story"
```

The branch is implementation-complete only when the live deployment and final video both match this commit and the manual judge path has succeeded twice.
