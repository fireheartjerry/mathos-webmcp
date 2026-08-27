# 05 — AI Slop Research, Elite UI Principles, and the Anti-Slop Checklist

Research date: **2026-08-26**. All web sources fetched fresh on this date.
Method: literature review (18 sources) + **first-hand computed-CSS measurement** of
linear.app, stripe.com, and brilliant.org taken live on 2026-08-26 via browser DOM
inspection (raw numbers in Part 2).

---

## Source list

| # | Source | URL | Date |
|---|---|---|---|
| S1 | Adrian Krebs / Developers Digest — "AI Design Slop: 16 Patterns That Out Your App as Vibe-Coded" | https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it | 2026-04-22 |
| S2 | Claude Code Playbooks — "Unslop UI: Kill the AI Design Tells" | https://www.claudecodehq.com/playbooks/unslop-ui | 2026 |
| S3 | prg.sh — "Why Your AI Keeps Building the Same Purple Gradient Website" | https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website | 2025-10-26 |
| S4 | Alan West (dev.to) — "How to fix the 'AI-generated' look in your frontend" | https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh | 2024-05-18 |
| S5 | Hacker News #48504912 — "Slightly reducing the sloppiness of AI generated front end" | https://news.ycombinator.com/item?id=48504912 | 2026 |
| S6 | 925 Studios — "AI Slop Fonts and Gradients: The Tells That Give Away AI Design" | https://www.925studios.co/blog/ai-slop-design-tells | 2026 |
| S7 | Superdesign — "Why AI Design Looks Generic" | https://superdesign.dev/blog/why-ai-design-looks-generic | 2026-06-15, upd. 06-26 |
| S8 | Victor Onyedikachi / Design Systems Collective — "Is Anyone Else Tired of Every Tailwind/shadcn App Looking the Same?" | https://www.designsystemscollective.com/is-anyone-else-tired-of-every-tailwind-shadcn-app-looking-the-same-69c545e73114 | 2025 |
| S9 | AXE-WEB — "Why AI Websites All Look the Same (And When It Matters)" | https://axe-web.com/insights/ai-website-design-sameness/ | 2025 |
| S10 | Wheels Up Collective — "We Don't Want a Beige Internet" | https://www.wheelsupcollective.com/post/we-dont-want-a-beige-internet | 2025 |
| S11 | Mantlr — "How Stripe, Linear, and Vercel Ship Premium UI" | https://mantlr.com/blog/stripe-linear-vercel-premium-ui | 2026 |
| S12 | LogRocket — "Linear design: the SaaS trend that's boring and bettering UI" | https://blog.logrocket.com/ux-design/linear-design/ | 2025 |
| S13 | Imran & Bulathwela — "The Correct Answer Trap: Pedagogically-Grounded Detection and Feedback for Hidden Misconceptions" | https://arxiv.org/pdf/2606.23205 | 2026 |
| S14 | Kurnaz — "A Meta-Analysis of Gamification's Impact on Student Motivation in K-12", *Psychology in the Schools* | https://onlinelibrary.wiley.com/doi/10.1002/pits.70056 | 2025 |
| S15 | Springer ETR&D — gamification meta-analysis (intrinsic motivation, autonomy, relatedness; minimal competency effect) | https://link.springer.com/article/10.1007/s11423-023-10337-7 | 2024 |
| S16 | arXiv — "Gamification with Purpose: What Learners Prefer to Motivate Their Learning" | https://arxiv.org/html/2512.08551v1 | 2025 |
| S17 | Frontiers in Education — digital badges in technology-enhanced learning environments | https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1429452/full | 2024 |
| S18 | Smashing Magazine — "Typographic Hierarchies" | https://www.smashingmagazine.com/2022/10/typographic-hierarchies/ | 2022 |
| M1 | **First-hand measurement**, linear.app / stripe.com / brilliant.org computed styles | — | 2026-08-26 |

---

# PART 1 — What "AI slop UI" means in 2026

## 1.0 The mechanism (why anything reads as "generated" at all)

Every serious source converges on one explanation, and it is not "overuse."
It is **the absence of a decision**.

> "For visual choices, 'most probable' means the statistical average of millions of
> templates the model has seen… An average isn't a style. It's the absence of one." (S2)

S3 traces the causal chain concretely: Adam Wathan's August 2025 public apology for
shipping `bg-indigo-500` as the Tailwind UI default in ~2019 — a post that reached
over a million views — because that single token propagated through thousands of
tutorials into the training corpus and became the model's prior for "modern button."

S2 states the operative test in one line, and this is the frame the rest of this
document uses:

> **"A tell is an *unspecified default*, not a banned color."**

This matters enormously for our build. It means the question is never "did we use a
gradient." It is "can a viewer tell that a human chose this, for this product, for a
reason." Every rule in Part 4 is a proxy for that question.

## 1.1 The confirmed tells

For each: what it is, who says so, and **why it reads as generated** (the mechanism,
not the frequency).

### T1 — AI Purple / indigo-violet primary
**Confirmed, strongest single signal.**
Signatures per S2: Tailwind `indigo-*`/`violet-*`/`purple-*`/`fuchsia-*` as primary;
hex `#6366f1`, `#7c3aed`, `#8b5cf6`; CSS `--primary` at HSL hue 255–280.
S6 calls the blue-to-purple gradient "the single loudest AI tell in 2026." S7 names
`#6366F1` explicitly and adds `#8B5CF6` / `#A855F7` as its gradient partners.
S1 names the hue "VibeCode Purple."

**Mechanism:** it is not that purple is ugly. It is that purple arrived *without a
brand*. A hue nobody in the company can justify is evidence that nobody chose it.

### T2 — Gradient abuse, especially gradient-filled text
**Confirmed, but narrower than folklore.** S2's fix rule: default to solid fills;
allow at most one restrained accent gradient; **never** gradient-fill running headings
or body text (`bg-clip-text text-transparent`).

**Mechanism:** a gradient on type destroys the one thing type is for — contrast
consistency across a glyph run. It is a decorative effect applied to a functional
element, which is the definition of undirected styling.

**Refutation attached:** S2's data explicitly *clears* mesh / blob / aurora
backgrounds — "a keyword artifact, not a real complaint." Ambient background
gradients are not the tell; gradient *text* and gradient *buttons* are.

