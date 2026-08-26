# Tiny Transformer Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the learner train, inspect, sample, and debug a real small causal transformer in the browser.

**Architecture:** A lazy-loaded TensorFlow.js module owns a one-block character transformer with trainable embeddings, masked self-attention, residual paths, layer normalization, and a feed-forward network. A React lab presents real loss, samples, parameter changes, and attention values while mapping each part back to the concepts the learner mastered.

**Tech Stack:** React 19.2.8, TypeScript 7.0.2, TensorFlow.js 4.22.0, TensorFlow.js WebGPU 4.22.0, SVG, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Train an actual model. Never animate invented loss, samples, attention, or progress.
- Keep the model small enough to run on judge hardware without a server GPU.
- Lazy-load TensorFlow.js only when the learner opens the lab.
- Prefer WebGPU, fall back to WebGL, then CPU.
- Yield to the browser between training chunks.
- Dispose temporary tensors in every forward and training path.
- A backend failure must preserve the rest of the learning product.
- Explain every control and measurement in pragmatic Simple English.
- Use only a self-authored corpus committed in the repository.
- Do not claim that this model is useful at production scale.

---

## Locked Model

```ts
export interface TinyTransformerConfig {
  vocabularySize: number;
  contextLength: 16;
  dModel: 24;
  heads: 2;
  dHead: 12;
  feedForwardWidth: 48;
  seed: 7;
}

export const DEFAULT_TRANSFORMER_CONFIG = {
  contextLength: 16,
  dModel: 24,
  heads: 2,
  dHead: 12,
  feedForwardWidth: 48,
  seed: 7,
} as const;
```

The trainable path is:

```text
character IDs
→ token embedding + position embedding
→ pre-layer normalization
→ Q, K, V projections
→ two-head causal attention
→ output projection + residual
→ pre-layer normalization
→ 24 → 48 → 24 feed-forward network + residual
→ vocabulary logits
→ sparse cross-entropy loss
```

The browser uses Adam with learning rate `0.003`, batches of `16`, and training chunks of `10` steps. The default demo trains for `120` steps. The user can continue to `400` steps, reset with seed `7`, pause between chunks, and change sampling temperature between `0.2` and `1.2`.

---

### Task 1: Add and validate the self-authored character corpus

**Files:**

- Create: `public/transformer/tiny-corpus.txt`
- Create: `src/features/transformer/data/corpus.ts`
- Test: `src/features/transformer/data/corpus.test.ts`

- [ ] **Step 1: Write the failing corpus tests**

```ts
import { describe, expect, it } from "vitest";
import { buildCharacterDataset, createVocabulary } from "./corpus";

describe("transformer corpus", () => {
  it("builds reversible character IDs", () => {
    const vocabulary = createVocabulary("path and attention\n");
    const ids = vocabulary.encode("path");
    expect(vocabulary.decode(ids)).toBe("path");
  });

  it("creates shifted input and target windows", () => {
    const dataset = buildCharacterDataset("abcdef", 3);
    expect(dataset.examples[0]).toEqual({ input: [0, 1, 2], target: [1, 2, 3] });
  });

  it("rejects a corpus that is too short", () => {
    expect(() => buildCharacterDataset("short", 16)).toThrow("Corpus needs at least 17 characters.");
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `pnpm vitest run src/features/transformer/data/corpus.test.ts`

Expected: FAIL because `corpus.ts` does not exist.

- [ ] **Step 3: Write the corpus and implementation**

Commit a UTF-8 corpus made from short original statements such as these, with varied ordering and repetition so the training data exceeds 4,000 characters:

```text
change follows a path.
a gradient tells us how change flows.
tokens become vectors.
attention mixes useful context.
a residual path keeps information moving.
training changes weights to lower loss.
```

Implement a vocabulary sorted by Unicode code point. Reserve no magic IDs: every corpus character is explicit. `buildCharacterDataset()` must enumerate every valid length-16 window and its one-character-shifted target.

- [ ] **Step 4: Run the focused test**

Run: `pnpm vitest run src/features/transformer/data/corpus.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/transformer/tiny-corpus.txt src/features/transformer/data
git commit -m "feat: add tiny transformer training corpus"
```

---

### Task 2: Select a TensorFlow.js backend safely

**Files:**

- Create: `src/features/transformer/runtime/backend.ts`
- Test: `src/features/transformer/runtime/backend.test.ts`

- [ ] **Step 1: Write backend selection tests**

Test the exported function through an injected runtime so unit tests do not require a real GPU:

```ts
export interface TensorRuntime {
  setBackend(name: "webgpu" | "webgl" | "cpu"): Promise<boolean>;
  ready(): Promise<void>;
  getBackend(): string;
}

