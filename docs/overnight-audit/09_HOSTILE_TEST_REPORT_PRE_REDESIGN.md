> **SCOPE AND STATUS — read first.**
> This report describes the **pre-redesign build at commit `126c71f`**, which no longer
> exists. The product was replaced during the audit window and this audit was **cut short**
> partway through. Everything below was measured against the running production build
> (`pnpm build && pnpm preview --port 4322`) on 2026-08-26 before that replacement.
>
> It is published because the defect classes are worth carrying forward as regression
> targets, not because the specific screens still exist. **Do not use it to score, plan, or
> justify work on the current build.** Companion file `06_VISUAL_FORENSICS.md` is superseded
> for the same reason. `04_UX_AUDIT.md` was never written — the audit was stopped first.
>
> Coverage actually achieved: answer handling (complete), state and session handling
> (complete), keyboard and focus (complete), accessibility structure (mostly complete),
> reduced motion (complete by inspection, not by live emulation), performance (complete),
> console and network (complete). Not attempted: the agent-side WebMCP paths, which this
> Chrome could not exercise because it exposed no `document.modelContext`.

# 09 — Hostile Test Report (pre-redesign build, commit `126c71f`)

Method: Chrome DevTools Protocol against the production preview at `http://localhost:4322`.
Answer submissions were driven through the real React controlled input using the native
value setter plus a bubbling `input` event, then `form.requestSubmit()` — functionally
identical to typing and clicking, and verified against a known-good case (`36` produced the
diagnosis screen) before the battery was run.

---

## 1. Defect register

Severity: **blocking** = a judge hits it on the intended path and the demo is damaged;
**high** = a judge hits it while exploring; **medium** = degrades quality; **low** = polish.

---

### HT-01 — Correct answers are rejected · **blocking**

**Repro.** Load `/learn`. Enter `40.0` (the mathematically correct derivative). Submit.

**Observed.** `Not yet. Recheck every route from x to y.`

**Expected.** Acceptance, or at minimum a message distinguishing "wrong value" from
"unrecognised format".

**Evidence.** Full battery run against the initial stage. Every input below produced the
identical string `Not yet. Recheck every route from x to y.`:

| Input | Result | Input | Result |
|---|---|---|---|
| `40.0` | rejected | `40.` | rejected |
| `+40` | rejected | `.40` | rejected |
| `40.0000001` | rejected | `40e0` | rejected |
| `4x10` | rejected | `0x28` | rejected |
| `36+4` | rejected | `NaN` | rejected |
| `four` | rejected | `Infinity` | rejected |
| `-40` | rejected | `04` | rejected |
| `0` | rejected | `1e400` | rejected |
| `０４０` (full-width) | rejected | `٤٠` (Arabic-Indic) | rejected |
| `مرحبا 40` (RTL) | rejected | `🎉` | rejected |
| ` 40 ` | **ACCEPTED** | `40` | accepted |

**Root cause, from source.** `LearningStudio.tsx:68-80`:

```js
const attempt = action.attempt.trim()
if (attempt === '40') { /* correct */ }
if (attempt === '36') { /* the one diagnosable misconception */ }
```

A `.trim()` and two string equality tests. ` 40 ` passes only because of the trim. There is
no parser, no normalisation and no numeric comparison anywhere in the answer path.

---

### HT-02 — The "diagnosis engine" recognises exactly one wrong answer · **blocking**

**Repro.** Enter `4` — the *opposite* diagnosable misconception (the learner found only the
direct `+a` route and missed the product route).

**Observed.** Generic `Not yet. Recheck every route from x to y.` Identical to `four`,
`🎉`, and `<script>alert(1)</script>`.

**Expected.** Given that the product's entire premise is "the final number can reveal which
derivative paths you included" (its own on-screen copy), the symmetric misconception should
be diagnosed symmetrically.

**Evidence.** Source above; live battery. Only `36` branches.

---

### HT-03 — Long and empty submissions fail silently · **high**

**Repro (a).** Submit an empty field. **Repro (b).** Submit any string over 256 characters
(tested at 500, 5,000 and 50,000).

**Observed.** Nothing at all. No message, no error styling, no focus move, no revision
change. The neutral hint `Your reasoning stays local to this session.` remains in place. The
button is not disabled, so the user has no signal that anything happened.

**Expected.** The reducer *does* produce a correct error:

