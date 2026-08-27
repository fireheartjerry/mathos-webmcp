> **SUPERSEDED.** This file describes the pre-redesign build (commit `126c71f`).
> The product was replaced during the audit window. Retained for reference only;
> do not use it to score, plan, or justify work on the current build.

# 06 — Visual Forensics

Measured 2026-08-26 against the **running production build** at `http://localhost:4322/`
(`pnpm build && pnpm preview --port 4322`), driven through Chrome DevTools Protocol.

Every number below is either a `getComputedStyle` read, a CSSOM/stylesheet-text census, a
CDP performance record, or a pixel census over the saved PNGs. **Nothing here is eyeballed
from a screenshot.** Where a live measurement contradicts the screenshot-and-CSS scoring in
`05_AI_SLOP_RESEARCH.md` PART 5, the live measurement wins and the correction is called out.

Screenshots live in `docs/overnight-audit/before/` and are referenced by filename.

Measurement tooling, for reproducibility:

- Type / contrast / target / animation census: an in-page harness (`window.__AUDIT`) run at
  each stage; contrast composites the full ancestor background stack before computing the
  WCAG 2.x relative-luminance ratio, so alpha-blended greys are measured as painted, not as
  declared.
- Dead space: `scratchpad/voids.py` — samples every 4th device pixel of each screenshot,
  takes the modal colour as the ground, marks anything more than 8 (summed RGB distance)
  from it as painted, then finds maximal empty rectangles at least 240 CSS px wide with a
  continuous vertical run over 400 CSS px. This is checklist rule 26 implemented literally.
- Chromatic share: `scratchpad/chroma.py` — every 3rd pixel, counts pixels with
  `max−min > 30` and `saturation > 0.18`.

---

## 0. Headline corrections to the prior scoring

| Rule | Prior score (screenshots + CSS) | Live score | Why it changed |
|---|---|---|---|
| 25 — ≤1 three-up equal grid per page | PASS | **FAIL** | The training-lab page carries *three* equal-weight sibling grids at once (6-up `model-strip`, 6-card `station-grid`, 3-up INITIAL/CURRENT/CHANGE). The prior score was taken from four screenshots that never showed the lab page whole. |
| 28 — zero hardcoded stats | PASS (strongly) | **FAIL** | Correct for the lab. But the landing hero prints `BUILT FOR 5M+ LEARNERS` and the video panel prints `5–10 sec / PRODUCTION FIRST FRAME` — two hardcoded numeric figures on screen. |
| 31 — ≤1 infinite animation | FAIL (2 animations) | **FAIL (3)** | There are three: `video-pulse`, `lab-pulse`, `route-flow`. Live, `route-flow 9s linear infinite` runs on **three elements simultaneously** on the pathway screen. |
| 10 — no type below 11px | FAIL (38 declarations) | **FAIL (44 declarations)** | Counting both bundles: 6px×1, 7px×16, 8px×16, 9px×17, 10px×6. Live, **104 of 151 visible text elements on the training-lab screen (69%) render below 11px.** |
| 20 — ≤2 shadow recipes | FAIL (11) | **FAIL (6 recipes / 12 declarations)** | Collapsing by offset+blur+spread and ignoring colour, as the rule specifies, gives 6 recipes, not 11. Still a fail, but the prior number overstated it. |
| 33 — ≤3 transition durations | FAIL (8) | **FAIL (7)** | And the fault is not evenly spread: `learn.css` uses exactly three (`.18s`, `.26s`, `.3s`) and would pass on its own. All four extra durations come from `index.css` (`.45s`, `.5s`, `.65s`, `.9s`). |
| 3 — no raw colour literals | FAIL (21 hex) | **FAIL (56 distinct hex)** | 29 in `index.DiwAFCTr.css`, 27 in `learn.B1k15rhO.css`, across 42,844 bytes of shipped CSS. |
| 26 — no 240×400 void | FAIL (estimated from 4 shots) | **FAIL (11 voids measured in pixels)** | See §4. The worst is **335px wide × 847px of continuous vertical run** in the left rail on the lesson screen. |

**Revised checklist score: 17 PASS / 23 FAIL** (was 19/40).

---

## 1. Measured type system

### 1.1 Stylesheet census (both shipped bundles, 42,844 bytes)

| Property | `index.DiwAFCTr.css` (landing, 14,213 B) | `learn.B1k15rhO.css` (studio, 27,325 B) | Combined |
|---|---|---|---|
| `font-size` declarations below 11px | 14 (9px×5, 8px×4, 7px×4, 10px×1) | 30 (10px×5, 9px×12, 8px×6, 7px×6, **6px×1**) | **44** |
| Distinct static `font-size` values | — | — | **14** (6,7,8,9,10,11,12,13,14,18,22,34,52,112) + 4 `clamp()` |
| Distinct `font-weight` values | 400, 800, 850, 900 | 400, 500, 700, 750, 800, 850 | **7** |
| Declarations at weight > 700 | 13 | 31 | **44** |
| `text-transform: uppercase` rules | 14 | 41 | **55** |
| Distinct positive `letter-spacing` values | — | — | **12** (.06 .08 .1 .11 .12 .13 .14 .15 .16 .18em, 1px, .7px) |
| Distinct `box-shadow` declarations | 0 | 12 | 12 (**6** recipes ignoring colour) |
| `border-radius` declarations | `28px 28px 0 0`, `0 0 28px 28px`, `50%` | `0`, `50%`×6 | 3 non-circular values, all sharing one 28px radius |
| `:active` selectors | **0** | **0** | **0** |
| `:focus-visible` selectors | 0 | 1 | 2 (incl. the global rule) |
| `:hover` selectors | 2 | 10 | 12 |
| `1px` border declarations | — | — | **81** |

