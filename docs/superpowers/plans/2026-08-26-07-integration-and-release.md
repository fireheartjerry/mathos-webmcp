# Integration, Verification, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed systems into one judge-ready Mathos product, verify every hackathon promise, and freeze a reproducible public submission.

**Architecture:** One uninterrupted judge path joins the landing story, adaptive learning engine, WebMCP tools, Mathos video, transfer proof, and real transformer lab. Automated browser journeys, accessibility and performance checks, source provenance, deployment verification, and a frozen release manifest make the entry both impressive and defensible.

**Tech Stack:** Astro 7.2.7, React 19.2.8, Playwright 1.62.1, Axe 4.13.0, Biome 2.5.10, Vercel, GitHub Actions, WebMCP in ChatGPT browser and Chrome 149+.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Optimize for all four judging criteria; WebMCP Leverage is the first tie-breaker.
- Keep the full public-core journey available without a login or paid account.
- Preserve the same domain behavior for human controls and agent tools.
- Verify all company, product, and performance claims before publishing them.
- Get the authorized Mathos representative's written approval for the final license, company claims, production-video use, and submission.
- Do not make the repository public until the approved OSI license is committed.
- Do not submit a mock, prerecorded facade, or inaccessible judge-only route.
- Freeze the repository, deployed app, and Devpost entry before the deadline.
- After the deadline, do not change those submission artifacts during judging.

---

## Locked Judge Story

The primary journey is one continuous proof:

```text
landing thesis
→ start at calculus
→ answer the shared-path derivative problem incorrectly with 36
→ engine diagnoses shared-path omission
→ route changes and explains why
→ Mathos lesson opens, with local visual always available
→ learner solves the fresh transfer problem with 8
→ receipt records what was actually demonstrated
→ pathway reveals how the same idea reaches attention
→ learner trains and inspects the real tiny transformer
→ WebMCP agent repeats the same actions through the same domain commands
```

The judge can deviate, answer correctly, or use only human controls. The product must remain coherent.

---

### Task 1: Join the studio into one resilient learner journey

**Files:**

- Modify: `src/features/learning/ui/PathMap.tsx`
- Modify: `src/features/learning/ui/ProblemWorkspace.tsx`
- Modify: `src/features/learning/ui/LessonPanel.tsx`
- Create: `src/features/learning/ui/TransferPanel.tsx`
- Modify: `src/features/learning/ui/ReceiptPanel.tsx`
- Create: `src/features/learning/ui/RepresentationBridge.tsx`
- Create: `src/features/learning/ui/StudioErrorBoundary.tsx`
- Modify: `src/features/learning/ui/LearningStudio.tsx`
- Modify: `src/features/learning/ui/studio.css`
- Test: `src/features/learning/ui/LearningStudio.integration.test.tsx`

- [ ] **Step 1: Write the failing integrated journey test**

Use the locked judge fixture and assert exact state transitions from initial workspace through diagnosis, targeted lesson, fresh transfer, receipt, pathway unlock, and transformer-lab entry. Run the same fixture once through rendered human controls and once through direct domain commands; compare the resulting domain projections after removing timestamps and request IDs.

- [ ] **Step 2: Run the test and confirm the missing integration**

Run: `pnpm vitest run src/features/learning/ui/LearningStudio.integration.test.tsx`

Expected: FAIL because the final panels and composed journey are missing.

- [ ] **Step 3: Build the visible pathway**

Render the 32 concepts in the ten approved learner-facing stages. Show mastered, ready, current, skipped-by-evidence, and locked states. Every route change needs a one-sentence reason such as, “You know the product rule. This step focuses on a value that flows through two paths.” Never label an unattempted concept as mastered.

- [ ] **Step 4: Build the problem-to-representation bridge**

Animate the current equation into a computation graph, then into Q/K/V paths only when the learner advances. Keep one selected mathematical object visually persistent during the morph. Reduced-motion mode swaps the stages without motion and preserves the same explanation.