```js
if (!attempt || action.attempt.length > 256) {
  return { ok: false, code: 'invalid_input',
           message: 'The attempt must be 1 to 256 characters.',
           recovery: 'Enter a short answer and try again.' }
}
```

**Root cause.** `LearningStudio.tsx:350-357` — `runAction` only calls `setState` when
`result.ok` is true and **discards the failure envelope entirely**. Agents receive these
errors through the tool response; humans never see them. Every `invalid_input` and
`invalid_phase` message in the product is unreachable from the UI.

Measured side effect: at 500/5,000/50,000 characters the input accepts the full string
(there is no `maxLength`) and React's controlled re-render costs 0.8 s / 1.5 s / 2.0 s
before the silent no-op.

---

### HT-04 — "Restart session" does not restart the session · **high**

**Repro.** Complete `36 → lesson → 8` to the receipt. Click `Restart session ↺`.

**Observed.** The stage resets to the initial problem, but:

| | Before restart | After restart |
|---|---|---|
| Revision | `R33` | **`R34`** (incremented, not reset) |
| Activity log tail | `R29 … R33` | `R29 … R33`, plus `R34 Restarted learning path` |
| Log entries cleared | — | **none** |

**Expected.** A control labelled "Restart session" should clear the session.

**Root cause.** `LearningStudio.tsx:97-98` — the `RESET` case rewrites the stage flags but
never touches `state.activities` or `state.revision`, and `successfulAction` appends a new
activity for the reset itself.

**Why it matters here.** The activity log is the product's only visible proof that an agent
acted. A judge who restarts to re-run the demo sees the previous run's history still on
screen and a revision counter in the thirties on a "fresh" session.

---

### HT-05 — The activity log and revision counter are floodable by wrong answers · **high**

**Repro.** Submit 24 wrong answers.

**Observed.** 24 log entries (`Checked initial attempt · retry needed`) and 24 revision
increments; revision reached `R27` before the journey had begun. The log renders the last 6
entries, so the evidence surface becomes a scroll of failures.

**Consequence for the agent contract.** Three of the five tools require the model to echo an
`expectedRevision`. Every human keystroke-submit invalidates it. An agent that fetches the
workspace, thinks, and then writes will collide with any human typing in the same second and
receive `stale_revision`.

---

### HT-06 — Reload or Back destroys the entire session, silently · **high**

**Repro.** Reach any stage. Reload, or press browser Back.

**Observed.** Reload returns to the initial problem with `SESSION ACTIVITY: No actions yet.`
Back leaves `/learn` entirely and lands on the marketing page.

**Measured.** `localStorage` and `sessionStorage` are both empty (zero keys). `location.hash`
and `location.search` are empty. `history.length` never grows during the journey — the three
UI modes (`lesson` / `pathway` / `lab`) push no history entries. There is no `beforeunload`
guard.

So: no persistence, no URL state, no in-app history, no warning. A judge who presses Back to
re-read the diagnosis loses the demo and must retype the magic literals.

---

### HT-07 — Two tabs are two sessions, both claiming to be Session 001 · **high**

**Repro.** Open `/learn` in two tabs. Advance tab B to the diagnosis.

**Observed.**

| | Tab A | Tab B |
|---|---|---|
| Header label | `SESSION 001` | `SESSION 001` |
| Stage | initial | diagnosis |
| Revision | (none yet) | `R1` |

No `BroadcastChannel`, no storage sync, no session identifier. An agent told to "check the
current attempt" has no way to know which document it is addressing, and both documents
report the same session name.

---

### HT-08 — The training run freezes the tab for its full duration · **blocking**

**Repro.** Reach the training lab. Click `TRAIN 100 REAL STEPS`.

**Observed / measured** (three runs, `requestAnimationFrame` gap sampling plus a
`setTimeout(0)` latency sampler):

| Metric | Run 2 | Run 3 |
|---|---|---|
| Wall-clock duration | 23,268 ms | 21,499 ms |
| Total blocking time (sum of frame gaps over 50 ms, minus 50 ms) | — | **20,449 ms** |
| Share of the run spent in long tasks | — | **99.8%** |
| Long tasks (> 250 ms) | 20 | 20 |
| Longest single stall | 1,357 ms | **1,494 ms** |
| Animation frames served during the run | ~20 | ~20 → **≈ 0.9 fps** |
| First on-screen progress update | 1,065 ms | — |