### 1.2 Live computed census, per screen

`window.__AUDIT.type()` over every visible element that directly owns a non-empty text node.

| Screen | Text elements | Below 11px | Above weight 700 | Uppercase | Families |
|---|---|---|---|---|---|
| Landing, hero viewport | 99 | **63 (64%)** — 20 at 8px, 20 at 7px, 23 at 9px | 56 | **53** | Georgia 29, Inter 47, SFMono 23 |
| `/learn`, initial | 62 | **35 (56%)** | 22 | 25 | Georgia 24, Inter 26, SFMono 12 |
| `/learn`, training lab | 151 | **104 (69%)** — 51 at 8px, 30 at 7px, 14 at 9px, 9 at 10px | 50 | **54** | Georgia 43, Inter 26, SFMono 82 |

The training-lab screen is the demo's finale. **Two out of every three words on it are set
below the 11px floor**, and 54 separate elements are set in tracked uppercase. For scale,
`05_AI_SLOP_RESEARCH.md` M1 measured Stripe at 0 uppercase elements across 2,521 and Linear
at 6 across 4,000.

The smallest type that actually renders is **7px**. The smallest declared is **6px**
(`learning-studio.css`, the pathway-rail sub-label). At a 1440-wide projector throw, 7px
Inter at weight 800 in a mid grey is not small — it is a texture.

### 1.3 The specific offenders, by name

| What | Computed | Where |
|---|---|---|
| Pathway rail sub-labels — `CALCULUS`, `VECTORS`, `BACKPROPAGATION` | `7px / 800 / uppercase / rgb(153,151,143)` | Left rail, every screen |
| Header `/` separator between `LEARNING STUDIO` and `SESSION 001` | `10px / 700 / rgb(207,203,192)` | Header, every screen |
| WebMCP availability notice | `10px / 700 / uppercase / 1.3px tracking / rgb(104,105,96)` | Header top-right, every screen |
| Landing credibility strip — `BACKED BY Y COMBINATOR · FEATURED IN FORBES · BUILT FOR 5M+ LEARNERS` | `7px / 800 / uppercase / rgb(116,117,111)` | Landing hero, above the H1 |
| Landing stage sub-labels — `COMPUTATION GRAPHS`, `TOKENS AND EMBEDDINGS` | `7px / 800 / uppercase / rgb(115,117,110)` | Landing §04 |
| Lab breadcrumb — `EVIDENCE RECEIPT / PATHWAY / TRAINING LAB` | 10px tall as a hit target (see §5) | Lab, top of main |

### 1.4 Line-height defect

At 1280 wide, the studio `h1` computes `font-size: 56.32px` with `line-height: 55.19px` —
a **0.98 ratio**. Georgia's ascenders and descenders exceed its em box, so any two-line
headline ("You found one path. / There are two.") sets its lines closer than the glyphs
were drawn for. This is visible in `1440-05-diagnosis.png` as the italic descender of
*"two."* crowding the rule beneath it.

---

## 2. Measured contrast failures

Ratios computed against the **composited** background (full ancestor alpha stack), not the
declared background. Threshold is 4.5:1 for text below 24px, 3:1 for large text.

### 2.1 `/learn`, initial state — 33 failing text elements

| Text | Computed colour | On ground | Ratio | Size / weight |
|---|---|---|---|---|
| `/` (header separator) | `rgb(207,203,192)` | `rgb(247,243,234)` | **1.46** | 10px / 700 |
| `02`–`10` (pathway rail numerals) | `rgb(153,151,143)` | `rgb(243,239,229)` | **2.55** | 9px / 700 |
| `Numbers with direction` … `Teach your own tiny model` (9 rail stage names) | `rgb(153,151,143)` | `rgb(247,243,234)` | **2.64** | 11px / 600 |
| `vectors`, `computation graphs`, `backpropagation` … (9 rail sub-labels) | `rgb(153,151,143)` | `rgb(247,243,234)` | **2.64** | 7px / 800 |

The **entire left rail — 17% of the screen width, and the first thing in reading order
after the header — is painted between 2.55:1 and 2.64:1.** That is roughly *half* the AA
minimum. It is not a near-miss.

There is one genuine mitigation, and it should be recorded: once stage 01 is proven, the
rail brightens and the contrast failure count on the receipt screen drops from 33 to **2**.
So the design *knows* how to paint a legible rail — it just chooses not to for the ~90% of
the session before the receipt.

