# Devpost submission copy — Mathburst

Single source for every field. Edit here, paste to Devpost at the end.

**Voice rules:** Simple English. Short sentences. No em dashes in the copy blocks.
No slop words (leverage, seamless, robust, delve, unlock, empower, game-changing).
Facts do the work, not adjectives. Every claim literally true of the product.
Active verbs carry the paragraphs. Each section ends on something the next one pays off.

---

## FIELD: Project name

```
Mathburst
```

---

## FIELD: Elevator pitch (200 char max)

```
A math canvas where a student and an AI tutor edit the same document. One undo history reverses them both.
```

---

## FIELD: About the project (story, markdown)

```markdown
## Inspiration

An AI tutor can talk about your math. It cannot touch it.

Your work sits in a photograph, a notebook, or a canvas the model cannot reach.
So the tutor explains around the problem instead of working inside it. It
describes a graph it cannot draw. It suggests a correction it cannot make.

So we moved the mathematics onto the page itself. Then we handed a WebMCP agent
the same 48 tools our own toolbar calls.

## What it does

Mathburst draws an infinite canvas for mathematics. It serves a student working
at late high school or early undergraduate level, on calculus, linear algebra,
and olympiad geometry. That student writes by hand, draws, graphs functions,
builds geometry, and edits matrices on it.

An AI tutor works the same canvas at the same time, through 48 WebMCP tools the
page registers with the browser.

Watch one tool call, end to end. The tutor calls `set_matrix_cells` on the
attention head. WebMCP hands the call to the page. The page turns it into the
same typed edit a student makes by clicking a cell. The reducer applies it. A
ring marks the matrix that changed. The activity rail records the tool name and
credits the tutor. The student presses undo once, and the tutor's edit reverses.

That last sentence carries the whole project. Undo proves it. An agent edit a
student cannot reverse makes a demo, not a tool.

Every tool that changes the canvas takes that same path. The 48 split three ways.
Twelve carry `readOnly: true` and change nothing. Twenty-nine commit through the
reducer, so the rail attributes each one and one undo reverses it. The last seven
drive navigation, playback and the history itself: `open_project`, `open_scene`,
`create_project`, `delete_project`, `focus_objects`, `play_timeline`,
`step_history`. `docs/WEBMCP_TOOLS.md` lists all 48 with their schemas, and the
in-product inspector runs any of them with no agent connected.

Four projects put that path under load. One of them ends with the tutor refusing
to fix a mistake it found itself.

## What you can watch it do

**The tutor finds an error and refuses to fix it.** A handwritten Gamma
recurrence carries a sign mistake. The tutor reads the ink, circles the exact
place where integration by parts flips the sign, and writes a note beside it.
Then it stops. The student makes the correction. Restraint runs on a mechanism
too: `annotate_object` marks the canvas, and no write tool touches the student's
strokes.

**One number changes and the mathematics follows.** Change a single entry of the
query matrix. The attention weights move, and they still sum to one. Run a
training step and watch the loss fall. The step saves only when the loss falls
and the target probability rises. The graph cannot lie to you.

**The same weights appear twice.** Three attention weights that sum to one also
fix a point inside a triangle as barycentric coordinates. The tutor moves that
point using the weights from the transformer scene. A fourth weight lifts the
triangle into a tetrahedron, and its lattice becomes a partition table.

**It says what it has not proved.** The partition scene verifies Ramanujan's
congruence for finite cases and labels the card exactly that. A theorem covers
the general statement, and this build does not prove it.

Four branches of mathematics, and every edit across all four lands through one
single function.

## How we built it

One action kernel. A tool call and a toolbar click produce the same typed
operations against the same world reducer. Nothing bypasses it.

Three properties fall out of that single path:

- **Attributed.** The activity rail names the tool and the author of every edit.
- **Undoable.** One press reverses a tutor commit exactly as it reverses a
  student one.
- **Visible.** A ring marks changed objects and a toast names the tools that ran.

KaTeX and MathLive render editable mathematics. Cortex evaluates it. Everything
runs in the browser, with no backend and no account.

One rule paid for all three properties: a person and an agent reach the same
operation by two different routes. Twelve families of drawing and editing tools
had to obey it.

## Challenges we ran into

**Giving people and agents the same edit path.** Every drawing and editing tool
needed two routes to one operation. Pen, highlighter, eraser, text, equations,
graphs, geometry, matrices, images, shapes, arrows, and frames. One route runs
through the toolbar. The other arrives as a tool call. Resize, rotate, and drag
needed both as well.

**Rejecting false mathematical progress.** A training step saves only when the
loss falls and the target probability rises. We discard a step that would
flatter the demo.

**Naming the boundary of what we proved.** We could have let the partition scene
imply a proof of Ramanujan's congruence. Instead the card verifies finite cases
and says so. We then turned that same rule on our own demo reel, and it cost us
a number we had already written down.

## Accomplishments that we are proud of

We caught ourselves overclaiming and fixed it on camera. An early cut of the film
said it used all 48 tools. The activity ledger inside that same cut showed 18. We
rewrote the line to match the ledger, because a number a judge can count beats a
number we would rather report.

Twelve toolbar families and 48 registered tools now share one commit path, and
one keystroke reverses either side of it. A guard runs at load and throws when a
tool name passes 30 characters, so Chrome never drops one in silence.

The retraction taught us more than the count did.

## What we learned

Attribution and undo matter more than tool count. The 29 tools that commit to the
canvas earn their place only because each one lands in a history a student can
read and reverse. Strip that away and a tool surface collapses into a chatbot
with extra steps.

## What is next for Mathburst

Persistence and accounts, so a canvas follows a student across sessions. More
subjects on the same kernel, since nothing in the world model depends on calculus
or geometry. Several agents on one canvas, each attributed separately.
```

