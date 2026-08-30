# Round 1 evidence pack

All measurements taken 2026-08-30 against Chrome 151.0.7922.174 with
`--enable-features=WebMCPTesting`, dev server on `localhost:3000`, driven over CDP by
`scripts/webmcp-eval.mjs`. Scripts are in `scripts/checks/`.

**Nothing in this file is a judgment.** It is the output of the check procedures.

---

## Gate W1

`pnpm test` → **257 passed, 15 files** (round 0: 248). `pnpm typecheck` → clean.

---

## C1 — surface size

| # | Measurement | Source |
|---|---|---|
| C1.1 | 1000 tools registered, `getTools()` returned 1000, latency flat at 8–11ms per 50. `registerTool` never rejected, `getTools()` never truncated. Terminating condition: probe maximum. **`L ≥ 1000`.** | `ceiling.md`, `c1-ceiling.js` |
| C1.2 | `capabilities.md` enumerates 18 capabilities, each cited to a reducer action (`types.ts:98-106`) or a distinct computation. | `capabilities.md` |
| C1.3 | Unmapped capabilities = **0**. Every row in `A` has exactly one tool. | `capabilities.md` |
| C1.4 | Reducible pairs = **0**. The reducibility test used is stated in `capabilities.md`: one tool obtainable from another by fixing a parameter, *and* sharing input and return shape. Section-slicing reads (`get_problem`, `get_steps`, …) were excluded under it, which is why the surface is 18 and not 30. | `capabilities.md` |
| C1.5 | Binding constraint named: **`\|A\|`**, since `L ≥ 1000` and `\|A\| = 18`. | `ceiling.md` |
| C1.6 | `\|R\| = 18`, `min(L, \|A\|) = min(≥1000, 18) = 18`. Equal. | `c3-readback.js` |
| C1.7 | `getTools()` → 18 names, name sets equal, `dupes: []`, `probeResidue: []`. | `c3-readback.js` |
| C1.8 | At viewport **1442×906**: all six group labels and counts inside the viewport, zero clicks, `allInViewport: true`. | `c1-groups.js` |
| C1.9 | At viewport **1282×800**: `allInViewport: true`; no nested scroller inside the console. | `c1-groups.js` |
| C1.10 | Group counts rendered `3, 3, 4, 3, 4, 1` = 18, matching `getTools()`. | `c1-groups.js` |

Console header reads `18 page tools available`, matching read-back.

---

## C2 — execution

`c2-full.js`, transcripts in `docs/webmcp/transcripts/round1.json`.

| # | Measurement |
|---|---|
| C2.1 | **37 calls, 0 rejected, 0 threw.** All settled. |
| C2.2 | Every one of the 18 tools executed with a valid call. Mutating successes produced a DOM diff; read tools returned the payload their description promises (`differentiate_expression('4x^3 + x^2')` → `12x^2+2x`; `evaluate_expression('12x^2 + 2x', at: 2)` → `52`; `compare_expressions('2x + 2x','4x')` → `match`, both routes). |
| C2.3 | Unstructured refusals = **0**. Every failure carries `error.code`. |
| C2.4 | `invalid_input` refusals without a `field` property = **0**. Field names observed: `latex`, `stepId`, `at`, `right`, `since`, `expectedRevision`, `nope`. |
| C2.5 | `docs/webmcp/transcripts/round1.json` holds 37 call/response pairs, each with `startedAt`, `ms`, `args`, `settled`, `domChanged`, `result`. All 18 tools covered by both a valid and an invalid call. |

At round 0, five of six valid calls failed because no tool could create a step. That is
now zero: the reducer's `LEARNER_ONLY` list, which refused `ADD_STEP`, `EDIT_STEP`,
`REMOVE_STEP`, `RESOLVE_PROPOSAL` and `RESET` from any non-learner source, is empty.

---

## C3 — concurrency and lifecycle

`c3-safety.js`, `c3-readback.js`, `c3-conflict.js`, `c3-background.js`.