### T3 — Untouched shadcn/Tailwind component defaults
**Confirmed.** S2's code signature is exact: the stock trio
`rounded-lg border bg-card text-card-foreground shadow-sm`, plus `components.json`
with `baseColor: "slate"` and untouched `cssVars`. S8 and S9 both attribute the
sameness to Tailwind/shadcn's overrepresentation in public GitHub, making that
aesthetic the statistically likeliest completion.

S2's test is worth stealing: *could someone distinguish your Card from the shadcn
documentation examples?*

**Mechanism:** defaults are literally the un-decided state, rendered.

**Important refutation:** S2 explicitly clears the *frameworks* — "shadcn/Tailwind
tools themselves: the defaults are the tell, not the frameworks."

### T4 — Centered hero + three equal feature cards + CTA ("card soup" / the canned skeleton)
**Confirmed, and it is a *layout grammar* tell, not a component tell.**
S1 patterns #9 and #12; S2 tell #9; S4 names the full skeleton
"hero → features grid → social proof → pricing → FAQ → footer"; S5 commenters
describe "the canned full-page skeleton — hero → 3 cards → logo strip → pricing →
FAQ → footer — shipped as-is."

S2's fix is specific: break the grid, use an asymmetric hero (content left, real
product screenshot right), vary section layouts, **show actual product over abstract
icon-cards**.

**Mechanism:** three equal-weight cards assert that three things are equally
important. That is almost never true of a real product, so the layout is visibly not
describing reality — it is describing a template.

### T5 — Everything rounded to the same large radius
**Confirmed.** S2 tell #5: `rounded-2xl`/`rounded-3xl`/`rounded-full` broadly on
containers, `border-radius: 9999px` reused everywhere. S5 commenter `LZ_Khan` names
"rounded corner cards with slight shadow, and sans serif font" as the giveaway.

Fix rule (S2): define a *small intentional radius scale*; "sharp or light-rounded
corners often read more deliberate."

**Mechanism:** a single radius applied to every box means radius carries zero
information. In a designed system radius is a semantic (interactive vs. static,
inline vs. container).

### T6 — Arbitrary drop shadows / colored glows
**Confirmed, with a specific 2026 variant.** S1 pattern #8 ("large colored glows and
colored box-shadows"); S2 tell #6 (`shadow-[0_0_*]`, neon-on-dark, "remove glow you
didn't deliberately design"); S7 notes "subtle shadows at exactly 0.1 opacity" as a
fingerprint. S5 commenter `iSnow` prescribes the opposite extreme: "two background
shades max, no drop shadows."

**Mechanism:** elevation is a claim about z-order. A shadow with no z-order behind it
is decoration, and decoration applied uniformly is undirected.

### T7 — Weak / bimodal typographic hierarchy
**Confirmed.** S3: "lack of visual hierarchy beyond text size." S4: "Inter for
everything, with minimal variation in line-height and tracking." S2 tell #10: "every
section same weight; nothing leading the eye." S18 gives the positive version:
hierarchy is *arranging content in levels of importance* using scale, weight and
spacing together.

**Mechanism:** generated type systems vary exactly one axis (size). Real ones vary
size, weight, colour, tracking and *position* in coordinated pairs.

### T8 — Inconsistent, unsystematic spacing
**Confirmed.** S2 tell #10 gives mechanical signatures: mixed padding (`p-3`, `p-7`,
arbitrary `mt-[37px]`), off-by-pixel misalignment, inconsistent gutters, text
overflowing fixed-width cards. S2 also flags "centered everything + excessive
vertical padding" as a lower-signal but real tell.

**Mechanism:** a spacing scale is a decision made once and applied. Arbitrary values
prove no scale exists.

### T9 — Over-animation unconnected to state
**Confirmed.** S2 tell #4, with exact signatures: Framer Motion boilerplate
`initial={{opacity:0,y:20}}` / `whileInView` / `whileHover={{scale:1.05}}`,
`data-aos="fade-up"` everywhere, `hover:scale-105` on every card, global scrolljacking.

Fix rule: "Motion communicates state or guides attention (exception, not rule).
Always honor `prefers-reduced-motion`."

**Mechanism:** motion is a channel. Firing it on everything is equivalent to setting
every word in a paragraph in bold.

### T10 — Emoji as iconography, and the ✨ sparkle motif
**Confirmed.** S2 tell #7: emoji in headings, feature-card titles, list bullets;
"stock placeholders: rocket, sparkles, lightning bolt, fire, lightbulb, lock,
checkmark." S1 pattern #15: "sidebar or nav with emoji icons."

The line S2 draws is sharp and worth keeping: **emoji in genuine body copy is fine;
emoji replacing UI icons is not.**

**Mechanism:** an emoji renders differently on every platform and carries no optical
alignment with the surrounding type. Choosing one is choosing not to have an icon set.

### T11 — All-caps micro-labels everywhere
**Confirmed, and badly under-appreciated.** S1 pattern #16 ("all-caps headings and
section labels") and pattern #5 (dark mode "with medium-grey body text and all-caps
section labels"). S5 commenter `LZ_Khan` cites "unnecessary capitalization."

**Mechanism:** all-caps is a *density* device borrowed from editorial print. Applied
to every label it stops signalling "this is a category marker" and starts signalling
"the author had exactly one idea about small text."

Measured against real products this turned out to be the single most discriminating
metric I found — see M1 in Part 2. Linear: 6 uppercase elements out of 4,000.
Stripe: **0 out of 2,521.** Brilliant: **0 out of 962.**

### T12 — Meaningless stat banners and metric cards
**Confirmed.** S1 pattern #14: "stat banner rows." S11 lists "colorful accent cards on
dashboards" among what elite products deliberately omit.

**Mechanism:** a stat card whose number is hardcoded is a *lie-shaped component*.
Readers detect this quickly, and it poisons trust in every genuine number nearby.

### T13 — Generic marketing copy inside product UI
**Confirmed.** S2 tell #11: "Transform your X," "Supercharge," "Unleash," "Your X,
reimagined." S4 gives a usable ban-list — no sentence starting with "Empower,"
"Unlock," or "Transform"; no abstract-noun feature titles ("Seamless Integration");
include specific claims with numbers. S6 calls these "weightless headlines"
("Build faster. Ship smarter").

**Mechanism:** the copy is interchangeable between products, so it proves the writer
did not know what this product does.