- [ ] **Step 5: Add fault containment**

Wrap the remote video and transformer lab in separate error boundaries. A failure in either must keep current problem, route, transfer, and receipt controls active. Recovery buttons reset only the failed feature.

- [ ] **Step 6: Run the integration test**

Run: `pnpm vitest run src/features/learning/ui/LearningStudio.integration.test.tsx`

Expected: PASS for both human and command-driven journeys.

- [ ] **Step 7: Commit**

```bash
git add src/features/learning/ui
git commit -m "feat: integrate adaptive learning journey"
```

---

### Task 2: Add browser-level judge and adversarial flows

**Files:**

- Create: `tests/e2e/judge-journey.spec.ts`
- Create: `tests/e2e/alternate-routes.spec.ts`
- Create: `tests/e2e/reload-and-recovery.spec.ts`
- Create: `tests/e2e/mobile-and-motion.spec.ts`
- Create: `tests/fixtures/video-catalog.json`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Automate the locked judge journey**

Use the committed canonical real-video catalog in the default test. Assert visible copy, selected route, diagnosis, local lesson, cached Mathos video label, transfer result, receipt contents, transformer entry, and browser console cleanliness.

- [ ] **Step 2: Test alternate learner behavior**

Cover a correct first answer, a syntax error, a wrong answer with a different misconception, two repeated mistakes, skipped mastered prerequisites, and an incorrect transfer attempt followed by a fresh repair problem. Assert that each route remains bounded and explains its choice.

- [ ] **Step 3: Test reload and dependency failure**

Reload after diagnosis and after transfer, then verify state hydration. Simulate a video timeout, malformed remote event, unavailable player host, transformer backend failure, and storage denial. The local core must remain complete in every case.

- [ ] **Step 4: Test mobile and motion modes**

Run at 390×844 and 1440×900. Assert no horizontal overflow, a visible primary action, usable problem input, readable pathway, and no pinned-scroll dependency on mobile. Emulate reduced motion and assert that all information remains present.

- [ ] **Step 5: Run the browser suite**

Run:

```bash
pnpm playwright test tests/e2e/judge-journey.spec.ts tests/e2e/alternate-routes.spec.ts
pnpm playwright test tests/e2e/reload-and-recovery.spec.ts tests/e2e/mobile-and-motion.spec.ts
```

