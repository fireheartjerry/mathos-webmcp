# Proof Margin and Sites Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Mathos Second Try around the approved Proof Margin, verify every required state, publish the exact validated source to ChatGPT Sites, then remove the superseded Vercel project.

**Architecture:** Preserve the reducer, math engine, persistence, and tool contracts. Add a small pure presentation module, move each verdict/note/proposal beside its derivation line, and demote exact WebMCP inspection and activity history into one session-details disclosure. Replace the landing editorial shell with one concrete derivation transaction. Only after the application and audit pass, adapt the existing project to the Sites worker/build contract, publish privately first, verify the production URL, and then delete Vercel.

**Tech Stack:** Astro 7, React 19, TypeScript 6, Vitest 4, KaTeX, Cortex compute engine, Chrome WebMCP, OpenAI Sites/Cloudflare Workers.

---

## File structure

- Create `src/components/proofPresentation.ts`: pure status, actor, and relation presentation helpers.
- Create `src/components/proofPresentation.test.ts`: deterministic presentation tests.
- Create `src/components/SessionDetails.tsx`: subordinate disclosure that composes the exact local inspector and activity history.
- Modify `src/components/Scratchpad.tsx`: Proof Margin document hierarchy and line-local evidence.
- Modify `src/components/AgentConsole.tsx`: inspector-only content; remove permanent thesis/header chrome.
- Rewrite `src/components/scratchpad.css`: one consolidated Proof Margin stylesheet.
- Rewrite `src/styles/tokens.css`: compact, Mathos-specific neutral tokens and shared controls.
- Rewrite `src/pages/index.astro` and `src/styles/landing.css`: live transaction landing.
- Modify `scripts/capture-browser-state.mjs`: reusable state/focus/overflow metadata for the final matrix.
- Create/complete `docs/anti-slop-reaudit-2026-08-27/06_IMPLEMENTATION_CHANGELOG.md` through `10_FINAL_VERDICT.md`.
- Modify `package.json`, `pnpm-lock.yaml`, `astro.config.mjs`, and create `.openai/hosting.json` only during the post-verification Sites migration task.
- Remove `.vercel/project.json` linkage and `vercel.json` only after Sites production succeeds and the remote Vercel project is deleted.

### Task 1: Lock and test presentation semantics

- [ ] **Step 1: Write failing tests in `src/components/proofPresentation.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { actorLabel, relationLabel } from './proofPresentation'

describe('proof presentation', () => {
  it('uses mathematical relation language instead of dashboard badge language', () => {
    expect(relationLabel(undefined)).toBe('Not checked')
    expect(relationLabel({ status: 'broken' } as never)).toBe('Does not follow')
    expect(relationLabel({ status: 'downstream' } as never)).toBe('After the first break')
  })
  it('names every actor without collapsing inspector actions into agent actions', () => {
    expect(actorLabel('learner')).toBe('Learner')
    expect(actorLabel('agent')).toBe('Agent')
    expect(actorLabel('local-inspector')).toBe('Local inspection')
  })
})
```

- [ ] **Step 2: Run the focused test and require failure**

Run: `pnpm vitest run src/components/proofPresentation.test.ts`  
Expected: FAIL because `proofPresentation.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
import type { ActionSource } from '../domain/session/types'
import type { StepVerdict } from '../domain/math/derivation'

export function actorLabel(source: ActionSource): string {
  return source === 'agent' ? 'Agent' : source === 'local-inspector' ? 'Local inspection' : 'Learner'
}

export function relationLabel(verdict: StepVerdict | undefined): string {
  if (!verdict) return 'Not checked'
  if (verdict.status === 'sound') return verdict.relation === 'first' ? 'Starting line' : verdict.relation
  if (verdict.status === 'broken') return 'Does not follow'
  if (verdict.status === 'downstream') return 'After the first break'
  if (verdict.status === 'unreadable') return 'Could not read'
  return 'Could not determine'
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `pnpm vitest run src/components/proofPresentation.test.ts && pnpm test`  
Expected: focused tests pass; full existing suite remains green.

### Task 2: Build line-local proof semantics

- [ ] **Step 1: Replace `StepBadge` with a semantic relation block**

Use `relationLabel(verdict)` and render:

```tsx
<p className={`relation relation-${verdict?.status ?? 'idle'}`}>
  <span className="relation-mark" aria-hidden="true" />
  <span>{relationLabel(verdict)}</span>