### T14 — Badge directly above the H1; numbered 1-2-3 step rows; colored top/left card borders
**Confirmed, and mostly new to 2026 lists.** S1 patterns #10, #13, #11. On the colored
edge specifically S1 is emphatic: it is *"almost as reliable a sign of AI-generated
design as em-dashes for text."*

**Mechanism:** these are compositional idioms with no functional load — the visual
equivalent of filler words.

### T15 — Inter (and the Space Grotesk / Geist / Instrument Serif combo set)
**Confirmed but nuanced.** S6: "Inter, used everywhere, is not wrong, it is just the
safest possible answer." S1 pattern #2 names the recurring combos: Space Grotesk,
Instrument Serif, Geist. S1 pattern #3 is oddly specific and directly relevant to us:
**"serif italic used as the accent font for one hero word in an otherwise-Inter page."**

**Mechanism:** the tell is the absence of a stated reason, per S2's fix rule: "choose a
typeface for a stated reason and pair it."

### T16 — ⚠ THE 2026 TELL: cream + serif display + sage/forest green

**This is the most important finding in Part 1 for this project.**

S2 lists this as tell **#0**, ahead of AI purple, with explicit code signatures:

- page backgrounds `#faf8f5`, `#f5f1e8`, `bg-stone-50/100`, `bg-amber-50`
- serif headings: **Instrument Serif, Fraunces, Playfair Display, Spectral**
- green primaries `#15573a`, `#1a4d3a`, emerald/green 700–900
- **Fix rule: "Any two of these three signals reach for defaults."**

S2's framing: this combination "is now recognized as the current AI-generated
'tasteful' default, replacing the older purple gradient. Users specifically identify
it as **dishonest slop** because it mimics deliberate design choice." Independent 2026
commentary confirms the same claim and adds that swapping one default for another
"merely resets the clock."

**Mechanism:** this is the anti-slop advice of 2025 having become the slop of 2026.
Because it is the *output of a de-slopping instruction*, it is a second-order default,
and it is worse than purple precisely because it makes a claim to taste.

**Direct implication for our build (scored in Part 5):** our background is
`--cream: #f3efe5` / `--paper: #faf7ef` — matching the S2 background signature — and
`--green: #3f795f` is in the forest-green family, though lighter than the cited
`#15573a`. That is **two of three signals**, exactly S2's trigger threshold. Our
escape hatches are real but currently too quiet: the display face is **Georgia**, not
any of S2's named list, and the dominant accent is terracotta `--orange: #c85d31`, not
green. The remedy is not to abandon the palette — it is to make the two non-default
choices unmistakable.

## 1.2 Refuted, downgraded, or "it depends"

The brief asked me to check the list rather than confirm it. Six items on it are
wrong, out of date, or need restating.

| Claim | Verdict | Evidence |
|---|---|---|
| **Glassmorphism is a tell** | **Refuted / negligible.** | S2 measures it at **0.2% signal** and files it under "allowed." The 2026 objection to blur is legibility, not taste. |
| **Bento grids are a tell** | **Refuted.** | S2: **0.1% signal**, and "actively defended" by practitioners. |
| **Mesh/blob/aurora gradient backgrounds** | **Refuted.** | S2 lists these under "explicitly cleared by data (don't chase) — a keyword artifact, not a real complaint." |
| **Dark mode is a tell** | **Refuted as stated; true in a narrower form.** | S2: "dark mode itself — only unprompted *glow* is the tell." S1 refines it to unprompted *permanent* dark mode with medium-grey body text, and separately flags the real bug: S1 pattern #6, "generated dark themes routinely ship body text that fails WCAG AA." The tell is a contrast failure wearing a style's clothes. |
| **Rounded cards / "card soup" per se** | **Partly refuted.** | The sources object to *uniform* radius (T5) and to *three equal cards standing in for content* (T4). Nobody objects to cards as a container. A card holding one real object is fine. |
| **"Excessive whitespace"** | **Reframed, not refuted.** | S2 flags "centered everything + excessive vertical padding" as low-signal only. S11's positive framing is better: Stripe uses "generous spacing… not wasteful, but deliberate," and calls it a trust signal. The failure mode is *unrhythmic* whitespace — voids with no relationship to a scale — not quantity. Our build fails this specific version (Part 5 #24). |

One genuine dissent worth recording, from S5: commenter `llm_nerd` argues "AI slop" is
entirely subjective and would be better called "human slop," applied inconsistently;
`wuliwong` reports producing good UIs easily. `kvasserman`'s reply is the most useful
synthesis in the thread, and the reason Part 4 exists: **knowing what good looks like
is the actual barrier.** A checklist is how you carry that knowledge across a build.

The single most instructive result in S5 is that asking the model to make a UI look
like a **Qt application** "removed almost all feeling of slop" — because, per commenter
`Xotic007`, "Qt works because there's really only one way Qt looks. Modern web has a
million versions." Constraint, not taste, is what removes the smell. Commenter
`Karliss` correctly notes the output didn't actually resemble Qt, which strengthens the
point: the *constraint* did the work, not the reference.

---

# PART 2 — What elite current product UI actually does

## 2.0 First-hand measurements (M1), taken 2026-08-26

I could not screenshot in this environment, so I did something more useful: I read the
**computed styles of every element** on three live production pages and counted them.
These are raw facts, not impressions.

| Metric | **linear.app** (4,000 els) | **stripe.com** (2,521 els) | **brilliant.org** (962 els) | **our build** |
|---|---|---|---|---|
| Typeface families | 2 — Inter Variable, Berkeley Mono | **1** — sohne-var | 2 — CoFo Brilliant (bespoke), CoFo Robert | 3 — Georgia, Inter, mono |
| Font weights used | 400, 500, 510, 590, 300 — **max 590** | 300, 400, 500 — **max 500** | 400, 500, 600, 700 | 400, 500, 700, 750, 800, 850, **900** |
| Dominant body size | 16px (2,968 els) | 16px (2,316 els) | 16px (817 els) | 9px is the most-declared size (17 rules) |
| Smallest size present | 10px (27 els) | 11px (5 els) | 12px (15 els) | **6px** |
| `text-transform: uppercase` | **6 / 4,000** | **0 / 2,521** | **0 / 962** | **55 declarations** |
| 1px borders | 97 elements | 52 elements @ 0.667px | — | 81 declarations |
| Shadows | overwhelmingly `0 0 0 1px` rings + inset hairlines | **5 shadowed elements total** | — | 7 hard-offset + 4 ring recipes |
| Radius | scale of 2/4/6/8/9/12/16 + pill | scale of 1/2/3/4/5/6/8 | 1/2/17/20/24/44 + pill | effectively 0 (sharp) |
| Transition durations | **0.1s** (225 els), 0.16s, one 0.7s | — | — | 8 distinct: 180–900ms |
| Distinct easing curves | 2 | — | — | 3 |

