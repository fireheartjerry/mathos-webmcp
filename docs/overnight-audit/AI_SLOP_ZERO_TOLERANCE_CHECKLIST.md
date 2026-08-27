# AI Slop Zero-Tolerance Checklist

Audit authority: [`AI_SLOP_RESEARCH.md`](./AI_SLOP_RESEARCH.md). Final status date: **2026-08-27**.

Every rule is binary. `PASS` means the current source and final screenshot set show no unresolved judge-visible failure. Conditional exceptions are named, bounded, and still independently reviewable.

## Composition

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-001 | Centered generic hero | Template-first hierarchy | YES | None | Asymmetric claim + proof ledger | Screenshot | PASS | Landing final |
| AS-002 | Three equal feature cards | Invents equal importance | YES | Truly equal choices | Sequential mechanism sections | DOM/screenshot | PASS | Landing final |
| AS-003 | Fake stat banner | Lie-shaped component | YES | Live measured evidence | State ledger with bounded claims | Copy/data audit | PASS | Landing ledger |
| AS-004 | Hero badge above H1 | Decorative template cue | YES | Required legal/status notice | Kicker + rule | DOM | PASS | Landing source |

## Typography

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-005 | Default trendy pairing | Borrowed personality | YES | Existing brand face | Archivo for Mathos | Font audit | PASS | tokens.css |
| AS-006 | Serif accent word | 2026 de-slop cliché | YES | Mathematical notation | KaTeX only | DOM/font audit | PASS | Final screenshots |
| AS-007 | Size-only hierarchy | No editorial decision | YES | None | Weight, spacing, color, position | Computed styles | PASS | Landing/app |
| AS-008 | All-caps everywhere | One density trick repeated | YES | Sparse kickers/status | Kicker rationed to sections | Text scan | PASS | DOM scan |

## Color

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-009 | Purple/indigo identity | Corpus default without brand | YES | Existing purple brand | Mathos blue | Token scan | PASS | tokens.css |
| AS-010 | Gradient text/button | Decoration harms contrast | YES | None | Solid ink button | CSS scan | PASS | tokens.css |
| AS-011 | Cream + serif + sage bundle | Current “tasteful AI” default | YES | One signal with rationale | Paper + sans + semantic green | Token/font audit | PASS | Final screenshots |
| AS-012 | Color without meaning | Decorative noise | YES | Brand mark | Blue action, rust attempt, green verify | Visual audit | PASS | State captures |

## Surfaces

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-013 | Card soup | Containers substitute for hierarchy | YES | Distinct interaction boundary | Open paper field + hairlines | Container count | PASS | Landing/app |
| AS-014 | Arbitrary shadow/elevation | False z-order | YES | Focus overlay | No shadows | CSS scan | PASS | tokens.css |
| AS-015 | Glass/glow/blob | Generic “tech” atmosphere | YES | None | Flat semantic panels | CSS/screenshot | PASS | All finals |

## Geometry

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-016 | Giant radius everywhere | Radius carries no meaning | YES | None | 2/4/8/12px scale | CSS scan | PASS | tokens.css |
| AS-017 | Pill everything | Stock dashboard language | CONDITIONAL | Machine status/tag/dot | Pills restricted to state labels | Selector audit | PASS | Capability status |
| AS-018 | Misaligned shells | Reveals assembled templates | YES | Full-bleed divider | 1120px shared grid | Pixel audit | PASS | Recaptured landing |

## Icons

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-019 | Emoji UI icons | Platform-dependent placeholder | YES | Genuine prose | Text labels / simple marks | Text scan | PASS | DOM |
| AS-020 | Sparkle motif | Stock AI signifier | YES | None | No AI ornament | Asset scan | PASS | Repo scan |

## Controls

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-021 | Competing primary CTAs | No product priority | YES | Destructive confirmation | One solid primary | Screenshot | PASS | App final |
| AS-022 | Mystery icon controls | Hides intent | YES | Universal close with label | Explicit text + aria-label | A11y tree | PASS | Browser audit |
| AS-023 | Incomplete interaction states | Static mockup feel | YES | None | Hover/focus/active/disabled | Computed state test | PASS | Browser audit |
| AS-024 | Ornamental hover wipe | Motion over reliability | YES | None | Simple background transition | Hover capture | PASS | Fixed tokens.css |

## Motion

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-025 | Entrance animation everywhere | Generic animation boilerplate | YES | State transition | Almost no entrance motion | CSS scan | PASS | Styles |
| AS-026 | Hover-scale on cards | Meaningless activity | YES | Press feedback on button | 0.97 active press only | CSS scan | PASS | tokens.css |
| AS-027 | Ignores reduced motion | Polish over access | YES | None | 1ms override | Emulation/capture | PASS | Reduced-motion final |

## Loading / error

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-028 | Generic spinner/skeleton | Placeholder without recovery | YES | Genuine long load | Plain engine status | Cold capture | PASS | Connected cold |
| AS-029 | Toast-only failure | Ephemeral, contextless | YES | Noncritical confirmation | Inline refusal + recovery | Error capture | PASS | Policy refusal |
| AS-030 | Stale contradictory alert | State hierarchy breaks trust | YES | None | Clear on any successful action | Journey test | PASS | Proposal/final captures |

## Copy

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-031 | Unlock/transform/seamless claims | Interchangeable marketing filler | YES | Direct quotation | Concrete mechanism claims | Text scan | PASS | Site copy |
| AS-032 | Internal slug in learner UI | Architecture leak | YES | Open inspector | “Product rule” | DOM scan | PASS | App kicker |
| AS-033 | Unbounded mastery claim | Overstates evidence | YES | Validated longitudinal study | Immediate-transfer limitation | Copy audit | PASS | Receipt |

## Educational visualization

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-034 | Confetti/streak/points | Rewards completion theatre | YES | None | Proof ledger and first break | Asset/text scan | PASS | Repo scan |
| AS-035 | “Correct” owned by model | Hides epistemic boundary | YES | None | Browser CAS owns verdict | Tool/copy audit | PASS | Falsifiability proof |

## WebMCP / activity UI

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-036 | Simulated agent demo | Fake integration | YES | None | Real `navigator.modelContext` | Chrome runtime | PASS | Real E2E |
| AS-037 | Raw tool chrome dominates | Developer panel masquerades as product | CONDITIONAL | Collapsed judge inspector | Capability summary by default | Cold screenshot | PASS | Connected/unavailable finals |
| AS-038 | False actor attribution | Corrupts provenance | YES | Legacy internal storage only | Source-neutral receipt output | Tool assertion | PASS | get_receipt test |

## Responsive

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-039 | Desktop shrunk into overflow | Screenshot-first implementation | YES | Horizontal math scroll | Single-column rail below 1100px | 125/150/200 captures | PASS | Zoom finals |

## Accessibility-driven appearance

| ID | Pattern | Why it looks slop | Forbidden? | Allowed exception | Mathos replacement | Detection | Final | Evidence |
|---|---|---|---|---|---|---|---|---|
| AS-040 | Low contrast, tiny targets, hidden focus, broken names | Visual polish excludes real use | YES | Disabled controls may be muted | WCAG contrast, 44px targets, full accessible math name | Lighthouse/tree/keyboard | PASS | Final browser audit |

## Final disposition

**40 / 40 PASS. Unresolved visible failures: 0.**

Intentional bounded exceptions: status pills only; collapsed technical inspector; KaTeX serif only for mathematics; static proof-ledger hero instead of the Sarsa cinematic scroll concept. These exceptions strengthen specificity and do not reintroduce a forbidden template default.
