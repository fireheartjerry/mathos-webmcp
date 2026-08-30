# The capability set `A`

Satisfies check **C1.2**. Consumed by **C1.3** (coverage), **C1.5** (which constraint
binds) and **C1.6** (`|R| = min(L, |A|)`).

`L ≥ 1000` — see `ceiling.md`. The browser does not bind at any scale this product can
reach, so **`|A|` binds**, and the surface is correct only when every row below has
exactly one tool.

## The reducibility test used here

C1.4 subtracts padding. Two tools are **reducible to one** if and only if:

> one can be obtained from the other by fixing a single parameter value, **and** they
> share an input shape and a return shape.

This is why `resolve_proposal(accept: boolean)` is one capability rather than two
(`accept_proposal` / `reject_proposal` differ only by a fixed parameter and are
otherwise identical), and why `differentiate_expression(latex, variable)` and
`evaluate_expression(latex, at)` are two rather than one (different input shapes,
different return shapes, neither obtainable from the other by fixing a parameter).

Under the same test, a family like `set_line_1 … set_line_1000` collapses to a single
`edit_step(stepId, latex)`. Registering to the platform ceiling would raise the raw
count while lowering the score, which is the intended behaviour.

---

## Writes — every action the reducer accepts (9)

The reducer's action union is `src/domain/session/types.ts:121-129`. Every member is a
learner-reachable capability, so under the current thesis every member needs a tool.
Five of the nine had none at round 0.

| # | Capability | Reducer action | Learner control | Tool | At round 0 |
|---|---|---|---|---|---|
| A1 | Write a new line of working | `ADD_STEP` (`types.ts:122`) | `Scratchpad.tsx:397` | `add_step` (`definitions.ts:624`) | absent |
| A2 | Rewrite an existing line | `EDIT_STEP` (`types.ts:123`) | `Scratchpad.tsx:582` | `edit_step` (`definitions.ts:652`) | absent |
| A3 | Delete a line | `REMOVE_STEP` (`types.ts:124`) | `Scratchpad.tsx:719` | `remove_step` (`definitions.ts:684`) | absent |
| A4 | Check the derivation | `CHECK_WORK` (`types.ts:125`) | the Check control | `check_work` (`definitions.ts:463`) | present |
| A5 | Attach an explanation to a line | `ANNOTATE_STEP` (`types.ts:126`) | rendered beside the line | `annotate_step` (`definitions.ts:478`) | present |
| A6 | Offer a replacement line | `PROPOSE_STEP` (`types.ts:127`) | learner accepts or rejects | `propose_step` (`definitions.ts:519`) | present |
| A7 | Accept or reject a pending proposal | `RESOLVE_PROPOSAL` (`types.ts:128`) | `Scratchpad.tsx:415` | `resolve_proposal` (`definitions.ts:712`) | absent |
| A8 | Start a fresh problem | `NEW_PROBLEM` (`types.ts:129`) | `Scratchpad.tsx:788` | `new_problem` (`definitions.ts:563`) | present |
| A9 | Abandon the session and start over | `RESET` (`types.ts:130`) | `startOver` in `Scratchpad.tsx` | `reset_session` (`definitions.ts:737`) | absent |

The round-0 `get_scratchpad` payload asserted *"You cannot write, edit, or accept
steps. Only the learner can."* That was the previous thesis encoded in the tool
surface, not a domain limitation — the reducer supported all nine actions the whole
time, and `ActionSource` (`types.ts:9`) already distinguished `learner` from `agent`,
so the audit trail the current thesis needs was already being recorded.

## Reads (9)

Reads are included only where they perform a **distinct computation**. Slicing the same
snapshot by section (`get_problem`, `get_steps`, `get_annotations` …) fails the
reducibility test — those are one tool plus a section parameter — and are deliberately
excluded, which is why this list is 9 and not 20.

| # | Capability | Source it reads | Why it is not reducible | Tool |
|---|---|---|---|---|
| A10 | Read the current snapshot | `SessionState`, `types.ts:88-119` | The base read | `get_scratchpad` (`definitions.ts:446`) |
| A11 | Read the session receipt | `state.history` + `state.tally`, `types.ts:103` and `types.ts:108` | Derived over completed rounds, not a slice of the snapshot | `get_receipt` (`definitions.ts:594`) |
| A12 | Read what changed since a revision | `state.activities`, `types.ts:100` | Takes a revision, returns a diff; lets an agent poll without re-reading everything | `get_changes_since` (`definitions.ts:758`) |
| A13 | Read WebMCP platform support | The browser, via `platform.ts:311` | Probes the platform, not the session | `get_platform` (`definitions.ts:1004`) |
| A14 | List available problem families | `FAMILY_IDS`, `problems.ts:357` | Reads the problem catalogue, not session state | `list_problem_families` (`definitions.ts:822`) |
| A15 | Parse an expression without writing it | `parseExpression`, `expression.ts:114` | Validates arbitrary LaTeX and reports the parse error; no session effect | `validate_expression` (`definitions.ts:842`) |
| A16 | Compare two expressions for equivalence | `compareExpressions`, `equivalence.ts:185` | Two-expression input, tri-state verdict including `could not determine` | `compare_expressions` (`definitions.ts:876`) |
| A17 | Differentiate an expression | `computeEngine`, `expression.ts:21` | `(latex, variable)` → expression | `differentiate_expression` (`definitions.ts:907`) |
| A18 | Evaluate an expression at a point | `computeEngine`, `expression.ts:21` | `(latex, at)` → number | `evaluate_expression` (`definitions.ts:953`) |

A15–A18 expose the computer algebra layer the product already runs
(`src/domain/math/**`). They let an agent verify its own reasoning *before* writing to
the learner's page, rather than proposing a step and discovering it was wrong.

---

## Result

**`|A| = 18`.** `|R|` must equal 18 for C1.6, and every row above must map to exactly
one tool for C1.3.

Round 0: `|R| = 6`, 12 capabilities unexposed.

## Console groups

18 tools cannot show every name in the first viewport, so the console groups them —
group labels and counts visible with zero interaction, names on open (C1.8–C1.10).

| Group | Tools |
|---|---|
| Read | `get_scratchpad`, `get_changes_since`, `get_receipt` |
| Write | `add_step`, `edit_step`, `remove_step` |
| Review | `check_work`, `annotate_step`, `propose_step`, `resolve_proposal` |
| Session | `new_problem`, `reset_session`, `list_problem_families` |
| Mathematics | `validate_expression`, `compare_expressions`, `differentiate_expression`, `evaluate_expression` |
| Platform | `get_platform` |