Three findings dominate everything else here:

1. **Weight restraint is absolute.** Stripe's entire marketing site tops out at
   weight 500, and runs 274 elements at weight **300** — including 48px display
   headlines. S11 confirms: typography is "exclusively sohne-var at weight 300 — even
   at 56px display size — which reads as confident restraint rather than corporate
   shouting." None of the three uses 700+ as a workhorse. Our build uses 800/850 as
   its default label weight.
2. **All-caps is essentially extinct at the top of the market.** Two of three
   products have literally zero uppercase elements. This is the cleanest discriminator
   in the whole study.
3. **Nothing below 10px exists.** Not one element on Stripe, Linear or Brilliant is
   set below 10px, and even 10–11px is used on fewer than 1% of elements.

## 2.1 The fifteen principles

Each is stated as a rule an implementer can act on, with a named product as evidence.

**P1. Separate surfaces with a 1px hairline, not a shadow.**
Linear carries hierarchy on 97 hairline borders and near-zero blurred elevation; its
"shadows" are overwhelmingly `rgba(0,0,0,0.2) 0 0 0 1px` — a *ring*, i.e. a border
wearing a shadow's syntax (M1). S12 describes the principle directly: Linear "trusts
surface lift and hairline borders to carry every bit of hierarchy," using
`#23252a`/`#383b3f` rules instead of shadows. **Rule:** reach for `border: 1px` first;
a blurred shadow must justify a z-order claim.

**P2. Establish hierarchy with contrast and position, not containers.**
Stripe's whole homepage has **five** shadowed elements (M1). Depth comes from
background tint shifts (white → `#f8fafd` → `#e5edf5`), not boxes. **Rule:** before
adding a card, try changing the background tint one step and left-aligning to a
different grid column.

**P3. One typeface. Two at most, and the second must be mono for data.**
Stripe: one family site-wide. Linear: Inter Variable + Berkeley Mono for code (M1).
S11: "single typeface family… consistent across marketing, product, documentation."
**Rule:** a second *display* face needs a written reason; a mono face for numbers and
IDs needs none.

**P4. Cap your weight range at 500–600, and let size and colour do the work.**
Stripe uses 300/400/500 only; Linear tops out at 590 (M1). **Rule:** if a label needs
weight 800 to read as a label, the problem is its size or its colour, not its weight.

**P5. Tighten tracking as size grows; never track out small text as a substitute for hierarchy.**
S11 and S12 both document Stripe's aggressive negative tracking (−1.4px at 56px,
−0.96px at 48px) and Linear's `letter-spacing: -0.022em` at 48px and above.
**Rule:** positive letter-spacing above ~0.08em should appear at most once in a
system, on one label style — not as the house voice for all small text.

**P6. Spend colour on meaning, and almost nowhere else.**
Linear's 4,000 elements resolve to one near-white text colour (2,651 elements) and two
greys (426 + 279); its accent hues appear on 45, 22, 16 and 10 elements respectively
(M1). S11: "restrained palette — mostly neutrals plus one brand accent… colour serves
meaning, not decoration." Stripe grants one indigo (`#533afd`) the right to be a
button, a link, or an icon stroke, and nothing else. **Rule:** budget chromatic
colour at under 2% of painted elements.

**P7. Define semantics before values.**
S11: "semantic first — define meaning (danger = red, success = green, primary = brand)
before assigning values." **Rule:** every colour token's name should say what it means
(`--danger`), never what it looks like (`--red-2`), and every use should be an
instance of that meaning.

**P8. Every interactive element ships six states.**
S11 is unambiguous: default, hover, focus (keyboard), active (pressed), disabled,
loading. "Missing any state = incomplete element." Linear runs 225 elements on a
single 0.1s transition curve precisely so that these states feel like one system (M1).
**Rule:** a component is not done until `:active` and `:focus-visible` are styled.

**P9. Perceived-instant means ≤100ms; reserve long durations for spatial moves.**
Linear's dominant transition is exactly **0.1s** with a single easing curve
`cubic-bezier(0.25,0.46,0.45,0.94)`; one 0.7s `cubic-bezier(0.32,0.72,0,1)` is reserved
for a large spatial transition (M1). S11: "perceived fast = under 100ms," and "avoid
browser defaults for repeated transitions." **Rule:** two durations (fast state change,
slow spatial move) and one easing curve for each.

**P10. Motion must be a physical consequence of a state change.**
S11's test: dropdowns grow from their trigger; modals enter with weight. S2's test:
motion is "the exception, not the rule." **Rule:** if you can delete an animation and
lose no information about what changed, delete it.

**P11. Design the focus ring; never inherit it.**
S11: focus rings must be "designed, not browser-default, high-contrast, visible, on
every interactive element." Linear ships an explicit
`rgba(94,106,210,0.4) 0 0 0 3px` focus ring (M1). **Rule:** one ring token, applied via
`:focus-visible`, on everything focusable.

**P12. Loading and empty states are designed content, not stubs.**
S11: "loading skeletons match the layout being replaced (not generic spinners); empty
states specific and helpful, never generic placeholder text." **Rule:** every async
surface needs a skeleton that has the same silhouette as its loaded state.

**P13. Show the product, not an abstraction of it.**
Brilliant's homepage leads with interactive problem-solving surfaces; S2's fix for the
three-card grid is "show actual product over abstract icon-cards." **Rule:** replace
any icon-plus-caption card with the real artifact it describes.

**P14. Identity comes from one committed, non-obvious decision — usually the typeface.**
Brilliant commissioned a **bespoke typeface, CoFo Brilliant**, and uses it on 924 of
962 elements (M1). Stripe licensed Söhne; Vercel built Geist. None of them are using a
free default. **Rule:** the identity budget should be spent on one thing that cannot be
regenerated by a prompt, and that thing should appear on every screen.

