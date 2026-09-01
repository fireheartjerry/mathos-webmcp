# Mathburst Native Bidirectional Editors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every native creation tool start cleanly and make mathematical values editable from symbolic, numerical, and direct-manipulation views.

**Architecture:** Creation menus produce empty semantic entities plus view objects. Focused editors mutate entities through `buildSemanticEdit`; renderers read those same entities. Specialized inverse adapters implement only deterministic edits. Ambiguous graph drags preview named candidate operations before committing.

**Tech Stack:** React 19, TypeScript, KaTeX, Cortex Compute Engine, SVG, existing world reducer and inspector.

**Spec:** `docs/superpowers/specs/2026-09-01-bidirectional-semantic-editing-design.md`

## Global Constraints

- No tests or CI; use typecheck/build and manual interaction checks.
- Do not add a general CAS or arbitrary inverse solver. Support the named demo families honestly.
- Keep shape annotations separate from constrained geometry.
- This phase does not implement Animate mode or rebuild showcase projects.

---

### Task 1: Replace forced templates with contextual creation

**Files:**
- Create: `src/components/creation/CreationPopover.tsx`
- Create: `src/components/creation/toolOptions.ts`
- Modify: `src/components/WorldCanvas.tsx`
- Modify: `src/components/ToolRail.tsx`

- [ ] Create empty text/equation/graph/geometry objects and immediately focus the relevant editor.
- [ ] For matrix ask for rows/columns (`1–6`) before creating an empty grid.
- [ ] For shape offer rectangle, ellipse, triangle, polygon, and freeform before placement.
- [ ] Keep image picker behavior; offer annotation arrow vs dependency connector; create untitled frames.
- [ ] Remove the hardcoded circle equation, sample triangle, matrix transform, and rectangle from `createAt`.
- [ ] Run typecheck and manually create one object of every tool kind on a blank project.

---

### Task 2: Build reliable text and equation editors

**Files:**
- Create: `src/components/editors/TextEditor.tsx`
- Create: `src/components/editors/EquationEditor.tsx`
- Create: `src/components/editors/SymbolPalette.tsx`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/inspector/ProgressiveInspector.tsx`

- [ ] Make empty text focus a caret and make double-click edit existing text consistently.
- [ ] Add alignment, width, size, color, and typed/handwritten presentation controls.
- [ ] Give equations visual-symbol and raw-LaTeX modes with a live KaTeX preview.
- [ ] Parse named parameters from LaTeX and offer “Add control” for each parameter.
- [ ] Commit accepted edits through the shared entity operation; leave invalid LaTeX as an unsaved preview.
- [ ] Verify double-click, Escape, Save, Undo, and linked equation updates.

---

### Task 3: Implement expression analysis and graph views

**Files:**
- Create: `src/domain/semantic/expression.ts`
- Create: `src/domain/semantic/graphFeatures.ts`
- Create: `src/domain/semantic/graphInverse.ts`
- Create: `src/components/editors/GraphEditor.tsx`
- Create: `src/components/graph/GraphHandles.tsx`
- Create: `src/components/graph/GraphCandidatePreview.tsx`
- Modify: `src/components/MathObjectView.tsx`
- Modify: `src/domain/math/graph.ts`

- [ ] Analyze sampled roots, extrema, intersections, asymptotes, and inflection points; omit features that do not exist.
- [ ] Recognize deterministic editable families: line `mx+b`, vertex parabola `a(x-h)^2+k`, shifted exponential `ae^{b(x-h)}+k`, and Gamma density parameters.
- [ ] Map named handles to parameter edits. For a parabola, vertex drag updates `h,k`; curvature handle updates `a`.
- [ ] On arbitrary curve drag, compute at most three candidates—translate, family-parameter change, and fit-through-point—and preview both equation and curve before commit.
- [ ] Add equation link/new expression, domains, axes/grid, table, derivative, integral shade, feature toggles, and parameter controls to Graph Editor.
- [ ] Verify `y=x^2+1` has vertex but no root handles; dragging its vertex changes the equation and undo restores both.

---

### Task 4: Build constrained geometry authoring

**Files:**
- Create: `src/components/geometry/GeometryToolbar.tsx`
- Create: `src/components/geometry/GeometryInspector.tsx`
- Create: `src/domain/math/geometryConstraints.ts`
- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/math/geometry.ts`
- Modify: `src/components/MathObjectView.tsx`

