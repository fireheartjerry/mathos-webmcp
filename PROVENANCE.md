# Project provenance

This file separates the new WebMCP challenge project from existing Mathos systems and external design references.

## Challenge dates

The official submission period runs from **August 25, 2026 at 11:00 AM Pacific Time** to **September 3, 2026 at 1:00 PM Pacific Time**.

Mathos started this repository during that period. The first dated project commit is `409dfcc` on August 26, 2026.

## The product this repository submits

The submitted product is **Second Try** — a math scratchpad in which the learner writes real multi-step working, the page's own computer algebra system finds the first step that stopped being equivalent, and a WebMCP agent teaches to that exact step.

An earlier concept, *Mathos: From Calculus to Transformers*, was built and then retired during the challenge period after an internal audit. It is not the submission. The change is recorded here rather than erased: the landing narrative, the ten-stage curriculum rail, the curated two-literal diagnosis loop, and the browser-trained transformer lab all belonged to that earlier concept.

Both concepts are entirely challenge-period work. Retiring one for the other moved no work across the boundary in either direction.

## New challenge-period work

All application source in this repository is new challenge-period work. This work includes:

- The mathematics core: expression parser, the dual-route equivalence oracle, the seeded problem generator, and the misconception diagnoser.
- The session domain: one shared transition function for learners, agents, and the local inspector; monotonic revisions; idempotency; and versioned local persistence.
- The six WebMCP tool definitions, their input schemas and annotations, and the registration bridge.
- The scratchpad interface, the Agent Console, and the local inspector.
- The evidence receipt and its stated claim boundary.
- The Astro landing page and the visual system built on the frozen token set.
- The test suite (178 tests).
- The deployment configuration and judge-facing documents.

The first application-source commit is `8150dc4`, dated August 26, 2026. No application source in this repository predates the submission period.

## Retired and relocated challenge-period work

These were built during the challenge period and are no longer on the judged path. They remain challenge-period work; they are simply not part of the submitted product.

- **The tiny transformer lab.** A real one-block causal transformer trained in the browser with TensorFlow.js. Moved to `experiments/tiny-transformer/`. It is out of the build, out of the bundle, and out of the demo. `@tensorflow/tfjs` is no longer a dependency of the shipped application. The reason is stated in the README under "What we cut, and why": it exercised no WebMCP tool.
- **The ten-stage curriculum rail.** Deleted. Nine of its ten stages did not exist.
- **The curated `36` / `8` diagnosis-and-transfer loop.** Replaced by generated problems and a real equivalence check.
- **The plain-HTTP proxy to a bare IP address** in `vercel.json` and `astro.config.mjs`. Removed.

## Pre-existing Mathos work

Mathos Video Generation is an existing Mathos product and service. Its generation engine, API, hosted player, and production capability are not challenge-period source in this repository.

The earlier concept embedded a canonical Mathos-generated shared-path lesson with this identifier:

```text
dec88f8290464fbe88707899523145e6
```

**That video is no longer part of the judged path.** Video generation is not exposed as an agent tool and is not required by, or referenced from, the demo journey. The hosted lesson and player remain Mathos assets outside this repository.

The submission must not describe the existing Mathos video engine as new challenge-period code. It may describe the new WebMCP learning product as a use of that company capability.

## External software

The application depends on Astro, React, TypeScript, and:

| Package | Role | Pre-existing or new |
| --- | --- | --- |
| `@cortex-js/compute-engine` | The computer algebra system that writes every verdict. Third-party, MIT-licensed, unmodified. | Pre-existing third-party library |
| `katex` | Typesetting the problem, the learner's steps, and the engine's expressions. Third-party, MIT-licensed, unmodified. | Pre-existing third-party library |
| `vitest` | The test runner for the 178-test suite. | Pre-existing third-party tool |

Package names and versions appear in `package.json` and `pnpm-lock.yaml`. No third-party source is vendored, forked, or modified in this repository.

The verdict logic is ours; the symbolic engine underneath it is not, and this document says so plainly. What Second Try contributes is the dual-route relation inference (`equals` or `differentiates`, inferred rather than asked), the first-broken-step walk, the seeded generator with its collision guard, and the agent-facing contract around all of it.

## Design references

The product uses two design references:

- The [YC Requests for Startups Primer](https://www.ycombinator.com/rfs#the-primer) influenced the long-form learning narrative and ambitious thesis.
- [Sarsa](https://sarsa.app/) influenced the quiet Astro page, the hairline rules, the restrained motion, and the layout rhythm. The measured reference values are recorded in `docs/overnight-audit/07_MATHOS_SARSA_DESIGN_DNA.md`.

The project does not copy source code, text, images, icons, video, or other assets from either reference. The visual system and implementation in this repository are original challenge-period work.

## Credibility claims

Only the following statements about Mathos appear in this repository, and both are corroborated by third-party sources: **Y Combinator W24** and **Forbes 30 Under 30**.

No App Store rating, funding figure, user count, or university-partnership claim appears anywhere in the submission. The reasoning is recorded in `docs/overnight-audit/07_MATHOS_SARSA_DESIGN_DNA.md` §2.6. An earlier README carried a line combining a user count with those two awards; it has been removed.

## Commit boundary

The commit history records the work in order.

**Earlier concept — built, then retired:**

| Commit | Challenge-period work |
| --- | --- |
| `409dfcc` | Product design |
| `89a8cd1` | Implementation plans |
| `8150dc4` | First application source and adaptive judge path |
| `986976a` | Calculus-to-transformers landing narrative |
| `6b9b5bd` through `03d775d` | WebMCP tools and live session behavior |
| `79688d1` | Mathos video integration |
| `aef2aa8` through `267fdb9` | Real browser-trained transformer lab |
| `551b549` through `94fed22` | Presentation, navigation polish, and deployment fixes |
| `5b8196c`, `126c71f` | Judge and submission documents |

**Audit, freeze, and the submitted product:**

| Commit | Challenge-period work |
| --- | --- |
| `6f17b25` | Overnight audit — current state, math feasibility, design DNA, anti-slop research, live WebMCP verification against Chrome 151 |
| `f8fb147` | The real math core, and the frozen redesign spec |
| `cfe9d33` | Session domain and the six tools, written against verified Chrome behaviour |
| `15fe3df` | The scratchpad interface on the frozen design system |
| `f200ce8` | New landing page; the old product surface retired |

The release-package commit adds only judge and submission documents. It does not change the product source.

## Documents referenced elsewhere

`MATHOS_WEBMCP_OMEGA_CANONICAL_SPEC.md` has never existed in this repository. Any external reference to it describes a document that was not written here and does not govern this work. The frozen specification for the submitted product is `docs/overnight-audit/10_FINAL_REDESIGN_SPEC.md`, which supersedes every earlier design document in this repository, including everything under `docs/plans/` and `docs/superpowers/`.

## Licence

This repository is released under the MIT Licence. See [`LICENSE`](LICENSE).

Copyright 2026 MetaDigits.AI Inc.
