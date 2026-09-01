# Mathburst Semantic Core and Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the shared semantic state, atomic binding transactions, reliable project cameras, and canvas input routing required by every high-fidelity editor.

**Architecture:** Extend the current `WorldState` instead of replacing its reducer. Semantic entities and bindings live beside visible world objects. New operations are applied and inverted by the same history engine. A single canvas input policy lets pan and ink outrank widget controls, while select mode delegates to widgets.

**Tech Stack:** Existing React/TypeScript world reducer, Cortex Compute Engine, SVG pointer events, browser `localStorage`.

**Spec:** `docs/superpowers/specs/2026-09-01-bidirectional-semantic-editing-design.md`

## Global Constraints

- No automated tests or CI. Use typecheck, build, and the exact browser checks below.
- Keep the UI minimal and preserve all unrelated dirty work.
- This phase must not add animation UI, rebuild showcase mathematics, or touch video files.
- Failed transactions must leave the previous state unchanged.

---

### Task 1: Define version-two semantic world state

**Files:**
- Create: `src/domain/semantic/types.ts`
- Create: `src/domain/animation/types.ts`
- Modify: `src/domain/world/types.ts`

- [ ] **Step 1: Add canonical semantic entities**

Use discriminated serializable types with stable IDs:

```ts
export type SemanticEntity =
  | { id: string; kind: 'expression'; latex: string; parameters: Record<string, number> }
  | { id: string; kind: 'scalar'; name: string; value: number }
  | { id: string; kind: 'vector'; name: string; values: number[] }
  | { id: string; kind: 'matrix'; name: string; values: number[][] }
  | { id: string; kind: 'data'; columns: Record<string, number[]> }

export type SemanticBinding = {
  id: string
  source: { entityId: string; path: string }
  target: { objectId: string; path: string }
  forward: 'identity' | 'expression-parameter' | 'matrix-cell' | 'point-coordinate'
  inverse: 'identity' | 'expression-parameter' | 'matrix-cell' | 'point-coordinate' | null
}
```

- [ ] **Step 2: Add semantic and timeline stores to `WorldState`**

Move `version` to `2` and add `entities`, `bindings`, and `timelines` records. Add `putEntity`, `removeEntity`, `putBinding`, `removeBinding`, `putTimeline`, and `removeTimeline` to `WorldOperation` so undo can restore every layer atomically.

- [ ] **Step 3: Link views without duplicating values**

Add optional `entityId`/`bindingIds` fields to view objects. Retain legacy `latex`, matrix `values`, and widget payloads only for migration; new objects read canonical values from entities.

- [ ] **Step 4: Verify types**

Run `pnpm typecheck` and fix all exhaustiveness errors before continuing.

---

### Task 2: Make semantic transactions atomic and cycle-safe

**Files:**
- Create: `src/domain/semantic/path.ts`
- Create: `src/domain/semantic/bindings.ts`
- Create: `src/domain/semantic/transactions.ts`
- Modify: `src/domain/world/reducer.ts`
- Modify: `src/domain/world/operations.ts`

- [ ] **Step 1: Implement narrow path access**

Support only explicit paths used by Mathburst (`value`, `latex`, `parameters.<name>`, `values.<row>.<column>`, `at.x`, `at.y`). Reject arbitrary prototype paths.

- [ ] **Step 2: Validate the binding graph before commit**

Build entity/object dependency edges, run depth-first cycle detection, and return a concise error containing the binding IDs in the cycle.

- [ ] **Step 3: Expand one semantic edit into one action**

Implement:

```ts
export function buildSemanticEdit(
  world: WorldState,
  edit: { entityId: string; path: string; value: unknown },
): WorldOperation[]
```

It must update the entity, propagate supported forward bindings, validate every result, and return operations only after the complete candidate state succeeds.

- [ ] **Step 4: Extend inversion and validation**

Teach `applyOperations` to snapshot the previous entity, binding, or timeline exactly as it already does for objects. Reject dangling binding endpoints and non-finite numeric values.

- [ ] **Step 5: Manual transaction check**