Expected: PASS in Chromium with zero uncaught page errors.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e tests/fixtures playwright.config.ts
git commit -m "test: cover judge journey and recovery paths"
```

---

### Task 3: Verify WebMCP in real supported browsers

**Files:**

- Create: `docs/WEBMCP_VERIFICATION.md`
- Create: `scripts/verify-webmcp-registration.mjs`
- Modify: `src/pages/dev/webmcp.astro`
- Modify: `package.json`

- [ ] **Step 1: Add a registration verification script**

The script opens the built app, records registration calls, and asserts exactly five unique static tools with the approved names, bounded schemas, correct read-only annotations, and no registrations after hydration or navigation repeats.

- [ ] **Step 2: Add an agent-parity scenario**

Run these actions in order through the development harness:

```text
get_learning_workspace
check_current_attempt(attempt: "36")
show_targeted_lesson(diagnosisId: returned ID)
start_transfer_problem(lessonId: returned ID)
check_current_attempt(attempt: "8")
get_learning_receipt
```

Assert current revisions at every step, reject a repeated stale write, replay a duplicate request ID without duplicating evidence, abort an in-flight action, and confirm that no hidden answer appears in any tool result.

- [ ] **Step 3: Run Chrome verification**

Use Chrome 149 or later with WebMCP enabled. Record browser version, operating system, app commit, tool list, scenario result, and screenshots in `docs/WEBMCP_VERIFICATION.md`.

- [ ] **Step 4: Run ChatGPT-browser verification**

Open the deployed app in the ChatGPT browser, inspect the exposed tools, complete the locked scenario with an agent, and record the same evidence. If the runtime differs from the current specification, fix the adapter while preserving the five public tool contracts.

- [ ] **Step 5: Run the complete WebMCP gate**

Run:

```bash
pnpm webmcp:verify
pnpm vitest run src/features/webmcp
pnpm playwright test tests/e2e/webmcp-parity.spec.ts
```

Expected: PASS and two documented real-browser verification records.

- [ ] **Step 6: Commit**

```bash
git add docs/WEBMCP_VERIFICATION.md scripts/verify-webmcp-registration.mjs src/pages/dev/webmcp.astro package.json
git commit -m "test: verify WebMCP in supported browsers"
```

---

### Task 4: Complete security, privacy, accessibility, and performance gates

**Files:**

- Create: `SECURITY.md`
- Create: `PRIVACY.md`
- Create: `docs/ACCESSIBILITY.md`
- Create: `docs/PERFORMANCE.md`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/security.spec.ts`
- Create: `scripts/check-bundle-budget.mjs`
- Modify: `astro.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add security regression tests**

Assert strict lesson-ID allowlisting, request-body size limits, same-origin video route use, no secrets in built assets, player-origin validation, escaped lesson text, bounded WebMCP results, and no arbitrary external iframe URL. Add response headers for content type, referrer policy, permissions policy, and a CSP that names only the deployed app and approved Mathos player origin.

- [ ] **Step 2: Add accessibility tests**

Run Axe on landing, active problem, lesson, transfer, receipt, and transformer states. Add manual checks for full keyboard flow, visible focus, logical heading order, screen-reader announcements for checking and route changes, captions and transcript access, contrast, zoom to 200%, and reduced motion.

- [ ] **Step 3: Set measurable performance budgets**

For a production build on the landing route:

- initial compressed JavaScript at or below 120 KB
- no TensorFlow.js, MathLive, or video-player code in the initial landing chunk
- LCP at or below 2.5 seconds on the documented mobile profile
- CLS at or below 0.1
- local domain actions at or below 500 milliseconds at p95
- no long task above 200 milliseconds during a training chunk

`check-bundle-budget.mjs` fails the build when a bundle rule is broken. Record the exact profiling environment and measured values in `docs/PERFORMANCE.md`.

- [ ] **Step 4: Run the non-functional gate**

Run:

```bash
pnpm security:check
pnpm playwright test tests/e2e/security.spec.ts tests/e2e/accessibility.spec.ts
pnpm build
pnpm bundle:check
pnpm performance:profile
```

Expected: PASS with no serious or critical accessibility violations and no committed or bundled secret.

- [ ] **Step 5: Commit**

```bash
git add SECURITY.md PRIVACY.md docs/ACCESSIBILITY.md docs/PERFORMANCE.md tests/e2e scripts/check-bundle-budget.mjs astro.config.mjs package.json
git commit -m "chore: enforce release quality gates"
```

---

### Task 5: Create complete open-source and provenance documentation

**Files:**

- Modify: `README.md`
- Create: `ARCHITECTURE.md`
- Modify: `EVALS.md`
- Create: `PROVENANCE.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `CONTRIBUTING.md`
- Create: `LICENSE`
- Create: `docs/COMPANY_CLAIMS.md`
- Create: `docs/DECISIONS.md`

- [ ] **Step 1: Write the public-core setup guide**

README must include Node 24, pnpm installation, one-command local setup, public-core run with no Mathos credential, optional server environment names without values, test commands, supported browser notes, five tool descriptions, model limitations, and a 60-second judge path.

- [ ] **Step 2: Document architecture and evaluations**

`ARCHITECTURE.md` traces human and WebMCP calls to the same command layer and separates public core from the optional private service. `EVALS.md` publishes selection, sequencing, idempotency, abort, answer-leakage, adaptation, transfer, transformer, accessibility, and failure-recovery results with commands and commit hash.

