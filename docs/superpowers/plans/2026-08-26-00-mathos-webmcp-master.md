# Mathos WebMCP Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and release a WebMCP learning product that takes a prepared calculus learner to a trained small transformer.

**Architecture:** Astro renders the quiet landing page and hosts one React learning studio. A public TypeScript engine owns learning state, while five WebMCP tools and human controls call the same commands. A bounded server route connects targeted lessons to Mathos Video Generation, and TensorFlow.js trains the final small transformer in the browser.

**Tech Stack:** Node.js 24, pnpm 11.10.0, Astro 7.2.7, React 19.2.8, TypeScript 7.0.2, GSAP 3.15.0, Zod 4.4.3, MathLive 0.110.0, CortexJS Compute Engine 0.119.0, TensorFlow.js 4.22.0, Vitest 4.1.11, fast-check 4.9.0, Playwright 1.62.1, Biome 2.5.10, Vercel.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Mathos enters the challenge as an organization through an authorized representative.
- The repository remains private during development and becomes public before submission.
- Use Apache-2.0 only after the Mathos representative approves that license.
- If Mathos does not approve Apache-2.0, stop publication and use the approved OSI license instead.
- Treat this application as new challenge-period work.
- Record each reused Mathos service and each pre-existing reference in `PROVENANCE.md`.
- Do not copy implementation code from `Adaptive_MVP`; write a new TypeScript engine from the approved ideas.
- Do not copy the Sarsa brand, words, colors, or mark.
- Reimplement the approved Sarsa motion principles in new Mathos source files.
- Use Astro for static pages and one React island for the learning studio.
- Use the raw `document.modelContext.registerTool()` WebMCP interface.
- Register exactly five public WebMCP tools once after session hydration.
- Human controls and WebMCP tools must call the same domain commands.
- The complete learning loop must work without Mathos Video Generation.
- Mathos Video Generation is the only private Mathos product dependency.
- Never expose Mathos credentials, private service URLs, or raw internal event payloads to the browser.
- Never return a hidden target answer through a WebMCP tool.
- Record immediate transfer evidence. Do not claim permanent mastery from one session.
- Use pragmatic Simple English across UI copy, tools, errors, documents, and narration.
- Use one technical name for each concept across the complete repository.
- Use no login for the judge path.
- Support the ChatGPT in-app browser and Chrome 149 or later with WebMCP enabled.
- Keep local domain actions below 500 milliseconds at the 95th percentile.
- Provide captions, keyboard navigation, strong contrast, and reduced-motion behavior.
- Use only verified company facts and licensed assets.
- Show only real product behavior in the demo.
- Do not change the submitted repository, live site, or Devpost entry during judging.

---

## Plan Set

Execute these plans in order:

1. `docs/superpowers/plans/2026-08-26-01-foundation-and-interface.md`
2. `docs/superpowers/plans/2026-08-26-02-learning-engine.md`
3. `docs/superpowers/plans/2026-08-26-03-curriculum-and-lessons.md`
4. `docs/superpowers/plans/2026-08-26-04-webmcp-tools.md`
5. `docs/superpowers/plans/2026-08-26-05-mathos-video.md`
6. `docs/superpowers/plans/2026-08-26-06-transformer-lab.md`
7. `docs/superpowers/plans/2026-08-26-07-integration-and-release.md`

Each plan produces a reviewable and testable result. Do not begin the next plan while the current plan has a failing gate.

## Locked Repository Structure

```text
mathos-webmcp/
├── .github/workflows/quality.yml
├── docs/
│   ├── plans/
│   └── superpowers/plans/
├── public/
│   ├── fonts/
│   ├── media/
│   └── transformer/tiny-corpus.txt
├── scripts/
│   ├── verify-content.mjs
│   ├── verify-video-api.mjs
│   └── freeze-submission.mjs
├── src/
│   ├── components/landing/
│   ├── features/learning/
│   │   ├── content/
│   │   ├── domain/
│   │   ├── expression/
│   │   ├── store/
│   │   └── ui/
│   ├── features/transformer/
│   ├── features/video/
│   ├── features/webmcp/
│   ├── layouts/
│   ├── pages/api/video/
│   ├── pages/dev/
│   ├── pages/
│   └── styles/
├── tests/
│   ├── browser/
│   ├── content/
│   ├── integration/
│   ├── unit/
│   └── webmcp/
├── astro.config.mjs
├── biome.json
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## Shared Domain Interfaces

Every plan uses the following names. Do not create aliases for these concepts.

```ts
export type LearningPhase =
  | "diagnostic"
  | "diagnosed"
  | "lesson"
  | "transfer"
  | "receipt";