**P15. Omit deliberately, and know what you omitted.**
S11's list of what these companies leave out: decorative typography, multiple display
fonts, colourful accent cards on dashboards, unmodified component-library defaults,
generic spinners, and pure `#000` on `#FFF`. Linear's summary via S12: "a single accent
colour, one negative-tracking display family, and four surface lifts." **Rule:** keep a
written "we do not do this" list; it is the other half of a design system.

---

# PART 3 — Education-product-specific design

## 3.1 Presenting a problem

The good ones give the problem the page. Brilliant's model, as its own positioning puts
it, is to teach "through interactive problem-solving, walking learners toward insight
through guided puzzles rather than explaining then testing." The design consequence is
that the problem statement is the largest, highest-contrast object on screen and the
chrome around it collapses. The bad ones frame the problem inside a card, inside a
lesson container, inside a course shell — three nested borders competing with the maths.

**Rule:** the problem should be the only thing at its contrast level on the screen.

## 3.2 Presenting a wrong answer

The literature is sharper here than the design blogs. S13 (Imran & Bulathwela, 2026)
introduces **"the correct answer trap"** — a failure at the *interpretation* step,
where a right answer is misread as understanding, so the system's confirmation is
"pedagogically harmful." Their framework distinguishes:

**Pedagogically sound feedback**
- identifies the *specific misconception* driving the reasoning
- addresses root causes rather than surface errors
- examines *how* the student arrived at the answer, not just *what* they chose
- uses the specific wrong option chosen as diagnostic evidence

**Harmful feedback**
- confirming a correct answer without examining reasoning
- generic praise that masks a conceptual gap
- anything that inadvertently validates a flawed mental model

Their four design recommendations translate almost directly into UI:

1. **Diagnosis transparency** — *name* the misconception on screen, in words, rather
   than issuing a vague correction. In UI terms: a labelled line of copy that states
   the wrong model the learner appears to hold.
2. **Reasoning focus** — surface the path, not the verdict.
3. **Constructive redirection** — the explanation must be targeted at the named
   misconception, not a replay of the lesson.
4. **Evidence-based intervention** — the wrong option chosen is the input to the
   diagnosis; show that link.

**What makes it feel respectful rather than punishing.** Three design moves, in order
of impact:

- **Attribute the error to a model, not to the person.** "The direct +a route was
  missing" is a statement about a graph. "You got this wrong" is a statement about a
  learner. The first is auditable; the second is a verdict.
- **Show the learner's own work as the subject of the diagnosis.** Quoting the actual
  answer ("you answered 36") makes the system's claim checkable, which converts
  criticism into evidence.
- **Never decorate the failure.** No red flash, no shake, no ✗ icon set. Colour-code
  the *route* that was missed, not the person who missed it. Punitive affordances are
  the visual layer of what S13 calls harmful feedback.

