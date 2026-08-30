# Blind-agent journey — round 4

Run 2026-08-30 against the current build (four families, runtime output-budget
truncation, `describeSymbol` injection fix), Chrome 151.0.7922.174 with
`--enable-features=WebMCPTesting`.

**The agent's inputs were exactly two things:** the JSON `getTools()` output
(`toollist4.json`, 18,615 bytes) and the goal *"finish the problem on this page and
reach the receipt."* No source, no README, no docs, no hints. It never saw the page.
It proposed batches of calls; the orchestrator executed them verbatim through
`document.modelContext.executeTool` and pasted the raw envelopes back. **No argument
was ever supplied or repaired on its behalf** — including `expectedRevision`, which it
had to track itself from the read-backs.

Problem drawn: `trig-chain`, `a = 4x`, `y = 3\sin(a)`, *"Find dy/dx at x = 0."*

## Calls, in order

| # | Tool | Result | Note |
|---|---|---|---|
| 1 | `get_scratchpad` | ok, rev 87 | Oriented itself: read the problem and `availableActions` before writing. |
| 2 | `get_receipt` | **`ok: false` — `invalid_phase`** | *"No round has finished yet. There is nothing to report until a fresh problem has been started."* |
| 3 | `substitute_expression` | ok | Composed `y = 3\sin(4x)` from the two givens. |
| 4 | `differentiate_expression` | ok | `12\cos(4x)`. |
| 5 | `evaluate_expression` | ok | `12` at `x = 0`. |
| 6 | `add_step` `3\sin(4x)` | ok, rev 88 | |
| 7 | `compare_expressions` | ok, `match: true` | Checked its own derivative against the engine before writing it. |
| 8 | `add_step` `12\cos(4x)` | ok, rev 89 | |
| 9 | `add_step` `12` | ok, rev 90 | |
| 10 | `get_scratchpad` | ok, rev 90 | |
| 11 | `check_work` | ok, rev 91 | `allSound: true`, `reachesAnswer: true`, three `sound` verdicts. |
| 12 | `get_scratchpad` | ok, rev 91 | Observed `new_problem` had appeared in `availableActions`. |
| 13 | `new_problem` | ok, rev 92 | Closed the round. |
| 14 | `get_receipt` | **ok** | Receipt returned: one round, `allStepsSound: true`, `linesWritten: {agent: 3}`, and the limits block. |

## Against the rubric

**C4.1 — journey completes.** Reached the receipt at call 14, from a cold start, with
no repair of its arguments. **Pass.**

**C4.2 — dead calls.** Calls returning `ok: false` and *not* followed by a corrected
retry: **0**. The single failure at call 2 was retried successfully at call 14.

**C4.3 — errors drive recovery.** One `ok: false`. Its `recovery` string names the
remedy — *"until a fresh problem has been started"* — and the agent's recovery was
`new_problem`, the tool that starts one. It did not guess: it re-read
`availableActions` at call 12, saw `new_problem` appear, and only then called it.
Failures = **0**.

## Worth recording

The agent never called `get_receipt` a second time speculatively. It treated
`availableActions` as the authority on what the page would currently accept, which is
the behaviour that field exists for — and it is the only signal in the surface that
told it the round had become closable.
