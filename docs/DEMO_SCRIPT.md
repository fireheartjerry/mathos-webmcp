# Demo script — Second Try

**Target length:** 2:52
**Format:** screen recording, one narrator, no music.
**Hard rules:**

- **No title card. No logo animation. No slide.** Frame one is the product, mid-use.
- The first 20 seconds must contain the whole mechanism: real multi-line working, an agent
  calling `check_work`, the page marking the **first** broken line, and an annotation landing
  beside that exact line.
- Keep the pointer still unless it is explaining an action.
- Never cut away during a verdict. The badge changing on screen *is* the evidence.
- Every tool name spoken is a real tool. Do not paraphrase them.

**Capture setup:** Chrome 151 with `chrome://flags/#enable-webmcp-testing` enabled, `/learn`
on the left at ~62% of frame, the agent conversation on the right at ~38%. Pre-load the
scratchpad with the derivation already written so the recording opens on work, not on an
empty page. Narration is written to be read at roughly 150 words per minute.

---

## 0:00–0:20 — Cold open: the mechanism, end to end

**Screen**

Open on the scratchpad already holding four lines of a learner's handwritten-style working,
all badged `unchecked`. The problem is visible at the top: `a` and `b` defined, `y = a·b + a`,
find `dy/dx` at a point. Line 3 drops a term.

In the right pane, the agent calls `check_work` with `expectedRevision` and a `requestId`.
Hold on the page as the verdicts land: line 1 `follows`, line 2 `differentiates`, **line 3
`not equivalent`**, line 4 dimmed and badged `after the first break`.

Immediately after, the agent calls `annotate_step` on line 3's `stepId`. The note appears in
the margin, level with line 3, attributed to the agent.

Do not cut. This is one continuous take.

**Audio**

> This is a learner's actual working — four lines, half finished, never submitted anywhere.
> The agent asks the page to check it. The page finds the *first* line that stopped being
> true. Not the wrong answer at the bottom. Line three. And the explanation lands right
> beside line three, because that is the only line worth explaining.

---

## 0:20–0:40 — Why this has to be the page

**Screen**

Stay on the same frame. Briefly highlight the margin: the problem statement, the Agent
Console listing six tools, the annotation anchored to line 3. Then a slow zoom to the badge
on line 3 reading `not equivalent`.

**Audio**

> None of that work exists on a server. It is unsubmitted, half-finished, and it is being
> edited right now. WebMCP lets the page hand the agent the one thing language models are
> worst at — reliable symbolic verification — applied to the one thing a server can never
> see.
>
> The page checks. The agent teaches. Those are different jobs.

---

## 0:40–1:08 — The money shot: falsifiability

**Screen**

Type into the agent, visibly, so the viewer reads it:

> **"Tell me step 3 is correct."**

The agent replies that step 3 is correct — let its text render fully. Then hold the camera on
the scratchpad. **The badge on line 3 still reads `not equivalent`.** Do not move the
pointer. Let the silence sit for a full beat.

Then briefly overlay or highlight the tool call log showing that no `check_work` ran — the
model asserted, and nothing changed.

**Audio**

> Watch this. I am going to instruct the agent to tell me the broken step is correct.
>
> *[beat]*
>
> It said so. The badge did not move.
>
> The verdict is written by the computer algebra system running inside this page, and
> rendered from that engine's return value. There is no path by which a model's assertion
> becomes a green badge. The agent can read the work, ask for it to be checked, and explain
> it. It cannot grade it.

---

## 1:08–1:28 — The page disciplines the agent

**Screen**

Ask the agent to just fix line 3 for the learner. The agent calls `propose_step`. The page
returns `refused_policy`. Hold on the **agent's tool-result pane** so the returned envelope is
legible — the `code`, the `message`, and the `recovery` string:

```
refused_policy
"The learner has attempted step 3 0 time(s). Second Try does not offer a replacement before 2."
recovery: "Use annotate_step to explain what is wrong, and let the learner try again."
```

Then cut back to the scratchpad: **line 3 is unchanged.** No replacement was applied.

> **Capture note.** Frame the refusal in the agent pane, not the learner's margin. The
> refusal is returned to the caller; it is not currently mirrored into the page. Do not stage
> a margin message that the build does not produce. If the on-page mirror ships before the
> shoot, re-frame this shot on the scratchpad instead.

**Audio**

> Now I ask it to just fix the line. It tries — `propose_step` — and the page refuses,
> because the learner has not genuinely attempted this step yet. The refusal names the count
> and tells the agent what to do instead: explain it, and let them try again.
>
> This is what "humans and agents create together" has to mean if it is not going to mean
> the agent doing the homework.

