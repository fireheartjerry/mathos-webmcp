# 01 — Current State Map

Reconstructed 2026-08-26 by direct inspection of source, git history, and the running
production build. Nothing here is taken from prior documentation on trust.

---

## 1. Where the project actually lives

| Path | Contents |
| --- | --- |
| `mathos-webmcp/` (branch `main`) | **Docs only.** README stub + `docs/plans/`. 3 commits. |
| `mathos-webmcp/.worktrees/hackathon-build/` (branch `hackathon-build`) | **The entire application.** 15 commits on top of `main`. |
| `Mathos/github/`, `Mathos/main/` | The real Mathos monorepo (Python/Poetry). Contains `.env` files with live secrets. **Must never be copied into the public repo.** |
| `Mathos/mathos-webmcp-demo-draft.mp4` | A 170 s narrated *still-capture* draft demo video (33 MB). Not a live screen recording — the manifest admits this. |

The remote is `origin/main`, which is **three commits behind the application branch**.
Everything a judge would see if they cloned the public repo today is documentation with
no application source. `hackathon-build` has never been merged or pushed.

**Finding CS-1 (blocking).** The public repository does not currently contain the product.

---

## 2. What the product currently is

Not "Second Try." The concept drifted. The shipped concept is:

> **Mathos: From Calculus to Transformers** — one curated calculus mistake unlocks a
> ten-stage narrative pathway that ends in the learner training a real 6,578-parameter
> character transformer in the browser with TensorFlow.js.

Two routes:

- `/` — Astro landing page (953 lines of CSS, 173 lines of markup).
- `/learn` — a single React island, `LearningStudio`, which owns three UI modes
  (`lesson`, `pathway`, `lab`) and a six-state learning machine.

### The learning state machine

```
initial ──(attempt === '40')──> initial_correct ──START_TRANSFER──> transfer
   │                                                                   │
   └──(attempt === '36')──> diagnosis ──SHOW_LESSON──> lesson ──────────┘
                                                                        │
                                                    (attempt === '8') ──> receipt
```

`transitionStudio()` in `LearningStudio.tsx:66` is the single reducer. Both human
controls and WebMCP tools call it. That part of the architecture is genuinely sound —
there is one transition function, monotonic revisions, and an append-only activity log.

### Source inventory

| File | Lines | Role |
| --- | --- | --- |
| `src/components/LearningStudio.tsx` | 463 | Reducer + all six learning screens + shell |
| `src/components/learning-studio.css` | 2001 | All studio styling |
| `src/components/TransformerLab.tsx` | 225 | TFJS training UI |
| `src/components/MathosVideoPanel.tsx` | 106 | Mathos video embed + generation stream |
| `src/components/PathwayBridge.tsx` | 52 | The ten-stage narrative screen |
| `src/lib/webmcp.ts` | 359 | Tool definitions + registration + page bridge |
| `src/lib/tinyTransformer.ts` | 212 | Real TFJS transformer |
| `src/lib/mathosVideo.ts` | 108 | SSE client for Mathos video generation |
| `src/styles/landing.css` | 953 | Landing page styling |
| `src/pages/index.astro` | 173 | Landing markup |
| **Tests** | **0** | **There is no test file, no test runner, and no test script.** |

**Finding CS-2 (blocking).** Zero automated tests exist. `package.json` has no `test`
script. Every correctness claim in the README is unverified by anything executable.

---

## 3. The mathematics: there is none

This is the most serious finding in the audit.

`LearningStudio.tsx:70-92` — the entire "check the learner's answer" system:

```js
if (state.stage === 'initial') {
  if (attempt === '40') { /* correct */ }
  if (attempt === '36') { /* the one diagnosable misconception */ }
  /* anything else */ → "Not yet."
}
if (state.stage === 'transfer') {
  if (attempt === '8') { /* passed */ }
  /* anything else */ → "Not yet."
}
```

Three raw string comparisons. That is the whole engine.