### 2.2 Training lab — 11 failing elements

| Text | Colour | On ground | Ratio | Size / weight |
|---|---|---|---|---|
| `MEASURED LOSS · STEP 0` | `rgb(104,105,96)` | `rgb(32,34,31)` (the dark readout) | **2.88** | 15px / 400 |
| `STAGE 10 · LIVE DESTINATION` | `rgb(200,93,49)` | `rgb(247,243,234)` | **3.74** | 9px / 800 |
| `01`–`06` station numerals | `rgb(200,93,49)` | `rgb(247,243,234)` | **3.74** | 8px / 750 |

`MEASURED LOSS · STEP 0` at 2.88:1 is the caption directly under the demo's single most
important number. It is the one line a judge needs to read to understand what `3.2807`
means, and it is the least legible line on the panel.

### 2.3 Landing page — 25 failing elements

Worst: the `→` glyphs at `rgb(155,155,145)` on `rgb(244,240,230)` = **2.46:1** at 8px;
`01`–`04` receipt numerals at `rgba(244,240,230,0.42)` on `rgb(23,27,25)` = **3.72:1**;
the whole `BACKED BY Y COMBINATOR / FEATURED IN FORBES / BUILT FOR 5M+ LEARNERS` strip and
the ten stage sub-labels at **4.09–4.10:1**.

Note the pattern: **every contrast failure in the product is a small grey label**, and
almost all of them are also uppercase and tracked. The failures of rule 6, rule 10, rule 13
and rule 14 are not four separate problems. They are one component style, applied 55 times.

---

## 3. Measured geometry, colour, motion

| Rule area | Live measurement |
|---|---|
| Chromatic share of painted pixels | **0.37% – 2.21%** across all 15 screenshots. Lowest on the landing full page (0.37%), highest on the receipt (2.21%). Linear measures ~2%. |
| Hue families in use | 5 — rust `#c85d31`/`#c4572d`, blue `#3e6f9d`/`#315ac6`, green `#3f795f`, red `#9f3f32`, lime `#d8ee6e`. Plus a sixth, amber ≈`#E39A3B`, painted *inside* the Mathos player. |
| Radii on screen | Only `50%` (dots) and `0`. Sharp corners throughout. |
| Shadows on screen (lab) | 4 distinct: `rgba(120,117,107,.12) 0 0 0 4px`, `rgb(220,231,239) 7px 7px 0`, `rgba(63,121,95,.24) 0 0 0 5px`, `rgb(220,232,223) 5px 5px 0`. |
| Container nesting, deepest live path | **4 levels**: `.studio-shell → .lab-section → .station-grid → li`. Rule 22 allows 2. |
| Triple containment (border + shadow + background) | 4 rules. Verified live on `.lab-readout`: `border-top-width: 0.667px`, `box-shadow` present, `background: rgb(32,34,31)`. Also `.mathos-video-panel`, `.receipt-card`, `.path-morph`. |
| Infinite animations | 3. Live on the pathway screen: `route-flow 9s linear infinite` running on **three** elements at once, `playState: running`. It encodes nothing. |
| Transition durations / easings, live | Studio computes only `.18s`, `.26s`, `.3s` and a single easing (`ease`). The product total is 7 durations and 4 declared easings, all extras from the landing page. |
| `prefers-reduced-motion` | One global inline rule, present on **both** documents: `*, ::before, ::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important }`. No SMIL, no Web Animations API usage that escapes it. |
| Emoji | Zero in either served HTML document. The only dingbat on screen is `✓` (U+2713) as the activity-log status glyph. No `✨`. |
| Marketing verbs | Zero occurrences of Transform / Unlock / Supercharge / Unleash / Empower / Seamless / Effortless / Revolutionize in either document. |

---

## 4. Dead space, measured in pixels

Rule 26: *no region wider than 240px is empty for more than 400px of continuous vertical
run.* Measured directly off the screenshots. All coordinates are CSS pixels.

| Screenshot | Region | Void | Verdict |
|---|---|---|---|
| `1440-07-lesson-video-loaded.png` | Left pathway rail | **x=0, w=335, y=0, run=847** | The rail is blank for 94% of the viewport height |
| `1440-07-lesson-video-loaded.png` | Right context rail | **x=1049, w=372, y=0, run=873** | Blank for 97% of the viewport height |
| `1440-13-video-t400ms-empty.png` | same two regions | identical (335×847, 372×873) | Persistent, not transient |
| `1440-14-video-regenerated.png` | same two regions | identical | Persistent |
| `1440-04-learn-initial.png` | Centre column, right of the answer form | **x=900, w=239, y=261, run=639** | |
| `1440-04-learn-initial.png` | Right rail, below "Watching the route" | **x=1145, w=293, y=343, run=471** | |
| `1440-15-keyboard-focus-input.png` | Centre column, right of form | **x=900, w=239, y=146, run=753** | |
| `1440-05-diagnosis.png` | Centre column, right of the `36 + 4 = 40` row | **x=676, w=463, y=452, run=447** | |
| `1440-05-diagnosis.png` | Right rail | **x=1145, w=293, y=386, run=428** | |
| `1440-08-transfer.png` | Centre column, right of form | **x=900, w=239, y=261, run=639** | |
| `1440-10-pathway.png` | Right of the ten-stage list | **x=1023, w=412, y=689, run=713** | |
| `1440-11-lab-idle.png` / `-12-lab-trained.png` | Left column of §04, beside the attention heatmap | **x=312, w=363, y=2011, run=479** | |
| `1440-02-landing-fullpage.jpeg` | Full-width band between §03 and §04 | **x=0, w=1435, y=2757, run=1211** | |
| `1440-02-landing-fullpage.jpeg` | Full-width band below the hero | **x=0, w=1435, y=912, run=910** | |

