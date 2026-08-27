# 07 — Mathos × Sarsa Design DNA

**Author:** Design DNA specialist (overnight rescue)
**Date:** 2026-08-26
**Method:** live browsing + devtools measurement of production CSS on both sites, plus pixel sampling of the current build's screenshots. Every hex, px and ms below was **read out of a live computed style, a production stylesheet, or a sampled pixel** unless explicitly marked UNVERIFIED.

---

## 0. Verification of the reference

**`https://sarsa.app/` RESOLVES AND IS A REAL, DESIGN-FORWARD PRODUCT SITE.** No alarm needed.

- `document.title` = `Sarsa · Human-sourced data for computer-use AI`
- Footer tagline: "The data engine for computer-use AI." · contact `hello@sarsa.app` · `© 2026 Sarsa`
- Built with Astro (`/_astro/index.uolAhvzF.css`), self-hosted **Switzer** webfont, hand-rolled scroll animation (no GSAP/Lenis/Framer detected on `window`).
- It is a B2B data-vendor site for AI labs — an unrelated industry to ours, which is exactly why it is safe to borrow the *system* from: there is zero brand collision with Mathos.

The project owner's "Sarasota" is a mishearing/autocorrect of **Sarsa**. PROVENANCE.md is correct. Proceed.

**One caution up front:** Sarsa's product is about *trajectories through software* — divergent paths that reach the same goal. Our product is about *paths through a derivation*. That thematic rhyme is real, and it is why the current build's path-diagram instinct is right even though its execution is wrong.

---

## 1. TARGET 1 — Sarsa, implementation-grade

Everything in §1 is **measured**. The entire site ships **3.5 KB of inline CSS + 12 KB of external CSS**. That is the whole design system. I read all of it.

### 1.1 The literal `:root` block (verbatim from production)

```css
:root{
  --paper: #fafaf7;
  --panel: #ffffff;
  --ink: #16150f;
  --ink-60: rgba(22, 21, 15, .68);
  --ink-45: rgba(22, 21, 15, .62);
  --ink-35: rgba(22, 21, 15, .35);
  --hairline: rgba(22, 21, 15, .12);
  --path-human: #16150f;
  --path-a: #c2541e;
  --path-b: #2e5e8c;
  --path-c: #33724f;
  --path-d: #7a5c9e;
  --verify: #33724f;
  --font-sans: "Switzer", system-ui, -apple-system, sans-serif;
  --display-hero: clamp(40px, 5.6vw, 76px);
  --display-section: clamp(28px, 3.4vw, 44px);
  --space-section: clamp(96px, 14vh, 160px);
  --nav-h: 64px;
  --ease-out: cubic-bezier(.23, 1, .32, 1);
  --ease-in-out: cubic-bezier(.77, 0, .175, 1);
}
```

**The single most important structural fact in this document:** Sarsa has exactly **two** neutral surfaces and **one** brand colour (ink black). The rust, blue, green and violet are named `--path-*`. They are a **data-encoding palette, not a brand palette**. Rust is never a button, never a heading, never a link. It is the colour of *one traced route through a system*.

> Note the naming: `--paper`, `--ink`, `--panel`, `--hairline`. Hold that thought until §2.1.

### 1.2 Colour, decoded

| Token | Hex / rgba | Role, as actually used |
|---|---|---|
| `--paper` | `#FAFAF7` | Page ground. Warm-neutral, **not cream**. R−B delta = 3. |
| `--panel` | `#FFFFFF` | The one raised surface: the hero panel, and nothing else. |
| `--ink` | `#16150F` | Warm near-black. All headings, all primary text, all button fills. |
| `--ink-60` | `rgba(22,21,15,.68)` | Body prose, secondary paragraphs, nav links at rest. |
| `--ink-45` | `rgba(22,21,15,.62)` | Kickers, numerals, meta, footer links. |
| `--ink-35` | `rgba(22,21,15,.35)` | Scroll-hint line, faint SVG strokes. |
| `--hairline` | `rgba(22,21,15,.12)` | **Every** divider, card border, column rule. |
| `--path-a` | `#C2541E` | Rust. The *human* / primary traced route. |
| `--path-b` | `#2E5E8C` | Steel blue. Alternative route. |
| `--path-c` / `--verify` | `#33724F` | Forest green. Alternative route **and** the verification semantic. |
| `--path-d` | `#7A5C9E` | Violet. Fourth route. |

Also found inline, not tokenised: `#16150f24` (ink at ~14%) for unfilled progress segments.

**Light-mode only.** No `prefers-color-scheme` colour block exists in either stylesheet. There is no dark theme.

### 1.3 Typography

- **One family, self-hosted: Switzer** (Indian Type Foundry). `--font-sans: "Switzer", system-ui, -apple-system, sans-serif`.
- **Only four faces load:** 300, 400, 500, and 400-italic. **There is no 600 and no 700 anywhere in the design.** The heaviest weight on the entire site is 500.
- **No serif. No monospace.** Numeric alignment is achieved with `font-feature-settings: "tnum"`, not a mono face.
- `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility` on `body`.

Measured size scale (px), with the role each size actually plays:

| px | Weight | Tracking | Where |
|---|---|---|---|
| 11 | 500 | `+.08em` | Pill / "roadmap" badge, uppercase |
| 12 | 500 | `+.14em` | **Kicker** (uppercase eyebrow) and scroll hint |
| 13 | 500 | — | Pillar numerals (`01`), tnum |
| 14 | 400 | — | Footer meta, nav CTA label |
| 15 | 400/500 | — | Nav links, button label, beat body, footer tagline |
| 16 | 400 | — | Column body copy |
| **17** | **400** | normal | **`body` base**, line-height `1.65` (= 28.05px) |
| 18 | 400 | — | Section prose, CTA sub |
| 19 | 500 | `-.01em` | Wordmark (also 19px/400 for hero sub) |
| 21 | 400 | — | Premise paragraph, lede |
| 22 | 400 | `-.01em` | Pillar `h3` |
| 24–36 | 300 | `-.012em` | Pull quote: `clamp(24px, 3vw, 36px)`, line-height `1.25` |
| 28–44 | 300 | `-.012em` | `--display-section`, line-height `1.12`, max-width `640px` |
| 40–76 | 300 | `-.015em` | `--display-hero`, line-height `1.05–1.12` |
| 46–92 | 300 | `-.022em` | Reduced-motion lede h1, line-height `.98`, `max-width: 14ch` |

**The core typographic move:** display type is **large and LIGHT (300)** with **tight negative tracking** and **line-height at or under 1.12**. Small type is 500 with **positive** tracking when uppercase. The contrast between those two treatments is the entire voice. There is no middle: nothing important is set at 400 and 32px.

Measure discipline: `max-width: 640px` on section headlines, `620px` on prose, `720px` on hero h2, `760px` on pull quotes, `680px` on the premise, `44ch` on the lede paragraph, `14ch` on the lede headline.

### 1.4 Layout, gutters, rhythm

