# 03 — Product Idea Tournament and Ruling

**Author:** Product Strategist, overnight rescue.
**Date:** 2026-08-26. **Deadline:** 2026-09-03, 1:00 PM PDT. **No edits after.**
**Inputs treated as settled:** `01_CURRENT_STATE_MAP.md`, `02_WEBMCP_AND_RUBRIC_AUDIT.md`,
`08_BACKEND_AND_MATH_AUDIT.md`. Nothing in those files is re-derived here.

This document decides **what we build**. It does not decide how to build it.

---

## 0. The scoring frame, stated before any candidate is scored

Stage Two has four equally weighted criteria, **listed in this order**, and the first
applicable criterion breaks ties:

1. WebMCP Leverage  2. Execution  3. Potential Impact  4. Creativity & Ambition

In a field with a few hundred submissions and ten prizes, ties at the top are the expected
outcome, not the exception. **WebMCP Leverage is therefore worth more than 25% in practice**,
because it is scored *and* it is the tiebreak. Everything below weights it ×3.

A second, harder truth from the rules: *"Judges may evaluate based solely on text, images, and
video if they choose."* A concept that only becomes impressive when executed live is a concept
that may never be scored at all.

And the discriminator that decides WebMCP Leverage in the eyes of *this* panel — Nahas wrote an
MCP-B implementation, Rushing owns OpenAI's browser platform, Drasner sits inside Chrome — is
one question, asked of every candidate in §3:

> **What does the PAGE own that a backend MCP server could not possibly own?**

If the answer is "the UI", the project is a remote control with extra steps. Every judge on that
panel has already seen twenty of those.

---

## 1. The current concept, on trial

**"Mathos: From Calculus to Transformers."** One curated calculus mistake unlocks a ten-stage
narrative that ends in the learner training a 6,578-parameter character transformer in
TensorFlow.js.

### 1.1 The case for abandonment (strongest form)

1. **It has no subject matter.** The product's claim is adaptive diagnosis. Its implementation
   is `attempt === '40' | '36' | '8'`. This is not "under-built"; it is a different kind of
   artifact — a scripted walkthrough wearing the vocabulary of a learning system. Repairing it
   is not repair, it is construction. There is no incumbency to defend.
2. **The concept's headline is its weakest axis.** "Calculus to Transformers" is a *narrative*
   promise. Narrative scores under Creativity & Ambition — the **fourth** and last criterion,
   and the last tiebreak. The build spends its most expensive component (TFJS, >500 kB, the back
   half of the demo) buying points on the axis that matters least, and zero on the axis that
   breaks ties.
3. **It is structurally unable to answer the backend question.** Six enum states and three
   string comparisons is a state machine any Express route could hold. The page owns a `useRef`.
   `stale_revision` and `requestId` are excellent engineering wrapped around nothing worth
   guarding, and a judge who reads `webmcp.ts` — this panel will — sees exactly that.
4. **The receipt prints the exploit.** `OBSERVED SEQUENCE 36 → lesson → 8` on screen, next to a
   README instructing the judge to type `36` and `8`. Self-incriminating UI.
5. **The rail lies.** Ten stages advertised, one built, ~17% of every screen, first in reading
   order after the header.
6. **The one honest artifact clashes with the shell.** The embedded Mathos player is blue and
   Inter; the shell is cream, rust and an editorial serif. Photographic evidence that this does
   not look like a Mathos product.
7. **Ten stages is a promise no seven-day build can keep**, so the concept sits permanently in
   deficit against its own framing.

### 1.2 The case for keeping and repairing (strongest form)

1. **The architecture underneath is right and rare.** One `transitionStudio()` shared by human
   and agent; monotonic revisions; `expectedRevision` optimistic concurrency; `requestId`
   idempotency that caches the *in-flight promise*; abort checks; structured errors with
   `recovery` strings; a commit barrier so a tool cannot report success before React has
   painted. Almost no hackathon entry will have any of that, and it is directly what
   "thoroughly and skillfully" means in criterion 1.
