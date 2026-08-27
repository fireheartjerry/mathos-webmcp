# 10 — Rescue implementation plan

Frozen from `09_FINAL_REDESIGN_SPEC.md`.

1. Add failing reducer/tool/persistence tests for the proven defects: transfer from unfinished
   practice, receipt overclaim, stale cached success, unexpected bridge rejection, malformed
   persisted state, and no-op proposal-gate bypass.
2. Repair the domain contracts with the smallest coherent changes; keep one transition path for
   learner, inspector, and agent.
3. Recompose `/learn` as a proof ledger: compact cold start, continuous step rail, truthful
   capability status, product-native activity, collapsed capability inspector, and 44px controls.
4. Replace receipt language with the bounded transfer signal and remove raw protocol language from
   the unaided learner banner.
5. Correct stale README/audit claims, create the required rescue artifacts, and record what remains
   untested rather than inheriting old acceptance claims.
6. Run the full automated suite, production build, browser journey, accessibility audit, zoom and
   responsive checks, real Chrome WebMCP calls, and a fresh hostile Luna review. Repair every P0/P1
   result before acceptance.
