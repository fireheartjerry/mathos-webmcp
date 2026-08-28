# Canonical design contract — Proof Margin

Approved: **2026-08-27**  
Status: frozen for implementation. Changes require a documented state, accessibility, or verification reason.

## Product, audience, and page job

Second Try is a bounded Mathos learning experiment for a learner who can begin a calculus derivation but may not know where it first stopped being true. The learner writes the mathematics. The browser checks equivalence. A WebMCP agent may inspect, annotate, and propose, but cannot manufacture the page verdict or silently replace learner work.

The landing page must make that mechanism understandable in under ten seconds. The scratchpad must make the first invalid relation, its explanation, the actor responsible for any intervention, and the next learner action unambiguous.

## Visual thesis

**The derivation is the interface.**

The page is organized by mathematical claims and their relations, not by generic cards, editorial sections, or a permanent agent dashboard. Every secondary visual element must attach to one of four product facts:

1. what the learner wrote;
2. what relation the page checked;
3. what an agent or inspector proposed;
4. what the learner accepted, rejected, or proved unaided.

## Product signature

A **line-local mathematical margin with an independently checkable relation spine**.

On wide screens, each derivation row aligns line number, expression, relation state, and evidence. The narrow relation spine connects the chain without pretending it is a formal proof. Notes and proposals occupy the margin beside the exact line they qualify. On narrow screens, that margin becomes an immediate expansion beneath the same expression—not a distant global rail.

The signature improves comprehension, provenance, proposal consent, and responsive continuity. It is not decoration.

## Information architecture

### Landing

1. Compact Mathos/Second Try header.
2. A live derivation transaction in the first viewport:
   - learner line;
   - browser verdict contradiction;
   - agent proposal;
   - explicit learner choice.
3. One concise mechanism explanation.
4. Browser-native/WebMCP boundary and falsifiability demonstration.
5. Bounded claims and supported math scope.
6. Primary path into the scratchpad.

No generic three-column feature row, stat strip, testimonial wall, pricing anatomy, terminal theater, or “design manifesto” section.

### Scratchpad

1. Document header: product, round, compact connection state.
2. Problem statement and premises.
3. Derivation document with line-local relation and evidence.
4. Composer and work actions.
5. Refusal, conflict, loading, and transfer evidence in the document flow.
6. A subordinate “Session details” disclosure containing exact tools, local inspector, and chronological activity.

## Typography roles and reasons

- **Archivo:** all prose and controls. It is an existing Mathos identity asset, works at dense application sizes, and avoids importing a fashionable display/sans pairing.
- **KaTeX:** mathematical notation only. The serif forms are domain glyphs, not decorative contrast typography.
- **Fira Code:** exact tool names, JSON, request data, and raw fallback math only. It must never become the product’s general “technical” personality.
- **Display hierarchy:** created by scale, weight, measure, and placement—not tracked uppercase labels.
- **Labels:** sentence case. Uppercase is reserved for unavoidable mathematical notation, never section furniture.

## Palette roles and reasons

- **Canvas:** cool-neutral near-white, chosen to recede behind notation rather than mimic paper.
- **Ink:** near-black for learner content and highest-trust prose.
- **Mathos blue:** identity, primary action, learner focus, and current target.
- **Verified green:** only an independent page-engine pass.
- **Break rust:** only the first relation that fails or a destructive recovery warning.
- **Proposal indigo/graphite:** unaccepted agent or inspector suggestion; deliberately distinct from verified green.
- **Muted graphite:** downstream/unresolved context.

No decorative gradients, warm-cream/terracotta ensemble, purple AI identity, neon, glow, glass, or rainbow status system.

## Spacing and rhythm

- Base unit: 4px.
- Dense mathematical rows use 8/12/16px internal rhythm.
- Major document transitions use 32/48/64px, not 96–160px editorial section gaps.
- Vertical rhythm follows proof lines and evidence adjacency. A divider may appear only where a real document boundary or relation exists.
- Long empty zones are defects unless they preserve writing space that is immediately usable.

## Geometry and containment

- Default radius: 0–6px. Inputs and primary buttons may use 6px for touch/affordance comfort.
- No pills for ordinary statuses. Connection state may use a dot plus text without a capsule.
- A container is earned by interaction ownership: editable expression, pending proposal, refusal/recovery, raw inspector output.
- Hairlines are not a universal rhythm device. Relation strokes, field boundaries, and disclosure separators are allowed because they encode structure.
- Shadows are absent except if a future overlay truly occupies a higher interaction layer.

## Hierarchy

1. Mathematical problem and learner expressions.
2. First-break relation and actionable explanation.
3. Current composer or explicit proposal decision.
4. Page/agent provenance and state history.
5. Exact WebMCP schemas and local-inspector output.

Judge verification must remain available without outranking learner work.

## State language and colors

