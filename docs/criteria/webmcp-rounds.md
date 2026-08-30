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
