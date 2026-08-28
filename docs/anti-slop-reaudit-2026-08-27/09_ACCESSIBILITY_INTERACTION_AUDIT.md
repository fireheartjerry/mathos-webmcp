# Proof Margin accessibility and interaction audit

Date: 2026-08-27

## Result

Approved after repair. The final local build passed 226 tests, typecheck with zero errors, and a production build. Visual interaction checks ran in a new tab in the user's installed Chrome profile.

## Verified behaviors

- Mathematical correctness is expressed in text and symbols, never by color alone.
- Each proof-line button has an accessible name containing the learner's expression.
- Cancel, remove, proposal decisions, fresh-problem creation, and reset return focus to a stable nearby control.
- Agent and local-inspector interventions are announced politely and preserve actor attribution.
- Composer failures expose `aria-invalid` and a stable described-by relationship until the learner resolves them.
- Keyboard focus is visibly outlined and not covered by sticky UI.
- Proposal math remains bounded and keyboard-scrollable when it exceeds its container.
- 320 px reflow has no page-level horizontal overflow; proof evidence stays adjacent to its line.
- Reduced-motion preference suppresses ornamental transitions and smooth scrolling.
- Loading and no-script states explain the unavailable controls and provide a reload/recovery path.
- Dense receipt JSON is contained, scrollable, and secondary to the learner task.

## Known boundary

The responsive zoom rows use equivalent CSS-width pressure. They verify reflow, not literal browser zoom telemetry. Connected WebMCP remains untested until the Chrome profile exposes `document.modelContext`.
