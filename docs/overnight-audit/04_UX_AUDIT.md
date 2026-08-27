# UX audit — four actors

## Learner

The learner needs one obvious loop: read the problem, write one true line at a time, check,
repair the first break, then try a fresh problem. The inherited inspector competed with that
loop and made the page feel like a protocol demonstration. The rebuild makes the derivation the
primary object, keeps learner-only actions explicit, and places agent teaching directly beside
the relevant line.

Remaining risk: a completely cold page cannot demonstrate the diagnosis until work exists. The
demo should therefore open on seeded learner work, not spend its first twenty seconds typing.

## Agent

The agent needs a compact state summary, narrow verbs, explicit revisions, and recovery strings.
It must never be able to write, edit, delete, or accept learner work. The final surface provides
exactly that. A proposal is distinct from an annotation because it crosses a stronger agency
boundary.

Remaining risk: ambiguous prompts depend on client-side tool selection behavior. Tool
descriptions are intentionally imperative and state their valid phase, but ChatGPT Desktop still
needs a real eligible-client run.

## Judge

- **3 seconds:** serious Mathos mathematical instrument; no splash or dashboard chrome.
- **5 seconds:** live learner derivation is the hero.
- **10 seconds:** page-owned verdicts and first-break semantics are visible.
- **20 seconds:** an agent annotation/proposal and the learner's next action are legible.
- **60 seconds:** repaired work unlocks a fresh unaided problem and bounded transfer evidence.

The raw six-tool inventory remains available but collapsed. This keeps the technical proof one
click away without forcing a learner to stare at schemas.

## Mathos product owner

The product now has a credible path into the existing Mathos experience: the proof ledger is a
high-signal interaction primitive, not a hackathon-only chat shell. It is fast, deterministic,
local-first, visually restrained, and careful about learning claims.

## Important copy decisions

- “Receipt” is replaced on the learner surface by **Immediate transfer signal**.
- “Connected” is never inferred merely from browser support.
- Unsupported browsers say **WebMCP unavailable here**.
- The result says “evidence consistent with immediate transfer,” never mastery or independent
  reasoning.