export type BackendResult =
  | { status: "ready"; backend: "webgpu" | "webgl" | "cpu" }
  | { status: "unavailable"; message: string };
```

Cover: WebGPU success, WebGPU rejection followed by WebGL success, CPU fallback, all backends unavailable, and abort before the next attempt.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm vitest run src/features/transformer/runtime/backend.test.ts`

Expected: FAIL because the backend selector is missing.

- [ ] **Step 3: Implement ordered selection**

`selectTensorBackend(runtime, signal)` must try `webgpu`, `webgl`, and `cpu` in that order. It catches each backend-specific error, calls `runtime.ready()` only after a successful `setBackend`, checks `signal.aborted` between attempts, and returns one plain failure message after all attempts.

- [ ] **Step 4: Run the focused test**

Run: `pnpm vitest run src/features/transformer/runtime/backend.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/transformer/runtime
git commit -m "feat: add resilient tensor backend selection"
```

---

### Task 3: Implement the real causal transformer

**Files:**

- Create: `src/features/transformer/model/types.ts`
- Create: `src/features/transformer/model/initializers.ts`
- Create: `src/features/transformer/model/causal-mask.ts`
- Create: `src/features/transformer/model/tiny-transformer.ts`
- Test: `src/features/transformer/model/causal-mask.test.ts`
- Test: `src/features/transformer/model/tiny-transformer.test.ts`

- [ ] **Step 1: Write the causal-mask tests**

For a four-token sequence, assert that token zero can attend only to zero, token one can attend to zero and one, and no row can see a later column. Use `0` for visible positions and `-1e9` for blocked logits.

- [ ] **Step 2: Write model contract tests**

```ts
export interface ForwardResult {
  logits: import("@tensorflow/tfjs").Tensor3D;
  attention: import("@tensorflow/tfjs").Tensor4D;
}

export interface TinyTransformer {
  readonly config: TinyTransformerConfig;
  readonly trainableVariables: readonly import("@tensorflow/tfjs").Variable[];
  forward(inputIds: import("@tensorflow/tfjs").Tensor2D): ForwardResult;
  dispose(): void;
}
```

Assert shapes `[batch, 16, vocabularySize]` and `[batch, 2, 16, 16]`, finite logits, causal attention, deterministic initialization for seed `7`, different weights for seed `8`, and complete variable disposal.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `pnpm vitest run src/features/transformer/model`

Expected: FAIL because the model files are missing.

- [ ] **Step 4: Implement seeded variables and the forward pass**

Create trainable variables for:

- token embedding `[vocabularySize, 24]`
- position embedding `[16, 24]`
- first layer-normalization scale and bias `[24]`
- Q, K, V, and attention-output weights `[24, 24]`
- second layer-normalization scale and bias `[24]`
- feed-forward weights `[24, 48]` and `[48, 24]`, with biases
- final layer-normalization scale and bias `[24]`
- language-model head `[24, vocabularySize]` and bias

Use a seeded Glorot initializer and `epsilon = 1e-5`. Split Q, K, and V into two 12-wide heads. Scale attention logits by `sqrt(12)`, add the causal mask, apply softmax, and merge the heads. Use GELU in the feed-forward network. Wrap temporary operations in `tf.tidy()`, but return the logits and attention tensors to the caller for explicit disposal.

- [ ] **Step 5: Run the focused tests**

Run: `pnpm vitest run src/features/transformer/model`

Expected: PASS with no leaked tensors across 25 forwards.

- [ ] **Step 6: Commit**

```bash
git add src/features/transformer/model
git commit -m "feat: implement causal tiny transformer"
```

---

### Task 4: Train, sample, and expose truthful measurements

**Files:**

- Create: `src/features/transformer/training/batches.ts`
- Create: `src/features/transformer/training/trainer.ts`
- Create: `src/features/transformer/training/sample.ts`
- Test: `src/features/transformer/training/trainer.test.ts`
- Test: `src/features/transformer/training/sample.test.ts`

- [ ] **Step 1: Write training behavior tests**

