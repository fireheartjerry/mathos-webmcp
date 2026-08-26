# Mathos Video Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real mistake-specific Mathos videos without making the learning loop depend on the private service.

**Architecture:** A server-only Astro route converts bounded lesson IDs into a controlled Mathos prompt and filters the production SSE stream. The browser first uses a committed catalog of Mathos-generated videos, then requests a new video for an uncached lesson. A local visual lesson remains available for every state.

**Tech Stack:** Astro server routes, Zod 4.4.3, TypeScript 7.0.2, Mathos Video Generation SSE, Remotion iframe player protocol, Vitest 4.1.11, Playwright 1.62.1.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Keep the Mathos API base and credential on the server.
- Accept only known lesson, problem, diagnosis, and request IDs.
- Do not accept an arbitrary prompt from the browser.
- Do not return raw internal SSE frames to the browser.
- Do not send learner identity, account data, or free-form prose to Mathos Video Generation.
- Show the local visual lesson before any video state.
- Do not block checking, transfer, receipts, or path changes on video state.
- Label cached and newly generated videos accurately.
- Do not claim that a cached video was generated for the current learner.
- Keep captions and a text summary visible without the iframe.
- Cancel remote work when the page ends the request.

---

## Existing Mathos Service Contract

The existing service accepts:

```text
POST {MATHOS_VIDEO_API_BASE}/video-generation
Content-Type: application/json
Accept: text/event-stream

{"user_message":[{"type":"text","text":"Explain the shared-path omission for the approved lesson scene."}]}
```

The service publishes players at:

```text
{PUBLIC_MATHOS_VIDEO_HOST}/{videoId}-open/index.html
{PUBLIC_MATHOS_VIDEO_HOST}/{videoId}-full/index.html
```

The player uses these messages:

```ts
type PlayerCommand =
  | { source: "mathos-remotion-control"; kind: "play" | "pause" }
  | { source: "mathos-remotion-control"; kind: "seek" | "seekAndPlay"; time: number }
  | { source: "mathos-remotion-control"; kind: "setOverlayHidden"; hidden: boolean };

type PlayerEvent = {
  source: "mathos-remotion";
  kind: "ready" | "play" | "pause" | "ended" | "timeupdate";
  currentTime?: number;
  duration?: number;
  fps?: number;
};
```

---

### Task 1: Define the public video contract and lesson prompt

**Files:**
- Create: `src/features/video/types.ts`
- Create: `src/features/video/schemas.ts`
- Create: `src/features/video/lesson-prompt.ts`
- Create: `src/features/video/catalog.ts`
- Test: `tests/unit/video-prompt.test.ts`
- Test: `tests/unit/video-schemas.test.ts`

**Interfaces:**
- Consumes: validated curriculum content.
- Produces: `VideoRequest`, `VideoState`, `buildLessonVideoPrompt`, and `VIDEO_CATALOG`.

- [ ] **Step 1: Define the browser request**

```ts
export interface VideoRequest {
  readonly lessonId: LessonId;
  readonly problemId: ProblemId;
  readonly diagnosisId: DiagnosisId;
  readonly requestId: string;
}

export type VideoState =
  | { kind: "not-requested" }
  | { kind: "cached"; video: CatalogVideo }
  | { kind: "generating"; progress: VideoProgress }
  | { kind: "ready"; video: GeneratedVideo }
  | { kind: "unavailable"; message: string };
```

- [ ] **Step 2: Write prompt tests**

Assert that the prompt contains the idea, exact mistake, learner level, teaching form, and next skill.

Assert that it contains no learner identity, raw attempt, hidden transfer answer, URL, HTML, or unbounded user text.

- [ ] **Step 3: Run tests and observe missing modules**

