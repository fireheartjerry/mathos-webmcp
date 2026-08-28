# Current product forensics

Baseline: branch `hackathon-build`, commit `5becf7f`, captured 2026-08-27 before new production edits.

## Product and state map

The product wedge remains strong: a learner writes a calculus derivation one line at a time; a deterministic page engine checks equivalence, localizes the first break, and owns the verdict; a WebMCP agent may read, check, annotate, or propose, but cannot silently mutate learner work or overrule the checker; a fresh transfer problem tests immediate unaided performance.

Reachable visual states observed:

- landing transaction and mechanism explanation;
- mathematics engine loading and clean empty scratchpad;
- WebMCP connected, partial/failed/unavailable contracts;
- learner-authored steps, editing, removal, and check actions;
- sound, broken, uncertain, unreadable, and downstream verdict styles;
- first-break diagnosis and line-local agent annotation;
- policy refusal and recovery;
- pending proposal with accept/reject ownership;
- completed practice and transfer transition;
- locked agent coaching during transfer;
- immediate-transfer evidence and bounded limitations;
- session activity, persistence, stale revision, and conflict behavior.

## What is genuinely differentiated

1. **The derivation is real state.** It is not a screenshot, terminal decoration, or agent transcript.
2. **Truth is independently owned.** The computer-algebra/equivalence layer can contradict the model.
3. **The first break is local.** Downstream consequences are dimmed rather than accused.
4. **Consent is modeled.** An annotation and a replacement proposal cross different boundaries; proposals require learner attempts and explicit resolution.
5. **Provenance is durable.** Learner, agent, and local-inspector actions are distinguishable.
6. **Transfer is unaided.** The system tests a fresh related problem instead of awarding a completion badge.
7. **The no-WebMCP product remains complete.** The agent layer is progressive enhancement rather than the only path.

These survive the re-audit and should be made more visually dominant.

## Rendered visual diagnosis

### Landing

The first viewport is calm and legible, and the demonstration is real. However, it now reads as a polished anti-slop template:

- tracked uppercase “WEBMCP CHALLENGE · MATHOS” eyebrow;
- a hairline immediately below it;
- oversized aphoristic “The agent cannot… Only the page can” contrast;
- two editorial columns separated by another hairline;
- paper/ink/rust palette and near-zero elevation;
- a generic three-column “why” row beginning below the fold.

The proof ledger demonstrates the right mechanism but is framed like a magazine evidence exhibit. The visual thesis is “serious editorial proof,” not yet “a mathematical document that two actors can change under independent verification.”

### Scratchpad

The work is understandable, but the 380px permanent margin makes a hackathon inspector structurally equal to the learner’s mathematics. “Page Capability” and “Session Activity” reproduce the section-kicker/rule grammar and make the interface resemble an audit dashboard. On mobile this content moves far below the line it concerns.

The line-local diagnosis, proposal, and transfer mechanics are the strongest surfaces. The global rail is the weakest.

### Visual inventory

- Ten `.kicker` uses across the principal landing and scratchpad components.
- A global three-part section opener explicitly documented as “Use it everywhere.”
- Repeated `<hr class="rule">` separators on all major surfaces.
- Paper `#FAFAF7`, rust path color, hairlines, no shadow, and editorial columns are frozen as a Sarsa-derived system.
- Status badge/tag components use pill geometry in the landing proof, derivation, tool list, and inspector.
- No shadcn/Base Nova, Lucide, purple/gradient/glass/glow, or `transition: all` fingerprint.
- Archivo is Mathos-compatible and self-hosted; KaTeX retains appropriate mathematical serif glyphs.

## Source and behavior diagnosis

### Preserved engineering strengths

- `document.modelContext`, not the deprecated navigator API.
- Six distinct tool contracts with typed input, annotations, revision guards, idempotency, bounded output, and visible consequences.
- Reducer-owned state transitions and explicit actor source.
- Strict persistence validation and fail-safe restoration.
- Proposal attempt gate and explicit accept/reject action.
- Transfer unlock only after checked, sound, complete practice.
- MathML/accessibility output through KaTeX.
- Reduced-motion CSS and JavaScript behavior.
- No hidden backend or remote-model simulation.

### Visual-system source risks

- The token header freezes the prior “Mathos × Sarsa” reconciliation as authority even though the new evidence directly questions that bundle.
- “The three-part section opener. Use it everywhere” is exactly the kind of repeated default the new audit must retire.
- The current CSS grew by additive patches and contains duplicate selector eras; a redesign should consolidate, not append a third aesthetic layer.
- The permanent rail and activity layout are structural decisions embedded in CSS rather than state-proximity decisions.
- Loading has a token-level shimmer class, but the visible cold state primarily uses a text sentence; a coherent line-level pending state remains underdesigned.

## Responsive and interaction baseline

| Variant | Evidence | Result |
|---|---|---|
| 1440 connected cold | `before/01-webmcp-connected-cold.png` | No overflow; permanent 380px evidence rail dominates |
| Diagnosis through receipt | `before/02`–`09` | Full tool-driven journey succeeds |
| 1440 no WebMCP | `before/10-webmcp-unavailable.png` | Honest fallback |
| 1280 / 1024 / 768 / 390 | `before/11`–`14` | No horizontal overflow; rail becomes remote on narrow layouts |
| 125 / 150 / 200% equivalents | `before/15`–`17` | No page-level horizontal overflow |
| Reduced motion | `before/18-reduced-motion.png` | Media query matches; transitions collapse to 1ms |
| Landing 1440 / 390 | `before/19`–`20` | Legible, but editorial cluster persists and mobile pacing becomes long |

The baseline still needs durable keyboard-focus, stale/conflict, loading, and long-content screenshots in the final matrix. Existing source/tests indicate support, but indirect evidence is not counted as a completed screenshot requirement.

## Current risk register

| Severity | Finding | Why it matters | Required response |
|---|---|---|---|
| High visual/identity | Warm-editorial + broadsheet anti-slop cluster | The latest official guidance explicitly identifies this as a new context-free default; the system was adopted from a reference rather than generated from the math interaction | Replace the page-wide style grammar; retain only elements that become mathematical structure |
| High UX | Evidence is spatially separated from its derivation line | Weakens diagnosis, provenance, and mobile comprehension | Move evidence and proposals into a line-local margin/expansion |
| Medium UX | Capability/activity rail competes with work | Judge tooling outranks the learner task | Make capability trace contextual and history on demand |
| Medium visual | Repeated pills and tracked-caps labels | Converts every state into dashboard chrome | Use plain relation/status text and sentence-case document phases |
| Medium copy | Aphoristic oppositional hero | A real mechanism is turned into a fashionable slogan pattern | Demonstrate one check/proposal/accept transaction above the fold |
| Medium maintainability | Layered duplicate CSS | Future states may drift between old and patched rules | Consolidate tokens and component rules during implementation |
| Medium evidence | No recruited learner or AT-user evaluation | Automated and expert audits cannot prove usability | State as a limitation; do not claim universal accessibility or learning efficacy |

## Verdict before redesign

The implementation is functionally sophisticated and substantially honest. The previous “unresolved AI-slop failures: 0” statement is no longer defensible. The current shell has **one high identity risk and five medium visual/UX/evidence risks**. The solution is not a cosmetic palette change: the derivation must become the organizing material, and machine evidence must move next to the mathematical claim it qualifies.