- **Container:** `width: min(1120px, 92vw); margin-inline: auto`. Measured 1120px at both 1440 and 1280 viewport; **1085.59px with a 39.7px gutter at 1180**. So the gutter is `4vw` per side until ~1217px, then it opens up.
- **Hero panel** is slightly wider: `min(1120px, 94vw)`.
- **Section rhythm:** `--space-section: clamp(96px, 14vh, 160px)`. The *first* section uses it in full; every subsequent section uses `calc(var(--space-section) * .6)`; the CTA uses `* .8`. That deliberate decay is why the page breathes at the top and tightens as it argues.
- **Grid** appears in exactly two flavours:
  - **Streams** — `repeat(3, 1fr)`, `gap: 0`, each column `padding: 0 36px; border-left: 1px solid var(--hairline)`, first child stripped of both. **Vertical hairlines *are* the gutter.**
  - **Pillars** — `repeat(3, 1fr)`, `gap: 48px`, each column `border-top: 1px solid var(--ink)` (full ink, not hairline), `padding-top: 20px`, and **staggered**: `nth-child(2){margin-top:28px}`, `nth-child(3){margin-top:56px}`. Deliberate asymmetry.
- **Mobile (≤767px):** grids collapse to one column; stream borders rotate from column-dividers to a left rail (`padding-left: 20px`).
- `html { scroll-padding-top: calc(var(--nav-h) + 24px) }`.

### 1.5 Geometry — borders, radii, dividers, shadows

**Radii — the complete list actually used on the page** (measured across every element):

| Value | Where |
|---|---|
| `2px` | `:focus-visible` outline radius only |
| `8px` | Buttons |
| `12px` | The hero panel (the only large surface) |
| `999px` | The "roadmap" status pill |
| `50%` | Node dots, cursor glow, ripple |

Nothing else. There is no 4px, no 6px, no 16px, no 24px.

**Border widths:** `1px` for all hairlines and card edges; `1px solid var(--ink)` for structural pillar top-rules and the reduced-motion lede rule; `1.5px` for the focus ring and the node-dot stroke; `2px` for progress segments.

**Dividers are the signature.** The recurring unit is:

```
[12px uppercase 500 tracking-.14em kicker, ink-45]
<hr>  1px solid --hairline,  margin: 18px 0 40px   (variants: 0 48px / 0 56px)
[display-section headline, weight 300, max-width 640px]
```

That three-part stack opens **every** section. It is the cheapest, highest-yield thing to copy.

**Shadows: `box-shadow` count across the entire live page = 0.** Not "subtle" — literally zero. Depth comes only from (a) a white panel on off-white paper and (b) a 1px hairline. The only blur in the codebase is a `filter: blur(24px)` cursor glow inside buttons, which is a lighting effect, not elevation.

**The node-on-a-rule motif** (marks each pillar):

```css
.pillar { position: relative; border-top: 1px solid var(--ink); padding-top: 20px; }
.pillar::before {
  content:""; position:absolute; top:-4.5px; left:0;
  width:8px; height:8px; border-radius:50%;
  background: var(--paper); border: 1.5px solid var(--ink);
}
```

An 8px paper-filled, ink-ringed dot straddling a 1px ink rule. It reads as "a waypoint on a route" and ties the layout to the illustrations.

### 1.6 Buttons

```css
.button {
  display:inline-flex; align-items:center; gap:8px;
  padding:12px 22px;                      /* -> ~45px tall */
  background: var(--ink); color: var(--paper);
  border: 1px solid var(--ink); border-radius: 8px;
  font-weight: 500; font-size: 15px;
  position: relative; overflow: hidden;
  transition: color .35s ease, transform .15s ease;
}
.button::before {                          /* the wipe */
  content:""; position:absolute; inset:0; background: var(--paper);
  transform: scaleX(0); transform-origin: left center;
  transition: transform .35s cubic-bezier(.22,1,.36,1); z-index:0;
}
.button:hover::before { transform: scaleX(1); }
.button:hover { color: var(--ink); }        /* filled -> outlined, on hover */
.button:hover .arrow { transform: translateX(4px); }
.button:active { transform: scale(.97); }
```

- **There is exactly one button style.** Filled ink. No secondary, ghost, or tertiary variant class exists. Emphasis varies only by size:
  - **nav CTA:** `padding: 11px 16px; font-size: 14px; line-height: 1` → 38px tall
  - **default:** `padding: 12px 22px; font-size: 15px` → ~45px tall
  - **hero/CTA:** `padding: 15px 28px; font-size: 16px` → ~53px tall
- **Hover inverts the fill** left-to-right rather than darkening. This is the most recognisable interaction on the site.
- A cursor-tracking radial glow (`56px`, `blur(24px)`, `color-mix(in oklab, currentColor 55%, transparent)`) fades in over `.15s ease-out`; a click emits a 600ms ripple scaling `0 → 200%`.
- **Text links** (nav) are not underlined at rest; they animate `background-size: 0% 1px → 100% 1px` on a linear-gradient underline over `.3s ease` while colour lifts `--ink-60 → --ink` over `.25s`.
- **Focus:** `:focus-visible { outline: 1.5px solid var(--ink); outline-offset: 3px; border-radius: 2px; }` — global, ink, never a brand colour.
- `::selection { background: var(--ink); color: var(--paper); }`

### 1.7 Navigation / header

- `position: fixed`, full-bleed, `z-index: 50`, `height: 64px` (`--nav-h`); inner uses the same `.container`.
- **Starts fully transparent** with a `1px solid transparent` bottom border; an `.is-solid` class swaps in `background: var(--paper)` and `border-bottom-color: var(--hairline)` over `transition: background .4s ease, border-color .4s ease`.
- Composition: `[19px/500 wordmark + 22×19 currentColor SVG mark, gap 9px] ......... [15px links, gap 28px] [8px] [nav CTA button]`.
- Two links only ("How it works", "Contact") plus one CTA. **No hamburger** — at ≤767px the text links simply `display: none` and the CTA survives.
- The mark is an inline SVG using `fill: currentColor`, so the logo inherits ink and needs no separate asset.

### 1.8 Motion

| Duration | Easing | What |
|---|---|---|
| `150ms` | `ease` / `ease-out` | Button `scale(.97)` press, glow opacity |
| `250ms` | `ease` | Link colour |
| `300ms` | `ease` | Link underline `background-size` |
| `350ms` | `cubic-bezier(.22,1,.36,1)` / `ease` | Button fill wipe, arrow nudge |
| `400ms` | `ease` | Nav chrome (background + border) |
| `600ms` | `ease-out` | Click ripple |
| `700ms` | `cubic-bezier(.22,1,.36,1)` | Wordmark "diverge" easter egg (±46px) |
| `2000ms` | `ease-in-out` infinite | Scroll-hint line `scaleY(.3 → 1)` |

Tokenised: `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-in-out: cubic-bezier(.77,0,.175,1)`.

**What animates:** the hero (a `500vh` scroll-track driving a pinned 100vh scene), button fills, link underlines, nav chrome, the arrow glyph, one looping scroll hint.
**What does not animate:** headlines, body copy, section entrances. **There is no scroll-reveal fade-up on text anywhere.** Content simply exists. That restraint is a large part of why it reads as confident rather than as a template.

Accessibility: `@media (prefers-reduced-motion: reduce)` kills the logo animation and the scroll pulse, **and** the site ships a parallel `.motion-off` class that converts the pinned-scroll hero into a static editorial lede (`height: auto`, a real `h1` at `clamp(46px,7vw,92px)/300/.98/14ch` above a `1px solid var(--ink)` rule). The no-motion version is *designed*, not degraded.

