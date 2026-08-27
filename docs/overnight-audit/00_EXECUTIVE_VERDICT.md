# Executive verdict — frontier rescue

Date: 2026-08-27
Working tree: `hackathon-build`
Decision: **keep Second Try, rebuild the mechanism and evidence surface**

## What survived

The central product idea survived a fresh tournament because it is the strongest browser-native
claim in the field: the learner and agent act on the same unfinished derivation, while the page
owns mathematical truth and can immediately test transfer on a fresh problem.

The six-tool surface also survived. Annotation and proposal are intentionally separate because
they cross different consent boundaries. The surface is small enough to select reliably and each
tool maps to a visible, page-owned capability.

## What was wrong

The inherited build was already materially better than the original prototype, but it still had
four release-blocking correctness defects:

1. a cached successful mutation could be replayed after the learner had moved to a new revision;
2. transfer could unlock after a merely “sound” partial chain that had not reached the answer;
3. malformed persisted state passed a shallow validator and could crash restoration;
4. an unexpected bridge rejection escaped a handler, contradicting the “handlers never throw”
   contract.

The learner UI also made the WebMCP inspector too prominent, mixed unsupported and disconnected
states, and used a “receipt” presentation that looked more like an evaluation dashboard than a
learning product.

## What changed

- The experience is now a calm Mathos × Sarsa proof ledger rather than card or badge soup.
- The learner sees the problem, derivation, first break, repair, and next action as one continuous
  mathematical thread.
- Raw capabilities and schemas are behind a collapsed inspector.
- Transfer starts only after checked work is both sound and complete.
- The final surface is an **Immediate transfer signal** with explicit epistemic limits.
- Persistence, idempotency, stale-state, bridge failure, truncation, and transfer semantics were
  hardened with regression tests.
- A reproducible Chrome 151 WebMCP end-to-end harness now drives all six registered tools through
  `document.modelContext`.

## Verified result

- `178/178` tests pass.
- Astro/TypeScript: 0 errors, 23 upstream deprecation hints.
- Production build: passes.
- Real Chrome 151 + `WebMCPTesting`: six tools registered; full diagnosis → teaching → learner
  acceptance → transfer → bounded evidence journey passes.
- Ordinary browser fallback: full human journey passes and truthfully reports WebMCP unavailable.
- Lighthouse: Accessibility 100, Best Practices 100, Agentic Browsing 100.
- Cold-load lab trace: LCP 106 ms, CLS 0.00 on the local unthrottled build.
- 390 px mobile and a 720×450 CSS viewport (200% stress equivalent): no horizontal overflow.

## Submission verdict

**The code is a release candidate. The submission is NOT SUBMISSION READY.**

External completion work remains: publish the current branch, replace the placeholder deployment
reference with a stable public URL, record the required demo video, and run ChatGPT Desktop Site
Tools against that public URL if an eligible client/account is available. None of those were
invented or claimed here.
