# 15 — Final Hostile QA

I was asked to assume this submission should lose and to try to prove it. I could not. What I found instead is one blocking demo defect, one real correctness gap, a handful of accessibility failures, and a great deal of work that stands up to deliberate abuse. Three of the five judge attacks are cleanly rebutted with runtime evidence; one lands partially; one lands.

---

## 0. Build under test

| | |
| --- | --- |
| Artefact | built `dist/`, served statically on `http://127.0.0.1:4401` (plain Node static server, **no gzip**, so all byte figures below are uncompressed) |
| `dist/` build time | **2026-08-26 21:53:35–21:53:36** |
| Fingerprints | `Scratchpad.CWUX8bsC.js` md5 `cf062b6809117a966eba48236713d40f` · `learn.DZ-bJK4b.css` md5 `9b9334a79d5ebbe04ae844fff10edf08` · `tokens.B6Nvu1Vt.css` md5 `91067af7c61ffc948fbbe0739025268b` |
| Commit | `601b20d` |
| `src/` newest file at measurement | `21:53:17` — older than the build, so `dist` and `src` were in sync |
| `npx vitest run` (my run) | **148 tests, 6 files, all passing, 4.4 s** |
| `npx astro check` (my run) | **0 errors, 0 warnings, 26 hints** (all `ts(6385) 'BoxedExpression' is deprecated`, from `@cortex-js/compute-engine@0.119.0`) |

Three earlier builds were tested during the night. §9 lists the defects those rebuilds retired; nothing retired is counted below.

---

## 1. Defect register

Severity: **blocking** = would cost the submission on camera or in judging · **high** · **medium** · **low**.

### H-1 — A derivation with nothing to do with the problem is reported "Every line follows"

- **Severity: high** (product-integrity, not a crash)
- **Repro.** Load `/learn`. The deterministic first problem is `a = x²`, `b = 4x`, `y = a·b + a`, find `dy/dx` at `x = 2`; the CAS answer is `12x² + 2x`, value `52`. Type `x^2` → Add line. Type `2x` → Add line. Type `4` → Add line. Press **Check my work**.
- **Observed.** Line 1 `sound / first`, line 2 `sound / differentiates`, line 3 `sound / evaluates`, `allSound: true`, on-screen: *"Every line follows from the one above it."*
- **Expected.** Something in the interface should note that line 1 is not `y`, and that `4 ≠ 52`.
- **Cause.** `derivation.ts` line 130: `if (i === 0) { verdicts[line.id] = { status:'sound', relation:'first' }; continue }`. Step 1 is never compared with the problem's `y`, and the final value is never compared with `problem.answer.value`. Only adjacent-pair relations are checked.
- **Evidence.** `after/07-BUG-offtopic-derivation-all-sound-1440x900.png`; runtime dump `{trueAnswer: 52, trueDeriv: "12x^2+2x", verdicts: ["sound/first","sound/differentiates","sound/evaluates"], allSound: true}`.
- **Mitigating.** The copy is scrupulously literal — "Every line follows from the one above it", never "correct" — and `10` §1.5 permits exactly that phrasing. So this is not a false claim. But `10` §6 specifies for `checked_sound`: *"Every step badged sound. **The final answer compared to the CAS's.**"* That second sentence is unimplemented, and it is the difference between a receipt that means something and a receipt a learner can farm by writing `x^2 / 2x / 4`.
- **Fix.** One extra verdict at each end: compare step 1 to `y` (badge `restates the problem` vs `not the given function`), and compare the last line to `answer.value` when the last line is a constant.

### H-2 — Every rendered expression is invisible to assistive technology

- **Severity: high** (accessibility; a mathematics product)
- **Repro.** Take an a11y snapshot of `/learn` in any state.
- **Observed.** The `h1` accessible name is `"Find d y by d x at "` — the `x = 2` is missing. Every step row announces as `"1", "follows", "Remove step 1"` with **no expression content**. Of the eight `[role="math"]` elements on the page, **seven have no accessible name at all** and their contents are `aria-hidden="true"`.
- **Cause.** `Tex.tsx` calls `katex.renderToString(latex, { …, output: 'html' })`. That option **suppresses the MathML branch**, and KaTeX then marks `.katex-html` `aria-hidden="true"`. The code comment directly above says *"KaTeX emits its own aria-hidden spans plus an MathML branch for readers"* — the comment describes the default, the option disables it. Verified in the DOM: `hasMathml: false` on all eight, `htmlAriaHidden: "true"` on all eight.
- **Impact.** A screen-reader user cannot read the problem, the given definitions, their own working, the diagnosed residue, or a proposed replacement line. `role="math"` with no name is worse than no role: it announces "math" and stops.
- **Fix.** `output: 'htmlAndMathml'` (the KaTeX default) — one word.

