# 09 — Final redesign specification

Frozen August 27, 2026. This document governs the rescue pass that follows the earlier
Second Try rebuild. It supersedes visual or product choices in earlier audit documents where
they conflict.

## Decision

Keep **Second Try by Mathos**. The winning product is a live proof ledger: a learner writes
real multi-line mathematics, the page's own CAS marks the first line that stopped being true,
an agent may teach at that exact line without editing learner work, and a fresh problem tests
immediate transfer only after the practice derivation has been repaired.

The irreducible WebMCP claim is visible in the product: the half-written derivation exists in
this tab, the verifier exists in this page, the learner and agent share one revisioned artifact,
and the page can refuse pedagogically unsafe agent actions.

## Product corrections

1. **No transfer from broken work.** `new_problem` is available only when the checked practice
   derivation is internally sound and reaches the requested answer. A mere check is not enough.
2. **The first action stays above the fold.** The cold-start tutorial becomes a compact three-move
   cue beside the composer; it may not push the first input below a 1080×700 viewport.
3. **Capability, not protocol theatre.** The right rail leads with the real registration state,
   the page-owned-verdict thesis, and human-readable activity. Raw tool names and schemas remain
   available in one collapsed inspector for judges and fallback testing.
4. **Truthful connection language.** Unsupported browser, partial registration, registered tools,
   and actual agent presence are not conflated. The page can observe registration, not whether a
   conversational agent is actively looking at the tab.
5. **Evidence, not certification.** The final surface is called the **transfer signal**. It reports
   bounded observations and its limits with equal visual weight.

## Information architecture

The `/learn` route is the product. A 64px header holds Mathos, Second Try, round progress, and the
measured WebMCP state. The desktop shell is a 720–760px proof ledger plus a 340–380px evidence rail.
The proof ledger order is fixed:

1. round label and compact problem statement;
2. definitions;
3. learner derivation, drawn as one continuous proof thread;
4. composer and one primary action;
5. diagnostic or transfer signal.

The evidence rail order is fixed:

1. page capability state and the one-sentence browser-native thesis;
2. latest collaboration event and session activity;
3. collapsed capability inspector.

Below 1040px the rail moves after the proof, but a one-line capability summary remains in the
header. No debug revision ids appear outside the expanded inspector.

## Visual direction — Mathos × Sarsa proof ledger

The exact reference is the local **Sarsa** product, not “Sarasota.” We borrow its calm ground,
grotesk typography, hairline structure, asymmetry, and causal motion—not its identity or assets.

Tokens:

```css
--paper: #fafaf7;
--panel: #ffffff;
--paper-sunk: #f0f0eb;
--ink: #16150f;
--ink-70: rgba(22, 21, 15, 0.68);
--ink-meta: rgba(22, 21, 15, 0.60);
--hairline: rgba(22, 21, 15, 0.12);
--brand: #155d97;
--diagnostic: #c2541e;
--verify: #33724f;
--font-sans: "Archivo", system-ui, -apple-system, sans-serif;
--font-mono: "Fira Code", ui-monospace, monospace;
--radius-control: 8px;
--radius-panel: 12px;
--focus: 2px solid #155d97;
--ease-out: cubic-bezier(.23, 1, .32, 1);
```

No shadows, gradients, glass, decorative icons, centered dashboard cards, or chromatic headings.
Colour encodes only interaction, diagnosis, and verification.

The signature move is the **proof thread**: a one-pixel vertical rail connects derivation lines.
Checking advances semantic nodes on that rail; the first broken node becomes diagnostic orange;
an arriving annotation draws a short blue branch into the line and fades back to neutral. Reduced
motion replaces the draw with an immediate state change.

## Interaction and accessibility

- Every primary control and destructive line control has a 44px target.
- One `h1`, one labelled composer, a visible skip link, logical focus restoration, and polite live
  status for checks; policy refusals are assertive alerts.
- Keyboard-only completes practice, repair, transfer, and evidence review.
- At 200% zoom there is no horizontal page scroll and the composer precedes the capability detail.
- Raw LaTeX input remains an explicitly bounded v1 decision; rendered KaTeX has an accessible label.

## Tool surface

Retain the current six tools because they are non-overlapping and agent-selectable: two reads and
four visible writes. `annotate_step` teaches; `propose_step` crosses a materially different consent
boundary and therefore remains separate. The UI stops advertising tool count as the product.

`new_problem` changes contract: it requires a checked, sound, answer-reaching practice round.
Wrong phase returns `invalid_phase` with recovery that tells the agent to help repair the first
broken step and check again. The `availableActions` read surface mirrors that rule.

## Acceptance

- Unit test proves transfer is refused after a broken or incomplete check and allowed after a sound,
  answer-reaching check.
- Tests, typecheck, and production build pass from a clean checkout.
- Laptop viewport shows the composer without scrolling.
- Unsupported browser copy is truthful; registered Chrome copy is truthful.
- Full learner journey, keyboard path, 200% zoom, reduced motion, and real Chrome WebMCP invocation
  are rerun after the final source change.
- No completion claim is made for ChatGPT Desktop unless this exact final build is actually exercised.
