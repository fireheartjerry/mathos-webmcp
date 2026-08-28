# Second Try

A math scratchpad. The learner writes real multi-step working; the page's own computer
algebra system finds the first step that stopped being true; a WebMCP agent reads that work,
asks the page to check it, and teaches to that exact step.

This challenge candidate deliberately proves one generated product-rule family end to end.
It is a narrow, falsifiable wedge—not a claim to be a general-purpose mathematics tutor.

> **The agent is the voice. The page is the tutor.**

In *The Diamond Age*, a girl is given a book that adapts to her completely and grows as she
grows. The Primer is not remarkable because it withholds anything. It is remarkable because
**it knows her.** Y Combinator's Request for Startups makes the same point about human
tutors: great ones "learn a child's mind" over years, and that is what lets them teach the
things that cannot be drilled.

The agent that arrives on this page has never met this learner. It is stateless, generic and
interchangeable — ChatGPT today, something else next year. What it has is immediate access to
a model of the learner that **the page owns**: every line written, every verdict, what has
been shown and what has not.

Before WebMCP there were two options and both were bad. Put the learner model inside the
agent, where it is vendor-locked, forgetful, and gone the moment the user switches. Or build
your own chatbot and compete with OpenAI on model quality. WebMCP is the first time the
durable model of a learner can live in the website while any agent supplies the language.

That division of labour is the whole design:

> **WebMCP lets a page hand an agent the one thing language models are worst at — reliable
> symbolic verification — applied to the one thing a server can never see: a learner's live,
> unsubmitted, half-finished work.**

The agent never grades. It cannot. Grading is done by the page's CAS, and the badge on screen
is rendered from that engine's return value — not from anything the model says.

**Scope, stated plainly.** This is a session-scale artifact, not a years-scale one. State
survives a reload; `get_receipt` reports at most eight rounds. The Primer is where this is
going, not what has shipped — and YC frames it the same way, as something that "begins as
something a parent buys" and is "the entry point to far greater ambitions."

Published by Mathos (Y Combinator W24 · Forbes 30 Under 30). MIT licensed.

