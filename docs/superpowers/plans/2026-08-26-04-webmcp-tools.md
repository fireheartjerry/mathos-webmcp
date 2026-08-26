# WebMCP Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register five safe WebMCP tools that operate the live learning session and produce visible page changes.

**Architecture:** A small adapter projects the private session into bounded public results. Tool handlers call the same `LearningStore` commands as human controls. One module registers all five tools once after hydration and keeps them stable for the page lifetime.

**Tech Stack:** WebMCP imperative API, TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

**WebMCP source snapshot:** Implement against the W3C Community Group draft at `https://github.com/webmachinelearning/webmcp/blob/main/index.bs` as verified on 2026-08-26. Recheck the live draft during the real-browser gate because the API is experimental.

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Use `document.modelContext.registerTool()` directly.
- Register exactly five tools.
- Register the tools once after session hydration.
- Do not change the tool list during learning phases.
- Use closed JSON Schemas with `additionalProperties: false`.
- Keep every tool description distinct and outcome-based.
- Use `readOnlyHint` and `untrustedContentHint` accurately.
- Respect the execution `AbortSignal`.
- Never use page elements as tool business logic.
- Resolve write tools after the visible state commit.
- Keep human controls complete when WebMCP is unavailable.

---

## Locked Public Tool Surface

| Tool | Purpose | Annotation |
|---|---|---|
| `get_learning_workspace` | Read the current shared learning state | read-only, untrusted output |
| `check_current_attempt` | Submit and check an attempt in the visible problem | write, untrusted output |
| `show_targeted_lesson` | Show the committed focused lesson | write, trusted authored output |
| `start_transfer_problem` | Start a fresh problem after the lesson | write, trusted authored output |
| `get_learning_receipt` | Read completed transfer evidence | read-only, untrusted output |

---

### Task 1: Add browser types and tool envelopes

**Files:**
- Create: `src/features/webmcp/browser.d.ts`
- Create: `src/features/webmcp/types.ts`
- Create: `src/features/webmcp/envelope.ts`
- Create: `src/features/webmcp/schemas.ts`
- Test: `tests/webmcp/schemas.test.ts`

**Interfaces:**
- Consumes: `CommandResult`, workspace projection, and receipt projection.
- Produces: browser declarations, input types, JSON Schemas, and `ToolEnvelope`.

- [ ] **Step 1: Add the browser declaration**

```ts
interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ): Promise<unknown>;
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  getTools(options?: { fromOrigins?: string[] }): Promise<unknown[]>;
  executeTool(tool: unknown, input?: object, options?: { signal?: AbortSignal }): Promise<string>;
}

interface Document {
  readonly modelContext?: ModelContext;
}
```

- [ ] **Step 2: Define the public envelope**

```ts
export type ToolEnvelope<T> =
  | { ok: true; revision: number; activityId: string; data: T }
  | {
      ok: false;
      revision: number;
      error: { code: ErrorCode; message: string; recovery: string | null };
    };
```

- [ ] **Step 3: Write schema tests**

Assert exact tool names, tool-specific required fields, numeric revision bounds `0..1_000_000_000`, request ID pattern `^[A-Za-z0-9_-]{8,64}$`, attempt length `1..256`, branded-ID length `1..96`, and rejection of unknown keys.

- [ ] **Step 4: Run tests and observe missing schemas**

Run: `pnpm test -- tests/webmcp/schemas.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement the schemas**

Use this base shape for write tools and extend it into three closed schemas:

```ts
export const revisionedInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["expectedRevision", "requestId"],
  properties: {
    expectedRevision: { type: "integer", minimum: 0, maximum: 1_000_000_000 },
    requestId: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
  },
} as const;
```

`check_current_attempt` adds required string property `attempt` with `minLength: 1` and `maxLength: 256`. `show_targeted_lesson` adds required `diagnosisId`, and `start_transfer_problem` adds required `lessonId`; each ID has `minLength: 1` and `maxLength: 96`. The two read tools use a closed empty-object schema.

- [ ] **Step 6: Pass schema tests**

Run: `pnpm test -- tests/webmcp/schemas.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/webmcp/browser.d.ts src/features/webmcp/types.ts src/features/webmcp/envelope.ts src/features/webmcp/schemas.ts tests/webmcp/schemas.test.ts
git commit -m "feat: define the WebMCP public contract"
```

### Task 2: Implement the five handlers

**Files:**
- Create: `src/features/webmcp/handlers.ts`
- Create: `src/features/webmcp/descriptions.ts`
- Test: `tests/webmcp/handlers.test.ts`
- Test: `tests/webmcp/no-answer-leak.test.ts`

**Interfaces:**
- Consumes: `LearningStore`, `projectWorkspace`, `projectReceipt`, and the locked commands.
- Produces: `createToolHandlers(store): ToolHandlers`.

- [ ] **Step 1: Add exact descriptions**

```ts
export const TOOL_DESCRIPTIONS = {
  get_learning_workspace:
    "Read the current Mathos learning phase, problem, attempt status, revision, and valid next actions. This tool does not return a hidden answer.",
  check_current_attempt:
    "Submit and check an attempt for the current visible problem. This tool records a bounded result or uncertainty and updates the visible workspace.",
  show_targeted_lesson:
    "Show the focused lesson for the committed diagnosis. This tool can also start the related Mathos video request.",
  start_transfer_problem:
    "Start a fresh follow-up problem after the focused lesson is visible.",
  get_learning_receipt:
    "Read the completed immediate-transfer evidence and the recommended next learning step.",
} as const;
```

- [ ] **Step 2: Write handler-order tests**

Cover the correct order and these wrong orders:

- Show a lesson before a diagnosis
- Start transfer before a lesson
- Read a receipt before completion
- Check an empty attempt
- Repeat a successful request ID
- Use a stale revision
- Abort before dispatch

- [ ] **Step 3: Write no-leak tests**

Recursively scan every handler result. Fail if a key contains `answer`, `expected`, `solution`, `privatePrompt`, or `serviceUrl` before submission.

- [ ] **Step 4: Run tests and observe missing handlers**

Run: `pnpm test -- tests/webmcp/handlers.test.ts tests/webmcp/no-answer-leak.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement read handlers**

