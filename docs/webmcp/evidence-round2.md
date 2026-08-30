# Round 2 evidence pack

Measurements taken 2026-08-30 against Chrome 151.0.7922.174 with
`--enable-features=WebMCPTesting`, dev server on `localhost:3000`, driven over CDP by
`scripts/webmcp-eval.mjs`. Scripts in `scripts/checks/`.

**Nothing in this file is a judgment.** It is the output of the check procedures. Where
round 1's evidence was found to be overstated, the correction is stated rather than
quietly replaced.

---

## Gate W1

`pnpm test` → **261 passed, 15 files** (round 1: 259, round 0: 248).
`pnpm typecheck` → clean.

---

## What changed since round 1, and why

The round-1 scorer found four claims of mine wrong or overstated and one real bug. All
five are addressed here.

| Finding | Status |
|---|---|
| `differentiate_expression({latex:'x', variable: 12})` returned `ok:true` — a wrong-typed optional argument was treated as absent | **Fixed.** `optionalVariable()` refuses it and names `variable`. A test covers both tools that take it. |
| C2.2 overstated: 7 of 19 "valid" calls actually returned `ok:false` on phase constraints | **Fixed in the procedure.** `c2-full.js` now drives each tool into a phase where it applies, and reports `validFailures` explicitly instead of counting only transport rejections. |
| C1.2 citation wrong: `types.ts:98-106` is inside `SessionState` | **Fixed.** The action union is `types.ts:111-121`; every row of both tables now carries a verified file:line, including all nine reads. |
| C4.5 overstated: `expectedRevision` had `minimum: 0` and no maximum, across 11 tools | **Fixed.** `maximum: 1_000_000`, and a test asserts every declared number field carries both bounds. |
| C1.8 measured at 1442×906, not the 1440×900 the rubric names | **Fixed.** Re-measured at exactly 1440×900. |

---

## C1 — surface size

| # | Measurement | Source |
|---|---|---|
| C1.1 | 1000 tools registered, `getTools()` returned 1000, latency flat 8–11ms per 50; never rejected, never truncated. Terminating condition: probe maximum. **`L ≥ 1000`.** | `ceiling.md` |
| C1.2 | `capabilities.md` lists 18 capabilities. Each of the 9 writes cites its reducer action line (`types.ts:112–120`), its learner control, and its tool. Each of the 9 reads cites the state or module it reads and its tool line in `definitions.ts`. | `capabilities.md` |
| C1.3 | Unmapped capabilities = **0**. | `capabilities.md` |
| C1.4 | Reducible pairs = **0** under the test stated in `capabilities.md`. | `capabilities.md` |
| C1.5 | **`|A| = 18` binds**, stated with the number: `min(L, \|A\|) = min(≥1000, 18) = 18`. | `ceiling.md` |
| C1.6 | `\|R\| = 18 = min(L, \|A\|)`. | `c3-readback.js` |
| C1.7 | `getTools()` → 18, name sets equal, `dupes: []`, `probeResidue: []`. | `c3-readback.js` |
| C1.8 | Viewport measured **exactly 1440×900**: `allInViewport: true`, zero clicks. | `c1-groups.js` |
| C1.9 | Viewport 1282×800: `allInViewport: true`; no nested scroller in the console. | `c1-groups.js` |
| C1.10 | Counts rendered `3, 3, 4, 3, 4, 1` = 18, matching `getTools()` and `TOOL_GROUPS`. | `c1-groups.js` |

---

## C2 — execution

`c2-full.js`, transcripts in `docs/webmcp/transcripts/round2.json`. 37 recorded calls:
19 valid (one per tool, plus `reset_session` twice — once to clear, once recorded) and
18 invalid (one per tool).