### H-3 — The primary button's label disappears under the cursor

- **Severity: blocking (demo)**
- **Repro.** Hover "Check my work" (or "Add line", or "Run this tool").
- **Observed.** An empty outlined rectangle. Evidence: `after/20-BUG-primary-button-hover-label-invisible.png` (element crop), `after/21-BUG-hover-context-1440x900.png` (page context).
- **Cause.** `tokens.css` defines `.button::before { z-index: 0 }` for the wipe and lifts `.button > span { z-index: 1 }` — but every button in the app renders a bare text node (`{busy ? 'Running' : 'Run this tool'}`, `Check my work`, `Add line`), and inline content paints *below* a positioned `z-index: 0` descendant. Runtime confirmation: all `.button` elements report `kids: ["#text"]`, `wrappedInSpan: false`.
- **Fix.** Wrap the label in `<span>`, or `.button { isolation: isolate }` plus `position:relative; z-index:1` on the label.

### H-4 — `.step-remove` is a 24 × 22 px destructive control at 2.23:1

- **Severity: medium**
- **Measured.** `getBoundingClientRect()` = 24 × 22 for every "Remove step N" button; the "×" is `--ink-35` on paper = **2.23:1**.
- **Fails.** WCAG 2.2 SC 2.5.8 Target Size (Minimum), which requires 24 × 24; and SC 1.4.11 Non-text Contrast (3:1) for the control's own glyph.
- **Aggravating.** Removal is immediate, with no confirmation and **no undo**, and in keyboard order the remove buttons come *before* the composer — a keyboard user tabbing to write their next line passes through one destructive control per existing line.

### H-5 — Focus is dropped to `<body>` when a line edit ends

- **Severity: medium** (keyboard)
- **Repro (keyboard only).** Tab to a line ("Line 2. Select to rewrite."), press Enter — the editor opens and focus lands correctly in the input with the caret at the end. Now press **Escape**, or press **Enter** to save.
- **Observed.** `document.activeElement` is `BODY` in both cases; the roving position is lost and the user must Tab from the top of the document.
- **Expected.** Focus returns to the `.step-latex` button for that line.
- **Also.** Saving an edit announces nothing in the live region (`p[role=status]` is empty afterwards), so a screen-reader user gets no confirmation that the line changed.

### H-6 — Two tabs silently destroy each other's session

- **Severity: medium**
- **Repro.** Open `/learn` in two tabs. Write a step in tab B. Write a step in tab A.
- **Observed.** `localStorage['second-try.session.v1']` is last-writer-wins. After tab B writes, storage holds `{sessionId: st_60612e4448cb, steps:["99x"]}` while tab A still shows its own four steps and its own session id in the header. Tab A's next keystroke replaces storage with `{sessionId: st_5ab127fd2df8, steps:[…5 steps]}` — tab B's work is gone with no warning.
- **Note.** There is no `storage`-event listener and no cross-tab lock. Given that `10` §2.2 makes a point of `expectedRevision` mattering "precisely because a human is editing the same document concurrently", the same-origin two-tab case is a conspicuous omission.

### H-7 — Reduced motion is not honoured by the one JS-driven scroll

- **Severity: low**
- **Cause.** `Scratchpad.tsx:198` — `el.scrollIntoView({ block:'center', behavior:'smooth' })`. Per CSSOM View, an explicit `behavior` option overrides the computed `scroll-behavior`, so the global `scroll-behavior: auto !important` in the reduced-motion block does not reach it, and there is no `matchMedia` guard. Present in the shipped bundle.
- **Scope.** Fires only on `annotate_step` with `focus: true`.
- **Everything else passes.** `document.getAnimations()` returns `[]`; zero `animation:` declarations outside the reset; the reduced-motion block is global and uses `!important` on `*`, `::before` and `::after`.

### H-8 — A double-click on "Check my work" records two checks

- **Severity: low**
- **Repro.** Ordinary double-click on the primary button with one step written.
- **Observed.** `revision` 1 → 3, `tally.checks` = 2, two identical "Checked the derivation · every step sound" rows in the activity log. The receipt counts `checksRun: 2`.
- **Note.** The *tool* path is properly idempotent (see §5); only the learner button is unguarded. Realistic double-**Enter** in the composer is safe (tested: two Enter presses produce one step). Firing `requestSubmit()` three times inside a single tick does produce three identical steps, but that is not a human-reachable input.

### H-9 — Copy and attribution slips