2. **The transformer lab is real and finished.** Genuine one-block causal transformer, live loss
   curve, live attention heatmap. Strongest visual asset in the build, and it already works.
3. **The Mathos video embed is real and verified.** Genuine Mathos-hosted Remotion player, 200,
   real SSE generation stream, well-written incremental parser.
4. **Seven days is not much.** Every hour spent on a new concept is an hour not spent hardening.

### 1.3 Ruling on the current concept

**Abandon the concept. Keep the machinery.**

The mechanism — `transitionStudio` + revisions + idempotency + commit barrier + activity log —
is not concept-specific. It is a *co-editing kernel*, and it transfers wholesale to any
candidate below. Point 1 of the defence is therefore not a reason to keep the concept; it is an
asset that survives the concept's death.

Points 2 and 3 are the actual trap. "The transformer lab already works" is sunk-cost reasoning
dressed as pragmatism. The question is not whether it works; it is whether it earns its place
against the four criteria. It does not (§5.3).

The concept is discarded. The kernel is kept.

---

## 2. The tournament

Nine candidates. Weights are stated, not implied: WebMCP Leverage ×3; resistance-to-backend ×2;
Execution / Impact / Creativity / README-alone ×1.5; demo reliability, cost, risk ×1.25;
20-second legibility, anti-AI-tutor, anti-hardcoded, learning value ×1; Mathos uniqueness,
browser-native dependence, 5-second legibility ×0.75; visual wow ×0.5. Total weight 21.5.

For cost and risk, **10 = cheap / low risk**.

### The candidates

| ID | Concept | One line |
| --- | --- | --- |
| **A** | Current concept, repaired | Calculus→Transformers, with a real CAS behind the three string checks. |
| **B** | Diagnose → lesson → transfer, real engine | The existing loop, but problems are generated and answers derived by the CAS. |
| **C** | **Live math scratchpad** | Learner writes a real multi-step derivation; the page's CAS verifies it step by step; the agent reads, annotates and proposes into the learner's actual work. |
| **D** | Video-first | Agent diagnoses, then commissions a Mathos-generated video lesson aimed at that exact misconception. |
| **E** | Radically simple | One math input box that cannot be fooled. One tool. Nothing else. |
| **F** | Radically ambitious | Multiplayer classroom: teacher page + learner pages, cross-origin `exposedTo`/`fromOrigins`, live cohort misconception map. |
| **G1** | **Find-the-Flaw** (invented) | The *agent* writes a derivation containing one planted error; the *learner* hunts it; the page's CAS is the referee. Inverts who is being tested. |
| **G2** | **Pedagogy Firewall** (invented) | The page enforces teaching policy on the agent: it may not reveal an answer, may not write a step until the learner has tried twice, and every refusal is visible. |
| **H** | Teacher worksheet builder (invented) | Teacher and agent co-author a problem set in the page; the CAS validates that every generated item has a clean, unique answer. |

### Scores, part 1 — the judged axes and the discriminator

| ID | WebMCP Leverage ×3 | ¬"just a backend" ×2 | Execution ×1.5 | Impact ×1.5 | Creativity ×1.5 | README-alone ×1.5 |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| A | 4 | 3 | 6 | 5 | 5 | 4 |
| B | 6 | 4 | 7 | 7 | 5 | 6 |
| **C** | **9** | **9** | 7 | 8 | 8 | 8 |
| D | 4 | 2 | 6 | 6 | 6 | 7 |
| E | 5 | 5 | 9 | 5 | 3 | 5 |
| F | 8 | 4 | 3 | 8 | 9 | 5 |
| G1 | 8 | 8 | 6 | 6 | 9 | 7 |
| G2 | 8 | 6 | 7 | 7 | 8 | 8 |
| H | 7 | 3 | 6 | 6 | 5 | 5 |

### Scores, part 2 — legibility, defensibility, deliverability

