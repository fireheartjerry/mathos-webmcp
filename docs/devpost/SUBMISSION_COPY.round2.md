# Devpost submission copy — Mathburst

Single source for every field. Edit here, paste to Devpost at the end.

**Voice rules:** Simple English. Short sentences. No em dashes in the copy blocks.
No slop words (leverage, seamless, robust, delve, unlock, empower, game-changing).
Facts do the work, not adjectives. Every claim literally true of the product.

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

Your actual work sits in a photograph, a notebook, or a canvas the model has no
way to reach. So the tutor explains around the problem instead of working inside
it. It describes a graph it cannot draw. It suggests a correction it cannot make.

We wanted the page itself to hold the mathematics, and we wanted a WebMCP agent to
edit it directly.

## What it does

Mathburst is an infinite canvas for mathematics. It is built for a student
working at late high school or early undergraduate level, on calculus, linear
algebra, and olympiad geometry. The student writes by hand, draws, graphs
functions, builds geometry, and edits matrices on it.

An AI tutor works on the same canvas at the same time, through 48 WebMCP tools the
page registers with the browser.

Here is one tool call, end to end. The tutor calls `set_matrix_cells` on the
attention head. WebMCP hands the call to the page. The page turns it into the same
typed edit a student makes by clicking a cell. The reducer applies it. A ring
marks the matrix that changed. The activity rail records the tool name and marks
the tutor as the author. The student presses undo once, and the tutor's edit
reverses.

That last sentence is the whole project. Undo is the proof. An agent edit that a
student cannot reverse is a demonstration, not a tool.

Every tool that changes the canvas takes that same path. The 48 fall into twelve
groups. Six of them read or aim: 3 world reads, 3 context reads, 3 control tools,
5 tutoring, and 6 project and navigation tools. A read never enters the history,
because it changes nothing.

The other 28 write, and every write is undoable. They are 4 object edits,
2 reconstruction, 3 mathematics, 5 ink and shapes, 4 text and math editing,
4 animation, and 6 lab controls. Every tool is listed with its schema in `docs/WEBMCP_TOOLS.md`. The
in-product inspector runs any of them with no agent connected.

## What you can watch it do

Four projects test the same collaboration across different kinds of mathematics.

**The tutor finds an error and refuses to fix it.** A handwritten Gamma recurrence
has a sign mistake. The tutor reads the ink, circles the exact place where
integration by parts flips the sign, and writes a note beside it. Then it stops.
The student makes the correction. A tutor that can edit your work is only useful
if it knows when not to.

**One number changes and the mathematics follows.** Change a single entry of the
query matrix. The attention weights move, and they still sum to one. Run a
training step and watch the loss fall. The step is saved only when the loss falls
and the target probability rises. The graph cannot lie to you.

**The same weights appear twice.** Three attention weights that sum to one are
also barycentric coordinates for a point in a triangle. The tutor moves the point
using the weights from the transformer scene. A fourth weight lifts the triangle
into a tetrahedron, and its lattice becomes a partition table.

**It says what it has not proved.** The partition scene verifies Ramanujan's
congruence for finite cases and labels the card exactly that. The general
statement is a theorem, and not one proved here.

## How we built it

One action kernel. A tool call and a toolbar click produce the same typed
operations against the same world reducer. Nothing bypasses it.

Three properties fall out of that single path:

- **Attributed.** The activity rail names the tool and the author of every edit.
- **Undoable.** One press reverses a tutor commit exactly as it reverses a student
  one.
- **Visible.** A ring marks changed objects and a toast names the tools that ran.

KaTeX and MathLive render editable mathematics. Cortex evaluates it. All of it
runs in the browser, with no backend and no account.

## Challenges we ran into

**Giving people and agents the same edit path.** Every drawing and editing tool
needed two routes to one operation. Pen, highlighter, eraser, text, equations,
graphs, geometry, matrices, images, shapes, arrows, and frames. One route is the toolbar. The other is a tool
call. Resize, rotate, and drag needed both as well.

