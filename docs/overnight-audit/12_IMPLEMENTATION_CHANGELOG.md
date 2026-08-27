# 12 — Implementation Changelog

What was actually built on the night of 2026-08-26, and why. Ordered by commit.

---

## `6f17b25` — audit

Established by execution rather than assertion. See `01`, `05`, `07`, `08`.

The three findings that decided everything else:

1. The answer check was `attempt === '40' | '36' | '8'`. **`40.0` — the correct answer —
   was rejected.** There was no parser, verifier, diagnosis engine or generator anywhere
   in the repository, despite prior documents describing all four.
2. Independent research found that **cream + serif display + sage green is the top
   AI-slop signal of 2026**, ranked above AI purple. That was exactly our palette. The
   build scored **19/40** on a mechanical anti-slop checklist.
3. `@cortex-js/compute-engine` measured at **0.33 ms per equivalence check**, with working
   symbolic differentiation and a tri-state `isEqual`. A real verifier was buildable in
   one night, so the fatal defect was worth fixing properly rather than patching.

---

## `f8fb147` — the mathematics

Four modules, 70 tests.

**`expression.ts`** — parsing plus an input contract. The engine is permissive by
design: it reads `""` as `Nothing`, accepts `x^^2` as `Power(x,2)`, and evaluates `1/0`
to `ComplexInfinity`. Each guard closes a false-acceptance route that was observed in
testing, not a hypothetical one.

**`equivalence.ts`** — two routes, deliberately asymmetric. Building it disproved the
symmetric design the audit had proposed:

> `isEqual('9x^2+2x', '9x^2')` returns `undefined`, not `false`. The engine cannot
> disprove symbolic inequality — and that is precisely the misconception we most need to
> catch. Requiring both routes to agree before reporting a mismatch would throw away
> sound counterexamples.

So a verified numeric counterexample establishes `mismatch` on its own, because one point
where both sides are finite and differ **is** a disproof. Equality still requires both
routes, and is described as "consistent with equivalence", never as proof. Everything
else returns `uncertain`.

The independent numeric route is not decoration: it caught the engine claiming
`\sqrt{x^2} = x`, which is false for every negative x.

**`problems.ts`** — generation. Every number a learner sees is computed by the engine from
the instance's own coefficients; nothing is written down in advance.

It also revealed a requirement nobody had anticipated. For `y = 2x^3 + x^2` at `x = 1`,
**three distinct mistakes all produce 6.** Naming one would be inventing a diagnosis the
mathematics does not support, so the generator rejects any instance whose error modes are
not pairwise distinct, and the diagnoser independently returns `ambiguous` rather than
guessing. Verified over 250 seeds.

**`diagnosis.ts`** — misconceptions expressed as *derivations*, not literals. The same
five named mistakes correctly diagnose problems the code has never seen. Verified over 60
generated instances.

---

## `cfe9d33` — the session and the tools

**The finding that mattered most.** A live-verification pass in Chrome 151 showed the
previous WebMCP layer **could not execute at all**:

> Chrome calls `execute` with exactly one argument. There is no `{ signal }`. Every
> handler opened with `context.signal?.aborted`, which threw a `TypeError` on every
> call — while the page header continued to display "5 agent tools live."

Had this shipped, a judge who enabled WebMCP would have found every tool broken beneath a
badge claiming they worked. The rewrite fixes this and three related defects: registration
used `Promise.all` with a `.catch` that unregistered the survivors; a `pagehide` teardown
destroyed registrations Chrome would otherwise have preserved across bfcache; and
`getState()` threw when unmounted, which the browser flattens into a blank `UnknownError`
because thrown errors lose their message while returned envelopes survive verbatim.

**`session/reducer.ts`** — one transition function for learner, agent and inspector.
Policy is returned as a visible refusal, not hidden in a branch: the agent may not write,
edit or accept, and may not propose a replacement until the learner has genuinely
attempted that step. During the unaided round both annotation and proposal are closed,
because the receipt's "unaided" claim has to be true.

Also fixed a defect inherited from the old build: `RESET` left the previous session's
activity log in place under the same session id.

**`tools/definitions.ts`** — six tools, browser-free so the whole surface is testable. 27
of the tests are hostile-input tests asserting that no handler throws and none returns
`undefined` — the class of bug that broke the previous layer.

141 tests green.

---

## `15fe3df` — the interface

Built on the frozen tokens extracted from measurements of both design references.
Archivo, KaTeX-typeset mathematics, hairline separation. The four deletions that carry
most of the improvement: **no serif, no `box-shadow`, no green buttons, no rust type.**

Two decisions worth recording:

**The interface points at one line.** The first broken step is marked; every later line
is dimmed as *downstream*, not marked wrong. Telling a learner that lines 3, 4 and 5 are
all wrong when line 3 is the only real error teaches them that they are bad at
mathematics.

**The page says what is missing, not merely that something is.** The first implementation
reported the counterexample point — "they differ at x = 2.580159" — which proves the
mistake without teaching it. It now computes the residue against both readings and
reports the shorter: *"Short of the line above by 8x."* That is the actual teaching
moment, and it is derived, not authored.

**The Agent Console** is a permanent surface in every browser. The previous build's entire
answer to a judge without WebMCP was a 10 px grey line in the corner saying agent tools
were unavailable — so the one thing this submission is about was invisible by default and
announced only as an absence. The console lists the six real tools and lets anyone run
them through the identical handler an agent calls, logged as `local-inspector` and
labelled as not an agent. Nothing is simulated.

---

## `f200ce8` — the landing page, and what was removed

The landing page now leads with the WebMCP claim and shows **real product output above
the fold** rather than an abstract hero.

Removed:

- `LearningStudio`, `PathwayBridge`, `MathosVideoPanel`, the old `webmcp.ts`, and the
  ten-stage rail that advertised nine screens which did not exist.
- The tiny transformer, to `experiments/tiny-transformer/`, and `@tensorflow/tfjs` from
  the bundle. It is real and it works; it scores nothing on WebMCP Leverage, which is both
  the first criterion and the tiebreak, and it would have put off-thesis tools in the
  panel a judge screenshots first.
- **The plain-HTTP bare-IP proxy** (`http://18.216.62.146:8001`) that both `vercel.json`
  and `astro.config.mjs` carried into what was intended to be a public repository.

---

## Post-commit fixes

- **`pnpm dev` works again.** The README's own "run locally" command served a blank page
  (`_jsxDEV is not a function`); the fault died with the component that caused it.
  Verified: the scratchpad renders in dev with all six tools registered.
- **Hydration mismatch fixed.** Generating the session from `Date.now()` inside
  `useState` produced a different problem on the server and the client, and React
  discarded and regenerated the tree. The first problem is now deterministic — which also
  means every judge opening the link sees the same first problem, so the README's
  instructions stay true — and the real session is adopted in an effect after hydration.

---

## Still open

Tracked in `11_IMPLEMENTATION_ATTACK_PLAN.md`.