---

## FIELD: Built with (tags, max 25)

```
webmcp, typescript, react, vite, katex, mathlive, cortex-compute-engine, svg, remotion, canvas
```

---

## FIELD: Try it out links

```
https://github.com/fireheartjerry/mathos-webmcp
```

---

## FIELD: Video demo link

```
TBD: YouTube URL once uploaded
```

---

## FIELD: Additional info — why this use case fits WebMCP

```
A chat box fails hardest on mathematics. The work moves, and it lives on a
surface. A student's reasoning takes the shape of a graph, a construction, and a
half-finished line of algebra. None of that survives a description in a message.

WebMCP puts the tools on the page that already owns those objects. The tutor
never receives a picture of the work and sends back a suggestion. It calls
`inspect_math` on the actual equation, then `annotate_object` to mark the exact
term that went wrong.

The page also sets the limits. Every tool compiles to the operation the toolbar
produces. So the page decides what an agent may do, and the student keeps undo
over all of it.
```

## FIELD: Additional info — how it creates a better user experience

```
A student can ask for help without handing over the work.

The tutor changes the same canvas the student uses. It circles the error where
the error sits. It builds the graph beside the working. Nothing needs a
description, a re-typing, or a rebuild in a chat window.

A ring and the activity rail mark every change as it lands. One press of undo
reverses any of it. So accepting help costs nothing, and the student never risks
what they wrote.
```

## FIELD: Additional info — what people and agents can do together that was hard before

```
Work the same mathematical object at the same time, with equal powers and one
shared history.

Before, an agent could describe a change. Here it makes the change, on the live
object, and the student undoes it. The tutor drags a geometry point and every
dependent construction recomputes. It edits a matrix cell and the attention
weights move. It writes an equation and the equation stays editable.

The reverse holds too. The student edits while the tutor works, and neither side
blocks the other, because both write to one reducer.

Take one thing that failed before. The tutor reads a student's handwriting. It
finds the exact stroke that lost a sign. It circles that stroke. Then it leaves
the correction to the student.
```

## FIELD: Additional info — how WebMCP was implemented

```
The page registers 48 tools with `document.modelContext.registerTool` on load.

Each tool carries a typed input schema and an execute handler. The handler never
touches the DOM or component state. It compiles its input into the typed
operations the user interface produces, then commits them through one reducer.

That single decision shapes the rest:

- Reads (`get_world`, `get_objects`, `get_selection`, `get_history`) return the
  live world, so the agent never works from a stale copy.
- Writes (`create_objects`, `update_objects`, `transform_objects`,
  `delete_objects`) travel the same commit path as a toolbar action. The rail
  attributes them and one undo reverses them.
- Workflow tools (`reconstruct_problem`, `audit_reconstruction`,
  `construct_geometry`, `graph_expression`) fold several steps into one commit.
  Undo then reverses the whole thought rather than half of it.
- Per-widget tools (`set_attention_weight`, `set_barycentric_weights`,
  `train_model_step`, `set_matrix_cells`) drive each lab from its own controls.
- Camera tools (`focus_objects`, `set_viewport`, `spotlight_objects`) aim the
  agent's attention. They move the camera, never the objects.

Tool results follow the MCP content shape and stay inside Chrome's budgets: names
under 30 characters, descriptions under 500, parameter descriptions under 150. A
guard throws at load when a tool exceeds any limit. A tool the browser would drop
in silence fails loudly for us instead.

The in-product inspector calls the same registered handlers, so anyone can open
it and run any of the 48 tools with no agent connected.
```
