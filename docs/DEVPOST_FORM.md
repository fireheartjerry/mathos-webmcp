# Mathburst — Devpost fields

Paste-ready product copy. Hosting and any optional video URL are separate submission-owner steps.

## Project name

```text
Mathburst
```

## Elevator pitch

```text
Mathburst turns a photographed problem into a live canvas where a learner and WebMCP tutor share 18 tools to read, build, graph, transform, and undo the same mathematical world.
```

## Built With

```text
webmcp, typescript, react, next.js, vinext, vite, svg, katex, cortex-js-compute-engine, browser-localstorage
```

## Try it out

```text
Local app: run pnpm dev --port 3400 and open http://localhost:3400
Source: https://github.com/fireheartjerry/mathos-webmcp
Video: video/out/mathburst-final.mp4 (upload, then paste the public URL here)
```

## Themes

Select **Web** and **Machine Learning / AI**.

## Gallery

Upload `public/og.png` first. It is the real Mathburst interface at 1200×630 and works as the card thumbnail. Add a final calculus reconstruction screenshot and one geometry/matrix montage frame only if the form benefits from more than one image.

## Video

The submission film is `video/out/mathburst-final.mp4`: 2560×1440, 60 fps, 2:41, one continuous take of the real product with narration that describes only visible behaviour. Upload it and paste the public URL into the form. Rebuild instructions: `docs/video/FILM_REPRODUCTION.md`.

Suggested title:

```text
Mathburst — eight connected mathematical scenes powered by 18 WebMCP tools
```

Suggested description:

```text
A photograph becomes a living mathematical world that a student and any WebMCP tutor can inhabit together.

Mathburst ships four saved projects and eight connected scenes: Gamma probability, attention and deterministic tiny-model training, barycentric and spiral-similarity geometry, and a tetrahedral-to-Ramanujan arithmetic observatory. The page registers exactly 18 WebMCP tools, and every agent edit is visible, attributed, and undoable through the same action kernel as the human interface.

Built as a focused MVP for the 2026 WebMCP Challenge.
Source: https://github.com/fireheartjerry/mathos-webmcp
```

---

# Project description

## Inspiration

AI tutoring is usually trapped beside the work. A student shows a photograph or pastes an equation into chat, the model returns prose, and the mathematical state immediately fragments again.

We wanted the opposite: one live mathematical world where the learner and any external tutor can see and manipulate the same equations, graphs, constructions, and diagrams. The tutor should enter the work instead of talking around it.

## What it does

Mathburst is a human-first mathematical whiteboard backed by a semantic scene graph. Four saved projects bookmark eight scenes in one persistent world. The seeded Gamma problem begins as a photograph, becomes a proposed set of editable objects, receives an AI audit pass, and waits for the learner to approve the clean conversion.

The learner can then work directly with pen, highlighter, text, LaTeX, images, shapes, arrows, graphs, geometry, matrices, frames, groups, layers, transforms, and undo/redo. The Gamma view computes normalized density area and bin masses, then exposes the explicit `log mass → softmax` bridge.

The remaining projects demonstrate the connective tissue. A tiny one-head transformer exposes Q/K/V, attention weights, and a genuine deterministic numerical-gradient training step. Attention weights become barycentric coordinates, survive a homothety/spiral-similarity construction, lift into a projected tetrahedral simplex, and unfold into finite partition coefficients with an honest Ramanujan congruence verification surface.

Director Review provides thirteen editable keyframes across the eight scenes, with per-shot targets, camera framing, clean preview, transition preview, and approval state.

Tutor actions are not hidden API effects. A tutor cursor moves to the target, affected objects reveal the commit, AI-created objects carry authorship, the activity rail names the change, and the learner can undo it.

## Why WebMCP is a strong fit

Math tutoring depends on page-owned visual state: the current equation, selected object, geometry construction, attempted step, graph, and viewport. A remote agent cannot reliably infer that state from chat, and copying it into a custom chatbot would lock the learner into one model and one interface.

WebMCP lets Mathburst expose its actual state and actions to any compatible external tutor. The page remains the durable mathematical instrument; the agent supplies reasoning and language. That division is unusually clean: Mathburst owns the world, dependencies, interaction, and history, while the tutor can inspect and act inside them.

## How it creates a better experience

The learner never leaves the whiteboard to translate context. The tutor can inspect the current scene, understand what is selected, see previous attempts and help already shown, and add the representation that is useful now.