| ID | 5s | 20s | Wow | Learning | Mathos-unique | Browser-native | ¬AI-tutor | ¬hardcoded | Demo rel. | Cost tonight | Tech risk | **Weighted** |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| A | 3 | 5 | 7 | 4 | 4 | 3 | 4 | 6 | 6 | 7 | 7 | **4.79** |
| B | 5 | 7 | 5 | 7 | 6 | 4 | 5 | 8 | 8 | 7 | 8 | **6.19** |
| **C** | 8 | 9 | 7 | 9 | 9 | 9 | 9 | 9 | 6 | 4 | 5 | **7.87** |
| D | 8 | 7 | 9 | 5 | 10 | 2 | 4 | 5 | 3 | 6 | 3 | **5.07** |
| E | 9 | 7 | 3 | 5 | 6 | 6 | 6 | 8 | 9 | 9 | 9 | **6.28** |
| F | 4 | 5 | 6 | 6 | 6 | 8 | 7 | 5 | 2 | 1 | 2 | **5.36** |
| G1 | 7 | 8 | 6 | 7 | 7 | 8 | 10 | 7 | 5 | 5 | 4 | **7.02** |
| G2 | 5 | 7 | 4 | 8 | 6 | 7 | 9 | 6 | 7 | 6 | 6 | **6.99** |
| H | 6 | 6 | 4 | 5 | 5 | 5 | 6 | 7 | 7 | 5 | 6 | **5.60** |

**Ranking:** C 7.87 · G1 7.02 · G2 6.99 · E 6.28 · B 6.19 · H 5.60 · F 5.36 · D 5.07 · A 4.79

The useful structural result is not that C wins. It is that **C can absorb both of its closest
rivals**: G2 is a policy layer over C's write tools, and G1 is a second mode of the same
scratchpad with authorship reversed. Nothing in the top three is thrown away.

---

## 3. The central question, answered for every candidate

> What does the PAGE own that a backend MCP server could not possibly own?

**A — Current, repaired.** A six-value enum and a boolean. **Nothing.** Any Express route holds
this. Even repaired with a real CAS, the CAS could run on a server; the only page-owned thing
left is which screen is showing. Scored down hard, and correctly.

**B — Diagnose/lesson/transfer with a real engine.** The submitted attempt string and a stage
pointer. **Close to nothing.** A backend receiving `POST /attempt {answer}` has the same
information at the same moment. The CAS being client-side is a *deployment* choice, not an
ownership claim. This is the honest weakness of the obvious rescue plan, and it is why B loses
to C despite being far cheaper.

**C — Live scratchpad.** Four things, none of which a server can have:

1. **The unsubmitted document.** The learner's in-progress derivation — steps typed and never
   sent, half-edited, abandoned, rewritten. A backend sees only what was POSTed. The page has
   the whole draft, keystroke-current.
2. **The live CAS bound to that document.** Not "a CAS" — *the same engine instance holding the
   same expression trees the learner is editing*. `check_work` does not re-parse a string that
   crossed a wire; it evaluates the objects on screen.
3. **A second concurrent writer who is a human being.** `expectedRevision` is only meaningful
   because a person can type between two agent calls. A backend MCP server has exactly one
   writer. Optimistic concurrency is a *browser-only* problem, and solving it is the most
   credible WebMCP-skill signal available to us.
4. **Placement and attention.** An annotation lands in the margin beside line 3, where the
   learner is already looking. A backend can return text; it cannot put text in a place.

**D — Video-first.** **Nothing, and worse than nothing.** The video generator is literally a
remote HTTP service. A tool named `generate_lesson_video` is the textbook definition of "this
should have been a backend MCP server", and we would be handing the judges the phrase.

**E — Radically simple.** The input box and one parse. **A little** — the unsubmitted expression
is genuinely page-owned — but one tool over one field is too small a surface to carry criterion 1.

**F — Multiplayer classroom.** The cross-origin tool-exposure handshake (`exposedTo` /
`fromOrigins`) is real, spec-level, page-only surface — genuinely strong. But the *cohort
misconception map* is a shared database, i.e. exactly a backend. The concept's centrepiece
contradicts its own best argument, and it is undeliverable in the time.

