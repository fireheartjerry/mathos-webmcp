# Rounds — minimal UI and near-zero motion

Baseline (round 0): **23/100**, all gates PASS.

## Round 1 — score 23 → 59 (+36)
**Reviewer:** subagent, fresh context, blind to the rubric
**Accepted:** 9 · **Rejected:** 2 · **Deferred:** 2

### Changes
- Deleted 13 keyframes, 41 animation declarations, 55 motion transforms → C1
- One duration (80ms), one easing, transitions restricted to colour → C1
- Rewrote the landing figure as one frame; it had been a CSS state machine whose
  frames all rendered at once once motion was removed → C1, C3, C7
- Verdict at the end of each landing row, which earns the row's width → C7
- Hoisted the session reset and offered it inside the tab-conflict notice → gates
- Strip a leading line label (`y =`, `dy/dx =`) before parsing → gates, and the
  interface stopped refusing its own instruction
- Removed the relation track, the CTA's second underline, the wordmark's
  permanent ink rule → C3
- Spoken form for LaTeX in accessible names → C8
- Added WebMCP platform probes → C5

### Rejected findings
- "Rows are wide, content clumps left; narrow the figure" — narrowing would have
  made the equations cramped without removing the void. Putting the verdict at
  the row's end fixed the same defect and stated the product's claim.
- "'WebMCP unavailable' is the first phrase in every screenshot" — true, and it
  is also accurate. Rewording it to read better would trade honesty for tone,
  which is the one trade this product does not make.

### Deferred (carried forward)
- Panel gains a nested scrollbar when a tool is expanded at 1280×800
- Three competing left/right edges on `/`

## Round 2 — score 59 → ?
### Changes
- Removed the last transform; the mark centres arithmetically → C1
- Removed the tool-name underline, the wordmark's resting rule, the CTA arrow → C3
- Bound the prose measures; 68ch rendered as 86 characters in this serif → C8
- Top-aligned the landing shell → C7

### Correction to my own evidence
The emptiness check walked element leaves, so a paragraph containing a `<strong>`
contributed only the `<strong>`'s box and read as blank. I reported 440px to the
round-1 scorer on that basis and it scored C7 at 4/8 accordingly. Measured by text
Ranges plus elements that actually paint, the true figure was **240px**. The
number was wrong before the fix, not because of it.
