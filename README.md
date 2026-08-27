# Second Try

A math scratchpad. The learner writes real multi-step working; the page's own computer
algebra system finds the first step that stopped being true; a WebMCP agent reads that work,
asks the page to check it, and teaches to that exact step.

> **WebMCP lets a page hand an agent the one thing language models are worst at — reliable
> symbolic verification — applied to the one thing a server can never see: a learner's live,
> unsubmitted, half-finished work.**

The agent never grades. It cannot. Grading is done by the page's CAS, and the badge on screen
is rendered from that engine's return value — not from anything the model says.

Published by Mathos (Y Combinator W24 · Forbes 30 Under 30).

---

## What a judge should do in 60 seconds

Open **`/learn`**. There are no magic literals — any correct mathematics is accepted, and the
learner writes multi-line working, not a single number.

1. Read the problem at the top of the work column. It is generated, not hardcoded:
   `a` and `b` are defined, `y = a·b + a`, and you are asked for `dy/dx` at a point.
2. Write your working one line at a time, pressing **Add line** after each. Write it
   *wrong on purpose* — get the first line or two right, then drop a term.
3. Press **Check my work.**
4. The **first** line that stopped being equivalent is marked `not equivalent`. Every line
   after it is dimmed and badged `after the first break`, because everything downstream of a
   mistake is downstream of a mistake. Sound lines read `follows` or `differentiates`.
5. Fix that one line. Check again.
6. Press **Try a fresh problem, unaided.** A new problem in the same skill family is
   generated with its answer derived by the engine. `annotate_step` and `propose_step` are
   closed for this round — the page returns `refused_policy` to any caller, so the attempt
   means something.
7. Complete it. Read the receipt. It says what this session observed and what it does not
   establish.

You do not need an agent for any of that. If your browser has no WebMCP, the **Agent
Console** in the margin still lists all six real tools with their schemas, and each has a
**Run** control that invokes the *identical* `execute` path — logged as
`source: 'local-inspector'` and labelled as not-an-agent. Nothing is simulated.

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

The same discipline runs the other way. Ask the agent to just fix the broken line and it will
call `propose_step`. The page refuses until the learner has genuinely attempted that step
twice, and the refusal it returns says exactly why:

```json
{
  "ok": false,
  "revision": 7,
  "error": {
    "code": "refused_policy",
    "message": "The learner has attempted step 3 0 time(s). Second Try does not offer a replacement before 2.",
    "recovery": "Use annotate_step to explain what is wrong, and let the learner try again."
  }
}
```

The gate is enforced in the reducer, so it applies identically to the agent, to the local
inspector, and to any future caller. Related refusals: during the unaided round, both
`annotate_step` and `propose_step` return `refused_policy` — *"This is the unaided attempt.
Proposals are closed."* — and any attempt by a non-learner source to write, edit, delete or
accept a step is refused with *"Only the learner can write, edit, delete, or accept work."*

The page disciplines the agent. That is what "humans and agents create together" has to mean
if it is not going to mean "the agent does the homework."

*Known gap, stated rather than hidden:* the refusal is returned to the caller and is visible
in the agent's tool-result pane and in the Agent Console output, but it is **not yet mirrored
into the learner's margin**. The frozen spec (§3.2) calls for that, and it is not built. The
policy is real; its on-page presentation is not finished.

---

## The six tools

Two read, four write. Registered statically, once. Names, titles and descriptions below are
the ones in `src/domain/tools/definitions.ts`.

| # | Tool | Mode | What it does |
|---|---|---|---|
| 1 | `get_scratchpad` — *Read the scratchpad* | **read** | Read the learner's current problem, every step they have written, each step's verdict, the first step that broke, and what you may do next. |
| 2 | `check_work` — *Check the derivation* | **write** | Ask the page computer algebra system to check the whole derivation and mark the first step that stopped being equivalent. This writes the verdict badges the learner sees; the verdict is the engine's, not yours. |
| 3 | `annotate_step` — *Explain one step* | **write** | Attach a short explanation to one step, shown in the margin beside the learner's own line. Use this to teach the step that broke; it is not a chat message. |
| 4 | `propose_step` — *Offer a replacement step* | **write** | Offer a replacement for one step. The learner must accept or reject it; you cannot apply it. Refused until the learner has genuinely attempted that step. |
| 5 | `new_problem` — *Start a fresh problem* | **write** | Generate a fresh problem in the same skill family, with its answer derived by the page engine, and hand it to the learner unaided. Requires that the current work has been checked. |
| 6 | `get_receipt` — *Read the session evidence* | **read** | Read what this session actually observed: what the learner did, what you did, whether the unaided attempt was sound, and what remains unproven. |

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
- **`requestId`** caches the in-flight promise, so a retried call awaits the original rather
  than racing it. Successful envelopes stay cached; failures are evicted so a corrected retry
  can succeed.
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

**ChatGPT's built-in browser** — on **GPT‑5.6 Sol or Terra**. **Luna has WebMCP disabled.**
Open `/learn` in the in-app browser; the six tools appear in the site-tools panel with their
titles.

**Chrome 149 or later** — enable `chrome://flags/#enable-webmcp-testing` and restart.

To drive the tools by hand from the page's own console:

```js
const mc = document.modelContext;
const tools = await mc.getTools();
const scratchpad = tools.find(t => t.name === 'get_scratchpad');

// Chrome 151 wants the tool OBJECT and a JSON STRING. Both. It always returns a string.
const state = JSON.parse(await mc.executeTool(scratchpad, '{}'));
console.log(state);          // { ok: true, revision, data: { ...steps, firstBrokenStep } }
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
pnpm dev        # http://localhost:4321/learn
pnpm test       # 141 tests
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
  learner did it alone." We would rather say that than pretend it is as page-bound as
  `check_work`.
- **The supported mathematics is bounded.** v1 handles derivatives of polynomial expressions
  evaluated at a point, and algebraic rewriting chains. That is the domain our equivalence
  oracle was measured on and is reliable across. Anything outside it should come back
  `could not determine` rather than a confident wrong verdict — and when the CAS cannot
  decide, the badge says `could not determine` and the step is never coerced to right or
  wrong.
- **`check_work` is a write.** See above. If that surprises an agent author, the annotation
  is doing its job.
- **The receipt evidences one session, in one browser.** It records what happened here: which
  rounds ran, how many checks, how many agent annotations and proposals, whether the unaided
  attempt was sound. It prints its own limits beside its claims, in the same type size:
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
