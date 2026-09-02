# Reproducing the Mathburst film

Everything in `video/out/mathburst-final.mp4` comes from one continuous take of the real product, performed by a script against the storyboard's thirteen Director frames. No frame is drawn outside the product; the composition only adds camera pushes, narration, music, and event-locked sound design.

## Requirements

- Windows with Google Chrome ≥ 146 (the launcher passes `--enable-features=WebMCP`, so all 18 tools register with the browser during the take).
- Node ≥ 22, pnpm, ffmpeg and ffprobe on `PATH`.
- Python 3 with `numpy` and `edge-tts` (`pip install edge-tts`). Narration needs network access for the neural voice; the other steps are offline.
- A display at least 2560 px wide for the capture window (the window is positioned by `product.chromePosition` in the manifest).

## One-time setup

```powershell
pnpm install
npm --prefix video install
```

Start the product on port 3400:

```powershell
pnpm dev --port 3400
```

The capture opens `http://localhost:3400/?film=1`. The `film` query flag hides Director chrome, renders a pointer, and exposes the in-page driver hook the script uses; it adds no product behaviour.

## The manifest

`video/film.manifest.json` is the single editable source for the film:

- `output` — resolution, frame rate, maximum runtime.
- `shots[]` — one entry per Director frame, in order. Each has the storyboard `seconds` budget, the `steps` the driver performs (real pointer drags, clicks, typing, sliders, and Tutor `cue`s that run through the registered WebMCP tools), `camera` keyframes for the composition's push (`zoom`, `x`, `y` as fractions of the frame, `at` in seconds), the `narration` text and its `narrationOffset`, `transitionOut` (`bridge` plays the product's own match transition; `camera` is a plain camera move), and `approved`.
- `narration` — neural voice, rate, pitch, gain.
- `music` — bed gain, ducking depth under speech, and the synthesis seed.

## Build

```powershell
node scripts/film/capture.mjs        # one continuous take → video/public/film/capture.mp4 + timeline.json
node scripts/film/narrate.mjs        # thirteen narration clips → video/public/film/narration/*.wav + narration.json
python scripts/film/audio.py         # music.wav and sfx.wav from the measured timeline
npm --prefix video run render:film   # video/out/mathburst-final.mp4 (2560×1440, 60 fps, H.264 CRF 16)
npm --prefix video run render:review # video/out/mathburst-review.mp4 (1280×720 review copy)
node scripts/film/contact-sheets.mjs # video/out/contact-storyboard.png and contact-transitions.png
```

`SHOTS=opening-attempt,opening-tutor node scripts/film/capture.mjs` captures a subset of consecutive shots while iterating. `KEEP_FRAMES=1` keeps the raw screencast frames under `.film/frames`. `FILM_OUT=.film/take9 node scripts/film/capture.mjs` writes a take to a side folder so a render already reading `video/public/film/capture.mp4` is never disturbed; copy `capture.mp4` and `timeline.json` across once the take is accepted.

`node scripts/film/qa-sheets.mjs <file.mp4> [stepSeconds]` tiles a render (or a raw take) into timecoded contact sheets under `.film/qa/` for a fast full-length viewing pass.

## What the capture guarantees

- The take starts from cleared storage, so every Tutor mark, correction, reconstruction, training step, and construction is created on camera by the real reducer and tools.
- `timeline.json` records each shot's measured start and end, every product transition, and every commit with its author and timestamp read back from the world's own history. The sound design and the narration schedule are derived from it, never typed in.
- The screencast emits frames only when pixels change; the encoder holds the last frame across still moments and resamples to a constant 60 fps.

## Verification checklist

1. `ffprobe video/out/mathburst-final.mp4` reports 2560×1440, 60/1, and a duration at or under 2:42.
2. `video/out/contact-storyboard.png` shows thirteen distinct product frames; `contact-transitions.png` shows each bridge mid-flight with its preserved object visible.
3. Narration in `video/public/film/narration.json` fits each shot budget (the synthesiser prints `fits` for every clip).
4. `pnpm typecheck`, `pnpm build`, and `git diff --check` pass.

Generated media under `video/out/` and `video/public/` is ignored by git on purpose; the sources that reproduce it are tracked.

## Narration v2 (ElevenLabs)

The v2 film (`docs/video/FILM_V2_STORY.md`) is narrated with ElevenLabs instead of edge-tts. The pipeline is `scripts/film/narrate-eleven.mjs` (Node 22+, no dependencies beyond `fetch`, `ffmpeg` and `ffprobe`) and the script is `scripts/film/narration-v2.json`.

**Key.** Put the API key in `.env.film` at the repo root as `ELEVENLABS_API_KEY=...`. The script reads that file directly (it does not use the shell environment) and never prints the key. `.env.film` is not tracked.

**Commands** (run from the worktree root):

```powershell
node scripts/film/narrate-eleven.mjs --list-voices   # account voices + the male/English library voices, with labels
node scripts/film/narrate-eleven.mjs --dry-run       # prints every clip, its character count and cache state; no API calls
node scripts/film/narrate-eleven.mjs                 # synthesises, converts, measures, writes narration-v2.json
```

**Voice.** `Brian - Deep, Resonant and Comforting`, premade, `voice_id nPczCjzI2devNBz1zQrb` (male, American, middle-aged): low, calm, clearly articulated, and conversational rather than broadcast-formal, which fits the short teaching sentences. Model `eleven_v3` (the script falls back to `eleven_multilingual_v2` if v3 is rejected, stripping v3 audio tags such as `[calm]` in that case). Settings: stability 0.5, similarity 0.8, style 0.2, speed 1.0; output `mp3_44100_128`.

**Processing.** Each mp3 is converted with the same ffmpeg chain as `narrate.mjs`: 48 kHz mono WAV, leading/trailing silence trimmed at -45 dB, `loudnorm` to -18 LUFS (TP -2, LRA 9). Outputs land in `video/public/film/narration-v2/<id>.wav`, and `video/public/film/narration-v2/narration-v2.json` records the voice, model, settings and each clip's measured duration and text. The run prints a table of clip id, act, seconds and characters, and the subscription's character usage before and after (`/v1/user/subscription`).

**Caching.** The raw mp3 is cached under `video/public/film/narration-v2/.cache/<hash>.mp3`, where the hash covers the clip text, voice id, model and settings. A per-clip stamp `<id>.json` records the hash used for the WAV. Re-running only calls the API for clips whose text, voice, model or settings changed; unchanged clips are re-measured from the existing WAV. Delete `.cache/` to force a full re-synthesis. Everything under `video/public/` is gitignored.
