# Demo script — Second Try

**Required by the challenge:** a public YouTube video, **under 3 minutes**, with audio,
showing a clear demo of the project functioning. Judges score WebMCP Leverage, Execution,
Potential Impact, and Creativity & Ambition.

**Target length: 2:35.** Narration is ~380 words, about 2:32 at 150 wpm, leaving the
rest for held verdicts. Re-count with the command in "Timing" below after any edit.

## Hard rules

- **No title card, no logo, no slide.** Frame one is the product, mid-use.
- The first 20 seconds must contain the whole mechanism, not a preamble.
- Never cut away during a verdict. The badge changing on screen *is* the evidence.
- Every tool name spoken is a real tool, said exactly as it appears.
- Keep the pointer still unless it is explaining something.
- Say nothing the page cannot be seen doing.

## The picture already exists

`docs/images/demo.mp4` is a real screencast of the production build being driven through
the beats below by its own tools — nothing staged for the camera. **2:43 long**, against a
2:37 narration and the 3:00 limit, so the voice fits with margin. Produced by:

```bash
pnpm build && npx vinext start --port 3400
# open http://localhost:3400/learn in the flagged Chrome and make that tab active
node scripts/record-demo.mjs            # FPS=6 HOLD_SCALE=7 for a full-length take
```

So the remaining work is a **voice track**, not a screen recording. Read the narration
below over it, or re-record the picture with different holds if a beat needs longer.

Two things that caught the first attempt out, both now handled in the script: CDP's
screencast only emits frames when the page *paints*, and this product has no animation,
so a first take compressed the whole demo into four seconds — frames are now captured on
a timer. And a background tab does not paint at all, so the tab must be active.

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
> A maths scratchpad. The working is real and half-finished — never submitted, so no
> server has ever seen it. The agent just asked the page to check it, and the page marked
> the first line that stopped being true, and nothing after it.

**Why this shot is first.** It is the falsifiable claim. Everything else is commentary.

---

## 0:22–0:50 — The agent is not the one grading

**Screen.** Slow scroll to the Agent Console. Six group rows with counts: Read 3, Write 3,
Review 4, Session 3, Mathematics 4, Platform 1. Header reads **18 page tools available**.
Open **Mathematics**.

**Narration.**
> Eighteen tools, nine read and nine write. The agent never grades — it cannot. Every
> verdict comes from the page's computer algebra system, not from the model.
>
> These four are why: the agent can differentiate, evaluate and compare against the page's
> engine *before* touching a learner's work. Every agent we pointed here used them
> unprompted.

---

## 0:50–1:20 — The agent teaches the exact line

**Screen.** The agent calls `annotate_step` on line 3. The explanation lands beside that
line, not in the chat. Then the learner rewrites line 3 and presses **Check my work**;
every badge turns sound.

**Narration.**
> The agent explains the step that broke, beside that line, in the learner's own working
> — not in a chat window the work has to be copied out of. The learner fixes it. The page
> knows which step went wrong, the agent supplies the language, the person does the
> mathematics.

---

## 1:20–1:50 — Agents can do everything, and the page says who did

**Screen.** The agent calls `add_step`, then `check_work`, then `new_problem`, then
`get_receipt`. Hold on the receipt: `linesWritten: {agent: 5}` and the `limits` list.

**Narration.**
> An agent can do anything a learner can. This page used to refuse that; we withdrew the
> refusal, because a permission check in our own code never bound anything outside this
> page. What replaces it is attribution — here the agent wrote every line, and the receipt
> says so, unprompted.
>
> It also states what it cannot show: it records who typed, not who reasoned. We would
> rather publish that than imply the number means more than it does.

---

## 1:50–2:25 — What this browser actually does

**Screen.** Press **Probe this browser**. Seven rows fill in with statuses and
observations. Rest on `exposedTo` — *accepted but not honoured* — and on
`requestUserInteraction` — *absent*.

**Narration.**
> Each of these is executed live, not read from a table. Three work. Two — origin scoping
> and cross-origin reads — Chrome accepts and silently does not honour. A page that
> believed origin scoping worked would be shipping a security assumption the browser does
> not implement.
>
> And the spec's own primitive for asking a person to confirm an action is absent here, so
> the page carries that obligation: a proposed replacement waits for the learner.
>
> We also probed how many tools WebMCP takes. A thousand registered without complaint. The
> limit is not the browser — it is how many distinct things this product does. Eighteen.

---

## 2:25–2:45 — Close on the honest claim

**Screen.** Back to the finished derivation with every line sound, receipt visible.

**Narration.**
> The page owns the model of the learner and the verification; the agent supplies the
> language. Before WebMCP that model had to live inside the agent, vendor-locked and gone
> when you switch.
>
> This is a session, not a curriculum. It does not claim anyone learned anything — and it
> says so on screen, in the same type size as everything else it claims.

---

## Timing

Narration length is the binding constraint, and it is easy to overrun by writing well.
Count it rather than estimating:

```bash
python -c "import io,re; s=io.open('docs/DEMO_SCRIPT.md',encoding='utf-8').read(); n=sum(len(l.split()) for l in re.findall(r'^> (.*)$', s, flags=re.M)); print(n,'words ->', round(n/150*60),'seconds at 150 wpm')"
```

The first draft of this script ran to 516 words — 3:26 of pure speech, over the hard
limit before a single pause. Anything above roughly 400 words will not fit.

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