```ts
export interface TrainingSnapshot {
  step: number;
  loss: number;
  parameterDelta: number;
  sample: string;
  attention: number[][][];
}

export interface TrainingOptions {
  steps: number;
  batchSize: 16;
  learningRate: 0.003;
  sampleEvery: 10;
  temperature: number;
  seed: number;
  signal: AbortSignal;
  onSnapshot(snapshot: TrainingSnapshot): void;
}
```

Assert that a seeded 40-step run updates parameters, produces only finite losses, lowers the average loss over the final five steps below the first five, emits actual snapshots at the requested interval, and stops before another optimizer step after abort.

- [ ] **Step 2: Write sampling tests**

Assert that sampling never emits an unknown character, seed plus temperature produces repeatable output, and the prompt is cropped or left-padded to 16 characters before each next-token prediction.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `pnpm vitest run src/features/transformer/training`

Expected: FAIL because the trainer and sampler are missing.

- [ ] **Step 4: Implement deterministic batching and training**

Shuffle example indices with a local seeded generator, not `Math.random()`. Calculate sparse categorical cross-entropy over all 16 target positions. Use `tf.variableGrads()` and Adam. Calculate `parameterDelta` from a fixed probe variable before and after the step. Capture the last token's two-head attention matrix from the real forward pass.

After each 10-step chunk, call `await tf.nextFrame()`, publish a snapshot, and check the abort signal. Dispose gradients, labels, inputs, logits, attention, loss tensors, and optimizer slots when the lab resets.

- [ ] **Step 5: Implement autoregressive sampling**

Start from the visible user prompt or the corpus prefix `"change "`. Divide the final-position logits by temperature, sample with the seeded random source, decode the selected character, append it, and repeat for 80 characters. Return the literal model output without spelling cleanup.

- [ ] **Step 6: Run the focused tests**

Run: `pnpm vitest run src/features/transformer/training`

Expected: PASS. The loss assertion uses the aggregate windows so one noisy step does not make the test flaky.

- [ ] **Step 7: Commit**

```bash
git add src/features/transformer/training
git commit -m "feat: train and sample tiny transformer in browser"
```

---

### Task 5: Connect transformer actions to learning evidence

**Files:**

- Create: `src/features/transformer/integration/learning-bridge.ts`
- Modify: `src/features/learning/domain/types.ts`
- Modify: `src/features/learning/domain/reducer.ts`
- Modify: `src/features/learning/domain/receipt.ts`
- Test: `src/features/transformer/integration/learning-bridge.test.ts`

- [ ] **Step 1: Write the failing bridge tests**

Cover these evidence events:

- `transformer_lab_opened`
- `transformer_training_started`
- `transformer_loss_reduced`
- `transformer_attention_inspected`
- `transformer_sample_compared`
- `transformer_debug_explanation_completed`

Assert that only real snapshots can create `transformer_loss_reduced`, that its `beforeLoss` and `afterLoss` match measured values, and that opening the panel alone never marks the final concept complete.

- [ ] **Step 2: Run the test and confirm failure**

Run: `pnpm vitest run src/features/transformer/integration/learning-bridge.test.ts`

Expected: FAIL because the bridge and events do not exist.

- [ ] **Step 3: Implement the bridge**

Map model observations to domain commands without importing React. A loss-reduction observation is valid only when at least 30 real steps exist and the mean of the last five finite losses is below the mean of the first five. The receipt wording must say, “You trained this small model and lowered its measured loss in this session.”

- [ ] **Step 4: Run engine and bridge tests**

Run: `pnpm vitest run src/features/learning src/features/transformer/integration`

Expected: PASS without changing existing learning-route results.

- [ ] **Step 5: Commit**

```bash
git add src/features/learning/domain src/features/transformer/integration
git commit -m "feat: connect transformer work to learning evidence"
```

---

### Task 6: Build the educational transformer lab interface

**Files:**

- Create: `src/features/transformer/ui/TransformerLab.tsx`
- Create: `src/features/transformer/ui/ModelMap.tsx`
- Create: `src/features/transformer/ui/LossChart.tsx`
- Create: `src/features/transformer/ui/AttentionMap.tsx`
- Create: `src/features/transformer/ui/SamplePanel.tsx`
- Create: `src/features/transformer/ui/TransformerLab.css`
- Create: `src/features/transformer/ui/transformer-copy.ts`
- Test: `src/features/transformer/ui/TransformerLab.test.tsx`
- Modify: `src/features/learning/ui/LearningStudio.tsx`

