# WebMCP criteria

**Target:** 100/100
**Budget:** 5 rounds, stop early at 100
**Created:** 2026-08-30
**Status:** APPROVED by owner, 2026-08-30
**Scope:** the WebMCP layer only — `src/domain/tools/**`, the registration path in
`src/components/Scratchpad.tsx`, and the Agent Console that reports it.

## How this document is graded

**Like a proof, not like an essay.** Every criterion is a set of enumerated checks,
each of which passes or fails by a stated procedure that a stranger could re-run and
get the same answer. The score is arithmetic:

```
points(Cn) = 20 × (checks passed / checks total)     rounded to the nearest integer
total      = Σ points(Cn)
```

There are no adjectives in the anchors and nothing is left to the scorer's taste. A
scorer's only job is to run the procedures and count. Consequently:

- **100/100 is not praise. It means every enumerated check passed.** It is the
  ordinary result of the work being correct, and it is reachable by definition.
- **Any gap names a specific failing check.** "You lost 4 points on C3.7" is
  actionable in a way that "the concurrency story feels weak" is not.
- **If a check cannot be run, it does not become a judgment call.** It is reported as
  `BLOCKED`, excluded from both numerator and denominator, and disclosed — so the
  round is scored out of an adjusted maximum and the report says so.

This mirrors what the product itself argues: the verifier computes equivalence and
says `could not determine` rather than guessing. Criteria that graded this submission
by vibe while it grades learners by computation would be incoherent.

**Rule for amending this document:** any check whose outcome could differ between two
careful scorers is defective and must be rewritten or deleted, not averaged.

## Thesis (changed this cycle, by owner decision)

Previously: *the agent advises, the learner decides.* Now: **the page is a fully
agent-operable workspace.** Anything the learner can do, an agent can do through
WebMCP — read, write, edit, undo, set the problem. The receipt records who did what,
so full power comes with a full audit trail rather than with restrictions.

## Why this document exists separately

The previous cycle's single WebMCP criterion topped out at 8/16 and the independent
scorer confirmed the gap could not be closed:

> "`exposedTo` and `fromOrigins` demonstrably do not filter in Chrome 151 and
> re-registration throws, so scoring higher would require claiming a browser
> capability that does not exist."

That criterion measured **Chrome's** implementation, which no work here can move, so
its ceiling was a property of the browser rather than of the submission. Every check
below is one this repository can determine the outcome of.

## Constraints

- **Tool surface expands to whatever WebMCP permits.** No cap chosen by us.
- **Grouped, legible unscrolled.** The Agent Console shows named groups with counts,
  all visible on first load at 1440×900 and 1280×800, zero clicks, zero scrolling.
  *This supersedes gate G3 in `minimal-ui-criteria.md`,* which required every
  individual tool name to be visible — impossible once the surface is maximal.
- Probes clean up after themselves; they never inflate the product's tool list.
- The minimal-UI constraints still bind: one typeface, one duration, colour and
  opacity transitions only.

## Out of scope

Visual design beyond the Agent Console, motion, typography, the mathematics in
`src/domain/math/**`, deployment, the demo video.

---

## Gate (binary; reported separately from the score)

**W1.** `pnpm test` passes with no fewer tests than the previous round, and
`pnpm typecheck` exits zero.

*Owner decision: the only gate. Capability honesty and state safety are scored in C5
and C3 rather than blocking.*

---

## C1 — The surface is as large as the platform permits · 20 pts

**10 checks, 2 pts each.**

Let `L` = the empirically determined maximum number of tools registrable in Chrome 151.
Let `A` = the enumerated set of distinct product capabilities (defined in C1.2).
Let `R` = the set of tools actually registered by the product on load.

| # | Check | Passes when |
|---|---|---|
| C1.1 | Ceiling probed | A script registers tools in increasing quantity until `registerTool` rejects, `getTools()` returns fewer than registered, or 1000 is reached. `L` and the terminating condition are recorded in `docs/webmcp/ceiling.md`. |
| C1.2 | Capability set enumerated | `docs/webmcp/capabilities.md` lists every distinct capability, each with the file:line of the UI control or state it corresponds to. |
| C1.3 | Coverage complete | Every entry in `A` maps to exactly one tool in `R`. Count of unmapped entries = 0. |
| C1.4 | No padding | For every pair in `R`, the pair is not reducible to one tool plus one parameter. Count of reducible pairs = 0. |
| C1.5 | Bound is named | `docs/webmcp/ceiling.md` states which of `L` or `\|A\|` binds, with the number. |
| C1.6 | Surface is at the bound | `\|R\| = min(L, \|A\|)`. |
| C1.7 | Read-back agrees | `(await getTools()).length === \|R\|` and the name sets are equal. |
| C1.8 | Groups legible at 1440×900 | Screenshot on first load: every group label and its count is within the viewport, `scrollHeight <= clientHeight` for the console, zero clicks. |
| C1.9 | Groups legible at 1280×800 | Same measurement at the second width. |
| C1.10 | Counts are correct | Each group's displayed count equals the number of tools in that group in `getTools()`. |

## C2 — Every tool executes correctly · 20 pts

**5 checks, 4 pts each.** Let `N = |R|`. Every tool gets one valid call and one invalid
call (a missing required field, a wrong type, or an out-of-range value), executed via
`document.modelContext.executeTool(tool, json)`. Transcripts land in
`docs/webmcp/transcripts/`.

