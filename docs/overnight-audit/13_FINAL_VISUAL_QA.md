# 13 — Final Visual QA (hostile, measured)

**Verdict: 29 / 40 on the `05` PART 4 anti-slop checklist. The `10` §5.2 gate is ≥ 36/40. It does not pass yet — but seven of the eleven failures are one-line CSS edits, and applying only those reaches exactly 36.**

---

## 0. What was measured, and against what

| | |
| --- | --- |
| Artefact under test | the built `dist/`, served statically on `http://127.0.0.1:4401` (no gzip, no CDN) |
| `dist/` build time | **2026-08-26 21:53:35–21:53:36** |
| Asset fingerprints | `Scratchpad.CWUX8bsC.js` (md5 `cf062b68…`, 2 958 353 B) · `learn.DZ-bJK4b.css` (md5 `9b9334a7…`, 41 764 B) · `tokens.B6Nvu1Vt.css` (md5 `91067af7…`, 6 724 B) · `index.DIou9MOk.css` (md5 `5ceed9c2…`, 5 670 B) |
| Repo commit | `601b20d` |
| src freshness at measurement | newest file in `src/` = `21:53:17` — **older than the build**, so `dist` and `src` were in sync |
| Browser | Chrome via `chrome-devtools` MCP, `deviceScaleFactor: 1` |
| Viewports | 1440×900 (primary), 1280×800, 1024×768, 720×450 (≈200 % zoom) |
| Screenshots | `docs/overnight-audit/after/` — all captured on this build |

Two earlier builds (21:16 and 21:41/21:49) were also measured during the night. Every finding below was **re-verified against the 21:53 build**; findings the rebuilds retired are listed in §8 rather than counted against the score.

**Method note.** Nothing here is eyeballed. Type, weight, radius, shadow, duration, easing and `text-transform` counts come from `getComputedStyle` over every rendered element (KaTeX internals excluded from the type census, included for radius/shadow); contrast comes from a WCAG 2.x relative-luminance implementation that composites every `rgba()` down to the real painted ground; empty regions come from a 10 px occupancy raster of the whole document scanned with a 240 px-wide window.

---

## 1. Type census (computed, in use)

### 1.1 `font-size` — 10 distinct static values across the two pages

| px | count (/learn · /) | first examples |
| --- | --- | --- |
| 17 | 37 · 32 | `body`, `.scratch-shell` |
| 14 | 22 · 7 | `.scratch-title`, `.nav-mid` |
| 11 | 22 · 10 | `.badge`, `.tag`, `.strip-badge` |
| 13 | 10 · 4 | `.scratch-session`, `.step-n`, `.strip-n` |
| 18 | 9 · 4 | `.wordmark`, `.hero-lede` |
| 16 | 7 · 15 | `.step-note`, `.live-status` |
| 19 | 6 · — | `.step-body`, `.step-latex` |
| 12 | 3 · 5 | `.kicker` |
| 15 | 2 · 13 | `input`, `.button`, `code` |
| 21 | — · 3 | landing `h2` |
| *fluid, excluded* | | `clamp(28px,3.4vw,44px)` → 44 px · `clamp(40px,5.6vw,76px)` → 53.28 px |
| *em-derived* | | 10.45 px (`.console-hint code`) · 15.2 px (`code`) · 16.56 px (`em`) |

### 1.2 `font-weight` — 5 distinct

`400` (×90 · ×67) · `600` (×23 · ×24) · `500` (×6 · ×3) · `300` (×3 · ×3) · **`700` (×1)** — the `700` is a single un-restyled `<strong>` ("GPT-5.6 Sol or Terra") in the Agent Console.

### 1.3 Families

`Archivo` (×101 · ×80) · `Fira Code` (×20 · ×16) · KaTeX faces (math only) · `Times New Roman` on bare `html` (UA default, never painted) · **one `<code>` in `.console-output-head` falls back to the generic `monospace`** instead of `var(--font-mono)`.

### 1.4 `border-radius` — 6 values, 3 non-circular