**G1 — Find-the-Flaw.** The referee — the CAS adjudicating a claim the *agent* made — is
page-owned and rhetorically superb. But the artifact under inspection was authored by the model,
so the page's exclusive claim is weaker than C's, where the artifact is the human's and has
never left the device.

**G2 — Pedagogy Firewall.** The policy state (how many attempts the learner has made, what the
agent is currently permitted to do) is page-owned only because the learner's attempts are
page-owned. It **inherits** C's answer rather than having its own. That is precisely why it
belongs inside C.

**H — Worksheet builder.** A worksheet is a document that wants to be saved on a server. **Not
much.** Scored down.

---

## 4. Attacking the winner

Candidate C, the live scratchpad. The most damaging critique I can write:

**4.1 "Nobody types four lines of LaTeX in a three-minute demo."**
The strongest objection, and it lands on Execution — the second criterion. Math input is slow
and fiddly. A video of a human fighting a math editor is a video of a bad product.
*Defence:* the demo does not require the human to author four steps. The scratchpad opens
**already containing a partly-written derivation** — the honest framing of a learner resuming
work, and also the realistic one. The human's on-camera action is a single edit to a single
step. The agent supplies the rest via `propose_step`, which the human accepts with one click.
Total human typing in the demo: under ten characters. **Accepted; mitigated by design, not by
hope.**

**4.2 "Your CAS can be fooled, and then your whole thesis collapses."**
`08` proves it: $\sqrt{x^2}$ vs $x$, $e^{\ln x}$ vs $x$, and $\frac{x^2-1}{x-1}$ vs $x+1$ all
return `true` from `isEqual` while the symbolic difference is not zero. If a judge finds a false
`match`, "the page cannot lie about the math" dies on the spot.
*Defence:* two cheap moves. (a) The dual-route verifier with `uncertain` as a first-class,
visible outcome — any disagreement between the CAS and our independent numeric sampler fails
closed. (b) **Publish the three known-unsound cases in the README.** A team that names its own
engine's limits reads as credible to this panel; a team claiming proof reads as naive. We never
use the word "proof". **Accepted, and converted into a credibility asset.**

**4.3 "Step-to-step equivalence is not correctness."**
A learner can write a chain of perfectly equivalent, perfectly useless lines. And equation-form
steps ($\frac{dy}{dx} = \ldots$) are not the same object as expression-form steps.
*Defence:* split the claim into two honestly-named checks the UI shows separately —
**validity** (each step equivalent to its predecessor) and **progress** (the final step
equivalent to the declared goal). Scope v1 to expression chains with a declared goal. A real
limitation, correctly named; naming it beats papering over it. **Accepted, scoped.**

**4.4 "This costs more than one night."**
A new dependency (MathLive), a web component hostile to SSR, a step-list document model, and a
rewrite of the reducer from a six-value enum to a document. Real.
*Defence:* MathLive is a **v2 upgrade, not a v1 requirement**. v1 ships plain text inputs parsed
by compute-engine and rendered back as normalized LaTeX — identical mathematics, identical
credibility, only different input ergonomics. Ship the step model and the verifier tonight;
upgrade the editor tomorrow. And there are seven days, not one night. **Accepted, sequenced.**

**4.5 "An agent leaving a comment on a line is a fancy toast."**
*Defence:* the leverage is not the annotation. It is `check_work` returning a verdict **the model
could not have computed** — unreliable symbolic verification is the best-documented LLM weakness
in the field — about **state the model could not have seen**, an unsubmitted document. The
annotation is only delivery. If a judge doubts this, they can instruct the agent to declare a
wrong step correct, and the page's badge will still read `mismatch`, because the badge is
written by the CAS, not by the model. **That is a falsifiable, on-camera demonstration, and no
backend MCP server can stage it.** Rejected.