**Rejecting false mathematical progress.** A training step is saved only when the
loss falls and the target probability rises. A step that would flatter the demo is
discarded.

**Naming the boundary of what we proved.** It would have been easy to let the
partition scene imply a proof of Ramanujan's congruence. The card verifies finite
cases and says so.

## What we learned

Attribution and undo matter more than tool count. The 28 tools that change the
canvas are only worth something because each one lands in a history a student can
read and reverse. A tool surface without that is a chatbot with extra steps.

## What is next for Mathburst

Persistence and accounts, so a canvas follows a student across sessions. More
subjects on the same kernel, since nothing in the world model is specific to
calculus or geometry. Several agents on one canvas, each attributed separately.
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
Mathematics is the case where a chat box fails hardest. The work is spatial and
live. A student's reasoning is a graph, a construction, and a half-finished line of
algebra. None of that survives being described in a message.

WebMCP puts the tools on the page that already owns those objects. The tutor does
not receive a picture of the work and send back a suggestion. It calls
`inspect_math` on the actual equation, then `annotate_object` to mark the exact
term that is wrong.

The page is also the right place to set limits. Every tool compiles to the same
operation the toolbar produces. So the page decides what an agent can do, and the
student keeps undo over all of it.
```

## FIELD: Additional info — how it creates a better user experience

```
A student can ask for help without handing over the work.

The tutor changes the same canvas the student is using. It circles the error where
the error is. It builds the graph beside the working. Nothing has to be described,
re-typed, or rebuilt in a chat window.

Every change is marked and attributed as it happens. One press of undo reverses
any of it. So accepting help costs nothing. The student never risks
losing what they wrote.
```

## FIELD: Additional info — what people and agents can do together that was hard before

```
Work on the same mathematical object at the same time, with equal powers and one
shared history.

Before, an agent could describe a change. Here it makes the change, on the live
object, and the student can undo it. The tutor drags a geometry point and every
dependent construction recomputes. It edits a matrix cell and the attention
weights move. It writes an equation and the equation stays editable.

The reverse also holds. The student edits while the tutor is working, and neither
side blocks the other, because both write to the same reducer.

One example that was not possible before. The tutor reads a student's
handwriting. It finds the exact stroke where a sign was lost. It circles that
stroke. Then it leaves the correction to the student.
```

## FIELD: Additional info — how WebMCP was implemented

```
The page registers 48 tools with `document.modelContext.registerTool` on load.

Each tool has a typed input schema and an execute handler. The handler never
touches the DOM or component state directly. It compiles its input into the same
typed operations the user interface produces, then commits them through one
reducer.

That is the whole design, and the rest follows from it:

- Reads (`get_world`, `get_objects`, `get_selection`, `get_history`) return the
  live world. The agent never works from a stale copy.
- Writes (`create_objects`, `update_objects`, `transform_objects`,
  `delete_objects`) go through the same commit path as a toolbar action. They are
  attributed and undoable.
- Workflow tools (`reconstruct_problem`, `audit_reconstruction`,
  `construct_geometry`, `graph_expression`) do several steps as one commit. Undo
  then reverses the whole thought rather than half of it.
- Per-widget tools (`set_attention_weight`, `set_barycentric_weights`,
  `train_model_step`, `set_matrix_cells`) drive each lab from its own controls.
- Camera tools (`focus_objects`, `set_viewport`, `spotlight_objects`) let the
  agent direct attention without changing the work.

Tool results follow the MCP content shape and stay inside Chrome's budgets: names
under 30 characters, descriptions under 500, parameter descriptions under 150. A
guard throws at load if a tool exceeds any limit. A tool the browser would
silently drop fails loudly for us instead.

The in-product inspector calls the same registered handlers, so anyone can open it
and run any of the 48 tools with no agent connected.
```
