# 08 — Backend, Domain and Mathematics Audit

Empirical. Every claim below was produced by running code, not by reading it.

---

## Part 1 — The current mathematics

There is no mathematics in the current build. See `01_CURRENT_STATE_MAP.md` §3.

The complete answer-checking system is three string comparisons in
`LearningStudio.tsx:70-92`: `attempt === '40'`, `attempt === '36'`, `attempt === '8'`.

**Verified in the running production build:** `40.0` — the correct answer — is rejected.

The prior architecture documents describe a parser, an AST, symbolic and numeric
verification routes, dual numbers, finite differences, a diagnosis engine and a transfer
generator. **None of those subsystems exist in this repository.** Any audit that treats
them as present is auditing a document, not the software.

---

## Part 2 — The domain architecture that *does* exist

Small, and better than its reputation. Honest assessment:

### Genuinely correct, keep it

| Property | Where | Verdict |
| --- | --- | --- |
| Single transition function for humans and agents | `LearningStudio.tsx:66` `transitionStudio()` | Correct. No divergent code paths. This is the right idea and it is rare to get right. |
| Monotonic revision counter | `successfulAction()` | Correct. |
| Optimistic concurrency via `expectedRevision` | `webmcp.ts:mutationExecutor` | Correct. Rejects stale writes with a distinct `stale_revision` code. |
| Idempotency cache keyed by `requestId` | `webmcp.ts:157-172` | Correct, and unusually careful — it caches the *in-flight promise*, so a duplicated call awaits the original rather than racing it. Failures are evicted so a retry can succeed. |
| Abort checks | every handler | Present at handler entry. |
| Structured error envelope with `recovery` | `ToolError` | Good design. Tells the model what to do next, not just what went wrong. |
| Append-only activity log | `state.activities` | Correct, and it is the visible proof surface. |
| Commit barrier (`afterCommit`) | `LearningStudio.tsx:355` | The tool does not return until React has actually rendered the new revision. This closes the "agent says done before the human sees it" gap. Genuinely thoughtful. |

### Actually wrong

1. **State lives in React, not in a domain module.** `transitionStudio` is defined inside
   the component file and the authoritative state is a `useRef` mirrored into `useState`.
   The `webmcp.ts` page bridge holds a *third* copy in `lastState`, refreshed on read.
   Three places, one truth, synchronised by convention. It works today because the state
   is tiny. It will not survive the redesign.
2. **`lastState` can serve a stale snapshot.** `pageBridge.getState()` returns the cached
   `lastState` when `delegates` is undefined — i.e. after unmount, tools keep answering
   with the last known state instead of failing. `get_learning_workspace` will happily
   report a workspace that is no longer mounted.
3. **The `RESET` action is unreachable from WebMCP** but reachable from the UI, and it
   rewinds `stage` without clearing `activities` or resetting `revision`. After a reset
   the activity log still shows the previous session's actions under the same session id.
4. **No persistence at all.** A reload destroys the session silently. For a judge who
   refreshes mid-demo this is a dead end with no recovery message.
5. **`START_TRANSFER` has a source-dependent validation branch**
   (`(source === 'agent' || state.stage === 'lesson')`). Humans and agents are validated
   differently on exactly one path — a small but real violation of the "one shared
   transition" principle the architecture otherwise upholds.
6. **Zero tests.** No runner, no `test` script, no assertions anywhere.

---

## Part 3 — Feasibility of a real verifier (measured)

The decisive question for the redesign: can we replace string comparison with honest
mathematics tonight? **Yes.** Measured against
`@cortex-js/compute-engine@0.119.0` (latest, installed and executed locally).

### 3.1 Numeric surface forms — solves the fatal bug

Comparing each form against `40`:

| Input | `isEqual` | Verdict |
| --- | --- | --- |
| `40` | true | correct |
| `40.0` | true | **fixes the shipped bug** |
| `+40` | true | correct |
| `4\cdot 10` | true | correct |
| `36+4` | true | correct |
| `\frac{80}{2}` | true | correct |
| `  40  ` | true | correct |
| `40.00001` | **false** | correctly rejected |
| `4x` | **undefined** | correctly *undecided* |

### 3.2 Symbolic differentiation works — problems can be generated, not hardcoded

```
ce.box(['D', ce.parse('3x^3 + x^2'), 'x']).evaluate()   →  "9x^2 + 2x"
   .subs({x: ce.box(2)}).N().re                          →  40
```

