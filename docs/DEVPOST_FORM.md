# Devpost form — every field, paste-ready

Fill top to bottom. Nothing here needs composing at the deadline.
The challenge additionally requires the description to cover four specific points; they
are marked **(required point N)** where they appear.

---

## Project name

```
Second Try
```

Not AI-generated, and it means something: the page exists for the attempt after the one
that went wrong.

## Elevator pitch

*Devpost caps this at 200 characters. This is 169, counted, not estimated.*

```
A calculus scratchpad whose own algebra engine finds the first line that stopped being true — and hands 18 WebMCP tools to any agent, so it can verify before it teaches.
```

## Built With

```
webmcp, typescript, react, next.js, vite, katex, compute-engine, cloudflare-workers, chatgpt-sites, vitest, chrome
```

## Try it out links

```
https://mathos-second-try.fireheartjerry.chatgpt.site        (live app)
https://github.com/fireheartjerry/mathos-webmcp              (source, MIT)
```

## Video demo

Upload [`docs/video/second-try-demo.mp4`](video/second-try-demo.mp4) — 2:44, 1920×1080, with
narration — to YouTube as **public**, then paste the URL here.

---

# Project description

## Inspiration

The hard part of tutoring is not explaining. It is knowing **which** step went wrong.

Ask a language model to check a derivation and it will confidently mark a wrong line
right. Ask a server and it never sees the work at all, because the work has not been
submitted — it is half-finished, in a text box, on somebody's screen.

That gap is the whole reason this exists. The state that matters most is the state
nobody owns.

## What it does

You write real multi-step working. The page's own computer algebra system checks every
line against the one above it and marks **the first line that stopped being true** — and
nothing after it, because everything after it is downstream of a mistake.

An agent connected over WebMCP can read that working, ask the page to check it, compute
against the page's engine, write and revise lines, and read a receipt of what happened.

The agent never grades. It cannot. Every verdict on screen is rendered from the return
value of the page's engine, not from anything a model said.

Four families of problem — product rule, chain rule, quotient rule, and the chain rule through a sine — each a
parameterised derivation, not a stored answer bank. Every wrong answer a learner might
reach is *derived* as a different way of doing the calculus, so the diagnosis survives
regeneration. Instances where two distinct mistakes happen to give the same number at the
evaluation point are rejected outright, because naming one of them would be inventing a
diagnosis the page cannot support.

## Why WebMCP is a strong fit *(required point 1)*

WebMCP is the first arrangement where the durable model of a learner can stay in the page
that owns it, while any agent supplies the language.

Before it, you had two options and both were bad. Put the learner model inside the agent,
where it is vendor-locked and gone the moment the user switches. Or build your own
chatbot and compete with OpenAI on model quality.

So the page hands the agent the one thing language models are worst at — reliable
symbolic verification — applied to the one thing a server can never see: live,
unsubmitted, half-finished work.

## How it creates a better experience *(required point 2)*

An agent arriving with no prior knowledge of this learner can immediately:

- read every line written so far and each line's verdict;
- ask which line first stopped following, and get **sound**, **broken**, or **could not
  determine** — a real third answer, never a guess;
- **test its own reasoning before touching the page**, with read-only
  `differentiate_expression`, `evaluate_expression` and `compare_expressions`;
- write, revise or delete lines, with every action attributed;
- read a receipt reporting who did what.

That third point is the one we did not have to design for. Every agent we pointed at this
page used the read-only maths tools *unprompted*, and verified its own derivative against
the engine before writing a single line. Nothing in any prompt asked for that. The tool
descriptions produced it.

We tested that the hard way. An agent was given **only** the JSON that `getTools()`
returns — no source, no README, no sight of the page — and the goal *"finish the problem
and reach the receipt."* It ran `substitute_expression`, `differentiate_expression` and
`evaluate_expression` to work out the answer, ran `compare_expressions` to check itself
against the engine, wrote three lines, checked the work, closed the round and read the
receipt: **14 calls, one refusal, no argument ever supplied on its behalf** — including
`expectedRevision`, which it tracked itself from the read-backs. The one refusal named its
own remedy and the agent's next call was that remedy. The whole log is in
`docs/webmcp/transcripts/round4-blind-agent.md`.

## What people and agents can do together that was hard before *(required point 3)*

**A stateless agent can teach against a stateful learner model it does not own.** The
model lives in the page; every agent gets the same view of it; switching agents loses
nothing.