`get_learning_workspace` returns `projectWorkspace(store.getSnapshot())`.

`get_learning_receipt` returns `INVALID_PHASE` with one missing prerequisite when no receipt exists.

- [ ] **Step 6: Implement write handlers**

Validate input with Zod before dispatch. Pass the execution signal to `store.dispatch`.

Map `check_current_attempt` to `CHECK_ATTEMPT` with the supplied bounded `attempt`. Map `show_targeted_lesson` to `SHOW_LESSON` and `start_transfer_problem` to `START_TRANSFER`.

- [ ] **Step 7: Pass handler and leak tests**

Run: `pnpm test -- tests/webmcp/handlers.test.ts tests/webmcp/no-answer-leak.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/features/webmcp/handlers.ts src/features/webmcp/descriptions.ts tests/webmcp/handlers.test.ts tests/webmcp/no-answer-leak.test.ts
git commit -m "feat: connect WebMCP to learning commands"
```

### Task 3: Register tools once for the page lifetime

**Files:**
- Create: `src/features/webmcp/register-tools.ts`
- Create: `src/features/webmcp/support.ts`
- Modify: `src/features/learning/ui/LearningStudio.tsx`
- Test: `tests/webmcp/registration.test.ts`

**Interfaces:**
- Consumes: `createToolHandlers` and `LearningStore`.
- Produces: `registerLearningToolsOnce(store)` and `getWebMcpSupport()`.

- [ ] **Step 1: Write registration tests**

Assert that:

- Exactly five calls reach `registerTool`.
- A second call with the same store creates no new registration.
- A second call with another store throws `WEBMCP_STORE_CONFLICT`.
- Read and write annotations match the locked table.
- Each tool uses the exact name and description.
- The page-lifetime AbortController aborts on `pagehide`.

- [ ] **Step 2: Run tests and observe missing registration**

Run: `pnpm test -- tests/webmcp/registration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the singleton registration**

```ts
let active: {
  readonly store: LearningStore;
  readonly controller: AbortController;
  readonly ready: Promise<void>;
} | null = null;