`0px` (×98) · `4px` (×9: `.step-latex`, `.step-remove`, `code`) · `999px` (×8: badges/tags) · `8px` (×5: controls) · `50%` (×2: status dot) · `12px` (×1: `.given` panel).

### 1.5 `box-shadow`

**Zero.** No element on either page computes a `box-shadow` other than `none`; the only declaration in the whole stylesheet set is `box-shadow: var(--shadow-none)`. Non-negotiable satisfied outright.

### 1.6 `transition-duration` — 3 values

`0.15s` (×12 · ×1) · `0.25s` (×2, `li.step`) · `0.35s` (×3 · ×3).

### 1.7 Easing — 3 curves

`cubic-bezier(.23,1,.32,1)` (`--ease-out`, ×14) · **bare `ease`** (in `.button`'s own `transition: color … ease, transform … ease`) · **`cubic-bezier(.22,1,.36,1)`** (`--ease-emph`, on `.button::before`). `--ease-in-out` is declared but unused.

### 1.8 `text-transform: uppercase`

**1 CSS rule** (`.kicker` in `tokens.css`), resolving to 8 elements across both pages. This is the most discriminating metric in `05`, and the build sits next to the Stripe/Brilliant zero.

---

## 2. Contrast — every text colour against its real painted ground

Composited, not nominal. `need` = 4.5:1, or 3:1 for text ≥ 24 px, or ≥ 18.66 px at weight ≥ 700.

### 2.1 `/learn`, `checked_broken` state

| ratio | need | size/weight | colour on ground | element | |
| --- | --- | --- | --- | --- | --- |
| **2.22** | 4.5 | 13px/400 | `rgba(22,21,15,.35)` on `rgb(251,242,236)` | `span.step-n` ("3", inside the broken row) | **FAIL** |
| **2.22** | 4.5 | 18px/400 | `rgba(22,21,15,.35)` on `rgb(251,242,236)` | `button.step-remove` ("×") | **FAIL** |
| **2.23** | 4.5 | 13px/400 | `rgba(22,21,15,.35)` on `rgb(250,250,247)` | `span.step-n` | **FAIL** |
| **2.23** | 4.5 | 18px/400 | `rgba(22,21,15,.35)` on `rgb(250,250,247)` | `button.step-remove` | **FAIL** |
| **2.23** | 4.5 | 11px/600 | `rgba(22,21,15,.35)` on `rgb(250,250,247)` | `span.badge.badge-downstream` ("after the first break") | **FAIL** |
| **2.23** | 4.5 | 11px/400 | `rgba(22,21,15,.35)` on `rgb(250,250,247)` | `span.activity-rev` ("r1") | **FAIL** |
| **4.15** | 4.5 | 11px/600 | `rgb(194,84,30)` on `rgb(251,242,236)` | `span.badge.badge-broken` ("not equivalent") | **FAIL** |
| 2.20 | 4.5 | 14px/600 | `rgba(22,21,15,.35)` on `rgb(236,236,233)` | disabled `.button` ("Add line") | exempt (WCAG 1.4.3, inactive control) |
| 4.94 | 4.5 | 14px/400 | `rgba(22,21,15,.68)` on `rgb(251,242,236)` | `p.step-detail` | pass |
| 5.04 | 4.5 | 11–14px | `rgba(22,21,15,.62)` on paper | `.kicker`, `.tag-read`, `.scratch-session`, `.header-status` | pass |
| 6.19 | 4.5 | 16px/400 | `rgba(22,21,15,.68)` on paper | `p.live-status`, `p.console-status` | pass |
| 6.60 | 4.5 | 11px/600 | `rgb(21,93,151)` on paper | `.tag-write` | pass |
| 6.78 | 4.5 | 11px/600 | `rgb(42,94,65)` on `rgb(238,244,240)` | `.badge-sound` ("follows") | pass |
| 17.49 | 3 / 4.5 | 44px/300, 18px/600, 15px/600 | ink on paper; paper on ink | `h1`, `.wordmark`, `.button` | pass |
| 20.08 | 4.5 | 13px/400 | `rgb(0,0,0)` on paper | `.console-tool-name` | pass (a second, untokenised black — see §9 V-8) |

### 2.2 `/` landing

| ratio | need | size/weight | element | |
| --- | --- | --- | --- | --- |
| **2.23** | 3 | 53.28px/300 | `span.hero-dim` — **"Only the page can.", the second half of the hero headline** | **FAIL** |
| **2.22 / 2.23** | 4.5 | 13px/400 | `span.strip-n` (line numbers in the hero preview) | **FAIL** |
| **2.23** | 4.5 | 11px/600 | `span.strip-badge.after` | **FAIL** |
| **4.15** | 4.5 | 11px/600 | `span.strip-badge.broken` ("not equivalent") | **FAIL** |
| **4.15** | 4.5 | 14px/400 | `p.strip-note` ("Short of the line above by 8x") | **FAIL** |
| **4.38** | 4.5 | 16.56px/400 | `em` ("not equivalent", proof section) | **FAIL** |
| 5.04 | 4.5 | 11–16px | `.nav-mid`, `.kicker`, `.strip-caption`, `.tool-kind.kind-read` | pass |
| 6.19 | 4.5 | 16–18px | `.hero-lede`, section prose | pass |
| 6.60 | 4.5 | 11px/600 | `.tool-kind.kind-write` | pass |

**Root causes — two tokens, eleven failures.** `--ink-35: rgba(22,21,15,.35)` is used for *readable* text (line numbers, the downstream badge, the remove control, revision numerals, half the hero headline) when its declared job is "faint strokes, disabled". And `--path-a: #C2541E` on `--panel-path: #FBF2EC` lands at 4.15:1 — 8 % short of AA.

---

## 3. Empty regions (checklist rule 26)

Raster occupancy, 10 px cells, 240 px scanning window, over the whole document.

| page / state | document | largest qualifying void | |
| --- | --- | --- | --- |
| `/` landing, 1440×900 | 1425 × 2662 | **x 760–1430, y 2110–2570 → 670 px wide × 460 px tall** — the empty right column beside "What it does not claim", running into the footer gap | **FAIL** (460 > 400) |
| `/learn` `checked_broken`, 1440×900 | 1440 × 1235 | **x 610–890, y 820–1240 → 280 px wide × 420 px tall** — right of the composer/button row, down to the document floor | **FAIL** (420 > 400) |
| `/learn` `empty`, 1440×900 | 1426 × 1023 | 490 × 410 at y 620 | **FAIL** (410 > 400) |
| `/learn` at 1280×800, 1024×768, 720×450 | — | no 240 px window empty for > 400 px | pass |

The two-column shell mandated by `10` §5.2 did fix the *middle* of the page — the margin column is never empty, exactly as intended. What still fails is the **tail**: on both pages the last content block sits left-aligned in a ~700 px measure with nothing in the right half and nothing below it before the document ends.

---

## 4. Responsive and 200 % zoom

| viewport | `scrollWidth` / `innerWidth` | grid | notes |
| --- | --- | --- | --- |
| 1440×900 | 1440 / 1440 | `720px 380px` | reference |
| 1280×800 | 1280 / 1280 | `720px 380px` | no overflow, nothing clipped |
| 1024×768 | 1024 / 1024 | two columns retained | margin column narrows cleanly |
| 720×450 (≈200 % zoom) | 720 / 720 | `672px`, single column | `h1` reflows 44 → 28 px; margin stacks below the work; **no horizontal scrollbar — WCAG 1.4.10 Reflow passes** |
| `/` at 720×450 | 720 / 720 | `.why-grid` collapses 3-up → 1-up | hero `h1` 53.28 → 32 px; no overflow |

Zero elements extend past the viewport at any of the four widths. This is genuinely good, and unusual.

---

## 5. `07` non-negotiables

| # | Requirement | Measured | |
| --- | --- | --- | --- |
| 1a | **No serif** | No serif family is painted. `html` computes to `Times New Roman` only because nothing sets a family on the root — `body` sets Archivo and everything inherits it. `.katex`'s stack ends `…, Times New Roman, serif`, which would surface only if the self-hosted KaTeX woff2 failed to load. | **PASS** (latent fallback only) |
| 1b | **No `box-shadow`** | Zero computed shadows; one declaration, `var(--shadow-none)`. | **PASS** |
| 1c | **No green buttons** | Every `.button` computes `background: rgb(22,21,15)`. `--verify` green appears only on `.badge-sound` text/border, the receipt ticks, and the receipt's top rule. | **PASS** |
| 1d | **No rust type** | **VIOLATED — 3 instances.** `p.strip-note` (14 px rust body text, landing hero), `em` (16.56 px rust italic, landing proof section), and `.step-detail`'s KaTeX residue on `/learn` (`2x` in `--path-a`). `07` non-negotiable 3 permits `--path-*` on "strokes, badges, and tinted grounds only". The badges are fine; these three are type. | **FAIL** |
| 2 | **Math through KaTeX** | Every expression on `/learn` renders through `katex.renderToString`. **The landing hero's derivation strip does not** — `12x^3 + 4x^2` and friends are plain text in `var(--font-mono)`. Defensible as "raw learner input", but it is the first mathematics a judge sees and it is not typeset. | **PARTIAL** |
| 3 | `--path-*` never on heading/link/button | No `--path-*` on any heading, link or button. (See 1d for prose.) | **PASS** |
| 4 | `--brand-bright` in exactly two places | **`var(--brand-bright)` is referenced 0 times.** The wordmark is `--ink`; focus rings are `--ink`. | **FAIL** (unused, not overused) |
| 5 | Display ≥ 26 px is weight 300; UI type 600 | Every element ≥ 26 px computes weight `300` (44 px `h1`, 53.28 px hero line, 44 px `.proof-line`). UI type is `600`. Nothing important is 400 at 32 px. | **PASS** |
| 6 | Text does not scroll-reveal | `document.getAnimations()` returns `[]`; zero `animation:` declarations outside the reduced-motion reset; no reveal observer. | **PASS** |
| 7 | Every section opens kicker → hairline rule → headline, rule margined `18px 0 40px` | `--rule-margin: 18px 0 40px`, applied by `.rule` under every `.kicker` on both pages. | **PASS** |
| 8 | Claims obey §2.6 | Only "Y Combinator W24" appears. No App Store rating, no funding figure, no university claim, no stat-shaped string anywhere in either HTML file. | **PASS** |

---

## 6. The 40-rule checklist, scored with evidence

Legend: **P** = pass, **F** = fail. Score counts **P** only.

### Colour

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 1 | No indigo/violet/purple/fuchsia class or `#6366f1 #7c3aed #8b5cf6 #a855f7` | `grep -riE` across `dist/**/*.css` and both HTML files → **0 hits** | **P** |
| 2 | Fewer than 5 chromatic hue families in the token set | The token set declares **5**: blue (`#155D97`/`#144D7C`/`#339AEF`/`#AEDAFB`/`#ECF6FE`), green (`#33724F`/`#2A5E41`/`#EEF4F0`), gold (`#8A6A1F`), rust (`#C2541E`/`#FBF2EC`), **violet (`#7A5C9E`, `--path-d`)**. Only **4 are painted** — `--path-b`, `--path-c`, `--path-d`, `--path-faint`, `--path-human`, `--ink-cool` and `--brand-bright` all have a `var()` usage count of **0**. Scored against the stylesheet as the rule states. | **F** |
| 3 | Zero raw hex / `rgba()` outside the token block | Stripping `:root{…}` from all three stylesheets and re-scanning: **0 literals** in `tokens.css`, `index.css`, `learn.css`. Exemplary. | **P** |
| 4 | No two neutral tokens within 8 in *every* channel | `--paper #FAFAF7` (250,250,247) vs `--paper-sunk #F4F4F0` (244,244,240) → Δ = **(6, 6, 7)**, all < 8, and `--paper-sunk` is used (2 references). Every other neutral pair clears it (`--paper`/`--panel` Δb = 8; `--ink`/`--ink-cool` Δr = 12). | **F** |
| 5 | Marketing and product resolve the same accent tokens | Both pages import the same `tokens.css`; `--brand` resolves to `rgb(21,93,151)` on both. One palette, decided once. | **P** |
| 6 | Every text colour ≥ 4.5:1 on the ground it is actually painted on | **11 distinct failing pairs** (§2), lowest 2.22:1. | **F** |
| 7 | No `background-clip: text` / gradient type | `grep 'background-clip:text\|-webkit-text-fill-color'` → **0** | **P** |
| 8 | No gradient interpolating two hues | `grep '[a-z-]*gradient('` across all CSS → **0 gradients of any kind** | **P** |
| 9 | Chromatic colour on under 5 % of the painted surface | **1.75 % by painted area** (66 936 px² chromatic of a 3 833 280 px² document) — inside the ~2 % Linear benchmark the rule's own rationale cites. By raw element count it is 11.8 % (10 of 85), but those elements are 11 px badges; scored on the area measure. | **P** |

### Typography

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 10 | No `font-size` below 11 px anywhere | **`code` inside `p.console-hint` computes 10.45 px** and carries real text ("local-inspector"). (`.katex .vlist-s{font-size:1px}` is a vendor zero-width spacer glyph and is excluded.) | **F** |
| 11 | Fewer than 9 distinct static `font-size` values | **10**: 11, 12, 13, 14, 15, 16, 17, 18, 19, 21 px — excluding the two `clamp()` display sizes and the three em-derived values. | **F** |
| 12 | Four or fewer distinct `font-weight` values | **5**: 300, 400, 500, 600, **700**. The 700 is one `<strong>`. | **F** |
| 13 | Heaviest weight ≤ 700 | Max computed weight = **700**. | **P** |
| 14 | `text-transform: uppercase` in fewer than 8 rules | **1 rule** (`.kicker`). | **P** |
| 15 | Three or fewer distinct positive `letter-spacing` values | **2**: `0.88px` (`--ls-pill` at 11 px), `1.68px` (`--ls-kicker` at 12 px). | **P** |
| 16 | At most two typeface families plus one mono | Archivo (UI) + Fira Code (mono) + KaTeX (math, explicitly sanctioned by `07`). One `<code>` leaks the generic `monospace` — a token slip, not a fourth chosen face. | **P** |
| 17 | No headline construction used more than twice | The two-tone hero device (`.hero-line` + `.hero-dim`) appears once. No repeated roman-plus-italic construction. | **P** |
| 18 | Body copy ≥ 15 px | `body` = 17 px; prose 16–18 px; nothing readable below 15 px except the 11 px pills, which are labels, not copy. | **P** |
| 19 | Three or fewer distinct non-circular `border-radius` values | **3**: 4 px, 8 px, 12 px (plus the 999 px pill and 50 % dot, both circular). `--r-focus: 2px` is declared but never painted. | **P** |
| 20 | Two or fewer `box-shadow` recipes | **0**. | **P** |

### Shape and containment

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 21 | No border + shadow + background on one element | Structurally impossible — no shadows exist. | **P** |
| 22 | No visible container nested inside more than one other | Deepest visible-container nesting measured across the journey = **1**. | **P** |
| 23 | At least half of surface separations are 1 px rules | **20 hairline separators vs 14 filled/bordered boxes = 59 %**. | **P** |
| 24 | No `backdrop-filter: blur()` behind body text | `grep backdrop-filter` → **0** in all three stylesheets. | **P** |

### Layout

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 25 | At most one three-or-more equal-sibling grid per page | Landing: **1** (`div.why-grid`, `373.333px ×3`). `/learn`: **0**. | **P** |
| 26 | No region wider than 240 px empty for more than 400 px of continuous vertical run | **Landing 670 × 460 px; `/learn` 280 × 420 px** (§3). | **F** |
| 27 | First viewport contains real product data | Landing hero renders a four-line derivation with `follows` / `differentiates` / `not equivalent` / `after the first break` badges and the residue "Short of the line above by 8x". `/learn`'s first viewport shows the KaTeX problem, the three definitions and the six live tool names with their read/write annotations. | **P** |
| 28 | Every numeric figure computed at runtime; zero hardcoded stats | On `/learn` every number is CAS-derived: problem seed, evaluation point, answer value, verdicts, revision numbers, tally counts. The landing hero strip is a static *illustration*, not a stat, and it is mathematically consistent. No stat-shaped string exists in either HTML file — the only credential is "Y Combinator W24". | **P** |
| 29 | No centred body text longer than two lines | The only `text-align:center` declarations in the whole build are six KaTeX internals (`.mfrac`, `.katex-display`, `.mover/.munder`, `.col-align-c`). Zero product prose is centred. | **P** |
| 30 | All spacing values are multiples of a single base unit | `--s-1 … --s-15` are all multiples of 4, as are `--col-pad 36`, `--col-gap 48`, `--stagger 28`, `--nav-h 64`. The one exception is **`--rule-margin: 18px 0 40px`** (documented "Sarsa exact"), plus sub-4 px optical offsets. A scale demonstrably exists. | **P** |

### Motion and state

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 31 | At most one infinite animation, and it must indicate live status | **Zero animations of any kind.** `document.getAnimations()` = `[]`; no element computes an `animationName` other than `none`. | **P** |
| 32 | Every interactive selector defines `:hover`, `:focus-visible`, `:active` and a disabled state | `:focus-visible` is covered globally by `tokens.css` and was confirmed on every Tab stop. `.button` and `.button-text` define all four; `.step-latex`, `.step-remove`, `.console-tool-head` define hover + focus-visible + active (disabled N/A). **`.wordmark` defines `:hover` but no `:active`; `.skip-link` defines `:focus` but neither `:hover` nor `:active`.** | **F** |
| 33 | All `transition-duration` values from a set of three or fewer | **3**: 0.15 s, 0.25 s, 0.35 s. | **P** |
| 34 | Two or fewer distinct easing curves | **3**: `cubic-bezier(.23,1,.32,1)`, `cubic-bezier(.22,1,.36,1)` (`--ease-emph`, on `.button::before`), and bare `ease` (`.button`'s own transition). | **F** |
| 35 | `prefers-reduced-motion: reduce` honoured globally | The CSS block is present, global and correct — `*, ::before, ::after { animation-duration:1ms; animation-iteration-count:1; transition-duration:1ms; scroll-behavior:auto }`, all `!important`. **But `Scratchpad.tsx:198` calls `el.scrollIntoView({ block:'center', behavior:'smooth' })` with an explicit option, which by the CSSOM View spec takes precedence over the computed `scroll-behavior`,** and it is not guarded by `matchMedia('(prefers-reduced-motion: reduce)')`. Confirmed present in the shipped bundle. Reachable only via `annotate_step` with `focus: true`. | **F** |
| 36 | Named CSS classes exist for loading, empty **and** error states | Empty: `.activity-empty` ✓. Error: `.badge-broken`, `.badge-unreadable`, `.badge-uncertain`, `.refusal`/`.refusal-head`/`.refusal-body`/`.refusal-recovery`, `.console-warn` ✓. **Loading: none** — no `.loading`, `.is-loading`, `.skeleton` or `.busy` anywhere, contrary to `10` §6's `loading` row ("Skeleton with the step structure already in place. Never a spinner on an empty page."). Mitigated in practice by SSR, but the rule is binary. | **F** |

### Icon, copy, and claims

| # | Rule | Measurement | |
| --- | --- | --- | --- |
| 37 | Zero emoji as iconography, no "✨" | Unicode scan of both HTML files and all three stylesheets for `U+2728` and `U+1F300–1FAFF` → **0**. | **P** |
| 38 | Zero {Transform, Unlock, Supercharge, Unleash, Empower, Seamless, Effortless, Revolutionize} | Case-insensitive grep of both HTML files → **0 occurrences**. | **P** |
| 39 | Every badge or pill encodes a machine-observable state | `follows` / `differentiates` / `evaluates` / `not equivalent` / `after the first break` / `unchecked` all render from `report.verdicts[stepId]`; `read` / `write` render from each tool's `annotations.readOnlyHint`; the "Unaided" banner renders from `state.round`. No decorative pill exists anywhere. | **P** |
| 40 | No claim beyond what the session can evidence; every evidence surface states its own limits inline | The receipt renders four checkable lines, each bound to a state field, then, inline: *"This is a record of one browser session. It does not establish that the learner could do this again tomorrow, or without help elsewhere, and it is not a claim about understanding."* `get_receipt` returns the same three limits as structured data. The all-sound message is the exactly-honest "Every line follows from the one above it", never "correct". The landing carries a "What it does not claim" section. | **P** |

### Total

**29 PASS / 11 FAIL — 29 / 40. Gate is ≥ 36. Miss by 7.**

Failing rules: **2, 4, 6, 10, 11, 12, 26, 32, 34, 35, 36**.

---

## 7. Route to the gate

Seven of the eleven are single-line edits. Applying only these reaches **exactly 36 / 40**:

| Rule | Fix | Cost |
| --- | --- | --- |
| 12 | `strong { font-weight: var(--fw-ui) }` in `scratchpad.css` | 1 line |
| 34 | Replace the two bare `ease` keywords in `.button` with `var(--ease-out)`; change `.button::before` from `--ease-emph` to `--ease-out`; delete `--ease-emph` and the unused `--ease-in-out` | 3 lines |
| 2 | Delete the unused `--path-b`, `--path-c`, **`--path-d`** (the violet), `--path-faint`, `--path-human`, `--ink-cool` | 6 deletions |
| 4 | Move `--paper-sunk` from `#F4F4F0` to `#F1F1EA` (Δ from `--paper` becomes 9, 9, 13) | 1 value |
| 10 | `.console-hint code { font-size: var(--fs-micro) }` | 1 line |
| 36 | Add a real `.step-skeleton` / `.is-loading` rule and render it while the CAS runs | ~6 lines |
| 32 | Add `:active` to `.wordmark`, and `:hover` + `:active` to `.skip-link` | 3 lines |

The remaining four are real work: **6** (contrast), **11** (collapse 19 px and 21 px into the scale), **26** (the page tail), **35** (guard the smooth scroll).

---

## 8. What the overnight rebuilds retired

Recorded so this report is not read as stale. These were live in the 21:16 build and are **fixed and re-verified** in the 21:53 build:

- Uncaught `Minified React error #418` (hydration text mismatch) on every `/learn` load — the SSR HTML had baked a random `st_67805d2dc76e` session id. Now `st_pending`, and the console is **completely clean across the whole journey**.
- The local inspector was logged as `source: 'agent'` while the console claimed "Recorded as `local-inspector`". Now logged and labelled `local-inspector` / "Local inspector" / "The inspector suggests".
- Policy refusals returned only in the tool envelope. The `.refusal` panel now renders on the page.
- Steps could not be edited, so `attempts` could never reach the `propose_step` gate of 2. In-place editing now exists and the gate is reachable.
- The final numeric line of a correct answer was marked "not equivalent". The `evaluates` relation now exists.

---

## 9. Ranked visual defects worth fixing tonight

| # | Defect | Severity | Fix |
| --- | --- | --- | --- |
| **V-1** | **`.button` label disappears on hover.** `.button::before` (the white wipe) carries `z-index: 0`, and `tokens.css` lifts only `.button > span` to `z-index: 1` — but every button in the app renders a **bare text node**, and inline content paints below a positioned `z-index: 0` descendant. Hovering "Check my work", "Add line" or "Run this tool" yields an empty outlined box. Evidence: `after/20-BUG-primary-button-hover-label-invisible.png`, `after/21-BUG-hover-context-1440x900.png`. Hits the product's primary CTA on every mouse approach — including on camera. | **blocking (demo)** | Wrap the label in a `<span>`, or add `.button { isolation: isolate }` and give the label `position: relative; z-index: 1`. |
| **V-2** | **Eleven contrast failures**, lowest 2.22:1, from `--ink-35` used for readable text and `--path-a` on `--panel-path` at 4.15:1. Includes half the landing hero headline, every line number, the downstream badge and the "not equivalent" badge. | **high** | Move all `--ink-35` *text* to `--ink-60`; darken rust type to ≈ `#A8481A` (4.9:1 on `--panel-path`) while keeping `#C2541E` for strokes. |
| **V-3** | **Rust type in three places** (`p.strip-note`, `em`, `.step-detail` residue) — a direct violation of `07` non-negotiables 1 and 3. | **high** | Set those three in `--ink-70`; keep rust for the badge border and the left bar. |
| **V-4** | **Rule 26 voids**: 670 × 460 px on the landing tail, 280 × 420 px below the `/learn` composer. | **medium** | Give the last landing section a right-column artefact (the receipt limits, or the tool table); on `/learn`, pull the activity log or a session summary under the composer at ≥ 1280 px. |
| **V-5** | **`.step-remove` targets are 24 × 22 px** — under the WCAG 2.2 SC 2.5.8 24 × 24 minimum — and the "×" glyph itself is at 2.23:1. | **medium** | Pad to 28 × 28; recolour to `--ink-60`. |
| **V-6** | **Landing hero mathematics is not KaTeX** — it is `--font-mono` plain text, and it is the first mathematics a judge sees. `07` non-negotiable 2 says math renders through KaTeX. | **medium** | Typeset the hero strip through the same `<Tex>` component, or say in the README that the strip deliberately shows raw learner input. |
| **V-7** | **10.45 px `<code>`** in `.console-hint`; and one `<code>` on the UA `monospace` default instead of `--font-mono`. | **low** | Two declarations. |
| **V-8** | **Three easings, five weights, ten type sizes, near-duplicate greys, an unused violet token, and a second black** (`.console-tool-name` inherits `buttontext` `#000` rather than `--ink` `#16150F`, because the tool name sits inside a `<button>` that never sets `color`). | **low** | See §7, plus `color: var(--ink)` on `.console-tool-head`. |
| **V-9** | **`--brand-bright` (#339AEF) is referenced zero times**, contradicting `07` non-negotiable 4, which reserves it for the wordmark and focus state. | **low** | Either apply it to the wordmark, or delete the token and amend `07`. |
| **V-10** | **The Agent Console arguments textarea is `rows={3}`** and cannot show its own prefilled JSON without scrolling — visible in `after/05-checked-broken-1440x900.png` and `after/12-proposal-refused-1440x900.png`, where the last line is clipped mid-string. A judge's first interaction with the tools is a box too small for its own contents. | **low** | `rows={5}`, or `field-sizing: content`. |

---

## 10. Screenshot index

All in `docs/overnight-audit/after/`, all captured on the 21:53 build at `deviceScaleFactor: 1`.

| file | state |
| --- | --- |
| `01-landing-1440x900-full.png` | landing, full page |
| `01b-landing-hero-1440x900.png` | landing, first viewport |
| `02-scratchpad-empty-1440x900.png` | `/learn` `empty` |
| `03-composer-focused-1440x900.png` | composer focused, live KaTeX preview under the input |
| `04-midwriting-1440x900.png` | `writing`, four lines, no verdicts |
| `05-checked-broken-1440x900.png` | `checked_broken` — first break marked, later lines dimmed |
| `06-annotated-1440x900.png` | `annotated`, note anchored to the broken step |
| `07-BUG-offtopic-derivation-all-sound-1440x900.png` | evidence for defect H-1 in `15_FINAL_HOSTILE_QA.md` |
| `11-keyboard-focus-ring-1440x900.png` | keyboard focus ring on the primary button |
| `12-proposal-refused-1440x900.png` | `proposal_refused` — the visible policy refusal |
| `15-receipt-1440x900.png` | `receipt` after an unaided transfer round |
| `16-learn-1280x800.png` · `17-learn-1024x768.png` | narrower desktop widths |
| `18-learn-720x450-zoom200.png` · `19-landing-720x450-zoom200.png` | ≈200 % zoom |
| `20-BUG-primary-button-hover-label-invisible.png` · `21-BUG-hover-context-1440x900.png` | evidence for V-1 |
| `22-keyboard-edit-in-place-1440x900.png` | keyboard-activated in-place line editing |
| `23-proposal-pending-1440x900.png` | `proposal_pending`, "The inspector suggests" with accept/reject |
| `24-falsifiability-agent-says-correct-badge-disagrees.png` | the falsifiability demonstration — the note asserts step 3 is correct, the badge still reads `not equivalent` |