| # | Scenario | Observed |
|---|---|---|
| C3.1 | Stale `expectedRevision` | `code: stale_revision`, `field: expectedRevision`, recovery present, **state byte-identical before and after**. |
| C3.2 | Replayed `requestId` | Both calls returned `{"ok":true,"revision":17,"data":{"stepId":"step-2","stepCount":2}}` — identical envelope, and the state changed exactly once. |
| C3.3 | Two unawaited mutations | `a` → `ok:true` at revision 18; `b` → `stale_revision`. Exactly one applied; no interleaved partial write. |
| C3.4 | Abort mid-flight | Chrome rejects with `AbortError` at the browser layer and never passes the signal to the handler, so the write stays applied. **Not partial** (`partial: false`), and the call settled. Documented in `platform.md`. |
| C3.5 | Second tab holds the session | Conflicted tab returns `invalid_phase`, *"Another tab changed this session, so this copy is paused."*, recovery *"Start a fresh session in this tab, or close the other tab and reload."* A button matching that recovery exists in the DOM. |
| C3.6 | bfcache Back | 18 tools, no dupes, no residue, header unchanged. |
| C3.7 | Reload | 18 tools, no dupes, no residue. |
| C3.8 | Second tab opened, return to first | 18 tools, no dupes, no residue. |
| C3.9 | 60s elapsed | 62,029ms waited; 18 tools, no dupes, no residue; a write afterwards returned `ok: true`. **Caveat:** `visibilityState` remained `"visible"` — CDP kept the tab active, so this measured elapsed time, not true backgrounding. |
| C3.10 | Register during in-flight probe | 18 before, 18 after. No probe residue. |

**A defect found and fixed by this criterion.** The paint barrier had no deadline: a
mutation waited for React to paint before returning, and when no paint arrived the
promise never settled — *after the write had already applied*. Observed directly: in the
first C3.3 run, call `a` never settled while its step landed and the revision advanced
from 22 to 23, so an agent could not learn that its own write had succeeded. `wait()`
now takes a deadline and resolves `painted` or `unconfirmed`; an unconfirmed write
returns normally carrying `paintedBeforeReturning: false`. Covered by two tests in
`paintBarrier.test.ts`.

---

## C4 — agent legibility

`c4-audit.js`, `c4c5-audit.js`.

| # | Measurement |
|---|---|
| C4.4 | Fields without a `type` = **0**. |
| C4.5 | Unbounded fields = **0**. (Round 0 note: `expectedRevision` declares `minimum: 0` with no maximum; `get_changes_since.since` now declares `minimum: 0, maximum: 1000000`.) |
| C4.6 | **35 required-field omissions tested across all 18 tools; refused = 35, not refused = 0.** Optional fields omitted did not cause refusal. |
| C4.7 | Descriptions lacking a non-applicability clause = **0 of 18**, enforced by a test that fails the build. At round 0 this was 6 of 6 by measurement (3 of 6 on the scorer's stricter reading). |
| C4.8 | `readOnlyHint` accuracy: 9 read-only tools called; revision changed on **0**. |
| C4.9 | `untrustedContentHint` is true for exactly `['get_scratchpad']` — the only tool whose payload echoes learner-authored LaTeX. `get_receipt` and `get_changes_since` return only product-composed strings and were unmarked this round. |
| C4.10 | Names matching `^[a-z][a-z0-9_]*$` = 18 of 18; verbs agree with `readOnlyHint`. |

**C4.1–C4.3 live blind-agent test:** see the section appended below.

---

## C5 — platform coverage

`c5-probe.js`, `c5-abort.js`, `c4c5-audit.js`, documented in `platform.md`.

| # | Measurement |
|---|---|
| C5.1 | Independent manual verification of all six verdicts agrees with what `get_platform` reports. Disagreements = **0**. At round 0 there was one: the phase/lifecycle row reported `unsupported` on the grounds that no unregister exists, which `c5-abort.js` contradicted. |
| C5.2 | Statuses not computed from an observed value = **0**. |
| C5.3 | Verdicts resting solely on "the call did not throw" = **0**. |
| C5.4 | Details naming no concrete observation = **0**. Each names a count, a name, or a thrown message. |
| C5.5 | Accepted-vs-honoured drawn for both `exposedTo` and `getTools({fromOrigins})`. |
| C5.6 | All six rows render, reachable in-product through the `get_platform` tool as well as the console. |
| C5.7 | Without WebMCP, `untestedPlatform()` renders six `untested` rows with a reason. |
| C5.8 | **`getTools()` after a full probe run = 18, equal to `R`.** At round 0 this was 5 stranded tools per run with no way to remove them; probes now register through a scope holding an `AbortController` and abort it in a `finally`. |
| C5.9 | Two consecutive `get_platform` runs returned identical statuses (`probesAgree: true`). |
| C5.10 | `docs/webmcp/platform.md` records each verdict with date, Chrome version, observation, and a reproduction script. |

Verdicts: `exposed-to: partial`, `from-origins: partial`, `toolchange: supported`,
`declarative: supported`, `lifecycle: supported`, `annotations: partial`.
