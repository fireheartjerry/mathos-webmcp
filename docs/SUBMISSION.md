# Devpost submission pack

Checked against <https://webmcp.devpost.com/rules> on 2026-08-30.
**Deadline: 2026-09-03, 1:00 PM PDT.** No editing after it.

---

## Readiness

| Requirement | State |
|---|---|
| Working live project at a URL judges can test | **BLOCKED** — `mathos-second-try.fireheartjerry.chatgpt.site` returns **401**. Judges test with ChatGPT's in-app browser or Chrome 149+; they cannot open a 401. Either publish it, or supply credentials on the form (the rules allow authentication "with credentials provided on the submission form"). |
| Public code repository | **BLOCKED** — `github.com/fireheartjerry/mathos-webmcp` returns **404**. See the timing warning below. |
| Repository contains all source | **BLOCKED** — `origin` has only `main` (docs, no product). **~165 commits on `hackathon-build` are unpushed.** |
| Open source licence, detectable at the top of the repo page | **Ready** — MIT `LICENSE`, © 2026 MetaDigits.AI Inc.; `package.json` declares `"license": "MIT"`. |
| Video demo, under 3 minutes, public on YouTube, with audio | **BLOCKED** — does not exist. Script in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md). |
| Text description | **Ready** — below. |
| Newness documentation | **Ready** — history plus `docs/overnight-audit/` distinguish prior work from what this challenge added. |
| Builds and runs | **Ready** — `pnpm build` succeeds, 343 tests pass, typecheck clean. |

### A timing warning about making the repo public

The rules say: **"Don't touch anything: not your Devpost submission, not your repo, not
your live site"** after the deadline, and the submission must itself carry the URL of a
*public* repository.

So "make it public after submission" is safe only if it means **after filling in the
form but before 2026-09-03, 1:00 PM PDT**. Flipping the repo to public *after the
deadline* is both a change to the repo and a submission that pointed at a 404 when it
was judged. The same applies to the 401 on the live site: judging runs 2026-09-04 to
09-21, so it has to be reachable before the deadline and left alone afterwards.

**Nothing in the four blockers is a code problem.** All four are owner actions.

**Before pushing:** the tree was scanned — no `.env`, no keys, no tokens, no bare-IP
hosts. The `18.216.62.146` proxy that once sat in `vercel.json` is gone from every
tracked file.

---

## Scored against the four judging criteria

**WebMCP Leverage** — *"How thoroughly and skilfully does the project use WebMCP? Does
the code reflect genuine effort and a working, non-trivial implementation?"*

- 18 tools, nine read and nine write, one per capability the reducer supports.
- The ceiling was **probed, not guessed**: Chrome 151 accepted 1000 tools with flat
  latency, so the surface is bounded by the product and we say which bound binds.
- Seven platform features probed by execution, including `requestUserInteraction()`,
  which is **absent** — the whole `modelContext` prototype is `ontoolchange`,
  `executeTool`, `getTools`, `registerTool`.
- **Chrome's published tool-author budgets are enforced**, not merely respected: 500 per
  description, 150 per parameter description, 30 per name, and 1.5K per output — the
  last measured and held at runtime.
- Concurrency proven with three agents on one live session at once.

**Execution** — *"a complete, coherent product experience — not just a technical proof of
concept"*

- Three problem families (product, chain, quotient), each a parameterised derivation
  with its own diagnosable error modes, so `list_problem_families` and
  `new_problem(familyId)` lead somewhere.
- 343 tests, typecheck clean, production build green.
- Still narrow by choice: one topic, session-scale state. Said plainly rather than hidden.

**Potential Impact** — *"a credible, specific case for solving a real problem for a real
audience"*

- The problem is specific: a model cannot reliably tell which line of a derivation first
  stopped being true, and a server never sees unsubmitted work at all.
- The audience is specific: someone practising differentiation with an agent beside them.
- The demonstration is falsifiable in 60 seconds — write a wrong third line and watch the
  page mark that line and nothing after it.

**Creativity & Ambition** — *"how creative and novel is the concept and does the project
differ from existing concepts?"*

- The inversion: the page owns the durable model of the learner and the verification; the
  agent supplies only language.
- The submission publishes its own failures — two Chrome features reported as
  accepted-but-not-honoured, and a receipt that discloses the gap its own attribution
  cannot close.

---

## Text description

### What it is

**Second Try** is a mathematics scratchpad where a learner writes real multi-step working
and the page's own computer algebra system finds the first line that stopped being true.
An agent connected over WebMCP can read that working, ask the page to check it, compute
against the page's CAS, write and revise lines, and read a receipt of what happened.

