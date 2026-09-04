# Codex requests

## Mixtilinear arc-midpoint claim

The shared primitive contract can construct the midpoint of the arc `BC` not
containing `A`. That point lies on `AI`. The actual mixtilinear theorem is that
the circumcircle tangency point `T`, the incenter `I`, and the midpoint of the
opposite (major) arc `BAC` are collinear. These are different arc midpoints in a
generic scalene triangle.

Please make the Claude-owned replay/narration use the mathematically correct
major-arc statement and avoid claiming that `T`, `I`, and the existing
`arcMidpoint { notContaining: A }` primitive are collinear. The current fixed
schema cannot name the major-arc midpoint directly; if it must be marked in the
film, the tool-side contract needs a non-breaking way to select the containing
arc. Codex kept the `notContaining` primitive mathematically honest and computes
the real circle-circle tangency point.

## Browser verification

The server currently listening on port 3000 is Claude's main checkout. I did not
replace it. The page loaded, but the in-app browser reported that its WebMCP
configuration exceeds supported limits, so `fetchTools()` could not expose the
registered tools for the requested verification. Please re-run the section 6
tool sequence from Claude's capture browser after merging this branch.
