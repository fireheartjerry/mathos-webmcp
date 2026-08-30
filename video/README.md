# The demo video

A Remotion composition that assembles the submission video from three things, none of
them staged:

1. **`public/screen.mp4`** — a real screencast of the production build being driven
   through its own WebMCP tools, produced by `scripts/record-demo.mjs` at the repository
   root. Nothing in it is mocked; every state change went through `executeTool`.
2. **`public/seg*.wav`** — the narration, one file per beat, synthesised offline by
   `scripts/build-narration.ps1` from `docs/narration.json`.
3. **`src/Demo.tsx`** — the composition: the screencast stays the subject, with a caption
   carrying the sentence being spoken and a quiet marker naming the beat.

## Why it is a separate workspace

It has its own `package.json` so the application's dependencies stay small. Remotion pulls
a renderer and a headless browser, and nobody reviewing the source of a maths scratchpad
should have to install those to run `pnpm test`.

## Rebuilding

```bash
# 1. the picture — needs the production server and an ACTIVE flagged Chrome tab
pnpm build && npx vinext start --port 3400
#    open http://localhost:3400/learn, make that tab frontmost, then:
FPS=6 HOLD_SCALE=8.5 node scripts/record-demo.mjs

# 2. the voice
pwsh -File scripts/build-narration.ps1

# 3. stage and render
cp docs/images/demo.mp4 video/public/screen.mp4 && cp .narration/*.wav video/public/
cd video && npm install
npx remotion studio src/index.ts     # to preview and adjust
npx remotion render src/index.ts Demo out/demo.mp4 --concurrency=4 \
  --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

`--browser-executable` is not optional here: Remotion's bundled headless shell downloads
but is then not found on this machine, and pointing it at the installed Chrome is the fix.

## Timing

The captions and audio are positioned from `startSeconds` in `src/Demo.tsx`, which mirror
the beat holds in `scripts/record-demo.mjs` at `HOLD_SCALE=8.5`. **Change one and you must
change the other**, or the voice drifts away from the picture. Each segment's spoken
length was measured against its budget after synthesis; all seven fit.

## Replacing the synthetic voice

The narration is a Windows system voice. It is correct and correctly timed, which makes it
a usable reference track — but a human read will always be better. To replace it, record
one file per beat at the same lengths, drop them in as `seg00.wav` … `seg06.wav`, and
re-render. No code changes.