- [ ] **Step 3: Document challenge-period provenance**

`PROVENANCE.md` must identify:

- this standalone repository and its challenge-period first commit
- the pre-existing `Adaptive_MVP` as an ideas-only reference with no copied code
- the pre-existing Sarsa landing as a motion-principles reference with no copied brand or source
- the pre-existing Mathos Video Generation service and the new bounded adapter
- the earlier WebMCP handoff document as planning input
- every committed asset, its creator or source, license, and creation date

- [ ] **Step 4: Verify company claims from primary evidence**

For each proposed claim—including Mathos identity, traction, YC relationship, Forbes relationship, and video-generation capability—record the exact wording, source URL or authorized company document, access date, and approving representative in `docs/COMPANY_CLAIMS.md`. If “$1M ARR,” “YC-backed,” or “Forbes-backed” is not supported by current primary evidence and approved wording, omit it from the product and submission. Never soften this gate with vague phrasing.

- [ ] **Step 5: Obtain and record license approval**

Present Apache-2.0 to the authorized Mathos representative. If approved, commit the unmodified Apache-2.0 text and record the approval date in `docs/DECISIONS.md`. If Mathos selects another OSI-approved license, use that exact approved license. Do not make the repository public before this step passes.

- [ ] **Step 6: Run documentation checks**

Run:

```bash
pnpm docs:check
pnpm provenance:check
pnpm secret:scan
```

Expected: every internal file link resolves, every externally sourced asset has a notice, no credential is present, and every published company claim has evidence.

- [ ] **Step 7: Commit**

```bash
git add README.md ARCHITECTURE.md EVALS.md PROVENANCE.md THIRD_PARTY_NOTICES.md CONTRIBUTING.md LICENSE docs/COMPANY_CLAIMS.md docs/DECISIONS.md
git commit -m "docs: publish open source and provenance record"
```

---

### Task 6: Deploy and verify the production candidate

**Files:**