In the judge path, a photograph becomes semantic math, the audit catches a duplicated symbol, and the learner approves the clean conversion. The learner can edit the source, watch the normalized visualization respond, and undo the tutor's action from the same history. Every later scene remains a live computed representation rather than a flattened illustration.

## What humans and agents can do together

Humans can draw, type, typeset, import, graph, construct, transform, group, align, layer, duplicate, delete, pan, zoom, edit live matrix and attention values, train the tiny model, drag barycentric geometry, rotate the simplex, change partition bounds, and undo.

An external tutor can read the world, objects, selection, tutoring context, history, and live mathematical structure. It can create, update, transform, delete, batch, undo or redo, move the viewport, reconstruct and audit a photographed problem, graph expressions, construct geometry, and visualize all seven semantic mathematical concepts through the same eighteen tools.

Both operate the same objects through the same action kernel. Ordinary tutor edits execute directly and remain visible, attributed, and reversible. Reconstruction is the one workflow that requires learner approval because it replaces the photograph with the proposed semantic scene.

## How we implemented WebMCP

Mathburst registers exactly eighteen tools through `document.modelContext.registerTool()`.

**Read:** `get_world`, `get_objects`, `get_selection`, `get_session_context`, `get_history`, `inspect_math`.

**Direct action:** `create_objects`, `update_objects`, `delete_objects`, `transform_objects`, `apply_actions`, `step_history`, `set_viewport`.

**Mathematical workflows:** `reconstruct_problem`, `audit_reconstruction`, `graph_expression`, `construct_geometry`, `visualize_concept`.

The application has one typed `WorldState` scene graph and one canonical mutation path. Human gestures and write tools compile into the same operations, which apply atomically, recompute direct mathematical dependencies, append an attributed history entry, and return a compact result with changed object IDs.

The broad object schemas give an agent exact low-level control without registering a redundant tool for every toolbar icon. The five workflow tools provide clear high-level routes for the most important mathematical actions, including Gamma density, attention, training, barycentrics, spiral similarity, simplex, and partition views. An in-product inspector displays all eighteen and invokes the exact same execute callbacks, so judges can see the whole WebMCP surface and its effects immediately.

## Challenges we ran into

The hardest product decision was resisting the urge to build a chatbot. The winning interaction only became obvious when we treated the whiteboard itself as the agent interface.

We also had to make broad creative control legible in only eighteen tools. One tool per toolbar button would be noisy; one generic command would be opaque. The final surface combines six precise read tools, seven direct action tools over a typed object vocabulary, and five high-level mathematical workflows.

Finally, dynamic math forced the world model to preserve relationships instead of drawing pixels. Graphs reference equations, attention and training share a tiny serializable model, geometry stores declarative primitives, and simplex/partition views recompute their invariants. That is what lets a tutor edit the mathematics instead of merely placing an annotation on top of it.

## Accomplishments we are proud of

- A complete photograph → audit → approved live-scene tutoring flow.
- Exact human/agent parity through one visible, attributed, undoable action kernel.
- Eighteen discoverable WebMCP tools covering the full submitted interface.
- Four saved projects and eight connected mathematical scenes running on the same world model.
- A thirteen-shot Director Review surface with editable targets and camera framing.
- A whiteboard that remains useful without an agent or backend.

## What we learned

The best AI interface is sometimes not another chat. When the page owns rich, structured state, WebMCP can let an external model become a genuine collaborator inside a specialized instrument.

We also learned that semantic objects create leverage far beyond presentation. Once an equation is an equation rather than an image, it can drive a graph, be inspected by an agent, appear in history, carry authorship, and remain undoable.

## What's next

The long-term vision is Primer-style individualized tutoring inside one universal mathematical workspace: durable learner context, richer proof objects, broader reconstruction, deeper computer algebra, collaborative sessions, and every representation from freehand ink to publication-quality diagrams.

The challenge build proves the interaction model. It deliberately does not claim general OCR, cloud sync, multiplayer, accounts, or cross-session learner memory.

---

## Product handoff checklist

- [x] Product copy reflects four projects, eight scenes, thirteen Director Review shots, and 18 WebMCP tools.
- [x] Product repository intentionally makes no deployment, video, test, CI/CD, or production-readiness claim.
- [ ] Publish or record separately if the challenge submission requires those owner-managed artifacts.
- [ ] Make the repository public before the deadline.
- [ ] Upload the 1200×630 Mathburst gallery image first.
- [ ] Run the local judge path twice before submission.