- [ ] Extend primitives with `state`, label/style, parent IDs, and explicit constraint data. Add rays, vectors, arcs, regular polygons, loci, and transformation primitives.
- [ ] Implement click sequences for point, segment, line, ray, vector, circle, arc, angle, triangle, rectangle, polygon, and regular polygon.
- [ ] Implement midpoint, intersection, perpendicular, parallel, point-on-locus, homothety, rotation, reflection, translation, and spiral-similarity constraints.
- [ ] Let free points drag freely and constrained points drag on their locus. Derived points remain locked.
- [ ] Implement `detachGeometryPrimitive(canvasId, primitiveId)` as one action that snapshots its current coordinates and removes defining parents.
- [ ] Expose stable primitive IDs, coordinates, parents, state, rule, label, and style in the inspector.
- [ ] Verify an empty canvas can construct a triangle, circumcircle, midpoint, perpendicular, and derived intersection without spawning a template.

---

### Task 5: Upgrade matrix, vector, shape, and image editing

**Files:**
- Create: `src/components/editors/MatrixEditor.tsx`
- Create: `src/components/matrix/VectorPlane.tsx`
- Create: `src/components/editors/ShapeEditor.tsx`
- Create: `src/components/editors/ImageEditor.tsx`
- Modify: `src/domain/world/types.ts`
- Modify: `src/domain/math/matrix.ts`
- Modify: `src/components/MathObjectView.tsx`
- Modify: `src/components/WorldObjectView.tsx`

- [ ] Generalize matrix state to `number[][]`; keep the geometric transform view limited to supported 2×2 and 3×3 matrices.
- [ ] Synchronize editable cells, basis vectors, determinant, multiplication output, and eigenvalue display.
- [ ] Dragging a transformed basis vector updates the corresponding matrix column; unsupported inverse cases stay locked with an explanation.
- [ ] Give shapes editable nodes, fill/stroke/opacity/corner-radius controls, and correct polygon/freeform serialization.
- [ ] Add image crop, opacity, alt-text, replace, and reset-crop controls.
- [ ] Verify matrix cell → vector and vector drag → matrix cell updates in one undoable transaction.

---

### Task 6: Add native 3D semantic views

**Files:**
- Create: `src/domain/math/space3d.ts`
- Create: `src/components/space3d/Space3DView.tsx`
- Create: `src/components/editors/Space3DEditor.tsx`
- Modify: `src/domain/world/types.ts`
- Modify: `src/components/WorldObjectView.tsx`
- Modify: `src/components/creation/toolOptions.ts`

- [ ] Add a `space3d` view object containing stable point, edge, face, camera, and section-plane IDs.
- [ ] Implement deterministic perspective projection and orbit controls in browser SVG; no WebGL framework is needed for the hackathon.
- [ ] Allow coordinate fields, point dragging in the active plane, orbit, zoom, face styles, and section-plane edits.
- [ ] Keep 3D coordinates canonical and projection purely presentational.
- [ ] Verify a user can create a tetrahedron from an empty 3D view and drag a free vertex.

---

### Task 7: Finish inspector coverage and phase verification

**Files:**
- Modify: `src/components/inspector/ProgressiveInspector.tsx`
- Modify: `src/styles/minimal.css`
- Modify: `src/styles/mathburst.css`

- [ ] Wire Values, Structure, Constraints, Style, and Bindings for every object added above.
- [ ] Keep the compact inspector to the three or four most useful values; move deep controls into tabs.
- [ ] At 1440×900 verify the canvas remains visually quiet and each selection reveals only relevant controls.
- [ ] Run `pnpm typecheck` and `pnpm build`.
- [ ] Commit in two focused commits: expression/graph/geometry, then matrix/shape/image/3D.

```powershell
git add src/components/creation src/components/editors src/components/graph src/components/geometry src/components/matrix src/components/space3d src/components/MathObjectView.tsx src/components/WorldObjectView.tsx src/components/WorldCanvas.tsx src/components/ToolRail.tsx src/components/inspector src/domain/math src/domain/semantic src/domain/world/types.ts src/styles/minimal.css src/styles/mathburst.css
git commit -m "feat: add native bidirectional math editors"
```

