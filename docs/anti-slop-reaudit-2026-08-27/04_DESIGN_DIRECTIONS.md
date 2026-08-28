# Design directions

Status: tournament complete; **Proof Margin recommended and presented for approval**. Production implementation remains gated until approval.

All directions preserve the same domain model, math engine, learner-attempt gate, proposal consent, source attribution, persistence, transfer lock, and six WebMCP tools. They are not palette swaps.

## A. Proof Margin — recommended

### Thesis

The derivation is the document. Every machine judgment, agent intervention, and learner decision sits beside the exact mathematical line it qualifies.

### Spatial model

```text
Mathos / Second Try                              page tools available

Find dy/dx at x = 2
a = x²   b = 4x   y = a·b + a

   learner derivation                    mathematical margin
01 y = 4x³ + x²                         follows · page
02 y' = 12x² + 2x                       breaks  · missing 6x
                                          agent note: differentiate both terms
                                          proposed: 12x² + 2x
                                          [Use proposal]  Keep my line
03 …                                     unchecked after first break

Write the next true line…                action trace, on demand
```

### Logic

- Baselines align line number, expression, relation, actor, and provenance.
- The first-break propagation line is a genuine proof spine, not a decorative page rule.
- Notes and proposals occupy the mathematical margin on wide screens and expand immediately beneath their line on narrow screens.
- WebMCP appears as a short line-local action trace only when it acts. Full capability/history disclosure remains available but is no longer ambient chrome.
- Status uses sentence-case text and simple marks; pills are reserved only if a compact machine connection state genuinely needs containment.
- The landing page renders one live transaction: learner line → page contradiction → agent proposal → learner decision. Copy explains limitations below the demonstration.
- Motion is limited to focus/causal relocation when a tool targets a line; reduced motion removes movement while keeping highlight.

### Material and type

- Neutral working canvas, not warm paper as an aesthetic claim.
- Archivo preserves real Mathos identity; KaTeX owns mathematics; mono is restricted to raw tool/schema detail.
- Math is the largest, highest-contrast content. Product labels are sentence case.
- Blue marks learner/action and Mathos identity; rust marks the first invalid relation; green marks independently verified state; a distinct restrained indigo or graphite marks unaccepted agent proposals. No decorative color.

### Risks

- Requires careful alignment across variable-height math and annotations.
- The line model must remain understandable to screen readers without visual column order leaking into reading order.
- Evidence history needs a discoverable but subordinate home.

## B. Focus Lens

### Thesis

Learning happens one equivalence at a time. The interface centers the current proof obligation and reduces past/future lines to context.

```text
                 Step 2 of 4

              4x³ + x²
                    ↓ differentiate
             [ 12x² + 8x ]

        What changed?  Where did 8x come from?

previous line                         page check / agent help tray
```

- One full-width current step, with prior work in a collapsed timeline.
- Page check and agent help live in a bottom tray.
- Transfer becomes a clean new sequence.
- Motion shifts the current line into focus; reduced motion uses immediate replacement.

**Killed:** excellent local comprehension and mobile behavior, but weak simultaneous-chain inspection, weak judge comprehension of first-break propagation, and awkward receipts/history/loading states. It changes the learner interaction more than the brief needs.

## C. Change Review

### Thesis

An agent proposal is a reviewable change to a mathematical document, never an answer silently applied.

```text
Current derivation                    Proposed revision
02 12x² + 8x        ───────────────▶  02 12x² + 2x
   page: not equivalent                 page: equivalent

Reason: derivative of x² is 2x       [Accept revision] [Reject]
```

- Two-pane current/proposed comparison during interventions.
- Machine verdict sits below both sides.
- A compact activity/version history is native to the metaphor.
- Mobile becomes a stacked before/after diff.

**Killed:** WebMCP consent is extremely legible and demo-reliable, but the code-review metaphor overpowers learning, resembles GitHub/agent IDE defaults, and creates needless two-pane complexity in ordinary writing states.

## D. Derivation Map

### Thesis

Show mathematical equivalence as a path with verified and broken branches; the learner chooses how to repair the route.

```text
          y = 4x³ + x²
             │ differentiate
       ┌─────┴────────┐
       │              │
  12x² + 8x      12x² + 2x
  attempted ✕       proposed ?
                         │ learner accepts
                      verified ✓
```

- Graph nodes are expressions; edges are mathematical operations.
- Page and agent occupy different edge roles.
- Transfer starts as a fresh unassisted branch.
- Motion draws only a newly created causal edge.

**Killed:** memorable and highly distinctive, but graph navigation, reflow, long expressions, keyboard traversal, screen-reader order, and all-state rendering carry excessive risk. It is a visualization feature, not the safest submission shell.

## Scoring

Five points per criterion. Implementation risk is scored so that **5 means low risk**. Scores were assigned before choosing the winner.

| # | Criterion | Proof Margin | Focus Lens | Change Review | Derivation Map |
|---:|---|---:|---:|---:|---:|
| 1 | Mathos/product identity | 5 | 4 | 4 | 5 |
| 2 | Learner comprehension | 5 | 5 | 4 | 3 |
| 3 | Mathematical readability | 5 | 5 | 4 | 4 |
| 4 | WebMCP mechanism legibility | 5 | 3 | 5 | 4 |
| 5 | Judge comprehension in <10 seconds | 5 | 4 | 5 | 4 |
| 6 | Distinctiveness | 5 | 4 | 4 | 5 |
| 7 | Resistance to known 2026 defaults | 5 | 5 | 4 | 5 |
| 8 | Resistance to newer anti-slop defaults | 5 | 4 | 4 | 5 |
| 9 | Accessibility | 4 | 5 | 4 | 2 |
| 10 | Responsive behavior | 5 | 5 | 3 | 2 |
| 11 | Implementation risk | 4 | 3 | 3 | 2 |
| 12 | Demo reliability | 5 | 4 | 5 | 3 |
| 13 | Survival across all product states | 5 | 3 | 4 | 3 |
|  | **Total / 65** | **63** | **54** | **53** | **47** |

## Selection ruling

**Choose Proof Margin.**

It does not invent a new metaphor. It promotes the product’s existing strongest object—the learner-authored derivation—and makes browser verification, agent intervention, learner consent, and provenance spatial properties of that object. It removes the warm-editorial/dashboard shell without fleeing into another generic terminal, IDE, graph, or neutral SaaS template.

The signature is a **line-local mathematical margin with an independently checkable relation spine**. That signature improves first-break discovery, proposal comprehension, actor attribution, and responsive continuity. It could plausibly belong only to a product where a person and an agent edit the same derivation while the browser owns truth.

## Approval gate

The direction and recommendation were presented to the user on 2026-08-27. The canonical contract and production code remain intentionally unmodified until explicit approval, as required by the active brainstorming/design workflow.