| # | Measurement |
|---|---|
| C2.1 | `rejected: 0` of 37. Every call settled. |
| C2.2 | **`validFailures: []`** — every valid call returned `ok: true`. **`validMutatingWithoutDomChange: []`** — every mutating success produced a non-empty DOM diff. |
| C2.3 | **`invalidAccepted: []`** — all 18 invalid calls were refused. `invalidWithoutCode: []`. |
| C2.4 | **`invalidWithoutField: []`** — every refusal names the offending argument in `error.field`. |
| C2.5 | 37 pairs recorded with `startedAt`, `ms`, `args`, `settled`, `domChanged`, `result`; `toolsCovered: 18`. |

The procedure now drives phase explicitly: a line is written before `reset_session` so
its effect is observable; two learner edits precede `propose_step` to satisfy the
attempt gate; and a sound derivation is built **from this session's own givens** —
computed via `differentiate_expression` and `evaluate_expression` rather than
hard-coded — so `new_problem` and `get_receipt` are both in phase.
`soundReached.allSound: true`.

An earlier version of this script hard-coded a previous problem's answer; because
`reset_session` regenerates the problem, the derivation never reached `allSound` and
those two tools returned `invalid_phase`. That was a defect in the measurement, not in
the product, and it is why round 1 reported them as failures.

---

## C3 — concurrency and lifecycle

| # | Scenario | Observed |
|---|---|---|
| C3.1 | Stale `expectedRevision` | `stale_revision`, `field: expectedRevision`, state byte-identical. |
| C3.2 | Replayed `requestId` | Identical envelope; state changed exactly once. |
| C3.3 | Two unawaited mutations | One applied, the other `stale_revision`; no partial write. |
| C3.4 | Abort mid-flight | Settles as `AbortError`; `partial: false`. Chrome never hands the signal to the handler, so the write stays applied — documented in `platform.md`. |
| C3.5 | Second tab holds session | `invalid_phase`, "Another tab changed this session, so this copy is paused", recovery names a button present in the DOM. |
| C3.6 | bfcache Back | 18 tools, no dupes, no residue. |
| C3.7 | Reload | 18 tools, no dupes. |
| C3.8 | Second tab, return to first | 18 tools, no dupes. |
| C3.9 | **60s genuinely hidden** | `visibilityDuringWait: "hidden"`, `waitedMs: 62005`, before/after name lists **identical**, `dupes: []`, `residue: []`, and a write afterwards returned `ok: true`. |
| C3.10 | Register during in-flight probe | 18 before, 18 after. |

**On C3.9's method, stated plainly.** Round 1 opened a second tab and measured elapsed
time while `visibilityState` stayed `"visible"` — CDP keeps its page active — so the
scenario was never produced and the scorer correctly marked it BLOCKED. This run
overrides the page's own visibility API to `hidden` for the duration and dispatches
`visibilitychange`, which is what a backgrounded tab reports to the page. **Caveat:**
this reproduces the page-observable state, not Chrome's process-level timer throttling,
which was not independently confirmed.

---

## C4 — agent legibility

| # | Measurement |
|---|---|
| C4.4 | Fields without `type` = **0**. |
| C4.5 | Number fields missing either bound = **0**. `expectedRevision` now declares `maximum: 1_000_000`; a test asserts this for every number field, so the next unbounded one fails the build. |
| C4.6 | 35 required-field omissions across all 18 tools; **refused = 35, not refused = 0**. |
| C4.7 | Descriptions lacking a non-applicability clause = **0 of 18**, enforced by a test. |
| C4.8 | **Both halves measured.** 15 of 18 tools exercised directly: for every one, `readOnlyHint` matched whether the revision changed; `readOnlyMismatches: []`. The 3 skipped (`propose_step`, `resolve_proposal`, `new_problem`) need a phase this audit does not build; they are listed in `readOnlySkipped` rather than omitted, and the C2 transcript shows all three returning `ok:true` with `domChanged: true`, consistent with `readOnlyHint: false`. Round 1 checked only the 9 read-only tools. |
| C4.9 | `untrustedContentHint` true for exactly `['get_scratchpad']`. |
| C4.10 | 18 of 18 names match `^[a-z][a-z0-9_]*$`; verbs agree with `readOnlyHint`. |

---

## C5 — platform coverage

