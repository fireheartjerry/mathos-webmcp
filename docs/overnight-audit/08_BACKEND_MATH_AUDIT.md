# Backend and mathematics audit — final delta

The exhaustive original investigation remains in `08_BACKEND_AND_MATH_AUDIT.md`. This file
records the defects found during the rescue and their disposition.

## Release-blocking defects fixed

| Defect | Consequence | Resolution |
| --- | --- | --- |
| cached mutation success replayed after state advanced | caller could receive an old success as current | cache replay now requires the live revision to match |
| transfer gated on “checked”/sound only | partial work could generate a supposedly meaningful transfer round | requires `allSound && reachesAnswer` everywhere |
| shallow persistence validation | malformed local state could restore and crash rendering | deep structural, bounds, signature, tally and history validation |
| bridge rejection escaped a handler | Chrome flattened the error and violated the no-throw contract | mutation boundary returns `internal_error` with recovery |
| truncated state omitted a late broken step | agent could teach the wrong part of a long chain | broken target is retained in the bounded summary |
| no-op edits counted as attempts | learner could bypass the proposal gate without trying | unchanged edits return `invalid_input` |
| incomplete transfer rendered as success | evidence overclaimed learning | evidence requires both sound chain and requested answer |

## Mathematical trust boundary

The model never supplies a verdict. `@cortex-js/compute-engine` parses, differentiates and
symbolically evaluates; the independent numeric route can disprove false equivalence with a
finite counterexample. Equality requires both routes to agree. Unsupported, non-finite, oversized,
or ambiguous work fails closed to “uncertain” or “unreadable.”

Generated problems derive their premise, derivative, evaluation and misconception modes from the
instance. Collision-prone instances are rejected rather than assigned a fabricated diagnosis.

## State invariants

- one reducer owns browser, learner, inspector and agent transitions;
- learner-only mutations are enforced below the UI;
- every commit advances a monotonic revision;
- every WebMCP mutation carries an expected revision and request ID;
- duplicate in-flight requests await one result;
- persisted state is versioned and rejected atomically if malformed;
- transfer is a one-way phase change;
- annotations/proposals are refused in the unaided round;
- evidence distinguishes a sound chain from a chain that reaches the answer.

## Verification

`178` unit/integration tests cover the parser, equivalence oracle, diagnosis, problem
generation, reducer, persistence and all six tool definitions. New regression cases specifically
cover every defect in the table above. The full production-browser WebMCP run adds a system-level
check through the shipped Chrome API.