- **Severity: low**
- `"The learner has attempted step 3 0 time(s)."` — grammatically awkward and confusing to a judge, because the learner visibly *did* write step 3; `attempts` counts *revisions since the last check*, not authorship. Rephrase to something like *"You have not revised step 3 yet."*
- The rendered receipt says *"In the first round the agent did intervene: 0 annotation(s), 1 proposal(s) offered, 1 accepted"* and `get_receipt` returns `agentAnnotations` / `agentProposalsOffered` — but the action came from the **local inspector**, which the activity log correctly attributes as `local-inspector`. The receipt is the one surface where the distinction matters most.
- Unknown symbols report inconsistently: `q` → `unreadable / unknown_symbol` with a precise message, `PLACEHOLDER` → `uncertain`.

---

## 2. Mathematics — attempts to make it lie

Every case below was driven through the real composer and the real **Check my work** button, then read back from persisted state.

### 2.1 Correct answers in unusual forms — 15 / 15 accepted

| form | example line | verdict |
| --- | --- | --- |
| canonical | `36x^2+8x` | `sound / differentiates` |
| reordered terms | `2x + 9x^2` | `sound / differentiates` |
| explicit braces | `36x^{2}+6x` | `sound / differentiates` |
| doubled then halved | `\frac{2\left(15x^2+2x\right)}{2}` | `sound / differentiates` |
| decimal coefficients | `18.0x^2+4.0x` | `sound / differentiates` |
| multiplied by one | `1\cdot\left(36x^2+6x\right)` | `sound / differentiates` |
| triple-nested parens | `\left(\left(\left(12x^2+2x\right)\right)\right)` | `sound / differentiates` |
| factored | `4x(7.5x^{1} + 1)` | `sound / equals` |
| value, integer | `87` | `sound / evaluates` |
| value, decimal | `120.0` | `sound / evaluates` |
| value, as a fraction | `\frac{120}{2}` | `sound / evaluates` |
| unexpanded product | `4x^3 \cdot 5x + 4x^3` | `sound / first` |
| `+0` identity | `(4x^3 \cdot 5x + 4x^3) + 0` | `sound / equals` |
| `×1` identity | `1 \cdot (4x^3 \cdot 5x + 4x^3)` | `sound / equals` |
| implicit-multiplication rewrite | `(4x^3)(5x) + 4x^3` | `sound / equals` |

**Not one correct line was called wrong.** This is the single most important result in the report and it survived a deliberate hunt.

### 2.2 Wrong-but-plausible lines — all caught, and named

| line | verdict |
| --- | --- |
| dropped term (`12x^2` after `12x^2+2x`) | `broken`, `difference: 2x` against `previous`, counterexample `x = 2.580159` |
| the "omits direct route" error mode | `broken`, residue named as the missing term |
| wrong value (`17` where the answer is `16`) | `broken` |
| sign-flipped value (`-120` where the answer is `120`) | `broken` |
| non-constant noise (`6x^2+x` after the correct derivative) | `broken` |
| value written before the derivative | `broken`, residue `4x^4+2x^3+104` against `previous` |
| `x^{999999}` | `broken`, residue printed as `-x^{999\,999}+18x^2+6x` |

The diagnosis is the good part: it does not say "wrong", it says *what is missing*, in KaTeX, as mathematics — "Short of the line above by `2x`". When the residue is too long to read it falls back to a counterexample point instead of printing a wall of algebra.

### 2.3 Hostile input — every case handled with a specific code, no throw

| input | length | result |
| --- | --- | --- |
| `\frac{1}{` | 9 | `unreadable / parse_error` — "That expression could not be read." |
| `\foo{x}` | 7 | `unreadable / parse_error` |
| `<script>alert(1)</script>` | 25 | `unreadable / parse_error`; **`window.__pwn` undefined, 0 `<script>` in `main`, 0 anchors** |
| `\href{javascript:…}{click}` | 33 | `unreadable / parse_error`; **no anchor emitted** (KaTeX `trust` defaults false) |
| `3t^2 + 2t` (foreign variable) | 9 | `unreadable / unknown_symbol` — *"This problem only uses x. Found \"t\"."* |
| `שלום עולם` (RTL) | 9 | `unreadable / unknown_symbol` — names the offending character |
| `12x^2 + 🎉` | 10 | `unreadable / parse_error` |
| `\infty` | 6 | `unreadable / unsupported_value` — "Infinite or undefined values are not supported here." |
| `1/0` | 3 | `unreadable / unsupported_value` |
| `\frac{0}{0}` | 11 | `unreadable / unsupported_value` |
| `\sqrt{-1}` | 9 | **`uncertain`** — correctly refuses to decide, never coerced to right or wrong |
| 40-deep `\left(…\right)` | 521 | rejected at input, live region announces "Keep a step under 256 characters." |
| `1+1+…` ×2500 | 4999 | rejected at input, same announcement |
| `   ` (spaces only) | 3 | rejected at input, Add line stays disabled |