| # | Measurement |
|---|---|
| C5.1 | All six verdicts agree with independent verification. |
| C5.2 | Statuses not computed from an observed value = **0**. |
| C5.3 | Verdicts resting on absence-of-throw = **0**. |
| C5.4 | Details naming no observation = **0**. |
| C5.5 | Accepted-vs-honoured drawn for `exposedTo` and `fromOrigins`; annotations state what was dropped. |
| C5.6 | All six rows render and are reachable through `get_platform`. |
| C5.7 | Without WebMCP, six `untested` rows with a reason. |
| C5.8 | `getTools()` after a full probe run = **18**, equal to `R`. |
| C5.9 | Two consecutive runs returned identical statuses; `probesAgree: true`. |
| C5.10 | `platform.md` records each verdict with date, Chrome version, observation, reproduction script. |

Verdicts unchanged: `exposed-to: partial`, `from-origins: partial`,
`toolchange: supported`, `declarative: supported`, `lifecycle: supported`,
`annotations: partial`.

---

## C4.1–C4.3 — the blind agent test, re-run without the crutch

**What changed in the method.** Round 1 let the agent write `"__NEEDS__"` for
`expectedRevision` and the harness substituted the live value. A real agent gets no such
helper, and the substitution meant the agent never once met a refusal — which is why
C4.3 had zero instances and was scored BLOCKED. That substitution is removed. The agent
now supplies every argument itself, from values it read in earlier results.

**Setup.** Fresh agent, fresh context, given exactly one file: the JSON output of
`getTools()` (`toollist2.json`, 18.5KB). Forbidden from reading any other file.
Blindness enforced by instruction, not by sandbox — disclosed.

| Batch | Calls | Outcome |
|---|---|---|
| 1 | `get_scratchpad`, `get_receipt`, `list_problem_families` | `get_scratchpad` ok. **`get_receipt` → `ok:false`, `invalid_phase`,** *"No round has finished yet."* Batch stopped at the failure, so `list_problem_families` never ran. |
| 2 | `differentiate_expression`, `evaluate_expression`, `remove_step`, `get_scratchpad` | Verified `dy/dx = 12x² + 4x` and its value `40` at `x = −2` against the CAS **before writing**. Deleted a leftover line, explicitly reasoning that `remove_step` was right because the line "is not an attempt at this problem, not a line to fix" — the distinction the two descriptions draw. |
| 3–5 | Three `add_step`, each followed by `get_scratchpad` | Wrote `4x^3 + 2x^2`, `12x^2 + 4x`, `40`. Re-read the revision between writes rather than guessing it, stating that a stale revision would be rejected. |
| 6 | `check_work`, `get_scratchpad` | **`allSound: true, reachesAnswer: true`** on the first check. No wrong turn this run. |
| 7 | `new_problem`, `get_receipt` | Closed the round — noting `new_problem` keeps the receipt where `reset_session` destroys it — and read the evidence. |

**Measured:**

- **C4.1 journey completes** — yes, reached the receipt.
- **C4.2 dead calls** — `ok:false` envelopes not followed by a corrected call: **0**.
  There was exactly one `ok:false` (batch 1's `get_receipt`), and it was corrected.
- **C4.3 errors drive recovery** — **not vacuous this round, and it passes.** The single
  refusal's `recovery` read *"There is nothing to report until a fresh problem has been
  started."* The agent did not retry `get_receipt` blindly; it left it, completed the
  work, called `new_problem`, and only then called `get_receipt` again — which succeeded.
  The corrective action matches the condition the error named.

**What the receipt reported afterwards:**

```json
{"round":"practice","allStepsSound":true,
 "linesWritten":{"learner":0,"agent":4,"localInspector":0},
 "checksRun":1,
 "annotations":{"agent":0,...},"proposalsOffered":{"agent":0,...}}
```

Every line was agent-written and the receipt says so. Under round 1's code this same
round would have reported all-zero provenance and read as unaided — the fix is doing the
work the thesis claims for it.
