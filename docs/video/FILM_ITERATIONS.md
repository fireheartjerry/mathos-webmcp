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
