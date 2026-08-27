# AI Slop Research — Submission Authority

Research date: **2026-08-26**. Final application: **2026-08-27**.

This is the submission-facing research artifact requested by the overnight prompt pack. The full literature notes, quotations, measured CSS samples, counterexamples, and 40-rule derivation live in [`05_AI_SLOP_RESEARCH.md`](./05_AI_SLOP_RESEARCH.md). This file is the concise authority used for final acceptance.

## Method and evidence base

- Literature review of 18 sources spanning practicing designers, frontend communities, design-system analysis, typography, and education research.
- First-hand browser measurement of Linear, Stripe, and Brilliant on 2026-08-26.
- Screenshot comparison against the original Mathos build, the Sarsa visual reference, and the rebuilt candidate.
- Adversarial review by five independent Luna reviewers with distinct briefs: generic-slop detection, reference fidelity, Mathos/product identity, hierarchy/state coherence, and hostile external-judge suspicion.

Primary sources include [Developers Digest](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it), [Unslop UI](https://www.claudecodehq.com/playbooks/unslop-ui), [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website), [Alan West](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh), [Hacker News](https://news.ycombinator.com/item?id=48504912), [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells), [Superdesign](https://superdesign.dev/blog/why-ai-design-looks-generic), [Design Systems Collective](https://www.designsystemscollective.com/is-anyone-else-tired-of-every-tailwind-shadcn-app-looking-the-same-69c545e73114), [AXE-WEB](https://axe-web.com/insights/ai-website-design-sameness/), [LogRocket](https://blog.logrocket.com/ux-design/linear-design/), and [Smashing Magazine](https://www.smashingmagazine.com/2022/10/typographic-hierarchies/). Education-specific grounding includes [The Correct Answer Trap](https://arxiv.org/pdf/2606.23205), [purposeful gamification](https://arxiv.org/html/2512.08551v1), and [digital badge research](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1429452/full).

## The operative definition

AI slop is not a color, framework, radius, or visual style. It is the visible residue of **unmade product decisions**: statistically common components and copy assembled without a reason tied to the user, content, or system state. A stylistic choice is legitimate when its role is explicit, consistent, accessible, and difficult to swap into an unrelated product unchanged.

## Taxonomy and Mathos response

| Category | Slop mechanism | Legitimate use | Mathos replacement |
|---|---|---|---|
| Composition | Canned centered hero, three equal cards, stat strip, pricing/FAQ skeleton describe a template rather than the product. | Symmetry where content truly has equal weight. | Asymmetric claim/evidence hero; the proof ledger is the visual argument. |
| Surfaces | Card soup, nested rounded containers, arbitrary elevation, glass, and glow invent hierarchy. | A boundary that protects a distinct interaction or semantic state. | Paper field, hairlines, almost no shadow, one diagnostic surface, one evidence surface. |
| Typography | Default Inter/Geist/serif-accent pairing and size-only hierarchy signal no voice. | Any typeface chosen for a stated functional or brand reason. | Archivo for Mathos continuity, coordinated weight/spacing/color hierarchy, KaTeX serif only for mathematics. |
| Color | Purple gradients or the newer cream/serif/sage bundle act as borrowed taste. | Color that carries brand or semantic state. | Ink and paper dominate; blue means Mathos/action, rust means attempted route, green means verified. |
| Geometry | One giant radius and pills everywhere erase semantic differences. | Pills for compact machine states; moderate radius for controls. | 2/4/8/12px semantic scale; 999px only for status tags and dots. |
| Controls | Repeated primary CTAs, icon-only mystery actions, ornamental hover effects. | One clear primary action and explicit secondary actions. | One button family, text secondary actions, keyboard focus, complete hover/active/disabled states. |
| Motion | Entrance animation on every section and generic hover-scale consume attention without meaning. | Motion showing state, causality, or focus. | Minimal state transitions; reduced-motion collapses all durations to 1ms. |
| Copy | “Unlock,” “Transform,” “Seamless,” and vague benefit claims are interchangeable. | Plain language that names a concrete outcome or limitation. | “The agent cannot tell you your work is right. Only the page can.” Bounded receipts state what they do **not** prove. |
| Architecture leaks | Raw IDs, snake_case slugs, JSON, tool chrome, and internal terms become the product surface. | A deliberately opened inspector for judges and developers. | Human labels by default; exact capabilities remain collapsed and explicitly marked local/technical. |
| Education UI | Confetti, streaks, points, badges, and instant “correct” output reward completion instead of reasoning. | Feedback tied to a genuine learning event. | First-break diagnosis, learner-owned edits, proposal consent, and a fresh unaided transfer round. |

## Shadcn-specific findings

Shadcn is not the problem; untouched defaults are. The recognizable stack is `rounded-lg border bg-card shadow-sm`, slate variables, equal card grids, stock dialog/form proportions, and a dashboard shell whose content could be replaced without changing the layout. The detection test is simple: if a component is visually indistinguishable from its documentation example, it has not yet been designed. This project does not use shadcn and bans its default visual grammar even if the library is later adopted.

## Counterexamples and extracted principles

- **Mathos:** precise, calm, education-first; blue is an identity token, not decoration.
- **Sarsa:** paper, ink, hairlines, editorial pacing, restrained geometry; hierarchy comes from rhythm instead of container count.
- **Linear:** extremely low uppercase-label frequency, tight alignment, explicit interaction states.
- **Stripe:** product evidence and diagrams outweigh generic feature-card claims.
- **Notion:** neutral system, content-led density, chrome recedes behind work.
- **Brilliant:** learning interactions are the visual content; progress reflects actual work.
- **OpenAI:** plain claims, disciplined type, and interaction surfaces that disclose system boundaries.

The extracted rule: **make the mechanism visible, remove decoration that cannot explain itself, and let state—not template fashion—drive hierarchy.**

## Project bans

No purple/indigo gradient identity; no gradient text; no glass or glow; no decorative blob background; no hero badge; no generic three-card feature row; no nested card soup; no fake stats; no emoji iconography; no stock shadcn styling; no repeated sparkle motifs; no meaningless all-caps labels; no confetti, streaks, points, or mastery claim; no raw family slug in learner UI; no simulated agent; no receipt that hides uncertainty; no animation without a state purpose.

## Decision on the Sarsa reference

The reference’s paper/ink grid, hairlines, geometry, and typographic rhythm were adopted. Its long cinematic scroll treatment was **not** copied: Mathos needs the proof ledger and live scratchpad to carry the argument, and decorative scroll choreography would violate the state-motivated-motion rule. Archivo remains because it is Mathos-authentic; replacing it with a fashionable display face would make the result less specific, not more.

The enforceable binary audit is [`AI_SLOP_ZERO_TOLERANCE_CHECKLIST.md`](./AI_SLOP_ZERO_TOLERANCE_CHECKLIST.md).
