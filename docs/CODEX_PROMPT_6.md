# You now own the film pipeline, end to end, until it is deliverable

Repo: `/Users/fireheartjerry/Code/mathos-webmcp`, branch `hackathon-build`, at commit
`60515c9`. No worktree this round — work directly on `hackathon-build`. You may delete
any stale `codex/*` worktrees whose branches are already merged
(`git worktree list`, `git branch --merged hackathon-build`).

**The standing rule that Claude owns capture and render is lifted.** You may now run
everything in `scripts/film/`, launch Chrome, take captures, build the cut, generate the
audio bed and render the final MP4. You own the whole loop and you iterate it yourself
until the acceptance checks below all pass. Do not hand a take back for review that you
have not already measured against them.

---

## The deliverable

A single MP4, **strictly under 3:00**, that is a real screen recording of the real
product: every tool call in it is an actual WebMCP call against the running app, in one
take. This is a hackathon submission (OpenAI WebMCP Challenge) and the deadline is
**2026-09-04 04:00 EDT**.

Write the final file to `~/Downloads/Mathburst-WebMCP.mp4`. `render-fast.mjs` defaults
its output to `process.env.USERPROFILE`, which is undefined on macOS, so **always pass
the output path as argv[2]**.

---

## The loop

A dev server is expected on `http://localhost:3000` (`pnpm dev`; the `--port` flag is
NOT respected). Check `lsof -i :3000` before starting another one. The capture drives a
headful Chrome via CDP and takes about four and a half minutes, so run the cheap gates
first — every one of them exists because it once cost a whole capture to discover.

```bash
npx tsc --noEmit                      # must be clean
node scripts/film/check-layout.mjs    # widget spacing + timeline keyframe ranges
```

Then, in order:

```bash
FILM_MANIFEST=video/film.replay.manifest.json FILM_OUT=video/public/film-replay \
  node scripts/film/capture.mjs                       # writes capture.mp4 + timeline.json

FILM_DIR=video/public/film-replay node scripts/film/build-replay.mjs   # cutlist + narration
FILM_DIR=video/public/film-replay python3 scripts/film/audio.py        # music + sfx bed
FILM_DIR=video/public/film-replay FILM_MANIFEST=video/film.replay.manifest.json \
  node scripts/film/render-fast.mjs ~/Downloads/Mathburst-WebMCP.mp4
```

Capture the script's own exit status, not a pipeline's. `cmd > log; echo $?; tail log`
reports `tail`'s status and a failed capture then looks successful — that mistake has
been made here before.

---

## Where it stands, honestly

The last clean take is **189.95s**, with the final lockup at 186.34s. `build-replay.mjs`
now measures the content end with `ffmpeg freezedetect` rather than taking a hand-typed
`CONTENT_ENDS`, so the film will come out at roughly **187 + HOLD**. That is **about ten
seconds over the cap** and closing that gap is the main open problem.

Three real human commits are now in the timeline, which is the thing the reviewer most
wanted and the thing most easily broken by a careless edit:

```
127.12  human  Resized objects
130.40  human  Rotated objects
146.46  human  Undid erased 1 ink object by id
```

Ten seconds have already been trimmed out of animation durations and inter-step waits,
twice. **Do not just shave the waits again** — the reviewer's single loudest complaint
was that everything felt rushed and hard to read, and there is very little left to take
without making that true. Prefer cutting or shortening a *beat* over speeding up all of
them. Places worth looking at, with their cost in the last take:

- the `new-project` cold open, 7.6s of gallery navigation before any mathematics;
- 7.8s between the opening ink and the first tutor commit;
- the closing run — concept map, off-canvas compatibility fixture, ledger hover,
  lockup — about 13s from 173s to the end;
- `HOLD` on the final card.

You may restructure the picture to fit. You may not fit it by making a claim untrue.

---

## Acceptance checks — all of them, measured, before you report