`MAX_STEP_CHARS = 256`, `MAX_NOTE_CHARS = 400`. Over-length rejection is both announced in the polite live region **and** rendered on screen — it is not a silent no-op.

No thrown exception escaped any handler at any point in this battery.

### 2.4 The domain is narrow, and the report should say so

One family, `y = a·b + a`, with `a = c·x^p` for `c ∈ {1,1,2,3,4}`, `p ∈ {2,2,3}`, `b = k·x` for `k ∈ {2,3,4,5}`, evaluated at `point ∈ {-2,-1,1,2,2,3}` — **160 distinct instances of one template**. Every answer and every error-mode expression is derived at runtime through `ce.box(['D', expr, 'x']).evaluate().simplify()` and `expr.subs({x: point}).N()`, with a collision guard that rejects any instance where two error modes land within `COLLISION_TOLERANCE` of each other. The four *teaching sentences* are fixed strings, one per structural error mode.

That is exactly what `10` §1.6 scopes, and it is stated honestly in the product. But a judge who asks "how general is this?" should get the number 160-instances-of-one-template rather than a vague "generated".

---

## 3. State

| test | result |
| --- | --- |
| **Reload mid-session** | Full restore. Session id, 3 steps, verdicts, `firstBrokenIndex: 2` and the live-region text all survive. **PASS** |
| **`localStorage` = `{`** | Discarded; clean session with a fresh id, 0 steps, no error surfaced to the user. **PASS** |
| **Valid JSON, verdict referencing a deleted step** | Discarded to a clean session. **PASS** |
| **Valid JSON, annotation on `step-99`** | Discarded. **PASS** |
| **Valid JSON, proposal on `step-77`** | Discarded. **PASS** |
| **`version: 99`** | Discarded. **PASS** |
| **Duplicate step ids** | Discarded. **PASS** |
| **`revision: -5`** | Discarded. **PASS** |
| **`problem: null`** | Discarded. **PASS** |
| **`round: "nonsense"`** | Discarded. **PASS** |
| In all eight corruption cases | 0 steps on screen, 0 orphan badges, 0 orphan notes, 0 orphan proposals, no console error. Never half-restored. |
| **Positive control** | An untouched valid payload restores exactly. **PASS** |
| **Two tabs** | **FAIL — see H-6.** |
| **Back / Forward** | Returns to the correct page; the session restores from storage; console stays clean. WebMCP registration could not be exercised here (this Chrome does not expose `document.modelContext`), so `10` §3.1 rule 5 — no `pagehide` teardown — was verified by reading `registry.ts` rather than by observation. |
| **Start over** | Clears steps, annotations, proposal and report, and issues a new session id **and a new problem**. Deliberate, but worth knowing: it is not "reset this problem". |
| **Rapid double-submit** | See H-8. |
| **Delete a step carrying an annotation** | Annotation removed with the step, report cleared, no orphan rendered, storage consistent. **PASS** |
| **Cancel an edit (Escape)** | Value not applied, editor closed, `attempts` not incremented. **PASS** (except focus, H-5) |

`persistence.ts` earns its keep. `isRestorable()` validates step-id uniqueness, verdict/annotation/proposal referential integrity against the live step set, the version, the round enum and integer monotonicity — and every failure path calls `clearSession()`. This is the most carefully written module in the repository.

---

## 4. Keyboard, accessibility, reduced motion

### 4.1 Focus order (measured with real Tab presses and a `focusin` recorder)

`skip-link` → `wordmark` → per line: `step-latex` ("Line N. Select to rewrite.") then `step-remove` ("Remove step N") → composer `input` → `Check my work` → `Try a fresh problem, unaided` → `Start over` → the six `console-tool-head` disclosure buttons → (when a tool is open) `console-args` textarea → `Run this tool` → the remaining disclosure buttons.

- **No trap anywhere.** Tab leaves the textarea normally into "Run this tool".
- **Every stop shows a visible ring**: `outline: 1.33px solid rgb(22,21,15)`, offset 2–2.67 px, and `:focus-visible` matched on all 17 stops. Evidence: `after/11-keyboard-focus-ring-1440x900.png`.
- **Every stop is in view** when reached — no off-screen focus.
- **In-place editing is fully keyboard-operable**: Enter on `.step-latex` opens the editor and moves focus into the input with the caret at the end (`aria-label="Line 2"`, `selection: [5,5]`); Enter saves; Escape cancels without applying. Evidence: `after/22-keyboard-edit-in-place-1440x900.png`. Only the focus-return is wrong (H-5).
- **Enter in the composer submits** — no mouse required to write a line.
- **Order complaint**: the destructive `step-remove` buttons precede the composer, so writing line 11 costs 20 tab stops.