export function registerLearningToolsOnce(store: LearningStore): Promise<void> {
  if (active?.store === store) return active.ready;
  if (active) throw new Error("WEBMCP_STORE_CONFLICT");
  if (!document.modelContext) return Promise.resolve();

  const controller = new AbortController();
  const ready = registerAll(document.modelContext, store, controller.signal);
  active = { store, controller, ready };
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
  return ready;
}
```

- [ ] **Step 4: Register all tools at the app root**

Call `registerLearningToolsOnce(store)` after persistence hydration. Do not register from child components.

- [ ] **Step 5: Show support state in the interface**

When WebMCP is absent, show: `Agent tools are unavailable in this browser. You can still use every learning control.`

When registration fails, show a non-blocking message in the activity bar and keep human controls active.

- [ ] **Step 6: Pass registration tests**

Run: `pnpm test -- tests/webmcp/registration.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/webmcp/register-tools.ts src/features/webmcp/support.ts src/features/learning/ui/LearningStudio.tsx tests/webmcp/registration.test.ts
git commit -m "feat: register five stable WebMCP tools"
```

### Task 4: Make human and agent actions visibly identical

**Files:**
- Create: `src/features/learning/ui/use-learning-actions.ts`
- Modify: `src/features/learning/ui/ProblemWorkspace.tsx`
- Modify: `src/features/learning/ui/LessonPanel.tsx`
- Modify: `src/features/learning/ui/ReceiptPanel.tsx`
- Modify: `src/features/learning/ui/ActivityBar.tsx`
- Test: `tests/integration/human-agent-parity.test.tsx`
- Test: `tests/browser/webmcp-visible-effects.spec.ts`

**Interfaces:**
- Consumes: `LearningStore.dispatch` and projected activity events.
- Produces: human action callbacks and visible activity rows.

- [ ] **Step 1: Write parity tests**

Run one flow through button callbacks and the same flow through tool handlers. Remove activity IDs and timestamps before comparison.

Assert identical phase, revision, diagnosis, lesson, transfer, concept evidence, and receipt.

- [ ] **Step 2: Run tests and observe parity failures**

Run: `pnpm test -- tests/integration/human-agent-parity.test.tsx`

Expected: FAIL because the UI still uses local fixture actions.

- [ ] **Step 3: Create shared action callbacks**

Every human button must dispatch a domain command. No button can set lesson, transfer, receipt, or path state directly.

- [ ] **Step 4: Show visible activity details**

Each row shows source (`Learner` or `Agent`), action, revision, result, and short time. Use `role="log"` and `aria-live="polite"`.

- [ ] **Step 5: Add browser-visible effect tests**

Mock `document.modelContext`, capture registered tools, execute the judge flow, and assert each tool changes the expected visible region.

- [ ] **Step 6: Pass parity and browser tests**

Run:

```powershell
pnpm test -- tests/integration/human-agent-parity.test.tsx
pnpm test:browser -- tests/browser/webmcp-visible-effects.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/learning/ui tests/integration/human-agent-parity.test.tsx tests/browser/webmcp-visible-effects.spec.ts
git commit -m "feat: show identical human and agent actions"
```

### Task 5: Build the local WebMCP harness

**Files:**
- Create: `src/pages/dev/webmcp.astro`
- Create: `src/features/webmcp/DevHarness.tsx`
- Create: `src/features/webmcp/dev-harness.css`
- Test: `tests/browser/webmcp-harness.spec.ts`

**Interfaces:**
- Consumes: `getTools()` and `executeTool()` from the shipped browser API.
- Produces: a development-only discovery and execution page.

- [ ] **Step 1: Protect the route**

Return 404 when `import.meta.env.DEV` is false.

- [ ] **Step 2: Write the harness browser test**

The test must list five tools, show each JSON Schema, execute one valid call, and show the stringified result.

- [ ] **Step 3: Run the test and observe the missing harness**

Run: `pnpm test:browser -- tests/browser/webmcp-harness.spec.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the harness**

Use `getTools()` only on this development route. Parse manual input as JSON and pass an object to `executeTool`.

- [ ] **Step 5: Pass the harness test**

Run: `pnpm test:browser -- tests/browser/webmcp-harness.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/dev/webmcp.astro src/features/webmcp/DevHarness.tsx src/features/webmcp/dev-harness.css tests/browser/webmcp-harness.spec.ts
git commit -m "dev: add a WebMCP tool harness"
```

### Task 6: Add tool-selection and wrong-order evaluations

**Files:**
- Create: `tests/webmcp/fixtures/selection-prompts.json`
- Create: `tests/webmcp/tool-selection.test.ts`
- Create: `tests/webmcp/wrong-order.test.ts`
- Create: `src/features/webmcp/select-tool-reference.ts`
- Create: `EVALS.md`

**Interfaces:**
- Consumes: exact tool descriptions and valid session phases.
- Produces: a 40-prompt deterministic selection corpus and published evaluation format.

- [ ] **Step 1: Add 40 prompt cases**

Create eight natural-language prompts for each tool. Include direct, polite, short, educational, and ambiguous-but-resolvable forms.

Use this fixture shape:

```json
{
  "prompt": "Look at what I have done and tell the page to check it.",
  "expectedTool": "check_current_attempt",
  "phase": "diagnostic"
}
```

- [ ] **Step 2: Add 12 wrong-order cases**

Use at least two invalid phases for each write tool and incomplete receipt reads.

- [ ] **Step 3: Implement the reference selector**

The reference selector exists only for deterministic test coverage. It uses explicit intent phrases and never ships as an agent replacement.

- [ ] **Step 4: Run selection evaluations**

Run: `pnpm test -- tests/webmcp/tool-selection.test.ts tests/webmcp/wrong-order.test.ts`

Expected: 40 of 40 selection cases pass and every wrong-order case returns the expected error.

- [ ] **Step 5: Write `EVALS.md`**

Record the corpus count, exact command, deterministic result, browser acceptance status, limitations, and date.

- [ ] **Step 6: Run the complete WebMCP gate**

Run:

```powershell
pnpm test -- tests/webmcp tests/integration/human-agent-parity.test.tsx
pnpm test:browser -- tests/browser/webmcp-visible-effects.spec.ts tests/browser/webmcp-harness.spec.ts
pnpm typecheck
pnpm build
```

Expected: all commands exit with code 0.

- [ ] **Step 7: Commit**

```powershell
git add tests/webmcp src/features/webmcp/select-tool-reference.ts EVALS.md
git commit -m "test: evaluate WebMCP selection and order"
```