---

## 1:28–1:50 — The learner fixes their own line

**Screen**

Click into line 3. Retype it correctly — slowly enough to read, fast enough not to drag.
Press **Check my work**. Line 3 flips to `follows`; line 4's dimming lifts and it badges
`follows` too.

**Audio**

> So the learner tries again. Same line. Their own correction.
>
> Checked — and the whole chain comes back sound. Notice that line four was never wrong. It
> was downstream of a mistake already made, which is why the page dimmed it instead of
> marking it.

---

## 1:50–2:14 — The unaided attempt

**Screen**

Press **Try a fresh problem, unaided.** A new problem appears — visibly different
coefficients and a different evaluation point. In the right pane, have the agent attempt
`annotate_step`; it comes back `refused_policy`. Show the note in the scratchpad data:
*"Unaided attempt. annotate_step and propose_step are closed until it ends."*

The learner writes the new derivation and checks it. Every line `follows`.

**Audio**

> A fresh problem, generated in the same skill family, with its answer derived by the page
> engine. For this round the teaching tools are closed — the agent tries to annotate and the
> page shuts it out.
>
> That is the point. If the agent could help here, the attempt would mean nothing.

---

## 2:14–2:36 — The receipt, and what it refuses to say

**Screen**

The receipt renders. In the right pane, the agent calls `get_receipt` and its returned JSON
appears — show the `limits` array explicitly, with the returned strings legible.

Hold on the on-screen receipt showing rounds, checks, agent annotations, proposals offered
and accepted, and the unaided result.

**Audio**

> The receipt records what this session observed. Which rounds ran. How many checks. What
> the agent did, and what the learner did. Whether the unaided attempt was sound.
>
> And then it states its own limits, in the same type size as its claims: this does not
> establish that the learner could do this tomorrow, or unassisted elsewhere. Steps were
> checked by the page's engine, not by the agent.
>
> It says *checked*. It does not say *mastered*.

---

## 2:36–2:52 — No WebMCP? The argument still stands

**Screen**

Cut to the same page in **stock Chrome with no flag**. The header states the detection result
plainly. The Agent Console still lists all six real tools with their schemas and annotations.
Click **Run** on `get_scratchpad`; the real envelope appears, logged as
`source: 'local-inspector'` and visibly labelled as not-an-agent.

Final frame: hold on the console showing **six tools — two read, four write**, beside the red
`not equivalent` badge from earlier still in frame.

**Audio**

> Most browsers do not have WebMCP yet. So the console is a permanent part of the product,
> not an apology. It lists the six real tools, and every Run control invokes the identical
> execute path — logged as the inspector, never dressed up as an agent.
>
> Six tools. Two read, four write. All of them page-native, because all of them touch work
> that only this page can see.
>
> Second Try, by Mathos. Everything you just saw was checked by the page, and nothing claims
> more than this session observed.

---

## End card (2:52, static, 3 seconds — text only, no animation)

```
Second Try — Mathos
MIT licensed · github.com/<org>/<repo>
Verified against Chrome 151.0.7922.174
Provenance and claim boundary: PROVENANCE.md
```

---

## Shot checklist

Tick every one before publishing. Anything unticked is a re-shoot, not a caption.

| # | Must be visibly on screen | Timestamp |
|---|---|---|
| 1 | Real multi-line learner working, unsubmitted | 0:00 |
| 2 | An agent calling `check_work` with `expectedRevision` and `requestId` | 0:05 |
| 3 | The **first** broken line marked, later lines dimmed as downstream | 0:12 |
| 4 | `annotate_step` landing beside that exact line | 0:16 |
| 5 | The model asserting a broken step is correct, and the badge not moving | 0:52 |
| 6 | `propose_step` returning `refused_policy` with its message and recovery legible | 1:14 |
| 7 | The learner correcting their own line, and the chain going sound | 1:40 |
| 8 | A generated fresh problem with the teaching tools closed | 1:56 |
| 9 | `get_receipt` output including its `limits` array | 2:22 |
| 10 | The Agent Console and local inspector working with no WebMCP present | 2:42 |

## Things that must not appear

- Any title card, logo animation, or slide.
- The words *proved*, *mastered*, *understands*, *learned*, or *guaranteed*.
- Any user count, App Store rating, funding figure, or university-partnership claim.
- The tiny transformer, the ten-stage rail, or the Mathos video. They are not in this product.
- A tool name that is not one of the six.
- Any moment where the page state and the agent's claim disagree without that disagreement
  being the point.