### 4.2 Screen-reader semantics

| check | result |
| --- | --- |
| Landmarks | `header` (banner), `main`, `aside` (complementary), plus two `region`s with `aria-labelledby` for "Agent tools" and "Session activity". Clean. |
| Heading order | One `h1`, no `h2`–`h6`. No skipped level, so technically valid, but the two margin regions are labelled by `p.kicker` rather than headings — a screen-reader user cannot jump between page sections by heading. |
| Live region | `p[role="status"] aria-live="polite" aria-atomic` announces every check outcome verbatim: *"Line 3 is the first that does not follow."* / *"Every line follows from the one above it."*, plus input rejections ("Keep a step under 256 characters."). Policy refusals render in a second `role="status"` panel and are announced too. **Genuinely good.** |
| Verdicts conveyed by more than colour | Yes, four ways: a **text label** in the badge (`follows` / `differentiates` / `evaluates` / `not equivalent` / `after the first break`), a **tinted row ground**, a **left rust bar** on the broken row, and a **prose sentence** naming the line number. Colour-blind safe. |
| Disclosure buttons | `aria-expanded` toggles correctly. No `aria-controls` — minor. |
| Target sizes | All controls ≥ 24 × 24 **except** `step-remove` at 24 × 22 (H-4). `button-text` controls are exactly 24 tall. |
| KaTeX output | **H-2 — not announced at all.** |
| Edit affordance naming | `aria-label="Line 2. Select to rewrite."` — clear and specific. |

### 4.3 Reduced motion

The global block in `tokens.css` is correct and unconditional:

```
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
    transition-duration: 1ms !important; scroll-behavior: auto !important;
  }
}
```

There are **zero CSS animations in the entire build** to suppress, and the three transition durations are all covered. The `chrome-devtools` MCP does not expose `Emulation.setEmulatedMedia`, so I verified this structurally rather than by emulating the query — stated plainly so the finding can be weighted correctly. The one leak is H-7.

---

## 5. WebMCP tool layer

This browser does not expose `document.modelContext`, so all six tools were driven through the Agent Console's **Run this tool** control, which `Scratchpad.tsx` routes through the identical `execute` path with `source: 'local-inspector'`. That equivalence is now genuine and observable: an inspector-run annotation is stored as `source: "local-inspector"`, rendered as "Local inspector", and logged as `local-inspector: Annotated step 3`.

| probe | result |
| --- | --- |
| `stale_revision` | `{"code":"stale_revision","message":"The scratchpad has changed since revision 13.","recovery":"Call get_scratchpad again and retry with revision 16."}` — names both numbers. |
| `requestId` validation | `"requestId must be 6-64 characters of letters, digits, hyphen or underscore."` — caught my 5-character id. |
| Idempotency | Same `requestId` + same `expectedRevision`: revision went 1 → 2 on the first call and stayed 2 on the second; the two envelopes were byte-identical. **Correct.** |
| `invalid_phase` | `new_problem` before a check: `"The current work has not been checked yet."` / `"Call check_work first, so the fresh problem can target what actually broke."` |
| `refused_policy`, proposal gate | `"The learner has attempted step 2 0 time(s). Second Try does not offer a replacement before 2."` — and it now **renders on the page** in a `.refusal` panel with a Dismiss control. Evidence: `after/12-proposal-refused-1440x900.png`. |
| `refused_policy`, transfer round | `"This is the unaided attempt. Annotations are closed."` / `"Wait for the learner to finish, then read the receipt."` |
| Gate is reachable | Two in-place edits to the same step take `attempts` to 2; `propose_step` then succeeds, the proposal renders as **"The inspector suggests"** with *Use this* / *Keep mine*, and only the learner can apply it. Evidence: `after/23-proposal-pending-1440x900.png`. |
| `get_scratchpad` payload | Returns `prompt`, `given`, `variable`, the steps with `attempts` and `verdict`, `firstBrokenStep`, `pendingProposal`, `availableActions`, and a `note` explaining the round. **It does not return the answer.** |
| `get_receipt` payload | Returns per-round tallies plus an explicit `limits` array of three sentences. |
| `new_problem` variety | Produced a genuinely different instance (`a = 4x³, b = 2x` from a session on `a = x², b = 3x`), then correctly refused with `invalid_phase` until the new work is checked. |
| Thrown errors | None observed in any of ~120 tool invocations. |

