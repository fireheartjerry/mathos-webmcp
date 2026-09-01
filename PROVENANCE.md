# Mathburst provenance

This document draws the new-work boundary for the 2026 WebMCP Challenge. Git history is the primary evidence; this file explains what the history contains.

## Submission-period timeline

The official submission period runs from **August 25, 2026 at 11:00 AM Pacific Time** through **September 3, 2026 at 1:00 PM Pacific Time**.

This repository was created during that period. Its first dated project commit is `409dfcc` on August 26, 2026.

The repository first explored a different challenge-period product called **Second Try**, a narrow calculus scratchpad. On August 31 the team made a complete final pivot to **Mathburst**. Second Try predates the final pivot, but it does not predate the challenge and is not presented as the submitted product.

The evolution is intentionally preserved in Git rather than rewritten. Old screenshots, audits, scripts, tests, and runtime files were removed from the public tree once they no longer described the submitted application.

## New Mathburst work

The following submitted capabilities were designed and implemented during the final Mathburst pivot:

- the infinite pan-and-zoom mathematical canvas and compact direct-manipulation tool rail;
- the typed world model for ink, text, images, shapes, arrows, equations, graphs, geometry, matrices, frames, and groups;
- the canonical action kernel shared by human gestures and agent calls;
- attributed global history, undo/redo, activity rail, agent presence, and local document persistence;
- live equation-to-graph dependencies, dynamic geometry constructions, and editable matrix transformations;
- the photograph-to-semantic-scene reconstruction proposal, audit, and learner-approval workflow;
- the tutoring attempt state and representation-switch interaction;
- all eighteen Mathburst WebMCP tools, their schemas, registration/read-back bridge, result envelopes, and local inspector;
- the seeded calculus, Olympiad geometry, and matrix-space showcase scenes;
- the Mathburst visual system, favicon, Open Graph image, judge path, submission copy, and final demo recording.

The pivot is recorded by these commits:

| Commit | Mathburst work |
| --- | --- |
| `5999f39` | Approved product/design specification |
| `2c92db7` | One-shot implementation plan |
| `fb46057` | Typed world kernel and persistence |
| `50cdddd` | Human-operable whiteboard |
| `9b422a2` | Live graph, geometry, and matrix engines |
| `72a4b15` | Reconstruction, tutoring, and agent presence |
| `da133d8` | Exact eighteen-tool WebMCP surface |
| `eec8f44` | Frontier scenes and final visual polish |

Later release commits contain repository cleanup, demo media, and deployment alignment only.

## Reused challenge-period work

Mathburst retains a small amount of infrastructure written earlier in this same challenge repository:

- KaTeX rendering through `src/components/Tex.tsx`;
- supported expression parsing/evaluation and equivalence helpers in `src/domain/math/`;
- the Vinext/Next/ChatGPT Sites application shell and hosting project;
- local font assets; and
- the Remotion recording/rendering workspace, rewritten around the Mathburst demo.

This is reuse within one submission period, not pre-existing commercial source.

## Pre-existing Mathos work

Mathos is a pre-existing company and product identity. Its production video-generation service, hosted systems, users, partnerships, and any private monorepo are outside this repository and outside the submission.

Mathburst does not call or claim the existing Mathos video-generation engine. The judged product runs locally in the browser and needs no Mathos backend.

## Third-party software and assets

| Dependency or asset | Role |
| --- | --- |
| React, TypeScript, Vinext, Vite | Application/runtime tooling |
| `@cortex-js/compute-engine` | Browser-side symbolic expression support |
| KaTeX | Mathematical typesetting |
| ChatGPT Sites / Cloudflare tooling | Build and hosting |
| Remotion | Demo-video composition |
| STIX Two Text and Fira Code | Open-licensed local fonts; notices are included in `public/fonts/` |

No third-party source is vendored or modified. The seeded calculus photograph in `public/demo/calculus-source.png`, interface, copy, diagrams, and Mathburst branding are challenge-period project assets.

The [YC Requests for Startups Primer](https://www.ycombinator.com/rfs#the-primer) influenced the long-term vision of deeply adaptive tutoring. It supplied inspiration, not source, text, images, or product assets.

## Licence

The repository is released under the [MIT Licence](LICENSE).

Copyright 2026 MetaDigits.AI Inc.