Temporarily use the existing object editor to change one expression parameter bound to a graph. Confirm graph and equation change together, one Undo restores both, and a synthetic cycle is rejected without a partial change.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/semantic src/domain/animation/types.ts src/domain/world/types.ts src/domain/world/reducer.ts src/domain/world/operations.ts
git commit -m "feat: add atomic semantic world state"
```

---

### Task 3: Migrate persisted projects without losing saved work

**Files:**
- Create: `src/domain/world/migrations.ts`
- Modify: `src/domain/world/persistence.ts`
- Modify: `src/domain/world/library.ts`
- Modify: `src/domain/world/seed.ts`

- [ ] **Step 1: Implement one v1-to-v2 migration**

For every legacy equation create an expression entity; point each linked graph at that entity; convert each legacy matrix to a matrix entity. Initialize empty bindings/timelines and keep IDs deterministic (`entity:${object.id}`).

- [ ] **Step 2: Preserve invalid payloads**

Read storage into an unknown value, clone it before migration, and only replace storage after migration succeeds. On failure return the canonical project seed and expose a reset reason; do not overwrite the old payload.

- [ ] **Step 3: Store cameras per scene**

Add `sceneViewports: Partial<Record<SceneId, Viewport>>` to `LibraryProject`. Migrate the active viewport into the current start scene and seed deterministic defaults from `getViewportForScene`.

- [ ] **Step 4: Browser migration check**

Load an existing v1 library, edit it, reload, and confirm its objects survive as v2. Corrupt a copied local payload and confirm the project can reset without destroying other projects.

---

### Task 4: Decouple active scene from camera movement

**Files:**
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/domain/world/projects.ts`
- Modify: `src/domain/world/library.ts`

- [ ] **Step 1: Remove camera-to-scene inference from live navigation**

Delete the effect that calls `getSceneForViewport(world.viewport, ...)`. Only `navigateToScene`, project open, reset, and Director Review may set `activeScene`.

- [ ] **Step 2: Save and restore scene cameras**

Before changing scenes, write the current viewport to the current project's `sceneViewports`. Open the target using its saved viewport or deterministic catalog default.

- [ ] **Step 3: Add deterministic fit commands**

Implement `fitScene(sceneId)` from that scene's owned object bounds and `fitSelection()` from `unionBounds`. Neither command may change `activeScene`.

- [ ] **Step 4: Reproduce the reported Gamma failures**

Open Gamma Recurrence, pan to every edge, zoom through the supported range, open Reasoning Check, and confirm neither Gamma content nor overlays disappear. Confirm no barycentric object exists in the Gamma project's `world.objects`.

---

### Task 5: Enforce one canvas input priority

**Files:**
- Create: `src/components/canvas/useCanvasInputRouter.ts`
- Modify: `src/components/WorldCanvas.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/MathObjectView.tsx`

- [ ] **Step 1: Centralize gesture ownership**

The router must choose one owner on pointer-down: `pan`, `ink`, `erase`, `object`, `handle`, or `control`. Right button always chooses pan. Pen/highlighter always choose ink before object controls.

- [ ] **Step 2: Render ink capture above objects**

Keep the preview layer at the top of the canvas stack with pointer capture on the canvas root. A stroke that starts over an input or SVG handle must continue across widget bounds.

- [ ] **Step 3: Preserve select-mode controls**

In select mode, only actual controls/handles stop propagation. Empty widget background selects or drags the object. Double-click editable targets requests inline editing.

- [ ] **Step 4: Browser input matrix**

For graph, geometry, matrix, Attention, Training, Barycentric, Simplex, and Number Theory objects: right-drag to pan; draw from inside to outside; select and move the container; edit a control in select mode.

---

### Task 6: Install the progressive inspector shell

**Files:**
- Create: `src/components/inspector/ProgressiveInspector.tsx`
- Create: `src/components/inspector/InspectorField.tsx`
- Create: `src/components/inspector/types.ts`
- Modify: `src/components/MathburstWorkspace.tsx`
- Modify: `src/styles/minimal.css`

- [ ] **Step 1: Replace the floating generic editor**

Show a compact bottom bar for the primary selected object. Use plain text fields with `inputMode="decimal"`; hide native number steppers. Keep Save, Cancel, and Escape behavior.

- [ ] **Step 2: Add expandable tabs**

Create Values, Structure, Constraints, Style, Bindings, and Animation panels. Render only panels supported by the selected object.

- [ ] **Step 3: Show semantic status**

Every value row displays `free`, `constrained`, `derived`, or `computed`, plus linked view IDs when present.

- [ ] **Step 4: Verify and commit**

Run `pnpm typecheck` and `pnpm build`. At 1440×900 confirm the inspector never covers the selected object's center and number fields show no oversized browser arrows.

```powershell
git add src/components/canvas src/components/inspector src/components/MathburstWorkspace.tsx src/components/WorldCanvas.tsx src/components/WorldObjectView.tsx src/components/MathObjectView.tsx src/domain/world src/styles/minimal.css
git commit -m "feat: unify canvas input and project cameras"
```

