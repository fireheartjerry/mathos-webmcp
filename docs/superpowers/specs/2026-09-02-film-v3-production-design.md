# Film v3 — production design

**Goal:** produce the actual submission video with the restructured narration, in the
ElevenLabs voice, under the three-minute rule.

**Deadline:** 2026-09-03 1:00 pm PT.

## The five gaps

Found by reading the pipeline rather than assuming it worked:

1. **The film renders in the wrong voice.** `video/src/Film.tsx:14` imports
   `public/film/narration.json`, which `scripts/film/narrate.mjs` writes using
   edge-tts (`en-US-AndrewMultilingualNeural`). The ElevenLabs "Brian" take that was
   chosen and rendered lives in `public/film/narration-v3/` and nothing reads it.
2. **Narration text is duplicated.** `video/film.manifest.json` carries its own
   `narration` string per shot, and those strings are a third variant — they match
   neither `narration-v2.json` nor `narration-v3.json`. There is no single source.
3. **The v3 script does not fit the film.** 17 clips against 13 shots, and its first
   three clips (35 s of framing) describe something no shot shows.
4. **The budget does not close.** The manifest is 160 s; adding the cold open and the
   longer close exceeds the 172 s ceiling.
5. **`narrate-eleven.mjs` writes the wrong asset paths.** Clip `file` fields are
   hardcoded to `film/narration-v2/…` regardless of `--spec`, so a v3 render points
   at v2 audio.

## Decisions

**One source of truth for narration.** `narration-v3.json` gains a `shot` and
`offset` per clip. It owns the words; the manifest owns timing, steps and camera. A
build step joins them into the `{shot, file, duration, offset, text}` shape
`Film.tsx` already expects, so the composition is untouched.

**Cold open replaces explanation-over-unrelated-picture.** A new 36 s shot shows the
gallery and its four projects, opens one, and opens the WebMCP inspector reading
48/48 — so "forty-eight WebMCP tools" is visible proof rather than a claim, at the
exact moment the narration says it.

**Simplex is cut, not trimmed everywhere** (user's decision). Simplex and Integer
Partitions are two scenes of the *same* project, so all four projects still appear;
what the film loses is one of eight scenes, not one of four projects. Clip
`13-simplex` is dropped with it — it describes the tetrahedron, which is no longer on
screen.

**A modest trim is still required.** Dropping simplex (−17 s) does not by itself pay
for the cold open (+36 s) and the longer close (+7 s). Five shots lose 2–4 s each,
chosen by slack between their length and the narration they carry, never below it.

## Shot plan

172 s picture, 143.25 s speech, ≈29 s of silence spread across the film.

| # | shot | s | clips | speech |
|---|---|---|---|---|
| 1 | **cold-open** (new) | 36 | 01-what, 02-problem, 03-webmcp | 34.7 |
| 2 | opening-attempt | 5 | 04-handwriting | 4.8 |
| 3 | opening-tutor | 6 | 05-mark | 8.6 |
| 4 | opening-correction | 3 | — | — |
| 5 | reconstruction | 12 | 06-live-math | 8.8 |
| 6 | gamma-probability | 19 | 07-density, 08-bridge | 16.5 |
| 7 | attention | 14 | 09-attention | 9.2 |
| 8 | training-step | 13 | 10-training | 9.3 |
| 9 | barycentrics | 12 | 12-barycentric | 8.2 |
| 10 | homothety | 12 | 11-geometry | 8.8 |
| 11 | ramanujan | 15 | 14-ramanujan | 9.5 |
| 12 | webmcp-crescendo | 11 | 15-matrix, 16-isolation | 11.8 |
| 13 | one-world | 14 | 17-close | 13.1 |

Clips are placed at absolute offsets, so one may run past its shot into a following
shot that carries none of its own — `05-mark` spills into `opening-correction`, and
`16-isolation` into the head of `one-world`. This is why shot 3 may be shorter than
the clip it starts.

**Why 172 s and not 179 s.** The rule is "must be less than three (3) minutes", and
judges are not required to watch past 3:00. 2:52 buys an eight-second margin against
container rounding and encoder drift for no cost that matters.

## Cold open capture steps

Driven by the same in-page driver as every other shot, so it is the real product:

1. Open `/` — the gallery, four project cards visible. Hold.
2. Click into Gamma Function; the canvas fills. Hold.
3. Open the WebMCP inspector; it reads `48 / 48 page tools`. Hold on the tool list.

No new product code. If the inspector's own open animation reads badly at this size,
that is a finding for the improvement loop, not a reason to fake the shot.

## Build order

```
node scripts/film/capture.mjs                          # take -> capture.mp4 + timeline.json
node scripts/film/narrate-eleven.mjs --spec=narration-v3
node scripts/film/build-narration-manifest.mjs         # new: join spec + manifest -> narration.json
python scripts/film/audio.py                           # music + sfx from the measured timeline
npm --prefix video run render:film
npm --prefix video run render:review
```

## Risks

- **The capture is localhost, not the deployed ChatGPT Site.** The omnibox will read
  `localhost:3400`. Producing this take anyway guarantees a submittable video exists;
  it is replaced if the Site is deployed in time.
- **A 36 s cold open is a third of the film before any mathematics.** If it drags on
  screen, the fix is to tighten it, not to cut the WebMCP proof.
- **Cutting simplex weakens one submission claim.** `SUBMISSION.md` says "eight
  connected scenes"; the video will show seven. The text must say so rather than let
  a judge find the discrepancy.

## Success criteria

1. Under 3:00, over 2:45.
2. ElevenLabs voice throughout; no edge-tts audio in the render.
3. All 48 tools still register during the take; the crescendo chip reads 48/48.
4. No clipped text, no unintended overlap, nothing cut by the canvas edge, in any
   sampled frame.
5. Narration never describes something absent from the picture.