### 1.9 Illustration & iconography philosophy

Measured across all 8 SVGs on the page:

- **Stroke widths:** `1px` on 111 of 145 stroked elements; the rest are `0.9 / 1.2 / 1.4 / 1.5 / 1.6 / 1.8 / 1.9px`. Nothing thicker than 2px exists.
- **Stroke colours are the token palette and nothing else:** `#16150F` ×30, `#C2541E` ×11, `#33724F` ×6, `rgba(22,21,15,.42)` ×3, `rgba(22,21,15,.35)` ×1, `#2E5E8C` ×1, `#7A5C9E` ×1, `#FFFFFF` ×1.
- **No fills, no gradients, no drop shadows, no raster images** in the diagrams.
- **De-emphasis is done by lowering ink alpha, never by changing hue.**
- Vocabulary: long bezier routes; small circular waypoint nodes on those routes; a hairline grid standing in for "the software"; a tiny uppercase pill label ("SHORTCUT") annotating one moment; a faint mouse-cursor glyph.
- **Semantics:** the rust route is *the one being narrated*. Grey routes are *alternatives that also work*. The diagram is an argument, not decoration.

### 1.10 Why it feels intentional

1. **Radical palette poverty.** Two neutrals and one ink. Every colour beyond that must justify itself as *data*.
2. **A weight ceiling of 500.** Nothing shouts. Emphasis comes from size and space, never from bold.
3. **Zero shadows.** The page is flat, so hierarchy has to be earned by rhythm and rule-work — and it is.
4. **A repeated three-part section opener** that makes eleven different sections feel like one document.
5. **Hard measure limits** (620/640/720/760px) so no line ever runs long, even though the container is 1120px.
6. **Asymmetric stagger** on the pillar grid — the one place it breaks its own alignment, which reads as craft precisely because everything else is aligned.
7. **Text does not animate.** Only chrome and the hero scene do.

### 1.11 Twelve rules to make a new page belong to this family

1. Ground is `#FAFAF7`. The only other surface is `#FFFFFF`. If you need a third, you are wrong.
2. **No `box-shadow`. Ever.** Separation is a `1px rgba(22,21,15,.12)` hairline, or a white panel on paper.
3. One typeface. Weights **300 / 400 / 500 only**. Never 600, never 700, never italic-for-emphasis.
4. Display type is **300 weight, ≥28px, tracking −0.012em to −0.022em, line-height ≤1.12**, capped at 640px.
5. Body is **17px / 1.65** in `rgba(ink,.68)` — not full ink. Full ink is reserved for headings and one "premise" paragraph per page.
6. Every section opens with `12px uppercase 500 tracking-.14em kicker` → `1px hairline` → headline. Margin the rule `18px 0 40px`.
7. Columns are separated by **vertical hairlines with 36px padding**, not by gaps. Strip the border from the first child.
8. Radii: `8px` controls, `12px` panels, `999px` pills, `2px` focus. No other value.
9. Buttons are **filled ink with paper text**, `8px` radius, and invert to outline via a **left-to-right wipe over 350ms**. There is only one button; scale it with padding.
10. Focus is always `1.5px solid ink, offset 3px`. Never a brand hue.
11. Colour beyond ink is **route encoding**: `#C2541E` is the path under discussion, greys are alternatives, `#33724F` means verified. Never colour a heading, a button, or a link.
12. Diagrams are **1px-stroke, fill-free line art** in those same route colours, with `8px` circular waypoint nodes and tiny uppercase labels. Fade with alpha, never with hue.

---

## 2. TARGET 2 — Mathos, the real brand

Sources: `https://www.mathos.ai/` (live, measured), its compiled Tailwind v4 CSS, and its RSC payload.

`https://www.mathgptpro.com/` is verified as a **live parallel alias** — HTTP 200 serving a byte-identical deployment, carrying `<link rel="canonical" href="https://www.mathos.ai">`, with a meta description that self-describes as "Mathos AI (MathGPTPro)". The Android package is `com.mathgptpro.mclient`. Safe to describe as "formerly/also MathGPTPro"; it is not a redirect. JSON-LD gives `legalName: "Mathos, Inc."`, `foundingDate: 2023-07-21`.

### 2.1 The real Mathos tokens (verbatim from their production CSS)

```css
--color-brand-50 : #ecf6fe;   --color-brand-500: #339aef;  /* PRIMARY */
--color-brand-100: #d2ebfd;   --color-brand-600: #1a72b8;
--color-brand-200: #aedafb;   --color-brand-700: #155d97;
--color-brand-300: #7bc3f8;   --color-brand-800: #144d7c;
--color-brand-400: #4aaaf3;   --color-brand-900: #15405f;
                              --color-brand-950: #0c2336;

--color-ink        : #0a0a0a;   --color-paper       : #fcfcfb;
--color-ink-900    : #0a0e1b;   --color-surface     : #ffffff;
--color-ink-soft   : #48506a;   --color-surface-soft: #eef1f7;
--color-ink-faint  : #646b80;   --color-surface-tint: #ecf6fe;
--color-line       : #0b10201a; --color-surface-blue: #e2f1fd;
--color-line-strong: #0b102029;

--color-cyan-300: #7df0ff; --color-cyan-400: #34dcf4; --color-cyan-500: #11c2dd;
```

**Read that again: Mathos's own tokens are named `--color-paper`, `--color-ink`, `--color-surface`, `--color-line`.** Mathos and Sarsa independently arrived at the *same token vocabulary* and the *same warm off-white ground* (`#FCFCFB` vs `#FAFAF7` — a 2-point difference, visually identical). This is the deepest agreement between the two references, and it is the foundation the redesign should stand on.

UNVERIFIED / do not treat as brand: the stock MUI palette present in their bundle (`#2196F3`, `#EF5350`, `#FFA726`, `#66BB6A`) and loose illustration hexes (`#f5a623`, `#fc3b43`, `#11d5ff`, `#00f278`). Those are library defaults and artwork, not tokens.

### 2.2 Typography & logo

```css
--font-display: "Archivo Variable", "Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
--font-sans   : "Archivo Variable", "Hanken Grotesk Variable", "Inter Variable", ui-sans-serif, system-ui, sans-serif;
--font-mono   : "Fira Code Variable", "Fira Code", ui-monospace, monospace;
```

