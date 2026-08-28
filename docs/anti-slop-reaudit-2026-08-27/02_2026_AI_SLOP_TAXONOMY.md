# 2026 AI-slop taxonomy

This taxonomy describes design risks, not AI authorship. Confidence concerns the proposed mechanism and audit usefulness. “Current result” describes the baseline captured on 2026-08-27.

| Risk family | Observable cluster | Mechanism | Evidence / confidence | False-positive control | Mathos baseline |
|---|---|---|---|---|---|
| Ecosystem-default leakage | Unmodified shadcn/Base Nova token scaffold, standard card/sidebar/popover anatomy, default Lucide presentation, stock Tailwind recipes | Generators optimize for known, composable, accessible defaults | Official ecosystem propagation path + community lexical signal; **medium-high** | Component library use is good engineering; flag only a multi-trait untouched fingerprint | **Pass:** no shadcn, Radix, Lucide, Base Nova, OKLCH neutral scaffold, 0.625rem radius, or stock utility recipe cluster found |
| First-wave “AI cool” bundle | Purple/blue gradients, dark neon, radial glows, glass, gradient text, floating orbs | A high-probability visual shorthand for “futuristic AI” | Community and detector agreement; **medium** | A legitimate brand or data-viz system can use any trait; require a cluster and context failure | **Pass** |
| Canned SaaS composition | Centered slogan hero, three equal feature cards, stat strip, pricing tiers, FAQ, generic CTA | Template fills information architecture before product intent is known | Reproducible lexical data + detector catalogues; **medium** | Equal-weight content may warrant equal cards | **Mixed:** asymmetric hero, but generic three-column explanatory row remains |
| Card and badge grammar | Nested cards, same radius everywhere, border+shadow redundancy, pills for ordinary nouns | Components manufacture hierarchy instead of content/state | Detector rules + source heuristics; **medium-high** | Semantic containment and compact machine status remain valid | **Medium risk:** limited cards, but numerous outlined status pills/tags make the work resemble a status dashboard |
| Decorative motion | Looping attention motion, universal hover travel/scale, `transition: all`, no pause/reduced-motion path | Motion is added for perceived polish without causal meaning | MotionSpec shipped-app scan + WCAG; **high for accessibility, medium for style** | State transition and spatial continuity may need motion | **Low risk:** no transition-all, reduced-motion path exists; small arrow nudges and button scale are conventional but bounded |
| Generic copy rhythm | “Unlock/transform/seamless,” symmetrical slogans, “not X, but Y,” unsupported superlatives, em-dash cadence everywhere | Probabilistic copy completes familiar marketing forms | Practitioner/community; **medium-low** | Plain contrast can be concise and legitimate; punctuation is never a defect alone | **Medium risk:** concrete mechanism copy is strong, but the giant “agent cannot / only page can” aphorism is now a familiar oppositional hero device |
| Placeholder proof | Fake metrics, invented testimonials, terminal screenshots, diagrams or evidence widgets with no durable state | Visual credibility substitutes for an inspectable mechanism | Practitioner catalogues; **high when facts are fake** | Real product output and properly bounded evidence are desirable | **Pass on truth; style risk:** proof ledger is real, but the landing makes it resemble a fashionable credibility exhibit |
| Architecture leakage | Raw tool names, JSON, revision IDs, schemas, implementation terms in learner UI | Builder exposes what it can easily serialize rather than what users need | Product inspection; **high** | A deliberate judge/developer inspector may expose exact contracts | **Low-medium:** raw details are collapsed, but Page Capability remains persistent and visually senior |
| Accessibility simulation | ARIA attributes without meaningful names, color-only status, unlabeled repeated actions, syntax-only compliance | Generated code learns markup patterns without contextual semantics | CHI EA/ASSETS studies; **high** | Automation is necessary; pair it with tree, keyboard, and state testing | **Low observed:** names, MathML, live regions, keyboard targets, and text redundancy are strong; AT-user testing remains absent |
| Frictionless machine takeover | Instant finished answer, auto-applied proposal, hidden assumptions, no learner commitment | Polished output reduces inferential distance, verification, and ownership | HCI experiments and math field RCT; **high** | Friction must be targeted and accessible, not punitive | **Pass / core strength:** learner attempt gate, explicit proposal acceptance, deterministic checker, and transfer round |
| Homogenized intent | Design works for any SaaS product after replacing nouns | Underspecified intent is filled by training/ecosystem priors | Academic risk framework + creative/writing experiments; **medium-high mechanism, low direct visual prevalence** | Consistency with an intentional design system is not homogenization | **Mixed:** mathematical interactions are specific; the editorial shell is portable |
| Second-order warm editorial default | Cream/paper, high-contrast serif or severe sans, terracotta/rust, hairlines, sparse shadow, “human” warmth | Anti-purple prompts now converge on a new tasteful bundle | Current Anthropic guidance and Kill AI Slop catalogue; **medium** | Any trait can be culturally or materially appropriate; ask what content fact it expresses | **High cluster risk:** paper, rust, hairlines, and sparse elevation co-occur; no serif, but the ensemble is close |
| Second-order broadsheet default | Zero/low radius, dense newspaper columns, tracked-caps section labels, rules as universal separators | “Editorial” becomes the next context-free escape hatch | Current Anthropic guidance; **medium** | A document or evidence-heavy product may legitimately use editorial grammar | **High:** ten kicker occurrences, repeated section rules, dense two-column proof/rail layout, and frozen Sarsa rationale |
| Second-order audit theatre | Permanent activity ledger, provenance rail, evidence receipt, faux issue numbers, “system status” everywhere | Anti-slop advice itself becomes decorative institutional seriousness | Current rendered comparison + Anthropic structural-truth rule; **medium-high locally** | Durable state, actor attribution, and limitations can be essential | **Medium-high:** evidence is real, but duplicated permanent chrome overstates it and competes with learner work |
| Second-order anti-minimalism | Arbitrary asymmetry, brutalist geometry, terminal/monospace, novelty for novelty’s sake | Models obey “don’t look generic” by selecting a different recognizable style pack | Practitioner catalogues and community reaction; **medium-low** | Strong asymmetry or monospace may serve real information | **Low:** monospace is reserved mostly for math/source, but the redesign must avoid a black terminal or diagram spectacle |
| Responsive context separation | Supporting evidence drops far from the object it explains, desktop rail simply stacks at the bottom | Desktop composition is collapsed mechanically rather than re-authored | Rendered baseline; **high locally** | Secondary global history may reasonably follow the main work | **High on mobile:** capability/activity content becomes remote from the derivation and creates a large context gap |
| Polished false confidence | Attractive tool-like output visually implies correctness, mastery, or completeness | Presentation increases trust faster than evidence warrants | Generative Interfaces warning + AI-overreliance studies; **medium-high** | Polish and structure can improve performance; pair with limits and independent checks | **Low-medium:** receipt limitations are explicit, but labels like “proof” and green machine states require continued discipline |