Run: `pnpm test -- tests/unit/video-prompt.test.ts tests/unit/video-schemas.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the bounded prompt**

Use this structure:

```ts
export function buildLessonVideoPrompt(context: LessonVideoContext): string {
  return [
    `Create a short Mathos lesson about ${context.conceptTitle}.`,
    `The learner made this specific mistake: ${context.misconceptionSummary}.`,
    `Teach with this form: ${context.representation}.`,
    `Use this worked example: ${context.seedExamplePublic}.`,
    `Prepare the learner for this next skill: ${context.nextSkillTitle}.`,
    "Do not reveal the answer to the follow-up problem.",
    "Use short sentences. Include captions. End with one question for the learner.",
  ].join("\n");
}
```

- [ ] **Step 5: Define the catalog shape**

```ts
export interface CatalogVideo {
  readonly videoKey: string;
  readonly videoId: string;
  readonly fullUrl: string;
  readonly caption: string;
  readonly transcript: string;
  readonly generatedAt: string;
  readonly promptHash: string;
}
```

Keep `VIDEO_CATALOG` empty until Task 6 records a real generated asset. Tests inject a catalog fixture.

- [ ] **Step 6: Pass contract tests**

Run: `pnpm test -- tests/unit/video-prompt.test.ts tests/unit/video-schemas.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/video/types.ts src/features/video/schemas.ts src/features/video/lesson-prompt.ts src/features/video/catalog.ts tests/unit/video-prompt.test.ts tests/unit/video-schemas.test.ts
git commit -m "feat: define bounded Mathos video requests"
```

### Task 2: Parse and sanitize the Mathos SSE stream

**Files:**
- Create: `src/features/video/server/sse.ts`
- Create: `src/features/video/server/sanitize-event.ts`
- Test: `tests/unit/video-sse.test.ts`
- Test: `tests/unit/video-event-sanitizer.test.ts`

**Interfaces:**
- Consumes: raw `event:` and `data:` blocks from the Mathos service.
- Produces: `parseSseBlocks` and `sanitizeMathosEvent`.

- [ ] **Step 1: Define public progress events**

```ts
export type PublicVideoEvent =
  | { kind: "started"; requestId: string }
  | { kind: "progress"; stage: "script" | "voice" | "scene" | "build" | "publish"; message: string }
  | { kind: "opening-ready"; videoId: string }
  | { kind: "full-ready"; videoId: string }
  | { kind: "complete"; videoId: string; durationSeconds: number | null }
  | { kind: "failed"; message: string };
```

- [ ] **Step 2: Write parser tests**

Cover LF, CRLF, split chunks, several `data:` lines, one final frame without a blank line, malformed JSON, abort, and an empty body.

- [ ] **Step 3: Write sanitizer tests**

Map only these raw kinds:

- `pipeline_start`
- `script_llm_start`
- `tts_start`
- `scene_llm_start`
- `full_build_start`
- `upload_opening_end`
- `upload_full_end`
- `pipeline_end`
- `pipeline_failed`
- `projects_bootstrapped`

Drop raw script text, model names, costs, paths, stack traces, and unknown event kinds.

- [ ] **Step 4: Run tests and observe missing modules**

Run: `pnpm test -- tests/unit/video-sse.test.ts tests/unit/video-event-sanitizer.test.ts`

Expected: FAIL.

- [ ] **Step 5: Implement streaming parsing and sanitation**

Use one `TextDecoder`, retain incomplete buffers, and flush the final buffer at stream end.

- [ ] **Step 6: Pass parser and sanitizer tests**

Run: `pnpm test -- tests/unit/video-sse.test.ts tests/unit/video-event-sanitizer.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/video/server tests/unit/video-sse.test.ts tests/unit/video-event-sanitizer.test.ts
git commit -m "feat: sanitize Mathos video progress"
```

### Task 3: Add the server-only generation route

**Files:**
- Create: `src/pages/api/video/generate.ts`
- Create: `src/features/video/server/mathos-client.ts`
- Create: `src/features/video/server/config.ts`
- Create: `.env.example`
- Test: `tests/integration/video-route.test.ts`

**Interfaces:**
- Consumes: `VideoRequest`, curriculum content, prompt builder, SSE parser, and sanitizer.
- Produces: `POST /api/video/generate` as a filtered SSE stream.

- [ ] **Step 1: Add server environment names**

```text
MATHOS_VIDEO_API_BASE=
MATHOS_VIDEO_API_TOKEN=
PUBLIC_MATHOS_VIDEO_HOST=https://video-generation-web-host-staging.mathos.ai
```

`MATHOS_VIDEO_API_TOKEN` can be empty when the approved service endpoint uses network authorization.

- [ ] **Step 2: Write route tests**

Cover valid known IDs, unknown lesson, mismatched diagnosis, unknown problem, malformed request ID, service HTTP error, missing stream, abort, and successful filtered SSE.

- [ ] **Step 3: Run tests and observe the missing route**

Run: `pnpm test -- tests/integration/video-route.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implement the service client**