**Expected.** The on-screen copy claims *"Runs in 5-step chunks so the interface can
breathe."* It does not breathe. The chunking yields to the event loop roughly once per
second, and each chunk occupies the main thread for ~1 second. During the demo's finale the
page is, for practical purposes, frozen for 21 seconds.

The `Pause training` and `Reset model` buttons remain enabled throughout, so a click is
accepted but may queue behind a 1.5-second task.

Compounding it: the loss readout is `aria-live="polite"`, so a screen reader receives ~20
queued announcements against a blocked main thread.

---

### HT-09 — Focus is stolen from the input on every screen, and the wordmark becomes unreachable · **high**

**Repro.** Load `/learn`. Press Tab repeatedly.

**Measured focus order:**

| Step | Element | Focus ring |
|---|---|---|
| On load | `H1` "Find dy/dx at x = 2." (`tabIndex = -1`, programmatically focused) | `2px solid rgb(62,111,157)`, offset `3px` — a **718 × 62 px blue rectangle** |
| Tab 1 | answer `input` | `2px solid rgb(62,111,157)`, offset `2.67px` |
| Tab 2 | `CHECK ANSWER` button | same |
| Tab 3 | leaves the document | — |

**Findings.**

1. The input carries `autoFocus`, but `useLayoutEffect` (`LearningStudio.tsx:396-401`)
   immediately focuses the `h1` instead. **The answer field is never focused on arrival**,
   on any of the six screens.
2. Because focus starts *after* the header in DOM order, the `MATHOS·` link — the only
   navigation control on the page — is **unreachable by forward Tab**. It requires
   Shift+Tab.
3. There is **no skip link on `/learn`**. `.skip-link:focus` exists in the CSS and
   `<a class="skip-link" href="#story">Skip to the story</a>` is present in the served
   landing HTML, but the studio document contains no skip link at all — despite having a
   header and two `<aside>` rails ahead of `<main>`.

**Correction to a prior hypothesis.** The ring on the `h1` is *not* an unstyled UA ring. It
resolves to the app's own `:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px }`.
It is nonetheless a defect: on a block-level heading it paints a large blue box that reads as
a bordered panel or a text field, it appears without any user interaction, and on the
diagnosis screen it measures **718 × 124 px**. Screenshots: `before/1440-04-learn-initial.png`,
`before/1440-05-diagnosis.png`, `before/1440-08-transfer.png`.

Positive, stated plainly: focus indicators on the real controls are present, visible and
consistent, and the tab order is short and correct because the inert pathway rail was
correctly built from non-focusable text rather than fake buttons.

---

### HT-10 — Stage transitions are never announced; only failures are · **high**

**Measured live regions.**

| Screen | `[aria-live]` regions present |
|---|---|
| Initial / transfer | one — `p.form-message`, `aria-live="polite"` |
| Diagnosis | **none** |
| Lesson | **none** |
| Receipt | **none** |
| Pathway | **none** |
| Lab | one — the loss readout, `aria-live="polite"` |

A *rejected* answer updates `p.form-message` in place, so it is announced. A *successful*
answer unmounts the whole screen and mounts a new one containing no live region, so nothing
is announced at all — the one moment the learner most needs confirmation. Focus does move to
the new `h1`, which most screen readers will read, but the outcome ("correct", "diagnosed")
is never spoken.

The input also carries no `aria-invalid` on error and no `aria-describedby` linking it to the
message.

---

### HT-11 — The agent-evidence rail is deleted below 1080px · **blocking**

**Repro.** Resize to 1024 × 768 (or any width ≤ 1080).

**Observed.** `@media (width<=1080px) { .context-panel { display: none } }`; verified live as
`display: "none"`, width 0. What disappears:

- `SESSION ACTIVITY` — the append-only activity log, the only visible proof an agent acted
- `WHAT MATHOS NOTICED` — the entire diagnostic column
- the state badge (`AWAITING ANSWER` / `PATTERN FOUND` / `EVIDENCE ISSUED`)
- `Nothing here claims more than this session observed.` — the claim-boundary line

Screenshot: `before/1024-01-learn-initial.png`.

1080px is not an edge case. It fires on a 13″ laptop at default scaling, on a 1024 × 768
projector, and on any browser window not close to maximised. On a WebMCP submission, the
default state for a non-maximised judge is a build with no agent-evidence surface.

---

### HT-12 — The header overflows and clips at 200% zoom · **medium**