**Eleven distinct violations.** The worst single frame is
`1440-07-lesson-video-loaded.png`: at that scroll position **707 of 1440 horizontal pixels
(49% of the viewport width) are blank down the full height of the screen**, while the
Mathos player — the one thing on the page that came from the real product — is squeezed
into a 702px-wide box in the middle.

This is the specific failure the checklist's §1.2 names: *unrhythmic voids, not quantity of
whitespace.* The three-zone shell is a good idea executed as a fixed grid: the rails are
sized for their maximum content (ten stage names, six activity rows) and then left standing
at that width when they hold nothing.

### 4.1 The one place the layout is honestly good

`1440-09-receipt.png`, `1440-03-landing-pathway-void.png`, `1024-01-learn-initial.png`,
`1280-01-learn-initial.png` and `720-01-learn-200pct-zoom.png` all return **no void at
240×400 or larger.** The receipt screen in particular is well composed — the card fills the
centre column and the rails are both carrying content.

And a genuinely awkward finding for the design: **the narrow layouts are better composed
than the wide one.** At 1024 and 1280 the composition tightens and the dead space
disappears. The 1440 layout is the one that falls apart.

---

## 5. Interaction targets and focus

| Control | Measured size | WCAG 2.2 AA 2.5.8 (24×24) |
|---|---|---|
| `MATHOS·` wordmark link (studio) | 250 × **17.3** px | **FAIL** |
| `MATHOS·` wordmark link (landing) | 79.2 × **17.3** px | **FAIL** |
| `Enter the studio ↗` (landing nav) | 126.9 × **12** px | **FAIL** |
| `EVIDENCE RECEIPT` breadcrumb button (lab) | 83.2 × **10** px | **FAIL** |
| `PATHWAY` breadcrumb button (lab) | 36.4 × **10** px | **FAIL** |
| Answer input | 400 × 56 px | PASS |
| `CHECK ANSWER` button | 224 × 56 px | PASS |
| `TRAIN 100 REAL STEPS` | large | PASS |

The primary controls are generously sized. The *navigation* controls — the only way back to
the receipt or the pathway from the lab — are **10 pixels tall**.

### 5.1 The focus ring on the `h1`

`LearningStudio.tsx:396-401` runs, on every `state.stage` or `uiMode` change:

```js
window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
const heading = mainRef.current?.querySelector<HTMLElement>('h1')
heading.tabIndex = -1
heading.focus({ preventScroll: true })
```

**Correction to the brief's hypothesis:** the ring is *not* an unstyled UA ring. It resolves
to the app's own rule, `:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px }`,
computed live as `rgb(62,111,157) solid 2px`, offset `3px`.

It is still a visual defect, and a worse one than an unstyled ring would be. Because the
`h1` is a block-level element spanning the full centre column, the outline draws a
**718 × 124 px blue rectangle** around the headline (`1440-05-diagnosis.png`), and a
**718 × 62 px** one on the initial screen (`1440-04-learn-initial.png`). It is present on
page load with no user interaction, it appears on every one of the six screens, and at a
glance it reads as a bordered panel or a form field — not as a focus indicator. In
`1440-08-transfer.png` the box around *"Find ds/dx at x = 1."* is the single most visually
prominent element on the screen, above the problem itself.

Focus indicators on the actual controls are correct and consistent: input and button both
compute `2px solid rgb(62,111,157)` at `2.67px` offset.

---

## 6. Behaviour at 1280 × 800, 1024 × 768, and 200% zoom

### 6.1 1280 × 800 — `1280-01-learn-initial.png`

No horizontal overflow (`scrollWidth === clientWidth === 1280`). Rails compute to 250px and
300px, main to 730px. **43% of the viewport is rails.** No 240×400 void — the composition is
actually tighter than at 1440. The `h1` line-height defect (§1.4) is measurable here.

### 6.2 1024 × 768 — `1024-01-learn-initial.png`

**The right rail is deleted.** `@media (width<=1080px) { .context-panel { display: none } }`,
verified live: `display: "none"`, width 0.

What disappears with it:

- **`SESSION ACTIVITY` — the append-only activity log.** This is the product's only visible
  proof that an agent did anything. On a WebMCP submission, it is the evidence surface.
