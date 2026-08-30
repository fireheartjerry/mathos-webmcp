# Criteria: minimal UI and near-zero motion for Second Try

**Artifact:** `/` and `/learn` in this repo — `src/components/**`, `src/styles/**`,
`src/app/**`. Served by `pnpm dev` at `http://localhost:3000`.
**Target:** 95/100  **Budget:** 5 rounds, stop early at 95
**Created:** 2026-08-29  **Baseline score:** _(round 0)_
**Status:** APPROVED PENDING — written from a live interview, awaiting sign-off.

## Context

Second Try is a WebMCP Challenge submission by Mathos. A learner writes multi-line
mathematical working; the page's computer algebra system marks the first line that
stopped being true; WebMCP tools let an agent read, check, annotate and propose
against that live work.

Since the last design pass the interface accumulated substantial motion — 13
keyframe animations, 64 animation declarations, 19 distinct durations — and 3,102
lines of CSS. The owner wants it **genuinely** minimised: not visually stripped
while the same machinery hides underneath, but actually smaller.

Two things are being improved at once, and they pull against each other. The UI
must get quieter; the WebMCP surface must get *deeper*. The resolution the owner
chose: leverage comes from exercising more of the **WebMCP platform**, not from
adding more tools. That costs almost no pixels.

## Gates — binary, non-negotiable

Reported separately from the score. A failed gate means the work is not
deliverable regardless of points.

- **G1. The mathematics and the domain still work.**
  *check:* `pnpm test` passes with no fewer than 226 tests, and `pnpm typecheck`
  reports zero errors.
- **G2. The judged journey completes.**
  *check:* in a browser at `/learn`: write a line equal to `y`, a line that is its
  derivative, and a wrong third line; press Check; the third line reads
  `not equivalent` and no later line is marked wrong. Rewrite it correctly; press
  Check; the derivation reads sound. Start the unaided problem; complete it; the
  receipt appears.
- **G3. WebMCP is legible without interaction.**
  *check:* screenshot `/learn` at 1440×900 on first load. Every one of the six tool
  names is readable, each carries its read/write mark, and the count is stated.
  Zero clicks, zero scrolling.
- **G4. Nothing is hard to read or hard to hit.**
  *check:* computed-style sweep of `/` and `/learn` — every text/background pair
  meets 4.5:1 (3:1 for ≥24px or ≥18.66px bold), disabled controls exempt; no
  `font-size` below 11px; every interactive element's box is ≥32px on its smaller
  axis.
- **G5. The claim language survives.**
  *check:* the receipt still states its own limits; the `could not determine`
  verdict still exists and still renders; no surface says *proved*, *mastered*,
  *understands* or *guaranteed*.

## Criteria — 100 points total

### C1. Motion floor — 18 pts
**What it means:** The owner asked for near-zero: no keyframes, nothing that moves
position or scale, and transitions kept only so hover and focus do not feel dead.
**How to check it:**
```
grep -rc "@keyframes" src --include=*.css        # want 0
grep -rc "animation" src --include=*.css         # want 0
grep -rhoE "transition-property:[^;]*|transition:[^;]*" src --include=*.css
grep -rhoE "[0-9]+m?s\b" src --include=*.css | sort -u   # want 1 value
grep -rn "transform" src --include=*.css         # want 0 outside prefers-reduced-motion resets
```
Then load `/learn`, add a line, and press Check while recording. Nothing may
translate, scale, rotate, or draw itself.
**Anchors:**
- `0` — any `@keyframes` remains, or elements still move on arrival
- `9` — keyframes gone but more than one duration survives, or a transform remains
- `18` — 0 keyframes, 0 animations, 0 transforms; exactly one duration; transitions
  restricted to `color`, `background-color`, `border-color`, `opacity`

### C2. Genuine reduction — 12 pts
**What it means:** Smaller, not relocated. Deleting CSS while pushing the same
effects into inline styles or JavaScript is the failure this criterion exists to
catch.
**How to check it:**
```
find src -name "*.css" | xargs wc -l            # baseline 3,102
grep -rc "style={{" src --include=*.tsx          # must not rise
grep -rc "className=" src --include=*.tsx        # must not rise materially
```
Count declared custom properties in `tokens.css` and how many are referenced
anywhere. Unreferenced tokens count against.
**Anchors:**
- `0` — CSS shrinks less than 15%, or inline-style count rises
- `6` — 15–35% smaller with no relocation
- `12` — ≥35% smaller, every declared token referenced at least once, inline styles
  unchanged or fewer

### C3. Nothing decorative — 15 pts
**What it means:** Every visual treatment on screen encodes state or content. A
rule, fill, mark or border that exists only to look designed is decoration.
**How to check it:** Screenshot `/` and `/learn` at 1440×900. Enumerate every
distinct visual treatment — each border, fill, rule, badge, mark, divider. For each,
name the state or content it encodes. Any treatment with no answer is decoration.
Report the count and the list.
**Anchors:**
- `0` — 5 or more treatments with no state behind them
- `8` — 2–4 decorative treatments
- `15` — 0–1, and the one has a stated reason in the round log

### C4. Type and colour discipline — 12 pts
**What it means:** One typeface. A small, deliberate size scale. Colour used only
where it carries meaning.
**How to check it:** `getComputedStyle` sweep over every rendered element on both
pages. Count distinct `font-family`, `font-size`, `font-weight` and `color` values,
and the proportion of painted elements carrying a non-neutral colour.
Counting rule, so the check is satisfiable: **KaTeX's own math faces do not count** —
they are how mathematics is set, not a design choice. One monospace face for
machine identifiers (tool names, JSON) is permitted and counts as the second family.
Sizes below 2px are border artefacts and are excluded.
**Anchors:**
- `0` — more than one interface text family, or more than 8 sizes, or >3 weights
- `6` — one text family plus at most one mono, ≤7 sizes, ≤3 weights
- `12` — one text family plus at most one mono, **≤6 sizes**, ≤2 weights, ≤5 distinct
  text colours, and chromatic colour on under 3% of painted elements

