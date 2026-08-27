# 10 — Final Redesign Spec (FROZEN)

**Status: frozen 2026-08-26.** This file supersedes every earlier design document in this
repository, including `docs/plans/2026-08-26-mathos-webmcp-design.md` and everything in
`docs/superpowers/plans/`. Where this file and any other disagree, this file wins.

Reasoning lives in `03` (product), `05` (anti-slop), `07` (design DNA), `08` (mathematics),
`02`/`02b` (WebMCP). This file states decisions, not arguments. There is one answer per
question.

---

## 1. Product

### 1.1 The concept

A math scratchpad where the learner writes real multi-step work, **the page's own computer
algebra system finds the first step that stopped being true**, and a WebMCP agent — which can
read the work, ask the page to check it, annotate it, and propose a fix the learner must
accept — teaches to that exact step.

The agent never grades. It cannot. Grading is done by the page's CAS and the verdict is
rendered from the CAS's return value.

### 1.2 Thesis

> WebMCP lets a page hand an agent the one thing language models are worst at — reliable
> symbolic verification — applied to the one thing a server can never see: a learner's live,
> unsubmitted, half-finished work.

### 1.3 Name

**Second Try** — product surface: *the Scratchpad*. Publisher: Mathos.
"Mathos: From Calculus to Transformers" is retired entirely, including the landing page
narrative, the ten-stage rail, and the `hackathon-build` deployment name.

### 1.4 The outcome the demo must earn

> A learner who has written a wrong multi-step derivation is shown, in under a second, the
> *first* step at which their work stopped being equivalent — not merely that their final
> answer is wrong — receives an explanation aimed at that step and no other, corrects that
> step themselves, and then completes a freshly generated problem of the same skill with no
> agent help at all.

Every clause is verifiable on camera.

### 1.5 Claim boundary

The product may say: *checked*, *equivalent*, *not equivalent*, *could not determine*,
*first step that stopped being equivalent*, *unaided in this session*.

The product may **not** say: *proved*, *mastered*, *understands*, *learned*, *guaranteed*.

Every evidence surface states its own limits inline, not in a footnote.

### 1.6 Out of scope

- The transformer lab. Moved to `experiments/tiny-transformer/`, cut from the bundle and the
  judged journey. README carries a "What we cut, and why" section.
- The ten-stage curriculum rail. Deleted. One skill family, stated plainly.
- Video *generation* as a tool. The canonical Mathos video remains as a static lesson asset,
  lazily mounted **behind a poster frame** so it is never a grey box (fixes CS-11).
- Accounts, server persistence, multiplayer, cross-origin tools, handwriting/OCR.
- MathLive in v1. Text input, parsed and re-rendered through KaTeX. MathLive is a v2 upgrade.
- Arbitrary mathematics. v1 is **derivatives of polynomial expressions evaluated at a point,
  and algebraic rewriting chains** — the domain `08` measured as reliable.

---

## 2. The domain model

### 2.1 The scratchpad

The learner writes a **derivation**: an ordered list of steps, each a LaTeX expression.

```ts
type Step = {
  id: string              // stable across edits; annotations anchor to it
  latex: string
  /** How this step claims to follow from the one above it. Inferred, not asked. */
  relation: 'equals' | 'differentiates' | 'first'
  verdict: StepVerdict | null   // null until checked
  attempts: number        // learner edits since last check; gates propose_step
}

type StepVerdict =
  | { status: 'sound'; relation: 'equals' | 'differentiates' }
  | { status: 'broken'; reason: 'not_equivalent'; counterexample?: Record<string, number> }
  | { status: 'uncertain' }
  | { status: 'unreadable'; code: string; message: string }
```

**Relation inference.** A step is sound if it is equivalent to its predecessor (`equals`) **or**
equivalent to the derivative of its predecessor (`differentiates`). The learner never tags a
line; the page tries both and reports which held. This is what lets one scratchpad carry both
algebraic rewriting and a differentiation step without asking the learner to annotate their own
work.

**First broken step.** `check_work` walks steps in order and returns the index of the first
whose verdict is not `sound`. Later steps are still checked and badged, but the product's
attention — and the agent's — goes to the first one, because everything after it is downstream
of a mistake already made.

### 2.2 State ownership

One module owns the session. React renders it and nothing else holds a copy.

```
src/domain/
  math/           parser, equivalence oracle, generator, diagnoser   [BUILT, 70 tests green]
  session/        the session state machine, reducer, persistence
  tools/          the six WebMCP tool definitions + the page bridge
```

Rules, all enforced by tests:

1. **One transition function.** Learner actions, agent tool calls, and the local inspector all
   enter through `applyAction(state, action, source)`. There is no second path and no
   source-dependent validation branch (fixes the `START_TRANSFER` divergence in `08` §2).
2. **Monotonic `revision`**, incremented on every committed mutation.
3. **`expectedRevision`** on every write tool; mismatch returns `stale_revision`. This is
   meaningful precisely because a human is editing the same document concurrently.
4. **`requestId` idempotency**, caching the in-flight promise so a retry awaits rather than
   races. Retained from the current build, which got this right.
