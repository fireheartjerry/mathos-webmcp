# Adaptive Learning Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public deterministic engine that diagnoses work, changes the path, creates fresh problems, and records immediate transfer evidence.

**Architecture:** Immutable TypeScript domain functions own all educational decisions. A revisioned store serializes commands, rejects stale work, and persists one versioned session. The implementation uses ideas from the pre-existing Mathos adaptive prototype, but it contains new challenge-period TypeScript code and broader curriculum semantics.

**Tech Stack:** TypeScript 7.0.2, Zod 4.4.3, CortexJS Compute Engine 0.119.0, fast-check 4.9.0, Vitest 4.1.11, React 19.2.8.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Keep all domain functions deterministic for the same session and problem seed.
- Use immutable session values.
- Never infer a diagnosis from free-form learner prose.
- Return `undecided` when the bounded verifier cannot decide.
- Never serialize a hidden target answer into a WebMCP projection.
- A successful write increments the revision exactly once.
- A failed, stale, duplicate, or canceled write does not change domain state.
- A completed command resolves after subscribers receive the new state.
- Preserve the immediate-transfer limitation in every receipt.

---

### Task 1: Define the domain types and runtime schemas

**Files:**
- Create: `src/features/learning/domain/ids.ts`
- Create: `src/features/learning/domain/types.ts`
- Create: `src/features/learning/domain/schemas.ts`
- Create: `src/features/learning/domain/errors.ts`
- Test: `tests/unit/domain-schemas.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `SESSION_SCHEMA_VERSION` from the foundation plan.
- Produces: branded IDs, `LearningSession`, `LearningCommand`, `CommandResult`, and Zod schemas.

- [ ] **Step 1: Add engine dependencies**

Add these exact packages:

```json
{
  "dependencies": {
    "@cortex-js/compute-engine": "0.119.0",
    "mathlive": "0.110.0"
  },
  "devDependencies": {
    "fast-check": "4.9.0"
  }
}
```

- [ ] **Step 2: Write the failing schema test**

```ts
it("rejects a session with a negative revision", () => {
  const parsed = LearningSessionSchema.safeParse({
    ...VALID_SESSION,
    revision: -1,
  });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 3: Run the test and observe missing schemas**

Run: `pnpm test -- tests/unit/domain-schemas.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 4: Add branded identifiers**

```ts
declare const brand: unique symbol;
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type ConceptId = Brand<string, "ConceptId">;
export type ProblemId = Brand<string, "ProblemId">;
export type ProblemFamilyId = Brand<string, "ProblemFamilyId">;
export type MisconceptionId = Brand<string, "MisconceptionId">;
export type DiagnosisId = Brand<string, "DiagnosisId">;
export type LessonId = Brand<string, "LessonId">;
export type ReceiptId = Brand<string, "ReceiptId">;
```

- [ ] **Step 5: Add the locked domain types**

Define the master-plan interfaces plus these types:

```ts
export type ProblemKind =
  | "math-expression"
  | "number"
  | "choice"
  | "matrix"
  | "ordered-items"
  | "graph-path"
  | "attention-grid"
  | "training-action";

export interface AttemptState {
  readonly problemId: ProblemId;
  readonly input: AttemptInput;
  readonly fingerprint: string;
  readonly parseable: boolean;
}

export interface ConceptEvidence {
  readonly pKnow: number;
  readonly observations: number;
  readonly transferPasses: number;
  readonly status: "locked" | "ready" | "active" | "supported" | "passed";
}
```

- [ ] **Step 6: Add runtime validation**

Use closed Zod objects. Reject unknown keys from sessions, commands, content, and API inputs.

- [ ] **Step 7: Pass schema tests**

Run: `pnpm test -- tests/unit/domain-schemas.test.ts`

Expected: PASS for valid fixtures and rejection of negative revisions, unknown phases, missing IDs, and unknown keys.

- [ ] **Step 8: Commit**

```powershell
git add package.json pnpm-lock.yaml src/features/learning/domain tests/unit/domain-schemas.test.ts
git commit -m "feat: define the learning domain contract"
```

### Task 2: Build and validate the prerequisite graph

**Files:**
- Create: `src/features/learning/domain/graph.ts`
- Test: `tests/unit/graph.test.ts`
- Test: `tests/unit/graph.property.test.ts`

**Interfaces:**
- Consumes: `ConceptId` and `Concept`.
- Produces: `createConceptGraph`, `topologicalOrder`, `ancestorsOf`, `nextUnmetPrerequisite`, and `validateConceptGraph`.

- [ ] **Step 1: Write graph tests**

```ts
it("places every prerequisite before its concept", () => {
  const order = topologicalOrder(TEST_GRAPH);
  const position = new Map(order.map((id, index) => [id, index]));
  for (const concept of TEST_GRAPH.concepts.values()) {
    for (const prerequisiteId of concept.prerequisiteIds) {
      expect(position.get(prerequisiteId)).toBeLessThan(position.get(concept.id));
    }
  }
});

it("rejects a prerequisite cycle", () => {
  expect(() => createConceptGraph(CYCLIC_CONCEPTS)).toThrowError("CONCEPT_GRAPH_CYCLE");
});
```

- [ ] **Step 2: Run tests and observe missing graph functions**

Run: `pnpm test -- tests/unit/graph.test.ts`

Expected: FAIL because `graph.ts` does not exist.

- [ ] **Step 3: Implement the graph interface**

```ts
export interface ConceptGraph {
  readonly concepts: ReadonlyMap<ConceptId, Concept>;
  readonly dependents: ReadonlyMap<ConceptId, readonly ConceptId[]>;
  readonly order: readonly ConceptId[];
}

export function nextUnmetPrerequisite(
  graph: ConceptGraph,
  targetId: ConceptId,
  evidence: Readonly<Record<ConceptId, ConceptEvidence>>,
  gate = 0.6,
): ConceptId | null;
```

Use a depth-first cycle check and a stable topological order based on source-array order.

- [ ] **Step 4: Add property tests**

Use fast-check to generate acyclic graphs. Assert that every edge respects the returned order and every ancestor exists.

- [ ] **Step 5: Pass graph tests**

Run: `pnpm test -- tests/unit/graph.test.ts tests/unit/graph.property.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/learning/domain/graph.ts tests/unit/graph*
git commit -m "feat: add prerequisite graph operations"
```

### Task 3: Implement knowledge evidence and misconception heat

**Files:**
- Create: `src/features/learning/domain/knowledge.ts`
- Create: `src/features/learning/domain/misconception-heat.ts`
- Test: `tests/unit/knowledge.test.ts`
- Test: `tests/unit/misconception-heat.test.ts`

**Interfaces:**
- Consumes: `ConceptEvidence`, `AttemptOutcome`, and `MisconceptionId`.
- Produces: `updateKnowledge`, `predictedSuccess`, `updateHeat`, and `activeRemediation`.

- [ ] **Step 1: Write exact BKT tests**

```ts
const parameters = { pInit: 0.35, pLearn: 0.12, pSlip: 0.1, pGuess: 0.15 };

it("raises knowledge after correct evidence", () => {
  const next = updateKnowledge(0.35, "correct", parameters);
  expect(next).toBeGreaterThan(0.35);
  expect(next).toBeLessThanOrEqual(1);
});

it("does not change knowledge for undecided evidence", () => {
  expect(updateKnowledge(0.35, "undecided", parameters)).toBe(0.35);
});
```

- [ ] **Step 2: Write misconception-heat tests**

Use decay `0.8`, evidence increment `1`, and remediation threshold `2.5`.

Assert that three repeated evidence items activate remediation and unrelated evidence does not.

- [ ] **Step 3: Run tests and observe missing functions**

Run: `pnpm test -- tests/unit/knowledge.test.ts tests/unit/misconception-heat.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the BKT update**

```ts
export function updateKnowledge(
  prior: number,
  outcome: AttemptOutcome,
  parameters: BktParameters,
): number {
  if (outcome === "undecided") return prior;
  const likelihoodKnown = outcome === "correct" ? 1 - parameters.pSlip : parameters.pSlip;
  const likelihoodUnknown = outcome === "correct" ? parameters.pGuess : 1 - parameters.pGuess;
  const posterior =
    (prior * likelihoodKnown) /
    (prior * likelihoodKnown + (1 - prior) * likelihoodUnknown);
  return posterior + (1 - posterior) * parameters.pLearn;
}
```

- [ ] **Step 5: Implement heat with deterministic tie-breaking**

When two misconceptions cross the threshold, choose the higher heat. Break equal heat by the content-array order.

- [ ] **Step 6: Pass the evidence tests**

Run: `pnpm test -- tests/unit/knowledge.test.ts tests/unit/misconception-heat.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/learning/domain/knowledge.ts src/features/learning/domain/misconception-heat.ts tests/unit/knowledge.test.ts tests/unit/misconception-heat.test.ts
git commit -m "feat: track learning evidence and misconception heat"
```

### Task 4: Build bounded answer verification

**Files:**
- Create: `src/features/learning/expression/restricted-ast.ts`
- Create: `src/features/learning/expression/parse.ts`
- Create: `src/features/learning/expression/fingerprint.ts`
- Create: `src/features/learning/expression/verify-expression.ts`
- Create: `src/features/learning/domain/verify-attempt.ts`
- Test: `tests/unit/expression-parser.test.ts`
- Test: `tests/unit/verifier.test.ts`
- Test: `tests/unit/verifier.property.test.ts`

**Interfaces:**
- Consumes: `Problem`, `AttemptInput`, and CortexJS.
- Produces: `verifyAttempt(problem, input): VerificationResult`.

- [ ] **Step 1: Define the result**

```ts
export interface VerificationResult {
  readonly outcome: AttemptOutcome;
  readonly route: "exact" | "symbolic" | "numeric" | "structured" | "none";
  readonly attemptFingerprint: string;
  readonly evidence: readonly string[];
  readonly matchedDistractorId: string | null;
}
```

- [ ] **Step 2: Write expression tests**

Cover these exact cases:

- `4x^3` matches `x^3 * 4`.
- `cos(3x)` does not match `3cos(3x)`.
- Unsupported assignments return `undecided`.
- A malformed expression returns `undecided` and never throws.
- Equivalent random polynomials match at deterministic sample points.
- Non-equivalent polynomials produce at least one bounded counterexample.

- [ ] **Step 3: Write structured-answer tests**

Cover number tolerance, exact choice, matrix shape and values, ordered item IDs, graph-edge sets, attention-grid cells, and training actions.

- [ ] **Step 4: Run tests and observe missing verifier modules**

Run: `pnpm test -- tests/unit/expression-parser.test.ts tests/unit/verifier.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement the restricted expression path**

Accept only numbers, symbols from the problem allowlist, arithmetic, integer powers, parentheses, and approved functions.

Use CortexJS for canonical simplification. Use deterministic numeric samples as an independent route.

- [ ] **Step 6: Implement canonical fingerprints**

Hash normalized attempt data with SHA-256 in the browser. Return only the first 16 hexadecimal characters in public projections.

- [ ] **Step 7: Add property tests**

Generate safe small polynomials. Assert reflexivity, symmetry, and deterministic fingerprints.

- [ ] **Step 8: Pass all verifier tests**

Run: `pnpm test -- tests/unit/expression-parser.test.ts tests/unit/verifier.test.ts tests/unit/verifier.property.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/features/learning/expression src/features/learning/domain/verify-attempt.ts tests/unit/expression-parser.test.ts tests/unit/verifier*
git commit -m "feat: add bounded attempt verification"
```

### Task 5: Implement diagnosis and lesson selection

**Files:**
- Create: `src/features/learning/domain/diagnose.ts`
- Create: `src/features/learning/domain/select-lesson.ts`
- Test: `tests/unit/diagnose.test.ts`
- Test: `tests/unit/select-lesson.test.ts`

**Interfaces:**
- Consumes: `VerificationResult`, problem distractor rules, misconception definitions, and lesson definitions.
- Produces: `diagnoseAttempt` and `selectLesson`.

- [ ] **Step 1: Write diagnosis tests**

```ts
it("uses a matched distractor before a residual rule", () => {
  const diagnosis = diagnoseAttempt(problem, verification, CONTENT);
  expect(diagnosis?.misconceptionId).toBe("shared-path-omission");
  expect(diagnosis?.confidence).toBe("exact");
});

it("does not guess when verification is undecided", () => {
  expect(diagnoseAttempt(problem, UNDECIDED, CONTENT)).toBeNull();
});
```

- [ ] **Step 2: Run tests and observe missing functions**

Run: `pnpm test -- tests/unit/diagnose.test.ts tests/unit/select-lesson.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement diagnosis order**

Use this fixed order:

1. Exact distractor match
2. Structured residual rule
3. Generic incorrect result
4. No diagnosis for undecided input

- [ ] **Step 4: Implement lesson selection**

Map a diagnosis to one local lesson and one optional `videoKey`. A correct diagnostic maps to a short bridge lesson without a video request.

- [ ] **Step 5: Pass diagnosis tests**

Run: `pnpm test -- tests/unit/diagnose.test.ts tests/unit/select-lesson.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/learning/domain/diagnose.ts src/features/learning/domain/select-lesson.ts tests/unit/diagnose.test.ts tests/unit/select-lesson.test.ts
git commit -m "feat: map evidence to focused lessons"
```

### Task 6: Implement route selection and fresh transfer generation

**Files:**
- Create: `src/features/learning/domain/route.ts`
- Create: `src/features/learning/domain/transfer.ts`
- Test: `tests/unit/route.test.ts`
- Test: `tests/unit/transfer.test.ts`
- Test: `tests/unit/transfer.property.test.ts`

**Interfaces:**
- Consumes: the concept graph, evidence, misconception heat, problem families, and session seed.
- Produces: `selectNextConcept` and `generateTransferProblem`.

- [ ] **Step 1: Write route tests**

Assert this priority order:

1. Finish the current transfer.
2. Route to the active root misconception when heat reaches `2.5`.
3. Select the nearest unmet prerequisite for the goal.
4. Select the ready concept with the lowest predicted success.
5. Skip a concept with passed transfer evidence.

- [ ] **Step 2: Write transfer invariants**

```ts
it("creates a new problem after the lesson revision", () => {
  const transfer = generateTransferProblem(context);
  expect(transfer.problem.id).not.toBe(context.seedProblem.id);
  expect(transfer.problem.familyId).toBe(context.seedProblem.familyId);
  expect(transfer.generatedAtRevision).toBeGreaterThan(context.lessonRevision);
  expect(transfer.problem.publicData).not.toHaveProperty("expectedAnswer");
});
```

- [ ] **Step 3: Run tests and observe missing routing modules**

Run: `pnpm test -- tests/unit/route.test.ts tests/unit/transfer.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement deterministic selection**

Seed selection with `SHA-256(sessionId + diagnosisId + lessonId + lessonRevision + familyId)`.

Reject a generated item when its problem ID, parameter fingerprint, or target fingerprint matches the seed item.

- [ ] **Step 5: Add property tests**

Generate many session IDs and assert stable output, fresh IDs, bounded parameters, and no hidden answer in public data.

- [ ] **Step 6: Pass route and transfer tests**

Run: `pnpm test -- tests/unit/route.test.ts tests/unit/transfer.test.ts tests/unit/transfer.property.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/learning/domain/route.ts src/features/learning/domain/transfer.ts tests/unit/route.test.ts tests/unit/transfer*
git commit -m "feat: route learners and create fresh transfer"
```

### Task 7: Build receipts and the revisioned session reducer

**Files:**
- Create: `src/features/learning/domain/receipt.ts`
- Create: `src/features/learning/domain/session.ts`
- Create: `src/features/learning/domain/reducer.ts`
- Create: `src/features/learning/domain/project-workspace.ts`
- Test: `tests/unit/receipt.test.ts`
- Test: `tests/unit/reducer.test.ts`
- Test: `tests/unit/projection.test.ts`

**Interfaces:**
- Consumes: every domain function from Tasks 1 through 6.
- Produces: `createSession`, `reduceCommand`, `projectWorkspace`, and `projectReceipt`.

- [ ] **Step 1: Write reducer phase tests**

Cover this exact sequence:

```text
diagnostic --CHECK_ATTEMPT--> diagnosed
diagnosed --SHOW_LESSON--> lesson
lesson --START_TRANSFER--> transfer
transfer --CHECK_ATTEMPT(correct)--> receipt
receipt --CONTINUE_PATH--> diagnostic
```

Assert that wrong transfer evidence remains in `transfer` and increments the revision once.

Both the human submit button and WebMCP supply `attempt` on `CHECK_ATTEMPT`. Assert that the reducer parses and fingerprints that command input atomically; no earlier `SET_ATTEMPT` state mutation exists.

- [ ] **Step 2: Write atomicity tests**

Assert that stale revisions, duplicate request IDs, invalid phases, empty attempts, undecided checks, and aborts do not mutate the session.

- [ ] **Step 3: Write receipt tests**

```ts
expect(receipt.claim).toBe(
  "The learner solved a fresh problem after the lesson during this session.",
);
expect(receipt.limitation).toBe(
  "This receipt does not prove permanent mastery.",
);
```

- [ ] **Step 4: Write projection tests**

Assert that `projectWorkspace` contains a problem display, attempt presence, fingerprint, phase, revision, and next actions.

Assert that it contains no raw attempt, expected answer, private video prompt, or service URL.

- [ ] **Step 5: Run tests and observe missing reducer modules**

Run: `pnpm test -- tests/unit/receipt.test.ts tests/unit/reducer.test.ts tests/unit/projection.test.ts`

Expected: FAIL.

- [ ] **Step 6: Implement the reducer**

Use a switch on `LearningCommand.type`. Validate phase, revision, request ID, and bounded `attempt` before any domain calculation. Construct `AttemptState` inside the successful `CHECK_ATTEMPT` transaction so a rejected or aborted check cannot leave a half-committed attempt.

Store the final `CommandResult` under `requestCache[requestId]` only after a successful commit.

- [ ] **Step 7: Pass reducer tests**

Run: `pnpm test -- tests/unit/receipt.test.ts tests/unit/reducer.test.ts tests/unit/projection.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/features/learning/domain/receipt.ts src/features/learning/domain/session.ts src/features/learning/domain/reducer.ts src/features/learning/domain/project-workspace.ts tests/unit/receipt.test.ts tests/unit/reducer.test.ts tests/unit/projection.test.ts
git commit -m "feat: add revisioned learning sessions"
```

### Task 8: Build the store, persistence, and React binding

**Files:**
- Create: `src/features/learning/store/create-learning-store.ts`
- Create: `src/features/learning/store/persistence.ts`
- Create: `src/features/learning/store/use-learning-store.ts`
- Create: `src/features/learning/store/create-default-session.ts`
- Modify: `src/features/learning/ui/LearningStudio.tsx`
- Test: `tests/unit/learning-store.test.ts`
- Test: `tests/integration/session-restore.test.tsx`

**Interfaces:**
- Consumes: `LearningSession`, `LearningCommand`, and `reduceCommand`.
- Produces: `createLearningStore`, `loadSession`, `saveSession`, and `useLearningSession`.

- [ ] **Step 1: Write serialization tests**

Assert that a saved and loaded session keeps the same session ID, phase, revision, transfer seed, receipt, and request cache.

Assert that an unknown schema version creates a clean new session and preserves no invalid data.

- [ ] **Step 2: Write dispatch-order tests**

Dispatch two writes at the same revision. Assert that the first valid write commits and the second returns `STALE_REVISION`.

- [ ] **Step 3: Run tests and observe missing store modules**

Run: `pnpm test -- tests/unit/learning-store.test.ts tests/integration/session-restore.test.tsx`

Expected: FAIL.

- [ ] **Step 4: Implement one serialized command queue**

```ts
export function createLearningStore(initial: LearningSession): LearningStore {
  let state = initial;
  let queue = Promise.resolve();
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(command, signal) {
      const work = queue.then(async () => {
        if (signal?.aborted) return abortedResult(state.revision);
        const reduced = reduceCommand(state, command);
        if (reduced.state !== state) {
          state = reduced.state;
          saveSession(state);
          listeners.forEach((listener) => listener());
          await Promise.resolve();
        }
        return reduced.result;
      });
      queue = work.then(() => undefined, () => undefined);
      return work;
    },
  };
}
```

- [ ] **Step 5: Connect the studio to the store**

Replace the visual fixture at runtime with `createDefaultSession()` and `useSyncExternalStore`.

Keep the fixture for Storybook-free component tests only.

- [ ] **Step 6: Pass store and restore tests**

Run: `pnpm test -- tests/unit/learning-store.test.ts tests/integration/session-restore.test.tsx`

Expected: PASS.

- [ ] **Step 7: Run the full engine gate**

Run:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits with code 0.

- [ ] **Step 8: Commit**

```powershell
git add src/features/learning/store src/features/learning/ui/LearningStudio.tsx tests/unit/learning-store.test.ts tests/integration/session-restore.test.tsx
git commit -m "feat: persist the adaptive learning session"
```
