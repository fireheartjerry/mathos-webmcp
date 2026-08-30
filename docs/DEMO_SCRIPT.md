# Demo script — Second Try

**Required by the challenge:** a public YouTube video, **under 3 minutes**, with audio,
showing a clear demo of the project functioning. Judges score WebMCP Leverage, Execution,
Potential Impact, and Creativity & Ambition.

**Target length: 2:45.** Leaves margin under the hard 3:00 limit.

## Hard rules

- **No title card, no logo, no slide.** Frame one is the product, mid-use.
- The first 20 seconds must contain the whole mechanism, not a preamble.
- Never cut away during a verdict. The badge changing on screen *is* the evidence.
- Every tool name spoken is a real tool, said exactly as it appears.
- Keep the pointer still unless it is explaining something.
- Say nothing the page cannot be seen doing.

## Capture setup

Chrome 151 with `chrome://flags/#enable-webmcp-testing`, window sized so the viewport is
1440×900. `/learn` on the left at ~62% of frame, the agent conversation on the right at
~38%. Open on a **fresh session** so the first problem is the deterministic one and the
heading reads *Product rule*. Narration at ~150 words per minute.

---

## 0:00–0:22 — The mechanism, whole, immediately

**Screen.** The scratchpad with three lines of working already written. The agent pane on
the right. The agent calls `get_scratchpad`, then `check_work`. Line 3 gets its badge:
**does not follow**. Lines below it read *not checked after the unresolved line*.

**Narration.**
> This is a maths scratchpad. The working is real, and half-finished — it has never been
> submitted anywhere, so no server has ever seen it. The agent on the right just asked the
> page to check it. The page found the first line that stopped being true, and marked that
> line and nothing after it.

**Why this shot is first.** It is the falsifiable claim. Everything else is commentary.

---

## 0:22–0:50 — The agent is not the one grading

**Screen.** Slow scroll to the Agent Console. Six group rows with counts: Read 3, Write 3,
Review 4, Session 3, Mathematics 4, Platform 1. Header reads **18 page tools available**.
Open **Mathematics**.

**Narration.**
> Eighteen tools, nine read and nine write. The agent never grades — it cannot. Every
> verdict on screen is rendered from the return value of the page's computer algebra
> system, not from anything the model said.
>
> These four are why. The agent can differentiate, evaluate and compare expressions
> against the page's engine *before* writing anything to a learner's work. Every agent we
> pointed at this page used them unprompted, and checked its own derivative before writing
> a single line.

---

## 0:50–1:20 — The agent teaches the exact line

**Screen.** The agent calls `annotate_step` on line 3. The explanation lands beside that
line, not in the chat. Then the learner rewrites line 3 and presses **Check my work**;
every badge turns sound.

**Narration.**
> The agent explains the step that broke — attached to that line, in the learner's own
> working, not in a chat window the work has to be copied out of.
>
> The learner fixes it themselves. That is the whole product: the page knows which step
> went wrong, the agent supplies the language, and the person does the mathematics.

---

## 1:20–1:50 — Agents can do everything, and the page says who did

**Screen.** The agent calls `add_step`, then `check_work`, then `new_problem`, then
`get_receipt`. Hold on the receipt: `linesWritten: {agent: 5}` and the `limits` list.

**Narration.**
> An agent can do anything a learner can — write lines, rewrite them, delete them, start
> over. This page used to refuse that, and we withdrew the refusal, because a permission
> check in our own code never bound anything outside this page.
>
> What replaces it is attribution. Here the agent wrote every line, and the receipt says
> so, unprompted. It also states what it cannot show: it records who typed, not who
> reasoned. An agent could compute the answer and tell a person what to type, and this
> record would not know. We would rather publish that than imply the number means more
> than it does.

---

## 1:50–2:25 — What this browser actually does

**Screen.** Press **Probe this browser**. Seven rows fill in with statuses and
observations. Rest on `exposedTo` — *accepted but not honoured* — and on
`requestUserInteraction` — *absent*.

**Narration.**
> Every one of these is executed live, not read from a table. Three features work here.
> Two — origin scoping, and cross-origin reads — Chrome accepts and silently does not
> honour, which matters, because a page that believed origin scoping worked would be
> shipping a security assumption the browser does not implement.
>
> And the specification's own primitive for asking a person to confirm an action does not
> exist in this browser at all. So the page carries that obligation instead: a proposed
> replacement waits for the learner to accept or reject it.
>
> We also probed how many tools WebMCP will take. A thousand registered with no
> complaint. So the limit here is not the browser — it is how many genuinely distinct
> things this product can do. Eighteen.

---

## 2:25–2:45 — Close on the honest claim

**Screen.** Back to the finished derivation with every line sound, receipt visible.

**Narration.**
> The page owns the model of the learner, and the verification. The agent supplies the
> language. Before WebMCP you had to put the learner model inside the agent, where it is
> vendor-locked and gone when you switch, or build a chatbot and compete on model quality.
>
> This is a session, not a curriculum, and it proves three families of differentiation
> end to end. It does not claim to know that anyone learned anything — and it says so, on
> screen, in the same type size as everything else it claims.

---

## Shot checklist

| | Shot | Must be visible |
|---|---|---|
| 1 | First break marked | Badge on the failing line, later lines unchecked |
| 2 | Console groups | `18 page tools available`, six counts |
| 3 | Mathematics group open | Four read-only CAS tools |
| 4 | Annotation beside the line | Not in a chat pane |
| 5 | All sound after the rewrite | Every badge changed on camera |
| 6 | Receipt | `linesWritten` with an agent count, and `limits` |
| 7 | Platform probe | Seven rows, at least one `partial` and one `unsupported` |

## What not to do

- Do not speed up a verdict. If the check takes a beat, keep the beat.
- Do not say "AI tutor". The page is the tutor; the agent is the voice.
- Do not show the Devpost page, a terminal, or the repository. Product only.
- Do not claim mastery, proof, or understanding anywhere in the narration.