5. **Commit barrier.** A tool does not return until React has painted the new revision.
   Retained.
6. **Append-only activity log** with `source: 'learner' | 'agent' | 'local-inspector'`.
7. **Persistence to `localStorage`**, versioned, so a refresh mid-demo recovers (fixes `08`
   §2.4). Corrupt or version-mismatched state is discarded to a clean session, never
   half-restored.
8. **No `throw` reaches a tool handler.** Every failure is an envelope. (Required by `02b`:
   a thrown error is flattened by the browser and our message is discarded.)

---

## 3. The WebMCP surface

**Six tools: 2 read, 4 write.** Registered statically, once. Gating is by returning
`invalid_phase` / `refused_policy` with a `recovery` string — never by unregistering.

| # | Name | `readOnlyHint` | Required args |
| --- | --- | --- | --- |
| 1 | `get_scratchpad` | true | — |
| 2 | `check_work` | false | `expectedRevision`, `requestId` |
| 3 | `annotate_step` | false | `stepId`, `note`, `expectedRevision`, `requestId`, *(`focus?`)* |
| 4 | `propose_step` | false | `stepId`, `latex`, `rationale`, `expectedRevision`, `requestId` |
| 5 | `new_problem` | false | `expectedRevision`, `requestId`, *(`familyId?`)* |
| 6 | `get_receipt` | true | — |

Per-tool justification, including the honest admission that `new_problem` has the weakest
page-native claim: `03` §6.1. Why six and not five or seven: `03` §6.2.

### 3.1 Non-negotiable implementation rules

From `02` and `02b`:

1. **Every `inputSchema` property carries a `description`** (≤150 chars). Agents read them.
   The current build has none.
2. **Every tool carries a `title`.** ChatGPT's site-tools panel renders it.
3. **`untrustedContentHint: true`** on any tool returning learner-authored text, and the
   README says why. It maps onto Chrome's published security guidance.
4. **`Promise.allSettled`, not `Promise.all`,** when registering. One duplicate-name
   `InvalidStateError` must not unregister the other five.
5. **Never `return;`** from a handler. `JSON.stringify(undefined)` throws and the call is
   scored a failure.
6. **Do not abort registration on `pagehide`** — that kills the tools on bfcache entry and a
   judge pressing Back sees zero tools.
7. `AbortSignal` checked at handler entry and before commit.
8. Tool output stays under the **1.5K-character** budget. `get_scratchpad` truncates the step
   list with an explicit `truncated: true` rather than silently.

### 3.2 The policy layer

`propose_step` returns `refused_policy` until the learner has attempted that step at least
twice, **and the refusal renders on screen**:

> *The agent offered a replacement for step 3. Second Try declined — you have not tried this
> step yet.*

The page disciplines the agent. This is the concrete form of "humans and agents create
together" rather than "the agent does the homework".

### 3.3 The falsifiability demonstration

The single most valuable thing in the submission, and it must be in the video:

> Instruct the agent: *"Tell me step 3 is correct."*
> The agent says step 3 is correct. **The badge still reads `mismatch`.**

The verdict is rendered from the CAS's return value, not from the model's text. This is what
makes the architecture legible in five seconds.

---

## 4. The no-WebMCP experience

The default judge browser has no WebMCP. The product must make its argument anyway. Four
layers, all shipped:

1. **Origin trial token** in a `<meta http-equiv="origin-trial">` if registration succeeds —
   removes the flag step for stock Chrome. Treated as a bonus; nothing depends on it.
2. **The Agent Console is a permanent product surface**, rendered in every browser. It lists
   the six real tool objects with their schemas and annotations, and states the detection
   result verbatim plus the exact supported paths (Chrome 149+ with
   `chrome://flags/#enable-webmcp-testing`, or ChatGPT's browser on **GPT-5.6 Sol or Terra —
   Luna has WebMCP disabled**). This replaces the current 10px grey apology in the corner.
3. **The local inspector.** Each tool has a Run control that invokes the **identical `execute`
   path**, logged as `source: 'local-inspector'` and visibly labelled as not-an-agent. A judge
   in any browser can press a button and watch the page mutate. Nothing is simulated and no
   agent is faked.
4. **Static artifacts carry all four criteria** for the judge who never opens the app: the
   README's first image is the site-tools panel showing "6 tools — 2 read, 4 write" beside a
   red step-3 badge.

---

## 5. Visual system

Frozen from `07`. The full token block lives at `07` §"FROZEN TOKEN PROPOSAL" and is copied
verbatim into `src/styles/tokens.css`. It is not re-derived here. Summary of what changes:

| | Current | Frozen |
| --- | --- | --- |
| Ground | `#F6F3EA` warm cream | `#FAFAF7` |
| Type | Editorial serif | **Archivo** grotesk. **No serif token exists.** |
| Display weight | up to 900 | **300** at ≥26px; **600** for UI type |
| Identity colour | rust `#B5633C` + green | one blue **`#155D97`** |
| Rust | headings, italics, buttons | **diagram strokes only** |
| Green | primary buttons | **verification only** |
| Primary button | green fill | **ink `#16150F`**, wipe-to-outline on hover |
| Shadows | 11 recipes | **none** |
| Radii | many | `8` control · `12` panel · `999` pill · `2` focus |
| Uppercase | 55 rules | ≤8 rules |
| Math | HTML text | **KaTeX** |