**Verified live in the running production build:** entering `40.0` — which is the
mathematically correct answer to the first problem — produces
*"Not yet. Recheck every route from x to y."*

There is no parser, no AST, no normalisation, no symbolic route, no numeric route, no
independent evaluator, no dual numbers, no finite differences, no diagnosis engine, and
no problem generator. The prior architecture documents describing those subsystems
describe software that was never written.

Consequences:

- **Finding CS-3 (blocking).** Correct answers are rejected. `40.0`, `+40`, `40 `,
  `dy/dx = 40`, and `4·10` all fail. A judge who does not type the exact literal the
  README tells them to type will be told they are wrong by a math-education product.
- **Finding CS-4 (blocking).** The "diagnosis" recognises exactly one wrong answer
  (`36`). Every other wrong answer — including `4`, the equally diagnosable
  *opposite* misconception of finding only the direct path — collapses into a single
  generic "Not yet." The product claims to read misconceptions from answers; it reads
  one, by literal match.
- **Finding CS-5 (blocking).** The "fresh transfer problem" is not fresh and not
  generated. It is a second hardcoded problem (`q = 2x`, `k = x²`, `s = q·k + q`) that
  is the first problem with renamed variables and a different evaluation point. The
  receipt's phrase "solved a fresh problem" is not supportable.
- **Finding CS-6 (blocking).** The receipt prints its own hardcoding to the screen:
  `OBSERVED SEQUENCE  36 → lesson → 8`. A judge reading that line, then reading the
  README's instruction to "Enter `36`" and "Enter `8`", has been handed the exploit.

The honest description of the current build is **a two-problem scripted walkthrough with
a state machine around it**, not an adaptive learning system.

---

## 4. WebMCP surface

Five tools registered in `src/lib/webmcp.ts` via
`document.modelContext.registerTool(tool, { signal })`:

| Tool | readOnly | Required args |
| --- | --- | --- |
| `get_learning_workspace` | yes | `{}` |
| `check_current_attempt` | no | `attempt`, `expectedRevision`, `requestId` |
| `show_targeted_lesson` | no | `diagnosisId`, `expectedRevision`, `requestId` |
| `start_transfer_problem` | no | `lessonId`, `expectedRevision`, `requestId` |
| `get_learning_receipt` | yes | `{}` |

What is genuinely good here, and should survive any redesign:

- One shared transition function for humans and agents. No divergent code paths.
- Monotonic `revision`, with `expectedRevision` used for optimistic-concurrency
  rejection (`stale_revision`).
- `requestId` idempotency cache that de-duplicates retried calls, including in-flight
  promises.
- `AbortSignal` checked at the top of every handler.
- Structured error envelope with a `recovery` string telling the agent what to do next.
- Every mutation appends to a visible activity log.

What is wrong:

- **Finding CS-7 (high).** The API shape is unverified against current Chrome.
  `document.modelContext.registerTool(tool, {signal})` is asserted, not tested — the
  running browser here has no `document.modelContext` at all, so the live path has
  never been exercised in this environment. *(Under verification by the WebMCP research
  agent.)*
- **Finding CS-8 (high).** Three of five tools require the agent to invent a
  `requestId` matching `^[A-Za-z0-9_-]{8,64}$` **and** echo an `expectedRevision` it must
  have fetched first. This is correct engineering and hostile ergonomics: it converts
  every write into a mandatory two-call sequence and adds two ways for a model to fail
  argument validation. The idempotency and concurrency guarantees are worth keeping;
  making them the *model's* responsibility is the questionable part.
- **Finding CS-9 (high).** The tools are thin wrappers over a six-state machine whose
  entire content is three string comparisons. "This could have been a backend MCP
  server" is a fair attack, because the page-owned state being manipulated is almost
  nothing.
