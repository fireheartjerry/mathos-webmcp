# Project provenance

This file separates the new WebMCP challenge project from existing Mathos systems and external design references.

## Challenge dates

The official submission period runs from **August 25, 2026 at 11:00 AM Pacific Time** to **September 3, 2026 at 1:00 PM Pacific Time**.

Mathos started this repository during that period. The first dated project commit is `409dfcc` on August 26, 2026.

## New challenge-period work

All application source in this repository is new challenge-period work. This work includes:

- The Astro landing page and React learning studio.
- The curated calculus diagnosis and transfer loop.
- The ten-stage calculus-to-transformers pathway.
- The shared state transitions for people and agents.
- The five WebMCP tool registrations and handlers.
- The Mathos video integration and generation-stream client.
- The TensorFlow.js tiny-transformer lab.
- The loss chart, raw sample view, and attention heatmap.
- The deployment configuration and judge-facing documents.

The first application-source commit is `8150dc4`, dated August 26, 2026. No application source in this repository predates the submission period.

## Pre-existing Mathos work

Mathos Video Generation is an existing Mathos product and service. Its generation engine, API, hosted player, and production capability are not challenge-period source in this repository.

The app uses a canonical Mathos-generated shared-path lesson with this identifier:

```text
dec88f8290464fbe88707899523145e6
```

The hosted lesson and player remain Mathos assets outside this repository. This project adds the diagnosis-aware player surface, live stream client, opening-to-full upgrade, and learning-flow integration.

The submission must not describe the existing Mathos video engine as new challenge-period code. It can describe the new WebMCP learning product as a use of that company capability.

## Design references

The product uses two design references:

- The [YC Requests for Startups Primer](https://www.ycombinator.com/rfs#the-primer) influenced the long-form learning narrative and ambitious thesis.
- [Sarsa](https://sarsa.app/) influenced the quiet Astro page, editorial typography, fine rules, and restrained motion.

The project does not copy source code, text, images, icons, video, or other assets from either reference. The visual system and implementation in this repository are original challenge-period work.

## Commit boundary

The commit history records the work in order:

| Commit | Challenge-period work |
| --- | --- |
| `409dfcc` | Product design |
| `89a8cd1` | Implementation plans |
| `8150dc4` | First application source and adaptive judge path |
| `986976a` | Calculus-to-transformers landing narrative |
| `6b9b5bd` through `03d775d` | WebMCP tools and live session behavior |
| `79688d1` | Mathos video integration |
| `aef2aa8` through `267fdb9` | Real browser-trained transformer lab |
| `551b549` through `94fed22` | Mathos presentation, navigation polish, and deployment fixes |

The release-package commit adds only judge and submission documents. It does not change the product source.

## External software

The project uses Astro, React, TensorFlow.js, TypeScript, and their dependencies. Their package names and versions appear in `package.json` and `pnpm-lock.yaml`.

No repository-license claim appears here. The final license file and public repository state require a separate legal decision before submission.