**Repro.** Emulate 720 × 450 (200% zoom on a 1440 viewport). The studio's collapse
breakpoint is 700px, so 720 lands in the worst band.

**Measured.** The header `<p>` containing `LEARNING STUDIO / SESSION 001` occupies
**y = 0 → 67 px inside a 64 px header with `overflow: visible`**. It wraps to four lines,
overshoots the header box, and collides with the hairline rule and the content below. The
`USE CHROME 149+ …` notice wraps to two lines into the same region.

WCAG 1.4.4 (Resize Text) failure. Screenshot: `before/720-01-learn-200pct-zoom.png`.

No horizontal overflow at 720 / 1024 / 1280 / 1440 — the page never scrolls sideways.

---

### HT-13 — Navigation controls are 10 pixels tall · **medium**

| Control | Measured | WCAG 2.2 AA 2.5.8 (24 × 24) |
|---|---|---|
| `EVIDENCE RECEIPT` breadcrumb (lab) | 83.2 × **10** px | FAIL |
| `PATHWAY` breadcrumb (lab) | 36.4 × **10** px | FAIL |
| `MATHOS·` wordmark (studio) | 250 × **17.3** px | FAIL |
| `MATHOS·` wordmark (landing) | 79.2 × **17.3** px | FAIL |
| `Enter the studio ↗` (landing) | 126.9 × **12** px | FAIL |
| Answer input / `CHECK ANSWER` / `TRAIN 100 REAL STEPS` | 56 px tall | PASS |

The primary controls are generous. The only way back from the lab to the receipt is 10 px
tall.

---

### HT-14 — Reduced motion is honoured, but the embedded video is not covered · **medium**

`prefers-reduced-motion: reduce` resolves to one global inline rule, present on **both**
documents:

```css
*, ::before, ::after {
  scroll-behavior: auto !important;
  transition-duration: .01ms !important;
  animation-duration: .01ms !important;
  animation-iteration-count: 1 !important;
}
```

Verified via the CSSOM. There is no SMIL (`0` elements) and no Web Animations API usage that
escapes it, so every CSS animation and transition — including the three infinite ones — is
neutralised.

*Caveat, honestly flagged:* this could not be confirmed by live emulation, because the CDP
surface available here does not expose a reduced-motion override; it is confirmed by rule
inspection, which is strong but not the same thing.

**What reduced motion cannot stop:** the Mathos player iframe is loaded with `?autoplay=1`
and fetches eleven narration MP3s plus ranged blob reads. A full-motion video with audio
begins playing on a click, regardless of the user's motion preference, with no in-page pause
control (only `OPEN FULL PLAYER`). That is a WCAG 2.2.2 (Pause, Stop, Hide) and 1.4.2 (Audio
Control) concern, not a CSS one.

**Ambient motion that exists at all:** three infinite animations —
`video-pulse 1.2s`, `lab-pulse 1.2s` (both legitimate live-status indicators) and
`route-flow 9s linear`, which was observed running on **three elements simultaneously** on
the pathway screen and encodes nothing.

---

### HT-15 — Double-submit is correctly guarded · **not a defect**

**Repro.** Type `36`, then click `CHECK ANSWER` three times in immediate succession.

**Observed.** Revision advanced by exactly one (`R29 → R30`), one log entry, one stage
change. No duplicate action. Reported here because it was actively attacked and it held.

---

### HT-16 — No XSS, no injection · **not a defect**

`<script>alert(1)</script>` was accepted into the field, rendered as literal text by React,
and rejected by the answer check with the standard message. No dialog, no console error, no
DOM injection. Emoji, RTL Arabic, full-width digits and a 50,000-character string were all
handled without a crash or an unhandled rejection.

---

### HT-17 — Console and network across the full journey · **low**

**Console — zero errors.** Two warnings, both from the embedded player:

1. `Allow attribute will take precedence over 'allowfullscreen'.`
2. `Note: Some companies are required to obtain a license to use Remotion. See: https://remotion.dev/license`

The Remotion licence notice appears in the console of a judged artifact and should be
resolved (`acknowledgeRemotionLicense`) or confirmed with Mathos.

**Network — one failed request** across 45:
`GET .../raw/opening/1.mp3` → `net::ERR_ABORTED` (a superseded audio prefetch inside the
player; benign, but visible in DevTools).

**Also visible to any judge who opens the Network panel:** the player is served from
`video-generation-web-host-staging.mathos.ai` — a **staging** hostname — in a competition
submission.

---