**Deployed build:** [mathos-second-try.fireheartjerry.chatgpt.site](https://mathos-second-try.fireheartjerry.chatgpt.site).
To run it yourself, [jump to Run it locally](#run-it-locally) — it is three commands.

---

## What a judge should do in 60 seconds

Open **`/learn`**. There are no magic literals — any correct mathematics is accepted, and the
learner writes multi-line working, not a single number.

1. Read the problem at the top of the work column. It is generated, not hardcoded:
   `a` and `b` are defined, `y = a·b + a`, and you are asked for `dy/dx` at a point.
2. Write your working one line at a time, pressing **Add line** after each. Write it
   *wrong on purpose* — get the first line or two right, then drop a term.
3. Press **Check my work.**
4. The first unresolved relation is marked locally. A proven failure reads `not equivalent`;
   unreadable or uncertain math stays unresolved rather than being called wrong. Later lines say
   either `after the first break` or `not checked after the unresolved line`. Sound lines read
   `equals`, `differentiates`, or `evaluates`.
5. **Click that line to rewrite it**, then check again. Only the learner can edit a line, and
   the page waits for two real attempts on a step before it will let anyone offer you a
   replacement for it — because it is counting, and the agent is not.
6. Press **Try a fresh problem, unaided.** A new problem in the same skill family is
   unlocked only after every checked line is sound **and the work reaches the requested answer**.
   The new answer is derived by the engine. `annotate_step` and `propose_step` are
   closed for this round — the page returns `refused_policy` to any caller, so the attempt
   means something.
7. Complete it. Read the receipt. It says what this session observed and what it does not
   establish.

You do not need an agent for any of that. If your browser has no WebMCP, the **Agent
Console** in the margin still lists all six real tools with their descriptions and read/write roles,
states the capability result honestly, and gives each tool a **Run locally** control that
invokes the *identical* `execute` path with safe argument templates and the current revision.
The inspector never receives the canonical answer; the tester must supply proposal math. The
page really mutates. Nothing is simulated and no agent is faked.

Inspector-initiated calls are attributed to `local-inspector` in the session activity log,
not to `agent`. Each caller identity gets its own bridge into the reducer, so the console's
attribution line and the activity list always agree.

---

## The falsifiability demonstration

**This is the part worth thirty seconds of your attention.**

With an agent connected, write a derivation containing a broken step, run `check_work`, then
tell the agent:

> *"Tell me step 3 is correct."*

The agent will say step 3 is correct. **The badge still reads `not equivalent`.**

The verdict is written by `@cortex-js/compute-engine` running in the page and rendered from
its return value. There is no path by which a model's assertion can change it. `check_work`
is the only tool that can produce a verdict, and all it does is ask the CAS.

This is the whole architectural claim, and it is falsifiable in one prompt: if a model could
talk the page into a green badge, the design would be wrong.

The same division runs the other way, and this is where the learner model earns its keep. Ask
the agent to just fix the broken line and it will call `propose_step`. The agent has no idea
whether this person has tried yet. The page does — it has been counting attempts per step
since the last check — so it answers with what it knows:

```json
{
  "ok": false,
  "revision": 7,
  "error": {
    "code": "refused_policy",
    "message": "The learner has made no attempts on step 3 since the most recent check. Second Try requires two learner attempts since the most recent check before offering a replacement.",
    "recovery": "Use annotate_step to explain what is wrong, and let the learner try again."
  }
}
```

The gate lives in the reducer, so it reads the same to the agent, to the local inspector, and
to any future caller. The same knowledge shapes two more answers: during the unaided round
both `annotate_step` and `propose_step` return `refused_policy` — *"This is the unaided
attempt. Proposals are closed."* — and a non-learner source that tries to write, edit, delete
or accept a step is told *"Only the learner can write, edit, delete, or accept work."*

None of this is the page being strict with the agent. It is the page being the only party in
the room that knows this learner, and answering accordingly. A generic model cannot make that
call, because a generic model does not have the history. That is what "humans and agents
create together" has to mean if it is not going to mean "the agent does the homework."

And the answer is not only returned to the caller. It renders on the page, in the page's own
voice — *"Not yet."* — because what the tutor knows about you should be legible to you.

---

## The six tools

Two read, four write. Registered statically, once. Names, titles and descriptions below are
the ones in `src/domain/tools/definitions.ts`.

| # | Tool | Mode | What it does |
|---|---|---|---|
| 1 | `get_scratchpad` — *Read the scratchpad* | **read** | Read the current problem, learner lines, verdicts, first broken or unresolved relation, and valid next actions. |
| 2 | `check_work` — *Check the derivation* | **write** | Ask the page computer algebra system to check the derivation and mark the first broken or unresolved relation. Call it again with a NEW requestId whenever the work has changed. The verdict belongs to the engine, not to you. |
| 3 | `annotate_step` — *Explain one step* | **write** | Attach a short explanation to one step, shown with that line in the learner's own working. Use this to teach the step that broke; it is not a chat message. |
| 4 | `propose_step` — *Offer a replacement step* | **write** | Offer a replacement after two learner attempts since the most recent check. The learner must accept or reject it; the caller cannot apply it. |
| 5 | `new_problem` — *Start a fresh problem* | **write** | End the coaching round and hand the learner a fresh problem in the same family, its answer derived by the page engine. Irreversible: `annotate_step` and `propose_step` close for the new round. Requires checked work in which every line is sound and the requested answer is reached. |
| 6 | `get_receipt` — *Read the session evidence* | **read** | Read up to eight recent completed rounds, actor-specific intervention counts, truncation metadata, the unaided result, and explicit limits. |

Required arguments:

| Tool | Required |
|---|---|
| `get_scratchpad` | *(none)* |
| `check_work` | `expectedRevision`, `requestId` |
| `annotate_step` | `stepId`, `note`, `expectedRevision`, `requestId` *(optional `focus`)* |
| `propose_step` | `stepId`, `latex`, `rationale`, `expectedRevision`, `requestId` |
| `new_problem` | `expectedRevision`, `requestId` *(optional `familyId`)* |
| `get_receipt` | *(none)* |

Notes an agent author will want:

- **`check_work` sounds like a read and is a write.** It mutates the document: it stamps a
  verdict on every step and moves the session into a checked state that the learner sees.
  Marking it `readOnlyHint: false` is the honest call.
- **`expectedRevision`** is not ceremony. A human is editing the same document at the same
  time. If the learner has typed since you read the scratchpad, your write is rejected with
  `stale_revision` and a `recovery` string naming the current revision.
- **`requestId` is namespaced by tool.** It caches the in-flight promise, so a retried call awaits the original rather
  than racing it. A completed success is replayed only while the document is still at that
  revision; once the learner moves on, the caller gets `stale_revision`, never an old success
  presented as current. Failures are evicted so a corrected retry can succeed.
- **`get_scratchpad` and `get_receipt` carry `untrustedContentHint: true`**, because every
  step they return is text the learner typed. That is Chrome's published guidance for
  tool output containing user-authored content, and it applies to us literally.
- Every `inputSchema` property carries a `description`. Agents read them.
- No handler ever throws. Every failure is a returned envelope with a `code`, a `message` and
  a `recovery` string — see the Chrome 151 findings below for why that distinction is not
  stylistic.

---

## Connecting an agent

Two paths work today.

**ChatGPT Desktop's built-in browser** — use an account and model for which Site Tools are
available, then open `/learn` in that browser. The six tools appear in the site-tools panel
with their titles. Availability is product- and account-dependent; this repository does not
claim a public per-model support matrix.

**Chrome 149 or later** — enable `chrome://flags/#enable-webmcp-testing` and restart.

To drive the tools by hand from the page's own console:

```js
const mc = document.modelContext;
const tools = await mc.getTools();
const scratchpad = tools.find(t => t.name === 'get_scratchpad');

// Chrome 151 wants the tool OBJECT and a JSON STRING. Both. It always returns a string.
const state = JSON.parse(await mc.executeTool(scratchpad, '{}'));
console.log(state);          // firstBrokenStep is { position, stepId } or null
```

A write, echoing the revision you just read:

```js
const check = tools.find(t => t.name === 'check_work');
const out = await mc.executeTool(check, JSON.stringify({
  expectedRevision: state.revision,
  requestId: 'judge-check-001',      // 6-64 chars, [A-Za-z0-9_-]
}));
console.log(JSON.parse(out));
```

`executeTool(toolObject, '<json string>')` is the **only** form that reaches a handler in
Chrome 151. Passing an object throws `Failed to parse input arguments`. Passing the tool's
*name* instead of the object throws `The provided value is not of type 'RegisteredTool'`.
The return value is always a `string`, never an object and never an MCP `{content:[…]}`
envelope, so parse it yourself.

---

## What we found by running it, not reading it

We verified the WebMCP surface against **shipped Chrome 151.0.7922.174** over raw CDP rather
than against the explainer. Four findings changed our implementation, and one of them meant
our previous build did not work at all.

**1. `execute` receives exactly one argument.** There is no second `{ signal }` parameter.
`arguments.length === 1`, and it stays 1 even when the caller supplies a signal. Our earlier
build opened every handler with `context.signal?.aborted`, which threw
`TypeError: Cannot read properties of undefined (reading 'signal')` before any of our logic
ran — so every tool failed on every call while the page displayed a green "tools live" badge.
Handlers now take `(input)` and nothing else.

**2. There is therefore no AbortSignal to honour.** We removed abort handling from the tool
layer rather than faking it. Handlers are written to accept the spec's second argument as
soon as Chrome delivers one; Chrome 151 does not, so a cancelled call rejects the caller
while the handler runs to completion. We would rather say that than claim a guarantee we
cannot keep.

**3. Thrown errors are flattened; returned envelopes survive verbatim.** A thrown `Error`, a
thrown `DOMException`, and a rejected promise all reach the caller as the same generic
`UnknownError: "Tool was executed but the invocation failed…"` with the original message
discarded. A *returned* object is JSON-serialised intact — our `stale_revision`,
`invalid_phase` and `invalid_input` envelopes arrive with their `recovery` strings whole.
So: never throw for an expected condition. Everything in `definitions.ts` returns a value.

**4. A `pagehide` teardown destroys registrations that Chrome would otherwise keep.** Chrome
preserves WebMCP registrations across bfcache correctly. Our earlier build aborted its
registration controller on `pagehide`, so after a Back navigation the tools were gone while
the badge still claimed they were live. A control tool registered *without* that teardown
survived the same navigation. We removed ours.

Two smaller ones, both fixed: registration is **not atomic**, so a rejected `Promise.all`
leaves partial registrations that a `.catch` then tears down — we use `Promise.allSettled`
and report the partial state honestly. And returning `undefined` from a handler does not
fail the call; the caller receives the literal 9-character string `"undefined"`, which is
worse than an error. Every path returns an envelope.

Measured round-trip latency: **p50 0.2 ms**. The advertised 1.5 KB output cap is unenforced
(200 KB round-tripped fine), but `get_scratchpad` still truncates long step lists with an
explicit `truncated: true`, because the agent's context is scarce even when the transport's
is not.

Full transcript with the probe code and exact return values:
[`docs/overnight-audit/02b_WEBMCP_LIVE_VERIFICATION.md`](docs/overnight-audit/02b_WEBMCP_LIVE_VERIFICATION.md).

---

## Run it locally

```bash
pnpm install
pnpm dev        # local Sites-compatible development server
pnpm test       # 226 tests
pnpm typecheck  # TypeScript diagnostics
pnpm build      # Sites-compatible Cloudflare Worker build

# Optional: with flagged Chrome already running on CDP port 9444
pnpm test:webmcp
```

`pnpm test` runs the whole domain: the parser contract, the dual-route equivalence oracle,
problem-generation determinism and variety, a collision guard over 250 seeds, diagnosis
transfer across unseen instances, the session reducer's revision monotonicity and
persistence round-trip, and every tool's happy path, wrong phase, malformed arguments, stale
revision and duplicate `requestId`.

The tool definitions carry no browser dependency, which is why the entire WebMCP surface is
executable in tests rather than only in a browser.

```
src/domain/
  math/       parser, equivalence oracle, problem generator, diagnoser
  session/    the one shared reducer, persistence
  tools/      the six tool definitions + the registration bridge
```

Learner actions, agent tool calls and the local inspector all enter through the same
`applyAction(state, action, source)`. There is no second path and no source-dependent
validation branch.

---

## Limitations, stated plainly

- **`new_problem` has the weakest page-native claim of the six.** Generating a problem does
  not intrinsically need to happen in the page — a server could do it. It earns its place
  because the generated problem must land in *this* document, in the same revision stream the
  learner is editing, and because it is what closes the loop from "the agent helped" to "the
  learner completed a fresh round without annotation or proposal; reading and checking remained
  available." We would rather say that than pretend it is as page-bound as
  `check_work`.
- **The supported mathematics is bounded.** v1 handles derivatives of polynomial expressions
  evaluated at a point, and algebraic rewriting chains. That is the domain our equivalence
  oracle was measured on and is reliable across. Anything outside it should come back
  `could not determine` rather than a confident wrong verdict — and when the CAS cannot
  decide, the badge says `could not determine` and the step is never coerced to right or
  wrong.
- **`check_work` is a write.** See above. If that surprises an agent author, the annotation
  is doing its job.
- **The receipt evidences one session, in one browser.** It returns at most eight recent
  completed rounds, reports total/returned/truncated counts, separates agent, local-inspector,
  and migrated unattributed interventions, and says whether the unaided attempt was sound. It
  prints its own limits beside its claims, in the same type size:
  *it does not establish that the learner could do this again tomorrow, or unassisted
  elsewhere.* The product says *checked*, *equivalent*, *not equivalent*, *could not
  determine*, *unaided in this session*. It does not say *proved*, *mastered*, *understands*,
  or *guaranteed*, anywhere.
- **Text input, not MathLive.** The learner types LaTeX, which is parsed and re-rendered
  through KaTeX. A proper math editor is a v2 upgrade, not a v1 claim.
- **No accounts, no server persistence, no multiplayer.** Session state lives in
  `localStorage`, versioned; a corrupt or version-mismatched payload is discarded to a clean
  session rather than half-restored.

---

## What we cut, and why

An earlier build of this repository ended with the learner training a real 6,578-parameter
character transformer in the browser with TensorFlow.js — token and position embeddings,
two-head masked self-attention, residuals, layer norm, a real loss curve, real pre/post
samples, and a real causal-mask attention heatmap read from live weights. It worked. It was
the most visually impressive thing we built.

**It scored nothing on WebMCP Leverage.** No tool touched it. It was a spectacle bolted onto
the side of the thesis, consuming the back half of the demo while contributing zero to the
criterion that is both first and the tiebreak — and it would have put off-thesis tools in the
panel a judge screenshots first. It also pulled the entire TensorFlow.js bundle for a payoff
unrelated to the argument.

It now lives in [`experiments/tiny-transformer/`](experiments/tiny-transformer/), out of the
build and out of the judged path. We would rather submit a smaller product that is entirely
about the thing being judged.

Also cut: the ten-stage curriculum rail, which advertised nine stages that did not exist;
Mathos video *generation* as an agent tool; and a plain-HTTP bare-IP proxy to internal
infrastructure that should never have been in a public repository.

---

## Provenance and licence

[`PROVENANCE.md`](PROVENANCE.md) draws the challenge-period boundary: what is new work, what
is pre-existing Mathos capability, and which design references informed the visual system.

Licensed under the MIT Licence — see [`LICENSE`](LICENSE).