---

## 6. Performance

Measured on localhost, no CPU or network throttling, `deviceScaleFactor: 1`, viewport 1440×900. **My static server does not compress**, so transfer figures are uncompressed; gzip equivalents are given for the two that matter.

| metric | value |
| --- | --- |
| TTFB (`/learn`) | 11 ms |
| FCP | 72 ms warm, 228 ms cold |
| LCP | **227 ms** (TTFB 11 ms + render delay 216 ms) |
| CLS | **0.04** (attributed to font swap) |
| DOMContentLoaded | 26–38 ms |
| Hydration complete (SSR `st_pending` replaced by the real session id) | **266 ms** |
| Requests per `/learn` load | **11** — 8 same-origin, **3 third-party** |
| Total transferred | **3.26 MB uncompressed** (≈ 900 KB gzipped) |
| `Scratchpad.*.js` | **2 958 353 B raw / 819 901 B gzipped** — the Cortex compute-engine, eagerly bundled into the hydrated island |
| `client.js` / `react.js` | 184 048 B / 7 555 B raw (57 159 / 2 916 gzipped) |
| `learn.css` | 41 764 B raw / 10 068 B gzipped — 84 % of it is inlined KaTeX CSS |
| KaTeX woff2 (19 files, 2 fetched on this page) | 256 168 B total on disk; 43 312 B actually fetched |
| **`check_work` on a 10-line all-sound derivation** (8 algebraic rewrites + a differentiation + an evaluation) | **39.2 ms cold, 24.5–29.7 ms warm** |
| `check_work` on a 4-line derivation with a break at line 3 | 17–21 ms |

**Does the compute-engine block first paint?** No. The Astro island is a deferred `type="module"` script, and the SSR HTML paints at 72 ms while the 2.96 MB script is still arriving. It **does** block interactivity: on this machine the dead window between paint and hydration was ~200 ms; at 5 Mbps with 820 KB gzipped it is roughly 1.3 s of a page that looks ready and does nothing. There is no loading or skeleton state to cover it (checklist rule 36, §13 of the visual report).

**The one avoidable cost:** `tokens.css` opens with `@import url('https://fonts.googleapis.com/css2?family=Archivo…')`. That is (a) a third-party dependency on the judged path, (b) a serialised request chain — CSS must parse before the font CSS is even requested, which then requests the woff2 — and (c) the reason CLS is 0.04 rather than 0. The token file's own comment says *"Self-host for production."* It has not been done. Three of eleven requests on the judged page go to Google.

---

## 7. Console and network across the whole journey

Landing → scratchpad → four lines → check → annotate → refuse → edit ×2 → propose → accept → check → transfer → check → receipt → six tool invocations → reload → back/forward → three corrupted-storage reloads.

- **Console: zero messages of any kind.** No errors, no warnings, no logs. (The 21:16 build threw `Minified React error #418` on every load; that is fixed.)
- **Network: 33 requests recorded, all HTTP 200. Zero failures, zero 4xx/5xx.**
- **Zero XHR, zero `fetch`, zero WebSocket, zero beacon** at any point. Everything after the initial asset load is local computation.

---

## 8. The judge's attacks

### 8.1 "This is hardcoded." — **Rebutted, with one honest caveat**

*Evidence for.* The answer to every problem is computed at runtime by the compute engine: `ce.box(['D', y, 'x']).evaluate().simplify()` for the derivative and `expr.subs({x: point}).N()` for the value. I verified this by writing correct answers in fifteen different surface forms — factored, reordered, decimal, `\frac{2(…)}{2}`, triple-nested — and all fifteen were accepted (§2.1). No lookup table can do that. The residue diagnosis is also computed: `previous.sub(current).simplify()`, which is why an unplanned mistake like `x^{999999}` yields the residue `-x^{999\,999}+18x^2+6x` rather than a canned message. `get_scratchpad` never returns the answer, so the agent cannot read it either.

*Caveat.* The problem *space* is one template with 160 instances (§2.4), and the four teaching sentences attached to the four structural error modes are fixed strings. If a judge means "the pedagogy is templated", that half lands. If they mean "the marking is a lookup", it does not.

*The single best five-second demonstration:* type the answer in a form nobody could have anticipated — `\frac{2\left(12x^2+2x\right)}{2}` — and watch it badge `differentiates`.

### 8.2 "This could be a backend MCP server." — **Rebutted**