### Why WebMCP is a strong fit

The hard part of tutoring is not explaining. It is knowing *which* step went wrong, in
work that has never been submitted anywhere.

A language model asked to check a derivation will confidently mark a wrong line right. A
server never sees the half-finished work at all. WebMCP is the first arrangement where
the durable, unsubmitted state can stay in the page — which owns it — while any agent
supplies the language.

So the page hands the agent the one thing language models are worst at, reliable symbolic
verification, applied to the one thing a server cannot see: live, unfinished work.

The agent never grades. It cannot. Every verdict on screen is rendered from the return
value of the page's engine, not from anything a model said.

### How it improves the experience

An agent arriving on this page can, without any prior knowledge of the learner:

- read every line written so far and each line's verdict;
- ask the engine which line first stopped following, and get `sound`, `broken`, or
  `could not determine` — a real third answer, never a guess;
- test its own reasoning **before** touching the learner's page, using read-only
  `differentiate_expression`, `evaluate_expression` and `compare_expressions`;
- write, revise or delete lines, and have every one of those actions attributed;
- read a receipt reporting who did what, including `linesWritten: {learner: 0, agent: 5}`
  when the agent did the work.

Every agent we pointed at the page used the read-only mathematics tools unprompted, and
verified its derivative against the page before writing a single line. That behaviour was
not requested in any prompt; the tool descriptions produced it.

### What humans and agents can do together that was not feasible before

Two things.

**A stateless agent can teach against a stateful learner model it does not own.** Before
WebMCP the options were to put the learner model inside the agent — vendor-locked and
gone when the user switches — or to build a competing chatbot. Here the model of the
learner lives in the page and every agent gets the same view of it.

**Provenance survives the collaboration.** Because the page owns the state, it can record
who caused each change and publish that. We ran three agents concurrently against one
live session — a solver, a tutor and an auditor — and the receipt afterwards reported
exactly who wrote what. Collisions were refused with `stale_revision` naming the current
revision; nothing was corrupted.

### Implementation approach

**Eighteen tools, nine read and nine write** — one per capability the reducer supports,
enumerated with file:line citations in `docs/webmcp/capabilities.md`. A test opens every
citation and fails the build if one has drifted.

**The count is bounded by the product, not the platform.** We probed the ceiling: Chrome
151 accepted 1000 registered tools with flat latency and no truncation. Registering to
that ceiling would raise the number and lower the quality, so the surface is exactly as
large as the set of things this product can genuinely do.

**Everything reported about the platform was executed, never assumed.** `get_platform`
probes six WebMCP features live and reports what each one did. Three are real here
(`toolchange`, declarative `<form toolname>`, tool withdrawal via `AbortSignal`). Two are
accepted but silently not honoured (`exposedTo`, `getTools({fromOrigins})`) — which
matters, because a page that believed origin scoping worked would be shipping a security
assumption the browser does not implement. One is partial (annotations beyond the two
hints are dropped without error).

**Safety is in the envelope, not in refusals.** No handler throws — Chrome flattens a
thrown error to a generic `UnknownError` and discards the message, while a returned
envelope survives verbatim. Every write carries `expectedRevision` and `requestId`, so a
stale write is refused and a retry replays instead of double-applying. Every refusal
names the offending argument in `error.field`.

**We changed our own thesis when it did not survive contact.** The page used to refuse
every agent write: *"Only the learner can write, edit, delete, or accept work."* That is
now withdrawn. Agents can do anything a learner can, and what carries the claim instead
is attribution. It is a weaker promise and a truer one — a permission check in a reducer
never bound anything outside the page, while an attribution reaches the evidence a reader
sees.

And we publish the limit of that. **Attribution records who wrote a line, not who worked
it out.** An agent can compute the answer with the read-only tools and tell a person what
to type; that lands as learner work and nothing would show it. An adversarial agent found
this by driving the live page. It cannot be measured, so the receipt discloses it in its
own `limits`, alongside the fact that a session restart destroys earlier rounds.

---

## Notes for whoever writes the submission form

- Lead with the falsifiable demonstration, not the vision: write a wrong third line, press
  Check, watch the page mark *that* line and nothing after it.
- The tool count is a strong differentiator, but the interesting sentence is *"we probed
  the ceiling at 1000 and deliberately did not go there."*
- The honesty is the position, not a caveat. `get_platform` publishing two of Chrome's
  features as not-honoured is the single most distinctive thing in the submission.
