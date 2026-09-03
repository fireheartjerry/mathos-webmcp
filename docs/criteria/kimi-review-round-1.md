# Round 1 blind hostile review — MathBurst WebMCP Challenge baseline film

Target: `C:\Users\fireh\Downloads\MathBurst-WebMCP-Challenge-Baseline.mp4`
Verified container facts (ffprobe): 177.23 s (< 180 ✓), 2560×1440, 60 fps, H.264 High + AAC 48 kHz stereo ✓. Video bitrate ≈ 984 kbps; pixel format `yuvj420p` (full-range, bt470bg). Method: 18 frames extracted at 10 s intervals, inspected at 1280×720, cross-read against `docs/video/FILM_V2_STORY.md` (draft 2) and `docs/video/FILM_V2_SPEC_TRACE.md`.

## Verdict

The film meets the delivery envelope and covers most of the mandated beats, but it breaks two hard constraints: the browser/omnibox with the public URL never appears anywhere, and the closing "48" claim is "tools registered", not tools used — a claim the product's own counter cannot back. It also carries a header button ("Reconstruct photo") whose existence the approved story explicitly forbids, and the agent console — the film's central "the agent is unmistakable" device — is not visibly present in any sampled frame. This is a competent product capture wearing the costume of the v2 film, not the v2 film.

## Findings

### F1 — No browser chrome, no omnibox, no public URL anywhere  [severity: critical]  [basis: fact]
**Where:** every sampled frame, e.g. 0:00 (gallery + New-project dialog), 2:40 (lockup). Full-bleed app capture; no tab strip, no address bar.
**What's wrong:** The prompt's hard constraint and the story's Act 0.1/Act 8.3 require the deployed public surface `https://mathburst.fireheartjerry.chatgpt.site/` visible in the omnibox, ending on the omnibox hold. Nothing in the film establishes *where* this app lives; a judge cannot tell it from a localhost screen recording.
**Consequence:** Directly fails the "never present localhost as the judged product" constraint and challenge requirement that the link be shown; the closing beat (Act 8.3) is missing entirely.
**Cheapest real fix:** Re-capture (or re-frame the capture crop) with browser chrome in shot; if the pipeline crops to the content area, widen the crop for Act 0 and Act 8 at minimum, and hold the URL for ~2 s at the close.