- Modify: `.env.example`
- Create: `docs/DEPLOYMENT.md`
- Create: `scripts/verify-production.mjs`
- Modify: `astro.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Configure production deployment**

Connect the approved Mathos Vercel project, configure the three server variables from the video plan, and keep all secrets out of preview logs and browser bundles. Pin Node 24 and pnpm 11.10.0. Configure the canonical URL, social image, robots rules, and health route.

- [ ] **Step 2: Add production verification**

`verify-production.mjs` accepts a base URL and checks HTTPS, health, landing metadata, studio load, five tool registrations, no-login access, video fallback, security headers, source-map policy, and absence of secret-shaped values in public assets.

- [ ] **Step 3: Test the public core without private variables**

Create a clean deployment or local production run with all Mathos video variables absent. Complete diagnosis, local lesson, transfer, receipt, and transformer entry. The UI must explain that the enhanced Mathos video is unavailable without presenting the product as broken.

- [ ] **Step 4: Test the enhanced deployment**

With approved production variables present, confirm the canonical cached real video and one permitted fresh-generation request. Verify the final iframe origin, transcript, cancellation, timeout, rate limit, and local fallback.

- [ ] **Step 5: Run the production candidate gate**

Run:

```bash
pnpm quality
pnpm build
$env:MATHOS_WEBMCP_PRODUCTION_URL = "the approved HTTPS production URL"
pnpm production:verify -- --base-url $env:MATHOS_WEBMCP_PRODUCTION_URL
```

Expected: PASS. Record the actual selected production URL in `docs/DEPLOYMENT.md`; do not commit a guessed host.

- [ ] **Step 6: Commit**

```bash
git add .env.example docs/DEPLOYMENT.md scripts/verify-production.mjs astro.config.mjs package.json
git commit -m "ops: prepare verified production deployment"
```

---

### Task 7: Produce the judge-facing story and demo package

**Files:**

- Create: `docs/submission/DEMO_SCRIPT.md`
- Create: `docs/submission/SHOT_LIST.md`
- Create: `docs/submission/DEVPOST_COPY.md`
- Create: `docs/submission/JUDGE_GUIDE.md`
- Create: `docs/submission/ASSET_CHECKLIST.md`
- Create: `public/media/og-card.svg`

- [ ] **Step 1: Lock the under-three-minute demo**

Use this timing:

```text
0:00–0:15  Show the wrong answer, precise diagnosis, adaptive reroute, and Mathos lesson.
0:15–0:40  Explain the thesis: calculus is the starting language for understanding transformers.
0:40–1:35  Complete the transfer problem and reveal the evidence receipt.
1:35–2:15  Move through the pathway and train the real tiny transformer.
2:15–2:42  Show the agent using the five WebMCP tools on the same state.
2:42–2:57  State the verified Mathos advantage, public-core design, and learner impact.
```

The final video must be public on YouTube, shorter than three minutes, contain spoken audio, use readable captions, and show the real deployed product at the submitted commit.

- [ ] **Step 2: Write judge-first Devpost copy**

Lead with the learning transformation and visible proof. Explain WebMCP in one plain paragraph, Mathos Video Generation in one paragraph, the public-core boundary, the real transformer, technical architecture, tested browsers, open-source license, challenge-period provenance, limitations, and next frontier. Use only claims approved in `docs/COMPANY_CLAIMS.md`.

- [ ] **Step 3: Write the 60-second judge guide**

Provide the live URL, one suggested wrong answer (`36`), the transfer answer (`8`), a no-login note, the WebMCP prompt sequence, video fallback note, transformer hardware note, repository link, release commit generated by the freeze script, and contact route for access issues.

- [ ] **Step 4: Record the demo and validate it**

Record a clean run with no splices that imply false behavior. Check captions, audio, 1080p readability, duration, public access in a logged-out browser, and exact match between the shown app and release candidate.

- [ ] **Step 5: Commit the submission package**

```bash
git add docs/submission public/media/og-card.svg
git commit -m "docs: prepare hackathon demo and submission"
```

---

### Task 8: Build and test the freeze machinery

**Files:**

- Create: `scripts/freeze-submission.mjs`
- Create: `tests/release/freeze-submission.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing release-script tests**

