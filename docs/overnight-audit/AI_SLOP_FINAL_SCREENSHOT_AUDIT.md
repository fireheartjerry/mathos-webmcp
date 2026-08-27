# AI Slop — Final Screenshot Audit

Capture date: **2026-08-27**. Candidate: branch `hackathon-build`, after the final defect pass. Authority: [`final-zero-slop/`](./final-zero-slop/).

The old [`after/`](./after/) and [`shots-final/`](./shots-final/) directories are explicitly historical. They include defects that were discovered and fixed; they are not submission imagery.

## Required-state audit

| State | Viewport / runtime | Evidence | Visible result | Checklist | Status |
|---|---|---|---|---|---|
| WebMCP connected, cold | 1440×900, Chrome 151 + WebMCPTesting | [`01-webmcp-connected-cold.png`](./final-zero-slop/01-webmcp-connected-cold.png) | Six real tools registered; inspector collapsed; work remains primary. | AS-036–038 | PASS |
| First-break diagnosis | 1440×900, real tool calls | [`02-first-break-diagnosis.png`](./final-zero-slop/02-first-break-diagnosis.png) | First wrong line is rust, residue names missing `2x`, later work is not blamed. | AS-012, 029, 035 | PASS |
| Policy refusal + recovery | 1440×900, real `propose_step` refusal | [`03-policy-refusal-recovery.png`](./final-zero-slop/03-policy-refusal-recovery.png) | Refusal is inline, attributed, and gives a recovery action. | AS-029–030 | PASS |
| Targeted agent note | 1440×900 | [`04-targeted-agent-note.png`](./final-zero-slop/04-targeted-agent-note.png) | Note is attached to the exact step; it cannot change the engine verdict. | AS-035, 038 | PASS |
| Learner-owned proposal | 1440×900 | [`05-learner-owned-proposal.png`](./final-zero-slop/05-learner-owned-proposal.png) | Proposal appears only after attempts; learner owns “Use this / Keep mine”; no stale refusal remains. | AS-021, 030, 035 | PASS |
| Practice complete | 1440×900 | [`06-practice-complete.png`](./final-zero-slop/06-practice-complete.png) | Completion is a verified state, not confetti or a mastery badge. | AS-033–035 | PASS |
| Fresh transfer transition | 1440×900 | [`07-fresh-transfer-transition.png`](./final-zero-slop/07-fresh-transfer-transition.png) | New generated problem and assistance lock are explicit. | AS-033–036 | PASS |
| Transfer attempt | 1440×900 | [`08-transfer-attempt.png`](./final-zero-slop/08-transfer-attempt.png) | Learner authors every line; check remains page-owned; coaching tools remain closed. | AS-035–038 | PASS |
| Immediate-transfer evidence | 1440×900 | [`09-immediate-transfer-signal.png`](./final-zero-slop/09-immediate-transfer-signal.png) | Evidence surface is brought into view, lists observed facts, and states its limitations at equal visual weight. | AS-003, 033–038 | PASS |
| WebMCP unavailable | 1440×900, normal Chrome | [`10-webmcp-unavailable.png`](./final-zero-slop/10-webmcp-unavailable.png) + [metadata](./final-zero-slop/10-webmcp-unavailable.json) | Honest unavailable state; local inspector stays collapsed; learner flow is complete without simulation. | AS-028, 036–038 | PASS |
| 125% equivalent | 1152×720 | [`11-zoom-125.png`](./final-zero-slop/11-zoom-125.png) + [metadata](./final-zero-slop/11-zoom-125.json) | No horizontal overflow (`1137 = 1137`). | AS-039–040 | PASS |
| 150% equivalent | 960×600 | [`12-zoom-150.png`](./final-zero-slop/12-zoom-150.png) + [metadata](./final-zero-slop/12-zoom-150.json) | Single-column breakpoint; no horizontal overflow (`945 = 945`). | AS-039–040 | PASS |
| 200% equivalent | 720×450 | [`13-zoom-200.png`](./final-zero-slop/13-zoom-200.png) + [metadata](./final-zero-slop/13-zoom-200.json) | Core prompt and premise remain legible; no horizontal overflow (`705 = 705`). | AS-039–040 | PASS |
| Reduced motion | 1440×900, emulated reduce | [`14-reduced-motion.png`](./final-zero-slop/14-reduced-motion.png) + [metadata](./final-zero-slop/14-reduced-motion.json) | Media query matches and button transition duration is `0.001s`. | AS-025–027, 040 | PASS |
| Landing, current | 1440×900 | [`15-landing-current.png`](./final-zero-slop/15-landing-current.png) + [metadata](./final-zero-slop/15-landing-current.json) | Shared header/footer grid, claim/evidence hero, no card soup, no fake stats. | AS-001–020 | PASS |
| Primary button hover | 1440×900, pointer forced over CTA | [`16-primary-button-hover.png`](./final-zero-slop/16-primary-button-hover.png) + [metadata](./final-zero-slop/16-primary-button-hover.json) | Label remains visible after removal of the defective wipe layer. | AS-023–024 | PASS |

