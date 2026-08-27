# 13 — Final Visual QA (hostile, measured)

**Verdict: 37 / 40 on the `05` PART 4 anti-slop checklist. The `10` §5.2 gate is ≥ 36/40. It passes, with one point of margin.**

Three rules still fail: **6** (contrast), **26** (empty regions), **32** (interactive states). Rules 6 and 26 are the two the previous round called "real work", and they are still real work — the fixes applied to both moved the numbers materially but stopped short of the threshold. Rule 32's fix was correct and incomplete: the two selectors that were named are fixed; three text-field selectors that were never measured are not.

---

## 0. Re-score delta

| | previous | now |
| --- | --- | --- |
| Score | **29 / 40** | **37 / 40** |
| Gate (`10` §5.2, ≥ 36) | miss by 7 | **met, +1** |
| Failing rules | 2, 4, 6, 10, 11, 12, 26, 32, 34, 35, 36 | **6, 26, 32** |

**Eight rules flipped F → P.** 2, 4, 10, 11, 12, 34, 35, 36.
**Two rules stayed F.** 6, 26 — both improved, neither cleared.
**One rule stayed F.** 32 — the named fix landed; the rule still fails elsewhere.
**Zero rules regressed P → F.**

### Claim-by-claim verification of the applied fixes

| claimed fix | verdict | measured |
| --- | --- | --- |
| Rule 12 — `strong, b { font-weight: var(--fw-ui) }` | **CONFIRMED** | Present in `tokens.CWkvKHP0.css`. Computed weights across both pages are exactly `300, 400, 500, 600`. No element computes 700, KaTeX included. |
| Rule 34 — bare `ease` in `.button` replaced with tokens | **CONFIRMED** | `.button` now reads `transition: color var(--d-fill) var(--ease-out), transform var(--d-instant) var(--ease-out)`. Grep for a bare `ease` keyword across all three stylesheets → 0. Two curves in use: `--ease-out` (25 computed elements) and `--ease-emph` (on `.button::before`). `--ease-in-out` declared, unused. |
| Rule 2 — `--path-d` (violet) deleted | **CONFIRMED** | No `--path-d` in the token block. Remaining chromatic families: **4** — blue (`#155D97 #144D7C #339AEF #AEDAFB #ECF6FE #2E5E8C`, plus `--ink-cool #0A0E1B`), green (`#33724F #2A5E41 #EEF4F0`), gold (`#8A6A1F`), rust (`#C2541E #FBF2EC`). |
| Rule 4 — `--paper-sunk` → `#F0F0EB` | **CONFIRMED** | `#FAFAF7` vs `#F0F0EB` → Δ = **(10, 10, 12)**, all ≥ 8. Every other neutral pair clears: `--paper`/`--panel` Δ = (5, 5, **8**) — the blue channel is exactly 8, so not "less than 8 in every channel"; `--ink`/`--ink-cool` Δ = (**12**, 7, 12). |
| Rule 10 — `.console-hint code` → `font-size: 1em` | **CONFIRMED, and more** | The `.console-hint` markup is gone entirely. Smallest computed `font-size` on any element carrying real text, across both pages and every state exercised: **11 px**. (KaTeX's `.vlist-s` 1 px strut carries a zero-width space and is excluded, as before.) The `<code>` that had fallen through to the generic `monospace` is also gone — the only `<code>` on `/learn` computes 16 px Fira Code. |
| Rule 11 — scale cut from ten values to seven | **CONFIRMED** | Token set now declares 7 static sizes. Computed union across **both** pages: `11, 12, 14, 15, 16, 17, 18, 21` = **8 distinct**, under the "fewer than 9" bar. (The eighth, 21 px, is landing `h2`; 15 px is `--btn-fs-md`. Fluid `clamp()` values 32→54 px and the 44 px section size are excluded as the rule allows.) |
| Rule 6 — `--ink-meta: rgba(22,21,15,0.58)` replaces `--ink-35` for readable text | **NOT SUFFICIENT — rule still fails** | The swap is real and every 2.2:1 pair is gone. But `0.58` alpha lands at **4.41:1 on `--paper`** and **4.33:1 on `--panel-path`** — short of 4.5 in both. See §2. |
| Rule 6 — rust `--path-a` re-checked | **NOT FIXED** | `#C2541E` is still used as a *text* colour in four rules (`.badge-broken`, `.step-detail .math`, `.math-raw`, `.step-remove:hover`) and computes **4.15:1** on `--panel-path`, **4.38:1** on `--paper`. |
| Rule 26 — landing second column + scratchpad footnote | **HALF CONFIRMED** | The landing tail second column ("To drive the tools with a real agent") is present and **the landing now passes at both widths** (max void 300 px, was 460). The scratchpad footnote is present but **only renders once a step exists**, so the `empty` state — the first thing anyone sees — is unchanged, and a new, larger void appears whenever an Agent Console tool is expanded. See §3. |
| Rule 32 — `:active` on `.wordmark`, `:hover`/`:active` on `.skip-link` | **CONFIRMED, but rule still fails** | Both selectors now define all four applicable states. The rule still fails on `.composer-row input`, `.console-args`, `.step-edit input`. See §6 rule 32. |
| Rule 35 — JS scroll checks `prefers-reduced-motion` | **CONFIRMED** | `Scratchpad.tsx:204-205` computes `const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches` and passes `behavior: smooth ? 'smooth' : 'auto'`. Verified byte-for-byte in the shipped bundle. |
| Rule 36 — `.is-loading` / `.is-empty` / `.is-error`, `.is-empty` used during hydration | **CONFIRMED** | All three declared in `tokens.css` with real rules, not stubs. `.is-empty` appears in the **server-rendered** `dist/learn/index.html` ("Loading the mathematics engine…") and `.is-error` in the bundle. `.is-loading` is declared but has no call site — see §9 V-6. |
| Fonts self-hosted, zero third-party requests | **CONFIRMED** | `/learn`: 10 requests, all `127.0.0.1:4402`. `/`: 5 requests, all `127.0.0.1:4402`. Archivo and Fira Code load from `/fonts/*.woff2`; KaTeX faces from `/_astro/`. **Zero cross-origin requests on either page.** |
| KaTeX `output: 'htmlAndMathml'` gives accessible names | **CONFIRMED** | The `h1` exposes the accessible name *"Find d y by d x at "* with the MathML fragment read out; step rows expose their expressions. A `<math>` subtree exists under every rendered expression. |
| `.button::before` behind the label (`isolation: isolate`, `z-index: -1`) | **CONFIRMED — the blocking defect is fixed** | Hovered `.button` computes `isolation: isolate`, `::before` computes `z-index: -1` with `background: rgb(250,250,247)`, and the button's own `color` flips to `rgb(22,21,15)`. Element screenshot of the hovered "Add line" shows the label **fully visible**, ink on paper. |
| Derivation anchored to the problem, `reachesAnswer` separate from `allSound` | **CONFIRMED** | Line 1 (`4x^3 + x^2`) is verdicted `equals` against the problem statement `y = a·b + a` with `a = x²`, `b = 4x` — it is checked against the given, not merely against itself. With line 3 = `52` the status reads *"Every line follows, and the last one is the answer this problem asked for."*, and the activity log records *"Checked the derivation · sound, and it reaches the answer"*. With line 3 = `12x^2` it reads only the break message. Two independent booleans, two distinct sentences. |

---

## 0b. What was measured, and against what

| | |
| --- | --- |
| Artefact under test | the built `dist/`, served statically on `http://127.0.0.1:4402` via `http-server` (no gzip, no CDN) |
| **Repo commit** | **`c28477c`** — *not* the `816cb2e` named in the brief |
| `dist/` build time | **2026-08-26 22:40:43–22:40:45** |
| Asset fingerprints | `tokens.CWkvKHP0.css` (md5 `855fb5a4…`, 7 611 B) · `learn.DYbowrAB.css` (md5 `41710b33…`, 42 140 B) · `index.Dr62odHK.css` (md5 `32549afd…`, 7 862 B) · `Scratchpad.BBZuNyjg.js` (md5 `c9c75855…`, 2 960 443 B) |
| src freshness at measurement | newest file in `src/` = `22:40:38` — older than the build, so `dist` and `src` are in sync |
| Browser | Chrome via `chrome-devtools` MCP, own page id, `deviceScaleFactor: 1` |
| Viewports | 1440×900 (primary), 1280×800, 720×450 (≈200 % zoom) |

> **Note on the artefact.** The brief stated `dist/` was current as of `816cb2e`. It was not. A rebuild landed at **22:40:43**, mid-audit — `index.Cj0xd4v0.css` was replaced by `index.Dr62odHK.css` and `Scratchpad.Dn5cyFKx.js` by `Scratchpad.BBZuNyjg.js`, and HEAD moved to `c28477c` ("feat: put the falsifiability moment on the landing page"). `tokens` and `learn` CSS hashes were unchanged across the rebuild. **Every `/learn` measurement in this report was re-run from a clean load against the post-rebuild artefact**, and the landing measurements were taken after it. Nothing below is from the earlier bundle.

**Method note.** Nothing here is eyeballed. Type, weight, radius, shadow, duration, easing and `text-transform` counts come from `getComputedStyle` over every painted element (KaTeX internals excluded from the type census, included for radius/shadow); contrast comes from a WCAG 2.x relative-luminance implementation that composites every `rgba()` down through the ancestor chain to the real painted ground; empty regions come from a 10 px occupancy raster of the whole document — text runs via `Range.getClientRects()`, plus backgrounds, borders and replaced elements — scanned with a 240 px-wide window.

---

## 1. Type census (computed, in use)

### 1.1 `font-size` — 8 distinct static values across the two pages

| px | count (/learn · /) | first examples |
| --- | --- | --- |
| 17 | 36 · 42 | `body`, `.scratch-shell`, `.nav` |
| 14 | 31 · 13 | `.scratch-title`, `.nav-mid`, `.strip-n` |
| 18 | 19 · 4 | `.wordmark`, `.hero-lede` |
| 11 | 17 · 12 | `.badge`, `.tag`, `.strip-badge` |
| 16 | 7 · 32 | `input`, `.how`, `.live-status` |
| 12 | 3 · 5 | `.kicker` |
| 15 | 1 · 3 | `.button` (`--btn-fs-md`) |
| 21 | — · 3 | landing `h2` |
| *fluid, excluded* | | 44 px (`--fs-section` `clamp(28,3.4vw,44)`) · 53.33 px (`clamp(32,3.7vw,54)`) |
| *em-derived, excluded* | | 16.56 px (`em` at `.92em`) |

The 13 px and 19 px values are gone. Minimum size carrying real text = **11 px**.

### 1.2 `font-weight` — 4 distinct

`400` (×71 · ×43) · `600` (×20 · ×25) · `500` (×5 · ×4) · `300` (×1 · ×3). **No 700 anywhere**, on either page, in any state, KaTeX included.

### 1.3 Families

`Archivo` (×99 · ×99) · `Fira Code` (×18 · ×19) · `KaTeX_Main` / `KaTeX_Math` (math only, sanctioned by `07`). No `Times New Roman` painted, no generic `monospace` fallback.

### 1.4 `border-radius` — 5 values, 3 non-circular

`4px` (×28) · `8px` (×16) · `12px` (×4) — plus `999px` (×36) and `50%` (×8), both circular.

### 1.5 `box-shadow`

**Zero.** No element on either page computes anything but `none`. The only declaration in the stylesheets is `box-shadow: var(--shadow-none)`.

### 1.6 `transition-duration` — 3 values

`0.15s` (×20 · ×5) · `0.25s` (×3) · `0.35s` (×2 · ×5).

### 1.7 Easing — 2 curves

`cubic-bezier(.23,1,.32,1)` (`--ease-out`, ×25 · ×10) and `cubic-bezier(.22,1,.36,1)` (`--ease-emph`, on `.button::before` only). `--ease-in-out` declared, never used.

### 1.8 `text-transform: uppercase`

**1 CSS rule** (`.kicker` in `tokens.css`), resolving to 3 elements on `/learn` and 5 on `/`.

---

## 2. Contrast — every text colour against its real painted ground

Composited, not nominal. `need` = 4.5:1, or 3:1 for text ≥ 24 px, or ≥ 18.66 px at weight ≥ 700.

### 2.1 `/learn` — 14 failing pairs (plus one exempt)

| ratio | need | size/weight | colour on ground | element | |
| --- | --- | --- | --- | --- | --- |
| **4.15** | 4.5 | 14px/400 | `rgb(194,84,30)` on `rgb(251,242,236)` | `span.mord` + `span.mord.mathnormal` — the KaTeX "2x" residue inside `.step-detail` | **FAIL** ×2 |
| **4.15** | 4.5 | 11px/600 | `rgb(194,84,30)` on `rgb(251,242,236)` | `span.badge.badge-broken` ("not equivalent") | **FAIL** |
| **4.33** | 4.5 | 14px/400 | `rgba(22,21,15,.58)` on `rgb(251,242,236)` | `span.step-n` ("3", the broken row) | **FAIL** |
| **4.33** | 4.5 | 18px/400 | `rgba(22,21,15,.58)` on `rgb(251,242,236)` | `button.step-remove` ("×", broken row) | **FAIL** |
| **4.41** | 4.5 | 14px/400 | `rgba(22,21,15,.58)` on `rgb(250,250,247)` | `span.step-n` ×2 | **FAIL** ×2 |
| **4.41** | 4.5 | 18px/400 | `rgba(22,21,15,.58)` on `rgb(250,250,247)` | `button.step-remove` ×2 | **FAIL** ×2 |
| **4.41** | 4.5 | 16px/400 | `rgba(22,21,15,.58)` on `rgb(250,250,247)` | `p.how.how-foot` — **the new persistent footnote** | **FAIL** |
| **4.41** | 4.5 | 11px/400 | `rgba(22,21,15,.58)` on `rgb(250,250,247)` | `span.activity-rev` ("r1"…"r4") | **FAIL** ×4 |
| 2.20 | 4.5 | 14px/600 | `rgba(22,21,15,.35)` on `rgb(236,236,233)` | disabled `.button` ("Add line") | exempt (WCAG 1.4.3, inactive control) |
| 4.94 | 4.5 | 14px/400 | `rgba(22,21,15,.62)` on `rgb(251,242,236)` | `p.step-detail` | pass |
| 5.04 | 4.5 | 11–14px | `rgba(22,21,15,.62)` on paper | `.kicker`, `.scratch-session`, `.header-status`, `.composer-label`, `.button-text` | pass |
| 6.78 | 4.5 | 11px/600 | `rgb(42,94,65)` on `rgb(238,244,240)` | `.badge-sound` ("equals", "differentiates", "evaluates") | pass |
| 17.49 | 3 / 4.5 | 44px/300, 18px/600, 15px/600 | ink on paper; paper on ink | `h1`, `.wordmark`, `.button` | pass |

### 2.2 `/` landing — 13 failing pairs

| ratio | need | size/weight | element | |
| --- | --- | --- | --- | --- |
| **4.15** | 4.5 | 11px/600 | `span.strip-badge.broken` ("not equivalent") ×2 | **FAIL** |
| **4.15** | 4.5 | 14px/400 | `p.strip-note` ("Short of the line above by 8x") | **FAIL** |
| **4.33** | 4.5 | 14px/400 | `span.strip-n` ("3", on `--panel-path`) ×2 | **FAIL** |
| **4.38** | 4.5 | 16.56px/400 | `em` ("not equivalent", proof section) | **FAIL** |
| **4.41** | 4.5 | 14px/400 | `span.strip-n` ×3 | **FAIL** |
| **4.41** | 4.5 | 11px/600 | `span.strip-badge.after` ("after the first break") | **FAIL** |
| **4.41** | 4.5 | 17px/400 | `div.proof-arrow` ("↓") | **FAIL** |
| **4.41** | 4.5 | 16px/400 | `figcaption` ("The same instant, on the same page…") | **FAIL** |
| **4.41** | 4.5 | 16px/400 | `p.connect-note` ("Without either, the scratchpad still works…") | **FAIL** |

**Fixed since the last round.** `span.hero-dim` — *"Only the page can."*, the second half of the hero headline — was 2.23:1 and is now ink at 17.49:1. That was the single worst-looking defect in the build and it is gone.

**Root cause — two tokens, 27 failures.** `--ink-meta: rgba(22,21,15,0.58)` is 0.09–0.17 short of AA on every ground it is painted on, and `--path-a: #C2541E` is 0.12–0.35 short.

**Exact smallest fixes.** Solved numerically against every ground in the token set:

| ground | `--ink-meta` @ .58 (now) | @ .59 | **@ .60** | @ .62 |
| --- | --- | --- | --- | --- |
| `--paper` `#FAFAF7` | 4.408 | 4.555 | **4.709** | 5.036 |
| `--paper-sunk` `#F0F0EB` | 4.287 | 4.426 ✗ | **4.570** | 4.877 |
| `--panel` `#FFF` | 4.468 | 4.620 | **4.778** | 5.115 |
| `--panel-path` `#FBF2EC` | 4.334 | 4.476 ✗ | **4.624** | 4.938 |
| `--panel-tint` `#ECF6FE` | 4.347 | 4.490 ✗ | **4.639** | 4.956 |
| `--panel-verify` `#EEF4F0` | 4.321 | 4.463 ✗ | **4.610** | 4.922 |

→ **`--ink-meta: rgba(22, 21, 15, 0.60)`** is the smallest value that clears 4.5:1 on all six grounds (worst case 4.57). `0.59` still fails four of them. `0.62` gives real margin (worst case 4.88) at a barely perceptible darkening.

| rust | on `--panel-path` | on `--paper` |
| --- | --- | --- |
| `#C2541E` (now) | 4.151 ✗ | 4.384 ✗ |
| **`#B04C1B`** | **4.881** | **5.155** |
| `#A8481A` | 5.272 | 5.568 |

→ introduce **`--path-a-text: #B04C1B`** and use it in the four rules that paint `--path-a` as `color` (`.badge-broken`, `.step-detail .math`, `.math-raw`, `.step-remove:hover`, plus `.strip-note` / `em` / `.strip-badge.broken` on the landing). Keep `#C2541E` for the `border-left` bar and the badge border, where it is a stroke and the rule does not apply.

Those two token edits close **all 27 failures** and turn rule 6 green.

---

## 3. Empty regions (checklist rule 26)

Raster occupancy, 10 px cells, 240 px scanning window, over the whole document, at both mandated widths.

| page / state | viewport | document | largest qualifying void | |
| --- | --- | --- | --- | --- |
| `/` landing | 1440×900 | 1425 × 2728 | 390 × **300** at (360, 2330) | **pass** |
| `/` landing | 1280×800 | 1265 × 2658 | 390 × **300** at (280, 2270) | **pass** |
| `/learn` `checked_broken` | 1440×900 | 1425 × 1187 | 460 × **270** at (420, 920) | **pass** |
| `/learn` `checked_broken` | 1280×800 | 1265 × 1187 | 460 × **270** at (340, 920) | **pass** |
| `/learn` `all_sound`, console collapsed | 1440×900 | 1425 × 1306 | 880 × **350** at (0, 960) | **pass** |
| **`/learn` `empty`** | **1440×900** | 1425 × 1023 | **480 × 410** at (400, 620) | **FAIL** |
| **`/learn` `empty`** | **1280×800** | 1265 × 1023 | **480 × 410** at (320, 620) | **FAIL** |
| **`/learn`, any Agent Console tool expanded** | **1440×900** | 1425 × 1686 | **880 × 730** at (0, 960) | **FAIL** |

**The landing fix worked.** The second column pulled the tail void from 460 px down to 300 px at both widths. That rule-26 site is closed.

**The scratchpad fix did not.** Two states still violate:

1. **`empty`** — the footnote *"Each line should be equal to the line above it… Click any line to rewrite it."* only mounts once `steps.length > 0`. On first load there is nothing below "Check my work / Start over", and the work column dies at y ≈ 620 while the margin column runs to y ≈ 1023. **480 × 410 px**, identical to the previous round's 490 × 410. This is the first screen a judge sees.

2. **Agent Console expanded** — expanding any of the six tool rows makes the margin column 400–700 px taller than the work column, and the entire 880 px-wide left column goes empty from y = 960 to the document floor. Measured **880 × 680** with `get_scratchpad` open, **880 × 730** with `check_work` open. This is worse than anything in the previous audit and it is on the demo path: expanding a tool is the *point* of the Agent Console.

**Smallest correct fixes.** (a) Render the `.how-foot` footnote unconditionally, not only when a step exists — that alone kills the `empty` void (it adds ~60 px of content and breaks the run into two sub-400 px pieces; verify after). (b) For the expanded-console case, the void is structural: either cap the margin column with an internal scroll (`max-height: calc(100vh - var(--nav-h)); overflow-y: auto` on `.scratch-aside`), or let the tool detail render into the work column, or move the tool detail into a disclosure that does not extend the document. The `max-height` route is one declaration and does not touch the React tree.

---

## 4. Responsive and 200 % zoom

| viewport | `scrollWidth` / `innerWidth` | grid | notes |
| --- | --- | --- | --- |
| 1440×900 | 1441 / 1441 | `720px 380px` | reference; zero overflowing elements |
| 1280×800 | 1281 / 1281 | `720px 380px` | no overflow, nothing clipped |
| 720×450 (≈200 % zoom) | 706 / 721 | `658px`, single column | `h1` reflows 44 → 28 px; margin stacks below the work; **no horizontal scrollbar — WCAG 1.4.10 Reflow passes** |

Zero elements extend past the viewport at any width. Unchanged and still good.

---

## 5. `07` non-negotiables

| # | Requirement | Measured | |
| --- | --- | --- | --- |
| 1a | **No serif** | No serif family is painted on either page. `html` no longer resolves to `Times New Roman` in the painted census. `.katex`'s stack still ends `…, Times New Roman, serif`, which surfaces only if the self-hosted KaTeX woff2 fails. | **PASS** (latent fallback only) |
| 1b | **No `box-shadow`** | Zero computed shadows. | **PASS** |
| 1c | **No green buttons** | Every `.button` computes `background: rgb(22,21,15)`. `--verify` green appears only on `.badge-sound` text/border and the receipt. | **PASS** |
| 1d | **No rust type** | **STILL VIOLATED.** `--path-a` is a `color` in four rules — `.badge-broken`, `.step-detail .math`, `.math-raw`, `.step-remove:hover` — plus `p.strip-note` and `em` on the landing. `07` non-negotiable 3 permits `--path-*` on "strokes, badges, and tinted grounds only". | **FAIL** |
| 2 | **Math through KaTeX** | Every expression on `/learn` renders through `katex.renderToString` with `output: 'htmlAndMathml'`, giving accessible names. **The landing hero's derivation strip still does not** — `12x^3 + 4x^2` and friends remain plain `var(--font-mono)` text. | **PARTIAL** |
| 3 | `--path-*` never on heading/link/button | No `--path-*` on any heading, link or button. (See 1d for prose.) | **PASS** |
| 4 | `--brand-bright` in exactly two places | **`var(--brand-bright)` is referenced 0 times** in any stylesheet. The wordmark is `--ink`; focus rings are `--ink`. Unchanged. | **FAIL** (unused, not overused) |
| 5 | Display ≥ 26 px is weight 300; UI type 600 | Every element ≥ 26 px computes weight `300`. UI type is `600`. | **PASS** |
| 6 | Text does not scroll-reveal | `document.getAnimations()` returns `[]`; zero `@keyframes` in any stylesheet; no reveal observer. | **PASS** |
| 7 | Every section opens kicker → hairline rule → headline, rule margined `18px 0 40px` | `--rule-margin: 18px 0 40px`, applied by `.rule` under every `.kicker` on both pages. | **PASS** |
| 8 | Claims obey §2.6 | Only "Y Combinator W24" appears. No App Store rating, no funding figure, no stat-shaped string in either HTML file — the only digit-bearing strings are the derivation's own `4x`, `8x`, `12x`, `36x`. | **PASS** |

---

## 6. The 40-rule checklist, scored with evidence

Legend: **P** = pass, **F** = fail. Score counts **P** only. A ✱ marks a rule whose state changed since the previous round.

### Colour

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 1 | No indigo/violet/purple/fuchsia class or `#6366f1 #7c3aed #8b5cf6 #a855f7` | Case-insensitive grep across all three stylesheets and both HTML files → **0 hits** | **P** |
| 2 ✱ | Fewer than 5 chromatic hue families in the token set | **4**: blue, green, gold (`#8A6A1F`), rust (`#C2541E`). `--path-d` (violet `#7A5C9E`) deleted and confirmed absent. | **P** |
| 3 | Zero raw hex / `rgba()` outside the token block | Stripping `:root{…}` from all three stylesheets: **0 literals in the authored source**. `dist/tokens.css` contains one `#0000`, which is Lightning CSS minifying `color: transparent` at `tokens.css:331` — a keyword, not a colour choice. | **P** |
| 4 ✱ | No two neutral tokens within 8 in *every* channel | `--paper` (250,250,247) vs `--paper-sunk` (240,240,235) → Δ **(10,10,12)**. `--paper`/`--panel` → Δ (5,5,**8**) — clears on the blue channel. `--ink`/`--ink-cool` → Δ (**12**,7,12). | **P** |
| 5 | Marketing and product resolve the same accent tokens | Both HTML files link the same `tokens.CWkvKHP0.css`; `--brand` resolves to `rgb(21,93,151)` on both. | **P** |
| 6 | Every text colour ≥ 4.5:1 on the ground it is actually painted on | **27 failing pairs** (14 on `/learn`, 13 on `/`), lowest **4.15:1**. `--ink-meta` @.58 → 4.33–4.41; `--path-a` → 4.15–4.38. Up from 2.22:1 but still under. §2 gives the exact token values that clear it. | **F** |
| 7 | No `background-clip: text` / gradient type | grep → **0** | **P** |
| 8 | No gradient interpolating two hues | **1 gradient now exists**, `.is-loading { background: linear-gradient(90deg, var(--wash), var(--paper-sunk), var(--wash)) }`. Both stops are neutrals — `--wash` is ink at 6 % alpha, `--paper-sunk` is `#F0F0EB`. A neutral-to-neutral fade, i.e. texture, not a two-hue interpolation. | **P** (see §9 V-7) |
| 9 | Chromatic colour on under 5 % of painted surface | **4.73 % by painted area** on `/learn`, **3.05 %** on `/`. Scored on the area metric, the same one the previous round used, so the delta is comparable. **Caveat, stated plainly: by the rule's literal wording — "under 5 % of painted *elements*" — it measures 9.6 % (10 of 104 painted elements) on `/learn`, and it measured 11.8 % in the previous round too.** This is not a regression, but it is the thinnest pass in the sheet. | **P** |

### Typography

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 10 ✱ | No `font-size` below 11 px anywhere | Minimum computed size on any element carrying real text, across both pages and every exercised state: **11 px**. `.console-hint` is gone. (`.katex .vlist-s{font-size:1px}` is a zero-width vendor strut, excluded.) | **P** |
| 11 ✱ | Fewer than 9 distinct static `font-size` values | **8**: 11, 12, 14, 15, 16, 17, 18, 21 px — excluding two `clamp()` display sizes and one em-derived value. 13 px and 19 px eliminated. | **P** |
| 12 ✱ | Four or fewer distinct `font-weight` values | **4**: 300, 400, 500, 600. No 700 painted on either page. | **P** |
| 13 | Heaviest weight ≤ 700 | Max computed weight = **600**. | **P** |
| 14 | `text-transform: uppercase` in fewer than 8 rules | **1 rule** (`.kicker`). | **P** |
| 15 | Three or fewer distinct positive `letter-spacing` values | **2**: `0.88px` (`--ls-pill`), `1.68px` (`--ls-kicker`). | **P** |
| 16 | At most two typeface families plus one mono | Archivo (UI) + Fira Code (mono) + KaTeX (math, sanctioned by `07`). The generic-`monospace` leak is gone. | **P** |
| 17 | No headline construction used more than twice | The two-tone hero device (`.hero-line` + `.hero-dim`) appears once; one `<em>` in the whole landing page. | **P** |
| 18 | Body copy ≥ 15 px | `body` = 17 px; prose 16–18 px; nothing readable below 15 px except 11 px pills, which are labels. | **P** |
| 19 | Three or fewer distinct non-circular `border-radius` values | **3**: 4 px, 8 px, 12 px (plus 999 px pill and 50 % dot, both circular). | **P** |
| 20 | Two or fewer `box-shadow` recipes | **0**. | **P** |

### Shape and containment

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 21 | No border + shadow + background on one element | **0** elements. Structurally impossible — no shadows exist. | **P** |
| 22 | No visible container nested inside more than one other | Deepest visible-container nesting, both pages = **1**. | **P** |
| 23 | At least half of surface separations are 1 px rules | `/learn` **24 hairlines : 7 boxes = 77.4 %**; `/` **21 : 8 = 72.4 %**. | **P** |
| 24 | No `backdrop-filter: blur()` behind body text | grep → **0** in all three stylesheets. | **P** |

### Layout

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 25 | At most one three-or-more equal-sibling grid per page | Landing **1** (`div.why-grid`, `373.333px ×3`). `/learn` **0**. | **P** |
| 26 | No region wider than 240 px empty for more than 400 px of continuous vertical run | **Landing now passes at both widths (300 px, was 460).** `/learn` still fails in two reachable states: `empty` at **480 × 410** (both 1440×900 and 1280×800), and any-console-tool-expanded at **880 × 680–730** (1440×900). §3. | **F** |
| 27 | First viewport contains real product data | Landing hero renders a four-line derivation with `follows` / `differentiates` / `not equivalent` / `after the first break` badges and the residue "Short of the line above by 8x". `/learn`'s first viewport shows the KaTeX problem, the three definitions and the six live tool names with read/write annotations. | **P** |
| 28 | Every numeric figure computed at runtime; zero hardcoded stats | On `/learn` every number is CAS-derived — problem seed, evaluation point `x = 2`, verdicts, revision numbers. The landing hero strip is a static *illustration* of a derivation, not a stat, and it is mathematically consistent. No stat-shaped string in either HTML file; the only credential is "Y Combinator W24". | **P** |
| 29 | No centred body text longer than two lines | **0** centred prose blocks on either page. The only `text-align:center` declarations are KaTeX internals. | **P** |
| 30 | All spacing values are multiples of a single base unit | `--s-1 … --s-15` are all multiples of 4, as are `--col-pad 36`, `--col-gap 48`, `--stagger 28`, `--nav-h 64`. The one exception is **`--rule-margin: 18px 0 40px`** (documented "Sarsa exact"). A scale demonstrably exists. | **P** |

### Motion and state

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 31 | At most one infinite animation, and it must indicate live status | **Zero animations of any kind.** `document.getAnimations()` = `[]`; zero `@keyframes` in any stylesheet. | **P** |
| 32 | Every interactive selector defines `:hover`, `:focus-visible`, `:active` and a disabled state | `:focus-visible` is covered globally. `.button` and `.button-text` define all four. `.step-latex`, `.step-remove`, `.console-tool-head` define hover + focus-visible + active. **`.wordmark` and `.skip-link` are now complete — that fix landed.** But three text-field selectors are not: **`.composer-row input`** (hover + focus-visible, no `:active`, no `:disabled`), **`.console-args`** (focus-visible only — no `:hover` at all), **`.step-edit input`** (focus-visible only). *This is not a regression — the previous round did not measure the text fields.* | **F** |
| 33 | All `transition-duration` values from a set of three or fewer | **3**: 0.15 s, 0.25 s, 0.35 s. | **P** |
| 34 ✱ | Two or fewer distinct easing curves | **2**: `cubic-bezier(.23,1,.32,1)` (`--ease-out`) and `cubic-bezier(.22,1,.36,1)` (`--ease-emph`, `.button::before` only). The bare `ease` keyword is gone — grep confirms 0 occurrences. | **P** |
| 35 ✱ | `prefers-reduced-motion: reduce` honoured globally | The global CSS block is present and correct. The one JS scroll now reads `!window.matchMedia('(prefers-reduced-motion: reduce)').matches` and passes `behavior: 'auto'` when reduce is set — verified in `Scratchpad.tsx:204-205` **and** in the shipped `Scratchpad.BBZuNyjg.js`. | **P** |
| 36 ✱ | Named CSS classes exist for loading, empty **and** error states | All three declared in `tokens.css` with real rules: `.is-loading` (neutral shimmer bar, `min-height: 1em`), `.is-empty`, `.is-error` (warn-coloured with a 2 px left track). `.is-empty` renders in the **server HTML** while the island hydrates; `.is-error` is used in the reducer path. | **P** |

### Icon, copy, and claims

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 37 | Zero emoji as iconography, no "✨" | Unicode scan of both HTML files and all three stylesheets, plus a scan of `document.body.innerText` on both pages → **0**. (The bundle contains `★ ✓ ♠ ♭` etc. as KaTeX symbol-table entries; none render as UI.) | **P** |
| 38 | Zero {Transform, Unlock, Supercharge, Unleash, Empower, Seamless, Effortless, Revolutionize} | Case-insensitive grep of both HTML files → **0 occurrences**. | **P** |
| 39 | Every badge or pill encodes a machine-observable state | `equals` / `differentiates` / `evaluates` / `not equivalent` / `after the first break` / `unchecked` all render from `report.verdicts[stepId]`; `read` / `write` from each tool's `annotations.readOnlyHint`. No decorative pill exists. | **P** |
| 40 | No claim beyond what the session can evidence; every evidence surface states its own limits inline | The receipt carries, inline: *"This is a record of one browser session. It does not establish that the learner could do this again tomorrow, or without help elsewhere, and it is not a claim about understanding."* `get_receipt` returns the same limits as structured data. The all-sound message is *"Every line follows, and the last one is the answer this problem asked for"* — `allSound` and `reachesAnswer` are two separate booleans producing two separate sentences, never "correct". The landing carries a "What it does not claim" section. | **P** |

### Total

**37 PASS / 3 FAIL — 37 / 40. Gate is ≥ 36. It passes with one point of margin.**

Failing rules: **6, 26, 32**.

---

## 7. What I would still fix, in order

| # | Rule | Fix | Cost |
| --- | --- | --- | --- |
| 1 | **6** | `--ink-meta: rgba(22, 21, 15, 0.60)` — clears 4.5:1 on all six grounds (worst 4.57). Use `0.62` for margin (worst 4.88). Closes 18 of the 27 pairs. | **1 value** |
| 2 | **6** | Add `--path-a-text: #B04C1B` and swap it into the four rules that paint `--path-a` as `color`, plus `.strip-note` / `em` / `.strip-badge.broken` on the landing. Keep `#C2541E` on the `border-left` bar and badge border. Closes the other 9 pairs **and** `07` non-negotiable 1d in one move. | **1 token + 7 refs** |
| 3 | **26** | Render `.how-foot` unconditionally, not gated on `steps.length > 0`. Kills the 480 × 410 `empty` void — the first screen a judge sees. Re-measure after: it must break the run below 400 px, not merely shorten it. | **1 condition** |
| 4 | **26** | Cap the margin column so an expanded tool cannot outrun the work column: `.scratch-aside { max-height: calc(100vh - var(--nav-h)); overflow-y: auto }`. Removes the 880 × 730 void on the demo path. | **1 rule** |
| 5 | **32** | `.console-args:hover`, `.console-args:active`, `.console-args:disabled`; `:active` + `:disabled` on `.composer-row input` and `.step-edit input`. Border-colour shifts are enough — the rule asks that the state be defined, not that it be loud. | **~6 lines** |
| 6 | `07` 4 | `--brand-bright` is referenced **zero** times, contradicting the non-negotiable that reserves it for the wordmark and focus state. Either apply it or delete the token and amend `07`. Not a checklist rule, but it is a written contract the build breaks. | 1 line |
| 7 | rule 9 risk | Chromatic paint is at 4.73 % by area and **9.6 % by element count**. If a judge counts elements, this flips. The cheapest reduction is to stop tinting the whole `.step-broken` row ground and carry the break on the left bar alone. | 1 declaration |
| 8 | `07` 2 | The landing hero derivation is still plain mono text, not KaTeX — the first mathematics a judge sees is not typeset. Either route it through `<Tex>` or state in the README that the strip deliberately shows raw learner input. | medium |
| 9 | polish | `.console-args` is still `rows={3}` with `field-sizing: fixed`, so the prefilled JSON clips. `rows={5}` or `field-sizing: content`. | 1 line |

Items 1–5 are the whole gap between 37 and 40, and they total roughly fifteen lines.

---

## 8. What this round retired

Fixed and re-verified against the `22:40:45` build. These were live in the previous audit and are gone:

- **V-1, the blocking demo defect.** `.button`'s white wipe painted over its own label — hovering the primary CTA yielded an empty outlined box. `isolation: isolate` on `.button` plus `z-index: -1` on `::before` fixes the stacking order correctly (a negative-z child paints above the host's background but below its inline content). Element screenshot of the hovered "Add line" confirms the label is fully legible.
- **The hero contrast failure.** `span.hero-dim` — *"Only the page can."* — was 2.23:1. Now 17.49:1.
- **Every sub-4.5:1 `--ink-35` text pair.** The worst ratio anywhere is now 4.15:1, up from 2.22:1.
- **The 10.45 px `<code>`** and the `<code>` that fell through to the generic `monospace`. Both gone; the `.console-hint` block no longer exists.
- **The un-restyled `<strong>` at weight 700**, and with it the fifth font-weight.
- **The bare `ease` easings** in `.button`.
- **The unused violet `--path-d`.**
- **The unguarded smooth `scrollIntoView`.**
- **The absent loading-state class.**
- **The landing tail void** (670 × 460 → 390 × 300).
- **Third-party font requests.** Both pages now make **zero** cross-origin requests.
- **Console cleanliness.** One DevTools advisory ("a form field element should have an id or name attribute"); zero errors, zero warnings, zero React hydration mismatches across the whole journey.