## 2. Performance, measured

| Metric | Value | Verdict |
|---|---|---|
| `/learn` LCP | **106 ms** (TTFB 7 ms, render delay 98 ms) | excellent |
| `/learn` CLS | **0.00** | excellent |
| Interactive (React island hydrated) | **~354 ms** | excellent |
| FCP | 360 ms | excellent |
| Studio JS payload | 74 KB (`LearningStudio` 14 KB + `client` 57 KB + `react` 3 KB) | good — TensorFlow.js is correctly deferred to `tinyTransformer.*.js`, loaded only on entering the lab |
| Mathos player, first painted frame | ~600 ms **warm cache**; the panel's own label promises `5–10 sec / PRODUCTION FIRST FRAME`, and prior cold-cache observation recorded > 6 s | see HT-08 note |
| `Generate a fresh version` (live SSE regeneration) | **~32 s** end to end; **no progress text at all for the first 13.5 s** — only a `CANCEL GENERATION` button | works, but 13.5 s of dead air |
| Training run | 21.5–23.3 s, 99.8% main-thread blocked | **blocking (HT-08)** |

The page-load performance of this build is genuinely very good and should be protected
through any redesign.

**The SSE video regeneration is real and it works.** Clicking `Generate a fresh version`
streamed `Verifying the math. → Writing the script. → Building the opening. → Building the
shared-path explanation. → Opening ready.` and then swapped the iframe to a newly generated
video ID (`dec88f82…` → `d449335a…`). This is a live call to Mathos's own generation
service, not a mock, and it is the most impressive capability in the build. Its only defect
is the 13.5-second silent lead-in.

---

## 3. Ranked

| Rank | ID | Defect | Severity |
|---|---|---|---|
| 1 | HT-01 | Correct answers rejected — `40.0` fails; three string comparisons are the whole engine | blocking |
| 2 | HT-08 | Training run blocks the main thread for 99.8% of 21 s, longest stall 1.5 s | blocking |
| 3 | HT-11 | Agent-evidence rail deleted below 1080px — the default for a non-maximised judge | blocking |
| 4 | HT-02 | One-literal diagnosis; the symmetric misconception `4` is not diagnosed | blocking |
| 5 | HT-06 | Reload or Back silently destroys the session; no persistence, no URL state, no warning | high |
| 6 | HT-04 | "Restart session" resets neither the log nor the revision | high |
| 7 | HT-09 | Focus stolen from the input on every screen; wordmark unreachable by Tab; no skip link | high |
| 8 | HT-10 | Successful transitions never announced; only failures are | high |
| 9 | HT-03 | Empty and over-length submissions fail silently — the error envelope is discarded | high |
| 10 | HT-05 | Activity log and revision floodable by wrong answers; guarantees `stale_revision` collisions | high |
| 11 | HT-07 | Two tabs, two sessions, both named `SESSION 001` | high |
| 12 | HT-13 | Navigation controls 10 px tall | medium |
| 13 | HT-14 | Autoplaying video with audio ignores reduced-motion intent; one purely decorative infinite animation | medium |
| 14 | HT-12 | Header clips at 200% zoom | medium |
| 15 | HT-17 | Remotion licence warning, one aborted request, staging hostname visible in DevTools | low |

**Held under attack, and worth keeping:** the single shared reducer, the monotonic revision
counter, the idempotency guard that defeated triple-submit (HT-15), React's escaping
(HT-16), the append-only log as a concept, LCP 106 ms / CLS 0.00 / TTI 354 ms, the deferred
TensorFlow.js chunk, the live SSE video regeneration, and the receipt's claim boundary.

---

## 4. What was not tested, and why

- **All five WebMCP tools.** The Chrome instance driving this audit exposed
  `typeof document.modelContext === "undefined"`, so no agent-side path — `requestId`
  idempotency, `expectedRevision` concurrency rejection, `AbortSignal` handling, the
  structured error envelope — was exercised against a real runtime. Every claim about those
  paths in this repository remained unverified as of commit `126c71f`. (This gap is what
  `02b_WEBMCP_LIVE_VERIFICATION.md` was later written to close, against Chrome 151.)
- **`04_UX_AUDIT.md`** — the four-perspective journey map — was not written. The audit was
  stopped first.
- **Live `prefers-reduced-motion` emulation** (HT-14) — confirmed by rule inspection only.
- **Cold-cache first-frame timing for the Mathos player** — measured warm only.
