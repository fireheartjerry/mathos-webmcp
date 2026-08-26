# Curriculum and Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete calculus-to-transformer path, bounded problem families, mistake patterns, local lessons, and the judge demonstration fixture.

**Architecture:** Versioned TypeScript content files define the path and its educational material. The domain engine reads only validated content. Each concept has explicit problems, clear mistakes, one local lesson path, and a fresh-transfer generator.

**Tech Stack:** TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.11, fast-check 4.9.0, MathLive 0.110.0, CortexJS Compute Engine 0.119.0.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Use the exact concept IDs in this plan.
- Give each concept at least four explicit problems.
- Include one diagnostic item and one transfer template for each concept.
- Use only bounded answer types from the learning-engine plan.
- Use Simple English before each technical term.
- Do not claim permanent mastery.
- Keep hidden answers in private content fields.
- Keep public problem projections free of answers and distractor values.
- Use self-authored text, diagrams, and data.

---

## Locked Concept Graph

| Stage | Concept ID | Learner title | Direct prerequisites |
|---|---|---|---|
| 1 | `scalar-chain-rule` | Changes inside changes | none |
| 1 | `partial-derivatives` | Change one input at a time | `scalar-chain-rule` |
| 1 | `gradient-vectors` | Put every direction together | `partial-derivatives` |
| 2 | `vectors-dot-products` | Measure how two directions align | `scalar-chain-rule` |
| 2 | `matrix-maps` | Move many numbers together | `vectors-dot-products` |
| 2 | `jacobians` | Track every output change | `matrix-maps`, `gradient-vectors` |
| 3 | `trace-dependencies` | Follow every path to the answer | `scalar-chain-rule` |
| 3 | `local-derivatives` | Measure one small step | `trace-dependencies`, `partial-derivatives` |
| 3 | `reverse-mode` | Work backward from one result | `local-derivatives`, `jacobians` |
| 4 | `neuron-gradient` | Find what changed one neuron | `reverse-mode`, `matrix-maps` |
| 4 | `shared-path-gradients` | Count every path once | `neuron-gradient`, `trace-dependencies` |
| 4 | `batch-gradients` | Learn from several examples | `neuron-gradient` |
| 5 | `gradient-descent` | Take a step that lowers error | `gradient-vectors` |
| 5 | `learning-rate` | Choose the size of the step | `gradient-descent` |
| 5 | `momentum` | Keep useful movement | `learning-rate` |
| 6 | `logits-softmax` | Turn scores into choices | `vectors-dot-products` |
| 6 | `cross-entropy` | Measure a wrong prediction | `logits-softmax` |
| 6 | `likelihood` | Measure how well a model explains data | `cross-entropy` |
| 7 | `tokenization` | Break text into model pieces | none |
| 7 | `embeddings` | Turn pieces into directions | `tokenization`, `vectors-dot-products` |
| 7 | `positions` | Keep the order of the pieces | `embeddings` |
| 8 | `query-key-value` | Ask, match, and carry information | `embeddings`, `matrix-maps` |
| 8 | `attention-scores` | Measure what matters now | `query-key-value`, `logits-softmax` |
| 8 | `weighted-context` | Mix useful information | `attention-scores` |
| 9 | `residual-stream` | Keep an open information path | `weighted-context`, `shared-path-gradients` |
| 9 | `layer-normalization` | Keep values in a useful range | `residual-stream`, `likelihood` |
| 9 | `feed-forward-network` | Change each position with a small network | `neuron-gradient`, `residual-stream` |
| 9 | `transformer-block-flow` | Put the complete block together | `residual-stream`, `layer-normalization`, `feed-forward-network` |
| 10 | `prepare-training-data` | Make examples from text | `tokenization`, `positions` |
| 10 | `train-tiny-transformer` | Teach the small model | `transformer-block-flow`, `prepare-training-data`, `momentum` |
| 10 | `evaluate-samples` | Read what the model learned | `train-tiny-transformer` |
| 10 | `debug-overfit` | Fix memorization and weak learning | `evaluate-samples`, `learning-rate` |