## Component inventory: ten anti-slop questions

Each judge-visible component was asked: (1) what job does it do, (2) why does it exist, (3) could it be removed, (4) is its hierarchy earned, (5) is its color semantic, (6) is its geometry semantic, (7) are all interaction states complete, (8) does its copy name a real mechanism, (9) does it expose an internal implementation detail, and (10) does it survive zoom/reduced-motion/keyboard use?

| Component | Answers / disposition |
|---|---|
| Header / brand | Orientation only; shared 1120px grid; no decorative container; unavailable/connected status is factual and subdued. |
| Landing hero | Makes one falsifiable claim and places live-looking proof beside it; no badge, gradient, fake metric, or equal-card row. |
| Proof ledger | Shows the product’s distinct mechanism, not generic decoration; green/rust encode verdicts only. |
| Problem premise | Establishes the semantic anchor the checker enforces; full accessible H1 is “Find d y by d x at x equals 2.” |
| Step editor | Main learner surface; plain boundaries, 44px controls, explicit label/placeholder, preview and in-place rewrite. |
| Work actions | One primary action; secondary actions are text; hover/focus/active/disabled states complete. |
| Diagnosis | Appears only on a genuine first break; states the mathematical residue; color is semantic. |
| Proposal | Appears only after learner attempts; source and rationale visible; acceptance remains learner-owned. |
| Capability rail | Explains the browser boundary in plain language; exact tool names/JSON exist only behind a collapsed inspector. |
| Activity ledger | Actor and state changes are durable evidence; technical revision/session identifiers are not in the default surface. |
| Transfer banner | Explains what is locked and why; does not imply the page checker is disabled. |
| Evidence receipt | Reports observed facts and limitations; no certificate, badge, points, streak, or mastery claim. |
| Error/conflict recovery | Inline, persistent until success/dismissal, actor-aware, and recovery-oriented; successful actions clear stale refusal state. |

## Five independent Luna reviewer dispositions

| Reviewer | Adversarial brief | Material finding | Final disposition |
|---|---|---|---|
| A | Generic 2026 AI-slop detector | No high-severity slop; technical inspector is acceptable only collapsed; mobile CTA may sit below first viewport. | Inspector remains collapsed; below-fold CTA is an ordinary conversion trade-off, not a product defect. |
| B | Sarsa reference fidelity | Header/footer grid drift; requested 500vh cinematic reference treatment; Archivo/blue/rail differences. | Grid fixed. Cinematic scroll rejected as decorative and contrary to state-motivated motion. Archivo and semantic Mathos blue intentionally retained. |
| C | Mathos/product identity | Primary hover label disappeared; `shared-path` leaked; inspector examples mismatched; receipt attribution was overstated. | Hover layer removed; label is now “Product rule”; suggested arguments derive from the current problem; tool receipt output is source-neutral. |
| D | Hierarchy and state coherence | Policy refusal survived into later proposal/receipt states; transfer evidence appeared too late. | Any successful action clears refusal; transfer signal moved before secondary actions and capture scrolls it into view. |
| E | Hostile external judge | Historical BUG files looked current; default screenshots overrepresented unavailable WebMCP; scope could read broader than implemented. | Historical folders now carry explicit warnings; connected and unavailable states are both freshly captured; landing/README explicitly state the one-family wedge. |

## Intentional exceptions

- Status pills are allowed because they encode machine state; no generic pill UI is used.
- Exact tool names and JSON are allowed only inside a collapsed inspector required for hackathon verification.
- KaTeX uses serif glyphs because they are mathematical notation, not decorative accent typography.
- The Sarsa cinematic scroll concept is not reproduced. The proof ledger and live state transition are the visual content; motion with no state purpose would be a regression.
- At 720×450, the landing CTA may fall below the first viewport. The claim and proof remain visible and there is no overflow; this is a bounded conversion trade-off, not an accessibility or slop failure.

## Final visual verdict

**40 / 40 checklist rules pass. Five independent reviews completed. Unresolved judge-visible AI-slop failures: 0.**