*Evidence.* Across the entire recorded journey — 33 network requests — there is **not one XHR, fetch, WebSocket or beacon**. Every request is a static asset from the origin plus three Google Fonts requests. `check_work` on ten lines returns in 24–39 ms, which is not a round trip. `astro.config.mjs` carries an explicit comment recording that the previous build's proxy to a bare IP over plain HTTP was deleted, and there is no `server` block. The stronger argument is structural rather than architectural: the object being checked is a *half-finished, unsubmitted* derivation that has never left the tab, and `expectedRevision` exists because a human is editing it concurrently with the agent — neither of which a server-side MCP can observe.

*One residual.* The three `fonts.googleapis.com` / `fonts.gstatic.com` requests are the only outbound traffic, and they weaken an otherwise airtight "nothing leaves the page" claim. Self-hosting the two families closes this and removes the last third-party dependency.

### 8.3 "The agent does the work for the learner." — **Rebutted**

*Evidence.* Four independent mechanisms, all observable at runtime:

1. `propose_step` returns `refused_policy` until the learner has revised that step twice, and **the refusal renders on the page** — *"Second Try declined the inspector. The learner has attempted step 2 0 time(s)."* (`after/12-proposal-refused-1440x900.png`).
2. A proposal that *is* allowed cannot be applied by the agent: it renders as a pending slot with *Use this* / *Keep mine*, and `RESOLVE_PROPOSAL` is in `LEARNER_ONLY`. So are `ADD_STEP`, `EDIT_STEP`, `REMOVE_STEP` and `RESET` — **there is no tool by which an agent can write a line of mathematics into the scratchpad.**
3. The transfer round closes `annotate_step` and `propose_step` entirely: *"This is the unaided attempt. Annotations are closed."*
4. `get_scratchpad` does not return the answer.

*The strongest single artefact* is the refusal panel. It is the only place I have seen a WebMCP submission where the page tells the agent no, in public, in the interface.

### 8.4 "The receipt proves nothing." — **Partially lands**

*Evidence against the attack.* The receipt is unusually disciplined: four claims each bound to a state field, then, inline and unmissable — *"This is a record of one browser session. It does not establish that the learner could do this again tomorrow, or without help elsewhere, and it is not a claim about understanding."* `get_receipt` returns the same three limits as structured data. It never says proved, mastered, understood or learned, exactly as `10` §1.5 requires. Compared with the confetti-and-seal genre this is a different category of object.

*Where it lands.* Two places.
- **H-1**: because step 1 is never tied to the problem and the final value is never compared to the CAS's, a learner can write `x^2 / 2x / 4` for a problem whose answer is 52 and earn "Every line follows from the one above it" in the unaided round. The receipt then reports `unaidedTransfer: "every step sound, with no agent annotations or proposals"`. Every word is true and the overall impression is wrong.
- **H-9**: the receipt attributes local-inspector actions to "the agent".

Both are small fixes, and fixing H-1 converts this attack from "partially lands" to "rebutted".

### 8.5 "It's another AI tutor." — **Rebutted**

*Evidence.* The distinguishing test is falsifiability, and it is real. I ran `10` §3.3's own demonstration: with step 3 badged `not equivalent`, I called

```
annotate_step { "stepId": "step-3",
                "note": "Step 3 is correct. Your derivative is right and nothing is missing." }
```

The envelope returned `ok: true`. The note now sits in the margin under step 3, attributed and timestamped. **`report.verdicts['step-3']` is unchanged — `{"status":"broken","reason":"not_equivalent","difference":{"latex":"2x","against":"previous"}}` — the badge still reads `not equivalent`, the residue still reads "Short of the line above by `2x`", and the live region still announces "Line 3 is the first that does not follow."** The assertion and the contradiction sit two centimetres apart on screen. Evidence: `after/24-falsifiability-agent-says-correct-badge-disagrees.png`.

The badge is rendered from `report.verdicts[stepId]`, written by `checkDerivation()` in `derivation.ts` and by nothing else; no tool in the six-tool surface can write a verdict. The inverse holds too: an agent that is *right* cannot make the page agree either.

Second distinguishing fact: this product's unit of attention is not the answer, it is **the first line that stopped being true**, with the missing quantity named as mathematics. "Short of the line above by `2x`" is a sentence no chat tutor produces, because it requires symbolic subtraction of the learner's own two adjacent lines.

Third: the tools are shaped around a *document being co-edited*, not a conversation. `expectedRevision`, `stale_revision`, `requestId` idempotency and the append-only source-tagged activity log only make sense if a human is typing into the same object at the same time.

---

## 9. What the overnight rebuilds retired

I first measured the 21:16 build. Five defects I logged there are fixed and re-verified in the 21:53 build; none is counted above.

