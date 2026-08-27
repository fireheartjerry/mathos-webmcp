# 1:50–2:00 demo video runbook

Do not open on the empty state. Seed two learner lines before recording so WebMCP value appears
inside the first ten seconds.

## Shot sequence

**0:00–0:12 — the break**

- Show the live proof ledger with line 1 correct and line 2 missing a dependency path.
- Prompt the connected agent: “What’s wrong with my attempt? Use the page.”
- The agent calls `get_scratchpad` then `check_work`.
- Line 2 turns into the first visible break; the page engine, not the model, owns the verdict.

**0:12–0:38 — teach beside the work**

- Prompt: “Teach me, but don’t solve it.”
- Agent calls `annotate_step`; the blue teaching branch appears beside line 2.
- Ask for the answer too early once; show the visible policy refusal.
- Learner makes a genuine second attempt. Agent may now `propose_step`; learner clicks **Use this**.

**0:38–1:02 — repair**

- Learner finishes the evaluation line and checks.
- Show `equals / differentiates / evaluates`.
- Say: “Mathos has verified the chain and that it reaches the requested answer.”

**1:02–1:28 — withdraw help**

- Agent calls `new_problem`.
- The page visibly enters **Unaided** mode; coaching/proposal tools are closed for every caller.
- Learner completes the fresh generated problem.

**1:28–1:48 — bounded evidence**

- Check the fresh derivation.
- Show **Immediate transfer signal** and its explicit “not proof of mastery/retention” limit.
- Agent calls `get_receipt`.

**1:48–1:58 — why WebMCP / why Mathos**

> “The agent sees the unfinished artifact already in the tab. The page owns symbolic truth,
> learner consent, and the live transition into an unaided second try. That is the part a generic
> chat or backend MCP cannot fake.”

End on the proof ledger, not a protocol slide.