The patronising failure mode is the mirror image: over-cushioned copy ("Nice try!
Let's look at this together!"), which S13's framework implicates as *generic praise
masking a conceptual gap*. Respect is specificity.

## 3.3 Evidence of progress: does a "certificate" or "receipt" read as credible?

This is the sharpest question in the brief and the research answers it clearly.

The gamification meta-analyses agree that reward surfaces move the *wrong* motivation.
S14 (Kurnaz 2025, K-12 meta-analysis) finds gamification's effect larger on
**extrinsic** motivation (g = 0.713) than intrinsic (g = 0.638). S15 finds gamification
improves intrinsic motivation, autonomy and relatedness but has **minimal impact on
competency** — i.e. it moves how learning feels, not whether it happened. The standing
criticism is that points and badges "shift the focus of students to the rewards rather
than the learning process," and that motivation gains **decline over time**.

But S17 (Frontiers, 2024) is a genuine counterweight: digital badges there enhanced
learners' intrinsic motivation across all five dimensions with minimal extrinsic
effect — from which the honest conclusion is that **badge design, not badges,
determines the outcome.**

Synthesising with S13 and S16, the discriminator is **whether the artifact makes a
claim it can substantiate**:

| Reads as gamified fluff | Reads as credible evidence |
|---|---|
| Claims mastery, competence, or a level | Claims a specific observed event |
| Scope is the product ("Calculus: Complete") | Scope is the session ("in this session") |
| Awarded for participation or time | Awarded for a transfer task the learner had not seen |
| Ornamental — ribbon, seal, trophy, confetti | Documentary — numbered lines, a sequence, a timestamp |
| Silent about what it does *not* prove | States its own limits explicitly |
| Uses celebratory colour and motion | Uses the same type and rules as the rest of the product |

**The single highest-value move** — and the one our build already makes — is to print
the boundary of the claim on the artifact itself. A surface that says "this does not
prove permanent mastery" is doing what S13 asks for at the level of the whole product:
refusing to let a correct answer be misread as understanding. It converts the
artifact's genre from *trophy* to *receipt*, and a receipt is credible precisely
because it is narrow.

**Design consequence:** an evidence surface should be typeset like a document, not
like an award. Same typeface as the rest of the product, no seal, no metallic
gradient, no confetti, numbered lines, and at least one line that limits the claim.

---

# PART 4 — THE ANTI-SLOP CHECKLIST

40 binary rules. Each is checkable against a stylesheet or a screenshot with no
judgement call. Rationale in the trailing clause.

### Colour

1. **No `indigo`/`violet`/`purple`/`fuchsia` utility class, and no hex in {`#6366f1`, `#7c3aed`, `#8b5cf6`, `#a855f7`}, appears anywhere** — this is the single loudest 2026 tell (S6).
2. **Fewer than 5 distinct chromatic hue families exist in the token set** (neutrals excluded) — elite products budget one to three; more means colour has stopped meaning anything (P6).
3. **Zero raw hex or `rgba()` literals appear outside the token declaration block** — untokenised colour is proof that no palette governs the file.
4. **No two neutral tokens differ by less than 8 in every RGB channel** — near-duplicate greys are the fingerprint of colour chosen ad hoc per component.
5. **Marketing and product surfaces resolve the same accent tokens** — two palettes in one product means the brand was decided twice.
6. **Every text colour meets 4.5:1 against the background it is actually painted on** — the real defect inside "generated" themes is contrast failure (S1 #6).
7. **No `background-clip: text` / `text-transparent` gradient text anywhere** — gradient type destroys the contrast consistency type exists to provide (S2 #3).
8. **No gradient in the stylesheet interpolates between two different hues** — single-hue alpha fades are texture; two-hue fades are the AI signature (S2, S6).
9. **Chromatic (non-neutral) colour is applied to under 5% of painted elements in any screenshot** — Linear runs ~2% (M1).

### Typography

10. **No `font-size` below 11px anywhere in the stylesheet** — nothing on Stripe, Linear or Brilliant is set below 10px (M1); sub-10px type is unreadable, not dense.
11. **Fewer than 9 distinct static `font-size` values exist** (fluid `clamp()` display sizes excluded) — a scale is a decision made once.
12. **Four or fewer distinct `font-weight` values are used** — Stripe uses three (M1).
13. **The heaviest weight in use is ≤ 700** — Stripe caps at 500, Linear at 590 (M1); 800+ is shouting to create hierarchy that size and colour should create (P4).
14. **`text-transform: uppercase` appears in fewer than 8 rules** — Stripe and Brilliant use zero across 3,483 measured elements (M1); it is the most discriminating single metric found.
15. **Three or fewer distinct positive `letter-spacing` values exist** — tracked-out small caps is one label style, not a house voice (P5).
16. **At most two typeface families are loaded, plus one mono** — S11; a third face needs a written reason.
17. **No single headline construction (e.g. "roman line + italic accent word") is used more than twice in the product** — repetition converts a device into a tic, and this exact device is S1 pattern #3.
18. **Body copy is set at 15px or larger** — 16px is the measured default at all three reference products (M1).

### Shape and containment

19. **Three or fewer distinct non-circular `border-radius` values exist** — uniform maximal rounding means radius carries no information (T5).
20. **Two or fewer distinct `box-shadow` recipes exist** (a recipe = offset + blur + spread, ignoring colour) — more than two means elevation is decorative.
21. **No rule sets a `border`, a `box-shadow`, and a `background` on the same element** — triple containment is one boundary drawn three times.
22. **No visible container is nested inside more than one other visible container** — three nested borders is card soup by definition (T4).
23. **At least half of all surface separations are 1px rules rather than filled or shadowed boxes** — Linear carries hierarchy on 97 hairlines (P1).
24. **No `backdrop-filter: blur()` is applied to a surface containing body text** — blur behind reading text is a legibility defect; blur elsewhere is *not* a tell (S2 clears glassmorphism at 0.2%).

### Layout

25. **No more than one grid of three-or-more equal-weight sibling items appears per page** — the three-up grid asserts a parity that is almost never true (T4).
26. **No region wider than 240px is empty for more than 400px of continuous vertical run** — unrhythmic voids, not quantity of whitespace, are the actual failure (§1.2).
27. **The first viewport contains at least one piece of real product data** (a number, a diagram, a rendered artifact) — abstraction in the hero is the template signature (P13).
28. **Every numeric figure on screen is computed at runtime; zero hardcoded stat values** — a hardcoded stat is a lie-shaped component (T12).
29. **No block of body text longer than two lines is centre-aligned** — centred running text is the "centred everything" tell (S2 #11).
30. **All spacing values in the stylesheet are multiples of a single base unit** — arbitrary padding proves no scale exists (T8).

### Motion and state

31. **At most one `animation: … infinite` exists, and it indicates live status** — ambient perpetual motion is decoration (T9).
32. **Every interactive selector defines `:hover`, `:focus-visible`, `:active`, and a disabled state** — S11: "missing any state = incomplete element" (P8).
33. **All `transition-duration` values are drawn from a set of three or fewer** — Linear runs 225 elements on one 0.1s curve (P9).
34. **Two or fewer distinct easing curves are used** — M1.
35. **`prefers-reduced-motion: reduce` is honoured globally** — S2's non-negotiable.
36. **Named CSS classes exist for loading, empty, and error states** — these must be designed, not stubbed (P12).

### Icon, copy, and claims

37. **Zero emoji appear as UI iconography, and no "✨" appears anywhere** — emoji-as-icon means no icon set was chosen (T10).
38. **Zero occurrences of {Transform, Unlock, Supercharge, Unleash, Empower, Seamless, Effortless, Revolutionize} in product-surface copy** — interchangeable copy proves the writer did not know the product (T13, S4).
39. **Every badge or pill on screen encodes a machine-observable state, not a decoration** — badges above headlines are S1 pattern #10.
40. **No surface claims mastery, competence, or achievement beyond what the session can evidence, and any evidence surface states its own limits** — the credibility discriminator from §3.3 (S13, S14).

---

# PART 5 — Scoring the current build

**Artifacts scored:** `docs/screenshots/01-webmcp-agent-lesson.png`,
`02-diagnosis-mathos-video.png`, `03-evidence-receipt.png`,
`04-trained-transformer.png`; `src/components/learning-studio.css` (2,001 lines),
`src/styles/landing.css` (953 lines), `src/styles/global.css` (68 lines).

## 5.0 Headline verdict

**This is not stereotypical AI slop, and it should not be scored as if it were.**
It passes 19 of 40 rules, and it passes the ones that are hardest to fake: the layout
grammar is editorial rather than templated, the corners are sharp, hierarchy is carried
on 81 hairline rules, every number on screen is computed from real training data, there
are no emoji, no gradient text, no purple, no marketing verbs, and the evidence surface
explicitly limits its own claim. Screenshot 04 in particular — a real loss curve, real
pre/post model samples, a real causal-mask attention heatmap — is the strongest
anti-slop evidence in the build, because it shows the product instead of describing it
(P13, rule 27).

**Its failures are almost entirely in one place: the type system.** The build has
built a house voice out of 6–9px, weight-850, uppercase, wide-tracked micro-labels, and
then applied it 55 times. Measured against the three reference products this is the
most conspicuous non-standard choice in the build (M1: Stripe 0 uppercase / 2,521
elements; nothing anywhere below 10px). A judge will not think "AI generated" — they
will think "I can't read this," which on a hackathon projector is worse.

The second cluster of failures is **token discipline**: 21 raw hex values and 40+
`rgba()` literals bypass the palette, including ten near-identical greys and a
completely off-palette lime `#d8ee6e`, and `landing.css` defines a *second, different*
brand palette from `global.css`.

## 5.1 Item-by-item

| # | Rule | Verdict | Evidence |
|---|---|---|---|
| 1 | No AI purple | **PASS** | Zero indigo/violet/purple hex or class in any stylesheet. |
| 2 | < 5 chromatic hue families | **FAIL** | Six: `--orange #c85d31`, `--blue #3e6f9d`, `--green #3f795f`, `--red #9f3f32`, plus `--landing-blue #315ac6`, `--landing-orange #c4572d`, `--landing-acid #d8ee6e`. |
| 3 | No raw colour literals outside tokens | **FAIL** | 21 raw hex + 40+ `rgba()` literals in rules. Examples: `learning-studio.css:133 #99978f`, `:346 #9b998f`, `:688 #96948b`, `:1264 #a8aaa2`, `:1637 #939188`, `landing.css:433 #9b9b91`. |
| 4 | No near-duplicate neutrals | **FAIL** | `#99978f`, `#9b998f`, `#9b9b91`, `#96948b`, `#939188` are five greys inside a 5-unit envelope; also `#777971`/`#74756f`/`#73756e` and `#62645f`/`#60625c`/`#5d5f59`. |
| 5 | One palette across surfaces | **FAIL** | `landing.css:4-6` redefines the brand: `--landing-blue #315ac6` vs `--blue #3e6f9d`; `--landing-orange #c4572d` vs `--orange #c85d31`; plus `--landing-acid #d8ee6e`, a lime that exists nowhere in the studio. The landing page and the app are visibly different brands. |
| 6 | 4.5:1 text contrast | **FAIL** | `#9b9b91` on `--cream #f3efe5` computes to **2.44:1**; `#a8aaa2` is worse. `--muted #686960` on cream is **4.84:1** — passes AA numerically, but it is applied to 7–9px tracked uppercase, where it is functionally illegible. |
| 7 | No gradient text | **PASS** | No `background-clip: text` anywhere. |
| 8 | No two-hue gradients | **PASS** | All four gradients are single-hue alpha fades or 1px repeating rules: `rgba(220,232,223,0.45)→transparent`, `rgba(23,27,25,0.02)` scanline, `rgba(255,255,255,0.78)→transparent` radial. Texture, not decoration. |
| 9 | Chromatic colour < 5% of elements | **PASS** | Screenshots 01/03 are overwhelmingly ink-on-cream; colour appears only on the two derivative routes, status dots and one CTA. Exemplary use of P6. |
| 10 | No font-size < 11px | **FAIL — most severe item in the audit** | 38 declarations at ≤9px, including `learning-studio.css:1841 font-size: 6px` and 7px at `:161, :666, :689, :762, :1724, :1846` and `landing.css:243, :342, :671, :858`. Visible as the pathway rail sub-labels ("CALCULUS", "BACKPROPAGATION") and every micro-caption in 01/03. |
| 11 | < 9 distinct static sizes | **FAIL** | 14 static values (6,7,8,9,10,11,12,13,14,18,22,34,52,112) + 4 `clamp()` displays. |
| 12 | ≤ 4 font-weights | **FAIL** | Seven: 400, 500, 700, 750, 800, 850, 900. |
| 13 | Heaviest weight ≤ 700 | **FAIL** | 21 declarations at 800, 12 at 850, one at 900 — applied to 9px Inter, where the extra weight is what makes it look smudged rather than emphatic. |
| 14 | Uppercase in < 8 rules | **FAIL — most discriminating item** | **55 declarations** (41 in `learning-studio.css`, 14 in `landing.css`). Reference: Linear 6/4,000 elements, Stripe 0/2,521, Brilliant 0/962 (M1). |
| 15 | ≤ 3 positive letter-spacing values | **FAIL** | Ten distinct positive values (0.06, 0.08, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.18em) plus `1px` and `0.7px` — 12 in total, versus 8 negative tracking values. The tracking is unsystematised. |
| 16 | ≤ 2 families + mono | **PASS** | Georgia (serif display), Inter (sans), SFMono stack. Note: Georgia is a genuinely good anti-slop choice — it is on none of S1's or S2's flagged serif lists. |
| 17 | No headline construction used > 2× | **FAIL** | The "roman line + green/orange serif italic accent" construction appears at least five times: "the result *twice.*" (01), "*not a trophy.*" (03), "*a trace.*" (04), "*Just logits.*" (04), "*attention goes.*" (04). Three of them stack in one scroll. This is precisely S1 pattern #3, and repetition has turned a signature into a tic. |
| 18 | Body copy ≥ 15px | **PASS** (marginal) | Lesson body reads at a comfortable measure in 01/03/04; the failure is confined to labels, not prose. |
| 19 | ≤ 3 radius values | **PASS — strongly** | Effectively zero: six `50%` (dots), one `0`, and one 28px landing shape. Sharp corners are the build's clearest deliberate rejection of T5, and they read as chosen. |
| 20 | ≤ 2 shadow recipes | **FAIL** | Eleven: hard offsets at `5px 5px 0`, `7px 7px 0`, `8px 8px 0`, `12px 12px 0` across three colours (`--green-soft`, `--blue-soft`, `--orange-soft`), plus four ring shadows at 4px and 5px spread. The hard-offset device is a legitimate editorial choice; the *four different offsets* are not — the offset should encode something and currently encodes nothing. |
| 21 | No border + shadow + background together | **FAIL** | 6 rules in `learning-studio.css` set all three. Visible on the receipt panel (03) and video panel (02), which are simultaneously bordered, offset-shadowed and tinted. |
| 22 | Container nesting ≤ 2 | **FAIL** | Screenshot 02: studio shell → video panel (bordered + shadowed) → inner white stage → caption box → CTA box. Four levels. |
| 23 | ≥ 50% hairline separations | **PASS — strongly** | 81 one-pixel border declarations against 14 card-named selectors; border colours are 42× `var(--rule)` and 13× `var(--ink)`. This is textbook P1 and the best structural decision in the build. |
| 24 | No blur behind body text | **PASS** | One `backdrop-filter: blur(12px)` in `landing.css`, on the sticky nav only. |
| 25 | ≤ 1 three-up equal grid per page | **PASS** | 02's "VERIFYING / WRITING / OPENING" row is a genuine three-stage pipeline state, and 04's "INITIAL / CURRENT / CHANGE" is a real measurement triple. Neither is a feature grid. |
| 26 | No 240×400px empty region | **FAIL** | Screenshot 02: roughly 380px of empty white inside the video stage between the bullet list and the caption rule; both side rails are empty for the full viewport. Screenshot 04, section 04: the left column ends after three lines of body copy and leaves ~600px of dead space beside the heatmap. Screenshot 03: the right rail is empty below "Session Activity" for over half the viewport. |
| 27 | Real data in first viewport | **PASS — strongly** | 01 opens on a real computation graph with real contributions (36 + 4 = 40); 04 opens on a real loss curve. |
| 28 | No hardcoded stats | **PASS — strongly** | `3.2807 / 1.3865 / −1.8942` are computed from the actual training run, as are the pre/post samples and the attention matrix. This is the inverse of T12 and is a genuine differentiator. |
| 29 | No centred body text | **PASS** | All running prose is left-aligned; the only centred text is inside the Remotion video frame, where it is a title card. |
| 30 | Spacing on one base unit | **FAIL** | Padding values include 28, 30, 24, 20, 15, 16, 9, 12 — 15px and 9px break any 4px grid. |
| 31 | ≤ 1 infinite animation | **FAIL** | Two: `lab-pulse 1.2s ease-in-out infinite` (legitimate — live training status) and `route-flow 9s linear infinite` (ambient decoration on the diagram). The second is T9. |
| 32 | Six interaction states | **FAIL** | `:active` appears **zero** times across both stylesheets; `:focus-visible` appears once (plus the global rule); `:hover` 12 times; `:disabled` 3 times. Per S11 every component in the build is incomplete. |
| 33 | ≤ 3 transition durations | **FAIL** | Eight: 180, 260, 300, 420, 450, 500, 650, 900ms. |
| 34 | ≤ 2 easing curves | **FAIL** (marginal) | Three: `ease`, `cubic-bezier(0.2,0.72,0.2,1)`, `cubic-bezier(0.2,0.75,0.2,1)` — the last two differ by 0.03 and are indistinguishable, which means one of them is unintentional. |
| 35 | Reduced motion honoured | **PASS** | `global.css` has a complete `prefers-reduced-motion` block covering animation, transition and scroll-behavior. |
| 36 | Loading/empty/error classes | **PASS** | `.empty-activity`, `.lab-error`, `.loading`, `.tools-fallback` all exist as designed states — including a graceful degradation path when agent tools are unavailable. |
| 37 | No emoji / no ✨ | **PASS — strongly** | A Unicode scan of `src/` returned zero emoji, dingbats or sparkles. |
| 38 | No marketing verbs | **PASS — strongly** | No Transform/Unlock/Supercharge/Unleash/Empower/Seamless in any surface. The copy is declarative and specific ("The direct +a route was missing", "Learning is not a staircase"). |
| 39 | Badges encode machine state | **PASS** | "REPAIR IN PROGRESS", "EVIDENCE ISSUED", "TRANSFER PASSED", "5 AGENT TOOLS LIVE" all reflect observable system state. |
| 40 | No unevidenced mastery claim | **PASS — exemplary** | Screenshot 03 line 03 reads "This receipt does not prove permanent mastery," the right rail states "The evidence is real and narrow: success on one fresh problem in this session," and the footer reads "Nothing here claims more than this session observed." This is the §3.3 credibility discriminator executed better than most shipping education products. |

**Score: 19 PASS / 21 FAIL.**

## 5.2 The T16 question, answered honestly

Our palette hits **two of S2's three "tasteful default" signals**: a cream page
(`#f3efe5` / `#faf7ef`, squarely in the `#faf8f5` / `#f5f1e8` family) and a
forest-green accent (`#3f795f`). By S2's own threshold — "any two of these three
signals reach for defaults" — this build would be flagged.

Three things save it, and all three should be made louder rather than defended:

1. The serif is **Georgia**, not Instrument Serif, Fraunces, Playfair or Spectral.
   None of S1's or S2's flagged faces appear.
2. The **dominant** accent is terracotta `#c85d31`, not green; green is a secondary
   semantic (the "found path", "passed"). Screenshot 01 is orange-led.
3. The **corners are sharp and the shadows are hard-offset**, which is the opposite of
   the soft, generously-rounded surfaces the tasteful-default aesthetic ships with.

The recommendation is therefore *not* to abandon the cream. It is to spend the
remaining hours making the non-default half of the identity unmistakable — which,
per P14, means committing harder to Georgia and the terracotta, and fixing the type
system so the editorial voice reads as craft rather than as a theme.

## 5.3 Top 10 fixes, ranked by judge-visible impact per hour

1. **Raise the type floor to 11px** (rule 10). One find-and-replace across 38
   declarations. Nothing else in this list changes the screenshots as much.
2. **Cut uppercase from 55 rules to under 8** (rule 14). Keep it for the wordmark and
   one label style; convert the rest to sentence case in `--muted`. This is the single
   most discriminating metric against real products.
3. **Cap font-weight at 700** (rules 12–13). Replace 750/800/850/900 with 500/700.
   At 11px, weight 500 in `--ink` is more legible *and* more expensive-looking than
   weight 850 in `--muted`.
4. **Delete the second palette** (rules 2, 5). Make `landing.css` consume the
   `global.css` tokens; drop `--landing-acid` entirely.
5. **Tokenise the 21 raw hex greys** (rules 3, 4, 6) — collapse them onto `--muted`
   and one new `--muted-2`, which also fixes the 2.44:1 contrast failures.
6. **Collapse the shadow offsets to one value** (rule 20). Pick `6px 6px 0` and use
   colour, not distance, to distinguish the three panel types.
7. **Add `:active` and `:focus-visible` to every interactive selector** (rule 32).
   Currently zero `:active` states exist; this is the cheapest "this is a real product"
   signal there is.
8. **Vary the italic-accent headline construction** (rule 17). Change at least three of
   the five instances — especially the three that stack in screenshot 04 — so the
   device stays a signature instead of becoming the layout's only idea.
9. **Close the voids in screenshots 02 and 04** (rule 26). The video stage needs its
   vertical space reduced; section 04's left column needs the heatmap legend or the
   axis explanation moved into it.
10. **Reduce to three transition durations and one easing curve** (rules 33–34), and
    delete `route-flow 9s infinite` (rule 31) — ambient perpetual motion on the
    diagram is the only genuine T9 violation in the build.

Fixes 1–3 are the same file, roughly the same edit, and together they move 6 of the 21
failures. If only one hour is available, spend it there.