- `WHAT MATHOS NOTICED` — the entire diagnostic commentary column.
- The state badge (`AWAITING ANSWER` / `PATTERN FOUND` / `EVIDENCE ISSUED`).
- `Nothing here claims more than this session observed.` — the claim-boundary line that
  earns rule 40.

The breakpoint is **1080px**, which means this is not an edge case. It fires on a 13″
MacBook at its default scaled resolution, on a 1024×768 projector, and on any browser
window that is not close to maximised on a 1440 display. **The default state for a judge
who does not maximise the window is a build with no agent-evidence surface at all.**

The pathway rail survives at 220px (21.5% of the viewport) still painted at 2.55:1.

### 6.3 720 × 450 (200% zoom simulation) — `720-01-learn-200pct-zoom.png`

The studio's second breakpoint is at 700px, so 720 lands in the worst possible band: the
right rail is gone, the layout has *not* yet collapsed to a single column, and the header is
still constrained to a fixed 64px.

Measured failure: the header `<p>` containing `LEARNING STUDIO / SESSION 001` occupies
**y = 0 → 67px inside a 64px header with `overflow: visible`**. It wraps to four lines,
overshoots the header box by 3px, and collides with the hairline rule and the content
beneath it. `SESSION 001` is visually truncated in the screenshot. The
`USE CHROME 149+ …` notice wraps to two lines and overlaps the same region.

This is a WCAG 1.4.4 (Resize Text) failure: content is lost and functions become obscured
at 200%.

The pathway rail still occupies **30.6% of a 720px viewport** to advertise nine stages that
do not exist, and the smallest rendered type is still 7px.

No horizontal overflow at any tested width (720 / 1024 / 1280 / 1440) — the page never
requires sideways scrolling. That part is correct.

---

## 7. Full anti-slop checklist, scored against the running build

`05_AI_SLOP_RESEARCH.md` PART 4, all 40 rules, verbatim.

### Colour

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 1 | No indigo/violet/purple/fuchsia class or hex | **PASS** | Regex over 42,844 B of shipped CSS: `purpleHits: 0`. |
| 2 | < 5 chromatic hue families in the token set | **FAIL** | 5 families across 7 accent tokens: `#c85d31`/`#c4572d` (rust), `#3e6f9d`/`#315ac6` (blue), `#3f795f` (green), `#9f3f32` (red), `#d8ee6e` (lime). A sixth, amber ≈`#E39A3B`, is painted inside the embedded Mathos player. |
| 3 | Zero raw hex/`rgba()` outside the token block | **FAIL** | **56 distinct hex literals** (29 landing + 27 studio). Greys declared inline in rules: `#99978f #9b998f #96948b #939188 #9b9b91 #a8aaa2 #74756f #777971 #73756e #62645f #5d5f59 #60625c #555751 #686a64`. |
| 4 | No two neutrals within 8 in every channel | **FAIL** | Live-painted greys `rgb(153,151,143)`, `rgb(155,155,145)`, and `rgb(116,117,111)` / `rgb(115,117,110)` / `rgb(119,121,113)` — the last three sit inside a **4-unit envelope** and all appear on the same cream ground. |
| 5 | One accent palette across marketing and product | **FAIL** | Landing resolves `#315ac6` / `#c4572d` / `#d8ee6e`; studio resolves `#3e6f9d` / `#c85d31`. The hero italic and the studio focus ring are visibly different blues. |
| 6 | Every text colour ≥ 4.5:1 as painted | **FAIL** | 33 failures on `/learn` initial, 25 on the landing, 11 in the lab. Worst 1.46:1. The whole pathway rail sits at 2.55–2.64:1; `MEASURED LOSS · STEP 0` at 2.88:1. §2. |
| 7 | No `background-clip: text` gradient type | **PASS** | 0 occurrences. |
| 8 | No two-hue gradient | **PASS** | 3 gradients total, all single-hue alpha or neutral: `#dce8df73→transparent`, `radial(#ffffffc7→transparent)`, `#20221f05` 1px scanline. |
| 9 | Chromatic colour < 5% of painted pixels | **PASS — strongly** | Pixel census over 15 screenshots: **0.37% – 2.21%**. Median ≈ 1.35%. |

### Typography

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 10 | No `font-size` below 11px | **FAIL — worst item in the audit** | **44 declarations** below 11px, including one at **6px** and sixteen at 7px. Live: **104 of 151 text elements on the training-lab screen (69%)**, 63 of 99 on the landing hero, 35 of 62 on `/learn` initial. |
| 11 | < 9 distinct static `font-size` values | **FAIL** | 14 static + 4 `clamp()`. |
| 12 | ≤ 4 `font-weight` values | **FAIL** | 7: 400, 500, 700, 750, 800, 850, 900. |
| 13 | Heaviest weight ≤ 700 | **FAIL** | 44 declarations above 700. Live: 50 elements over 700 on the lab screen alone, most of them 7–9px. |
| 14 | `text-transform: uppercase` in < 8 rules | **FAIL — most discriminating** | **55 rules.** Live element counts: 54 (lab), 53 (landing hero), 25 (`/learn` initial). Reference: Stripe 0/2,521, Brilliant 0/962, Linear 6/4,000. |
| 15 | ≤ 3 distinct positive `letter-spacing` values | **FAIL** | 12. |
| 16 | ≤ 2 families + one mono | **PASS** | Exactly three families resolve on every screen: Georgia, Inter, SFMono-Regular. |
| 17 | No headline construction used more than twice | **FAIL — badly** | The "roman line + coloured serif-italic accent" construction is used **five times on the training-lab page alone** (*transformer. / One learning path. / a trace. / Just logits. / attention goes.*) and at least ten across the product, counting the landing hero, §04, the diagnosis, the lesson, the receipt and the pathway. |
| 18 | Body copy ≥ 15px | **PASS (marginal)** | Studio prose computes 15px; lesson prose 15px. The failure is confined to labels. |

