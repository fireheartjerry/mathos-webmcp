# Round 3 evidence pack

Measurements taken 2026-08-30 against Chrome 151.0.7922.174 with
`--enable-features=WebMCPTesting`, dev server on `localhost:3000`, driven over CDP by
`scripts/webmcp-eval.mjs`. Scripts in `scripts/checks/`.

**Nothing in this file is a judgment.** It is the output of the check procedures. Where
round 1's evidence was found to be overstated, the correction is stated rather than
quietly replaced.

---

## Gate W1

`pnpm test` → **307 passed, 16 files** (round 2: 261, round 1: 259, round 0: 248).
`pnpm typecheck` → clean.

---

## What changed since round 2, and why

The round-2 scorer found five wrong file:line citations, a measurement taken at the
wrong width, and three refusals that named their field only in prose. The citation
failure is the serious one: round 2's pack claimed *"every row of both tables now
carries a verified file:line"*, and five were still wrong. Asserting a verification that
was never performed is worse than the original error, so verification is now a **test**
rather than a claim.

| Finding | Status |
|---|---|
| 5 of 27 citations in `capabilities.md` wrong, after the pack claimed all were verified | **Fixed, and no longer verified by hand.** `src/domain/tools/citations.test.ts` opens every cited file and asserts the cited line contains what the doc claims — 45 assertions. A final test extracts every `file.ts:NN` from the docs and fails if any is not covered, so a new uncited claim cannot slip in either. |
| C1.9 measured at 1282x800, not the 1280x800 the rubric names | **Fixed.** Re-measured at exactly 1280x800. |
| 3 required-field refusals named the field only in prose | **Fixed.** All 35 required refusals now carry `error.field`; a test covers six of them by name. |
| C4.8's audit counted `annotate_step` as matching when its call had failed, so nothing was tested | **Fixed.** A failed audit call is reported as `untested` rather than counted, and the audit resets to a practice round so `annotate_step` is genuinely exercised. |
| `platform.md` and the audit disagreed on a tool count (2 vs 20) | **Reconciled.** Both were true of their own run context; `platform.md` now quotes the `/learn` figure and states explicitly that counts are context-dependent while the verdict is not. |
| C3.9 was BLOCKED twice — first not backgrounded at all, then self-reported via an override | **Produced for real.** See C3.9 below. |

### The earlier rounds' corrections, still standing

Round 1's scorer found a real bug — `differentiate_expression({variable: 12})` returned
`ok:true` — and three overstatements. All remain fixed: `optionalVariable()` refuses a
wrong-typed optional argument, `expectedRevision` carries a maximum, and the C2
procedure drives each tool into a phase where it applies.

| Finding | Status |
|---|---|
| `differentiate_expression({latex:'x', variable: 12})` returned `ok:true` — a wrong-typed optional argument was treated as absent | **Fixed.** `optionalVariable()` refuses it and names `variable`. A test covers both tools that take it. |
| C2.2 overstated: 7 of 19 "valid" calls actually returned `ok:false` on phase constraints | **Fixed in the procedure.** `c2-full.js` now drives each tool into a phase where it applies, and reports `validFailures` explicitly instead of counting only transport rejections. |
| C1.2 citation wrong: `types.ts:98-106` is inside `SessionState` | **Superseded.** Round 2 asserted here that every citation had been verified; five were still wrong. The claim is withdrawn and replaced by `citations.test.ts`, which checks them rather than asserting them. |
| C4.5 overstated: `expectedRevision` had `minimum: 0` and no maximum, across 11 tools | **Fixed.** `maximum: 1_000_000`, and a test asserts every declared number field carries both bounds. |
| C1.8 measured at 1442×906, not the 1440×900 the rubric names | **Fixed.** Re-measured at exactly 1440×900. |

---

## C1 — surface size

