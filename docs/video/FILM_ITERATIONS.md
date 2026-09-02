# Mathburst film — iterative improvement log

Each cycle: watch the complete render, list what is wrong, fix it at the source (product, manifest, capture driver, narration, audio, or composition), re-capture where the product changed, re-render, and record the change here. Renders are numbered; the final deliverable is always `video/out/mathburst-final.mp4`.

## Take 1 — 2026-09-02 04:20 (baseline, not rendered)

First complete capture through the manifest. 166.3 s, four seconds over the 2:42 ceiling.

Found by frame inspection:

- Shot 07 (training) overran by 1.9 s and the learner's `train 1 step` click missed: the button was measured while the camera was still moving after the transition. The Tutor's step therefore became step 1.
- Shot 12 (crescendo) overran by 0.9 s.
- The training card's output-distribution rows spilled into the loss card: an older four-column grid rule survived the cinematic stylesheet.
- The Tutor's spiral-similarity invariant equation was clipped on the right of the geometry frame.
- The Tutor's δ cue also moved the section plane, so the learner's section sweep in shot 10 had nothing left to do.
- Commit events for the second shot of each project were missing from the timeline (read from a stale world), which would have silenced their sound-design ticks.

Fixes before take 2/3:

- Capture driver measures a target twice, 140 ms apart, and acts only once it has stopped moving; every shot starts with at least 1.3 s of settle after a transition.
- Budgets rebalanced to 162 s: density 19, training 12, partitions 19.
- Training card grid fixed; spiral equation widened; the Tutor's δ cue leaves the section plane alone.
- Commits are read once at the end of the take from every project's own history.
- Narration copy tightened so every clip fits its shot budget (shot 03 spills 0.8 s into shot 04, whose narration starts at 1.3 s).

## Take 3 → Render 1 (review, 1280×720) — 2026-09-02 04:54

First complete render. 162.0 s at 60 fps with narration, music, and sound design; every shot and every one of the 35 commits present. Watched as 65 sampled frames (`node scripts/film/qa-sheets.mjs`) and by playing the file.

Found:

- The film ran long at the source (165.6 s), so the composition's 162 s ceiling cut the closing lockup short.
- Cards occupy little more than half the frame width; the composition's camera pushes (≤ 1.08) cannot make up for a review camera that was tuned for a 1440-px laptop.
- The training → barycentrics cut crosses a project boundary and the camera panned across the new project's empty canvas: roughly one second of bare ivory with a tiny mark in the middle.
- Bridges were authored at ~140 px and were barely visible at 2560 px wide; they read as a smudge rather than as "ribbons become triangle vertices".
- The closing lockup was set at 54 px, legible at 1440p and marginal at 720p.
- The music bed clipped at 0 dBFS before the composition's gain was applied.

## Takes 4–6 — cycle 1: story, pacing, transitions

- Budgets trimmed to 160 s at the source (reconstruction waits 2.4 s instead of 3 s between Tutor steps, attention 18 s, one-world 7 s). Take 6 measured 161.7 s with all 35 commits and no shot more than 0.1 s over budget.
- Project switches no longer pan: the outgoing world dims for 300 ms, the world cuts to the new project on its own frame, and the incoming world fades in over 560 ms while the bridge morph carries the preserved object across (`previewNextDirectorShot`).
- Bridge geometry, stroke widths, dots, and captions scale with the shorter side of the frame (`CinematicBridge`), so a bridge occupies roughly a fifth of the picture at 2560×1440 and still fits a laptop.
- Music and sound-design files are peak-normalised on write (−6 dBFS music, −12 dBFS sfx); the manifest's bed gain is now −16 dB with −7 dB ducking under speech.
- QA sheets label every sample with its timecode; the ffmpeg font is addressed by file so the script works on Windows.

## Take 7 — cycle 2: composition and typography

- The film camera sits 1.18× closer than the review camera on every frame except the overview (`FILM_CAMERA_FIT`), keeping each frame's focus point fixed; the composition's pushes remain as authored.
- The final lockup grows to 4.4 vw at film size, with a larger registered-tools chip, so "One mathematical world." reads at 720p.
- Take 7 showed the closer camera pushing the clinic's Tutor panel above the top edge, so the learner's "Correct the sign" click missed (34 of 35 commits). The clinic keeps a 1.04× fit; every other frame uses 1.18×. Take 8: 161.5 s, 35 commits, no shot over budget.
- Render 2 (final + review) is built from take 8.

## Render 2 (final 2560×1440 + review) — 2026-09-02 05:47

From take 8. 161.1 s, 60 fps, stereo 48 kHz; integrated loudness −19.4 LUFS, true peak −4.4 dBFS, loudness range 6.8 LU. Contact sheets (`video/out/contact-storyboard.png`, `contact-transitions.png`) show thirteen distinct frames and every bridge mid-flight.

Found on the full viewing pass:

- The reconstruction shot kept the camera on the handwriting while the Tutor's semantic draft and audit panel sat at the right edge at 380 px; the composition's push now travels to that panel for the audit and approval and returns to the reconstructed LaTeX.
- Everything else held: no blank or stale frames, no overlaps between narration clips, the crescendo bridge (residue lanes → tool families) reads as dots gathering under the lockup, and the closing lockup survives the 720p review copy.
- The contact-sheet script needed the same Windows font fix as the QA sheets.

## Render 3 — cycle 3: QA pass

- Same take 8 capture; only the reconstruction camera changed in the manifest. Re-rendered final and review, re-probed, contact sheets regenerated.
- The first cycle-3 push (zoom 1.14 at x 0.66) clipped the audit panel's right edge by a sliver on the review copy; re-set to zoom 1.12 at x 0.60 so the panel stays whole. The cycle-3 final started while `pnpm build` was running and Remotion's bundle server timed out; renders are run on an idle machine.
