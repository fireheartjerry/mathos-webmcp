# WebMCP rounds

Round log for `webmcp-criteria.md`. One block per round.

**Disclosure, every round:** evidence — transcripts, read-backs, DOM measurements,
screenshots, scan output — is produced by the orchestrator, because it requires a live
Chrome 151 session with `--enable-features=WebMCPTesting`. **Judgment is independent**:
a fresh-context scorer receives the criteria with the score log stripped, the artifact,
and the evidence, and its only task is to run the procedures and count. C4's blind
agent is a separate agent that receives only the `getTools()` output.

---

## Round 0 — baseline, score 32/100

**Scorer:** independent subagent, fresh context. **Gate W1:** PASS (248 tests, typecheck clean).

| Criterion | Score |
|---|---|
| C1 surface size | 6/20 |
| C2 execution | 8/20 |
| C3 concurrency and lifecycle | 0/20 |
| C4 agent legibility | 6/20 |
| C5 platform coverage | 12/20 |

Nothing was classified `BLOCKED`; the scorer was explicit that "the feature does not
exist" is a FAIL rather than an environment problem.

### What the baseline established

- **The agent could not drive the product at all.** Five of six valid calls failed on a
  fresh session because no tool could create a step. `get_scratchpad` said so in its own
  payload: *"You cannot write, edit, or accept steps. Only the learner can."*
- **The ceiling is not ours to hit.** 1000 tools registered with flat latency and no
  rejection, so `min(L, |A|)` resolves to `|A|` and the surface is bounded by the
  product, not the browser.
- **One reported verdict was wrong.** `platform.ts` called phase-dependent descriptions
  `unsupported`; aborting a registration signal turns out to withdraw the tool and free
  its name, so a tool *can* revise what it says about itself.
- **Probes stranded five tools per run**, with no `unregisterTool` to undo it.

### Scorer corrections to my evidence

Two claims of mine were overstated, neither changing a check result:

- I reported all six descriptions lacked a non-applicability clause; three had one.
- I reported every number field bounded; `expectedRevision` has `minimum: 0` and no
  maximum.

The scorer also noted that if C5.6 means *zero-click* DOM presence rather than mere
presence, C5 drops to 10 and the total to 30. I have adopted the stricter reading.

---

## Round 1 — score 32 → 76 (of an adjusted maximum of 98)

**Scorer:** independent subagent, fresh context, criteria with score log stripped.
**Gate W1:** PASS (259 tests, up from 248; typecheck clean).
**BLOCKED:** C3.9 and C4.3, each removing 2 points of maximum.

| Criterion | Before | After | |
|---|---|---|---|
| C1 surface size | 6/20 | 16/20 | |
| C2 execution | 8/20 | 8/20 | no movement |
| C3 concurrency and lifecycle | 0/20 | 18/18 | full, adjusted |
| C4 agent legibility | 6/20 | 14/18 | |
| C5 platform coverage | 12/20 | 20/20 | full |

### Changes

- **Tool surface 6 → 18**, one per capability in `capabilities.md`. The five write
  actions the reducer always supported (`ADD_STEP`, `EDIT_STEP`, `REMOVE_STEP`,
  `RESOLVE_PROPOSAL`, `RESET`) were exposed, and `LEARNER_ONLY` — which refused them
  from any non-learner source — is now empty. Four CAS reads, a change feed, a family
  list and `get_platform` were added. → C1, C2, C3
- **Console grouped.** Six group rows with counts fit the first viewport where 18 tool
  rows do not; names appear on opening a group. Supersedes UI gate G3. → C1.8–C1.10
- **Ceiling probed:** 1000 tools, flat latency, no rejection, so `|A|` binds. → C1.1
- **Probes stopped stranding tools.** Every probe registers through a scope holding an
  `AbortController`, aborted in a `finally`. Was 5 stranded per run with no
  `unregisterTool`; now 18 before, 18 after. → C5.8
- **A wrong platform verdict corrected.** The lifecycle row said `unsupported` because
  re-registration throws; aborting the registration signal in fact withdraws the tool
  and frees the name, so a tool *can* revise its own description. → C5.1
- **A tool call could apply and never return.** The paint barrier had no deadline; with
  the tab occluded, `add_step` wrote the step and advanced the revision while its
  promise stayed pending forever. `wait()` now resolves `painted` or `unconfirmed`. → C3
- **The receipt now records authorship.** Found by the blind-agent test: after it wrote
  all four lines, every provenance column read zero, so an agent-written round looked
  unaided while `get_scratchpad` claimed "get_receipt reports the split". → thesis

### The blind-agent test

An agent given only `getTools()` output completed the journey: it verified its own
derivative against the page CAS *before* writing, wrote four lines, hit an `uncertain`
verdict, made one wrong turn (`\frac{dy}{dx}\bigg|_{x=2} = 516`, which did not parse),
recovered by validating candidates first, reached `allSound: true, reachesAnswer: true`,
and reasoned unprompted that `new_problem` preserves history where `reset_session`
destroys it. Blindness was enforced by instruction, not by sandbox — disclosed.

### What the scorer caught in my evidence

