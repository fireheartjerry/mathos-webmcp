# Devpost submission copy — Mathburst

Repository reference for the submitted fields. The live Devpost project is the final source of truth.

**Voice rules:** Simple English. Short sentences. No em dashes in the copy blocks.
No slop words (leverage, seamless, robust, delve, unlock, empower, game-changing).
Facts do the work, not adjectives. Every claim literally true of the product.
Active verbs carry the paragraphs. Each section ends on something the next one pays off.
Every number and every identifier is checked against the source before it goes in.

---

## FIELD: Project name

```
Mathburst
```

---

## FIELD: Elevator pitch (200 char max)

```
Mathburst is a shared live math canvas. A student and an AI tutor edit the same objects through 48 native WebMCP tools; every edit is attributed, and one shared undo history reverses both.
```

---

## FIELD: About the project (story, markdown)

```markdown
## Inspiration

An AI tutor can talk about your math. It cannot touch it.

Your work sits in a photograph, a notebook, or a canvas the model cannot reach.
So the tutor explains around the problem instead of working inside it. It
describes a graph it cannot draw. It suggests a correction it cannot make.

So we moved the mathematics onto the page itself. Then we gave a WebMCP agent its
own tools on that page. Every canvas edit it makes produces the operations our
toolbar already produces. That one rule decided how many tools we
could ship, and which of them a student can undo.

## What it does

Mathburst draws an infinite canvas for mathematics. It serves a student working
at late high school or early undergraduate level, on calculus, transformer
attention, olympiad geometry, and partition congruences. That student writes by
hand, draws, graphs functions, builds geometry, and edits matrices on it.

An AI tutor works the same canvas at the same time, through the WebMCP tools the
page registers with the browser.

Watch one tool call, end to end. The tutor calls `set_matrix_cells` on the matrix
card. WebMCP hands the call to the page. The page turns it into the same typed
edit a student makes by clicking a cell. The reducer applies it. A ring marks the
matrix that changed. The tool ledger records the tool name, and the activity rail
credits the tutor. The student presses undo once, and the tutor's edit reverses.

Undo tests the whole design. An agent edit the student cannot reverse belongs in
a demo, not in a tool.

The 48 split three ways. Twelve carry `readOnlyHint: true` and change nothing.
Twenty-eight commit to the history, so the ledger names the tool, the rail
credits the author, and one undo reverses the edit. The last eight move the
camera, the project library, playback, or history control itself:
`set_viewport`, `focus_objects`, `open_project`, `open_scene`, `create_project`,
`delete_project`, `play_timeline`, `step_history`. `docs/WEBMCP_TOOLS.md` lists
all 48 with their schemas, and the in-product inspector runs any of them with no
agent connected.

Four projects run on that path. One of them ends with the tutor refusing to fix a
mistake it had already found.

## A credible path to real-world impact

Mathburst is submitted by [Mathos AI](https://www.mathos.ai/), an active
[Y Combinator Winter 2024 company](https://www.ycombinator.com/companies/mathos).
Mathos's [Google Play listing](https://play.google.com/store/apps/details?id=com.mathgptpro.mclient)
says its existing AI tutor is trusted by over 2 million students across more than
200 countries.

That reach is not a claim that Mathburst already has two million users. It gives
this prototype a credible distribution and research path: run opt-in pilots with
real learners, then measure time to correction, whether students accept or undo
agent interventions, and whether they retain the concept afterward.

## What you can watch it do

**The tutor marks an error and refuses to fix it.** A handwritten Gamma
recurrence carries a sign mistake. The tutor reads the strokes with
`get_objects`. Then it rings the stroke where integration by parts flips the
sign, and writes a note beside it. Both marks come from `create_objects`. Then it stops. The
student makes the correction. One honest limit: this scene already knows which
stroke to mark. That restraint reflects our design choice, not a guard in the
code.

**One number changes and the mathematics follows.** Change a single entry of the
query matrix. The attention weights move, and they still sum to one. Run a
training step and watch the loss fall. The step saves only when the loss falls
and the target probability rises. The curve records the steps that passed that
test, and drops the ones that did not.

**Weights show up twice.** The three attention weights sum to one, and the
triangle uses those exact numbers as barycentric coordinates for a point. The
tutor moves that point by editing the weights. The tetrahedron beside it carries
a four-weight distribution of its own, seeded from the Gamma masses.

**It says what it has not proved.** The partition scene verifies Ramanujan's
congruence for finite cases and labels the card exactly that. A theorem covers
the general statement, and this build does not prove it.

Four branches of mathematics, and every edit across all four lands in
`dispatchWorldAction`.

## How we built it

One action kernel. A canvas-editing tool call and a toolbar click produce the
same typed operations against the same world reducer. Nothing bypasses it.

Three properties fall out of that single path:

- **Attributed.** The tool ledger names the tool. The activity rail names the
  author of every edit.
- **Undoable.** One press reverses a tutor commit exactly as it reverses a
  student one.
- **Visible.** A ring marks each object the tutor changes, and a toast names the
  tools that ran.

KaTeX renders the mathematics. A custom equation editor and symbol palette keep
it editable. Cortex Compute Engine evaluates it. Everything runs in the browser,
with no backend and no account.

All three properties come from one rule: a person and an agent reach the same
operation by two different routes. The tool rail carries fourteen modes, and the
twelve that create or edit had to obey it.

## Challenges we ran into

**Giving people and agents the same edit path.** Every drawing and editing mode
needed two routes to one operation. Pen, highlighter, eraser, text, equations,
graphs, geometry, matrices, images, shapes, arrows, and frames. One route runs
through the toolbar. The other arrives as a tool call. Resize, rotate, and drag
needed both as well.

**Rejecting false mathematical progress.** A training step saves only when the
loss falls and the target probability rises. We discard a step that would flatter
the demo.

**Naming the boundary of what we proved.** We could have let the partition scene
imply a proof of Ramanujan's congruence. Instead the card verifies finite cases
and says so. We then turned that rule on our own closing narration, and one
sentence did not survive it.

## Accomplishments that we are proud of

We cut a false sentence out of our own film. The closing line said every edit in the
film went through a WebMCP tool. The capture timeline recorded 27
tutor commits and 11 student ones, so the line erased the student, who is half
the point. We rewrote it to name both counts.

We also found the parity leaking where we had never looked. A camera move by the
tutor entered the undo stack. The same pan by a student did not. Only the human
path filtered camera operations out of history. Both paths filter them now.

Every canvas edit, from either side, takes one commit path, and one keystroke
reverses it. A guard runs at load and rejects any tool name over 30 characters.
A budget violation fails before registration instead of vanishing into the
browser.

Twenty-eight of those tools earn their keep for a reason that never mentions the
count.

## What we learned

Attribution and undo matter more than tool count. The 28 tools that commit
through the reducer earn their place for one reason. Each lands in a history a
student can read and reverse. Strip that away and a tool surface collapses into a
chatbot with extra steps.

## What is next for Mathburst

Accounts and sync, so a canvas follows a student across devices rather than
staying in one browser. More subjects on the same kernel, since nothing in the
world model ties it to calculus or geometry. Several agents on one canvas, each
attributed separately.
```

