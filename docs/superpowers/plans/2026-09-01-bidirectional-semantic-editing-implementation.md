# Mathburst Bidirectional Semantic Editing — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Mathburst from a set of attractive fixed demonstrations into a reliable, fully editable mathematical whiteboard where human actions and WebMCP calls manipulate the same semantic state.

**Architecture:** Deliver the approved design through four ordered, independently usable phases. First add a versioned semantic kernel and correct input/camera behavior. Then build native bidirectional editors. Next expose those capabilities through WebMCP and a browser-native animation timeline. Finally rebuild the four saved projects from those primitives.

**Tech Stack:** React 19, TypeScript 5.9, Vinext, SVG/HTML, KaTeX, Cortex Compute Engine, Lucide, browser `localStorage`, and `document.modelContext.registerTool`.

**Spec:** `docs/superpowers/specs/2026-09-01-bidirectional-semantic-editing-design.md`

## Global Constraints

- This is a hackathon build. Do not add automated tests, test runners, CI/CD, auth, databases, multiplayer, deployment systems, or production hardening.
- Do not create, record, edit, render, or otherwise touch the submission video pipeline.
- Verify with `pnpm typecheck`, `pnpm build`, focused manual browser checks, and visible mathematical invariants.
- Optimize the four saved projects and deterministic judge path. Unsupported inverse edits must be explicit, but irrelevant edge cases are out of scope.
- Keep each saved project as an isolated object graph. Zoom and pan must never switch scenes.
- Every human edit and WebMCP edit must enter the same atomic reducer/history path.
- AI construction uses native declarative objects only. Never execute generated JavaScript.
- Preserve unrelated dirty files. Stage only paths named by the active task.
- Use small coherent commits. If subagents are chosen for execution, use only GPT-5.6 Luna or a lower model, per the user's instruction.

## Ordered Delivery

1. [Semantic core and interaction correctness](2026-09-01-semantic-core-and-interaction.md)
2. [Native bidirectional editors](2026-09-01-native-bidirectional-editors.md)
3. [WebMCP construction and Animate mode](2026-09-01-webmcp-and-animation.md)
4. [Advanced saved projects](2026-09-01-advanced-saved-projects.md)

Do not start a later phase until the prior phase typechecks, builds, and passes its manual checkpoint. Each phase leaves the app usable; the final phase is the submit-ready product repository.

## Coverage Map

| Approved requirement | Owning plan |
|---|---|
| Project isolation, camera persistence, zoom correctness | Phase 1 |
| Shared semantic entities, bindings, transactions, migration | Phase 1 |
| Pen above widgets and consistent input priority | Phase 1 |
| Progressive inspector | Phases 1–2 |
| Empty native tools and two-way editing | Phase 2 |
| Graph handles/candidate edits and geometry constraints | Phase 2 |
| Matrix/vector/3D editing | Phase 2 |
| Full WebMCP behavioral coverage and visible expansion | Phase 3 |
| Declarative 3Blue1Brown-inspired Animate mode | Phase 3 |
| Gamma, Transformer, Olympiad, Simplex/Partitions depth | Phase 4 |

## Final Acceptance Gate

- [ ] Open each built-in project from the gallery and confirm no other project's objects are reachable by pan or zoom.
- [ ] Create and edit text, equation, graph, geometry, matrix, shape, and 3D objects from empty states.
- [ ] Edit one shared value symbolically, numerically, and visually; confirm all linked views update and undo in one step.
- [ ] Start a pen stroke inside every interactive widget type, cross its boundary, and finish outside it.
- [ ] Use the local WebMCP inspector to construct a widget from an empty canvas and watch primitive operations unfold.
- [ ] Create, play, seek, and reset one semantic animation without duplicating the mathematical state.
- [ ] Exercise the Gamma recurrence/density, Tiny Transformer, both Olympiad constructions, and Simplex/Partitions invariants.
- [ ] Run `pnpm typecheck` and `pnpm build` successfully.