### Shape and containment

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 19 | ≤ 3 distinct non-circular radii | **PASS — strongly** | `0`, and one 28px value used as `28px 28px 0 0` / `0 0 28px 28px`. Everything else is `50%` dots. Sharp corners read as chosen, not defaulted. |
| 20 | ≤ 2 `box-shadow` recipes | **FAIL** | 6 recipes ignoring colour (`0 0 0 4px`, `0 0 0 5px`, `5px 5px 0`, `7px 7px 0`, `8px 8px 0`, `12px 12px 0`) across 12 declarations. The hard-offset device is a good editorial choice; four different offsets encode nothing. |
| 21 | No `border` + `box-shadow` + `background` on one element | **FAIL** | 4 rules: `.mathos-video-panel`, `.receipt-card`, `.path-morph`, `.lab-readout`. Confirmed live on `.lab-readout`. Visible on the receipt (`1440-09`) and the video panel (`1440-07`). |
| 22 | No container nested inside more than one other | **FAIL** | Live max depth **4**: `.studio-shell → .lab-section → .station-grid → li`. |
| 23 | ≥ half of surface separations are 1px rules | **PASS — strongly** | **81** `1px` border declarations against 14 card-named selectors. The best structural decision in the build. |
| 24 | No `backdrop-filter: blur()` behind body text | **PASS** | One `blur(12px)`, on the landing sticky nav only. |

### Layout

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 25 | ≤ 1 three-or-more-up equal grid per page | **FAIL (corrected from PASS)** | The training-lab page carries three at once: the 6-up `model-strip` (PARAMETERS / CONTEXT / MODEL WIDTH / ATTENTION / FEED-FORWARD / VOCABULARY), the 6-card `station-grid`, and the 3-up INITIAL / CURRENT / CHANGE. Their *content* is real measurement, which is to the build's credit — but the rule is about count, and three is not one. |
| 26 | No 240px-wide region empty for > 400px of run | **FAIL** | **11 measured violations.** Worst: 335 × 847 (left rail) and 372 × 873 (right rail) simultaneously on `1440-07`, i.e. 49% of the viewport width blank down its full height. §4. |
| 27 | Real product data in the first viewport | **PASS — strongly** | `/learn` opens on the actual problem and its equations; the lab opens on a live `3.2807` loss readout with the real WebGL backend label. |
| 28 | Every numeric figure computed at runtime | **FAIL (corrected from PASS)** | The lab is exemplary — loss, samples and the attention matrix are all read from live weights. But the landing hero prints `BUILT FOR 5M+ LEARNERS` and the video panel prints `5–10 sec / PRODUCTION FIRST FRAME`. Both are hardcoded numeric figures on screen. |
| 29 | No centred body text longer than two lines | **PASS** | Live scan: zero. All running prose is left-aligned. (The centred caption inside the Mathos player belongs to the third-party iframe.) |
| 30 | All spacing on one base unit | **FAIL** | 39 distinct px spacing values; **25 of them are not multiples of 4** (1, 2, 3, 5, 6, 7, 9, 10, 13, 14, 15, 17, 18, 22, 25, 26, 30, 34, 42, 54, 58, 66, 70, 90, 190). |

### Motion and state

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 31 | ≤ 1 infinite animation, indicating live status | **FAIL** | **Three**: `video-pulse 1.2s infinite`, `lab-pulse 1.2s infinite` (both legitimate status), and `route-flow 9s linear infinite`. Live on the pathway screen, `route-flow` runs on **three elements simultaneously**, all `playState: running`, encoding nothing. |
| 32 | Every interactive selector defines hover, focus-visible, active, disabled | **FAIL** | `:active` appears **zero** times across both shipped stylesheets. `:focus-visible` 2, `:hover` 12, `:disabled` 3. Every button in the build lacks a pressed state. |
| 33 | ≤ 3 `transition-duration` values | **FAIL** | 7 across the product. Note: `learn.css` alone uses exactly three and would pass; all four extras (`.45s`, `.5s`, `.65s`, `.9s`) come from `index.css`. |
| 34 | ≤ 2 easing curves | **FAIL (marginal)** | 4 declared: `cubic-bezier(.2,.72,.2,1)`, `cubic-bezier(.2,.75,.2,1)`, `ease-in-out`, `linear`, plus the browser default `ease` which is what the studio actually computes. The two cubic-beziers differ by 0.03 and are visually identical, so one of them is unintentional. |
| 35 | `prefers-reduced-motion: reduce` honoured globally | **PASS** | One global inline rule present on **both** documents, with `!important` on `animation-duration`, `animation-iteration-count` and `transition-duration`. No SMIL, no WAAPI escape hatch. *Caveat recorded in `09_HOSTILE_TEST_REPORT`: the Mathos player iframe autoplays motion and audio regardless.* |
| 36 | Named classes for loading, empty and error states | **PASS** | `.loading`, `.error`, `.lab-error`, `.empty-activity`, `.tools-fallback` all exist and all were observed rendering — `.empty-activity` shows "No actions yet.", `.tools-fallback` carries the WebMCP notice. |

