# Proof Margin implementation changelog

Date: 2026-08-27  
Branch: `hackathon-build`

## Outcome so far

The approved Proof Margin direction is implemented on `/` and `/learn`. The redesign treats the derivation as the product: learner-authored lines, page-owned mathematical verdicts, line-local evidence, visible agent limits, explicit proposal consent, and bounded transfer claims.

## Implemented changes

| Commit | Change | Contract rule addressed | Verification |
|---|---|---|---|
| `0d37058` | Presentation semantics | Mathematical state is textual and machine-readable, not color-only | Unit tests |
| `ace4de5`, `6714f8e` | Line-local evidence | Diagnosis and agent help stay attached to the exact proof line | Unit tests and rendered inspection |
| `24b7dd1`, `1791894`, `19f6b6f` | Session details | WebMCP state, tool boundary, activity, and receipt limits remain inspectable without dominating the learner task | Unit tests and rendered inspection |
| `0f79976`, `a10c677`, `cd0c153` | Proof Margin visual system | Document hierarchy, proof rows, durable focus, contrast, 320 px reflow, reduced motion, and evidence-state styling | 196 tests, typecheck, build, Chrome profile screenshots |
| `0130f60`, `61a68a8` | Landing reconception | One primary action; learner → page verdict → pending proposal → learner choice; mobile transaction remains above the first viewport | 196 tests, typecheck, build, 390 × 844 and 1024 × 768 profile-backed Chrome inspection |
| `e8bda5b` | Feedback and product-truth repair | Valid learner actions clear stale input errors; unreadable math names a recovery; proposal wording matches the post-check attempt reset | 200 tests, typecheck, build, live Chrome profile re-test |
| `977a181` | Cross-source feedback repair | Every successful tool result clears obsolete policy refusal while learner input errors remain until learner resolution | 204 tests, two independent reviews, live local-inspector refusal → read proof |
| `3083348` | Pedagogy-boundary repair | Canonical answers are redacted before proposal eligibility and throughout unaided transfer; unresolved math is not called broken | 213 tests, hostile pedagogy re-review, live profile inspection |
| `57b6369` | Compact mobile proof rows | Removes the checklist-like rail, boxed nodes, dead fourth row, and distant remove affordance below 720 px | 213 tests, hostile slop re-review, final 390 × 844 screenshots |
| `41eaf87` | Unresolved downstream truth | Later lines distinguish a real break from an unreadable/uncertain predecessor; inspector args refresh revisions without leaking answers | 216 tests, hostile pedagogy re-review, live transfer inspection |
| `d08a5a2`, `e754894` | WebMCP harness truth | The harness waits for all six tools and asserts the numeric first-broken-step contract | 226 tests and source-level WebMCP review |
| `2ab6ac9` | Tool and receipt hardening | Tool-scoped idempotency, truthful partial registration, bounded receipts, and separated provenance | 226 tests, typecheck, build |
| `bcd3674` | Accessibility repair | Focus restoration, polite intervention announcements, input error relationships, recovery links, and bounded keyboard-scrollable proposal math | 226 tests and independent accessibility review |

## Rendered defects found and resolved

1. The first mobile viewport split the core transaction from its decision controls. The transaction was compacted and moved before explanatory material.
2. Repeated numbered section furniture made the landing page read like a generated template. It was removed.
3. Disabled preview decisions looked actionable. Their disabled state is now visually unambiguous.
4. A 257-character rejection survived after a later valid Add. Action feedback is now derived from the latest relevant result.
5. An unreadable expression reported parser failure without telling the learner what to do. The line now says to rewrite a complete expression and check again.
6. Proposal copy implied a lifetime attempt count even though `CHECK_WORK` resets the gate. Visible and tool metadata now say “after two learner attempts since the most recent check.”
7. The local inspector prefilled the canonical derivative before the proposal gate and during unaided transfer. Proposal arguments are now blank until a practice line is truly eligible, redact reactively when eligibility disappears, and remain answer-free in transfer.
8. Unreadable and uncertain relations were announced as mathematical failures, and their later lines said “After the first break.” They now use unresolved semantics through presentation, activity, tool output, and downstream labels.
9. Narrow proof rows resembled a workflow timeline. Mobile rows now use compact expression/relation/evidence geometry with no rail and keep the remove target beside its expression.
10. A full-page laptop screenshot was corruptly stitched. It was replaced with a single clean 1024 × 768 viewport capture and independently re-reviewed.
11. Several nominal desktop captures inherited a mobile layout during rapid viewport switching. They were recreated directly from the profile-backed Chrome tab with exact device metrics; the redundant mismatched annotation capture was removed.

## Live-browser evidence

All rendered checks in the `after/` directory were made in a new tab inside the user's installed Chrome profile. No headless browser result is counted as final visual proof. Tested behavior includes the full guided-practice-to-transfer journey, proposal refusal and consent, line-local annotation, persistence, multi-tab conflict, keyboard focus, reduced motion, loading recovery, long input, and 320 px reflow.

The current profile reports Chrome 151 but does not expose `document.modelContext`; the page therefore truthfully renders “WebMCP unavailable.” Connected-state re-verification remains gated on enabling Chrome's WebMCP testing flag and relaunching the same profile.

## Pending cutover record

ChatGPT Sites deployment and the subsequent exact Vercel project removal are intentionally not recorded as complete here. Vercel must remain until the Sites production URL passes `/`, `/learn`, asset, interaction, and WebMCP progressive-enhancement checks.