- [ ] **Step 1: Write the interaction tests**

Mock only the tensor runtime boundary. Verify:

- opening the lab starts the lazy import but not training
- the start button shows the actual selected backend
- pause stops at a chunk boundary
- reset disposes the model and restores step zero
- loss chart values exactly match snapshots
- attention cells have accessible row and column labels
- sample output is labeled “the model's raw sample”
- unavailable backends show a local explanation and leave the rest of the studio usable
- reduced motion removes animated chart interpolation

- [ ] **Step 2: Run the component test and confirm failure**

Run: `pnpm vitest run src/features/transformer/ui/TransformerLab.test.tsx`

Expected: FAIL because the UI is missing.

- [ ] **Step 3: Build the model map and controls**

The model map presents six connected stations:

1. characters become vectors
2. position adds order
3. attention mixes earlier context
4. residual paths carry information
5. the feed-forward layer transforms each position
6. loss changes the weights

Selecting a station must show one learned prerequisite, one live measurement from the model, and one plain-language explanation. Keep technical labels visible so the product teaches rather than hides the mechanism.

- [ ] **Step 4: Build truthful visualizations**

Use an SVG polyline for measured loss with labeled axes and exact values in an accessible table. Render the selected head's 16×16 attention as CSS-grid cells with numeric values available to assistive technology. Show “not measured yet” until a real forward pass exists. Never extrapolate the curve.

- [ ] **Step 5: Build sampling and debugging controls**

Let the learner enter up to 32 known-corpus characters, set temperature, and request 80 new characters. Add a guided prompt that asks why a high-temperature sample is less stable and checks a structured choice through the learning engine. Do not let a chat response stand in for the checked answer.

- [ ] **Step 6: Run the component tests**

Run: `pnpm vitest run src/features/transformer/ui/TransformerLab.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/transformer/ui src/features/learning/ui/LearningStudio.tsx
git commit -m "feat: add educational transformer lab"
```

---

### Task 7: Prove that the lab is real, responsive, and leak-free

**Files:**

- Create: `tests/e2e/transformer-lab.spec.ts`
- Create: `tests/e2e/transformer-lab-fallback.spec.ts`
- Create: `scripts/profile-transformer.mjs`
- Modify: `package.json`
- Create: `README.md`

- [ ] **Step 1: Add a real-browser smoke test**

The Playwright test must open the lab, record step zero, run 30 steps, assert that the step and measured loss changed, inspect both attention heads, generate a raw sample, pause, and reset. It must not stub model outputs.

- [ ] **Step 2: Add fallback coverage**

Run one project with WebGPU disabled and assert WebGL or CPU selection. In a second controlled test, make all backend selection fail and assert that the studio's non-transformer learning actions still work.

- [ ] **Step 3: Add the memory profile script**

`profile-transformer.mjs` launches Chromium, warms the model, records `tf.memory().numTensors`, performs 100 training steps in ten chunks, then verifies that the count does not grow by more than the model's known persistent optimizer and variable allowance after garbage collection opportunities.

- [ ] **Step 4: Run the complete transformer gate**

Run:

```bash
pnpm vitest run src/features/transformer
pnpm playwright test tests/e2e/transformer-lab.spec.ts tests/e2e/transformer-lab-fallback.spec.ts
pnpm transformer:profile
pnpm build
```

Expected: all commands pass; the production build does not place TensorFlow.js in the initial landing-page JavaScript chunk.

- [ ] **Step 5: Document honest limitations**

README language must state that this is a small educational character model trained in the browser, the default run is short, output quality varies by backend and run length, and the result demonstrates the complete mechanism rather than production language ability.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/transformer-lab* scripts/profile-transformer.mjs package.json README.md
git commit -m "test: verify real transformer training flow"
```

---

## Transformer Lab Gate

Do not begin final integration until all statements are true:

- the model contains real trainable embeddings, attention, residual, feed-forward, and output weights
- causal masking tests prevent future-token attention
- a seeded training test lowers measured loss and changes parameters
- the browser displays only measured loss, samples, and attention
- the browser yields between training chunks
- WebGPU, WebGL, CPU, and total-failure paths are covered
- tensor counts remain bounded through repeated training
- TensorFlow.js is absent from the initial landing bundle
- learner evidence uses actual model observations
- all UI and documentation describe the model honestly