### Icon, copy, and claims

| # | Rule | Verdict | Live evidence |
|---|---|---|---|
| 37 | Zero emoji as iconography, no `✨` | **PASS** | Unicode scan of both served HTML documents: zero emoji, zero dingbats except `✓` (U+2713), which is used as a status glyph and does encode machine state. |
| 38 | Zero marketing verbs in product copy | **PASS — strongly** | Zero occurrences of the eight banned verbs in either document. The copy is declarative and specific throughout. |
| 39 | Every badge encodes machine-observable state | **PASS** | Observed changing in sequence: `AWAITING ANSWER` → `PATTERN FOUND` → `REPAIR IN PROGRESS` → `TRANSFER ACTIVE` → `EVIDENCE ISSUED`. Each corresponds to a real reducer stage. |
| 40 | No unevidenced mastery claim; evidence surfaces state their limits | **PASS — exemplary** | Verified live on `1440-09-receipt.png`: line 03 reads "This receipt does not prove permanent mastery."; the rail reads "The evidence is real and narrow: success on one fresh problem in this session."; the footer reads "Nothing here claims more than this session observed." |

### Score

**17 PASS / 23 FAIL.**

Passes cluster in colour restraint (1, 7, 8, 9), geometry (19, 23, 24), and honesty
(27, 29, 37, 38, 39, 40). Failures cluster almost entirely in **the type system** (10–15,
17) and **token discipline** (2, 3, 4, 5, 6) — and rules 6 and 10 and 13 and 14 are all the
same component style counted four different ways.

---

## 8. Mismatches against `07_MATHOS_SARSA_DESIGN_DNA.md`

The design DNA document proposes a frozen token set derived from measurements of
`sarsa.app` and `mathos.ai`. Below is what the running build actually computes against it.

| # | DNA ruling | Frozen proposal | Running build (measured) | Δ |
|---|---|---|---|---|
| M1 | No serif token exists; display and sans are both **Archivo** | `--font-sans: "Archivo", …` | **Georgia** on 24–43 elements per screen, carrying every headline | **Category error.** Neither reference contains a serif anywhere. |
| M2 | Emphasis by size and weight, never coloured italic | — | Coloured serif-italic accent used **10+ times** (rule 17) | Fashion-editorial trope present in neither reference |
| M3 | Page ground `--paper: #FAFAF7` (R−B delta 3) | `#FAFAF7` | **`rgb(246,243,234)`** — R−B delta **12** | ~4× the warmth. Reads as parchment; references read as paper. |
| M3b | Panel `--panel: #FFFFFF` | `#FFFFFF` | `rgb(250,247,239)` (receipt ground) | Panel-on-paper contrast nearly eliminated; the build compensates with shadows the references do not have |
| M4 | Green is a verification semantic only, **never a button** | `--verify: #33724F` | `CONTINUE THE PATH` is a **filled forest-green button** (`1440-09`); `GENERATE A FRESH VERSION` is a green-outlined button | Direct violation, on the highest-value CTA in the flow |
| M5 | Rust is `--path-a`, a route encoding; **never type** | `--path-a: #C2541E` | Rust `#c85d31` colours headline halves, the `TRACE` / `PROBLEM 01` kickers, the equation variables, both `TRAIN THE TINY TRANSFORMER` CTAs, and 8 station numerals at 3.74:1 | Rust is the build's identity colour. Mathos has no orange in its palette at all. |
| M6 | Mathos identity **is** blue (`#155D97` / `#339AEF`) | `--brand: #155D97` | Blue `#3e6f9d` appears only as micro-kickers, the focus ring, and heatmap fill. Chromatic census: rust leads on 7 of 15 screenshots | A Mathos product where orange leads and blue is structural tint |
| M7 | Wordmark is lowercase rounded-geometric sans + cube icon | — | `MATHOS·` in letterspaced Georgia small-caps, 79–250 × 17.3px | Luxury-fashion signature, not math software |
| M8 | Sarsa `box-shadow` count is **zero**; Mathos CTAs `none` | — | **12 shadow declarations, 6 recipes**; 4 elements carry border + shadow + background | |
| M9 | Sarsa 8px controls / 12px panels; Mathos 3px | `--radius` set | **0px everywhere** (plus `50%` dots) | Matches neither reference; with the serif it pushes toward print broadsheet |
| M10 | Math is rendered by **KaTeX** | `--font-math: KaTeX_Main` | `a = x²`, `y = a · b + a` typeset in Georgia. Meanwhile the embedded Mathos player **loads `KaTeX_Math-Italic` and `KaTeX_Main-Regular` woff2 files** — confirmed in the network log | The one element that genuinely came from Mathos uses KaTeX; the shell around it does not |
| M11 | No fourth accent | — | Amber ≈`#E39A3B` painted inside the player (`Calculus · Chain Rule Contributions`, `1440-13`) | Confirmed live; it is the player's own colour, not the shell's — which is exactly the clash |
| M12 | Kickers are 12px / 500 / +0.14em **sans** | `--fs-kicker: 12px` | `YOUR PATHWAY`, `SESSION ACTIVITY`, `WHAT MATHOS NOTICED` in Georgia small-caps at 9–10px / 800 | Register change |
| M13 | Sarsa has **one** button style (filled ink) and one pill style | — | At least four button styles observed: filled ink (`CHECK ANSWER`, `REPAIR THIS IDEA`), filled green (`CONTINUE THE PATH`), filled rust (`TRAIN THE TINY TRANSFORMER`), green outline (`GENERATE A FRESH VERSION`), plus a 10px-tall text-button breadcrumb | |
| — | Type floor | `--fs-micro: 11px` | **6px declared, 7px rendered**; 44 declarations below the floor | The single largest gap between proposal and build |
| — | Weights: 300 / 400 / 500 / 600 | `--fw-display: 300` for everything ≥ 26px | 400 / 500 / 700 / 750 / 800 / 850 / 900; display headlines render at **weight 400 Georgia** but micro-labels at **800–850** | Inverted: the build is light where the reference is light, and *much* heavier where the reference is heaviest at 600 |
| — | One raised surface | `--panel: #FFFFFF` only | 4 elements with border + shadow + background; nesting depth 4 | |

