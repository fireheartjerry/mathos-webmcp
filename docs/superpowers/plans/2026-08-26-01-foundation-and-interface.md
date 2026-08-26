# Foundation and Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the tested Astro application, the Sarsa-inspired landing page, and the real learning-studio interface shell.

**Architecture:** Astro pre-renders the landing page and `/learn`. The landing page uses plain Astro, CSS, and one GSAP timeline. `/learn` hydrates one React island that consumes a stable `StudioViewModel`; the learning engine supplies that model in the next plan.

**Tech Stack:** Astro 7.2.7, `@astrojs/react` 6.0.4, `@astrojs/vercel` 11.0.8, React 19.2.8, GSAP 3.15.0, TypeScript 7.0.2, Vitest 4.1.11, Playwright 1.62.1, Biome 2.5.10.

**Spec:** `docs/plans/2026-08-26-mathos-webmcp-design.md`

## Global Constraints

- Follow every global constraint in `2026-08-26-00-mathos-webmcp-master.md`.
- Keep the landing page framework-free.
- Use one React island on `/learn`.
- Use one visual motif: an equation becomes a path, then the path becomes a transformer.
- Do not use the Sarsa mark, colors, words, or source code.
- Do not use gradients, glass panels, generic card grids, or decorative monospace labels.
- Use real HTML text above decorative SVG.
- Provide complete mobile and reduced-motion versions.

---

### Task 1: Create the application and quality gates

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `.nvmrc`
- Create: `.gitignore`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/env.d.ts`
- Create: `src/pages/index.astro`
- Create: `tests/unit/smoke.test.ts`
- Create: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: Node.js 24 and pnpm 11.10.0.
- Produces: the commands `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, and `test:browser`.

- [ ] **Step 1: Add the package manifest**

Use this exact dependency set:

```json
{
  "name": "mathos-webmcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.10.0",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:browser": "playwright test"
  },
  "dependencies": {
    "@astrojs/react": "6.0.4",
    "@astrojs/vercel": "11.0.8",
    "astro": "7.2.7",
    "gsap": "3.15.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.4",
    "@biomejs/biome": "2.5.10",
    "@playwright/test": "1.62.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.6",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "jsdom": "30.0.1",
    "typescript": "7.0.2",
    "vitest": "4.1.11"
  }
}
```

- [ ] **Step 2: Configure Astro and tests**

Use React integration, the Vercel adapter, and prerendered pages by default:

```js
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react()],
  adapter: vercel(),
  output: "server",
  vite: { test: { environment: "jsdom" } },
});
```

Set `export const prerender = true` in `index.astro` and each static page.

- [ ] **Step 3: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";

describe("project foundation", () => {
  it("uses the challenge schema version", async () => {
    const module = await import("../../src/features/learning/domain/version");
    expect(module.SESSION_SCHEMA_VERSION).toBe(1);
  });
});
```

- [ ] **Step 4: Run the smoke test and observe the missing module**

Run: `pnpm install && pnpm test -- tests/unit/smoke.test.ts`

Expected: FAIL because `src/features/learning/domain/version.ts` does not exist.

- [ ] **Step 5: Add the minimal version module**

```ts
export const SESSION_SCHEMA_VERSION = 1 as const;
```

- [ ] **Step 6: Add the quality workflow**

Use Node.js 24 and run install, format check, lint, typecheck, tests, build, and Playwright in that order.

- [ ] **Step 7: Run all foundation gates**

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
git add package.json pnpm-lock.yaml .nvmrc .gitignore astro.config.mjs tsconfig.json biome.json vitest.config.ts playwright.config.ts src/env.d.ts src/pages/index.astro src/features/learning/domain/version.ts tests/unit/smoke.test.ts .github/workflows/quality.yml
git commit -m "build: establish Astro quality gates"
```

