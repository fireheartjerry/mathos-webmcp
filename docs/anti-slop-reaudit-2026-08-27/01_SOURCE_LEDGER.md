# Source ledger

All sources retrieved **2026-08-27** unless a retrieval date is stated otherwise. “Strength” describes applicability to this audit, not overall scholarly quality.

## Primary and official

| Source | Published/current date | Strength | What it supports | Boundary |
|---|---:|---:|---|---|
| [Anthropic frontend-design skill](https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md) and [v1.1.0 commit](https://github.com/anthropics/claude-code/commit/423563c) | 2026-06-18 | High for current guidance; medium for prevalence | Current three default clusters; subject-grounded choices; structural devices must encode truth | No sample, method, or population estimate |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) and [source](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) | source updated 2026-08-18 | High | Keyboard, focus, full states, recovery, stable loading, reduced motion | Guidance, not user research on Mathos |
| [Teaching agents product design at Vercel](https://vercel.com/blog/teaching-agents-product-design-at-vercel) | 2026-06-25 | Medium-high | Job/outcome first; rendered evidence; design every reachable state | Vendor practice report |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Recommendation updated 2024-12-12 | High | Conformance, focus, target size, reflow, contrast, status messages | Automated checks cannot establish full conformance |
| [ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [name guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/) | living docs | High | Semantic disclosures, keyboard behavior, meaningful names | Must verify in the real accessibility tree |
| [shadcn Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) and [theming](https://ui.shadcn.com/docs/theming) | 2026-07 / current | High | Current `base-nova`, neutral variables, 0.625rem base radius; default-stack fingerprint | shadcn use is not itself a defect |
| [Tailwind theme variables](https://tailwindcss.com/docs/theme) and [v4.3](https://tailwindcss.com/blog/tailwindcss-v4-3) | current 4.3.x | High | Default token inheritance and customization mechanism | Utilities are not authorship evidence |
| [WebMCP Community Group draft](https://webmachinelearning.github.io/webmcp/) | 2026-08-26 | High for draft intent | Human UI augmentation, tool schema, annotations, cancellation | Not a W3C Standard; current draft differs from Chrome |
| [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api), [best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), [evals](https://developer.chrome.com/docs/ai/webmcp/evals), [security](https://developer.chrome.com/docs/ai/webmcp/secure-tools) | updated 2026-05 through 2026-08 | High for target runtime | `document.modelContext`, tool lifecycle, state parity, selection and failure tests, concise truthful contracts | Experimental implementation; actual Chrome behavior is authoritative for this submission |
| [Mathos AI](https://www.mathos.ai/) and [product surface](https://www.mathos.ai/app) | live 2026 | High for brand/product claims | Visualized mathematics, step-level tutoring, adaptive prerequisite repair, blue identity, interaction-first product | Marketing claims are not independent efficacy evidence |
| [Desmos accessibility](https://help.desmos.com/hc/en-us/articles/4404860698253-What-Accessibility-features-does-Desmos-offer) | updated 2025-07-17 | High | Math-aware speech, keyboard, audio trace, enlargement, contrast, Braille | A reference principle, not a template |
| [Mathigon](https://mathigon.org/) and [teacher resources](https://mathigon.org/teachers) | live | Medium-high | Mathematical objects and learner exploration as the visual surface | Broad K–12 product, different task |
| [Wolfram Alpha Notebook Edition](https://www.wolfram.com/wolfram-alpha-notebook-edition/) | live, Mathematica 15 in 2026 | Medium-high | Cells, preserved work, expandable steps, hints, independent computation | Desktop/notebook complexity should not be copied wholesale |
| [Lean tactic proofs](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/) | live | Medium | Each action transforms an explicit independently checkable proof state | Formal-proof UI differs from learner calculus |
| [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks) and [reviews](https://docs.github.com/en/pull-requests/get-started/reviewing-pull-requests-quickstart) | live | Medium | Machine evidence and suggestions attach to exact lines, with human acceptance | Engineering metaphor can overpower learning if copied literally |
| [Google Docs suggestions](https://support.google.com/docs/answer/6033474) and [version history](https://support.google.com/docs/answer/190843) | live | Medium-high | Proposal does not overwrite source; actor and history remain visible | Not a math-verification interface |
| [Observable notebooks](https://observablehq.com/documentation/notebooks/) | live | Medium | Source, output, prose, and dependencies stay spatially related | Notebook-cell conventions can become another generic shell |

## Academic

| Source | Date | Strength | Method/result used | Boundary |
|---|---:|---:|---|---|
| [Shin et al., *Interrogating Design Homogenization in Web Vibe Coding*](https://arxiv.org/html/2603.13036) | 2026-03-13 | C | 63-source review, six-tool walkthrough, qualitative risk analysis; productive friction and contextual anchoring | No generated-site similarity benchmark or causal experiment |
| [Anderson, Shah & Kreminski, *Homogenization Effects of LLMs on Human Creative Ideation*](https://arxiv.org/html/2402.01536) | C&C 2024 | B+ | 33 retained participants, 1,271 ideas; group semantic divergence 0.24 AI vs 0.28 non-AI, p=.038, d=.47 | Ideation, not web design; ChatGPT 3.5; no individual-level effect |
| [Agarwal, Naaman & Vashistha, *AI Suggestions Homogenize Writing Toward Western Styles*](https://doi.org/10.1145/3706598.3713564) | CHI 2025 | A-/B+ | 118 participants, 472 essays; similarity 0.48 to 0.54, p<.001, d=.44 | English writing in India/US, not UI |
| [Chen et al., *Generative Interfaces for Language Models*](https://arxiv.org/html/2508.19227) | 2025-08-26 | B; counterevidence | 100 queries, 428 evaluators; generated task UIs preferred 69% vs GPT-4o chat and 84% vs Claude chat | Preference, US expert users, no accessibility evaluation |
| [Calò et al., *Semantic Accessibility Gap in LLM-Generated Web UIs*](https://tommasocalo.github.io/papers/26-semacces-chiea.pdf) | CHI EA 2026 | B | 300 UIs, 541 semantic violations; meaningful naming gaps despite attributes | Isolated HTML; LLM judges; no AT-user study |
| [Panchanadikar et al., *Can Generative AI Create Accessible Websites?*](https://doi.org/10.1145/3663547.3759755) | ASSETS 2025 | B- | Six ecommerce sites, 18 pages, 308 WCAG/cognitive-accessibility errors | Small one-domain sample |
| [Abu Doush & Kassem, *Can Generative AI Create Accessible Web Code?*](https://doi.org/10.1007/s10209-025-01250-2) | 2025-07-31 | B | Four models, eleven component tasks; explicit correction materially improved output | Component benchmark; no disabled-user study |
| [Buçinca et al., *To Trust or to Think*](https://arxiv.org/abs/2102.09692) | 2021 | A-/B+ | N=199; cognitive forcing reduced overreliance; explanations alone insufficient | Artificial decision task; useful friction was less liked and unequal |
| [Bastani et al., *Generative AI Without Guardrails Can Harm Learning*](https://doi.org/10.1073/pnas.2422633122) | PNAS 2025 | A | Preregistered field RCT, nearly 1,000 math students; GPT Base +48% practice but -17% unaided exam; guarded tutor removed penalty | One school/country; four sessions; older model |

## Empirical and reproducible

| Source | Date | Strength | Reproducible contribution | Boundary |
|---|---:|---:|---|---|
| [Vibe-coded design-tells repository](https://github.com/JCarterJohnson/vibecoded-design-tells) and [method/data](https://raw.githubusercontent.com/JCarterJohnson/vibecoded-design-tells/main/unslop-ai-ui/DATA_AND_GRAPHS.md) | 2026-06-16 | C | Scripts, corpus, regexes, CSVs, quote banks; 46,971 query-hit posts and 3,033 comments | “3.2M” is subreddit volume, not inspected designs; lexical mentions, no visual/authorship labels |
| [Show HN scoring study](https://www.adriankrebs.ch/blog/design-slop/) and [code](https://github.com/AdrianKrebs/design-slop-cop) | 2026-04-20/current | C+ | Deterministic DOM/computed-style rules; original 1,590 URLs | Current code/rubric changed; no authorship labels, baseline, or published FP protocol |
| [MotionSpec shipped-app scan](https://motionspec.dev/blog/state-of-motion-ai-generated-uis) | 2026-07-18, corrected 2026-08-05 | B- | 196 production AI-builder apps, published rules/data; duplicate-signature correction gives 53.9–77.2% WCAG 2.2.2 failure range | One entry page, static CSS only, anonymized cohorts, commercial interest |
| [Taste AI patterns](https://huggingface.co/datasets/Taste-AI/ai-slop-patterns) | current 2026 | C+ | Pinned extractors, feature lift and co-occurrence; single-token bans contradicted by gradient findings | Small curated reference set, synthetic pages, partly circular quality threshold |
| [UW/ASU “Is This AI?”](https://agent-security.cs.washington.edu/is-this-ai.html) | updated 2026-08-10 | B for social dynamics | 13,098 posts, 222,060 comments, twelve evolving detection strategies | Social judgments and gatekeeping, not reliable authorship detection |

## Practitioner and detector catalogues

| Source | Date | Use | Calibration |
|---|---:|---|---|
| [Impeccable slop catalogue](https://impeccable.style/slop/) | v4.1.1, 2026-08-14 | Deterministic source/browser rules, contextual exceptions, project-contract drift | Strong engineering approach; internal validation claims are not independent |
| [Kill AI Slop](https://killaislop.com/) and [repository](https://github.com/yetone/kill-ai-slop) | current | Interactive reconstructed patterns; useful mechanism explanations | No prevalence study or published shipped-site sample |
| [unslop-ui](https://github.com/yuwen-lu/unslop-ui) | current | Inspectable anti-default prompt and screenshots | Taste prompt with minimal adoption; its Linear/Vercel imitation can create new sameness |

## Community and anecdotal

| Source | Date | Use | Calibration |
|---|---:|---|---|
| [Original 3.2M Reddit post](https://www.reddit.com/r/ChatGPT/comments/1u7ghhs/i_scanned_3200000_posts_across_47_ai_and_saas/) | 2026-06 | Complaint lexicon and counterarguments | Selected vocal communities; headline overstates analyzed material |
| [Default shadcn discussion](https://www.reddit.com/r/reactjs/comments/1vv8060/all_the_default_shadcnui_websites_look_so_sloppy/) | 2026-08-22 | Current fatigue and the “default of the era” mechanism | Anecdotal, tiny sample |
| [Supplied Instagram Reel](https://www.instagram.com/p/DcEJDHBTyPY/) | inspected 2026-08-27 | Thirty seed hypotheses and visible popular discourse | Unpublished method, tiny examples, disputed by commenters |

## Defensible synthesis

The evidence supports one durable mechanism: underspecified intent plus fast polished generation transfers ecosystem and model priors into the artifact, while low-friction acceptance can reduce creator or learner ownership and verification. Contextual anchoring, state-specific interaction, productive but targeted friction, explicit provenance, and independent checks mitigate that risk.

It does **not** support diagnosing authorship from rounded corners, cards, sans-serif type, whitespace, a single color, or any other isolated visual feature.