## Locked Misconception Set

| Misconception ID | Root concept |
|---|---|
| `missing-inner-rate` | `scalar-chain-rule` |
| `vector-as-scalar` | `vectors-dot-products` |
| `matrix-order-reversal` | `matrix-maps` |
| `shared-path-omission` | `trace-dependencies` |
| `local-global-confusion` | `local-derivatives` |
| `wrong-gradient-direction` | `gradient-descent` |
| `step-size-confusion` | `learning-rate` |
| `softmax-as-independent` | `logits-softmax` |
| `cross-entropy-sign` | `cross-entropy` |
| `token-value-confusion` | `tokenization` |
| `embedding-as-label` | `embeddings` |
| `query-key-role-swap` | `query-key-value` |
| `missing-scale-factor` | `attention-scores` |
| `attention-row-normalization` | `attention-scores` |
| `residual-path-omission` | `residual-stream` |
| `normalization-across-tokens` | `layer-normalization` |
| `next-token-shift` | `prepare-training-data` |
| `loss-sample-confusion` | `evaluate-samples` |
| `overfit-means-broken` | `debug-overfit` |

---

### Task 1: Create the content contract and validator

**Files:**
- Create: `src/features/learning/content/types.ts`
- Create: `src/features/learning/content/builders.ts`
- Create: `src/features/learning/content/validate-content.ts`
- Create: `src/features/learning/content/index.ts`
- Create: `scripts/verify-content.mjs`
- Test: `tests/content/content-contract.test.ts`

**Interfaces:**
- Consumes: the domain types and graph validator.
- Produces: `ContentBundle`, `defineConcept`, `defineProblem`, `defineLesson`, and `validateContentBundle`.

- [ ] **Step 1: Define the content types**

```ts
export interface ContentBundle {
  readonly version: "2026-08-26";
  readonly stages: readonly StageDefinition[];
  readonly concepts: readonly Concept[];
  readonly problems: readonly Problem[];
  readonly misconceptions: readonly Misconception[];
  readonly lessons: readonly LessonDefinition[];
}

export interface LessonDefinition {
  readonly id: LessonId;
  readonly misconceptionId: MisconceptionId | null;
  readonly title: string;
  readonly plainSummary: string;
  readonly representation: "equation" | "graph" | "table" | "motion" | "attention-map";
  readonly steps: readonly LessonStep[];
  readonly videoKey: string | null;
}
```

- [ ] **Step 2: Write failing validator tests**

Assert that validation rejects:

- A missing prerequisite
- A cycle
- A problem with an unknown concept
- A problem family with no transfer variant
- A misconception with no local lesson
- A hidden answer in public problem data
- A concept with fewer than four problems
- A sentence longer than 25 words in learner copy

- [ ] **Step 3: Run tests and observe missing content modules**