### 8.1 The photographic proof

`1440-07-lesson-video-loaded.png` and `1440-13-video-t400ms-empty.png` are the two most
important images in this audit, because they contain both design systems in one frame:

- **Inside the iframe** (the real Mathos product): bright blue `#2196F3`-family strokes and
  headings, a geometric sans, rounded pill labels, rounded cards, a light-grey panel, and
  KaTeX-rendered math.
- **Outside it** (this build): cream `rgb(246,243,234)`, rust `#c85d31`, forest green
  `#3f795f`, Georgia serif with italic accents, 0px corners, hard-offset shadows, and 7px
  tracked-uppercase micro-labels.

They share a border and nothing else. The one element in the application that provably came
from Mathos looks like a foreign object embedded in someone else's magazine.

### 8.2 What the DNA document rates, confirmed

The DNA document's structural praise holds up under live inspection and should survive any
redesign: the kicker → hairline → headline opener, the numbered `01 / 02 / 03` ladders, the
full-bleed hairline dividers, the three-zone shell, the circular-waypoint loss curve on a
rust stroke, tabular numerals, and — above all — the copy. Nothing in this audit argues for
touching the words.

Its scorecard (Sarsa ≈ 5/10, Mathos ≈ 2/10) is consistent with everything measured here.

---

## 9. What is genuinely good, stated plainly

A report that finds only faults is not credible, and this build has real virtues that a
redesign should be careful not to destroy:

1. **Colour restraint is exemplary.** 0.37%–2.21% chromatic pixels is Linear-class. There is
   no purple, no gradient text, no two-hue gradient, no glow.
2. **Hierarchy is carried on 81 hairlines**, not on cards. This is the correct instinct and
   the hardest thing on this list to fake.
3. **Corners are sharp and consistent.** Effectively one non-circular radius in the whole
   product. It reads as a decision.
4. **The lab's numbers are real.** `3.2807`, the loss curve, the pre/post samples and the
   attention matrix are all read from live TensorFlow.js weights. That is the inverse of a
   fake stat banner, and it is the strongest single anti-slop artifact in the build.
5. **The claim boundary is better than most shipping education products.** Rule 40 is passed
   with evidence a competitor would not print.
6. **Zero emoji, zero marketing verbs, zero gradient text.** The copy knows what the product
   does.
7. **Loading, empty and error states are designed, not stubbed** — and one of them
   (`.tools-fallback`) is a graceful-degradation path for missing WebMCP.
8. **Page performance is excellent**: LCP 106 ms, CLS 0.00, interactive at ~354 ms, 74 KB of
   JS for the studio island, with TensorFlow.js correctly deferred to its own chunk that
   only loads when the lab is opened.
9. **The narrow layouts are better composed than the wide one** — which means the grid can
   be made to work; it is currently just tuned for the wrong width.

The build is not stereotypical AI slop and should not be scored as if it were. Its problem
is narrower and more fixable than that: **one micro-label component style — 6–10px, weight
750–850, uppercase, tracked, mid-grey — applied 55 times, and a fixed three-column grid
tuned for content that is not there.**