## Ensemble tests

### Current first-wave defaults

- Purple/gradient/glass/neon bundle: **not present**.
- Default shadcn/Tailwind component bundle: **not present**.
- Generic centered hero/card/pricing/testimonial bundle: **partially present only in the three-column explanation pattern**.

### Current second-order defaults

- Warm editorial: paper + rust + hairlines + no shadow: **present as a cluster**.
- Broadsheet: tracked caps + universal rules + dense columns: **present as a cluster**.
- Audit theatre: persistent capability rail + activity ledger + evidence surface: **present, although each item contains real state**.
- Anti-minimalist terminal/brutalist spectacle: **not present**.

## Operational rules for the redesign

1. Make mathematical state—not section furniture—the main layout generator.
2. Keep evidence adjacent to the exact line or action it explains.
3. Display actor/provenance when it changes trust or consent, not as ambient dashboard decoration.
4. Preserve learner commitment and explicit proposal resolution.
5. Use color for truth, break, provenance, proposal, focus, and acceptance only.
6. Replace ornamental pills with plain relation/status language where possible.
7. Keep a global activity history available, but subordinate and on demand.
8. Let the landing page demonstrate a real transaction rather than describe a design philosophy.
9. Prefer contract-relative drift and state-completeness checks over universal style bans.
10. Treat medium-confidence taste judgments as risks to review, never as binary defects.