Cover a clean pushed commit, dirty worktree, unpushed commit, non-HTTPS URL, missing public license, stale quality evidence, missing browser verification, missing field, and an attempt to overwrite an existing manifest without `--force`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm vitest run tests/release/freeze-submission.test.ts`

Expected: FAIL because the release script is missing.

- [ ] **Step 3: Implement the freeze script**

The script reads release values from explicit CLI flags, checks Git and evidence files, and writes `SUBMISSION_MANIFEST.json` plus `docs/submission/FINAL_VERIFICATION.md`. It records `productCommit` as the clean pushed commit that contains every functional artifact. The later manifest-only release commit is identified by the annotated tag `devpost-2026-submission`; do not attempt a self-referential commit hash.

The generated manifest shape is:

```jsonc
{
  "productCommit": "40-character pushed Git commit before the manifest commit",
  "releaseTag": "devpost-2026-submission",
  "repository": "verified public HTTPS repository URL",
  "deployment": "verified production HTTPS URL",
  "demo": "verified public YouTube HTTPS URL",
  "license": "approved OSI SPDX identifier",
  "builtAt": "UTC ISO-8601 timestamp",
  "checks": {
    "quality": true,
    "webmcpChrome": true,
    "webmcpChatGPT": true,
    "publicCore": true,
    "enhancedVideo": true,
    "transformer": true,
    "accessibility": true,
    "provenance": true
  }
}
```

The writer must fail if the worktree is dirty before generation, any URL is not HTTPS, `HEAD` is not pushed, the license is absent, required checks are stale, or a required field is absent.

- [ ] **Step 4: Run the release-script tests**

Run: `pnpm vitest run tests/release/freeze-submission.test.ts`

Expected: PASS using temporary Git repositories and local URL probes; the test never changes the real project visibility or tags.

- [ ] **Step 5: Commit**

```bash
git add scripts/freeze-submission.mjs tests/release/freeze-submission.test.ts package.json
git commit -m "chore: add submission freeze checks"
```

---

### Task 9: Authorize, publish, submit, and freeze the release

**Files:**

- Create: `SUBMISSION_MANIFEST.json`
- Create: `docs/submission/FINAL_VERIFICATION.md`

- [ ] **Step 1: Complete the human authorization gate**

Before any public or submission action, obtain explicit approval from the authorized Mathos representative for:

- organization entry and representative identity
- final open-source license
- public repository contents
- exact company claims
- real Mathos Video Generation use
- public deployment
- public YouTube demo
- final Devpost copy

Record the decision without storing private signatures, tokens, or personal documents in the repository.

- [ ] **Step 2: Complete the official rules acknowledgment**

Present the current official Devpost rules acknowledgment separately. Update `.devpost-hackathon-state.json` only after the user answers the acknowledgment with an explicit `yes`. Do not infer acceptance from product or design approvals.

- [ ] **Step 3: Make the approved repository public**

Confirm that `LICENSE`, setup instructions, all functional public-core source, assets, and tests are present. Change repository visibility from private to public, then verify the public URL in a logged-out browser.

- [ ] **Step 4: Run the final clean release gate**

Run:

```bash
pnpm install --frozen-lockfile
pnpm quality
pnpm build
pnpm production:verify -- --base-url $env:MATHOS_WEBMCP_PRODUCTION_URL
git status --short
```

Expected: all checks pass, all required evidence files record the current product commit, the commit is pushed, and `git status --short` is empty.

- [ ] **Step 5: Generate, commit, tag, and push the manifest**

Run `pnpm submission:freeze` with the verified repository, deployment, demo, and approved SPDX license flags. Review both generated files, then run:

```bash
git add SUBMISSION_MANIFEST.json docs/submission/FINAL_VERIFICATION.md
git commit -m "release: freeze WebMCP hackathon submission"
git tag -a devpost-2026-submission -m "Devpost WebMCP 2026 submission"
git push origin main --follow-tags
git status --short
```

Expected: the annotated tag resolves to the manifest commit, `productCommit` resolves to its pushed parent containing the complete product, and the worktree is clean.

- [ ] **Step 6: Verify the public frozen artifacts**

In a logged-out browser, verify the public repository at the release tag, license, live app, no-login judge path, public demo, and all links in the manifest. Confirm the deployed build reports the recorded `productCommit` and not a later build.

- [ ] **Step 7: Submit the exact frozen artifacts**

Populate Devpost with the public repository, production URL, public YouTube URL, approved organization details, and final copy. Verify every link logged out. Save screenshots and the submission confirmation in the private company record, not the public repository.

After submission, do not change the repository, deployment, video, or Devpost entry through judging unless Devpost explicitly directs entrants to correct an access failure.

---

## Final Release Gate

Submission is allowed only when every statement is true:

- the full no-login public core works on the production URL
- the enhanced Mathos video path is real, labeled accurately, and failure-safe
- the tiny transformer trains with real changing parameters and measured loss
- exactly five WebMCP tools work in Chrome and the ChatGPT browser
- human and agent paths reach equivalent domain state
- all automated tests, evaluations, security, accessibility, and performance checks pass
- every published company claim has primary evidence and company approval
- challenge-period provenance and third-party notices are complete
- the approved OSI license is visible in the public repository
- the demo is public, has audio and captions, and is under three minutes
- the authorized Mathos representative approved the final artifacts
- the official rules acknowledgment is explicit
- the manifest matches the submitted repository, deployment, and video
- the release commit and tag are pushed
- the frozen artifacts will remain unchanged during judging