**4.6 "Your concurrency guard will fire on camera and the agent will loop."**
The very thing that makes C's story good — a real second human writer — makes the demo flakier.
Real risk.
*Defence:* this is the honest cost of real concurrency, and it is **demoable as a feature**: type
into step 2 while the agent is mid-call, let `stale_revision` fire, and show the agent re-reading
and recovering. Judges who have implemented MCP will find a clean recovery more impressive than a
happy path. But it is only impressive if it is *tested*, so the eval script must include a
stale-revision recovery case. **Accepted, and promoted from risk to demo beat — conditional on
the eval existing.**

**Verdict: defend, do not switch.** Every objection is either mitigated by design (4.1, 4.5,
4.6), converted into a credibility signal (4.2), or absorbed as a stated scope limit (4.3, 4.4).
None touches the load-bearing claim, which is §3's four-part answer.

---

## 5. The ruling

### 5.1 Final concept

**A math scratchpad where the learner writes real multi-step work, the page's own computer
algebra system finds the first step that stopped being true, and a WebMCP agent — which can read
the work, ask the page to check it, annotate it, and propose a fix the learner must accept —
teaches to that exact step.**

The agent never grades. It cannot: grading is done by the page's CAS, and the verdict is rendered
from the CAS's return value. The agent explains.

### 5.2 Thesis, name, outcome, scope

**One-sentence thesis.**

> WebMCP lets a page hand an agent the one thing language models are worst at — reliable symbolic
> verification — applied to the one thing a server can never see: a learner's live, unsubmitted,
> half-finished work.

**Working name.** **Second Try** (product surface: *the Scratchpad*). The Devpost entry is
already registered as "Second Try by Mathos", and the name is now literally accurate: the page
identifies the one step you broke and you get a second try at that step. Retire "Mathos: From
Calculus to Transformers" entirely.

**Exact learner outcome — the sentence the demo must earn.**

> A learner who has written a wrong four-step derivation is shown, in under a second, the *first*
> step at which their work stopped being equivalent — not merely that their final answer is wrong
> — receives an explanation aimed at that step and no other, corrects that step themselves, and
> then completes a freshly generated problem of the same skill with no agent help at all.

Every clause is verifiable on camera: "first step", "under a second", "that step and no other",
"freshly generated", "no agent help".

**Explicitly out of scope.**

- The transformer lab, in the product (§5.3).
- The ten-stage curriculum rail. Deleted. We ship one skill family and say so.
- Video *generation* as a WebMCP tool. The canonical Mathos video may stay as a static lesson
  asset inside the annotation panel, lazily mounted behind a poster frame so it is never a grey
  box. It is **not** a tool and **not** the centrepiece.
- Multiplayer, cross-origin tool exposure, accounts, server persistence. Session state in
  `localStorage` only, so a refresh mid-demo recovers.
- Handwriting, OCR, image input.
- Arbitrary mathematics. v1 covers **derivatives of polynomial and rational expressions
  evaluated at a point, plus one algebraic-simplification family** — the domain where `08`
  measured the engine as reliable.
- MathLive in v1. Text input, parsed and re-rendered; MathLive is a v2 upgrade if time allows.

**Absorbed from the runners-up.**

- **G2 (Pedagogy Firewall)** becomes a policy layer on the write tools: `propose_step` returns
  `refused_policy` with a `recovery` string until the learner has attempted the step at least
  twice, and the refusal renders on screen. The cheapest available proof of "the app owns the
  pedagogy; the agent must ask permission", which is our Creativity claim.
- **G1 (Find-the-Flaw)** is deferred to a stretch mode, not v1. If it ships, it is one additional
  problem type, not an additional tool.

### 5.3 Ruling on the TransformerLab

**Cut it from the product and from the bundle. Keep the source in the repository under
`experiments/tiny-transformer/`, with a README section titled "What we cut, and why."**

Not deleted, not merely demoted, not integrated. Justified criterion by criterion:

