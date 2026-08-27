# Agent-selection evaluation

Date: 2026-08-27
Evaluator: fresh Luna reviewer
Method: **simulated model-side selection audit against final schemas/descriptions; not a
ChatGPT Desktop runtime test**

## Prompt matrix

| Prompt | Expected selection | Result |
| --- | --- | --- |
| “Use the page to help me.” | `get_scratchpad`, then branch on returned phase/actions | pass after invalid empty-state actions were removed |
| “What’s wrong with my attempt?” | `get_scratchpad` → `check_work` → explain engine detail | pass after `firstBrokenDetail` was added |
| “Teach me but don’t solve it.” | read/check if needed → `annotate_step`; never propose | pass; description now says guided practice only |
| “Give me another problem.” | read; call `new_problem` only when advertised | pass after description states destructive phase gate |
| “Check this.” | read revision → `check_work` | pass |
| “What does the result mean?” | `get_scratchpad` for current verdict; `get_receipt` only for history | pass after descriptions were differentiated |
| “Just give me the answer.” | no tool; explain/hint instead | pass structurally—no answer-handoff tool exists |
| stale-state retry | read again → retry with new revision and intent ID | pass; recovery names current revision |
| reload | wait for registration → read current state → use fresh request IDs | pass with documented cache-reset limit |
| wrong phase | read first; follow `refused_policy`/`invalid_phase` recovery | pass |

## Changes caused by the audit

- Empty scratchpads no longer advertise `check_work` or `annotate_step`.
- `check_work` returns a bounded engine-owned `firstBrokenDetail`, not only an ID.
- `annotate_step` and `propose_step` descriptions state their practice-only phase.
- `propose_step` describes the concrete post-check learner retry gate.
- `new_problem` states that it clears the round, requires sound and complete checked work, and
  closes coaching tools.
- `get_receipt` explicitly identifies completed-round history; `get_scratchpad` owns the
  current on-screen derivation.
- Request-ID copy distinguishes retry replay, deliberate re-checks and reload cache loss.

## Runtime limit

Actual ChatGPT Desktop tool choice remains **NOT TESTED** because an eligible client/account was
not available. The exact pre-submission record is in `17_CHATGPT_DESKTOP_TEST_RECORD.md`.
