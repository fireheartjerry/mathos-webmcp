# Film v2 — specification trace

Every requirement Jerry stated in the 2026-09-02 session, where the story (`FILM_V2_STORY.md`, draft 2) satisfies it, and whether the product already supports it. Status: **Met** (story beat and product both in place), **Story only** (story covers it, product work still open), **Open** (needs Jerry's decision or an owner action).

## Surface and capture

| # | Requirement (Jerry's words, condensed) | Story beat | Product | Status |
|---|---|---|---|---|
| 1 | Link in the omnibox is the real ChatGPT site, not localhost; film on the ChatGPT Sites surface | Rules §1; Act 0.1; Act 8.3 | Repo linked to a Site (`.openai/hosting.json`); deploy not yet run | **Open**: deploy needs your yes (replaces the old Second Try site) |
| 2 | Screen recording as a normal human using Mathburst, real browser profile and tabs, cursor clearly visible and moving | Rules §2 (system cursor performs every human action) | Cursor is the OS cursor; nothing hides it | Met |
| 3 | Show the entire UI of the app | Rules "never cut to a card floating on ivory"; every act names rail, header, column, log | Layout audited 2026-09-02: column, header, inspector, project bar, zoom control fixed | Met |
| 4 | New project created on camera, named **Pipeline** | Act 0.2 | New-project dialog; `/p/<id>` URL | Met |
| 5 | Sidebar opened and made sticky by the cursor | Act 0.3 (pin the WebMCP column) | Pin persists; column takes layout width | Met |
| 6 | WebMCP status, toast, totals and activity log on the **left** of the screen, not the right sidebar | Rules §4; Act 0.3 | Left column 300 px beside the rail; toast at its top; right side keeps inspector/activity | Met |
| 7 | Agent console top-centre or top-left | Rules §5 (top-centre, fallback top-left) | Docked top-centre; selection bar yields to it | Met |
| 8 | Intrusive animation when the console activates; even more obvious when a WebMCP tool fires | Rules §3 | Activation sweep + veil on console start and on every agent write; 3 px expanding purple ring on changed objects; big toast | Met |
| 9 | Toast "Used X WebMCP tools" then the names, every time; all tools used distinctly; totals at the end | Rules §3; every act's `Used N ·` lines; Act 8.1 | Toast groups simultaneous calls; ledger counts distinct/total; inspector per-tool counters | Met |
| 10 | Activity log of the most recently used WebMCP tool alongside the live counter | Rules §4 | Ledger log newest-first with R/W, ✓/!, summary, changed ids | Met |
| 11 | Narration: professional; better neural voice, frontier, male | Rules §9; `FILM_REPRODUCTION.md` Narration v2 | ElevenLabs v3, Brian (male, deep, calm), 16 clips 2:20 | Met (listen and confirm the voice) |
| 12 | Under three minutes, YouTube, audio covers what was built and how WebMCP was used (contest rules) | Narration clips describe only visible behaviour and name WebMCP | 2:20 narration, 2:42 picture ceiling | Met |

## The journey and the agent's behaviour

| # | Requirement | Story beat | Product | Status |
|---|---|---|---|---|
| 13 | Start with the Gamma function; human handwriting replayed from the saved sample as stroke animation | Act 1.1, 1.4 | `strokeReplay.ts` + pen-tool draw-progress reveal | Met |
| 14 | Agent visibly **reads** what was written (glowing purple border), and the toast says which read tools ran | Act 1.2 | Reading indicator with scanline and label; toast | Met |
| 15 | The mistake is deliberate; the agent reads it and **circles** it, drawn as a stroke animation, and writes out the issue | Act 1.3 | `draw_ink` (progressive reveal) + `annotate_object` handwritten note | Met |
| 16 | Human corrects with the cursor; the agent does **not** comment on it | Act 1.4 | — | Met |
| 17 | Agent offers "Want me to turn that into live math?" with Accept / Decline like Claude's approval buttons | Act 1.5 | Proposal card in the console (Accept purple, Decline outlined, Enter/Escape) | Met |
| 18 | No photo/reconstruction: the agent creates an **equation**, types the LaTeX live, then **resizes** it larger (editing parity) | Act 1.5 | `create_objects` + `edit_equation` with `typewriter: true` + `transform_objects`; handles visible | Met |
| 19 | Agent pans down with a tool (parity of right-drag) whenever it needs space | Act 2.1, 3.1, 6.1 | `set_viewport` / `focus_objects` | Met |
| 20 | Gamma density looks professional, like a widget the tutor generated; must not just appear: widget pops up **empty**, agent types the function, curve appears via the animate tool | Act 2.2 | Restyled density widget; graph widget with LaTeX field; `densityConstruct` preset (axes → curve → area → bins) | Met |
| 21 | Animation library exists and the agent uses it for 3Blue1Brown-style construction; first animation = constructing, second = the bridge; make sure it actually works | Act 2.2, 2.4 | Timelines, `create_timeline` presets, `bridgeMorph` verified in browser | Met |
| 22 | Human plays with the widget while the agent explains **at the same time** | Act 2.3 | Human sliders commit independently of agent calls; agent queue never blocks the human | Met |
| 23 | Agent creates text beside the widget explaining the concept; no overflow | Act 2.3 | `annotate_object` / `create_objects`; overflow rules on every widget | Met |
| 24 | Console messages professional but friendly and casual, globally | Rules §5; script rewritten | `FILM_V2_SCRIPT` lines | Met |
| 25 | While editing a cell the agent explains what the numbers mean for attention (short educational sentences) | Act 3.2 | Script lines; `set_attention_weight` | Met |
| 26 | Agent undoes its step; then the human clicks **train 1 step** repeatedly (about eight); emphasise the widget the agent spawned runs on pure math | Act 3.3 | `step_history`; training card accepts consecutive human steps (learning-rate backoff keeps loss monotone) | Met |
| 27 | Agent leads the user into geometry and **tells** the user to pick Geometry; user places points; agent adds the rest, creatively but sensibly, with many tools | Act 4.1, 4.2 | GeoGebra-style toolbar; `construct_geometry` + `geometryDependencyDraw` | Met |
| 28 | Purple aura attached to the point P the agent wants to move; obvious link to attention | Act 4.3 | `spotlight_objects` aura; `set_barycentric_weights (preset: attention)` reads the live attention weights | Met |
| 29 | Parity beats integrated cinematically, not random or awkward | Act 5 framed as "tidying the page into a lesson sheet" | Shapes, arrows, highlighter, eraser tools on both sides | Met |
| 30 | Simplex and partitions done professionally, connected to Act 4 mathematically; agent always teaching; aura everywhere | Act 6 | `simplexSweep` recovers the triangle; `partitionRows`; honest Ramanujan card | Met |
| 31 | Matrix: 3Blue1Brown animation; the agent always uses the animate tools | Act 7.1 | Matrix editor; `matrixSweep` preset | Met |
| 32 | Every construction uses the WebMCP animate tools throughout (critical) | Rules §7; Acts 2, 3, 4, 6, 7 | 14 presets reachable via `create_timeline`; `play_timeline` | Met |
| 33 | Every human action has a WebMCP equivalent (pen, highlighter, eraser, text, equation, graph, geometry, matrix, image, shape incl. polygon/freeform, arrow editing, frame) | Act 5, 7 and the tool list | 48 tools; polygon/freeform; arrow handles; resize/rotate handles; frame titling | Met |
| 34 | Standard edit controls: resize, rotate, drag for shapes and arrows | Act 1.6, 5.1, 5.2 | Selection handles, node editor | Met |
| 35 | GeoGebra-like geometry; full matrix editor; graph with a LaTeX equation input | Act 4, 7 | Built and audited | Met |
| 36 | No overflow anywhere; nothing too close together; impeccable | Audit 2026-09-02 | Fixed: pinned column overlap, inspector cut-off, header button styles, zoom control labels running together, chrome text-selection, console vs selection bar | Met (re-audit after deploy at 2560×1440) |

## Open items that only you can close

1. **Deploy to ChatGPT Sites** (requirement 1). Say yes; I run the Sites deploy from this worktree.
2. **Voice check** (requirement 11): listen to `video/public/film/narration-v2/01-open.wav`.
3. **Film capture inside the ChatGPT desktop app** cannot be scripted from here; when you are ready I will produce the exact prompt sheet and the Site tools checklist for the take.

## Professionalism pass — 2026-09-02 (round 2)

Verified on the running app at 1440×900 with the WebMCP column pinned and unpinned.

| Area | Finding | Resolution |
|---|---|---|
| Scene camera | Frames sat ~290 px right of centre and clipped at the right edge whenever the WebMCP column was pinned: the camera computed from `window.innerWidth` while the canvas element was narrower. | `canvasSize()` now measures `.world-canvas`; a `ResizeObserver` re-frames on the first paint, on window resize and on pin/unpin, deferred one frame so it has the last word. |
| Scene framing | Authored scene centres could drift from the frames they describe. | Each scene camera now fits its own frame object's bounds with even padding, falling back to the authored responsive camera for the overview, blank projects and the first paint. Measured drift across the eight seeded scenes is ≤ 5 px. |
| Film hooks | Large CSS consolidation risked orphaning film-critical rules. | All of `data-film`, Director panel and safe frame, lockup, bridge, trace, presence, reconstruction, cursor, ledger, toast, console, aura, activation and reading indicator still carry rules; every `data-demo-target` the cues drive is still present. |
| WebMCP end to end | — | Verified live through the real reducer: reads, `spotlight_objects`, `set_barycentric_weights`, `explain_object`, a `barycentricDrawIn` preset timeline with `play_timeline`, and `get_history`. |
| Agent parity for structure | — | Verified live: create objects, group, frame, lock, re-order, `edit_text`, delete and undo, all through tools with clean past-tense summaries. |
| Build | — | `pnpm typecheck` and `pnpm build` both pass. |