</p>
```

- [ ] **Step 2: Move diagnosis, annotations, and proposal into `.line-evidence` inside each `<li>`**

DOM order must be expression, relation, diagnosis, notes, proposal, actions. Keep existing reducer calls and proposal buttons unchanged.

- [ ] **Step 3: Convert the line list into a responsive proof grid**

Wide rows use `grid-template-columns: 40px minmax(0,1fr) minmax(220px,280px) 44px`; narrow rows use one expression column with evidence below. A CSS spine may connect `.relation-mark` elements, but no global decorative rule is allowed.

- [ ] **Step 4: Run typecheck and the complete test suite**

Run: `pnpm typecheck && pnpm test`  
Expected: zero type errors; all tests pass.

### Task 3: Demote WebMCP inspection without hiding it

- [ ] **Step 1: Create `SessionDetails.tsx`**

Render a native `<details className="session-details">` with summary `Session details · {connection label}`. Inside, render `AgentConsole` followed by chronological activity. Preserve exact tools, arguments, local execution, output, actor labels, and no-WebMCP recovery.

- [ ] **Step 2: Simplify `AgentConsole.tsx`**

Remove the permanent “Page capability” kicker, rule, and general thesis. Keep a concise inspector introduction and the six exact tool disclosures. Replace read/write pills with plain text metadata.

- [ ] **Step 3: Replace the `<aside className="margin">` in `Scratchpad.tsx`**

Render `SessionDetails` after the primary work actions. Pass `status`, `tools`, `onRun`, `revision`, `suggestedLatex`, and `activities`.

- [ ] **Step 4: Verify no capability is lost**

Run: `pnpm test && pnpm typecheck`  
Expected: all six definitions and registry tests pass; TypeScript passes.

### Task 4: Consolidate the visual system

- [ ] **Step 1: Replace the frozen Sarsa token rationale in `tokens.css`**

Use neutral canvas, Mathos blue, verified green, break rust, proposal indigo, graphite, Archivo, KaTeX, and Fira Code roles from the canonical contract. Remove `--space-section`, universal `.kicker/.rule`, hover scale, and warm-paper comments.

- [ ] **Step 2: Rewrite `scratchpad.css` as one coherent stylesheet**

Remove duplicate selector eras. Implement document header, premise strip, proof rows, relation states, local evidence, composer, refusal, transfer signal, session disclosure, inspector, activity, loading, focus, 44px targets, 320px reflow, and reduced motion.

- [ ] **Step 3: Run source fingerprint checks**

Run:

```powershell
rg -n -i "kicker|text-transform:\s*uppercase|transition:\s*all|gradient|glass|glow|shadcn|base-nova|rounded-lg|shadow-sm" src
```

Expected: no repeated editorial kicker system, no first-wave bundle, no stock-stack fingerprint, and no `transition: all`; any gradient is limited to a truthful loading skeleton and documented.

- [ ] **Step 4: Run build and typecheck**

Run: `pnpm typecheck && pnpm build`  
Expected: zero type errors and successful production build.

### Task 5: Replace the landing with a real transaction

- [ ] **Step 1: Rewrite `src/pages/index.astro`**

The first viewport must show: learner expression, page “Does not follow” with missing term, agent proposed replacement explicitly not applied, and learner accept/reject controls represented as a product preview. Use one primary link to `/learn`. Below it, explain page truth, shared live state, six-tool boundary, and bounded learning claim in compact document sections.

- [ ] **Step 2: Rewrite `src/styles/landing.css`**

Use transaction geometry, mathematical baselines, compact vertical rhythm, no three-card row, no tracked uppercase eyebrow, no universal section rules, and narrow-screen adjacency.

- [ ] **Step 3: Validate semantics and production output**

Run: `pnpm typecheck && pnpm build`  
Expected: successful build; one H1; valid route links; no compilation errors.

### Task 6: Rendered feedback loop and defect repair

- [ ] **Step 1: Start or reuse the production preview**

Run: `pnpm preview --host 127.0.0.1 --port 4322` and retain the session.

- [ ] **Step 2: Open the existing coherent experience as the Sites first meaningful preview**

Use the single Codex browser tab only after `/` and `/learn` compile and respond successfully. Reuse the same tab through publishing.

- [ ] **Step 3: Inspect representative pixels**

Capture and inspect landing 1440/390, empty connected, diagnosis, proposal, transfer evidence, no-WebMCP, 200% equivalent, and reduced motion. Fix only evidence-backed visual, responsive, or interaction defects.

- [ ] **Step 4: Repeat until no high-severity visual/UX issue remains**

Each change must name the failed contract rule and be recorded in `06_IMPLEMENTATION_CHANGELOG.md`.

### Task 7: Complete the after screenshot matrix

- [ ] **Step 1: Extend the capture harness**

Add explicit focus-selector, scroll, long-content, and metadata hooks without weakening current E2E behavior.

- [ ] **Step 2: Capture every required state**

Store in `docs/anti-slop-reaudit-2026-08-27/after/`: desktop, laptop, tablet, mobile, 125/150/200/400%, keyboard focus, reduced motion, empty, populated, broken, annotation, proposal, refusal, transfer, evidence, loading, error/conflict, connected, and unavailable.

- [ ] **Step 3: Write `07_SCREENSHOT_MATRIX.md`**

For every image record exact viewport/runtime, state setup, visible result, overflow, focus/interaction observation, and disposition.

### Task 8: Run five independent adversarial reviews

- [ ] **Step 1: Dispatch isolated reviewers**

Reviewer A: generic and second-order slop. Reviewer B: Mathos/math pedagogy. Reviewer C: WebMCP/product truth. Reviewer D: accessibility/interaction. Reviewer E: novelty/hostile judge. Give each the final rendered screenshots and contract, not other reviewers’ conclusions.

- [ ] **Step 2: Reconcile findings**

Fix every high issue and justified medium issue; reject detector-driven regressions with evidence.

- [ ] **Step 3: Write `08_ADVERSARIAL_REVIEWS.md`**

Record each independent finding, response, evidence, and residual disagreement.

### Task 9: Run the full release gates

- [ ] **Step 1: Automated gates**

Run: `pnpm test && pnpm typecheck && pnpm build`  
Expected: complete suite green, zero type errors, production build success.

- [ ] **Step 2: Real WebMCP journey**

Run the Chrome 151 flagged harness through all six tools, invalid input, refusal/recovery, stale revision, alternate order, learner acceptance, fresh transfer, and bounded receipt.

- [ ] **Step 3: Math and state hostility**

Re-run unusual equivalent forms, wrong plausible lines, unrelated derivations, hostile input, persistence corruption, multi-tab conflict, double-click guard, reload, and back-forward cache.

- [ ] **Step 4: Accessibility and interaction**

Verify keyboard-only completion, focus tree/order, accessible math names, live announcements, focus not obscured, 24/44px targets, text/non-text contrast, 320 CSS px/400% reflow, reduced motion, long expressions, loading/error/conflict recovery, and no horizontal page overflow.

- [ ] **Step 5: Write `09_ACCESSIBILITY_INTERACTION_AUDIT.md` and `10_FINAL_VERDICT.md`**

List exact evidence, remaining high/medium risks, audit limitations, and subjective judgments. Never reuse “40/40” or “zero” unless independently earned.

### Task 10: Migrate the verified site to ChatGPT Sites

- [ ] **Step 1: Inspect an official Sites scaffold outside the project**

Use `@openai/create-sites@0.2.0` only to establish the required worker/build shape. Do not replace the working application with starter content.

- [ ] **Step 2: Adapt the existing Astro/Vite project**

Add `@openai/sites-vite-plugin@0.2.0`, `.openai/hosting.json`, and Cloudflare Worker-compatible ESM output while preserving package manager, routes, client behavior, fonts, tests, and source. If Astro cannot produce the required Sites entrypoint safely, port the two routes and React island to the scaffolded Vinext shell without changing product behavior.

- [ ] **Step 3: Re-run all application gates on the Sites build**

The migration is not complete if WebMCP registration, storage, math, routing, font assets, or accessibility change.

- [ ] **Step 4: Create and persist one Sites project**

Use title `Mathos — Second Try`, description naming the learner-owned derivation and browser verification, and the available slug closest to `mathos-second-try`. Persist the exact opaque `project_id` immediately.

- [ ] **Step 5: Push, package, save, and deploy the exact validated commit**

Use per-command credential authentication, the Sites packaging helper, a saved version, and owner-only private deployment unless access verification requires user approval.

- [ ] **Step 6: Poll to terminal success and verify the live replacement**

Open the production Sites URL in the existing browser tab and prove `/`, `/learn`, assets, and WebMCP progressive enhancement work.

### Task 11: Remove Vercel only after cutover

- [ ] **Step 1: Re-read `.vercel/project.json` and fetch the remote project**

Confirm exact project `prj_zNVcaOmUHFSMyNKEzguAxGRSMlpg`, team `team_k1RFHVFi2t7XEI5uNw1Id3Pn`, and project name `hackathon-build` immediately before deletion.

- [ ] **Step 2: Delete the remote project**

Use an authenticated Vercel deletion mechanism. If the installed connector lacks deletion, use the authenticated Vercel CLI/API already linked to this exact project. Do not delete any team, domain, or adjacent project.

- [ ] **Step 3: Remove local Vercel linkage**

After remote deletion is confirmed, remove `.vercel/` and `vercel.json`; record whether recovery is possible in `06_IMPLEMENTATION_CHANGELOG.md` and `10_FINAL_VERDICT.md`.

- [ ] **Step 4: Final commit and clean-state audit**

Commit the verified redesign, audit artifacts, Sites configuration, and Vercel removal. Require `git status --short` to be empty and re-open the Sites production URL.

## Self-review

- Spec coverage: research, four directions, approval, contract, implementation, complete states, rendered loop, five reviewers, all technical gates, required 00–10 artifacts, Sites cutover, and Vercel deletion are each mapped to a task.
- Placeholder scan: no TODO/TBD or unspecified “handle edge cases” steps remain.
- Type consistency: actor sources, verdict statuses, tool props, Sites IDs, and deployment/version IDs match current source and connector contracts.