- **Archivo** dominates (269 of ~400 measured leaf text nodes). Self-hosted via `next/font`; **no Google Fonts link tag**. Archivo is freely available on Google Fonts, so we can use it legitimately.
- Measured display treatment: `51.84px / w600 / −1.8144px` (−0.035em) and `57.6px / w600 / −2.016px` (−0.035em); section h2 `31.68px / w600 / −0.02em`; small caps-label `15px / w600`.
- Global: `letter-spacing: -.011em`, `font-variant-numeric: tabular-nums`, `-webkit-font-smoothing: antialiased`, `color-scheme: light`.
- **Math is rendered with KaTeX** — 12 KaTeX font families load; ~121 measured nodes use `KaTeX_Main` / `KaTeX_Math`.
- **Fira Code** is the mono, used for expression/console fragments.
- **No serif anywhere in the Mathos design system.**
- **Logo:** `/brand/logo-icon.svg`, a 200×200 monochrome isometric cube/prism silhouette with fine internal squiggles reading as handwriting on a face. The wordmark (`wordmark-mathos.png`, aspect 2041:439) is rendered at 20px height **via `mask-image` so it inherits `currentColor`** — i.e. it is a single-colour silhouette. On the live site it reads as lowercase rounded-geometric "**math**os" with "os" in brand blue, cube icon in blue at left.
- **Radius:** every radius token from `--radius-xs` to `--radius-4xl` is flattened to **`3px`**. Measured buttons: `border-radius: 3px`. Near-square corners are a genuine Mathos signature.
- **Shadows:** measured `box-shadow: none` on all four primary CTAs.
- **Buttons measured:** `padding: ~11.25px 18px`, `font-size: 14–16px`, `font-weight: 600`, height 40–45px, `border-radius: 3px`, no shadow.
- `manifest.json`: `"theme_color": "#ffffff"`, `"background_color": "#ffffff"`, `"name": "Mathos"`. **No `<meta name="theme-color">` tag exists.**

### 2.3 Product UI traits (measured on the live surfaces)

The Math Solver panel is the clearest specimen of the Mathos product grammar:

1. **Kicker → headline → body → arrow-link.** Literally Sarsa's opener: `MATH SOLVER` in widely-tracked uppercase, a w600 headline, `#48506A` body, then "Explore the solver →".
2. **A white card, 1px light border, small radius, no heavy shadow.**
3. **A formula banner** — a pale blue (`#ECF6FE`) strip carrying the governing KaTeX identity in `#155D97`.
4. **A plot** — pale-blue ground, hairline grid, two curves (brand blue + cyan `#11C2DD`), a **shaded region between them**, endpoint dots.
5. **A numbered step ladder** — a small pale-blue square badge with the index, a bold short verb label (*Intersect* / *Integrate* / *Evaluate*), then one KaTeX line each.
6. **A verification strip** — pale green band, a check glyph, `Area = 32/3 ≈ 10.67` with the result in green (`#15803D`).
7. **Micro-metadata chips** — "Solved in 1.8s", "MATHOS · VIDEO", "Following along".

Density is **moderate-to-low**: one idea per panel, generous padding, tabular numerals throughout. Motion is limited to counters, a rotating hero adjective (`["visualized","personalized","interactive","adaptive"]`, styled `text-brand-500`), and logo marquees.

**Named product surfaces (their words):** Math Solver · AI Tutor · Video Generation · Adaptive Learning. Footer tools: **Ask, Graph Calculator, Quiz Me, PDF Homework Helper, AI Whiteboard, Calculator, Math Tutor**. Also named: Flashcards, Quiz, Study Tools, Interactive Games, Keynote/Key Notes, Practice, Assessment, Knowledge Points. Model tiers: **MathosPro (Smart AI)** and **MathosMax (Best Accuracy)**. Input modes: photo/image, typed, LaTeX, voice, PDF.

Pricing: Free $0 · **Basic $5.98/wk** · **Prime $9.98/wk** (Best value) · Enterprise custom. Header: "Our honest pricing" / "A personal tutor shouldn't be a luxury."

### 2.4 Tone of voice

Confident, minimal, Apple-adjacent: **declarative sentence fragments with terminal periods**, plus a wry aside layer. Verbatim, each ≤15 words:

- "Math, personalized." / "Math, visualized." (rotating hero)
- "One prompt becomes a lesson."
- "Solve anything. Truly anything."
- "Every video, everywhere, all at once."
- "The last tutor you'll ever need."
- "Not a chatbot you query. A tutor that's with you."
- "Less than a Starbucks you'll forget about" (pricing — the wry register)

Mission line: "making quality, personalized education accessible to the next billion learners."

**Sarsa's voice, for comparison:** "Expert work, recorded faithfully." / "Verified by execution." / "Human is the source." / "Start with the work your agents cannot do." — *identical rhythm.* Short, declarative, period-terminated, noun-led. **The two brands already write the same way.** This is a gift; do not squander it by writing hackathon copy.

### 2.5 Education traits (their stated pedagogy)

- Solver: "Mathos breaks any problem to its core and re-explains until it clicks. Ask for a single nudge or the full worked solution — your call."
- Tutor: "It watches you work and catches the mistake at the exact step you make it."
- Whiteboard: "As you work on the whiteboard, Mathos follows each step and nudges you the moment you slip."
- **Adaptive (the thesis):** "Most adaptive tools make a missed topic easier and serve it again. Mathos studies the pattern behind the miss, repairs the missing prerequisite, and returns the learner to the frontier."
- Video: "first frame in 5–10 seconds, the fastest anywhere. And every artifact stays fully editable."
- In-app honesty line: "Mathos can make mistakes. Please cross-validate crucial steps."

**Important nuance:** Mathos does **not** withhold answers. The claim is *step-by-step by default, full solution on demand*. Do not build a UI that refuses to show the answer — that is not their pedagogy.

### 2.6 Credibility claims — what we may and may not say

**Safe to quote (self-claimed AND third-party corroborated):**
- **Y Combinator W24.** Newsroom: "Mathos AI joins the Y Combinator Winter 2024 batch" (Apr 15, 2024). Corroborated at `ycombinator.com/companies/mathos`.
- **Forbes 30 Under 30** (Education 2025); cofounders Qi Lyu + Tianwei Yue. Newsroom dated Dec 3, 2024.
- **SXSW EDU 2025 Launch Startup Competition finalist** (Jan 8, 2025).
- **iF Design Award 2026** (Mar 6, 2026).
- Legal entity `Mathos, Inc.`, founded 2023-07-21.

