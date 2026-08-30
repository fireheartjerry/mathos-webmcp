# Round 0 evidence pack — baseline, unmodified build

All measurements taken 2026-08-30 against Chrome 151.0.7922.174 with
`--enable-features=WebMCPTesting`, dev server on `localhost:3000`, driven over CDP by
`scripts/webmcp-eval.mjs`. Every script referenced is in `scripts/checks/`.

**Nothing in this file is a judgment.** It is the raw output of the check procedures.

---

## Gate W1

`pnpm test` → **248 passed, 15 files.** `pnpm typecheck` → clean.

---

## C1 — surface size

**C1.1 ceiling** (`c1-ceiling.js`): 1000 tools registered, `getTools()` returned 1000,
per-batch latency flat at 8–11ms per 50 across the entire range. `registerTool` never
rejected; `getTools()` never truncated. Terminating condition was the probe's own
maximum, not platform failure. **`L ≥ 1000`.** Recorded in `ceiling.md`.

**C1.2 capability enumeration**: `docs/webmcp/capabilities.md` **does not exist**.

**C1.3 coverage**: cannot be computed — `A` is not enumerated.

**C1.4 padding**: 6 tools, no reducible pairs.

**C1.5 binding constraint**: named in `ceiling.md` as `|A|`, since `L ≥ 1000`.

**C1.6 `|R| = min(L, |A|)`**: `|R| = 6`. `|A|` unenumerated, but the tool payload itself
lists learner capabilities the agent cannot reach (see C2 below), so `|R| < |A|`.

**C1.7 read-back** (`c1-readback.js`): `getTools()` → 6 names, exactly matching the
product set: `annotate_step, check_work, get_receipt, get_scratchpad, new_problem,
propose_step`. No residue, no duplicates.

**C1.8 / C1.9 group legibility**: the console is a flat list of 6, not grouped. No group
labels or counts exist to measure.

**C1.10 group counts**: no groups exist.

---

## C2 — execution (`c2-execute.js`)

12 calls via `document.modelContext.executeTool(tool, JSON.stringify(args))`.

**C2.1 all resolve**: rejected/threw = **0 of 12**. All twelve settled.

**C2.2 valid effects observable**: of the 6 valid calls, **1 succeeded** (`get_scratchpad`,
`ok: true`). The other 5 returned `ok: false`:

| tool | code | message |
|---|---|---|
| `get_receipt` | `invalid_phase` | No round has finished yet. |
| `check_work` | `invalid_phase` | There is nothing to check yet. |
| `annotate_step` | `not_found` | (no step to annotate) |
| `propose_step` | `not_found` | (no step to propose against) |
| `new_problem` | `invalid_phase` | — |

Root cause is stated by the product itself, in the `get_scratchpad` payload:

> `"note": "You cannot write, edit, or accept steps. Only the learner can."`
> `"availableActions": []`

There is no tool by which an agent can create a step. Every step-dependent tool is
therefore unreachable from a fresh session, and the agent cannot drive the product.

**C2.3 refusals structured**: 6 of 6 invalid calls returned `ok: false` with a
machine-readable `error.code` (`invalid_input` in all six). **0 failures.**

**C2.4 refusals name the field**: **0 of 6** carry a dedicated field/param property. The
offending field appears only in prose, if at all.

**C2.5 transcripts**: `docs/webmcp/transcripts/` **does not exist**.

---

## C3 — concurrency and lifecycle

**C3.1–C3.5 not executable at baseline.** Every mutation scenario requires an existing
step, and no tool can create one (see C2.2). The scenarios are not *blocked by tooling*
— they are unreachable because the product refuses agent writes by design.

**C3.6–C3.10 lifecycle**: not run this round.

---

## C4 — agent legibility (`c4-audit.js`)

Static audit over `getTools()` output. Note: Chrome returns `inputSchema` as a **JSON
string**, not an object.

| check | result |
|---|---|
| C4.4 every field typed | untyped = **0** |
| C4.5 every field bounded | unbounded = **0** |
| C4.7 description states when *not* to call | missing = **6 of 6** |
| C4.10 name pattern `^[a-z][a-z0-9_]*$` | failures = **0** |

Per tool: `annotate_step` 5 fields / 4 required; `check_work` 2 / 2; `get_receipt` 0 / 0;
`get_scratchpad` 0 / 0; `new_problem` 3 / 2; `propose_step` 5 / 5.

**C4.1–C4.3 live fresh-agent test**: not run at baseline. Note that C2.2 establishes the
journey cannot be completed by an agent from the tool list alone, because no tool writes
a step.

**C4.6, C4.8, C4.9**: not separately measured this round.

---

## C5 — platform coverage (`c5-probe.js`, `c5-abort.js`)

Independent re-verification of all six probe verdicts, by direct execution:

| feature | observed | `platform.ts` reports | agrees? |
|---|---|---|---|
| `exposedTo` | own tool present **and** foreign-scoped tool also visible (`foreignLeaked: true`) | `partial` | yes |
| `getTools({fromOrigins})` | all=2, here=2, foreign=2 → no filtering | `partial` | yes |
| `toolchange` | `isEventTarget: true`, `fired: true` | `supported` | yes |
| declarative `<form toolname>` | tool appeared without an imperative call | `supported` | yes |
| phase-dependent descriptions | duplicate name throws `InvalidStateError: Duplicate tool name` | `unsupported` | **see below** |
| annotations | sent 4, kept `readOnlyHint`, `untrustedContentHint` only | `partial` | yes |

**C5.1 accuracy — one disagreement.** `c5-abort.js` establishes that
`registerTool(tool, { signal })` followed by `controller.abort()` **does** unregister:

```
presentWhileLive: true, presentAfterAbort: false,
abortUnregisters: true, reRegisteredAfterAbort: "accepted"
```

So a tool *can* revise what it says about itself — abort, then re-register the same
name. `platform.ts` reports this capability as `unsupported` with the detail "there is
no unregister call", which the abort result contradicts. The reported verdict is wrong
in the conservative direction.

**C5.2 no literals**: no hard-coded statuses remain in `platform.ts` (all six compute
from observed values).

**C5.3 no did-not-throw verdicts**: none; each verdict inspects a value.

**C5.4 observations stated**: all six details name a count, a name, or a thrown message.

**C5.5 accepted vs honoured**: drawn for `exposedTo` and `fromOrigins`.

**C5.6 console renders six**: yes, behind an opt-in control.

**C5.7 unsupported browser**: renders `untested` with a reason.

**C5.8 probes reversible**: **fails.** `residue: { before: 0, after: 5, leftBehind: 5 }`.
`hasUnregister: []` — no `unregisterTool`/`removeTool`/`deleteTool` exists. The probes
register without a signal, so their tools persist for the page's lifetime. The abort
result above shows this is fixable, not structural.

**C5.9 re-runnable**: not measured.

**C5.10 documented**: `docs/webmcp/platform.md` **does not exist**.
