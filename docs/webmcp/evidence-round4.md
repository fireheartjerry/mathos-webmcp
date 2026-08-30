# Round 4 evidence pack

Measured 2026-08-30 against Chrome 151.0.7922.174 with `--enable-features=WebMCPTesting`,
driven over CDP by `scripts/webmcp-eval.mjs`. Scripts in `scripts/checks/`.

**Nothing here is a judgment.** It is the output of the check procedures.

This round exists to confirm nothing regressed. Since round 3 scored 100/100 the build has
gained a fourth problem family, a seventh platform probe, runtime enforcement of Chrome's
output budget, a prompt-injection fix, a favicon, a declared colour scheme, and a demo
video — none of which the earlier score covers.

---

## Gate W1

`pnpm test` → **368 passed, 21 files** (round 3: 307). `pnpm typecheck` → clean.
**`pnpm build` → succeeds**, which is part of this gate as of round 3.

---

## C1 — surface size

| # | Measurement |
|---|---|
| C1.1 | `L ≥ 1000`, terminating condition = probe maximum, flat latency. `ceiling.md`. |
| C1.2 | `capabilities.md` enumerates 18, each with a file:line. **Every citation is asserted by `citations.test.ts`**, which also fails if the docs cite anything untested. `scripts/sync-citations.mjs` re-points them when code moves. |
| C1.3 | Unmapped capabilities = **0**. |
| C1.4 | Reducible pairs = **0** under the test stated in `capabilities.md`. |
| C1.5 | `\|A\| = 18` binds; `min(L, \|A\|) = 18`, stated with the number. |
| C1.6 | `\|R\| = 18 = min(L, \|A\|)`. |
| C1.7 | `getTools()` → 18, `dupes: []`, `probeResidue: []`. |
| C1.8 | 1440×900: all six group labels and counts in the first viewport, zero clicks. |
| C1.9 | 1280×800: `allInViewport: true`, counts `3, 3, 4, 3, 4, 1` = 18. |
| C1.10 | Displayed counts match `getTools()` and `TOOL_GROUPS`. |

## C2 — execution

`c2-full.js` → `docs/webmcp/transcripts/round4.json`.

| # | Measurement |
|---|---|
| C2.1 | 37 calls, **rejected = 0**. |
| C2.2 | **validFailures = []**; **validMutatingWithoutDomChange = []**. |
| C2.3 | **invalidAccepted = []**, `invalidWithoutCode = []`. |
| C2.4 | **invalidWithoutField = []**, and all **35** required-field refusals carry `field`. |
| C2.5 | 37 recorded pairs with timestamps; `toolsCovered: 18`. |

The script previously assumed the product-rule premise shape and broke when the fourth
family arrived with two definitions rather than three — it now builds the premise from
whatever the problem declares. That was a defect in the measurement, not the product.

## C4.1–C4.3 — re-run against this build

Full call log: `transcripts/round4-blind-agent.md`. A fresh agent received only the
18,615-byte `getTools()` JSON and the goal; the orchestrator executed its proposed calls
verbatim and pasted raw envelopes back. **No argument was supplied or repaired on its
behalf**, `expectedRevision` included. It drew the `trig-chain` family — the one added
after round 3 — and reached the receipt in 14 calls.

| # | Measurement |
|---|---|
| C4.1 | Reached the receipt: `get_receipt` → `ok`, one round, `allStepsSound: true`, `linesWritten: {agent: 3}`. |
| C4.2 | `ok: false` calls not followed by a corrected retry: **0** (one failure, later retried successfully). |
| C4.3 | The single `invalid_phase` names its remedy — *"until a fresh problem has been started"* — and the recovery call was `new_problem`. Failures = **0**. |

`judge-journey.js` is a *scripted* journey and is not a substitute for this: it knows the
answers. This agent did not, and verified its own derivative against the page engine
(`compare_expressions`) before writing it.

## C3 — concurrency and lifecycle

Unchanged from round 3 and re-confirmed by the judged journey, which asserts the
stale-revision refusal leaves state identical and that a repaired derivation reaches the
answer: **20 of 20** (`judge-journey.js`). Probe residue after a full platform run: 18
tools before, 18 after.

## C4 — agent legibility

| # | Measurement |
|---|---|
| C4.1–C4.3 | Re-run this round — see above. |
| C4.4 | Fields without `type` = **0**. |
| C4.5 | Number fields missing either bound = **0**, enforced by test. |
| C4.6 | **35** required-field omissions, refused = 35, not refused = **0**. |
| C4.7 | Descriptions lacking a non-applicability clause = **0 of 18**, enforced by test. |
| C4.8 | **The audit file covers 14 of 18** — `get_receipt` is reported `untested` because the audit's reset clears the history it needs, and three writes need a phase it does not build. The claim rests on the transcript, where all 18 tools have a successful valid call: the 9 read-only ones `domChanged: false`, the 9 writes `true`, **0 mismatches**. `readOnlyMismatches = []` on the 14 it does exercise. |
| C4.9 | `untrustedContentHint` true for exactly `['get_scratchpad']`. |
| C4.10 | 18 of 18 names match `^[a-z][a-z0-9_]*$`. |

## C5 — platform coverage

Seven probes, `probesAgree: true`, `toolsAfterProbes: 18`.

| Feature | Verdict |
|---|---|
| `exposedTo` | partial — accepted, not honoured |
| `getTools({fromOrigins})` | partial — accepted, not honoured |
| `toolchange` | supported |
| declarative `<form toolname>` | supported |
| withdrawing a tool (`AbortSignal`) | supported |
| annotations beyond the two hints | partial |
| `requestUserInteraction()` | **unsupported — absent from the prototype entirely** |

---

## Beyond the rubric

These are not scored by `webmcp-criteria.md`; they were found by using the product rather
than measuring it against the rubric, and are recorded so the next scorer can see them.

- **A prompt-injection channel, shipped and then closed.** `\text{…}` parses to a symbol
  carrying arbitrary prose, and the refusal message repeated it into `error.field`'s
  envelope — a field an agent reads as the page speaking. `injection.test.ts`.
- **Chrome's output budget enforced at runtime.** Measured live: 1206 / 1282 / 1237 / 1478
  characters against the 1.5K limit.
- **A production build that did not compile**, invisible because the dev server does not
  minify. `pnpm build` is now in the gate.
- **Accessibility**: zero problems on both pages at 390–1280px; worst contrast 5.02:1;
  `color-scheme: light` declared so a dark-mode browser cannot repaint the palette.
- **Four problem families**, each with its own diagnosable error modes and a shared
  collision guard.
