# Mathburst demo video

This Remotion composition turns a real Mathburst screencast into the submission film. The product is full bleed for the complete 155-second narration body. Frame one is the functioning whiteboard. There is no title card or end card.

The composition consumes these files from `video/public/`:

- `screen.mp4` — the real product capture from `scripts/record-demo.mjs`.
- `beats.json` — measured beat timing and focus rectangles for restrained camera moves.
- `narration.json` — the seven beat definitions and their 155-second body timing.
- `seg00.wav` through `seg06.wav` — one narration track per beat.

## Rebuild from the repository root

Run the product and capture it at the root URL:

```powershell
pnpm build
npx vinext start --port 3400
```

In a second PowerShell window, capture the product, build the seven narration files, and copy the metadata:

```powershell
$env:URL = 'http://localhost:3400/'
node scripts/record-demo.mjs
pwsh -File scripts/build-narration.ps1 -Json docs/narration.json -OutDir video/public
Copy-Item -LiteralPath docs/narration.json -Destination video/public/narration.json -Force
```

Then install the separate video workspace and render:

```powershell
npm --prefix video install
npm --prefix video run render
```

The render is written to `video/out/demo.mp4`. To preview the composition instead, run `npm --prefix video run studio`.

## Composition rules

The seven held marker/caption pairs are defined in `video/src/Demo.tsx` and follow the narration beat order. The marker is quiet and top-aligned. The caption is a readable bottom band. Both use Mathburst ivory, graphite, and purple with no gradients.

The camera may use the measured focus rectangles, but narrow regions stay at a full-product shot. This keeps tool panels, equations, and the mathematical canvas from being cropped out for emphasis.

The final beat closes on the shared mathematical world and the WebMCP thesis. Audio is attached to its matching beat sequence, so changing a beat's timing requires regenerating `beats.json`, `narration.json`, and the seven WAV files together.