| # | Measurement | Source |
|---|---|---|
| C1.1 | 1000 tools registered, `getTools()` returned 1000, latency flat 8–11ms per 50; never rejected, never truncated. Terminating condition: probe maximum. **`L ≥ 1000`.** | `ceiling.md` |
| C1.2 | `capabilities.md` lists 18 capabilities, each with a file:line. **Every citation is verified by test**: `citations.test.ts` asserts 45 of them against the files, and a further test fails if the docs cite anything the suite does not check. A wrong citation now breaks the build. | `capabilities.md`, `citations.test.ts` |
| C1.3 | Unmapped capabilities = **0**. | `capabilities.md` |
| C1.4 | Reducible pairs = **0** under the test stated in `capabilities.md`. | `capabilities.md` |
| C1.5 | **`|A| = 18` binds**, stated with the number: `min(L, \|A\|) = min(≥1000, 18) = 18`. | `ceiling.md` |
| C1.6 | `\|R\| = 18 = min(L, \|A\|)`. | `c3-readback.js` |
| C1.7 | `getTools()` → 18, name sets equal, `dupes: []`, `probeResidue: []`. | `c3-readback.js` |
| C1.8 | Viewport measured **exactly 1440×900**: `allInViewport: true`, zero clicks. | `c1-groups.js` |
| C1.9 | Viewport measured **exactly 1280x800**: `allInViewport: true`, counts `3, 3, 4, 3, 4, 1`, no nested scroller in the console. | `c1-groups.js` |
| C1.10 | Counts rendered `3, 3, 4, 3, 4, 1` = 18, matching `getTools()` and `TOOL_GROUPS`. | `c1-groups.js` |

---

## C2 — execution

`c2-full.js`, transcripts in `docs/webmcp/transcripts/round3.json`. 37 recorded calls:
19 valid (one per tool, plus `reset_session` twice — once to clear, once recorded) and
18 invalid (one per tool).

| # | Measurement |
|---|---|
| C2.1 | `rejected: 0` of 37. Every call settled. |
| C2.2 | **`validFailures: []`** — every valid call returned `ok: true`. **`validMutatingWithoutDomChange: []`** — every mutating success produced a non-empty DOM diff. |
| C2.3 | **`invalidAccepted: []`** — all 18 invalid calls were refused. `invalidWithoutCode: []`. |
| C2.4 | **`invalidWithoutField: []`** — every refusal names the offending argument in `error.field`. Separately, all **35** required-field refusals in `c4c5-audit.json` now carry `field` too; three did not in round 2. |
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
| C3.9 | **60s genuinely backgrounded** | `scripts/background-check.mjs`: the tab reported `visibilityState: "hidden"` **on its own**, with no override, both before and throughout; `waitedMs: 62151`; before/after name lists **identical**; `dupes: []`; `residue: []`; a write afterwards returned `ok: true`. |
| C3.10 | Register during in-flight probe | 18 before, 18 after. |

**On C3.9's method, stated plainly — third attempt.** Round 1 opened a second tab and
measured elapsed time while `visibilityState` stayed `"visible"`, so the scenario was
never produced. Round 2 overrode the page's own `visibilityState`, which reproduces what
a backgrounded tab *reports* rather than the state itself; the scorer marked it BLOCKED
again, and correctly — disclosure does not convert an unproduced scenario into a passing
one.

This run removes the override entirely; `scripts/checks/c3-background.js` is deleted.
`scripts/background-check.mjs` activates a second target through CDP and then asks the
page what it observes. The page answered `hidden` **without being told to**, and had in
fact already been `hidden` before the second tab was activated, because the browser
window is not foreground in this environment. The measurement is therefore of a
genuinely backgrounded tab, and the 62-second wait ran under whatever throttling Chrome
applies to one. No override remains anywhere in the check.

---

## C4 — agent legibility

| # | Measurement |
|---|---|
| C4.4 | Fields without `type` = **0**. |
| C4.5 | Number fields missing either bound = **0**. `expectedRevision` now declares `maximum: 1_000_000`; a test asserts this for every number field, so the next unbounded one fails the build. |
| C4.6 | 35 required-field omissions across all 18 tools; **refused = 35, not refused = 0**. |
| C4.7 | Descriptions lacking a non-applicability clause = **0 of 18**, enforced by a test. |
| C4.8 | **All 18 verified from the transcript, not by inference.** For every tool `round3.json` holds a successful valid call with a recorded DOM diff; comparing each tool's `readOnlyHint` against whether its call changed the DOM gives **18 of 18 tools, 0 mismatches** — the 9 read-only tools all `domChanged: false`, the 9 writes all `true`. The `c4c5-audit.js` run is secondary corroboration: 14 tools directly exercised, `readOnlyMismatches: []`, with `get_receipt` reported as `untested` (the audit's reset clears the history it needs) and 3 in `readOnlySkipped`. Nothing is counted as passing that was not tested — round 2 counted `annotate_step` as matching when its call had failed. |
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
