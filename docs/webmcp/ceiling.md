# The WebMCP tool ceiling in Chrome 151

Satisfies checks **C1.1** (ceiling probed) and **C1.5** (binding constraint named).

- **Chrome:** 151.0.7922.174, `--enable-features=WebMCPTesting`
- **Date:** 2026-08-30
- **Probe:** `scripts/checks/c1-ceiling.js`, run via `scripts/webmcp-eval.mjs`
- **Method:** register single-purpose tools in batches of 50, re-reading `getTools()`
  after each batch, stopping on the first of: `registerTool` rejects, `getTools()`
  returns fewer than were registered, or 1000 is reached.

## Result: no ceiling was reached

| Registered | `getTools()` returned | Expected | Batch ms |
|---|---|---|---|
| 50 | 50 | 50 | 8 |
| … | … | … | 8–11 |
| 900 | 900 | 900 | 11 |
| 950 | 950 | 950 | 10 |
| 1000 | 1000 | 1000 | 11 |

`registerTool` never rejected. `getTools()` never truncated. Per-batch latency was
flat across the whole range — 8ms for the first fifty, 11ms for the thousandth fifty
— so there is no visible degradation curve and no evidence that 1000 is near a limit.
The run terminated because the probe's own `MAX` was reached, not because the browser
pushed back.

**Recorded value: `L ≥ 1000`, terminating condition = probe maximum, not platform
failure.**

## Which constraint binds

**`|A| = 18`** binds. `L ≥ 1000`, so `min(L, |A|) = min(≥1000, 18) = 18`, and the
surface must be exactly 18 tools. The enumeration is in `capabilities.md`: 9 write
capabilities, one per member of the reducer's action union (`types.ts:121-130`), and 9
reads that each perform a distinct computation.

This was the open question when the criteria were written: C1.6 requires
`|R| = min(L, |A|)`, and it mattered whether the browser or the product would bind
first. The browser does not bind at any scale this product could plausibly reach.
Every tool the surface lacks is therefore a capability we did not expose, and cannot
be attributed to a platform limit.

## Why the surface is not simply 1000 tools

C1.4 subtracts any pair of tools reducible to one tool plus one parameter. A thousand
registrations of the `set_line_1 … set_line_1000` shape collapse, under that check, to
a single tool — so registering to the platform maximum would raise the raw count while
lowering the score, which is the intended behaviour. The honest statement available
from this probe is that the ceiling is not ours to hit, and the surface should be as
large as the product's genuine capability set makes it.