**1. WebMCP Leverage (25%, and the tiebreak).** It contributes **zero** today. Integrating it
would mean tools like `start_training` / `read_attention`, pushing our surface from six to nine,
of which three are about a subject the product is not about. The ChatGPT Site Tools panel is the
**first screenshot a judge sees**, before the product. A tool list where a third of the entries
are off-thesis reads as unfocused to a panel that reads tool definitions for a living.
Integration is therefore *negative* on the criterion that breaks ties, not neutral.

**2. Execution ("a complete, coherent product experience").** A character-level transformer bolted
onto a math scratchpad is the precise opposite of coherent. It also drags >500 kB of TFJS into the
bundle for a payoff unrelated to the thesis, and it currently ends the demo on the string
`"change follows acha pangefus."` Cutting it is a straight gain here.

**3. Potential Impact ("a credible, specific case for a real problem for a real audience — based
on what's demonstrated").** The stated problem is that learners get a step wrong and cannot tell
which one. Training a transformer does not address that problem. It dilutes a specific claim into
a general one, and "specific" is the rubric's own word.

**4. Creativity & Ambition.** The **only** criterion where the lab helps — and it is the last of
four and the last tiebreak. We would be trading points on the deciding axis for points on the
least-deciding one. Bad trade.

Why keep the source rather than delete it: it is real, it was built inside the challenge window,
and one README paragraph — *"we built a working in-browser transformer during this hackathon and
cut it from the submission because it scored nothing on WebMCP Leverage"* — converts a liability
into evidence of editorial judgment. This panel rewards restraint. Cost of executing the ruling:
move a directory, delete a route, drop a dependency from the bundle. Near zero.

---

## 6. The WebMCP tool surface

**Six tools. 2 read, 4 write.** (The ChatGPT panel renders "2 read, 4 write tools" from our
`readOnlyHint` values — that line is itself a scored artifact.)

| # | Name | Purpose (one line) |
| --- | --- | --- |
| 1 | `get_scratchpad` | Read the learner's current problem, every step they have written, each step's verdict, and what the agent may legally do next. |
| 2 | `check_work` | Run the page's CAS over the whole derivation and return the index of the first step that is not equivalent to its predecessor. |
| 3 | `annotate_step` | Attach an explanation to one specific step, in the margin, beside the learner's own line. |
| 4 | `propose_step` | Offer a replacement for one step as a suggestion the learner must accept or reject; the agent cannot commit it. |
| 5 | `new_problem` | Generate a fresh problem in the same skill family, answer derived by the CAS, seeded by the misconception observed in page state. |
| 6 | `get_receipt` | Return the session's evidence trail: what the learner did unaided, what the agent did, and what remains unproven. |

### 6.1 Per tool: page-owned state, why an agent needs it, why it is not an RPC

**1. `get_scratchpad`** — `readOnlyHint: true`, `untrustedContentHint: true`.
*Page state:* the live step list, including steps typed and never submitted; per-step verdicts;
`revision`; the current policy gate.
*Why an agent needs it:* the agent is blind. This is the only way it can see the work.
*Not an RPC:* the payload is a document that has never crossed a network boundary and never will.
A server cannot return what was never sent to it. `untrustedContentHint` is set because every
step is learner-authored text — set it deliberately and say why in the README; that maps 1:1 onto
Chrome's published security guidance, and a Chrome judge will notice.

**2. `check_work`** — `readOnlyHint: false`.
*Page state:* the compute-engine instance holding the parsed trees for the on-screen steps, and
the verdict badges it writes.
*Why an agent needs it:* **because the model cannot do this.** Symbolic equivalence checking is
the canonical LLM failure mode. The page is lending the agent a capability it provably lacks.
*Not an RPC:* it is a write, not a read — it renders `match` / `mismatch` / `uncertain` badges the
human sees at the same instant the agent sees them, and it evaluates the objects on screen rather
than re-parsing a serialized copy. It is also the tool that makes the agent unable to lie: the
badge comes from the CAS's return value, so a judge can instruct the agent to call a wrong step
correct and watch the page contradict it. *(Marked as a write despite "check" sounding read-only.
Deliberate, and worth one README sentence: it mutates visible state.)*

**3. `annotate_step`** — `readOnlyHint: false`. Optional `focus: true` to scroll and select.
*Page state:* the DOM anchor for a step, the annotation column, scroll position, selection.
*Why an agent needs it:* an explanation delivered into a chat panel is not delivered into the
work. Placement is the pedagogy.
*Not an RPC:* the target is a step identity that exists only in this document, and the effect is a
position on a screen a person is currently looking at. A server returns text; it cannot put text
somewhere.

**4. `propose_step`** — `readOnlyHint: false`. Returns `pending_learner_acceptance`, never
`applied`.
*Page state:* a pending-suggestion slot rendered inline as accept/reject, and the policy gate
(attempts made on that step).
*Why an agent needs it:* it is the only way the agent can contribute mathematics — and it is where
the theme lives. The rules ask for humans and agents *creating together*; this makes that
literally true rather than rhetorically true.
*Not an RPC:* the tool **cannot complete its own effect**. It hands a decision to a human and
returns. There is no procedure to call. It is also where the G2 firewall lives: before two learner
attempts, it returns `refused_policy` with a recovery string, and the refusal renders on screen.
The page disciplines the agent.

**5. `new_problem`** — `readOnlyHint: false`.
*Page state:* the misconception signature accumulated from this session's mismatches; the CAS that
derives the new answer.
*Why an agent needs it:* the agent decides when the learner is ready to try unaided. That
judgement is the pedagogical act, and it belongs to the agent.
*Not an RPC — and this is the weakest of the six, stated plainly:* a backend could generate
problems. Its page-native claim rests only on being seeded from page-resident session evidence and
derived by the same engine. It earns its slot on different grounds: it is the tool that retires
"this is hardcoded", the fatal criticism of the current build. **Keep, with the weakness
acknowledged rather than dressed up.**

**6. `get_receipt`** — `readOnlyHint: true`.
*Page state:* the append-only activity log with per-entry `source: learner | agent |
local-inspector`, plus the unaided-transfer result.
*Why an agent needs it:* to summarize honestly at the end of the session, including what was *not*
proven.
*Not an RPC:* it reports attribution of actions across two actors sharing one live document —
attribution only the page observed, because half of those actions were human keystrokes.

### 6.2 Why exactly six

**Not five.** Dropping `propose_step` costs the co-creation theme, and Stage One is a *theme* gate,
not only an API gate — "the agent does the work" is the failure mode the rules are written
against, and `propose_step`'s human-acceptance gate is our defence. Dropping `get_receipt` and
folding it into `get_scratchpad` breaches the **1.5K-character per-tool-output budget**: the step
list with verdicts alone approaches it. The split is forced by the platform, not by a desire to
look sophisticated.

**Not seven.** A `focus_step` / `highlight` tool is a UI verb, not a capability — it collapses into
an optional `focus` parameter on `annotate_step`. A per-step `verify_step` is redundant with
`check_work` and costs an extra round trip to answer a worse question. A `reset` tool tempts the
agent into destroying the learner's work; leave reset to the human.

**Not nine.** Adding transformer tools — see §5.3.

**Registration discipline (it informs the count).** Register all six statically, once, and gate by
returning `invalid_phase` / `refused_policy` with a `recovery` string rather than by registering
and unregistering. Explainer issue #262 documents that unregistering destroys the *reason* a
capability disappeared; Chrome's best practices say static registration should be the default.
Two lines in the README saying so demonstrate that we read the spec, not a blog post.

---

## 7. The no-WebMCP problem

**The default judge browser has no WebMCP.** Today that judge sees a normal web app and a 10 px
grey line, and scores criterion 1 — the criterion that breaks ties — at zero. This is the single
highest-leverage unsolved problem in the submission, and it is solved on the page, not in the
README.

Four layers, in order of value.

### 7.1 Remove the barrier where possible — the origin trial token

Register the deployed origin for the WebMCP origin trial and ship the token as
`<meta http-equiv="origin-trial" content="…">`. If accepted, and if the end milestone covers
September 2026 (both currently **unverified** — check the trial page), `document.modelContext`
exists in stock Chrome 149+ with no flag, and the judge's Path B collapses to "open the URL".
Highest infrastructure ROI available. Do it first; do not depend on it.

### 7.2 Make the WebMCP layer a permanent, visible product surface — the Agent Console

Render an **Agent Console** panel on every load, in every browser, regardless of support. It
always shows the six tools with their real `title`, `description` and read/write annotation —
read from the same objects passed to `registerTool`, never a hand-maintained copy — plus the live
`revision` and the activity log.

Its header renders the **verbatim feature-detection result**:

- Supported → **"WebMCP: 6 tools registered with this browser."** Real agent calls stream into the
  log tagged `source: agent`.
- Not supported → **"This browser does not expose WebMCP. `document.modelContext` is
  undefined."** Then, selectable as text: the flag URL, and the ChatGPT-desktop instruction
  including **GPT-5.6 Sol or Terra**. A judge on Luna sees nothing and concludes we are broken —
  that one sentence may be the highest-leverage line in the entire submission.

### 7.3 Let the unsupported judge actually run the tools — the local inspector

In the unsupported state, each tool row gets a **Run** button that invokes **the exact same
`execute` function** the browser would invoke, with the same argument validation and the same
envelope. Not a mock, not a replay: the identical code path, called by a click instead of by
`document.modelContext.executeTool`.

Honesty constraints, non-negotiable, because dishonesty here would be worse than the problem:

- It is never called an agent, an assistant, or a simulation.
- The panel is labelled **"Local tool inspector — no agent connected."**
- Every locally-invoked call is logged with `source: local-inspector`, visually distinct from
  `source: agent`.
- The support banner above it still says, plainly, that this browser has no WebMCP.

This converts the worst failure mode into the demo. A judge on stock Chrome clicks `check_work`,
watches the envelope come back with `first_broken_step: 3`, and sees the badge on step 3 turn red.
They have now seen the tool contract, the page-owned state, and the human-visible effect — and can
score criterion 1 from evidence rather than from our claims.

### 7.4 Carry all four criteria in static artifacts — for the judge who never opens it

The rules permit judging from text, images and video alone. Budget as if that is what happens.

- **The first image in the README** is the ChatGPT Site Tools panel reading **"Available site
  tools (6) — 2 read, 4 write"**, side by side with the scratchpad showing step 3 red and the
  agent's annotation in the margin. That one image carries WebMCP Leverage, Execution and Impact
  simultaneously.
- **The second image** is a `check_work` envelope, verbatim JSON, next to the UI state it produced
  — tool contract and page-owned state in one frame.
- **The video's first fifteen seconds** show the human path with no agent at all (progressive
  enhancement is the stated WebMCP philosophy, and the rules reward a complete product), then the
  agent path, then the stale-revision recovery, then the unaided fresh problem.
- **An eval script in the repo** — ten prompts, expected tool sequences, including a
  stale-revision recovery case. The organizers' resources page and Chrome's best-practices page
  both push evaluation-driven development; almost no entrant will have one, and it is readable
  without running anything.

---

## 8. Stated risks of this ruling

1. **Scope.** C is materially more expensive than B. Mitigation: v1 is text input, one skill
   family, four-to-six-step chains. MathLive and Find-the-Flaw are explicitly v2.
2. **The CAS is not sound.** Three known false-`true` cases. Mitigation: dual-route verifier,
   `uncertain` as a visible first-class outcome, limitations published in the README. Never say
   "proof".
3. **The concurrency guard fires on camera.** Mitigation: rehearse it as a demo beat and cover it
   in the eval script.
4. **The origin trial may be unavailable.** Mitigation: §7.2–7.4 are designed to work without it.
5. **The local inspector could be misread as faking agency.** Mitigation: the four honesty
   constraints in §7.3. If any of them cannot be met, cut the Run buttons and keep the panel
   read-only.
