# Hostile mathematics and state tests

## Automated gate

`pnpm test` → **9 files, 178 tests, all passing**.

The suite covers:

- strict expression contract and malformed syntax;
- factored, expanded and reordered equivalence;
- symbolic/numeric route disagreement;
- finite counterexamples;
- NaN, Infinity and non-finite results;
- unsupported symbols and bounded inputs;
- analytic differentiation and evaluation;
- generated-problem determinism, variety and collision rejection;
- misconception transfer across unseen generated instances;
- first-break and downstream semantics;
- distinction between `allSound` and `reachesAnswer`;
- learner-only reducer actions;
- proposal attempt gate and no-op edit rejection;
- rejection resets the proposal gate and pending proposals cannot be overwritten;
- phase refusals;
- stale revisions and duplicate request IDs;
- stale cached-success rejection after the document moves;
- in-flight idempotency;
- bridge rejection recovery;
- bounded long-derivation output retaining a late break;
- malformed persisted problems, reports, activities, tallies and signatures.

## New rescue regressions

The rescue began by writing failing tests for every newly proven defect. Red states were
observed before each production change. The final suite adds twenty-four cases and passes all of them.

The highest-value invariant is now tested at three layers:

1. reducer refuses `NEW_PROBLEM` until work is sound **and reaches the answer**;
2. `get_scratchpad.availableActions` withholds `new_problem` until the same condition;
3. the final evidence cannot label incomplete transfer as successful.

## Known bounded risks

- The compute-engine dependency reports TypeScript deprecation hints for its current public boxed
  expression types. They are not runtime failures and were not papered over.
- The production bundle is approximately 2.96 MB minified because the local symbolic engine is
  shipped to the browser. It produces immediate local verification and avoids a network trust
  dependency; performance measurements remain within the current gate.
- A storage event now freezes both learner and tool writes in the stale tab. The learner must close
  one tab and explicitly start over before that copy can persist again. This prevents silent
  last-writer data loss; it is intentionally not a multi-tab collaboration protocol.