This means the answer to a generated problem can be **computed by the engine** rather
than written into the source by hand. `start_transfer_problem` can produce a genuinely
fresh problem with a genuinely derived answer. That retires finding CS-5.

Two API traps found and recorded:
- `['Derivative', f, 'x']` returns `(x) => 0`. **Use `['D', f, 'x']`.**
- `ce.assign('x', 2)` throws `Invalid definition for symbol "x"`.
  **Use `expr.subs({ x: ce.box(2) })`.**

### 3.3 Algebraic equivalence

| Pair | Result | Correct? |
| --- | --- | --- |
| `2x+3` vs `3+2x` | true | yes |
| `(x+1)^2` vs `x^2+2x+1` | true | yes |
| `2x` vs `x+x` | true | yes |
| `9x^2+2x` vs `9x^2+3x` | false | yes |
| `9x^2+2x` vs `9x^2` | false | yes — **this is the misconception detector** |
| `\sin^2 x + \cos^2 x` vs `1` | true | yes |

### 3.4 Where the engine is NOT proof — and must not be described as proof

Three cases return `true` while the symbolic difference does **not** reduce to zero:

| Pair | `isEqual` | Simplified difference | Truth |
| --- | --- | --- | --- |
| `\sqrt{x^2}` vs `x` | true | `-x + sqrt(x^2)` | **False for x < 0** |
| `e^{\ln x}` vs `x` | true | `-x + e^(ln x)` | Only for x > 0 |
| `\frac{x^2-1}{x-1}` vs `x+1` | true | not 0 | Undefined at x = 1 |

The engine is doing numeric sampling, not a proof. On a bounded AP-calculus domain the
behaviour is usually *what you want*, but the product must never call it proof.

**Ruling for the redesign:** the verifier uses **two independent routes** —
(a) compute-engine equivalence, (b) an independent high-precision numeric sampler over
randomised points written by us and sharing no code with the engine. Rules:

- both agree *equal* → `match`
- both agree *unequal* → `mismatch`
- **any disagreement, any non-finite value, any sampling failure → `uncertain`**

`uncertain` is a first-class, visible outcome. It never silently becomes `match`. This is
the "fail closed into uncertainty" requirement, and it is implementable because the
engine already exposes a tri-state `isEqual`.

> **Superseded by §5.1.** Building the prototype disproved the symmetric rule above.
> Requiring *both* routes to agree before reporting `mismatch` throws away sound
> counterexamples, because the engine returns `undefined` rather than `false` for
> symbolic inequality — which is precisely the misconception case we most need to
> catch. The shipped rule is asymmetric: numeric counterexamples alone establish
> `mismatch`; equality still requires both routes. See §5.1.

### 3.5 Parser false acceptance — explicit guards required

| Input | Parses as | Risk |
| --- | --- | --- |
| `""` | `"Nothing"`, **valid** | must reject empty |
| `x^^2` | `Power(x,2)`, **valid** | silent typo acceptance |
| `1/0` | `ComplexInfinity`, valid | non-finite |
| `x/(x-x)` | evaluates to `Infinity` | non-finite |
| `\infty` | `PositiveInfinity`, valid | must reject |
| `"xxx…"` (300 chars) | `Multiply(x,x,…)` | unbounded AST |
| `((((` | **invalid** | correctly caught |
| `\foo{3}` | **invalid** | correctly caught |
| `2^(2^(2^(2^10)))` | **invalid** | correctly caught |

Required input contract before anything reaches the engine:
1. length ≤ 256 characters
2. reject `Nothing` / empty
3. reject any symbol outside the problem's declared variable set
4. reject non-finite evaluation results
5. bound AST node count and depth
6. reject any expression containing an `Error` node

### 3.6 Performance

**0.33 ms per equivalence check** (1000 checks in 330 ms). Interactive latency is a
non-issue. A tool call can run several routes and still return in single-digit
milliseconds.

---

## Part 4 — Consequences for the redesign

1. The fatal credibility defect (CS-3) is fixable with a real engine, not a patch.
2. Problems can be **generated** with engine-derived answers, retiring the "it's all
   hardcoded" attack (CS-5, CS-6).
3. Misconceptions can be detected **structurally** — `9x^2` vs `9x^2+2x` is recognisable
   as "omitted a term", not as "the literal 36" — retiring CS-4.
4. The learner can enter **real mathematics** instead of a bare integer, which is what a
   company that ships a math editor must do.