---

## FIELD: Built with (tags, max 25)

```
webmcp, typescript, react, vite, katex, cortex-compute-engine, svg, remotion, canvas, localstorage
```

---

## FIELD: Try it out links

```
https://github.com/fireheartjerry/mathos-webmcp
```

---

## FIELD: Video demo link

```
https://youtu.be/xBAUK71mjGY
```

---

## FIELD: Additional info — why this use case fits WebMCP

```
A chat box fails hardest on mathematics. The work moves, and it lives on a
surface. A student's reasoning takes the shape of a graph, a construction, and a
half-finished line of algebra. None of that survives a description in a message.

WebMCP puts the tools on the page that already owns those objects. The tutor
never receives a picture of the work and sends back a suggestion. It reads the
actual strokes with `get_objects`, then rings the wrong one with
`create_objects`. On a live equation it reads the expression with `inspect_math`
first.

The page also sets the limits. Every canvas edit an agent makes compiles to the
operation the toolbar produces. So the page decides what an agent may do, and the
student keeps undo over all of it.
```

## FIELD: Additional info — how it creates a better user experience

```
A student can ask for help without handing over the work.

The tutor changes the same canvas the student uses. It rings the error where the
error sits. It builds the graph beside the working. Nothing needs a description,
a re-typing, or a rebuild in a chat window.

A ring marks each object the tutor changes, the ledger names the tool that
changed it, and the rail names who made the edit. One press of undo reverses any
of it. So accepting help costs nothing, and the student never risks what they
wrote.
```