1. **Under 3:00.** `ffprobe` the rendered file and say the number.
2. **48 of 48 tools.** The capture log prints `webmcp tools registered with the browser`
   and the on-screen ledger must read 48/48. The ledger counts a tool as used only on a
   *successful* completion, so one failing call shows as 47/48 on camera. Zero red
   errors in the console — grep the take's console lines for `!`.
3. **The three human commits above are still in `timeline.json`,** and the Undo commit
   still reads `Undid erased 1 ink object by id`. If it reads anything else, the pause
   landed in the wrong place and the film is lying about undo.
4. **Every spoken and written claim is true of the picture.** Watch it. If the voice
   says a thing happens, it has to happen on screen.
5. **The final lockup is fully built inside the cut.** `build-replay.mjs` fails loudly
   if it is not; do not paper over that with an override.
6. **The narration schedule is sane** — `build-replay.mjs` prints a table of clip, beat,
   start, drift. No clip may start before the beat it describes.

---

## Traps already paid for. Do not pay again.

- **Tool description limits.** Tool descriptions cap at 500 characters, parameter
  descriptions at 150. Exceeding either makes the app throw at tool construction and the
  whole page 500s. `tsc` cannot see this. Only loading the page catches it. This has
  broken the app twice.
- **`wait` is a modifier, not a step.** The capture's dispatcher used to test `step.wait`
  first, silently reducing `{startReplay, wait}` to a bare wait. Fixed, but the shape of
  the bug — an `else if` chain where an optional field shadows the real action — is easy
  to reintroduce.
- **A pause only lands at the runner's next step boundary.** `pauseReplayAfter` is keyed
  on rendered console text, and by the time it gates, one or two more steps have run. If
  the next steps commit anything, a subsequent human Undo hits the wrong commit. That is
  exactly how the film ended up "undoing" a simplex setting. Act 5 now ends on say-only
  steps to hold the undo stack still; keep that property.
- **`calls: [...]` fires with `Promise.all`.** Five parallel `train_model_step` calls all
  read the same state: four duplicate each other and one fails red on camera. The
  thirteen gradient steps are sequential on purpose. Never group them.
- **A keyframe past its timeline's duration kills the replay** with
  `Keyframe time X is outside the timeline duration [0, Y]`. `check-layout.mjs` now
  checks this; run it after any pacing change.
- **`create_objects` refuses an empty equation.** The lineage lines seed
  `\phantom{x}` and type over it.
- **Inside a JS template literal, `\n` and `\s` collapse.** A regex written as `/\n/g` in
  an injected `page.evaluate` string spans two lines and throws; `/\s+/g` becomes `/s+/g`
  and eats every letter s. Escape them as `\\n` / `\\s` in the source.
- **The world is one horizontal strip on a 1000px pitch.** Acts exit stage-left and the
  camera only ever pans right. Keep it that way; diagonal pans left the previous act
  hanging in frame, which the reviewer flagged.
- **Act 6 is off-canvas on purpose.** The simplex and partition labs are cut from the
  picture but still driven at x ≈ -6200, because `set_simplex_view` and
  `set_partition_view` are called nowhere else and a naive cut takes the ledger to 46/48.

---

## Constraints that do not move

- Exactly **48** tools register and all 48 must succeed. Do not change tool names,
  schemas, or the count.
- `npx tsc --noEmit` clean at every commit.
- **No ElevenLabs calls that spend credits.** Narration audio is fixed. Two lines have
  already been surgically trimmed with `ffmpeg` to remove claims the picture does not
  make (`07-density`, `10-training`; originals kept as `*.orig.wav`). You may cut or drop
  a clip, and you must update both `video/public/film/narration-v3/narration-v3.json` and
  the per-clip json when you do. You may not re-render speech.
- `audio.py` reads `video/film.manifest.json` for output and gain even when `FILM_DIR`
  points at the replay film. Leave that alone unless it actually bites.

---

## When you report

Give: the rendered duration, the ledger count, the three human commit lines from
`timeline.json`, the narration schedule table, what you cut to make the runtime, and
anything you could not satisfy. Log anything you need from Claude in
`docs/CODEX_REQUESTS.md` — but this round, the expectation is that you finish it.