### C5. WebMCP platform coverage — 16 pts
**What it means:** Depth, not width. The tool *count* should not grow; the amount of
the WebMCP platform actually exercised should. Each feature must genuinely work in
Chrome 151, not merely be referenced.
**How to check it:** Launch Chrome 151 with `--enable-features=WebMCPTesting`, open
`/learn`, and verify each of these by execution:
1. declarative `<form toolname>` tool registration
2. `exposedTo` origin scoping on at least one tool
3. a `toolchange` listener that fires and is observable
4. `getTools({ fromOrigins })`
5. registration that changes with session phase, without unregistering the tool
6. an annotation beyond `readOnlyHint`/`untrustedContentHint` attempted, with the
   result documented (Chrome drops the rest — documenting that is the point)
**Anchors:**
- `0` — none of the six demonstrably work; tool count grew instead
- `8` — three work under live execution
- `16` — five or more work under live execution, each with a recorded transcript,
  and the tool count is still six

### C6. WebMCP legibility in the first viewport — 11 pts
**What it means:** A judge who screenshots the page and never clicks must still see
what is being judged. Minimalism must not cost this.
**How to check it:** Screenshot `/learn` at 1440×900 on first load, then blur to
8px. The agent panel must remain identifiable as a list of named capabilities. Then
unblurred: read the six names, the read/write split, and the connection state.
**Anchors:**
- `0` — tools require a click, or the panel is unidentifiable when blurred
- `5` — names visible but the read/write split or the connection state is not
- `11` — all six names, the read/write mark on each, the count, and the live/
  unavailable state, all without interaction

### C7. Emptiness discipline — 8 pts
**What it means:** Quiet is not the same as empty. Minimalism that leaves large
holes has removed content, not noise.
**How to check it:** On `/` and `/learn` at 1440×900 and 1280×800, sample every 20px
down the document and measure the widest continuously empty vertical run **inside
the main content container**, not out to the viewport edge. A deliberately narrow
measure is not a hole; a gap inside the column is. Report the container's width and
horizontal position separately as context, without scoring it.
**Anchors:**
- `0` — a region wider than 240px is empty for more than 500px of continuous run
  *within the container*
- `4` — worst run inside the container between 300px and 500px
- `8` — worst run under 300px, on both pages at both widths

### C8. Reach and legibility above the minimum — 8 pts
**What it means:** G4 is the floor. This is whether the result is comfortable, not
merely compliant.
**How to check it:** Tab through the entire journey on `/learn` and record the focus
order and whether the ring is visible at every stop. Measure the smallest
interactive target. Measure body-copy contrast and line length.
**Anchors:**
- `0` — a focus stop with no visible ring, or a trap
- `4` — all stops visible, but targets between 32px and 40px, or a measure over 85
  characters
- `8` — every stop visible and in reading order, no target under 40px, body measure
  between 45 and 80 characters

## Out of scope

- The product concept, the learner flow, and the six tools' names and purposes.
  Restyle; do not restructure.
- `src/domain/**` correctness. It is covered by G1 and by 226 existing tests.
- The README, demo script, and audit documents.
- Publishing, deployment naming, and the demo video.

## Constraints

- **One typeface: STIX Two Text**, used for interface and prose. KaTeX renders the
  mathematics. Decided in the interview; not to be relitigated.
- **The tool count stays at six.** Leverage comes from platform coverage.
  Explicitly chosen over growing the list.
- **The agent panel stays fully visible**, tools grouped under quiet headings.
- Motion budget: **one duration, transitions on colour and opacity only.**
- The owner set nothing else off-limits — the flow and the domain may be touched if
  a reviewer makes a good case, subject to the gates.

## Scorer configuration (pinned)

Same configuration every round; if it must change, re-score the previous round
under the new configuration before comparing.

- **Scorer:** `general-purpose` subagent, fresh context, `references/scorer-brief.md`
- **Working directory:** the repo root
- **Server:** `pnpm dev` on `http://localhost:3000`
- **Browser:** chrome-devtools MCP at 1440×900; Chrome 151 with
  `--enable-features=WebMCPTesting` for C5
- The scorer receives this document **with the score log and baseline removed**, and
  never sees the reviewer findings, the triage, or the changelog.

**Token-budget adaptation (disclosed).** The owner set a tight token budget and
ruled out multi-agent workflows. So the orchestrator produces the *evidence* for
each check — greps, computed-style sweeps, geometry measurements, screenshots — and
the independent scorer produces the *judgment* from that pack plus its own reading
of the artifact. The skill permits this split explicitly: evidence from the
orchestrator is fine, judgment is not. It is recorded here because it means the
scorer is verifying numbers it did not gather, and the final report must say so.

## Score log

| Round | Score | Δ | Gates | Note |
|-------|-------|---|-------|------|
| 0     | 23    | — | all PASS | baseline |
| 1     | 59    | +36 | all PASS | motion removed; two functional bugs fixed |
| 2     | 80    | +21 | all PASS | last transform, decorations, measures bound |
| 3     | 86    | +6  | all PASS | one palette; third weight removed |

**Stopped at 86.** C2 and C5 are the only criteria short of full marks, and an
independent scorer confirmed neither gap can be closed honestly — C2 would mean
deleting ~317 lines of working CSS or gaming a line count, C5 would mean claiming
Chrome capabilities that demonstrably do not work.
