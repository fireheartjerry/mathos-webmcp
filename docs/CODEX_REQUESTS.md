# Codex requests

## Final lockup wiring

In the existing Claude-owned `MathburstWorkspace.tsx` final lockup, render the
product line as `Mathburst`, render the exact single tagline
`One mathematical world. Every agent can enter.`, and change the badge to
`48 / 48 tools · N calls`, where `N` is the live `summarizeLedger(...).totalCalls`.
The finished composition and staggered back-out motion are already defined on
`.cinematic-lockup.is-final` in Codex-owned `minimal.css`; keep the existing
`one-world` trigger and hold behavior.