**Quote only with "Mathos reports…" framing (self-reported; YC's own page disagrees):**
- 5M+ Students · 100M+ Problems solved · 150+ Countries. YC's page still says ~1M students / 200+ countries — the country figure moved *down*.

**DO NOT USE:**
- **"4.9 App Store."** Unverifiable. The iOS link in Mathos's own footer resolves to a differently-branded app by a different seller. The only measurable store figures are Google Play: **4.6 stars, ~5,984 ratings, 1M+ downloads**.
- **Any funding number.** Nothing on their own site; third parties disagree by 5× ($500K / $1.84M / $2.34M).
- **"University partners."** The MIT / Stanford / Berkeley / Caltech logo strip carries **no partnership language** in the markup. It reads as "where our users study." Calling them partners would be a fabrication.
- The "20%+ higher accuracy than GPT-5.2" FAQ line — self-reported internal benchmark, uncited.

---

## 3. TARGET 3 — The Mathos aura, and the reconciliation

### 3.1 What makes something feel genuinely Mathos

**BRAND traits**
- A **single blue identity** on a warm off-white ground. Blue is the only hue that carries identity; everything else is ink, grey, and semantics.
- **Archivo**, tightly tracked (−0.011em global, −0.035em display). A grotesk — never a serif, never a rounded "friendly-edtech" face.
- **Near-square corners and no shadows.** Mathos's surfaces are defined by borders and tints, not elevation.
- A wordmark that is a **single-colour silhouette inheriting `currentColor`** — never a coloured raster badge pasted onto a page.
- Copy in **short declarative fragments with terminal periods**, plus occasional dry wit. No exclamation marks, no emoji, no "🚀 Let's crush this problem!".
- Confidence without hype: "Our honest pricing", "Mathos can make mistakes."

**PRODUCT traits**
- **Math is typeset, not typed.** KaTeX/TeX rendering is non-negotiable. `a = x²` set in a UI font instantly reads as a mock-up.
- **The numbered step ladder** — index badge, short verb label, one expression per row — is the atomic unit of a Mathos explanation.
- **Tabular numerals everywhere**, so numbers in a column line up.
- **Plots are first-class** — hairline grid, two curves, a shaded region, endpoint dots — used to *make* the argument, not to decorate it.
- **A green verification strip** stating the checked result with a check glyph.
- **Latency and provenance surfaced as micro-chips:** "Solved in 1.8s", "first frame in 5–10 seconds", "MATHOS · VIDEO".
- One idea per panel. Moderate density, generous padding.

**EDUCATION traits**
- **Diagnose the cause, don't re-serve the symptom:** "studies the pattern behind the miss, repairs the missing prerequisite, and returns the learner to the frontier."
- **Catch the error at the step it happens**, not at the end.
- **The learner controls depth:** a nudge *or* the full solution, their call. Do not gate the answer.
- **Claims are bounded and honest.** "Mathos can make mistakes."
- Reasoning is **visualised as structure** — steps, graphs, paths — not narrated as a wall of chat text.

**The one-sentence test:** it feels like Mathos when *the math is properly typeset, the reasoning is shown as numbered structure or a plot, blue is the only identity colour, the copy is a short confident fragment, and nothing on the page claims more than it verified.*

### 3.2 Sarsa × Mathos — where they agree

| Dimension | Sarsa | Mathos | Verdict |
|---|---|---|---|
| Page ground | `#FAFAF7` | `#FCFCFB` | **Agree.** Warm off-white, near-identical. |
| Token vocabulary | `--paper --ink --panel --hairline` | `--color-paper --color-ink --color-surface --color-line` | **Agree**, independently. |
| Panel surface | `#FFFFFF` | `#FFFFFF` | **Agree.** |
| Shadows | none (measured 0) | none on CTAs/panels | **Agree.** Flat, border-defined. |
| Typeface class | Grotesk (Switzer) | Grotesk (Archivo) | **Agree.** No serif in either. |
| Display tracking | −0.012 to −0.022em | −0.035em | **Agree** in direction: tight negative. |
| Section opener | kicker → hairline → headline | kicker → headline → arrow-link | **Agree.** |
| Uppercase kicker | 12px/500/+.14em | wide-tracked uppercase caps | **Agree.** |
| Numerals | `tnum` | `tabular-nums` | **Agree.** |
| Green = verified | `--verify: #33724F` | result strip `#15803D` | **Agree** on semantic and hue family. |
| Muted blue exists | `--path-b: #2E5E8C` | `--brand-700: #155D97` | **Agree** — the same register lives in both. |
| Line-art diagrams | 1px stroke, no fill | wireframe torus, hairline plot grids | **Agree.** |
| Voice | "Verified by execution." | "Solve anything. Truly anything." | **Agree.** Same cadence. |

That is an unusually large overlap. The redesign is mostly *removal*, not invention.

### 3.3 Where they conflict — and the ruling

**Conflict 1 — Display weight. Sarsa 300 vs Mathos 600.**
**RULING: split by scale. Sarsa wins above 26px; Mathos wins below.**
Display type (≥26px) is **weight 300** with Sarsa's tracking and ≤1.12 line-height. UI type (buttons, kickers, labels, table heads, step labels) is **weight 600**. Rationale: Mathos's 600 is a *marketing-site* loudness that their own product panels do not use at large sizes; Sarsa's large-and-light is the requested theme. Setting big type light and small type strong preserves both signatures without averaging them into 500-everywhere mush. **Rule of thumb: big type is Sarsa-light, small type is Mathos-strong.**

**Conflict 2 — Identity colour. Sarsa has none (ink is the brand) vs Mathos blue `#339AEF`.**
**RULING: Mathos wins, but at Sarsa's saturation.** Use **`#155D97`** — which is *Mathos's own `--color-brand-700`*, so it is authentically Mathos, and it sits in the same muted register as Sarsa's `--path-b: #2E5E8C`. `#339AEF` is retained but **rationed to two places only**: the wordmark, and focus/selected state. A page saturated in `#339AEF` loses the Sarsa feel instantly.

**Conflict 3 — Primary button. Sarsa filled ink vs Mathos filled brand blue.**
**RULING: Sarsa wins.** Primary is **filled ink `#16150F`** with Sarsa's left-to-right wipe-to-outline hover. Rationale: the ink button is the single most recognisable Sarsa interaction, and a blue button on a page that already carries a blue identity colour flattens the hierarchy. Blue is reserved for *links and state*, not for the main affordance.

**Conflict 4 — Radius. Sarsa 8/12px vs Mathos 3px.**
**RULING: Sarsa wins.** `8px` controls, `12px` panels, `999px` pills, `4px` micro-chips. Rationale: 3px reads as an accident rather than a decision at our panel sizes, and radius is one of the most legible *thematic* signals — precisely the axis on which we were asked to match Sarsa. Cost acknowledged: we lose Mathos's near-square signature. Mitigated by keeping everything *else* about Mathos's surfaces (border-defined, tinted rather than elevated, zero shadow).

**Conflict 5 — Mono type. Sarsa has none (tnum only) vs Mathos ships Fira Code.**
**RULING: Mathos wins, tightly rationed.** **Fira Code** for step ids, receipt fields, tool names, observed sequences, and code. Everything numeric that is *not* code uses Archivo with `tabular-nums`, per Sarsa. Mono must never carry prose.

**Conflict 6 — Rust `#C2541E`.**
**RULING: Sarsa's semantics win, absolutely.** Rust is a **path/diagnostic colour only** — the learner's traced route, the attempted-but-incomplete path, the "here is where it went" stroke on a diagram. It is **never** a button fill, a heading colour, a link, a brand accent, or an italic flourish. Mathos has no orange in its palette at all, so any rust that escapes the diagram layer reads as not-Mathos.

**Conflict 7 — Green.**
**RULING: verification only, in both.** `#33724F` (Sarsa's `--verify`; Mathos's `#15803D` is the same family). It marks *checked / passed / verified* and nothing else. **Never a primary button.**

**Conflict 8 — Motion. Sarsa animates almost nothing; Mathos animates counters, marquees, a rotating word.**
**RULING: Sarsa wins.** No scroll-reveal on text. Chrome, state, and one hero scene may animate. Mathos's counter animation is permitted **once**, on a stats moment, if one exists.

**Conflict 9 — Density. Sarsa is a marketing page; we are building an application.**
**RULING: neither reference answers this directly; adopt Sarsa's rule-work at application density.** Keep the hairline-divided columns, the kicker/rule/headline opener, and the node-on-rule motif, but make `--space-section * .6` the **default** rather than the exception, and let the app's reading column sit at 620–720px inside the 1120px shell.

**Conflict 10 — Ink hue. Sarsa warm `#16150F` vs Mathos neutral `#0A0A0A`.**
**RULING: Sarsa wins.** `#16150F` is warm-black and is what makes warm paper cohere. Mathos's cool `#0A0E1B` is retained as `--ink-cool` for the one place Mathos uses it: dark inline chips.

---

## 4. TARGET 4 — Judging the current build

I read all four screenshots and **sampled their actual pixels** (PowerShell + `System.Drawing`, ~1 in 9 pixels, most-frequent-colour census plus a chroma-filtered census). Values below are measured from the images; because they are PNG-compressed anti-aliased renders, true CSS values may be a few points more saturated. Marked accordingly.

### 4.1 Measured current palette

| Role | Measured | Reference comparison |
|---|---|---|
| Page ground | **`#F6F3EA`** (dominant across all three sampled shots) | Sarsa `#FAFAF7`; Mathos `#FCFCFB` |
| Panel | **`#FAF7F0`** | Both `#FFFFFF` |
| Ink | **`#20221F`** | Sarsa `#16150F`; Mathos `#0A0A0A` |
| Rust | **`#B5633C`** (3,693 px on a solid stroke — reliable) | Sarsa `--path-a #C2541E` |
| Steel blue | **`#506F99`** | Sarsa `--path-b #2E5E8C`; Mathos `--brand-700 #155D97` |
| Green | **`#417960` / `#47755B`** | Sarsa `--verify #33724F` |

### 4.2 The honest verdict

**It reads as a very well-made warm editorial template that has borrowed Sarsa's *path palette* while missing Sarsa's *typography* and, more seriously, Sarsa's *colour semantics*. It does not read as Mathos at all.**

Fair first, because the structure is genuinely good and should be **kept**:

- The kicker → hairline-rule → headline opener is present and correct (`02 / MEASUREMENT`, `TARGETED REPAIR · SHARED PATH`).
- Numbered ladders (the `01 / 02 / 03` receipt rows) — correct, and Mathos-authentic.
- Full-bleed hairline dividers between sections — correct.
- The three-zone shell (left pathway rail / centre column / right "What Mathos noticed" rail) with hairline separators — correct.
- The loss curve with circular waypoint nodes on a rust stroke is **almost exactly** a Sarsa illustration.
- Tabular numerals, tiny uppercase micro-labels, muted italic footnotes — correct instincts.
- The copy is genuinely on-voice: "Evidence, not a trophy." / "No cleanup. Just logits." / "Loss leaves a trace." That is Mathos cadence and Sarsa cadence simultaneously. **Do not touch the copy.**
- The content honesty ("This receipt does not prove permanent mastery.", "Nothing here claims more than this session observed.") matches Mathos's own bounded-claims posture exactly.

Now the mismatches, each named specifically:

**M1 — The editorial serif. This is the single largest error.**
All display type — "One value can reach the result *twice*.", "Evidence, *not a trophy*.", "See both paths become 40.", "Loss leaves *a trace*." — is set in a high-contrast Didone/transitional serif, with a serif italic for the second line. **Neither reference contains a serif anywhere.** Sarsa loads four Switzer faces and no serif; Mathos's `--font-display` and `--font-sans` are both Archivo. A serif is the fastest possible signal of "generic warm editorial template", because it is the one choice every Substack/Ghost/Framer template makes. Everything else on this list is a tuning problem; this one is a category error.

**M2 — Serif italic as the emphasis mechanism.** Sarsa loads a 400-italic face and uses it for *one* muted aside. Emphasis in both references comes from size and weight, never from a coloured italic. The build's "light-serif-roman + rust-serif-italic" two-line headline is a fashion-editorial trope that exists in neither reference.

**M3 — The ground is too warm and too dark.** Measured `#F6F3EA` has an R−B delta of **12** and is ~4% darker than both references (Sarsa `#FAFAF7`, delta 3; Mathos `#FCFCFB`, delta 1). That is roughly **4× the warmth**. It reads as *cream/parchment*; both references read as *paper*. Compounding it, panels measure `#FAF7F0` rather than `#FFFFFF`, so the panel-on-paper contrast that Sarsa uses **in place of shadows** is nearly eliminated.

**M4 — Green is the primary button.** Screenshot 03's "CONTINUE THE PATH" is a filled forest-green button. In **both** references green is exclusively a verification semantic (`--verify: #33724F`; Mathos's green result strip). Neither uses green as an action colour. Sarsa's primary is filled ink; Mathos's is filled brand blue. This one choice does more brand damage than its size suggests.

