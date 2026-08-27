# 11 — Implementation Attack Plan

Ordered by risk retirement, then judged value. Items 1–6 are done; this file is now
primarily the record of what remains.

A note on honesty: this plan was written *alongside* the implementation rather than
before it, because the highest-risk unknown — whether an honest verifier was buildable at
all — could only be settled by building one. Retro-dating a plan to look orderly would be
theatre. What follows is accurate.

---

## Done

| # | Task | Acceptance | Status |
| --- | --- | --- | --- |
| 1 | Prove a real verifier is possible | Adversarial suite passes, engine measured | **Done** — `08` §3, §5 |
| 2 | Math core: parser, oracle, generator, diagnoser | Tests green; correct answers in any form accepted; `uncertain` reachable | **Done** — 70 tests |
| 3 | Session domain + policy + persistence | One reducer; agent cannot write; reset clears the log | **Done** — 141 tests total |
| 4 | Six tools against *verified* Chrome behaviour | No handler throws; envelopes survive; `allSettled`; no `pagehide` teardown | **Done** — `cfe9d33` |
| 5 | Scratchpad UI on frozen tokens | Archivo, KaTeX, no serif/shadow/green-button/rust-type | **Done** — `15fe3df` |
| 6 | Agent Console + local inspector | Visible in every browser; runs the same handler | **Done** — `15fe3df` |
| 7 | Landing page; remove dead product; remove HTTP proxy | No bare IP anywhere; tfjs out of bundle | **Done** — `f200ce8` |
| 8 | Fix `pnpm dev`; fix hydration mismatch | Dev renders; no hydration error in console | **Done** |

---

## Remaining, in order

### P0 — must land before submission

**R1. Live WebMCP acceptance of the six tools.**
A local harness is not acceptance. Every tool must be invoked through
`executeTool(toolObject, '<json string>')` in Chrome 151 with `--enable-features=WebMCPTesting`,
with before/after screenshots proving the page visibly mutates.
*Acceptance:* `14_FINAL_WEBMCP_EVAL.md` records six passing calls and the falsifiability
demonstration. *In progress.*

**R2. Anti-slop gate.**
`10` §5.2 requires **≥36/40** on the `05` PART 4 checklist. The pre-redesign build scored
19/40.
*Acceptance:* `13_FINAL_VISUAL_QA.md` states the score with measured evidence per rule and
a stated reason for every remaining failure. *In progress.*

**R3. Hostile QA and repair.**
Mathematics, state, keyboard, accessibility, reduced motion, performance, and the five
judge attacks.
*Acceptance:* `15_FINAL_HOSTILE_QA.md`; every blocking and high defect repaired and
re-verified. *In progress.*

**R4. Submission documents.**
README that carries all four criteria alone (judges may never run the app), a
GitHub-detected `LICENSE`, an updated `PROVENANCE.md`, and a sub-3-minute demo script.
*Acceptance:* the README's click path is accurate against the shipped build, and the
manual WebMCP snippet uses the only form that works. *In progress.*

**R5. Publish the application source.**
`origin/main` currently contains documentation and no product. The application lives only
on the local `hackathon-build` branch.
*Acceptance:* the public repository contains the running product, a detected licence, and
no secrets. **Requires the owner's decision — not taken autonomously.**

### P1 — worth doing if time allows

**R6. Rename the deployment.** `hackathon-build-eta.vercel.app` reads as a hackathon
artifact, not a Mathos product. Cheap, and it is the first thing a judge sees.

**R7. Origin trial token.** A `<meta http-equiv="origin-trial">` would remove the
`chrome://flags` step for stock Chrome, which is the single biggest obstacle between a
judge and a working demonstration. Nothing depends on it; treat as a bonus.

**R8. A second problem family.** One family is honest but thin. A second — algebraic
rewriting with its own error modes — would make `new_problem`'s `familyId` argument
meaningful and strengthen the weakest of the six tools.

**R9. Self-host Archivo and Fira Code.** Currently a Google Fonts `@import`, which is a
render-blocking third-party request and a privacy consideration.

### P2 — explicitly not doing

- MathLive input. Text plus KaTeX re-rendering is sufficient for v1 and lower risk.
- Re-integrating the tiny transformer. Ruled out in `03` §5.3 and `10` §1.6.
- Mathos video generation as a tool. Out of scope; the judged path stays local.
- Multiplayer, accounts, server persistence.

---

## Fallbacks if late

| If this fails | Then |
| --- | --- |
| Live WebMCP acceptance cannot be obtained | Ship with the local inspector as the demonstrated path and **say so plainly** in the README. Do not describe the harness as WebMCP acceptance. |
| The anti-slop gate lands below 36/40 | Ship, and list every failure with its reason. A stated known defect is survivable; an unstated one is not. |
| A blocking hostile-QA defect cannot be repaired | Disable the affected surface rather than shipping it broken, and record the removal. |
| The repository cannot be published in time | Everything else is still worth completing; the deployable state is prepared and the decision left to the owner. |
