# Mathburst Hackathon Design

Date: 2026-08-31
Status: Approved design
Target: The WebMCP Challenge

## Governing goal

One-shot implement Mathburst as an award-winning WebMCP hackathon project: a visually
exceptional shared mathematical world where a learner and an external AI tutor have full,
equivalent control over a broad whiteboard toolset.

Optimize ruthlessly for visible ambition, advanced use cases, demo impact, and rapid iteration.
This is not a production application. Implement every feature in the simplest direct form that
can support the judge path. Do not add automated tests, CI/CD, authentication, cloud sync,
enterprise architecture, production infrastructure, speculative abstractions, or premature
scalability. Perform only the hands-on verification needed to prove the live demo works.

## Product thesis

> A photograph becomes a living mathematical world that a student and any WebMCP tutor can
> inhabit together.

Mathburst is a tutoring product. The shared mathematical canvas is its interface. A session
begins with a problem, commonly a photograph, and expands into live equations, graphs,
constructions, diagrams, annotations, and freehand work. The tutor acts inside that same world
instead of returning disconnected prose in chat.

The first user is a serious secondary or early-university learner working on calculus, contest
geometry, linear algebra, and proofs. Long-term Primer-style learner memory is product vision,
not hackathon scope.

## Hackathon principles

1. **Human-first instrument.** The whiteboard remains useful without an agent.
2. **Complete WebMCP parity.** If the UI can do it, WebMCP can do it.
3. **One mutation path.** Human gestures and agent tools dispatch the same typed actions.
4. **Advanced output, simple implementation.** Prefer narrow, spectacular behavior over broad
   internal generality.
5. **Everything visible.** Agent presence, actions, authorship, dependencies, and undo appear on
   the canvas.
6. **No fake controls.** Every visible tool in the submitted build performs a real action.
7. **No production ceremony.** Build for one learner, one external agent, and one winning demo.

## 1. Architecture

### 1.1 One local application

The deployed URL opens directly into the Mathburst workspace with a seeded calculus problem.
There is no account, workspace picker, embedded chatbot, backend collaboration service, or
multi-page product shell.

The implementation is a single React application with:

- one pan-and-zoom SVG/HTML scene;
- one in-memory typed scene graph;
- one `dispatchAction` mutation function;
- one append-only session action log with undo/redo;
- local browser persistence for the current document only;
- a small mathematical helper layer for expressions, plots, and geometry; and
- WebMCP tools that only translate tool inputs into canonical actions.

### 1.2 Typed scene graph

The MVP scene supports these object kinds:

- `ink`
- `text`
- `image`
- `shape`
- `arrow`
- `equation`
- `graph`
- `geometry`
- `matrix`
- `frame`
- `group`

Every object has an ID, position, size, author, z-order, and kind-specific payload. Mathematical
objects may declare dependencies on other object IDs. The dependency mechanism is deliberately
small: changes recompute direct dependents with object-specific functions. It is not a general
constraint solver.

### 1.3 Canonical actions

All mutations use a single action envelope:

```ts
type WorldAction = {
  id: string;
  source: "human" | "agent";
  operations: WorldOperation[];
};
```

`WorldOperation` covers create, update, delete, transform, group, reorder, viewport, and history
operations. A dispatched action validates inputs, records inverse operations, applies the whole
batch, recomputes direct dependencies, appends one attributed history entry, and triggers a short
visual commit animation.

There is no separate agent data model, no distributed concurrency protocol, and no production
event system.

### 1.4 Mathematical helpers

- **Equations:** store editable LaTeX source plus a parsed expression representation. Render with
  KaTeX and expose the top-level terms used by the hero calculus expression as selectable parts.
- **Graphs:** sample supported 2D expressions into SVG paths. Support points, bounds, parameters,
  sliders, tangent lines, and shaded integral regions required by the demo.
- **Geometry:** recompute a small whitelist of declarative constructions: points, segments, lines,
  circles, intersections, midpoints, perpendiculars, parallels, angles, and homotheties.
- **Matrices:** render a matrix and apply its 2D transform to linked vectors or shapes.
- **Verification:** use deterministic expression evaluation/equivalence where supported. Unknown
  mathematics stays explicitly unverified; the agent cannot manufacture a page-owned verdict.

## 2. Human and tutor experience

### 2.1 Spatial model

Each session is a problem frame inside an infinite world. The frame anchors the original task and
current derivation. Graphs, geometry, notes, and explorations can bloom outside it while remaining
linked to source objects.

### 2.2 Human tools

The compact tool rail provides:

- select, pan, and zoom;
- pen, highlighter, and eraser;
- text and LaTeX;
- image import;
- graph;
- geometry;
- shapes, arrows, and connectors;
- frame, group, layers, duplicate, align, and reorder; and
- undo/redo.

Direct tools are the foundation. Intelligent upgrades are contextual accelerators: selected ink
can become an equation, an equation can become a graph, and related objects can be linked. If the
AI disappears, the whiteboard still works.

