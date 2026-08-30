# What Chrome 151 actually does with WebMCP

Satisfies check **C5.10**. Every row was produced by executing the feature, not by
reading the specification. `unsupported` and `partial` are results, not omissions.

- **Chrome:** 151.0.7922.174, launched with `--enable-features=WebMCPTesting`
- **Date:** 2026-08-30
- **Probes:** `src/domain/tools/platform.ts`, reachable in-product as the `get_platform`
  tool and re-verified independently by `scripts/checks/c5-probe.js`
- **Re-run:** two consecutive `get_platform` calls returned identical statuses
  (`c4c5-audit.json`, `probesAgree: true`)

| Feature | Verdict | What was observed | Reproduce |
|---|---|---|---|
| `exposedTo` | **partial** | Accepted without error, but a tool scoped to `https://example.invalid` is still listed by `getTools()` on this origin. The parameter is taken and not honoured. | `c5-probe.js` → `exposedTo.foreignLeaked: true` |
| `getTools({fromOrigins})` | **partial** | Unscoped, this origin, and a foreign origin all returned the same count. Accepted, not honoured. | `c5-probe.js` → `all: 2, here: 2, foreign: 2` |
| `toolchange` | **supported** | `document.modelContext` is an `EventTarget`; registering dispatched `toolchange` within 200ms. | `c5-probe.js` → `fired: true` |
| Declarative `<form toolname>` | **supported** | A hidden form carrying `toolname` appeared in `getTools()` with no imperative call, and disappeared when the form was removed. | `c5-probe.js` → `declarative.present: true` |
| Withdrawing a tool (`AbortSignal`) | **supported** | Aborting the signal passed to `registerTool` removed the tool and freed its name; re-registering then carried a new description. | `c5-abort.js` → `abortUnregisters: true` |
| Annotations beyond the two hints | **partial** | Sent four, `getTools()` returned two: `readOnlyHint`, `untrustedContentHint`. `destructiveHint` and `idempotentHint` were dropped without error. | `c5-probe.js` → `annotations.keys` |

## Two corrections this file exists to record

**The lifecycle row was wrong twice, in opposite directions.** It first reported
`supported` from a hard-coded literal that executed nothing. That was corrected to
`unsupported` on the evidence that re-registering a name throws `InvalidStateError:
Duplicate tool name` and no `unregisterTool` exists. Also wrong: `c5-abort.js` showed
that aborting the registration signal withdraws the tool *and frees the name*, so a
tool can revise its own description by being withdrawn and re-registered. Both errors
came from reporting a conclusion the probe had not run. The probe now executes the
whole sequence — register, attempt a duplicate, abort, confirm withdrawal, re-register
with new text — and reports what each step did.

**Probes used to strand tools.** Because there is no `unregisterTool`, a probe run left
five tools registered for the lifetime of the page, so the surface an agent saw grew
every time anyone opened the console. Every probe now registers through a scope that
holds an `AbortController` and aborts it in a `finally`. Measured before and after a
full run: 18 tools, 18 tools.

## Things worth knowing that are not features

- **`inputSchema` comes back as a JSON string**, not an object, when read from
  `getTools()`. Anything parsing the surface has to `JSON.parse` it.
- **`executeTool` takes the tool object and a JSON *string***, not an object.
- **`execute` receives exactly one argument.** There is no second `{ signal }`
  parameter; assuming one throws on every call.
- **A thrown error is flattened** to a generic `UnknownError` and the message is
  discarded. A *returned* envelope survives verbatim, which is why no handler here
  throws.
- **An aborted call cannot cancel a write.** Chrome rejects the `executeTool` promise
  with `AbortError` at the browser layer and never passes the signal to the handler, so
  a mutation that has already run stays applied. It is never left half-applied, and the
  caller should read the scratchpad rather than assume the write did not land.
- **Registration is not atomic**, and a rejected registration is not proof the tool is
  absent. Registration state is therefore always confirmed by read-back.
- **No ceiling was found.** 1000 tools registered with flat latency; see `ceiling.md`.