| State | Visible language | Color role | Required redundancy |
|---|---|---|---|
| Unchecked | “Not checked” | graphite | text + open relation mark |
| Follows | actual relation such as “differentiates” | verified green | text + filled relation mark |
| First break | “Does not follow” plus mathematical difference/counterexample | rust | text + break mark + local explanation |
| Downstream | “After the first break” | muted graphite | text + reduced emphasis, never hidden |
| Uncertain/unreadable | “Could not determine/read” and recovery | warning ochre | text + alert semantics |
| Agent note | “Agent note” | proposal indigo | actor text + line-local placement |
| Inspector note | “Local inspection” | graphite/ochre | actor text + line-local placement |
| Proposal | “Proposed replacement—not applied” | proposal indigo | source + pending state + accept/reject controls |
| Transfer | “Unaided problem” | Mathos blue | lock explanation + tool policy |
| Verified transfer | “Immediate transfer signal” | verified green | observed facts + equally weighted limitations |

## Icon and illustration rules

- No generic icon library is needed for the core experience.
- Relation marks, arrows, and mathematical operators are text/CSS semantics, not decorative icons.
- The landing demonstration is the illustration.
- Never generate an abstract AI orb, sparkle, robot, terminal, or fake graph as brand art.

## Interaction states

Every control requires default, hover, active, focus-visible, disabled, and in-progress behavior where applicable.

- Focus must remain visible and unobscured at 320 CSS px and 400% zoom.
- Line selection must return focus after save/cancel.
- Tool-caused focus may highlight/scroll to the exact line, with reduced-motion fallback.
- Proposals never auto-apply.
- Successful actions clear stale refusals.
- Loading, conflict, invalid input, policy refusal, partial registration, and no-WebMCP states remain actionable.
- Session details use a native disclosure with correct name and expanded state.

## Motion

- Motion shows causality only: focus arriving on a line, a proposal appearing beside it, or a new transfer problem replacing the old obligation.
- No entrance choreography, ambient loops, hover scale, scroll spectacle, or animated arrows.
- Default duration 120–220ms; no `transition: all`.
- Reduced motion collapses transitions and replaces smooth scroll with immediate positioning.

## Responsive transformations

- ≥1080px: expression column + 240–300px line-local evidence margin.
- 720–1079px: narrower evidence margin; global session details move below actions.
- <720px: each line becomes expression → relation text → local evidence → remove/edit affordance; no evidence is separated from its line.
- 320 CSS px / 400%: page-level horizontal scrolling is forbidden. Long mathematical expressions may scroll inside their own labelled region.
- Touch targets: 44px preferred; never below WCAG 24px spacing rules.

## Copy register

- Concrete, calm, bounded, and actor-specific.
- Use “page engine,” “learner,” “agent,” and “local inspector” only when the distinction changes trust.
- Prefer “Line 2 does not follow” over “Something went wrong.”
- Prefer “Proposed replacement—not applied” over “AI suggestion.”
- Do not use “unlock,” “transform,” “seamless,” “revolutionary,” mastery claims, fake certainty, or repeated “not X, but Y” slogans.
- Claims about transfer always state session scope and what was not established.

## Accessibility constraints

- Preserve semantic heading order, form labels, MathML, live status, alerts, and disclosure behavior.
- Visual row order must match DOM/reading order: line number → expression → relation → explanation/provenance → actions.
- Status is never color-only.
- Test complete keyboard journey, accessibility-tree names, focus restoration, status announcements, 390px, 320 CSS px/400%, 125/150/200%, reduced motion, target size, and text/non-text contrast.
- Automated perfect scores are not proof of semantic accessibility.

## Explicit anti-default decisions

1. No page-wide editorial kicker/rule formula.
2. No warm-paper/terracotta anti-slop bundle.
3. No permanent dashboard rail.
4. No generic three-card explanatory row.
5. No stock shadcn/Base Nova grammar or default icon set.
6. No purple/gradient/glass/neon first-wave bundle.
7. No terminal/brutalist counter-fashion.
8. No receipt styled as a certificate or mastery badge.
9. No novelty that weakens mathematical reading or browser reliability.

## Intentional exceptions and evidence

- **Archivo retained:** current Mathos surfaces and local project assets establish brand continuity; replacing it for novelty would be less specific.
- **KaTeX serif retained:** mathematical glyph semantics require it.
- **A compact connection state retained:** WebMCP availability materially changes agent capability; official Chrome guidance requires truthful progressive enhancement.
- **Exact tools and JSON retained behind disclosure:** the hackathon requires mechanism verification; official WebMCP guidance requires truthful contracts, but learner hierarchy requires subordination.
- **Green and rust retained:** they encode independent verification and the first invalid relation, always with text redundancy.
- **A chronological activity history retained behind disclosure:** actor provenance is durable session evidence, but no longer a permanent visual rail.

## Medium-confidence style risks

Count at freeze: **4**.

1. A proof spine could resemble a timeline if relation semantics are visually weak.
2. Line-local margins could evoke code-review annotations if copy becomes engineering-heavy.
3. A neutral canvas can drift into generic productivity-app minimalism if the mathematics does not dominate.
4. The landing transaction can become another “interactive demo hero” if it is over-staged or disconnected from the real scratchpad.

Each risk must be attacked in the after screenshots and independent novelty review.

## Audit limitations and subjective boundaries

- No representative labelled AI-authorship benchmark exists.
- The new official default clusters are vendor calibration guidance without prevalence data.
- No recruited learner or assistive-technology participant study is included.
- “Distinctive” and “Mathos-specific” retain expert-judgment subjectivity.
- The final verdict must list remaining medium risks; a detector passing is never enough to declare material risk zero.