### 2.3 Problem reconstruction

The hackathon build supports one constrained photograph-to-scene workflow rather than general
mathematical OCR:

1. The source image enters a reconstruction preview.
2. The external agent inspects it and proposes typed Mathburst objects through WebMCP.
3. The agent performs a second audit pass against the source and marks uncertainty.
4. The learner approves the clean reconstruction.
5. The approved objects replace the image as the primary scene; the source remains recoverable.

Approval is required only for reconstruction. All ordinary agent edits execute directly, exactly
like human edits, and remain attributed and undoable.

### 2.4 Tutor behavior

On arrival, the tutor observes the problem and existing work, reconstructs or reads the live
objects, forms private context, and asks one diagnostic question. It does not annotate or solve
unsolicited.

The visible adaptation for the demo is representation switching: when the learner remains stuck
symbolically, the tutor creates a linked graph or construction tailored to the misconception.
Session context contains only attempts, edits, detected mistakes, and help already shown. There is
no cross-session learner model.

### 2.5 Agent presence

Agent calls produce semantic commits with presence:

- a single colored tutor cursor moves to the target region;
- affected objects briefly reveal the construction or transformation;
- the final action lands atomically;
- an unobtrusive activity rail names what changed; and
- one global undo can reverse the commit.

This is local presentation state, not a multiplayer presence system.

## 3. WebMCP design

### 3.1 Coverage invariant

Every human-visible capability maps to a canonical `WorldOperation`. No tool mutates the scene
directly. High-level tools compile into operations, and the batch tool only groups an ordered list
of those same operations.

### 3.2 Public tool surface

Register exactly eighteen discoverable tools:

**Read**

- `get_world`
- `get_objects`
- `get_selection`
- `get_session_context`
- `get_history`
- `inspect_math`

**Direct action**

- `create_objects`
- `update_objects`
- `delete_objects`
- `transform_objects`
- `apply_actions`
- `step_history`
- `set_viewport`

**Mathematical and tutoring workflows**

- `reconstruct_problem`
- `audit_reconstruction`
- `graph_expression`
- `construct_geometry`
- `visualize_concept`

The input schemas expose the full object and primitive-operation vocabulary. This gives the agent
clear golden-path tools, exact low-level control, and efficient atomic composition without dozens
of redundant registered tools.

### 3.3 Results and failures

Every tool returns a small result containing success, changed object IDs, a human-readable summary,
and any recoverable input error. A failed tool call makes no mutation and shows one lightweight
message. Do not build retry queues, telemetry infrastructure, distributed locks, or generalized
error taxonomies.

## 4. Demo and scope

### 4.1 Under-three-minute story

1. **Opening:** a photographed calculus derivation is already visible. The agent reconstructs and
   audits it into clean live objects.
2. **Tutoring:** the learner reveals an integration-by-parts misconception. The tutor asks one
   question rather than solving.
3. **Representation switch:** after another attempt, the tutor creates a reactive graph linked to
   the equation. Editing the equation moves the graph and derived values together.
4. **Control proof:** the agent directly edits, groups, transforms, and undoes objects while its
   cursor and authorship remain visible.
5. **Frontier montage:** a constrained Olympiad geometry scene and a matrix transformation show
   that the same primitives generalize. These scenes are lightly interactive, not separate deep
   products.
6. **WebMCP proof:** briefly reveal the complete tool surface and state that every visible action
   uses the same command kernel.

Calculus is the only fully polished end-to-end path. Geometry and matrices exist as credible,
real showcase scenes. Fractals receive no dedicated engine or tool; one preconfigured iterative
graph scene may appear only after the required demo path is complete.

### 4.2 Explicit non-goals

- automated tests or a test framework;
- CI/CD;
- production hardening or scalability;
- authentication, accounts, or permissions;
- backend persistence or cloud sync;
- human multiplayer;
- cross-session learner memory;
- a full Desmos, GeoGebra, Overleaf, Paint, Miro, or Asymptote reimplementation;
- general-purpose mathematical OCR;
- 3D rendering;
- an embedded chat or model orchestration system;
- mobile completeness; or
- abstractions not exercised by the submitted demo.

### 4.3 Manual judge-path verification

Verification is one deterministic hands-on run, not an automated test suite:

1. open the deployed URL in a supported WebMCP client;
2. confirm all registered tools are discoverable;
3. run the exact reconstruction, calculus, graph, edit, undo, geometry, and matrix sequence;
4. confirm every mutation is visible, attributed, and reversible;
5. reload once and confirm the current document restores locally; and
6. record the demo only after that path succeeds twice without intervention.

If an optional montage feature fails, cut it from the video rather than constructing recovery
infrastructure.

## Completion standard

Mathburst is complete for the hackathon when the deployed product makes the core idea emotionally
obvious inside fifteen seconds, the calculus path works end to end through real WebMCP tools, the
whiteboard remains directly usable by a human, every visible action has agent parity, and the final
video tells that story in under three minutes.