Post only the server-built prompt. Add `Authorization: Bearer ${serverToken}` in the request implementation only when the server-side token exists; never log that header.

Use `cache: "no-store"` and forward the request signal.

- [ ] **Step 5: Implement the Astro route**

Set `export const prerender = false`.

Return status 400 for invalid IDs, 503 for missing server configuration, and a `text/event-stream` response for accepted work.

Emit only `PublicVideoEvent` JSON in `data:` lines. Do not send the service base or raw event category.

- [ ] **Step 6: Pass route tests**

Run: `pnpm test -- tests/integration/video-route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/api/video/generate.ts src/features/video/server .env.example tests/integration/video-route.test.ts
git commit -m "feat: proxy Mathos video generation safely"
```

### Task 4: Build the browser video state machine

**Files:**
- Create: `src/features/video/client.ts`
- Create: `src/features/video/use-lesson-video.ts`
- Modify: `src/features/learning/ui/VideoPanel.tsx`
- Test: `tests/unit/video-client.test.ts`
- Test: `tests/unit/use-lesson-video.test.tsx`

**Interfaces:**
- Consumes: catalog videos and filtered server events.
- Produces: `streamLessonVideo`, `useLessonVideo`, and visible video states.

- [ ] **Step 1: Write state tests**

Cover these paths:

```text
catalog hit -> cached
catalog miss -> generating -> ready
catalog miss -> generating -> unavailable
generation abort -> unavailable
lesson change -> cancel old request -> start new request
```

- [ ] **Step 2: Run tests and observe missing client modules**

Run: `pnpm test -- tests/unit/video-client.test.ts tests/unit/use-lesson-video.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement the filtered SSE client**

The client posts `VideoRequest`, parses only `PublicVideoEvent`, and returns `{ cancel(): void }`.

- [ ] **Step 4: Implement cache-first selection**

Use a catalog hit immediately. Do not open a network request for a catalog hit.

For a miss, keep the local lesson visible and show one short progress message.

- [ ] **Step 5: Implement honest labels**

Use these exact labels:

- Cached: `Generated by Mathos for this mistake pattern.`
- New: `Generated by Mathos for this lesson.`
- Unavailable: `The video is unavailable. The visual lesson is ready.`

- [ ] **Step 6: Pass client tests**

Run: `pnpm test -- tests/unit/video-client.test.ts tests/unit/use-lesson-video.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/video/client.ts src/features/video/use-lesson-video.ts src/features/learning/ui/VideoPanel.tsx tests/unit/video-client.test.ts tests/unit/use-lesson-video.test.tsx
git commit -m "feat: add cache-first lesson videos"
```

### Task 5: Build the secure Mathos player

**Files:**
- Create: `src/features/video/MathosVideoPlayer.tsx`
- Create: `src/features/video/player-protocol.ts`
- Create: `src/features/video/video-player.css`
- Modify: `src/features/learning/ui/VideoPanel.tsx`
- Test: `tests/unit/video-player.test.tsx`
- Test: `tests/browser/video-player.spec.ts`

**Interfaces:**
- Consumes: a validated `CatalogVideo` or `GeneratedVideo`.
- Produces: play, pause, seek, progress, captions, and text summary.

- [ ] **Step 1: Write message-origin tests**

Accept events only when both conditions are true:

- `event.origin` equals the origin of `PUBLIC_MATHOS_VIDEO_HOST`.
- `event.source` equals the current iframe window.

Reject all other messages.

- [ ] **Step 2: Write control tests**

Assert play, pause, seek, time updates, ready, end, and queued commands before ready.

- [ ] **Step 3: Run tests and observe the missing player**

Run: `pnpm test -- tests/unit/video-player.test.tsx`

Expected: FAIL.

- [ ] **Step 4: Implement the iframe player**

Use a sandbox that permits scripts and same-origin content. Allow autoplay and fullscreen.

Post messages to the exact player origin. Do not use `"*"` as the target origin.

- [ ] **Step 5: Keep captions outside the iframe**

Render the committed transcript and summary in page-owned HTML. The iframe remains optional.

- [ ] **Step 6: Pass unit and browser tests**

Run:

```powershell
pnpm test -- tests/unit/video-player.test.tsx
pnpm test:browser -- tests/browser/video-player.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/video/MathosVideoPlayer.tsx src/features/video/player-protocol.ts src/features/video/video-player.css src/features/learning/ui/VideoPanel.tsx tests/unit/video-player.test.tsx tests/browser/video-player.spec.ts
git commit -m "feat: show Mathos videos with safe controls"
```

### Task 6: Generate and record the canonical Mathos video

**Files:**
- Create: `scripts/verify-video-api.mjs`
- Create: `scripts/generate-canonical-video.mjs`
- Modify: `src/features/video/catalog.ts`
- Create: `public/media/shared-path-omission-poster.svg`
- Create: `src/features/video/catalog-transcripts.ts`
- Test: `tests/integration/video-catalog.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the real Mathos service configuration and `shared-path-omission-v1` lesson.
- Produces: one real committed catalog record with transcript, poster, prompt hash, generation date, and working player URL.