Run: `pnpm test -- tests/content/content-contract.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the content validator**

Return all findings in one pass:

```ts
export interface ContentFinding {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function validateContentBundle(bundle: ContentBundle): readonly ContentFinding[];
```

- [ ] **Step 5: Add the command-line content check**

`scripts/verify-content.mjs` imports `CONTENT`, prints each finding, and exits with code 1 when findings exist.

Add `"content:check": "node scripts/verify-content.mjs"` to `package.json`.

- [ ] **Step 6: Pass the content-contract tests**

Run: `pnpm test -- tests/content/content-contract.test.ts`

Expected: PASS with a valid small fixture.

- [ ] **Step 7: Commit**

```powershell
git add src/features/learning/content scripts/verify-content.mjs tests/content/content-contract.test.ts package.json
git commit -m "feat: define the curriculum content contract"
```

### Task 2: Add stages 1 and 2

**Files:**
- Create: `src/features/learning/content/stages.ts`
- Create: `src/features/learning/content/concepts/calculus.ts`
- Create: `src/features/learning/content/concepts/linear-algebra.ts`
- Create: `src/features/learning/content/problems/calculus.ts`
- Create: `src/features/learning/content/problems/linear-algebra.ts`
- Test: `tests/content/calculus-linear.test.ts`

**Interfaces:**
- Consumes: content builders.
- Produces: six concepts and at least 24 explicit problems.

- [ ] **Step 1: Add all ten stage definitions**

Use the learner titles from the approved design. Give each stage one sentence that explains its purpose.

- [ ] **Step 2: Write tests for the six concepts**

Assert exact IDs, prerequisites, stage IDs, display order, and four-problem minimum.

- [ ] **Step 3: Add the calculus problem families**

Include these required families:

- Nested scalar derivative
- One-input partial derivative
- Two-input gradient direction
- Shared-path scalar graph

Use `missing-inner-rate` and `shared-path-omission` as exact distractor mappings where applicable.

- [ ] **Step 4: Add the linear-algebra problem families**

Include dot products, matrix-vector maps, matrix order, and a small Jacobian.

Use values between -5 and 5. Keep every arithmetic result small enough for mental checking.

- [ ] **Step 5: Pass the stage tests and content validator**

Run:

```powershell
pnpm test -- tests/content/calculus-linear.test.ts
pnpm content:check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/learning/content/stages.ts src/features/learning/content/concepts/calculus.ts src/features/learning/content/concepts/linear-algebra.ts src/features/learning/content/problems/calculus.ts src/features/learning/content/problems/linear-algebra.ts tests/content/calculus-linear.test.ts
git commit -m "feat: teach calculus and linear algebra bridges"
```

### Task 3: Add stages 3 and 4

**Files:**
- Create: `src/features/learning/content/concepts/autodiff.ts`
- Create: `src/features/learning/content/concepts/backprop.ts`
- Create: `src/features/learning/content/problems/autodiff.ts`
- Create: `src/features/learning/content/problems/backprop.ts`
- Test: `tests/content/autodiff-backprop.test.ts`

**Interfaces:**
- Consumes: stage definitions and problem builders.
- Produces: six concepts and at least 24 explicit problems.

- [ ] **Step 1: Add exact concept metadata**

Add `trace-dependencies`, `local-derivatives`, `reverse-mode`, `neuron-gradient`, `shared-path-gradients`, and `batch-gradients`.

- [ ] **Step 2: Add the judge seed problem**

Use this exact graph:

```text
a = x²
b = 3x
y = a·b + a
Find dy/dx at x = 2.
```

The correct result is `40`. The `shared-path-omission` distractor is `36` because it omits the direct `a` path.

- [ ] **Step 3: Add the judge transfer family**

Use this exact graph:

```text
q = 2x
k = x²
s = q·k + q
Find ds/dx at x = 1.
```

The correct result is `8`. The shared-path distractor is `6`.

Label `q`, `k`, and `s` as an attention bridge. Do not claim that this graph is a complete attention calculation.

- [ ] **Step 4: Add remaining problem families**

Cover local edge derivatives, reverse accumulation, one sigmoid-free neuron, shared parameters, and a two-example batch mean.

- [ ] **Step 5: Pass content tests**

Run:

```powershell
pnpm test -- tests/content/autodiff-backprop.test.ts
pnpm content:check
```

Expected: PASS and exact judge answers `40`, `36`, `8`, and `6`.

- [ ] **Step 6: Commit**

```powershell
git add src/features/learning/content/concepts/autodiff.ts src/features/learning/content/concepts/backprop.ts src/features/learning/content/problems/autodiff.ts src/features/learning/content/problems/backprop.ts tests/content/autodiff-backprop.test.ts
git commit -m "feat: connect calculus to backpropagation"
```

### Task 4: Add stages 5 and 6

**Files:**
- Create: `src/features/learning/content/concepts/optimization.ts`
- Create: `src/features/learning/content/concepts/probability.ts`
- Create: `src/features/learning/content/problems/optimization.ts`
- Create: `src/features/learning/content/problems/probability.ts`
- Test: `tests/content/optimization-probability.test.ts`

**Interfaces:**
- Produces: six concepts and at least 24 explicit problems.

- [ ] **Step 1: Add the concept metadata and prerequisites**

Use the locked graph table.

- [ ] **Step 2: Add optimization problems**

Cover descent direction, step size, overshoot, and momentum memory. Use one-dimensional and two-dimensional examples.

- [ ] **Step 3: Add probability problems**

Cover score shifts, softmax normalization, cross-entropy sign, and likelihood comparison.

Use three-class vectors and values that allow a calculator-free qualitative answer where possible.

- [ ] **Step 4: Pass content tests**

Run:

```powershell
pnpm test -- tests/content/optimization-probability.test.ts
pnpm content:check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/learning/content/concepts/optimization.ts src/features/learning/content/concepts/probability.ts src/features/learning/content/problems/optimization.ts src/features/learning/content/problems/probability.ts tests/content/optimization-probability.test.ts
git commit -m "feat: teach training steps and probability"
```

### Task 5: Add stages 7 and 8

**Files:**
- Create: `src/features/learning/content/concepts/tokens.ts`
- Create: `src/features/learning/content/concepts/attention.ts`
- Create: `src/features/learning/content/problems/tokens.ts`
- Create: `src/features/learning/content/problems/attention.ts`
- Test: `tests/content/tokens-attention.test.ts`

**Interfaces:**
- Produces: six concepts and at least 24 explicit problems.

- [ ] **Step 1: Add token and embedding problems**

Use a fixed eight-token vocabulary. Cover token IDs, embedding lookup, vector similarity, and position addition.

- [ ] **Step 2: Add attention problems**

Use one two-token example and one three-token example. Cover query, key, value roles, scaled scores, row softmax, and weighted context.

- [ ] **Step 3: Add bounded attention-grid answers**

An `attention-grid` answer contains selected row and column IDs. It does not contain free-form prose.

- [ ] **Step 4: Pass content tests**

Run:

```powershell
pnpm test -- tests/content/tokens-attention.test.ts
pnpm content:check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/learning/content/concepts/tokens.ts src/features/learning/content/concepts/attention.ts src/features/learning/content/problems/tokens.ts src/features/learning/content/problems/attention.ts tests/content/tokens-attention.test.ts
git commit -m "feat: teach tokens and attention"
```

### Task 6: Add stages 9 and 10

**Files:**
- Create: `src/features/learning/content/concepts/transformer.ts`
- Create: `src/features/learning/content/concepts/training.ts`
- Create: `src/features/learning/content/problems/transformer.ts`
- Create: `src/features/learning/content/problems/training.ts`
- Test: `tests/content/transformer-training.test.ts`

**Interfaces:**
- Produces: eight concepts and at least 32 explicit problems.

- [ ] **Step 1: Add transformer-block problems**

Cover the residual path, normalization axis, feed-forward position independence, and complete block order.

- [ ] **Step 2: Add training problems**

Cover next-token shifts, batches, loss curves, sample quality, underfitting, overfitting, and learning-rate repair.

Use `training-action` answers for controls that the learner must change in the final lab.

- [ ] **Step 3: Pass content tests**

Run:

```powershell
pnpm test -- tests/content/transformer-training.test.ts
pnpm content:check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/features/learning/content/concepts/transformer.ts src/features/learning/content/concepts/training.ts src/features/learning/content/problems/transformer.ts src/features/learning/content/problems/training.ts tests/content/transformer-training.test.ts
git commit -m "feat: complete the transformer learning path"
```

### Task 7: Add misconception lessons and representation changes

**Files:**
- Create: `src/features/learning/content/misconceptions.ts`
- Create: `src/features/learning/content/lessons.ts`
- Create: `src/features/learning/ui/representations/EquationLesson.tsx`
- Create: `src/features/learning/ui/representations/GraphLesson.tsx`
- Create: `src/features/learning/ui/representations/TableLesson.tsx`
- Create: `src/features/learning/ui/representations/AttentionLesson.tsx`
- Create: `src/features/learning/ui/representations/MotionLesson.tsx`
- Test: `tests/content/lessons.test.ts`
- Test: `tests/unit/lesson-renderers.test.tsx`

**Interfaces:**
- Consumes: the locked misconception set.
- Produces: one local lesson for every misconception and a correct-answer bridge lesson for every stage.

- [ ] **Step 1: Add all misconception definitions**

Use the exact IDs and root concepts in this plan. Give each definition one plain description and one observable pattern.

- [ ] **Step 2: Write lesson tests**

Assert that every misconception has one lesson, every lesson has two to five steps, and every step uses fewer than 26 words.

- [ ] **Step 3: Add the shared-path hero lesson**

The lesson must:

1. Highlight both paths from `x` to `y`.
2. Show the contribution from `a·b`.
3. Show the direct contribution from `a`.
4. Add both contributions.
5. Avoid showing the transfer answer.

Set `videoKey` to `shared-path-omission-v1`.

- [ ] **Step 4: Add the remaining local lessons**

Use the representation that best fits each mistake. Do not use video as the only explanation.

- [ ] **Step 5: Build and test each representation component**

Render semantic SVG with text equivalents. Use color plus labels, not color alone.

- [ ] **Step 6: Pass lesson and accessibility tests**

Run:

```powershell
pnpm test -- tests/content/lessons.test.ts tests/unit/lesson-renderers.test.tsx
pnpm content:check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/learning/content/misconceptions.ts src/features/learning/content/lessons.ts src/features/learning/ui/representations tests/content/lessons.test.ts tests/unit/lesson-renderers.test.tsx
git commit -m "feat: add mistake-specific visual lessons"
```

### Task 8: Freeze the judge fixture and complete content quality

**Files:**
- Create: `src/features/learning/content/judge-fixture.ts`
- Modify: `src/features/learning/content/index.ts`
- Modify: `src/features/learning/store/create-default-session.ts`
- Create: `tests/integration/judge-learning-loop.test.ts`
- Create: `tests/content/simple-english.test.ts`

**Interfaces:**
- Consumes: all concepts, problems, misconceptions, and lessons.
- Produces: `CONTENT`, `JUDGE_FIXTURE`, and the default judge session.

- [ ] **Step 1: Define the fixture**

```ts
export const JUDGE_FIXTURE = {
  sessionId: "judge-shared-path-v1",
  goalConceptId: "debug-overfit",
  activeConceptId: "shared-path-gradients",
  seedProblemId: "shared-path-seed-01",
  wrongAttempt: { kind: "number", value: 36 },
  diagnosisId: "diagnosis-shared-path-omission",
  lessonId: "lesson-shared-path-omission",
  transferProblemId: "shared-path-transfer-01",
  correctTransfer: { kind: "number", value: 8 },
} as const;
```

- [ ] **Step 2: Write the complete loop test**

Drive the engine from diagnostic through receipt. Assert the exact diagnosis, lesson, transfer, receipt claim, and next recommended node.

- [ ] **Step 3: Write the Simple English test**

Reject the project slop words from the approved language standard. Count words in descriptive sentences and fail above 25 words.

- [ ] **Step 4: Run the complete content gate**

Run:

```powershell
pnpm content:check
pnpm test -- tests/content tests/integration/judge-learning-loop.test.ts
pnpm typecheck
pnpm build
```

Expected: all commands exit with code 0 and the content bundle contains 32 concepts and at least 128 problems.

- [ ] **Step 5: Commit**

```powershell
git add src/features/learning/content src/features/learning/store/create-default-session.ts tests/content tests/integration/judge-learning-loop.test.ts
git commit -m "feat: freeze the complete learning path"
```