5. Honest epistemics become implementable rather than rhetorical: `uncertain` is a real
   state the system can enter and display.
6. **The page now owns something a backend cannot fake:** a live CAS holding the
   learner's actual expression tree. That is the strongest available answer to
   "why isn't this just a backend MCP server?" (CS-9).

Items 1–6 are the technical foundation of the frozen redesign.

---

## Part 5 — Prototyped and proven: generated problems + structural diagnosis

Two prototypes were built and executed tonight (`ce-verifier-proto.mjs`,
`ce-diagnosis-proto.mjs`). Both work. Their designs are the basis of the frozen spec.

### 5.1 The verifier oracle is deliberately asymmetric

Measured behaviour forced a redesign. `isEqual` **cannot disprove** symbolic
inequality — `9x^2+2x` vs `9x^2` returns `undefined`, not `false`. But a single
numeric counterexample **is** a sound disproof. So the two routes are not weighted
equally:

| Condition | Result | Justification |
| --- | --- | --- |
| Numeric route finds a point where both sides are finite and differ | `mismatch` | **Sound.** One counterexample disproves equality. Does not need the engine to agree, and usually cannot get it. |
| Engine simplifies the difference to 0 **and** numeric sampling agrees | `match` | Evidence, not proof. Described as "consistent with equivalence". |
| Anything else — engine claims equality while a counterexample exists, insufficient samples, engine unknown with only numeric agreement | `uncertain` | Fails closed. Never silently becomes `match`. |

Adversarial suite result: **26 / 27**, and the one deviation is the suite's stale
expectation — `\sqrt{x^2}` vs `x` is correctly reported as a `mismatch`, because they
genuinely differ for x < 0. The engine alone had claimed they were equal.

Note what that case demonstrates: **the independent numeric route caught the symbolic
engine being wrong.** That is the entire justification for running two routes.

### 5.2 Problems are generated; answers are computed

A problem family is a parameterised derivation, not a literal. For
`y = a(x)·b(x) + a(x)`:

```
y = 3x^3 + x^2   at x = 2   ->  correct 40
y = 10x^3 + 2x^2 at x = 3   ->  correct 282
y = 4x^4 + x^3   at x = 2   ->  correct 140
```

Every value above was produced by `D(...)` and `.subs(...)`. None is written in the
source. This retires "the answers are hardcoded" (CS-5, CS-6).

### 5.3 Misconceptions are derivations, not literals

Each error mode is defined as *a different way of doing the calculus*, so the engine
computes what that mistake would produce **for the current coefficients**:

| Mode | Derivation | On `3x^3+x^2` @2 | On `10x^3+2x^2` @3 |
| --- | --- | --- | --- |
| `correct` | `D(y)` | 40 | 282 |
| `omits_direct_path` | `D(a·b)` | 36 | 270 |
| `omits_product_path` | `D(a)` | 4 | 12 |
| `no_product_rule` | `a′b′ + a′` | 16 | 72 |
| `partial_product_rule` | `a′b + a′` | 28 | 192 |

Verified: the same five modes correctly diagnose 270, 12, 72 and 192 on a problem the
code has never seen. The diagnosis **survives generation**. It also works on symbolic
answers — a learner who writes `9x^2` is diagnosed as `omits_direct_path` without
evaluating anything.

This replaces `attempt === '36'` with something that is genuinely a diagnosis engine,
and it retires CS-4.

### 5.4 A non-obvious requirement the prototype exposed: collision checking

For `y = 2x^3 + x^2` at `x = 1`, three distinct error modes all produce **6**:

```
y = 2x^3 + x^2  at x=1  ->  COLLIDE: 6 = {omits_direct_path, no_product_rule, partial_product_rule}
```

A system that named one of them would be inventing a diagnosis it cannot support.

**Two rules follow, and both are mandatory in the frozen spec:**

1. The generator must **reject any candidate problem whose error modes are not pairwise
   distinct** at the evaluation point, and resample.
2. The diagnoser must still return **`ambiguous`** — never a guess — if more than one
   mode matches, because a learner can reach a colliding value by other routes.

This is the same fail-closed discipline as the verifier, applied to pedagogy: the
product may only name a misconception when the mathematics entitles it to.

### 5.5 Performance

0.33 ms per equivalence check; a full five-mode diagnosis is a handful of those. Every
tool call can run the complete honest pipeline and still return in single-digit
milliseconds.