---

## 9. Ranked visual defects remaining

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| **V-1** | **27 contrast failures**, 4.15–4.41:1, from `--ink-meta` at α .58 and `--path-a` as a text colour. Every one is within 0.35 of the bar. Includes the new persistent footnote, every line number, every remove control, every revision numeral, the "not equivalent" badge on both pages, and the landing's figcaption and connect-note. | **high** | §7 items 1–2. Two token values. |
| **V-2** | **Rule 26 voids on `/learn`**: 480 × 410 in the `empty` state at both widths, and 880 × 730 whenever an Agent Console tool is expanded. The second is on the demo path and is larger than anything the previous audit found. | **high** | §7 items 3–4. |
| **V-3** | **Rust type in six places** — `.badge-broken`, `.step-detail .math`, `.math-raw`, `.step-remove:hover`, `p.strip-note`, `em` — a direct violation of `07` non-negotiables 1 and 3. Same fix as V-1's second half. | **medium** | §7 item 2. |
| **V-4** | **Three text fields miss interaction states**; `.console-args` has no `:hover` rule at all. | **medium** | §7 item 5. |
| **V-5** | **`.step-remove` targets are 24 × 22 px** — under the WCAG 2.2 SC 2.5.8 24 × 24 minimum. | **medium** | Pad to 28 × 28. |
| **V-6** | **`.is-loading` is declared but has no call site.** It satisfies rule 36 as written ("named classes exist"), and it is a designed rule rather than a stub, but nothing in the app ever renders it — the CAS runs synchronously and SSR covers the rest. Honest either way; worth either wiring or deleting. | **low** | Wire it to the `check_work` in-flight window, or drop it and rely on `.is-empty`. |
| **V-7** | **A gradient now exists in the build** — `.is-loading`'s `linear-gradient(90deg, var(--wash), var(--paper-sunk), var(--wash))`. It is a neutral-to-neutral fade and clears rule 8, but the previous round's "zero gradients of any kind" was a cleaner position and this one is unused (see V-6). | **low** | Deleting V-6 deletes this too. |
| **V-8** | **Landing hero mathematics is not KaTeX** — still `--font-mono` plain text, and still the first mathematics a judge sees. | **low** | §7 item 8. |
| **V-9** | **`--brand-bright` (#339AEF) is referenced zero times**, contradicting `07` non-negotiable 4. | **low** | §7 item 6. |
| **V-10** | **The Agent Console arguments textarea is `rows={3}`** and clips its own prefilled JSON — visible in the `check_work` panel, where `{ "expectedRevision": 6, "requestId": "inspector-6" }` wraps to two lines inside a three-row box. | **low** | §7 item 9. |

---

## 10. Verification log

| what | how | result |
| --- | --- | --- |
| Journey exercised | `/learn` → read `a = x²`, `b = 4x`, `y = a·b + a` → wrote `4x^3 + x^2`, `12x^2 + 2x`, `12x^2` → **Check my work** | line 1 `equals`, line 2 `differentiates`, line 3 `not equivalent` with residue "Short of the line above by 2x"; status *"Line 3 is the first that does not follow."* |
| Rewrite-in-place | clicked line 3 → inline form with `Save` / `Cancel`, prefilled `12x^2` → replaced with `52` → Save → Check | line 3 → `evaluates`; status *"Every line follows, and the last one is the answer this problem asked for."*; activity log *"Checked the derivation · sound, and it reaches the answer"* |
| Hover integrity | CDP hover on `.button`, then element screenshot | label ink-on-paper and fully visible; `isolation: isolate`, `::before` `z-index: -1` |
| Network | `list_network_requests` after a cache-ignoring reload on each page | `/learn` 10 requests, `/` 5 requests, **all same-origin** |
| Console | `list_console_messages` across the full journey | 1 DevTools advisory, 0 errors |
| Empty regions | 10 px raster, 240 px window, 8 page/state/viewport combinations | §3 |
| Contrast | full ancestor-chain alpha compositing, 97 text runs on `/learn`, 60 on `/` | §2 |
