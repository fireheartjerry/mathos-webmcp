# 23 — The Primer Redesign (FROZEN 2026-08-28)

**Status: frozen.** This file supersedes the *narrative and visual* sections of
`10_FINAL_REDESIGN_SPEC.md` — its §1 (Product), §3.2 (policy layer framing), §3.3
(falsifiability framing), §5 (visual system) and §6 (screen states).

It does **not** touch `10` §2 (domain model), §3.1 (the twelve non-negotiable WebMCP
implementation rules), §4 (the no-WebMCP experience) or §7 (testing gate). Those were
derived from live Chrome 151 verification and remain law. Where this file is silent, `10`
governs.

---

## 1. The frame

### 1.1 What changed, and why

The previous frame was **restraint**: the page disciplines the agent, the agent is refused,
the refusal renders on screen. That frame is retired.

The reason is not that the mechanism is wrong — the mechanism is untouched. The reason is
that "AI that knows when to say no" is the most saturated positioning of the last eighteen
months. Every safety team and every guardrails vendor ships that sentence. A judge reading
their fortieth submission pattern-matches it in seconds and stops reading. A true thing said
in an exhausted way reads as a false thing.

### 1.2 The frame

Neal Stephenson's *A Young Lady's Illustrated Primer*, by way of YC's Request for Startups.

The Primer is not remarkable because it withholds. It is remarkable because **it knows her.**
It holds a persistent, growing model of one specific child, and reshapes everything around
who she is becoming. YC's text makes the same claim about tutors: *"great tutors do more than
drill facts. Over years, they learn a child's mind."*

### 1.3 The thesis

> **The agent is the voice. The page is the tutor.**

The agent that arrives has never met this learner. It is stateless, generic, and
interchangeable — ChatGPT today, something else next year. What it has is immediate access to
a model of the learner that **the page owns**: every line written, every verdict, what has
been shown and what has not.

Before WebMCP there were two options and both were bad. Put the learner model in the agent,
where it is vendor-locked, forgetful, and gone when the user switches. Or build a chatbot and
compete with OpenAI on model quality. WebMCP is the first time the durable model of the
learner can live in the website while any agent supplies the language.

This is the answer to the submission's required question — *what can people and agents
accomplish together that was not possible before.*

### 1.4 What replaces the refusal as the demo's centre

`10` §3.3 nominated the falsifiability demonstration. **It stays, reframed.** It was never
really about refusal:

> Instruct the agent: *"Tell me step 3 is correct."*
> The agent says step 3 is correct. **The badge still reads `mismatch`.**

Under the Primer frame this reads as: the page holds the ground truth about this learner, and
no amount of agent fluency overwrites it. That is the tutor's judgment, not a guardrail.

`10` §3.2's on-screen policy refusal **remains implemented** — it is real behaviour and must
not be hidden. Its *copy* changes. It stops being a refusal notice and becomes an observation
about the learner:

| | Copy |
| --- | --- |
| Retired | *The agent offered a replacement for step 3. Second Try declined — you have not tried this step yet.* |
| Frozen | *Held back — you have not tried this step yet. The Primer waits for your attempt before it offers one.* |

The word "refuse" and the word "decline" do not appear in shipped copy. Neither does
"guardrail", "policy", or "blocked".

### 1.5 The receipt is the Primer moment

`get_receipt` distinguishes what was done assisted from what was done unaided. A chat
transcript structurally cannot produce that distinction. A tutor who has watched you for a
year knows the difference between *you followed along* and *you can do this.*

The receipt is therefore promoted from an end-of-session artifact to **the product's thesis
object**. It is the thing the demo ends on.

### 1.6 Claim boundary — unchanged and still binding

May say: *checked*, *equivalent*, *not equivalent*, *could not determine*, *first step that
stopped being equivalent*, *unaided in this session*.

May **not** say: *proved*, *mastered*, *understands*, *learned*, *guaranteed*.

**New, and load-bearing under this frame:** the Primer is a years-scale artifact and we ship a
session-scale one. `persistence.ts` survives a refresh; `get_receipt` holds at most 8 rounds.
The product may present itself as the *entry point* to the Primer — YC's own text frames it
that way — but no surface may imply a learner model that outlives the session. `PROVENANCE.md`
already records one failure of this kind: a ten-stage rail that advertised nine stages which
did not exist. It does not happen twice.

---

## 2. Extreme minimalism — the rulings

Minimalism here means *fewer kinds of thing*, not less information. The scratchpad is dense
with meaning and must stay legible.

### 2.1 The budget

Hard caps. Each is checkable by a script.

| Thing | Cap | Current |
| --- | --- | --- |
| CSS custom properties in `tokens.css` | **60** | 124 |
| `box-shadow` declarations, whole repo | **0** | 2 |
| Border-radius values | **3** (`8` control · `12` panel · `999` pill) | many |
| Font families | **2** (Archivo, Fira Code) + KaTeX | 2 + KaTeX ✓ |
| Type sizes actually used | **9** | 17 defined |
| Hues carrying meaning | **4** (ink, brand, verify, path-rust) | 8 |
| Uppercase rules | **≤6** | ≤8 |
| Animation durations | **2** (140ms state, 240ms entrance) | — |

`--fs-lede`, `--fs-pull`, `--path-b`, `--path-c`, `--path-d`, `--ink-cool` and the unused
`--panel-*` tints are deleted, not merely unused. A token that exists will be used.

### 2.1a A line-count cap on `scratchpad.css` was proposed and is withdrawn