| retired defect | verified fixed by |
| --- | --- |
| Uncaught `Minified React error #418` on every `/learn` load — the prerendered HTML baked a random session id (`st_67805d2dc76e`) that the client then replaced | console now completely clean; SSR HTML contains `st_pending` |
| Local-inspector actions recorded as `source: "agent"`, making the console's own "Recorded as `local-inspector`, not as an agent" line false | activity row reads `local-inspector: Annotated step 3`; margin label reads "Local inspector"; proposal reads "The inspector suggests" |
| Policy refusals returned only in the tool envelope; `10` §3.2 requires them on screen | `.refusal` panel renders with head, message, recovery and Dismiss |
| No way to edit a written line, so `attempts` could never reach the gate of 2 and `propose_step` was **unconditionally refused for the lifetime of the app** | click or Enter on a line opens an in-place editor; two edits take `attempts` to 2; `propose_step` then returns `ok: true` |
| The final numeric line of a correct answer — the thing the prompt asks for — was marked `not equivalent`, with a nonsense residue | the `evaluates` relation exists; `52`, `52.0` and `\frac{104}{2}` all badge `evaluates`, and `53` still badges `not equivalent` |

Two of those were blocking. Their being fixed inside the audit window is the reason this report reads the way it does.

---

## 10. Ranked

| rank | id | severity | one line |
| --- | --- | --- | --- |
| 1 | **H-3** | blocking (demo) | The primary button's label vanishes under the cursor. Two-line fix, and it is in every frame of the video. |
| 2 | **H-1** | high | An off-topic derivation earns "Every line follows". Compare step 1 to `y`, and the last constant to `answer.value`. |
| 3 | **H-2** | high | `output:'html'` makes every expression invisible to assistive technology. One word: `htmlAndMathml`. |
| 4 | — | high | Eleven contrast failures from `--ink-35` on readable text and rust at 4.15:1 (see `13_FINAL_VISUAL_QA.md` §2). |
| 5 | **H-4** | medium | 24 × 22 px destructive control at 2.23:1, with no undo, tabbed before the composer. |
| 6 | **H-5** | medium | Focus dropped to `<body>` after Save and after Escape in the line editor. |
| 7 | **H-6** | medium | Two tabs silently overwrite each other's session. |
| 8 | — | medium | Google Fonts on the judged path: three third-party requests, a serialised request chain, CLS 0.04, and the only outbound traffic in the whole product. Self-host. |
| 9 | — | medium | 820 KB gzipped of compute-engine before the page is interactive, with no loading state to cover the gap. |
| 10 | **H-9** | low | "attempted step 3 0 time(s)"; the receipt calling the inspector "the agent"; `uncertain` vs `unknown_symbol` inconsistency. |
| 11 | **H-7** | low | `scrollIntoView({behavior:'smooth'})` ignores `prefers-reduced-motion`. |
| 12 | **H-8** | low | Double-click on Check records two checks and two revisions. |

---

## 11. What is genuinely good, said plainly

- **The equivalence oracle does not make mistakes in either direction.** Fifteen unusual correct forms accepted, seven wrong-but-plausible lines caught and named, and `\sqrt{-1}` correctly reported `uncertain` rather than coerced. I spent most of the night trying to break this and could not.
- **The diagnosis teaches.** "Short of the line above by `2x`" is a real pedagogical object, computed by symbolic subtraction of the learner's own adjacent lines, with a counterexample fallback when the residue is unreadable.
- **Hostile input handling is exemplary.** Fourteen abusive inputs, fourteen specific codes, zero thrown exceptions, zero XSS, and the over-length rejection is both spoken and shown.
- **Persistence fails safe, eight times out of eight.** Corrupt, version-mismatched, orphan-referencing and structurally invalid payloads all fall back to a clean session, never a half-restored one.
- **Keyboard support is complete.** No trap, a visible ring on all 17 stops, logical order, Enter-to-submit, and in-place editing that opens with Enter and cancels with Escape.
- **Reflow at 200 % zoom works.** Zero horizontal overflow at 1440, 1280, 1024 and 720 px.
- **The tool envelopes are the best I have seen in a WebMCP submission.** Every failure carries a `code`, a human `message` naming the actual numbers, and a `recovery` string telling the agent what to do next. Idempotency is real and I verified it.
- **The refusal panel, and the falsifiability screenshot.** The page telling the agent no on screen with a reason, and the agent asserting "Step 3 is correct" two centimetres above a badge that reads `not equivalent`, are the two most persuasive artefacts in this submission. Both are in `after/`.
- **Zero console messages and zero failed requests** across a long, deliberately abusive journey.
- **The claim discipline holds under attack.** I hunted for a sentence that overclaims and did not find one. "Every line follows from the one above it" is exactly as strong as the evidence, and the receipt limits itself in the receipt, not in a footnote.