- [ ] **Step 1: Add the verification command**

Add:

```json
{
  "scripts": {
    "video:verify": "node scripts/verify-video-api.mjs",
    "video:generate-canonical": "node scripts/generate-canonical-video.mjs shared-path-omission-v1"
  }
}
```

- [ ] **Step 2: Implement the API verification script**

The script calls the service health endpoint, starts one bounded request, records sanitized stage times, waits for `upload_full_end`, verifies the public full-player URL, and exits nonzero on failure.

Do not print credentials or the private base URL.

- [ ] **Step 3: Generate the canonical asset**

Run: `pnpm video:generate-canonical`

Expected: one full Mathos player becomes reachable for `shared-path-omission-v1`.

- [ ] **Step 4: Record the real catalog values**

Write the returned video ID, full player URL, ISO generation date, SHA-256 prompt hash, accurate caption, and complete transcript into source files.

Do not commit an empty string, example UUID, staging password, or private prompt.

- [ ] **Step 5: Add a self-authored poster**

The SVG poster shows the two paths in the shared calculation graph. It contains no generated thumbnail or third-party mark.

- [ ] **Step 6: Pass catalog tests**

The test must fetch the public player, assert status 200, confirm the transcript is non-empty, and confirm the prompt hash matches the bounded prompt.

Run: `pnpm test -- tests/integration/video-catalog.test.ts`

Expected: PASS against the recorded asset.

- [ ] **Step 7: Commit**

```powershell
git add scripts/verify-video-api.mjs scripts/generate-canonical-video.mjs src/features/video/catalog.ts src/features/video/catalog-transcripts.ts public/media/shared-path-omission-poster.svg tests/integration/video-catalog.test.ts package.json
git commit -m "feat: add the canonical Mathos lesson video"
```

### Task 7: Prove video independence and failure recovery

**Files:**
- Create: `tests/integration/video-independence.test.tsx`
- Create: `tests/browser/video-failure.spec.ts`
- Create: `tests/browser/video-cached.spec.ts`
- Modify: `EVALS.md`

**Interfaces:**
- Consumes: the complete video flow and learning engine.
- Produces: evidence that video adds value without controlling progression.

- [ ] **Step 1: Add failure simulations**

Simulate timeout, HTTP 401, HTTP 429, HTTP 500, malformed SSE, missing full upload, invalid player message, and iframe load failure.

- [ ] **Step 2: Assert learning independence**

For each simulation, complete lesson, transfer, checking, receipt, and path continuation through human controls.

- [ ] **Step 3: Test the cached judge path**

Assert that the canonical video loads without a generation request and carries the cached label.

- [ ] **Step 4: Run the video gate**

Run:

```powershell
pnpm test -- tests/unit/video* tests/integration/video*
pnpm test:browser -- tests/browser/video-player.spec.ts tests/browser/video-failure.spec.ts tests/browser/video-cached.spec.ts
pnpm typecheck
pnpm build
```

Expected: all commands exit with code 0.

- [ ] **Step 5: Record the results**

Add the generation date, public player check, cached behavior, and all failure-path results to `EVALS.md`.

- [ ] **Step 6: Commit**

```powershell
git add tests/integration/video-independence.test.tsx tests/browser/video-failure.spec.ts tests/browser/video-cached.spec.ts EVALS.md
git commit -m "test: prove Mathos video recovery"
```