**M5 — Rust is promoted from data to identity.** Rust colours headline halves ("*a trace.*", "*Just logits.*", "*attention goes.*") and the "Calculus · Chain Rule Contributions" subtitle. In Sarsa rust is `--path-a`, a route encoding, and it never touches type. **Mathos has no orange in its palette at all.** Rust-as-accent is the loudest non-Mathos signal on the page.

**M6 — Mathos blue is nearly absent as identity.** `#506F99` appears only in micro-kickers and the attention heatmap. Mathos's identity *is* blue (`#339AEF` / `#155D97`). A Mathos product where blue is a minor structural tint and orange is the accent is not recognisably Mathos.

**M7 — The wordmark is wrong.** It renders as `MATHOS·` in letterspaced serif small-caps. The real mark is a lowercase rounded-geometric sans "**math**os" with an isometric cube icon, delivered as a single-colour `currentColor` silhouette. Letterspaced serif caps is a luxury-fashion signature, not a math-software one.

**M8 — There is a drop shadow.** The evidence-receipt card in screenshot 03 sits on a soft offset shadow, and the "STEP 100" sample panel in 04 has one too. **Sarsa's measured `box-shadow` count is zero.** Mathos's CTAs measure `none`. Shadows must be removed entirely.

**M9 — Card corners are square (0px).** Sarsa uses 8px controls / 12px panels; Mathos uses 3px. 0px matches neither, and combined with the serif it pushes hard toward "print broadsheet".

**M10 — Math is set in the UI serif.** `a = x²`, `y`, `a · b` in screenshot 01 are typeset in the body serif. Mathos renders math with **KaTeX**. Serif-rendered pseudo-math is the clearest tell that this is a mock-up rather than a math product.

**M11 — The amber/tan subtitle.** "Calculus · Chain Rule Contributions" in screenshot 02 is a light amber (~`#E39A3B`, UNVERIFIED — sampled from anti-aliased text, not a solid fill). It is neither a Sarsa path token nor a Mathos token. It is a fourth accent that no reference authorises.

**M12 — Kickers are set in the serif.** Sarsa's kicker is `12px / 500 / +0.14em` in the sans; Mathos's is tracked sans caps. Setting `YOUR PATHWAY` / `SESSION ACTIVITY` in a serif small-cap changes the whole register.

**M13 — Outline pills and outline buttons appear** ("EVIDENCE ISSUED", "GENERATE A FRESH VERSION", "REPAIR IN PROGRESS"). Sarsa has **one** button style — filled ink — and one pill style (999px, hairline border, `11px / 500 / +0.08em` uppercase, `--ink-45`). The current green-bordered outline button is an invented variant.

**Scorecard:** Sarsa alignment ≈ **5/10** (structure and diagram vocabulary yes; type, ground, colour semantics and geometry no). Mathos alignment ≈ **2/10** (voice and pedagogy yes; palette, typeface, logo, math rendering no). "Generic warm editorial template" is unfortunately the closest single label for the current surface — which is a shame, because the *bones* underneath are better than that.