- **Finding CS-10 (blocking, strategic).** In a browser without WebMCP — **the default
  state for a judge opening the link** — the product says nothing about WebMCP except a
  10 px grey line in the far top-right corner reading
  *"USE CHROME 149+ OR THE CHATGPT BROWSER FOR AGENT TOOLS"*. The entire journey then
  proceeds as an ordinary click-through tutorial. The single thing the competition
  judges is invisible by default and announced only as an absence.

---

## 5. The Mathos video integration

Real, and better than expected — with two caveats.

- `MathosVideoPanel` iframes a genuine Mathos-hosted Remotion player at
  `video-generation-web-host-staging.mathos.ai/<id>-full/index.html`. **Verified live:**
  the host returns 200 and the player renders an actual generated lesson about the
  product route contributing 36.
- "Generate a fresh version" POSTs to `/video-api/video-generation` and consumes a real
  SSE stream with a well-written incremental parser (`mathosVideo.ts:70`).

Caveats:

- **Finding CS-11 (high).** The player takes **more than six seconds** to paint its
  first frame. Before that the panel is a ~500 px empty grey rectangle sitting under the
  confident label "GENERATED BY MATHOS · CANONICAL SHARED-PATH LESSON · READY NOW". The
  most important credibility asset in the demo begins as a dead box.
- **Finding CS-12 (blocking, security/provenance).** `vercel.json` and
  `astro.config.mjs` both proxy `/video-api/*` to **`http://<internal-ip>:8001`** — a
  bare IP over plain HTTP, committed to what is intended to be a public repository. This
  exposes internal Mathos infrastructure, is unencrypted, and will be read by judges as
  either a leak or a hack.
- **Finding CS-13 (medium).** The console emits
  *"Some companies are required to obtain a license to use Remotion."* from the Mathos
  player. Worth confirming Mathos's licence position before pointing judges at it.

### The decisive design evidence

