# Mathburst submission film — criteria

**Status:** DERIVED — not user-approved. Jerry asked for the loop to run rather than
to be interviewed, so these come from evidence, not from him directly. Sources:

- The WebMCP Challenge judging criteria and rules (webmcp.devpost.com, fetched 2026-09-02).
- Jerry's own stated feedback across this session, quoted per criterion below.
- `docs/superpowers/specs/2026-09-02-film-v3-production-design.md`.
- `docs/video/FILM_V2_SPEC_TRACE.md`.

Criteria marked `[ASSUMED]` are ones I had to infer. Those are the likeliest to be
wrong and the first things to correct.

**Artifact:** `video/out/mathburst-final.mp4`

---

## Gates — binary, never averaged into the score

| # | Gate | check: |
|---|---|---|
| G1 | Runtime under 3:00 | `ffprobe -v error -show_entries format=duration -of csv=p=0 video/out/mathburst-final.mp4` → < 180.0 |
| G2 | No frame shows a scene other than the one its shot names | Sample a frame at the midpoint of every shot in `cutlist.json`; each must show that shot's scene |
| G3 | ElevenLabs voice throughout, no edge-tts | `video/public/film/narration.json` clips all resolve under `film/narration-v3/`; no `film/narration/` paths |
| G4 | Narration never describes something absent from the picture | For each clip, sample a frame at its midpoint and confirm the thing named is on screen |
| G5 | The film shows the tool count, and it reads 48 | A frame exists where the inspector or lockup chip reads `48` |

A failed gate makes the round a net loss regardless of points.

---

## Criteria — 100 points

### C1 · Transition fidelity — 18
Jerry, verbatim: *"the transitions between scenes rn is terrible and needs to be high
fidelity and a real transition"*. Weighted heaviest of the craft criteria because it
is the one thing he stopped the work to complain about.

**How to check it:** extract five frames evenly across each join in `cutlist.json`
(start, 25%, 50%, 75%, end). A passing join shows *both* scenes simultaneously in the
middle frames with a visible blend, and a change in scale across them. Failing looks
like: a hard cut (middle frame identical to one end), a pan across empty canvas, or
no scale movement.

### C2 · Cinematography — 12
Shots vary in size and the camera moves for a reason.

**How to check it:** across the film, at least three distinct shot sizes are used
(a control filling the frame, a card, a whole scene). Every camera move either
follows an edit or reframes for the next beat — none is decorative drift.

### C3 · Narration and picture in sync — 12
**How to check it:** for each clip in `narration.json`, sample a frame at its start
and at its end. The subject named in the clip is on screen at both. Drift greater
than one second at any point fails this outright.

### C4 · WebMCP leverage visible on screen — 15
The heaviest Devpost criterion: *"How thoroughly and skillfully does the project use
WebMCP?"*

**How to check it:** count on-screen evidence — the tool count visible, the ledger
or activity rail showing named tool calls, agent-attributed edits, and an undo of an
agent edit. Full marks needs all four, plus the count reading 48.

### C5 · The argument, not just the demo — 12
Devpost: *"Does the project make a credible, specific case for solving a real
problem?"* The v2 script scored zero here — 333 words, all play-by-play.

**How to check it:** in the first 45 seconds the audio must state what the product
is, what problem it solves, and how WebMCP is used. Each is worth 4 points.

### C6 · Every frame professional — 12
Jerry, verbatim: *"Fix all the goofy display stuff … things overflowing in any single
frame of any single video in every single way possible."*

**How to check it:** sample 20 frames spread across the film; none may show clipped
text, overlapping elements, or content cut by the frame edge.

### C7 · Pacing — 9
**How to check it:** no stretch longer than 6 seconds without either narration or a
visible change on screen. No shot shorter than 2 seconds.

### C8 · The first fifteen seconds — 6 `[ASSUMED]`
Assumed from the rule that judges need not watch past three minutes: attention is
scarcest at the start. Jerry never said this directly.

**How to check it:** by 0:15 a viewer knows what the product is and has seen the
canvas. A title card or logo hold with no product visible scores 0.

### C9 · Audio — 4
**How to check it:** no clipping (`ffmpeg -af astats` peak below 0 dBFS), music
audibly ducks under speech, no audible seam between narration clips.

---

## Scoring configuration

Pinned for the whole loop: scorer runs as a Claude subagent with a fresh context,
from the worktree root, given this document with the score log and baseline stripped,
plus extracted frames and `ffprobe` output produced by the loop driver (the scorer
cannot decode video itself, so evidence is produced for it — judgment is not).

## Baseline score

To be filled by round 0.