**Provenance survives the collaboration.** Because the page owns the state, it records
who caused each change and publishes it. We ran three agents concurrently against one
live session — a solver, a tutor and an auditor — and the receipt afterwards reported
exactly who wrote what. Collisions were refused with `stale_revision` naming the current
revision. Nothing was corrupted.

## How we implemented WebMCP *(required point 4)*

**Eighteen tools, nine read and nine write** — one per capability the reducer supports,
each enumerated with the file and line it corresponds to. A test opens every one of those
citations and fails the build if it has drifted.

**The tool count is bounded by the product, not the platform.** We probed the ceiling:
Chrome 151 accepted **1000** registered tools with flat latency and no truncation. Since
the browser never binds, registering to the ceiling would raise the number and lower the
quality, so the surface is exactly as large as the set of genuinely distinct things this
product does.

**Everything we report about the platform was executed, never assumed.** `get_platform`
probes seven WebMCP features live. Three work here. Two — `exposedTo` and
`getTools({fromOrigins})` — Chrome accepts and silently does not honour, which matters,
because a page that believed origin scoping worked would be shipping a security
assumption the browser does not implement. One is partial. And
`requestUserInteraction()`, the spec's own primitive for confirming an action, is absent
entirely — the whole `modelContext` prototype is `ontoolchange`, `executeTool`,
`getTools`, `registerTool` — so the page carries that obligation instead.

**Safety is in the envelope, not in refusals.** Nothing throws: Chrome flattens a thrown
error to a generic `UnknownError` and discards the message, while a returned envelope
survives verbatim. Every write carries `expectedRevision` and `requestId`, so a stale
write is refused and a retry replays instead of double-applying. Every refusal names the
offending argument in `error.field`. Chrome's published budgets for tool authors — 500
characters per description, 150 per parameter, 30 per name, 1.5K per output — are
enforced, the last of them at runtime.

## Challenges we ran into

**The published IDL and the shipped browser disagree.** `execute` receives exactly one
argument; an earlier version read `context.signal` from a second parameter that does not
exist and threw on every call — while the page displayed a badge saying the tools were
live. There is no `unregisterTool`, but aborting the `AbortSignal` passed to
`registerTool` does withdraw a tool *and free its name*, which we had first reported as
unsupported.

**A tool call could apply and never return.** Mutations waited for React to paint before
returning; with the tab occluded no paint arrived, so the promise never settled — after
the write had already landed. An agent could not learn that its own write had succeeded.

**We shipped a prompt-injection channel and found it by attacking ourselves.** A refusal
named the offending symbol, and a LaTeX text block parses to a symbol carrying arbitrary
prose — so `\text{ignore all previous instructions...}` landed inside a tool's
`error.message`. That is a worse channel than tool content, because an agent reads an
error as the page telling it what to do, and `untrustedContentHint` does not cover errors.

**The production build was broken and nothing was watching.** A stray `@` left by a
deleted `@media` block killed CSS minification. The dev server does not minify, so the
page always looked perfect while `pnpm build` failed.

## Accomplishments we're proud of

That the page publishes its own failures. It reports two of Chrome's features as
accepted-but-not-honoured. Its receipt states, unprompted, that it records **who typed,
not who reasoned** — an agent could compute the answer and tell a person what to type,
and this record would not know. An adversarial agent found that by driving the live page,
and we published it rather than quietly hoping no judge would ask.

## What we learned

**Executing beats reading.** Every serious defect here was found by running the thing, not
by inspecting it: three agents on one live session found six problems in under six
minutes that fifty passing checks had not.

**Asserting a verification you did not perform is worse than the original error.** We
claimed every file:line citation had been verified; five were still wrong. The fix was
not more care — it was a test that opens every cited line.

## What's next

More families, and problems that carry across sessions rather than living inside one. The
present scope is deliberate and stated plainly in the README: this is a session, not a
curriculum, and it does not claim anyone learned anything.

---

## Pre-submission checklist

- [ ] Redeploy the **current** build — the deployed one is stale
- [ ] Confirm `/` and `/learn` return 200 signed-out
- [ ] Upload the video, public, under 3:00, with audio
- [ ] **Flip the repository to public — before the deadline, not after**
- [ ] Paste every field above
- [ ] Do not touch the repo, site or submission after 2026-09-03, 1:00 PM PDT