| # | Check | Passes when |
|---|---|---|
| C2.1 | All resolve | Of `2N` calls, the number that reject or throw = 0. |
| C2.2 | Valid effects observable | For each of the `N` valid calls, a DOM diff taken before and after is non-empty for mutating tools, and the returned payload matches the read for read-only tools. Failures = 0. |
| C2.3 | Refusals structured | Each of the `N` invalid calls returns an envelope with `ok: false` and a machine-readable error code. Failures = 0. |
| C2.4 | Refusals name the field | Each invalid-call envelope names the offending field in a dedicated property, not only in prose. Failures = 0. |
| C2.5 | Transcripts complete | `docs/webmcp/transcripts/` contains `2N` recorded call/response pairs with timestamps. |

## C3 — Safe under concurrency, replay, and lifecycle · 20 pts

**10 checks, 2 pts each.** Each is a scripted scenario with a stated pass predicate.

| # | Scenario | Passes when |
|---|---|---|
| C3.1 | Stale `expectedRevision` | Envelope is `ok: false` with a stale-revision code, and the serialized scratchpad state is identical before and after. |
| C3.2 | Replayed `requestId` | Second call returns the first call's result, and the state changed exactly once. |
| C3.3 | Two unawaited mutations | Both resolve; final state equals the result of applying them in some serial order; no interleaved partial write. |
| C3.4 | Aborted mid-flight | Call settles, and state is either fully applied or fully unapplied — never partial. |
| C3.5 | Second tab holds session | Envelope explains the conflict and offers a named recovery action that exists in the DOM. |
| C3.6 | bfcache Back | Read-back returns exactly `R`, or the console states what is gone. |
| C3.7 | Reload | Read-back returns exactly `R`, no duplicates. |
| C3.8 | Second tab opened, return to first | Read-back returns exactly `R`, no duplicates. |
| C3.9 | 60s backgrounded | Read-back returns exactly `R`. |
| C3.10 | Register during in-flight probe | Read-back returns exactly `R`, no probe residue. |

## C4 — Legible to an agent that has never seen it · 20 pts

**10 checks, 2 pts each.** C4.1–C4.3 are a live test: a fresh agent receives **only**
the JSON output of `getTools()` and the journey goal, with no source, README, or prose
from this repo, and its calls are recorded.

| # | Check | Passes when |
|---|---|---|
| C4.1 | Journey completes | The fresh agent reaches the receipt. |
| C4.2 | Few dead calls | Calls that return `ok: false` and are not followed by a corrected retry: 0. |
| C4.3 | Errors drive recovery | Every `ok: false` is followed by a call whose change matches the field the error named. Failures = 0. |
| C4.4 | Schemas typed | Every field in every `inputSchema` has a `type`. Missing = 0. |
| C4.5 | Schemas bounded | Every string field has `maxLength`, every number has bounds, every enum is enumerated. Missing = 0. |
| C4.6 | `required` accurate | For each tool, omitting each `required` field is refused and omitting each optional field succeeds. Failures = 0. |
| C4.7 | Descriptions state when not to call | Every description contains an explicit non-applicability clause. Missing = 0. |
| C4.8 | `readOnlyHint` accurate | For every tool, the hint equals whether a DOM diff after a valid call is empty. Mismatches = 0. |
| C4.9 | `untrustedContentHint` accurate | True for exactly those tools whose payload can contain learner-authored text. Mismatches = 0. |
| C4.10 | Names self-consistent | Every tool name matches `^[a-z][a-z0-9_]*$` and its verb matches its `readOnlyHint`. Failures = 0. |

## C5 — Honest platform coverage · 20 pts

**10 checks, 2 pts each.** Six probes, verified by hand in Chrome 151.

| # | Check | Passes when |
|---|---|---|
| C5.1 | Verdicts accurate | Independent manual verification of all six agrees with the reported status. Disagreements = 0. |
| C5.2 | No literals | A source scan of `platform.ts` finds zero `status` values not computed from a variable observed in that call. |
| C5.3 | No did-not-throw verdicts | Zero probes report `supported` on the sole evidence that a call did not reject. |
| C5.4 | Observations stated | All six `detail` strings name the concrete observation (a count, a name, a thrown message). Missing = 0. |
| C5.5 | Accepted vs honoured | For every parameter Chrome accepts but ignores, the detail says so explicitly. Missing = 0. |
| C5.6 | Console renders all six | All six rows and their details are present in the DOM without consulting source. |
| C5.7 | Failure is legible | With WebMCP disabled, all six render `untested` with a reason. |
| C5.8 | Probes are reversible | `getTools()` after a full probe run equals `R` exactly. |
| C5.9 | Probes are re-runnable | A second run returns identical statuses. |
| C5.10 | Coverage documented | `docs/webmcp/platform.md` records each verdict with the date, Chrome version, and reproduction step. |

---

## Scoring configuration

Pinned for the whole loop. Evidence — transcripts, read-backs, DOM diffs, screenshots,
scan output — is produced by the orchestrator, because it requires a live Chrome
session with `--enable-features=WebMCPTesting`. **Judgment is independent**: a
fresh-context scorer receives this document with the score log stripped, the artifact,
and the evidence, and its only task is to run the procedures and count. C4's fresh
agent is a separate agent receiving only `getTools()` output. This split is disclosed
in every round and in the final report.

## Score log

| Round | Score | Δ | Gate | Note |
|---|---|---|---|---|
| 0 | 32 | — | PASS | baseline. C1 6, C2 8, C3 0, C4 6, C5 12. Nothing BLOCKED. |
| 1 | 76 / 98 adj | +44 | PASS | C1 16, C2 8, C3 18/18, C4 14/18, C5 20/20. BLOCKED: C3.9, C4.3. |