export type AttemptOutcome = "correct" | "incorrect" | "undecided";

export interface LearningSession {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly revision: number;
  readonly phase: LearningPhase;
  readonly goalConceptId: ConceptId;
  readonly activeConceptId: ConceptId;
  readonly activeProblemId: ProblemId;
  readonly attempt: AttemptState | null;
  readonly diagnosis: Diagnosis | null;
  readonly lesson: LessonState | null;
  readonly transfer: TransferState | null;
  readonly receipt: LearningReceipt | null;
  readonly conceptState: Readonly<Record<ConceptId, ConceptEvidence>>;
  readonly misconceptionHeat: Readonly<Record<MisconceptionId, number>>;
  readonly history: readonly ActivityEvent[];
  readonly requestCache: Readonly<Record<string, CommandResult>>;
}

export interface LearningStore {
  getSnapshot(): LearningSession;
  subscribe(listener: () => void): () => void;
  dispatch(command: LearningCommand, signal?: AbortSignal): Promise<CommandResult>;
}
```

## Shared Command Boundary

The engine exposes only these commands to the UI and WebMCP layer:

```ts
export type LearningCommand =
  | {
      type: "CHECK_ATTEMPT";
      expectedRevision: number;
      requestId: string;
      attempt: AttemptInput;
    }
  | {
      type: "SHOW_LESSON";
      expectedRevision: number;
      requestId: string;
      diagnosisId: DiagnosisId;
    }
  | {
      type: "START_TRANSFER";
      expectedRevision: number;
      requestId: string;
      lessonId: LessonId;
    }
  | { type: "CONTINUE_PATH"; expectedRevision: number; requestId: string }
  | { type: "RESET_SESSION"; requestId: string };
```

The human attempt field keeps an uncommitted local draft. Its submit button and `check_current_attempt` both dispatch `CHECK_ATTEMPT` with the typed attempt. `CONTINUE_PATH` and `RESET_SESSION` remain human-only controls. The five WebMCP tools use three shared write commands and two read projections.

## Shared Result Boundary

```ts
export type ErrorCode =
  | "ATTEMPT_EMPTY"
  | "PARSE_UNSUPPORTED"
  | "VERIFIER_UNDECIDED"
  | "STALE_REVISION"
  | "DUPLICATE_REQUEST"
  | "INVALID_PHASE"
  | "DEPENDENCY_MISSING"
  | "ABORTED";

export type CommandResult<T = unknown> =
  | {
      readonly ok: true;
      readonly revision: number;
      readonly activityId: string;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly revision: number;
      readonly error: { readonly code: ErrorCode; readonly message: string };
    };
```

## Review Gates

Each pull-sized task must pass these gates before its commit:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the browser suite after a task changes a page, WebMCP tool, video flow, or transformer lab:

```powershell
pnpm test:browser
```

## Required Final Evidence

The release is complete only when these artifacts contain real results:

- `README.md`
- `ARCHITECTURE.md`
- `EVALS.md`
- `PROVENANCE.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`
- `docs/WEBMCP_VERIFICATION.md`
- `docs/ACCESSIBILITY.md`
- `docs/PERFORMANCE.md`
- `docs/submission/DEMO_SCRIPT.md`
- `docs/submission/DEVPOST_COPY.md`
- `docs/submission/FINAL_VERIFICATION.md`
- `SUBMISSION_MANIFEST.json`

## Commit Policy

- Commit after each task passes its listed tests.
- Use one purpose per commit.
- Do not mix content, interface, and infrastructure changes in one commit.
- Never commit `.env`, credentials, generated private prompts, or user data.
- Preserve the dated commit history because Devpost uses it as provenance evidence.

## Completion Definition

The product is ready for submission only when a judge can complete this path without an account:

1. Open the live site.
2. Enter the prepared shared-path mistake.
3. Ask the agent to inspect the workspace.
4. Let the agent check the attempt.
5. Let the agent show the focused lesson.
6. Watch the real or cached Mathos video.
7. Start the fresh computation-path transfer problem.
8. Enter the correct transfer answer.
9. Read the evidence receipt and changed path.
10. Open the final lab and train the small transformer.

The complete path must work through human controls when WebMCP is unavailable.