The embedded player is the **real Mathos product surface**. It renders in
**blue (~#2196F3), a system/Inter sans, rounded pill labels, and rounded cards.**

The shell around it is **cream (#F7F4EC-ish), rust (#C85D31), forest green (#3F795F),
and a high-contrast editorial serif.**

They clash violently. The one element in the application that genuinely came from Mathos
looks like a foreign object embedded in someone else's magazine. That is direct,
photographic evidence for the complaint that this does not look like a Mathos product —
it is a Sarsa-flavoured editorial theme with a `MATHOS·` wordmark set above it.

---

## 6. The transformer lab

`tinyTransformer.ts` (212 lines) builds a real one-block causal transformer in
TensorFlow.js: token + position embeddings, two-head masked self-attention, residuals,
layer norm, a 24→48→24 FFN, cross-entropy, Adam at 3e-3. 6,578 parameters. The loss
curve, generated samples, and attention heatmap all read from live weights. The
screenshot evidence shows loss falling 3.2807 → 1.3865 over 100 steps.

This is the most technically substantial and most visually confident part of the build.
It is also:

- **Finding CS-14 (high, strategic).** Completely disconnected from WebMCP. Zero tools
  touch it. It is a spectacle bolt-on that consumes the back half of the demo while
  scoring nothing on the criterion the competition actually measures.
- **Finding CS-15 (medium).** Its output is honest gibberish
  (`"change follows acha pangefus."`). Honest, but it is the note the demo currently
  ends on.
- It pulls the entire `@tensorflow/tfjs` bundle (the >500 kB chunk warning in the build)
  for a payoff unrelated to the thesis.

---

## 7. The ten-stage pathway

`PATHWAY` in `LearningStudio.tsx:20` and `BRIDGE_STAGES` in `PathwayBridge.tsx:1` render
a persistent left rail advertising ten curriculum stages. **Nine of them do not exist.**
The README concedes this at the very bottom under "Current limitation."

- **Finding CS-16 (high).** A fixed rail occupying ~17% of every screen advertises
  content that is not built. It is inert (correctly rendered as static text, not
  buttons, so at least it is not fake-interactive), but it is a permanent visual promise
  the product cannot keep, and it is the first thing in the reading order after the
  header.

---

## 8. Build and runtime health

- **Finding CS-17 (blocking).** `pnpm dev` — the exact command the README gives under
  "Run locally" — serves a **completely blank page** at `/learn`. Console:
  `Uncaught TypeError: _jsxDEV is not a function`. The React island never hydrates. A
  judge who clones the repo and follows the README sees nothing at all.
  `pnpm build && pnpm preview` works correctly, so the defect is dev-mode only — and the
  documented path is the broken one.
- The production build succeeds in ~7 s with one >500 kB chunk warning (TFJS).
- No `test` script; `typecheck` runs `astro check`.

---

## 9. Documentation and claims

- `README.md` opens the technical section with
  *"Backed by Y Combinator · Featured in Forbes · Built for 5M+ learners"* — marketing
  copy in a judged engineering artifact, and claims that must be verified verbatim
  against Mathos's own public wording before submission.
- `PROVENANCE.md` is genuinely good work: it draws a clean challenge-period boundary,
  names the pre-existing Mathos video engine as pre-existing, records the canonical
  video ID, and names both design references. **This file should survive largely
  intact.**
- `PROVENANCE.md` names the visual reference as **Sarsa — https://sarsa.app/** (verified
  live: "Sarsa · Human-sourced data for computer-use AI"). The project owner's
  "Sarasota" refers to this. Recording the resolution here so no later agent invents a
  different reference.
- `PROVENANCE.md` states: *"No repository-license claim appears here. The final license
  file and public repository state require a separate legal decision before
  submission."* If the competition requires an OSI licence, this is an open blocking
  item.

---

## 10. What survives, what dies

**Survives (audited and worth keeping):**

- The single-reducer architecture: one `transitionStudio`, humans and agents share it.
- Revisions, the stale-revision guard, the idempotency cache, abort checks, and the
  structured error envelope with `recovery` strings.
- The append-only activity log as the visible proof-of-agency surface.
- `PROVENANCE.md` and its challenge-period boundary discipline.
- The real Mathos video integration *as a capability* (the SSE parser is well written).
- The tiny transformer *as code* — pending a ruling on whether it belongs in the
  submission at all.

**Dies:**

- Every string-comparison answer check, and the two hardcoded problems behind them.
- The "diagnosis" that recognises one literal.
- The nine fictional pathway stages and the rail that advertises them.
- The cream/rust/serif editorial theme, unless the design research overturns the
  evidence of the embedded player.
- The plain-HTTP bare-IP proxy.
- The marketing line in the README.
- The floating drop-shadowed "certificate" treatment of the receipt.

---

## 11. Blocking findings, ranked

| # | Finding | Severity |
| --- | --- | --- |
| CS-3 | Correct answers rejected (`40.0` fails) | Blocking |
| CS-10 | WebMCP invisible in the default judge browser | Blocking (strategic) |
| CS-17 | `pnpm dev` renders a blank page | Blocking |
| CS-1 | Public repo contains no application source | Blocking |
| CS-12 | Plain-HTTP bare-IP proxy to internal infra in public config | Blocking |
| CS-5 / CS-6 | "Fresh problem" is hardcoded, and the UI prints the fact | Blocking |
| CS-2 | Zero tests | Blocking |
| CS-4 | One-literal diagnosis engine | Blocking |
| CS-7 | WebMCP API shape unverified against shipped Chrome | High |
| CS-14 | Transformer lab scores nothing on WebMCP leverage | High (strategic) |
| CS-16 | Nine advertised stages do not exist | High |
| CS-8 | Agent must supply `requestId` + `expectedRevision` on every write | High |
| CS-9 | Page-owned state too thin to defeat "this is just backend MCP" | High |
| CS-11 | Mathos video is a grey box for 6+ seconds | High |
| CS-13 | Remotion licence notice | Medium |
| CS-15 | Demo ends on model gibberish | Medium |