### Task 2: Build the base layout and visual tokens

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/config/site.ts`
- Create: `src/components/landing/MathosMark.astro`
- Test: `tests/browser/base-layout.spec.ts`

**Interfaces:**
- Consumes: the Astro application from Task 1.
- Produces: `BaseLayout`, `SITE`, CSS tokens, focus styles, and reduced-motion defaults.

- [ ] **Step 1: Write the browser test**

```ts
import { expect, test } from "@playwright/test";

test("landing page has one main heading and a visible focus style", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
```

- [ ] **Step 2: Run the test and observe the missing page structure**

Run: `pnpm test:browser -- tests/browser/base-layout.spec.ts`

Expected: FAIL because the landing page does not contain the final layout.

- [ ] **Step 3: Add the site configuration**

```ts
export const SITE = {
  brand: "Mathos",
  productName: "Mathos",
  title: "Mathos · From calculus to transformers",
  description: "A learning path that changes from your work.",
  primaryAction: { label: "Start with calculus", href: "/learn" },
} as const;
```

Keep `productName` as `Mathos` through release unless the authorized company representative explicitly approves a different public name.

- [ ] **Step 4: Add the design tokens**

Use these exact starting values:

```css
:root {
  --paper: #fbfaf6;
  --panel: #ffffff;
  --ink: #171611;
  --ink-muted: #625f55;
  --hairline: rgba(23, 22, 17, 0.14);
  --path-calc: #c4512b;
  --path-vector: #285f8f;
  --path-learning: #2f7552;
  --path-attention: #735a9e;
  --success: #246b46;
  --warning: #9b5b18;
  --error: #a53a32;
  --font-sans: "Switzer", ui-sans-serif, system-ui, sans-serif;
  --section-space: clamp(6rem, 14vh, 10rem);
  --focus: 2px solid var(--ink);
}
```

- [ ] **Step 5: Build `BaseLayout` and the Mathos mark**

The layout must include title, description, Open Graph tags, theme color, skip link, `main` target, and global styles.

Use a simple wordmark treatment. Do not invent a replacement company logo.

- [ ] **Step 6: Pass the browser test and accessibility scan**

Run: `pnpm test:browser -- tests/browser/base-layout.spec.ts`

Expected: PASS with one heading and a visible focus target.

- [ ] **Step 7: Commit**

```powershell
git add src/layouts src/styles src/config src/components/landing/MathosMark.astro tests/browser/base-layout.spec.ts
git commit -m "feat: add accessible Mathos page foundation"
```

### Task 3: Build the Primer-style landing story

**Files:**
- Create: `src/components/landing/Nav.astro`
- Create: `src/components/landing/Hero.astro`
- Create: `src/components/landing/Thesis.astro`
- Create: `src/components/landing/LearningLoop.astro`
- Create: `src/components/landing/MathosProof.astro`
- Create: `src/components/landing/FinalAction.astro`
- Create: `src/components/landing/Footer.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/browser/landing-story.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `SITE`, and the visual tokens.
- Produces: the complete static landing story and links to `/learn`.

- [ ] **Step 1: Write the story-order test**

```ts
import { expect, test } from "@playwright/test";

test("landing page tells the product story in order", async ({ page }) => {
  await page.goto("/");
  const sections = page.locator("main > section");
  await expect(sections).toHaveCount(5);
  await expect(sections.nth(0)).toContainText("calculus");
  await expect(sections.nth(1)).toContainText("path");
  await expect(sections.nth(2)).toContainText("mistake");
  await expect(sections.nth(3)).toContainText("Mathos");
  await expect(sections.nth(4).getByRole("link", { name: "Start with calculus" })).toBeVisible();
});
```

- [ ] **Step 2: Run the test and observe the missing sections**

Run: `pnpm test:browser -- tests/browser/landing-story.spec.ts`

Expected: FAIL because the five sections do not exist.

- [ ] **Step 3: Implement the five-section story**

Use these content roles:

```ts
export const LANDING_STORY = [
  "Begin with calculus. End with a transformer that you trained.",
  "Your path changes from the work that you show.",
  "A mistake changes the lesson, the video, and the next problem.",
  "Mathos brings this path to real learners.",
  "Start with calculus",
] as const;
```

Do not add a feature-card grid. Use editorial paragraphs, hairline rules, and the persistent path motif.

- [ ] **Step 4: Add truthful proof slots**

`MathosProof.astro` must accept an array of verified facts. Render no statistic when its source is absent.

```ts
export interface ProofFact {
  readonly value: string;
  readonly label: string;
  readonly sourceUrl: string;
}
```

Start with no numerical facts. The release plan adds verified facts.

- [ ] **Step 5: Run the story test**

Run: `pnpm test:browser -- tests/browser/landing-story.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/landing src/pages/index.astro tests/browser/landing-story.spec.ts
git commit -m "feat: tell the Mathos learning thesis"
```

### Task 4: Build the equation-to-transformer hero sequence

**Files:**
- Create: `src/components/landing/HeroScene.astro`
- Create: `src/components/landing/hero-timeline.ts`
- Create: `src/components/landing/hero-scene.ts`
- Modify: `src/components/landing/Hero.astro`
- Test: `tests/browser/hero-motion.spec.ts`

**Interfaces:**
- Consumes: the hero copy and visual tokens.
- Produces: `window.__mathosHero.setProgress(value)` in development and test builds.

- [ ] **Step 1: Write deterministic hero tests**

```ts
import { expect, test } from "@playwright/test";

test("hero keeps one motif through all beats", async ({ page }) => {
  await page.goto("/?heroTest=1");
  await page.evaluate(() => window.__mathosHero?.setProgress(0.5));
  await expect(page.locator("[data-hero-path='learning']")).toBeVisible();
  await page.evaluate(() => window.__mathosHero?.setProgress(1));
  await expect(page.locator("[data-hero-transformer='complete']")).toBeVisible();
});

test("reduced motion shows the resolved scene", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-hero-state='resolved']")).toBeVisible();
});
```

- [ ] **Step 2: Run the tests and observe the missing scene**

Run: `pnpm test:browser -- tests/browser/hero-motion.spec.ts`

Expected: FAIL because the hero control and scene do not exist.

- [ ] **Step 3: Create the five hero beats**

Use one inline SVG and these beats:

1. A chain-rule equation appears.
2. The equation becomes a calculation graph.
3. One path branches after a visible mistake.
4. The corrected path becomes an attention map.
5. The map resolves into one small transformer block.

Use `stroke-dasharray` and `stroke-dashoffset`. Do not add the paid DrawSVG plugin.

- [ ] **Step 4: Implement the GSAP timeline**

Use one scrubbed timeline on desktop. Use a short one-time sequence on mobile. Skip all timeline setup for reduced motion.

- [ ] **Step 5: Pass deterministic, mobile, and reduced-motion tests**

Run: `pnpm test:browser -- tests/browser/hero-motion.spec.ts`

Expected: PASS at desktop, 390-pixel mobile width, and reduced-motion mode.

- [ ] **Step 6: Commit**

```powershell
git add src/components/landing/Hero* tests/browser/hero-motion.spec.ts
git commit -m "feat: animate calculus into a transformer"
```

### Task 5: Build the learning-studio shell

**Files:**
- Create: `src/pages/learn.astro`
- Create: `src/features/learning/ui/LearningStudio.tsx`
- Create: `src/features/learning/ui/PathMap.tsx`
- Create: `src/features/learning/ui/ProblemWorkspace.tsx`
- Create: `src/features/learning/ui/LessonPanel.tsx`
- Create: `src/features/learning/ui/VideoPanel.tsx`
- Create: `src/features/learning/ui/ReceiptPanel.tsx`
- Create: `src/features/learning/ui/ActivityBar.tsx`
- Create: `src/features/learning/ui/studio.css`
- Create: `src/features/learning/ui/view-model.ts`
- Create: `src/features/learning/ui/judge-fixture.ts`
- Test: `tests/unit/studio-view.test.tsx`
- Test: `tests/browser/studio-layout.spec.ts`

**Interfaces:**
- Consumes: the React integration and global styles.
- Produces: `LearningStudio({ initialView }: { initialView: StudioViewModel })`.

- [ ] **Step 1: Define the view model**

```ts
export interface StudioViewModel {
  readonly path: readonly PathNodeView[];
  readonly currentProblem: ProblemView;
  readonly lesson: LessonView | null;
  readonly video: VideoView | null;
  readonly receipt: ReceiptView | null;
  readonly activity: readonly ActivityView[];
  readonly webMcpAvailable: boolean;
}
```

- [ ] **Step 2: Write the component test**

```tsx
it("shows the path, problem, video area, and activity bar", () => {
  render(<LearningStudio initialView={JUDGE_STUDIO_FIXTURE} />);
  expect(screen.getByRole("navigation", { name: "Learning path" })).toBeVisible();
  expect(screen.getByRole("main", { name: "Current learning workspace" })).toBeVisible();
  expect(screen.getByRole("region", { name: "Mathos video" })).toBeVisible();
  expect(screen.getByRole("log", { name: "Agent activity" })).toBeVisible();
});
```

- [ ] **Step 3: Run the test and observe the missing components**

Run: `pnpm test -- tests/unit/studio-view.test.tsx`

Expected: FAIL because `LearningStudio` does not exist.

- [ ] **Step 4: Build the semantic interface**

Use this desktop layout:

```css
.studio {
  display: grid;
  grid-template-columns: minmax(13rem, 18rem) minmax(0, 1fr) minmax(18rem, 24rem);
  grid-template-areas:
    "path workspace support"
    "activity activity activity";
  min-height: 100dvh;
}
```

At widths below 960 pixels, use one column in the order workspace, support, path, activity.

- [ ] **Step 5: Use a complete judge fixture**

The fixture must show the shared-path calculus problem, one missing-path diagnosis, one video state, one transfer receipt, and all ten path stages.

The fixture is a visual input, not simulated product behavior. Do not attach fake loading or tool actions.

- [ ] **Step 6: Pass component and browser layout tests**

Run:

```powershell
pnpm test -- tests/unit/studio-view.test.tsx
pnpm test:browser -- tests/browser/studio-layout.spec.ts
```

Expected: PASS with no horizontal overflow at 390, 768, 1280, and 1600 pixels.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/learn.astro src/features/learning/ui tests/unit/studio-view.test.tsx tests/browser/studio-layout.spec.ts
git commit -m "feat: build the learning studio shell"
```

### Task 6: Complete the interface accessibility and performance gate

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/browser/accessibility.spec.ts`
- Create: `tests/browser/performance.spec.ts`
- Modify: `src/styles/global.css`
- Modify: `src/features/learning/ui/studio.css`

**Interfaces:**
- Consumes: the landing page and studio shell.
- Produces: the first interface review gate.

- [ ] **Step 1: Add accessibility checks**

Install and use `@axe-core/playwright` 4.13.0. Fail on serious or critical findings.

- [ ] **Step 2: Add keyboard journeys**

The tests must reach the main action, every studio control, the video controls, and the activity log without pointer input.

- [ ] **Step 3: Add performance assertions**

Assert that the landing page loads no React bundle. Assert that `/learn` loads the React island. Record transferred JavaScript size for both pages.

- [ ] **Step 4: Run the interface gate**

Run:

```powershell
pnpm test
pnpm test:browser
pnpm build
```

Expected: all tests pass, the landing page stays framework-free, and `/learn` has no horizontal overflow.

- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml playwright.config.ts tests/browser src/styles/global.css src/features/learning/ui/studio.css
git commit -m "test: enforce interface quality"
```