## FIELD: Additional info — what people and agents can do together that was hard before

```
Work the same mathematical object at the same time, with equal powers over the
document and one shared history.

Before, an agent could describe a change. Here it makes the change, on the live
object, and the student undoes it. The tutor drags a geometry point and every
dependent construction recomputes. It edits a matrix cell and the attention
weights move. It writes an equation and the equation stays editable.

The reverse holds too. The student edits while the tutor works, and neither side
blocks the other, because both write to one reducer.

Take one thing that failed before. The tutor works on the student's handwriting
as objects, not as a picture. It rings the stroke where the sign went missing.
Then it leaves the correction to the student.
```

## FIELD: Additional info — how WebMCP was implemented

```
The page registers 48 tools with `document.modelContext.registerTool` on load.
`docs/WEBMCP_TOOLS.md` lists all 48 with their schemas.

Each tool carries a typed input schema and an execute handler. The handler never
touches the DOM or component state. A canvas-editing handler compiles its input
into the typed operations the user interface produces, then commits them through
one reducer.

That single decision shapes the rest:

- Reads (`get_world`, `get_objects`, `get_selection`, `get_history`) return the
  live world, so the agent never works from a stale copy.
- Writes (`create_objects`, `update_objects`, `transform_objects`,
  `delete_objects`) travel the same commit path as a toolbar action. The ledger
  names them and one undo reverses them.
- Workflow tools (`reconstruct_problem`, `audit_reconstruction`,
  `construct_geometry`, `graph_expression`) fold several steps into one commit.
  Undo then reverses the whole workflow rather than half of it.
- Lab tools (`set_attention_weight`, `set_barycentric_weights`,
  `train_model_step`, `move_geometry_point`) drive each lab from its own
  controls.
- `set_viewport` and `focus_objects` move the view and never enter the history,
  on the agent path exactly as on the student's. `spotlight_objects` rings what
  the tutor is about to touch without moving anything.

Tool results follow the MCP content shape and stay inside Chrome's budgets: names
at most 30 characters, descriptions at most 500, parameter descriptions at most
150. A guard throws at load when a tool exceeds any limit. A budget violation fails
before registration instead of vanishing into the browser.

The in-product inspector calls the same registered handlers, so anyone can open
it and run any of them with no agent connected.
```

---

## Live Devpost form state (verified 2026-09-04)

- Project is published and submitted to The WebMCP Challenge.
- Live app: <https://mathburst.fireheartjerry.chatgpt.site/>
- Public source: <https://github.com/fireheartjerry/mathos-webmcp>
- Public 2:59 demo with narration and licensed audio: <https://youtu.be/xBAUK71mjGY>
- Project story, 48-tool implementation summary, technology tags, judge instructions, and agent-testing details are saved.
- Native WebMCP testing records Claude using `create_objects`, `get_objects`, `get_history`, and `step_history`; the built-in inspector exercises the identical handlers without an external client.
