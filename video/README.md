# Mathburst submission film

The [public 2:59 film](https://youtu.be/xBAUK71mjGY) is a Remotion composition built from one continuous 2560×1440 capture of the real Mathburst product. The composition adds only straight cuts, restrained framing, ElevenLabs narration, a licensed royalty-free ambient score, and event-locked sound design. It does not redraw product screens.

The current `Film` composition consumes generated files under `video/public/film/`:

- `capture.mp4` and `timeline.json` from the scripted product take;
- `cutlist.json`, which maps measured capture spans onto the finished-film clock;
- `narration.json` plus the ElevenLabs clips in `narration-v2/`;
- `music.wav` and `sfx.wav`.

The editable source of truth is `video/film.manifest.json`. It defines the 2560×1440, 60 fps output, the three-minute ceiling, product actions, camera targets, narration, music ducking, and sound cues. The renderer derives its duration from the last narration word plus a 1.6-second closing hold, which prevents the final line from being cut off.

## Rebuild from the repository root

```powershell
pnpm install
npm --prefix video install
pnpm dev --port 3400
```

In a second shell:

```powershell
node scripts/film/capture.mjs
node scripts/film/narrate-eleven.mjs
node scripts/film/build-cutlist.mjs
node scripts/film/build-narration-manifest.mjs
python scripts/film/audio.py
npm --prefix video run render:film
```

The final render is `video/out/mathburst-final.mp4`; `render:review` creates a half-scale review copy. Generated capture, narration, and render files are intentionally ignored. See [`docs/video/FILM_REPRODUCTION.md`](../docs/video/FILM_REPRODUCTION.md) for setup, caching, QA contact sheets, and exact verification checks.

## Current composition guarantees

- Every on-screen edit originates in the actual product reducer or a registered WebMCP handler.
- Each shot renders on a sequence-relative clock, preventing later shots from drifting away from narration.
- Narration offsets live on the finished-film clock; music ducking uses those same measured windows.
- The closing frame holds until narration finishes, then resolves cleanly on the Mathburst/WebMCP lockup.