**The good news:** M1, M3, M4, M5, M8, M9, M12 and M13 are all pure token/CSS changes. Swap the font stack, cool and lighten the paper, restore panel white, re-scope rust and green, delete shadows, set the radii — and the existing layout becomes very close to right without touching structure or copy.

---

## FROZEN TOKEN PROPOSAL

Copy-paste as-is. Every value is either measured from a reference or derived by the rulings in §3.3. Fonts: **Archivo** (Mathos's real display/sans, free on Google Fonts) and **Fira Code** (Mathos's real mono). No serif token is defined, deliberately.

```css
/* =========================================================================
   MATHOS x SARSA - FROZEN DESIGN TOKENS  v1.0  (2026-08-26)
   Foundation & rhythm: Sarsa (sarsa.app, measured).
   Identity, typeface, math & product grammar: Mathos (mathos.ai, measured).
   Rulings: docs/overnight-audit/07_MATHOS_SARSA_DESIGN_DNA.md  section 3.3
   ========================================================================= */

/* Archivo 300/400/500/600 + Fira Code 400/500. Self-host for production. */
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

:root {
  /* ---- SURFACES (Sarsa ground, Mathos-compatible) --------------------- */
  --paper:            #FAFAF7;   /* page ground - Sarsa exact; Mathos #FCFCFB is equivalent */
  --paper-sunk:       #F4F4F0;   /* recessed rails, table zebra, inert wells */
  --panel:            #FFFFFF;   /* the ONE raised surface. Both refs agree. */
  --panel-tint:       #ECF6FE;   /* Mathos --color-brand-50: formula banners, step badges */
  --panel-verify:     #EEF4F0;   /* verification strip ground (green-tinted paper) */
  --panel-path:       #FBF2EC;   /* diagnostic / attempted-route ground (rust-tinted paper) */

  /* ---- INK ------------------------------------------------------------ */
  --ink:              #16150F;   /* Sarsa exact. Headings, primary text, primary button fill */
  --ink-cool:         #0A0E1B;   /* Mathos --color-ink-900. Dark inline chips only */
  --ink-70:  rgba(22, 21, 15, 0.68);  /* body prose, nav at rest */
  --ink-60:  rgba(22, 21, 15, 0.62);  /* kickers, numerals, meta */
  --ink-35:  rgba(22, 21, 15, 0.35);  /* faint strokes, disabled */
  --hairline:         rgba(22, 21, 15, 0.12);  /* EVERY divider and card border */
  --hairline-strong:  rgba(22, 21, 15, 0.22);
  --wash:             rgba(22, 21, 15, 0.06);  /* hover ground, unfilled progress track */

  /* ---- BRAND (Mathos identity, at Sarsa's saturation) ------------------ */
  --brand:            #155D97;   /* Mathos --color-brand-700. Links, active state, identity */
  --brand-deep:       #144D7C;   /* Mathos --color-brand-800. Hover on brand text */
  --brand-bright:     #339AEF;   /* Mathos --color-brand-500. RATIONED: wordmark + focus/selected ONLY */
  --brand-line:       #AEDAFB;   /* Mathos --color-brand-200. Tinted-panel borders */
  --brand-tint:       #ECF6FE;   /* Mathos --color-brand-50 */

  /* ---- SEMANTIC ------------------------------------------------------- */
  --verify:           #33724F;   /* Sarsa --verify. CHECKED/PASSED ONLY. Never a button. */
  --verify-deep:      #2A5E41;
  --warn:             #8A6A1F;   /* derived; muted to Sarsa register. Use sparingly. */

  /* ---- PATH / DATA ENCODING (Sarsa exact - NEVER type, buttons, links) - */
  --path-human:       #16150F;   /* the learner's own route */
  --path-a:           #C2541E;   /* rust  - the route under discussion / attempted route */
  --path-b:           #2E5E8C;   /* steel - alternative route */
  --path-c:           #33724F;   /* green - verified route */
  --path-d:           #7A5C9E;   /* violet - fourth route */
  --path-faint:       rgba(22, 21, 15, 0.42);  /* de-emphasise by ALPHA, never by hue */

  /* ---- TYPE FAMILIES -------------------------------------------------- */
  --font-sans: "Archivo", "Hanken Grotesk", system-ui, -apple-system, sans-serif;
  --font-mono: "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-math: KaTeX_Main, KaTeX_Math, serif;  /* KaTeX owns this. Never set math in --font-sans. */
  /* NO SERIF TOKEN EXISTS. This is deliberate - see section 4.2 M1. */

  /* ---- TYPE SIZES ----------------------------------------------------- */
  --fs-micro:   11px;  /* pills, legends */
  --fs-kicker:  12px;  /* uppercase eyebrow */
  --fs-num:     13px;  /* step indices, tnum meta */
  --fs-meta:    14px;  /* footer meta, nav CTA */
  --fs-ui:      15px;  /* nav links, button label, dense body */
  --fs-sm:      16px;  /* column body */
  --fs-body:    17px;  /* BASE */
  --fs-lg:      18px;  /* section prose */
  --fs-xl:      19px;  /* wordmark, hero sub */
  --fs-2xl:     21px;  /* premise paragraph */
  --fs-3xl:     22px;  /* card / pillar h3 */
  --fs-pull:    clamp(24px, 3.0vw, 36px);   /* pull quote */
  --fs-section: clamp(28px, 3.4vw, 44px);   /* Sarsa --display-section */
  --fs-hero:    clamp(40px, 5.6vw, 76px);   /* Sarsa --display-hero */
  --fs-lede:    clamp(46px, 7.0vw, 92px);   /* full-bleed lede */

  /* ---- TYPE WEIGHTS - big is Sarsa-light, small is Mathos-strong ------- */
  --fw-display: 300;   /* EVERYTHING >= 26px */
  --fw-body:    400;
  --fw-medium:  500;   /* h3, wordmark, emphasis inside prose */
  --fw-ui:      600;   /* buttons, kickers, step labels, table heads */

  /* ---- TRACKING ------------------------------------------------------- */
  --ls-lede:    -0.022em;
  --ls-hero:    -0.015em;
  --ls-section: -0.012em;
  --ls-h3:      -0.010em;
  --ls-body:     0em;
  --ls-kicker:   0.14em;   /* uppercase 12px */
  --ls-pill:     0.08em;   /* uppercase 11px */

  /* ---- LINE HEIGHTS --------------------------------------------------- */
  --lh-lede:    0.98;
  --lh-hero:    1.08;
  --lh-section: 1.12;
  --lh-h3:      1.25;
  --lh-tight:   1.35;
  --lh-prose:   1.55;
  --lh-body:    1.65;   /* 17px -> 28.05px, Sarsa exact */

  /* ---- MEASURE (hard caps - Sarsa exact) ------------------------------ */
  --measure-lede:     14ch;
  --measure-headline: 640px;
  --measure-prose:    620px;
  --measure-hero:     720px;
  --measure-pull:     760px;
  --measure-premise:  680px;

  /* ---- LAYOUT --------------------------------------------------------- */
  --container:      min(1120px, 92vw);   /* Sarsa exact; gutter = 4vw per side */
  --container-wide: min(1120px, 94vw);   /* hero panel */
  --nav-h:          64px;
  --space-section:       clamp(96px, 14vh, 160px);
  --space-section-tight: calc(var(--space-section) * 0.6);  /* in-app DEFAULT */
  --space-section-cta:   calc(var(--space-section) * 0.8);
  --col-pad:        36px;   /* padding inside hairline-divided columns */
  --col-gap:        48px;   /* pillar grid gap */
  --stagger:        28px;   /* pillar nth-child(2); nth-child(3) = 2x */

  /* ---- SPACING SCALE (4px base) --------------------------------------- */
  --s-1:   4px;  --s-2:   8px;  --s-3:  12px;  --s-4:  16px;
  --s-5:  20px;  --s-6:  24px;  --s-7:  28px;  --s-8:  32px;
  --s-9:  40px;  --s-10: 48px;  --s-11: 56px;  --s-12: 72px;
  --s-13: 96px;  --s-14: 120px; --s-15: 160px;
  --rule-margin: 18px 0 40px;   /* the kicker -> rule -> headline gap. Sarsa exact. */

  /* ---- GEOMETRY (Sarsa wins - section 3.3 Conflict 4) ------------------ */
  --r-focus:     2px;
  --r-chip:      4px;
  --r-control:   8px;    /* buttons, inputs, selects */
  --r-panel:    12px;    /* cards, hero panel, code wells */
  --r-pill:    999px;
  --r-dot:       50%;

  --bw-hairline: 1px;
  --bw-rule:     1px;    /* structural ink top-rule */
  --bw-focus:  1.5px;
  --bw-node:   1.5px;    /* the 8px waypoint dot ring */
  --bw-track:    2px;    /* progress segments */
  --stroke-diagram: 1px; /* SVG default; 1.2-1.9px for emphasis ONLY */
  --node-size:   8px;

  /* ---- ELEVATION ------------------------------------------------------ */
  --shadow-none: none;   /* THE ONLY ELEVATION TOKEN. Both references measure zero shadows. */

  /* ---- MOTION (Sarsa exact) ------------------------------------------- */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
  --ease-emph:   cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  --d-instant:    150ms;  /* transforms, opacity, press */
  --d-quick:      250ms;  /* colour */
  --d-link:       300ms;  /* underline sweep */
  --d-fill:       350ms;  /* button wipe, arrow nudge */
  --d-chrome:     400ms;  /* nav background / border */
  --d-ripple:     600ms;
  --d-signature:  700ms;
  --d-pulse:     2000ms;  /* looping scroll hint */

  /* ---- CONTROL GEOMETRY ----------------------------------------------- */
  --btn-pad-sm: 11px 16px;  --btn-fs-sm: 14px;  /* nav CTA,  ~38px tall */
  --btn-pad-md: 12px 22px;  --btn-fs-md: 15px;  /* default,  ~45px tall */
  --btn-pad-lg: 15px 28px;  --btn-fs-lg: 16px;  /* hero/CTA, ~53px tall */
  --btn-gap:     8px;
  --pill-pad:   2px 8px;    --pill-fs:   11px;
}

/* ---- BASE ------------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-padding-top: calc(var(--nav-h) + 24px); }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: var(--fw-body);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  letter-spacing: -0.011em;              /* Mathos global */
  font-variant-numeric: tabular-nums;    /* both references */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
h1, h2, h3, p { margin: 0; }
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; }
::selection { background: var(--ink); color: var(--paper); }
:focus-visible {
  outline: var(--bw-focus) solid var(--ink);
  outline-offset: 3px;
  border-radius: var(--r-focus);
}

.container { width: var(--container); margin-inline: auto; }

/* The three-part section opener. Use it everywhere. */
.kicker {
  font-size: var(--fs-kicker); font-weight: var(--fw-ui);
  letter-spacing: var(--ls-kicker); text-transform: uppercase;
  color: var(--ink-60);
}
.rule { border: none; border-top: var(--bw-hairline) solid var(--hairline); margin: var(--rule-margin); }
.headline {
  font-size: var(--fs-section); font-weight: var(--fw-display);
  letter-spacing: var(--ls-section); line-height: var(--lh-section);
  max-width: var(--measure-headline);
}

/* The one button. Vary by padding only. */
.button {
  display: inline-flex; align-items: center; gap: var(--btn-gap);
  padding: var(--btn-pad-md); font-size: var(--btn-fs-md); font-weight: var(--fw-ui);
  background: var(--ink); color: var(--paper);
  border: var(--bw-hairline) solid var(--ink); border-radius: var(--r-control);
  box-shadow: var(--shadow-none);
  position: relative; overflow: hidden;
  transition: color var(--d-fill) ease, transform var(--d-instant) ease;
}
.button::before {
  content: ""; position: absolute; inset: 0; background: var(--paper);
  transform: scaleX(0); transform-origin: left center; z-index: 0;
  transition: transform var(--d-fill) var(--ease-emph);
}
.button:hover::before { transform: scaleX(1); }
.button:hover { color: var(--ink); }
.button > span, .button .arrow { position: relative; z-index: 1; }
.button .arrow { transition: transform var(--d-fill) ease; }
.button:hover .arrow { transform: translateX(4px); }
.button:active { transform: scale(0.97); }

/* Waypoint node straddling a structural rule. */
.node-rule { position: relative; border-top: var(--bw-rule) solid var(--ink); padding-top: var(--s-5); }
.node-rule::before {
  content: ""; position: absolute; top: calc(var(--node-size) / -2 - 0.5px); left: 0;
  width: var(--node-size); height: var(--node-size); border-radius: var(--r-dot);
  background: var(--paper); border: var(--bw-node) solid var(--ink);
}

/* Hairline-divided columns: the divider IS the gutter. */
.streams { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.stream  { padding: 0 var(--col-pad); border-left: var(--bw-hairline) solid var(--hairline); }
.stream:first-child { padding-left: 0; border-left: none; }
@media (max-width: 767px) {
  .streams { grid-template-columns: 1fr; gap: var(--s-8); }
  .stream, .stream:first-child {
    padding: 0 0 0 var(--s-5);
    border-left: var(--bw-hairline) solid var(--hairline);
  }
}

/* Diagrams: 1px stroke, no fill, path tokens only, fade by alpha. */
.diagram path, .diagram line, .diagram circle, .diagram rect {
  fill: none; stroke-width: var(--stroke-diagram); vector-effect: non-scaling-stroke;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
    transition-duration: 1ms !important; scroll-behavior: auto !important;
  }
}
```

### Non-negotiables for the implementer

1. **No serif. No `box-shadow`. No green buttons. No rust type.** These four deletions carry most of the improvement.
2. Math renders through **KaTeX**. Never typeset an expression in `--font-sans`.
3. `--path-*` and `--verify` may colour **strokes, badges, and tinted grounds only** — never a heading, link, or button.
4. `--brand-bright` (`#339AEF`) appears in exactly two places: the wordmark, and focus/selected state.
5. Display type (≥26px) is **always weight 300**; UI type is **always weight 600**. Nothing important is 400 at 32px.
6. Text does not scroll-reveal. Only chrome, state, and one hero scene may animate.
7. Every section opens `kicker → hairline rule → headline`, with the rule margined `18px 0 40px`.
8. Claims obey §2.6: "Y Combinator W24" and "Forbes 30 Under 30" are safe; "4.9 App Store", any funding figure, and "university partners" are not.