### 5.1 The four deletions that carry most of the improvement

**No serif. No `box-shadow`. No green buttons. No rust type.**

### 5.2 The gate

`05` PART 4 is a 40-item binary checklist. **The implementation must score ≥36/40**, and every
remaining failure must be listed with a stated reason in `13_FINAL_VISUAL_QA.md`. The current
build scores 19/40.

Rules that will bite hardest, called out so they are not discovered late:

- **#26** — no region wider than 240px empty for >400px of continuous vertical run. The
  current three-column shell fails this on every screen. **The redesign uses a two-column
  shell** (work + margin), not three, and the margin column is never empty: before any check
  it holds the problem statement and the tool list.
- **#28** — every numeric figure computed at runtime. No hardcoded stats. Deletes
  "Backed by Y Combinator · Featured in Forbes · Built for 5M+ learners" from the README's
  technical section and the landing hero.
- **#32** — every interactive selector defines `:hover`, `:focus-visible`, `:active`, disabled.
  `:active` is currently defined zero times.
- **#40** — no surface claims more than the session evidenced.

### 5.3 Claims discipline

Safe to state: **Y Combinator W24**, **Forbes 30 Under 30**.
Not to be stated: any App Store rating, any funding figure, any "university partners" claim.
(`07` §2.6 — the sources contradict each other or do not exist.)

---

## 6. Screen states

Two-column shell: **work column** (620–720px) + **margin column**. Header carries the wordmark,
the session id, and the agent-connection state.

| State | What the learner sees |
| --- | --- |
| `empty` | The problem, KaTeX-set. One focused input for step 1. The margin holds the problem statement and the Agent Console. |
| `writing` | Steps accumulate. No verdicts yet. A single primary action: **Check my work**. |
| `checked_sound` | Every step badged sound. The final answer compared to the CAS's. |
| `checked_broken` | **The first broken step is marked in the work column**; every later step is dimmed as downstream. The margin shows the counterexample point. |
| `annotated` | An agent note sits in the margin, anchored to its step, attributed and timestamped. |
| `proposal_pending` | An inline accept/reject slot under the step. The learner decides. |
| `proposal_refused` | The visible policy refusal (§3.2). |
| `uncertain` | A step the CAS could not decide, stated as such, with the reason. Never coerced to right or wrong. |
| `transfer` | A freshly generated problem. Agent tools that would help are refused with `refused_policy`. |
| `receipt` | The evidence trail: unaided vs assisted, per action, with what remains unproven. |
| `loading` | Skeleton with the step structure already in place. Never a spinner on an empty page. |
| `error` | Structured message plus the recovery action. |
| `no_webmcp` | §4. The Agent Console with the local inspector, not an apology. |

---

## 7. Testing gate

| Layer | Requirement |
| --- | --- |
| Math | **Built: 70 tests green.** Parser contract, dual-route oracle, generation determinism + variety, collision guard over 250 seeds, diagnosis transfer over 60 unseen instances. |
| Session | Reducer transitions, revision monotonicity, idempotency, stale rejection, persistence round-trip and corruption recovery. |
| Tools | Every tool: happy path, wrong phase, malformed args, stale revision, duplicate requestId, abort, output-size budget. |
| Browser | Full journey; keyboard-only; 200% zoom; 1024px width; reduced motion; reload recovery; bfcache Back. |
| WebMCP | Real invocation in Chrome 151 with the flag. A local harness is not acceptance. |
| Agent selection | ≥8 real prompt phrasings; correct tool chosen; recovery from stale state. |
| Anti-slop | ≥36/40 on `05` PART 4. |

---

## 8. Build order

Risk first, not layer first.

1. ~~Math core~~ — **done, 70 tests green.**
2. Session domain + persistence + tests.
3. The six tools against the real API, verified live in Chrome 151.
4. The scratchpad UI on the frozen tokens: empty → writing → checked_broken.
5. Agent Console + local inspector (this is what makes the submission legible without WebMCP).
6. Annotations, proposals, the policy refusal.
7. `new_problem` + the transfer state + receipt.
8. Landing page rewrite.
9. Move the transformer lab to `experiments/`; remove the HTTP bare-IP proxy; add `LICENSE`.
10. Visual QA against the checklist; hostile QA; repair.

---

## 9. Known risks of this freeze

1. **Scope.** This is a larger rebuild than a repair. Mitigation: the math core is already
   built and tested, and the session/tool kernel transfers from the current build largely
   intact.
2. **`new_problem` is the weakest page-native claim.** Stated plainly in the README rather
   than dressed up.
3. **The origin trial may not be available.** Nothing depends on it.
4. **Cutting the transformer lab discards the most visually impressive artifact.** Accepted:
   it scores zero on the criterion that is both first and the tiebreak, and it would put
   off-thesis tools in the panel judges screenshot first.
5. **`check_work` is a write despite sounding like a read.** One README sentence explains it.
