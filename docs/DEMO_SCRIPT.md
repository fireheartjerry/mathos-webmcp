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

## The video is assembled, not filmed

The submission video is built by a **Remotion** composition in [`video/`](../video/) from
three things, none of them staged:

1. **The picture** — `scripts/record-demo.mjs` drives the *production build* through its
   own WebMCP tools and captures the screen. Every state change in it went through
   `executeTool`; nothing is mocked for the camera.
2. **The voice** — `scripts/build-narration.ps1` synthesises `docs/narration.json` offline,
   one file per beat, each measured against its own time budget.
3. **The composition** — `video/src/Demo.tsx` keeps the screencast as the subject and adds
   a caption carrying the sentence being spoken plus a quiet marker naming the beat. Black
   and white, one serif, because the product is.

```bash
FPS=6 HOLD_SCALE=8.5 node scripts/record-demo.mjs     # picture
pwsh -File scripts/build-narration.ps1                # voice
cd video && npx remotion render src/index.ts Demo out/demo.mp4 --concurrency=4   --browser-executable="C:/Program Files/Google/Chrome/Application/chrome.exe"
```

See [`video/README.md`](../video/README.md) for the full rebuild, and for how to swap the
synthetic voice for a human one without touching any code.

Three things caught earlier attempts out, all now handled:

- CDP's screencast only emits frames when the page **paints**, and this product has no
  animation — a first take compressed the whole demo into four seconds. Frames are now
  captured on a timer.
- A background tab does not paint at all. The tab must be active.
- A first full-length take ran 2:15 against a 2:37 narration, which would have run the
  voice off the end of the picture. `HOLD_SCALE` stretches the beats; 8.5 gives 2:43.

The narration below is the older, longer script, kept because it is the better piece of
writing and worth reading if the video is ever re-cut with more beats. What is actually
spoken in the current video is `docs/narration.json`, which is aligned to the beats that
were filmed.

## Capture setup

Chrome 151 with `chrome://flags/#enable-webmcp-testing`, window sized so the viewport is
1440×900. `/learn` on the left at ~62% of frame, the agent conversation on the right at
~38%. Open on a **fresh session** so the first problem is the deterministic one and the
heading reads *Product rule*. Narration at ~150 words per minute.

---

## 0:00–0:22 — The mechanism, whole, immediately

**Screen.** The scratchpad with three lines of working already written. The agent pane on
the right. The agent calls `get_scratchpad`, then `check_work`. Line 3 gets its badge:
**Does not follow**, with the diagnosis beneath it. Line 3 is the last line in this
derivation, so there is nothing below it to mark; had there been, those lines would read
**After the first break** rather than being called wrong, because they were never judged.

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

## The delivered file

`docs/video/second-try-demo.mp4` — 1920×1080, H.264, AAC 48 kHz stereo, **2:44.1**
(164.1 s against the rules' 180 s limit), 4920 frames, `faststart`.

Loudness was measured rather than assumed:

```bash
ffmpeg -i docs/video/second-try-demo.mp4 -af loudnorm=I=-16:TP=-1.5:print_format=json -f null -
#  input_i  = -15.98 LUFS   (target -16)
#  input_tp =  -1.43 dBTP   (ceiling -1.5)
```

Remotion wrote the audio at 96 kHz. That is legal AAC and every desktop player handles it,
but a transcode on somebody else's server is not a thing to find out about after the
deadline, so the track was resampled to 48 kHz with the video stream copied:

```bash
ffmpeg -i in.mp4 -c:v copy -c:a aac -ar 48000 -b:a 192k -movflags +faststart out.mp4
```

`-c:v copy` matters: the picture is bit-identical, and the frame count and duration were
checked afterwards to prove it (4920 frames, 164.1 s, both unchanged). Re-encoding video to
fix an audio problem would have thrown away quality for nothing.
