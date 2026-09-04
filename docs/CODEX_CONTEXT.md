# Reviewer context for the framing work

This is the full review this project is being built against, in the reviewer's own
terms, plus what has been done about each point and what is still open. It is written
for the `codex/framing` round (docs/CODEX_PROMPT_4.md), because framing is where nearly
all of this feedback actually lands and the previous rounds went better with more of
the picture rather than less.

The reviewer watched a 2:56 cut frame by frame and gave thirteen frame-specific notes
plus three general ones. Direct quotes are marked.

---

## The through-line

Mathburst is an infinite canvas where a learner and an AI tutor edit the same document
through 48 WebMCP tools. The film is not a mockup: every call in it is a real tool call
against the real product, screen-recorded in one take. The submission's whole argument
is *an agent edit the student cannot reverse is a demo, not a tool*, so anything the
film claims must be literally true on screen.

The surviving spine after two scenes were cut:

    gamma density -> attention -> training -> geometry -> barycentric -> matrix

---

## Frame-by-frame notes

**1. Everything too small.** *"the first thing i notice is that everything is really
small and zoomed out, making it hard to see text and widgets."* True of every frame,
not one. Also: the opening handwriting sat in the bottom-right corner and should be
centre or top-left.
→ Cause was an additive margin in `viewportForBounds`: an 800x560 card was inflated to
1440x1200 before fitting and solved to zoom 0.71. Replaced with coverage fractions; a
card now fills ~61% of canvas width, 70% of height. **This is now yours to own.**

**2. The circle marked nothing.** The tutor's "I'll circle where your sign is lost"
ringed empty canvas between terms. Also the ink ran under the agent console.
→ Fixed by deriving the position from the captured strokes: mapped through
`cropAndFit`, then separated fraction bars from operators by testing for digits above
*and* below. The minus is stroke 42 at world (849, 330).

**3. Pans went too far.** Content was left hanging half in frame. *"instead of panning
it top left, pan it completely left because that's more realistic."*
→ The world is now one horizontal strip on a 1000px pitch, so acts exit stage-left and
the camera only ever pans right.

**4 and 6. Widgets covering each other.** Raised twice.
→ `check-layout.mjs` now fails on widgets closer than 80px. It found six problems on
first run, two of which were deliberate (a shape *ringing* a card, an arrow
*connecting* two), so it distinguishes connectors from widgets. **The residue is a
framing problem, not a layout one — neighbours intruding at frame edges.**

**5. The builds were fades, not construction.** *"it just looks like you sort of fade
it in and then you trace the graph out. The tracing of the graph is fine, but I don't
like fading in as the primary build… it should be built from the ground up… like a
bunch of mini pixel construction workers."* Wanted: load the empty frame first, then
parameters sliding up, bouncing, settling.
→ This was your C1/D2 work. Curve tracing was explicitly kept because the reviewer
likes it.

**7. Zoom-out reveals are GOOD — keep them.** *"I like how you zoom out because, while
zooming out, you display the other widgets, which shows that all this is done on one
canvas. This sort of zooming-out transition, I support it."* But: after a widget
spawns, zoom back in, because at the wide framing the text is unreadable. Also the
agent console's own text is hard to read.
→ **Directly relevant to you: `establish` must be a genuinely different shot from
`feature`, and the film must return to a readable framing afterwards.**

**8. Training should be a real run,** several steps with teaching between, and
interacting with a widget should spawn explainer widgets around it.
→ Thirteen sequential gradient steps now (loss 1.015 → 0.054); explainer sub-frames
spawn beneath a widget joined by real arrows.

**9. The geometry was wrong.** *"the circles are not tangent… the spiral centre
constructs itself independently. I think the geometry is actually just incorrect."*
Wanted contest-grade figures — Sharky-Devil / mixtilinear family.
→ Your C2/D1 work. Now exact to 1.62e-14 across 300 random triangles.

**10. Widgets feel disconnected.** Each scene should open by naming itself and its
lineage from the previous one, in both voice and on-canvas LaTeX.
→ Partly done: a concept map joins each widget to the one that produced it with the
reason written on the join.

**11. The parity act demonstrated nothing.** It claimed the learner resizes a shape by
its handles, that the tutor erases its own circle, that one undo brings it back — and
none of it was shown. *"It would be helpful if your cursor literally went to the undo
button and clicked it."*
→ The cursor now travels to the rail and clicks Undo, then Redo. The timeline records
three human commits where it recorded one.

**12. The simplex needed to look 3D and be rotatable by tool.**
→ Your C3 work. That scene has since been cut from the picture (see below).

**13. The matrix scene was blocked and over-zoomed,** and after a push-in the film must
return to a standard framing or the animation is unwatchable.
→ **Yours.**

---

## The three general notes

**G1 — one standard zoom, and push in at the cursor.** *"We need just a general zoom.
I think we should have a standard zoom where one frame is just taking up as much space
as we would like it to… When you zoom in, though, I want you to zoom in on where the
cursor is."* Zoom-out transitions are still wanted, deliberately.
→ **This is F1. It is the single most-repeated piece of feedback in the whole review.**

**G2 — educational sub-frames.** The agent should spawn smaller frames around a widget
when something meaningful changes, connected like a flow chart, and the narration
should acknowledge them.
→ Implemented, demonstrated once.

**G3 — a graph of interconnectedness.** Arrows between widgets with agent-written
explanations of why they relate.
→ Implemented as the concept map.

---

## What changed since the review

Two scenes were cut from the picture — simplex/tetrahedron and partitions/Ramanujan —
to buy time for the rest. They are **cut from the film, not the product**: both labs
are still built and driven off-canvas, because `set_simplex_view` and
`set_partition_view` are called nowhere else and a naive cut would have taken the
ledger to 46/48 and falsified the central claim. Your C3 orbit work still ships.

The film is at **2:58.5 against a hard sub-3:00 cap**, with ~1.5s of margin. That
matters for framing: a fix that adds camera moves has no runtime to spend, and a fix
that makes shots tighter is effectively free. If a constraint can only be satisfied by
adding time, say so rather than assuming there is room.

---

## Why you are getting all of this

The framing complaints were patched one at a time and each capture surfaced another —
small, too small, covered, blocked, too far in, too far out. Read as a list they are
obviously one problem seen from six angles. The narration had the same shape and a
solver fixed it properly, taking silence from 20.5s to 60.9s and worst-case drift from
14.2s to 3.9s. Framing deserves the same treatment, and the review above is the
specification it should satisfy.