Four of nine spot-checked claims were wrong or overstated. Recording them because the
same overstatement in the next round would be harder to catch:

1. **A real bug.** `differentiate_expression` with `variable: 12` returned `ok:true`.
   The schema says `type: 'string'`; the handler did `typeof … === 'string' ? … :
   default`, silently ignoring a wrong type — the exact failure the product refuses
   elsewhere. My `noField: 0` counter could not see it because it only iterated
   refusals.
2. **C2.2 overstated.** I wrote that every tool "executed with a valid call"; 7 of 19
   valid calls in fact returned `ok:false` on phase constraints (a 12-step limit,
   `get_receipt` before any round ended). The `rejected: 0` counter measures transport
   rejection, not envelope success, and my narrative read as though it measured both.
3. **C1.2 citation wrong.** `types.ts:98-106` is inside `SessionState`; the action union
   starts at line 111. Reads A10–A18 carried no citations at all.
4. **C4.5 overstated.** `revisionField` still has `minimum: 0` and no maximum, across 11
   tools.

Also noted: C1.8 was measured at 1442×906, not the 1440×900 the rubric names — a
marginally easier viewport. Not scored against, but corrected next round.

---

## Round 2 — score 76 → 94 (of an adjusted maximum of 98)

**Gate W1:** PASS (261 tests). **BLOCKED:** C3.9.

| Criterion | Before | After |
|---|---|---|
| C1 | 16/20 | 16/20 |
| C2 | 8/20 | **20/20** |
| C3 | 18/18 | 18/18 |
| C4 | 14/18 | **20/20** |
| C5 | 20/20 | 20/20 |

### Changes

- **A real bug, found by the scorer rather than by me.**
  `differentiate_expression({latex:'x', variable: 12})` returned `ok:true`: the schema
  declares `variable` a string, and the handler treated a wrong-typed value as absent.
  My own counter could not see it, because it only iterated refusals and this call was
  never refused. `optionalVariable()` now returns a refusal naming `variable`.
- **C2 8 → 20.** The measurement was at fault, not the product: my "valid" calls ran in
  phases that refuse them, and one hard-coded a previous problem's answer while
  `reset_session` regenerates the problem. The procedure now drives each tool into a
  phase where it applies and computes the answer from the session's own givens.
- `expectedRevision` gained a maximum; a test asserts every number field carries both
  bounds. All 27 citations in `capabilities.md` rewritten. C1.8 re-measured at exactly
  1440×900.
- The blind-agent test re-run **without the `__NEEDS__` crutch**, so the agent supplies
  every argument itself. It met a real refusal, corrected it, and C4.3 stopped being
  vacuous.

### What the scorer caught

Five citations were still wrong *after the pack claimed every one had been verified*,
and C1.9 was measured at 1282×800 rather than 1280×800 — the same defect the pack had
just corrected for C1.8 and failed to apply next door.

---

## Round 3 — score 94 → 100/100. Target reached.

**Gate W1:** PASS (307 tests, up from 261; typecheck clean). **Nothing BLOCKED.**

| Criterion | Before | After |
|---|---|---|
| C1 | 16/20 | **20/20** |
| C2 | 20/20 | 20/20 |
| C3 | 18/18 adj | **20/20** |
| C4 | 20/20 | 20/20 |
| C5 | 20/20 | 20/20 |

### Changes

- **Citations are checked, not claimed.** Round 2's pack asserted that every file:line
  had been verified; five were wrong. Asserting a verification that was never performed
  is a worse failure than the original error, and it is precisely what the platform
  probes exist to refuse. `citations.test.ts` now opens every cited file and asserts the
  cited line contains what the doc claims, checks both endpoints of every range, and
  fails if the docs cite anything the suite does not cover. It caught six stale
  citations on its first run. → C1.2
- **C1.9 re-measured at exactly 1280×800.** → C1.9
- **C3.9 produced for real, at the third attempt.** Round 1 never backgrounded the tab;
  round 2 overrode the page's own `visibilityState`, which reproduces the *report* and
  not the state, and was correctly BLOCKED again. The override is deleted. The tab now
  reports `hidden` unforced for 62 seconds. → C3.9
- Every argument refusal names its field, including five that described it only in
  prose. The `readOnlyHint` audit reports a failed call as `untested` instead of
  counting it as a match — round 2 had `annotate_step` passing trivially because its
  call had failed.

### What the scorer caught, and what was done about it

Four overstatements, none changing an outcome, all corrected after scoring:

1. "`reset_session` twice" — it is `edit_step` twice, to satisfy the proposal gate.
2. "extracts every `file.ts:NN`" — it extracted only range starts and compared by
   basename. Both fixed; ranges now check both endpoints and paths are compared as
   written.
3. `types.ts:111-121` — the union spans 111–120; line 121 is blank.
4. "45 assertions" — 43 are citation assertions; the other two are structural.

The scorer also recorded what it could not verify without a browser: the viewport
measurements, the live lifecycle scenarios, the rendered-DOM checks, and the
blind-agent run, whose blindness is enforced by instruction rather than by sandbox.
That limitation is real and is disclosed in every round.