### F2 — Climax counter reads "48 tools registered", not 48/48 used  [severity: critical]  [basis: fact]
**Where:** ~2:40 lockup frame: purple chip reads "WebMCP 48 tools registered". Top-left ledger chips show `step_history`, `delete_objects`; right-bottom reads "Activity 31".
**What's wrong:** The mandated climax is "48 / 48 tools · N calls" — every tool *used at least once*. "Registered" only proves the tools exist; the story's Act 8.1 and the prompt's "48/48 real-call climax" require demonstrated use. As shot, the film's single most important proof point asserts capability instead of demonstrating it — dangerously close to the forbidden "fake counters unsupported by the product".
**Consequence:** The headline claim collapses under one judge's question ("did it actually call all 48?"). Worst possible place for a soft claim.
**Cheapest real fix:** Drive the real per-tool counters (the inspector already has them, per SPEC_TRACE #9) and end on the ledger's distinct/total readout at 48/48; if some tools genuinely never fire in the take, cut the "every tool" line rather than reword it.

### F3 — "Reconstruct photo" button in the header  [severity: major]  [basis: fact]
**Where:** header top-right, visible at 0:20–0:40 (and "Reconstruct photo | Agent replay" pair early in Act 1).
**What's wrong:** FILM_V2_STORY Act 1.5 states explicitly: "No photo, no reconstruction: the equation tool is the parity beat." The button sits on camera through the exact act that bans it, advertising a flow the film disowns.
**Consequence:** A judge who clicks or even reads the header sees the product offering the shortcut the story says was removed; undermines the "the agent types the LaTeX live" beat and looks like an un-cleaned build.
**Cheapest real fix:** Hide the entry point behind the film flag (`?film=1` already exists per SPEC_TRACE) or remove it; re-shoot Act 1 takes.

### F4 — Agent console not visible; learner/agent lines appear as printed canvas text  [severity: major]  [basis: fact]
**Where:** 0:20–0:40: the prompt "Don't finish it. Mark the exact place my reasoning breaks." is set as a static printed line at the top of the scene, not typed into a chat or console. No top-centre console card, no Accept/Decline card, no intrusive activation sweep is visible in any sampled frame (0:00–2:50).
**What's wrong:** The vision's core grammar — console docked top-centre, scripted words, approvals looking like Claude's, purple sweep on activation — is absent from the picture. The agent's presence is carried by toasts and purple ink only.
**Consequence:** The "approvals" and "intrusive purple agent grammar" preservation requirements are not satisfiable from what is on screen; the human/agent split (a judging focal point) reads as caption + cursor, not as a dialogue.
**Cheapest real fix:** Show the existing Agent replay console (top-centre dock is built, per SPEC_TRACE #7) during agent turns; keep the proposal card on screen until the cursor clicks Accept.
**Caveat:** sampled at 10 s intervals; a console visible only in short windows could be missed. If so, it is still too fleeting to carry the beat.

### F5 — Duplicate, colliding toasts; one clipped at the viewport edge  [severity: major]  [basis: fact]
**Where:** ~1:40 (geometry): top-left toast "Used 1 WebMCP tool · construct_geometry" *and* top-right toast "Tutor constructed the spiral-similarity centre and its equa… / construct_geometry ✓" — the right toast is cut off at the frame edge.
**What's wrong:** The same tool call fires two notifications in two corners, and one is visibly clipped. SPEC_TRACE #36 ("no overflow anywhere, impeccable") and the "left side = WebMCP" rule are both violated.
**Consequence:** Looks unfinished in the most tool-dense act; the clipped toast is exactly the kind of defect the professionalism passes claim to have eliminated.
**Cheapest real fix:** One toast, anchored top of the left WebMCP column; suppress or merge the narrative duplicate.

### F6 — WebMCP ledger collapsed or illegible for most of the film  [severity: major]  [basis: fact]
**Where:** 0:20–1:20 the left column is a thin rotated "WEBMCP ✓" sliver; at ~2:10 the expanded ledger is a dense stack of ~11 px chips, unreadable at delivery resolution; the running "X / 48" totals never read clearly in any sampled frame.
**What's wrong:** The ledger is the film's scoreboard. It is either collapsed (Act 1–3) or typographically below the floor when open.
**Consequence:** The "running totals" requirement (#9/#10) is technically present but functionally invisible; viewers cannot follow the count-up that Act 8 pays off.
**Cheapest real fix:** Pin the column open for the whole take; raise the counter line ("12 / 48 tools · 38 calls") to a large, high-contrast header and let the per-call log stay small.

### F7 — Stray full-canvas ellipse scribble dominates the density scene  [severity: minor]  [basis: fact]
**Where:** ~2:10 and visible again in the 2:40 overview: a huge rough hand-drawn ellipse circles the entire Gamma-density widget, crossing the card and the ledger-side whitespace.
**What's wrong:** Reads as an accidental ink stroke rather than a deliberate shape beat (Act 5's ellipse should box Act 3, not smear across the density card). No toast ties it to an agent or human action at that moment.
**Consequence:** Visual noise around the film's first showpiece widget; risks reading as exactly the "fake overlay" sloppiness the constraints ban.
**Cheapest real fix:** Erase it (it's in history) or re-take the Act 5 shape beat with a sized ellipse and a visible toast.

### F8 — Full-range (`yuvj420p`) H.264 at ~1 Mbps  [severity: minor]  [basis: fact]
**Where:** container metadata; visible as the washed, milky greys in the 0:00 dimmed gallery.
**What's wrong:** Full-range flagged/bt470bg-tagged 1440p60 at 984 kbps will band and shift gamma on players that assume limited-range BT.709 (YouTube re-encode included).
**Consequence:** The ivory canvas and purple aura — the film's whole color grammar — drift on the platform the film is made for.
**Cheapest real fix:** Re-encode to `yuv420p`, BT.709 tags, and a sane bitrate (≥ 12 Mbps) for upload; keep the master as-is.

## What's working

- Delivery envelope: 177.23 s, 2560×1440, 60 fps, H.264/AAC — inside every hard delivery constraint.
- Act 1 spine: handwritten Gamma recurrence with the sign error, agent circle + handwritten "v = −e⁻ˣ, two negatives" note (0:40) — the read-then-mark beat lands and the purple ink is unmistakable.
- Attention card (1:10): dense, legible, `Σ α = 1.000`, derived/edited tagging, activity log entry "Edited W_Q[0][0] to 1.4" correctly attributed to Tutor.
- Geometry act (1:40): spiral-similarity construction with live ratios/equal angles and Tutor/You attribution in the activity log — the "every mark depends on your three points" claim is credible.
- Closing lockup "One mathematical world. / Every agent can enter." (2:40) — strong, on-brand, keep verbatim.
- Project gallery with the four seeded cards and the New-project dialog named flow — Act 0.2's shape is right.

## What I could not evaluate

- Audio content: AAC stream exists and is full-length, but I did not transcribe it — narration quality, voice, and whether it names WebMCP are unjudged.
- Motion-only beats: cursor-led action visibility, purple aura flashes, timeline draw-ins, viewport pans, and the activation sweep cannot be confirmed from 10 s-interval stills; F4's caveat applies to all of them.
- Whether the filmed instance is actually the deployed `mathburst.fireheartjerry.chatgpt.site` build — precisely because no URL is ever shown (F1).
- The 48/48 claim's ground truth: whether all 48 tools fire during the take is not verifiable from stills; the ledger's final state is never legibly shown (F2/F6).