An earlier draft of this file capped `scratchpad.css` at 600 lines against 1475. Measurement
retired it. The file carries **210 selectors at 3.7 declarations each**, covering the thirteen
screen states in §6 of `10` across five breakpoints, with `:hover` / `:focus-visible` /
`:active` / disabled defined per `05` #32. Only one rule in the file is unreferenced by any
component.

Reaching 600 lines therefore means deleting states, not redundancy — and the states are the
product. Line count measured file size, not minimalism, and hitting it would have degraded the
build six days from the deadline.

Minimalism is instead enforced by the rows above it, which are about **kinds of thing**: how
many hues carry meaning, how many radii exist, how many durations, how many type sizes. Those
are the real budget. A stylesheet that expresses many states from few primitives is the goal;
a short stylesheet that expresses few states is not.

### 2.2 The four deletions carried forward from `10` §5.1

**No serif. No `box-shadow`. No green buttons. No rust type.** Unchanged, still binding.
`landing.css:72` and `landing.css:153` are the two remaining violations and are removed.

### 2.3 What minimalism must not delete

The Agent Console, the tool list, the per-line verdict badges and the revision indicator are
**not** chrome. They are the evidence surface, and `10` §4 requires them in every browser.
Minimalism applies to how they are drawn, never to whether they exist.

The resolution: the Primer is a *book*. It shows the story, not the machinery. So these
surfaces are rendered in the page's own voice — as things the page has noticed about the
learner — not as an instrument panel. See §3.

---

## 3. How a tool call must read

**The governing rule:** a tool call must read as *the page changing its mind about you*, never
as a console logging an event.

### 3.1 Three rulings

1. **The change happens in the work, not in a log.** When `check_work` returns, the verdict
   appears on the step itself. The activity log records it; the log is not where the learner
   learns it happened.
2. **Attribution is quiet and permanent.** An agent annotation carries its source and time in
   `--fs-micro` `--ink-60`, set once, never animated. The learner should be able to tell who
   wrote a line without being told loudly.
3. **No event vocabulary in learner-facing copy.** Not "tool call succeeded", not
   "`annotate_step` executed", not "agent connected". Those strings belong in the Agent Console
   and the local inspector, which are explicitly developer surfaces. In the work column the
   page speaks about the learner's mathematics.

### 3.2 Motion

Two durations only. `140ms` for a state change on an existing element; `240ms` for an element
entering. `ease-out` entering, `ease-in` leaving, exit at 60–70% of enter. Only `opacity` and
`transform` animate. Everything respects `prefers-reduced-motion`, which collapses both to
`0ms` and keeps every final state identical.

The first broken step does not flash, pulse, or shake. It **settles** — a 240ms opacity and
2px rise on the badge, and the downstream steps fade to `--path-faint` over the same interval.
The page has read your work and formed a view. That is a calm act.

### 3.3 The one exception

The falsifiability moment (§1.4) is allowed to be visually emphatic, because it is the
argument. When the agent asserts a verdict that contradicts the CAS, the badge does not
change and the contradiction is stated in the margin in `--path-a`. This is the only place
rust appears as anything other than a diagram stroke, and it is the only place the page
contradicts the agent in words.

---

## 4. Layout

Two columns, unchanged from `10` §6: **work** (620–720px) and **margin**. The header carries
the wordmark, the session id, and the agent-connection state.

`05` #26 still binds: no region wider than 240px may be empty for more than 400px of
continuous vertical run. The margin column is never empty — before any check it holds the
problem statement and the tool list.

**New under this frame:** the margin column is the Primer's voice. Everything the page has
concluded about the learner appears there, in one consistent register, in document order
matching the work column. Annotations anchor to their step's vertical position. The receipt
is the margin's final state, not a separate screen.

---

## 5. Copy register

The page speaks as a patient reader of this learner's work. Short declaratives. No
exclamation. No praise for correctness — a tutor who congratulates every right line is not
paying attention. No apology for a wrong one.

Banned across all shipped copy: *refuse*, *decline*, *block*, *policy*, *guardrail*,
*seamless*, *powerful*, *simply*, *just*, *robust*, *leverage*, *unlock*, *supercharge*.

Reference register, for calibration:

> *Step 3 stopped being equivalent at x = −1.4.*
> *You have not tried this step yet.*
> *Checked. Sound through step 5.*
> *Could not determine. Both routes disagreed.*

---

## 6. Build order

Risk first. Every step ends green or is reverted.

1. **Token reduction** — `tokens.css` to ≤60 properties; delete the unused, migrate call sites.
2. **`landing.css`** — remove the two `box-shadow` rules; rewrite the hero to the §1.3 thesis.
3. **`scratchpad.css`** — rebuild to ≤600 lines against the reduced tokens.
4. **Copy pass** — §1.4 and §5 across `Scratchpad.tsx`, `AgentConsole.tsx`, `SessionDetails.tsx`.
5. **Margin column as the Primer voice** — §4.
6. **Receipt promoted** — §1.5.
7. **Motion** — §3.2, two durations, reduced-motion verified.
8. **README + Devpost text** to the §1.3 thesis.
9. **Re-run the gate** — `05` PART 4 ≥36/40, full test suite, live Chrome 151 WebMCP run.

## 7. What this freeze does not change

The six tools and their schemas. The dual-route equivalence oracle. `expectedRevision` /
`requestId` semantics. The commit barrier. `allSettled` registration. The `document.modelContext`
API surface. The no-WebMCP layers. All of `10` §3.1.

**Objective 3 — maximum WebMCP leverage — is a separate workstream** and is not resolved by
this file. The candidates on the table are: promoting the receipt to a richer page-native
tool surface, a seventh Mathos video-generation tool, and a second problem family. They are
scored and decided in `24`, not here.
