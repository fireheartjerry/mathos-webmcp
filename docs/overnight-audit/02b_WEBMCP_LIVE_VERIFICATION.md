# WebMCP Live Runtime Verification — Chrome 151.0.7922.174

**Method:** execution, not documentation. Every claim below was produced by running code in a real
Chrome 151 process on this machine on 2026-08-26 and reading the actual return values.

**Environment**

| Item | Value |
|---|---|
| Chrome binary | `C:\Program Files\Google\Chrome\Application\151.0.7922.174\chrome.exe` |
| CDP `Browser` string | `Chrome/151.0.7922.174` |
| V8 | `15.1.206.23` |
| Unpatched app under test | `http://localhost:4322/learn` (existing `pnpm preview` of `dist/`) |
| Patched app under test | `http://localhost:4399/learn` (a **copy** of `dist/` with one `sed` fix; project source untouched) |
| Driver | Node 26 script speaking raw CDP over `ws://127.0.0.1:9333` (`Runtime.evaluate`, `awaitPromise:true`, `returnByValue:true`) |

**Launch command that worked (first try):**

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9333 \
  --user-data-dir="C:\Users\fireh\AppData\Local\Temp\claude\webmcp-profile" \
  --enable-features=WebMCPTesting \
  --no-first-run --no-default-browser-check \
  http://localhost:4322/learn
```

`--enable-features=WebMCPTesting` is sufficient. No fallback feature names were needed.

---

## HEADLINE: our five tools are registered but **none of them can execute** in Chrome 151

The page renders its green "5 AGENT TOOLS LIVE" badge, `getTools()` returns all five, and every
single invocation fails with a blank `UnknownError`. Root cause, proven below: **Chrome 151 calls the
`execute` callback with exactly ONE argument.** There is no second `{ signal }` parameter. Our
handlers all begin with `context.signal?.aborted`, which throws
`TypeError: Cannot read properties of undefined (reading 'signal')` before any of our logic runs.

A judge on flagged Chrome today sees a working-looking website whose every agent tool is broken.
This is the single most important finding in this document.

---

## 1. Does `document.modelContext` exist? — CONFIRMED (with one correction)

```js
// t01.js
({ documentModelContext: typeof document.modelContext,
   navigatorModelContext: typeof navigator.modelContext,
   protoKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(document.modelContext)) })
```

Exact output:

```json
{
  "location": "http://localhost:4322/learn",
  "isSecureContext": true,
  "documentModelContext": "object",
  "navigatorModelContext": "object",
  "documentHasOwn": false,
  "inDocumentProto": true,
  "globalModelContextCtor": "function",
  "globalRegisteredToolCtor": "undefined",
  "ownKeys": [],
  "protoName": "ModelContext",
  "protoKeys": ["ontoolchange", "executeTool", "getTools", "registerTool", "constructor"],
  "protoChain": ["ModelContext", "EventTarget", "Object"],
  "registerToolLength": 1,
  "getToolsLength": 0,
  "executeToolLength": 2
}
```

- `document.modelContext` is an accessor on `Document.prototype`; the instance has **zero own keys**.
- Prototype surface is exactly four members: `registerTool`, `getTools`, `executeTool`, `ontoolchange`.
  No `provideContext`, no `unregisterTool`, no `registerTools`. **CONFIRMED** (audit §2.3).
- `ModelContext` is a global constructor; **`RegisteredTool` is NOT a global constructor**.
- `executeTool.length === 2` — the first two parameters are required.

**Correction to the audit — `navigator.modelContext` still exists in Chrome 151.**
It is the *same object*, and touching it emits a console warning:

```
navigator.modelContext === document.modelContext   →   true
[log.warning/javascript] navigator.modelContext is deprecated. Please use document.modelContext instead.
```

The audit marked "deprecated in Chromium 150, retained as an alias" as **UNVERIFIED against a Chrome
primary source**. It is now **CONFIRMED** against the binary itself. Still: use `document.modelContext`.

### 1b. Without the flag — CONFIRMED

A third Chrome 151 instance launched with **no** `--enable-features`:

```json
{ "ua": "Chrome/151.0.0.0", "documentModelContext": "undefined",
  "navigatorModelContext": "undefined", "ModelContextCtor": "undefined",
  "indicatorLine": ["USE CHROME 149+ OR THE CHATGPT BROWSER FOR AGENT TOOLS"] }
```

Chrome 151 does **not** expose WebMCP by default. The flag (or an origin-trial token) is mandatory.
Note our own fallback banner is misleading here: this *is* Chrome 151 and the banner tells the judge
to "use Chrome 149+". See Required change **P1-5**.

### 1c. The flags themselves — CONFIRMED, plus a new one

`strings chrome.dll | grep -i webmcp`:

```
enable-webmcp-testing
WebMCP for testing
Enables the WebMCP API and its associated testing interfaces.
WebMCPTesting
devtools-webmcp-support
DevToolsWebMCPSupport
WebMCP support in DevTools
Enables WebMCP support in DevTools.
WebMCP.invokeTool / WebMCP.toolInvoked / WebMCP.toolResponded / WebMCP.toolsAdded / WebMCP.toolsRemoved
blink::InspectorWebMCPAgent
blink::ModelContext::ExecuteDeclarativeTool(DeclarativeWebMCPTool*, ...)
ScheduleDeclarativeWebMCPToolRegistration
WebMCPDeclarativeFileInput / WebMCPFormAssociatedCustomElements
```

Driving `chrome://flags/#enable-webmcp-testing` and walking the shadow DOM returned both entries:

```
#enable-webmcp-testing_name   :: "WebMCP for testing"
#devtools-webmcp-support_name :: "WebMCP support in DevTools"
```

**`chrome://flags/#enable-webmcp-testing` — CONFIRMED verbatim.**

---

## 2. Are all 5 tools registered? — CONFIRMED (registration only; execution is broken)

Page's own indicator, read from `document.body.innerText`:

```
LEARNING STUDIO / SESSION 001
5 AGENT TOOLS LIVE
```

Independent verification via `getTools()`:

```json
{ "count": 5,
  "names": ["check_current_attempt","get_learning_receipt","get_learning_workspace",
            "show_targeted_lesson","start_transfer_problem"] }
```

**Note:** `getTools()` returns tools **sorted alphabetically**, not in registration order. Do not
rely on index position.

---

## 3. What the tool-listing API actually returns — REFUTES the audit's implied shape

`getTools()` resolves to a **plain `Array` of plain `Object`s** (`constructor.name === "Object"`,
prototype is `Object.prototype`). They are *not* instances of a `RegisteredTool` class, yet
`executeTool` type-checks them as `RegisteredTool` (see §4). Own keys, in this order:

```
["description", "inputSchema", "name", "annotations", "origin", "title", "window"]
```

Full verbatim dump of one tool:

```json
{
  "name": "check_current_attempt",
  "title": "",
  "description": "Check one answer and move the visible learning session to its honest result.",
  "origin": "http://localhost:4322",
  "annotationsOwnKeys": ["readOnlyHint", "untrustedContentHint"],
  "annotations": { "readOnlyHint": false, "untrustedContentHint": true },
  "inputSchemaType": "string",
  "inputSchema": "{\"type\":\"object\",\"properties\":{\"attempt\":{\"type\":\"string\",\"minLength\":1,\"maxLength\":256},\"expectedRevision\":{\"type\":\"integer\",\"minimum\":0,\"maximum\":1000000000},\"requestId\":{\"type\":\"string\",\"minLength\":8,\"maxLength\":64,\"pattern\":\"^[A-Za-z0-9_-]+$\"}},\"required\":[\"attempt\",\"expectedRevision\",\"requestId\"],\"additionalProperties\":false}",
  "windowIsSelf": true
}
```

Findings, each new relative to the documentation audit:

| Observation | Verdict |
|---|---|
| `inputSchema` is surfaced as a **JSON string**, not an object | CONFIRMED (audit §2.4) |
| `origin` field exists and equals the registering origin | **NEW — undocumented in the audit** |
| `window` field is a live `Window` reference (`t.window === window`) | **NEW.** Makes `JSON.stringify(tool)` throw `Converting circular structure to JSON`. Any tooling that naively serializes `getTools()` output crashes. |
| `title` is `""` for all five of our tools because we never set it | CONFIRMED — audit recommendation #8 is real and unaddressed |
| `title` **does** surface when set (`title: 'Human Readable Title'` → `"Human Readable Title"`) | CONFIRMED |
| Extra annotation keys are silently dropped | CONFIRMED — registering `{readOnlyHint:true, destructiveHint:true, idempotentHint:true, openWorldHint:false}` surfaced only `{readOnlyHint:true, untrustedContentHint:false}` |
| Omitting `inputSchema` entirely is **accepted**, and surfaces as `undefined` (not `{}`) | **NEW** |

---

## 4. `executeTool` signature — RESOLVED. The **JSON-string** form is the only one that works.

All six candidate call shapes, run against a live registered tool:

| Call | Result |
|---|---|
| `mc.executeTool(tool, {})` | FAIL — `UnknownError: Failed to parse input arguments` |
| **`mc.executeTool(tool, '{}')`** | **PASS — the only form that reaches the handler** |
| `mc.executeTool(tool)` | FAIL — `TypeError: … 2 arguments required, but only 1 present.` |
| `mc.executeTool('get_learning_workspace', {})` | FAIL — `TypeError: … The provided value is not of type 'RegisteredTool'.` |
| `mc.executeTool('get_learning_workspace', '{}')` | FAIL — same `TypeError` |
| `mc.executeTool({name:'…'}, {})` | FAIL — `TypeError: … Failed to read the 'description' property from 'RegisteredToolDeprecated': Required member is undefined.` |

**Verdict on the audit's open divergence (§2.9 / §2.10 row 2): the Chrome docs are right and the
spec IDL is ahead of the shipped binary.** Chrome 151 implements
`executeTool(RegisteredTool tool, DOMString inputJson, optional options)`. Passing an object gets
`String()`-coerced to `"[object Object]"` and then fails `JSON.parse`.

The internal dictionary name `RegisteredToolDeprecated` is visible in the error message — Chrome
accepts a *duck-typed* object with the required members (`name`, `description`, …) as well as the
real object from `getTools()`. Passing the object straight from `getTools()` is the safe path.

**Return value:** always a **`string`** (`typeof === "string"`, `constructor.name === "String"`).
Never an object, never an MCP `{content:[…]}` envelope.

**Recommended snippet for our README (correct for Chrome 151, forward-tolerant):**

```js
const mc = document.modelContext;
const tools = await mc.getTools();
const t = tools.find(x => x.name === 'get_learning_workspace');
const out = await mc.executeTool(t, '{}').catch(() => mc.executeTool(t, {}));
console.log(JSON.parse(out));
```

The audit told us to try the object form first and fall back to the string. **Invert it** — string
first, object as the forward-compat fallback.

---

## 5. The handler signature — **REFUTED. There is no second argument.**

The audit's §2.5 states `execute` receives `(inputObject, { signal })` and that `signal` is
"required and always present". This is false in Chrome 151.

Probe tool whose handler introspects its own invocation:

```js
execute: async function () {
  return {
    argumentsLength: arguments.length,
    thisIsGlobal: this === globalThis,
    crashSim: (() => { try { const context = arguments[1]; context.signal?.aborted; return 'no-crash'; }
                       catch (e) { return 'CRASH: ' + e.name + ': ' + e.message; } })(),
  };
}
```

Exact output:

```json
{"argumentsLength":1,
 "argsDump":[{"t":"object","ctor":"Object","keys":["z"]}],
 "thisIsUndefined":false,"thisIsGlobal":true,"thisCtor":"Window",
 "crashSim":"CRASH: TypeError: Cannot read properties of undefined (reading 'signal')"}
```

- **`arguments.length === 1`.** Only the parsed input object is passed.
- `this` inside a non-arrow handler is the global `Window`.
- Even the **3-argument** caller form does not change this:
  `mc.executeTool(tp, '{}', { signal: callerAC.signal })` → handler still reports
  `{"argc":1,"second":"undefined"}`.
- Aborting the caller's signal mid-flight rejects `executeTool` with
  `AbortError: signal is aborted without reason`, **but the handler keeps running to completion and
  never learns it was cancelled** (`slowArgs: {argc: 1, hasSecond: false}`).

**Consequence: every `AbortSignal` check in `src/lib/webmcp.ts` is both dead code and the crash
site.** Direct proof against our real tool, with console capture:

```
executeTool(get_learning_workspace, '{}')
  → THREW  UnknownError: Tool was executed but the invocation failed. For example, the script function threw an error
[console] Uncaught TypeError: Cannot read properties of undefined (reading 'signal')
```

---

## 6. End-to-end sequence — PASSES once the one-line fix is applied

To run this without touching project source, `dist/` was copied to a scratch directory and the
compiled chunk patched with a single `sed`, then served on port 4399:

```
sed -i 's/\.signal?\.aborted/?.signal?.aborted/g' dist-patched/_astro/LearningStudio.NHaLmuQL.js
   →  6 occurrences replaced (5 tool handlers + mutationExecutor)
```

Every call below used `mc.executeTool(tool, JSON.stringify(args))`. Responses verbatim.

**1. `get_learning_workspace {}`** — `revision: 0`

```json
{"ok":true,"revision":0,"activityId":null,"data":{"session_id":"mathos_d742983e310746faa1bebcb99b672af6","stage":"initial","revision":0,"problem":{"id":"initial-shared-path-v1","prompt":"Find dy/dx at x = 2.","display":["a = x²","b = 3x","y = a · b + a"]},"hasAttempt":false,"validNextActions":["check_current_attempt"],"activeConcept":"Add the derivative contribution from every path through a shared value.","visibleIds":{"diagnosisId":null,"lessonId":null}}}
```

**2. `check_current_attempt {attempt:'36', expectedRevision:0, requestId:'judge-test-001'}`**

```json
{"ok":true,"revision":1,"activityId":"activity-1","data":{"outcome":"diagnosed","stage":"diagnosis","diagnosisId":"shared-path-omission-v1"}}
```

**3. `get_learning_workspace {}`** — stage advanced to `diagnosis`, `validNextActions: ["show_targeted_lesson"]`, `visibleIds.diagnosisId: "shared-path-omission-v1"`.

**4. `show_targeted_lesson {diagnosisId:'shared-path-omission-v1', expectedRevision:1, requestId:'judge-test-002'}`**

```json
{"ok":true,"revision":2,"activityId":"activity-2","data":{"stage":"lesson","lessonId":"shared-path-two-routes-v1"}}
```

**5. `start_transfer_problem {lessonId:'shared-path-two-routes-v1', expectedRevision:2, requestId:'judge-test-003'}`**

```json
{"ok":true,"revision":3,"activityId":"activity-3","data":{"stage":"transfer","problemId":"transfer-shared-path-v1"}}
```

`get_learning_workspace` now returns the **fresh** problem:
`{"id":"transfer-shared-path-v1","prompt":"Find ds/dx at x = 1.","display":["q = 2x","k = x²","s = q · k + q"]}`

**6. `get_learning_receipt {}` called EARLY (stage = transfer)**

```json
{"ok":false,"revision":3,"error":{"code":"invalid_phase","message":"The learning receipt is not ready.","recovery":"Pass the transfer problem first."}}
```

**7. `check_current_attempt {attempt:'8', expectedRevision:3, requestId:'judge-test-004'}`**

```json
{"ok":true,"revision":4,"activityId":"activity-4","data":{"outcome":"passed","stage":"receipt"}}
```

**8. `get_learning_receipt {}`**

```json
{"ok":true,"revision":4,"activityId":null,"data":{"claims":["You found both paths through a shared value.","You solved a fresh problem after the lesson during this session.","This receipt does not prove permanent mastery."]}}
```

### The page visibly changes — CONFIRMED by screenshot

`Page.captureScreenshot` before and after the agent-driven sequence:

- **Before** (`shots/01-before.png`): header "5 AGENT TOOLS LIVE"; problem card *"Find dy/dx at x = 2."*
  with `a = x²`, `b = 3x`, `y = a·b + a`; empty answer input; pathway stage 01 active (orange).
- **After** (`shots/03-after-receipt.png`): entire panel replaced by the **MATHOS EVIDENCE RECEIPT**
  card — "TRANSFER PASSED", "Evidence, not a trophy.", the three claims rendered as 01/02/03,
  "OBSERVED SEQUENCE  36 → lesson → 8", and pathway stage 01 flipped to a green check with the
  sidebar now reading "STAGE 01 PROVEN — The next nine are within reach."

Screenshots saved at
`C:\Users\fireh\AppData\Local\Temp\claude\C--Jerry-Important-Coding-Mathos\c2215034-5fbc-4409-bcfd-affbefcf9e1c\scratchpad\shots\`.

Every mutation went through the React state machine and repainted. The shared-workspace claim holds
in reality, not just on paper.

---

## 7. Error behaviour — **our structured envelope SURVIVES intact. CONFIRMED.**

This was the biggest open risk and it resolves in our favour. Chrome does **not** flatten a
*returned* error object; it JSON-serializes it verbatim and hands the caller the string.

| Case | Argument sent | Exact value the caller received |
|---|---|---|
| Stale `expectedRevision` (0 vs current 4) | `{"attempt":"12","expectedRevision":0,"requestId":"stale-test-001"}` | `{"ok":false,"revision":4,"error":{"code":"stale_revision","message":"The learning workspace changed.","recovery":"Read the workspace again and use its current revision."}}` |
| Duplicate `requestId` (`judge-test-004`) with **different** args | `{"attempt":"999","expectedRevision":4,"requestId":"judge-test-004"}` | `{"ok":true,"revision":4,"activityId":"activity-4","data":{"outcome":"passed","stage":"receipt"}}` — the cached original. Idempotency **works**; the new `attempt` is silently ignored (by design). |
| Wrong phase (lesson at `receipt`) | `{"diagnosisId":"shared-path-omission-v1","expectedRevision":4,"requestId":"phase-test-001"}` | `{"ok":false,"revision":4,"error":{"code":"invalid_phase","message":"The shared-path diagnosis is not visible.","recovery":"Check the current attempt before opening this lesson."}}` |
| `attempt` is a number | `{"attempt":36,…}` | `{"ok":false,…,"code":"invalid_input","message":"The attempt must be 1 to 256 characters.","recovery":"Send a short answer as the attempt."}` |
| Missing `requestId` | `{"attempt":"36","expectedRevision":4}` | `{"ok":false,…,"code":"invalid_input","message":"The tool input is not valid.","recovery":"Use the published input schema and try again."}` |
| Extra unknown key `hacked:true` | `{…,"hacked":true}` | same `invalid_input` envelope — `additionalProperties:false` is enforced **by our code**, not the browser |
| `requestId` too short (`"short"`) | — | same `invalid_input` envelope |
| `expectedRevision` as a string `"4"` | — | same `invalid_input` envelope |
| Read-only tool with args | `{"foo":"bar"}` | `{"ok":false,…,"message":"This tool takes an empty object.","recovery":"Call the tool with {}."}` |
| JSON **array** as args | `[1,2,3]` | Chrome parses it and passes it through; our `isRecord()` rejects → `invalid_input` envelope. Good. |
| JSON **scalar** as args | `"hello"` | FAIL at browser level — `UnknownError: Failed to parse input arguments` — never reaches us |
| Empty string as args | `''` | FAIL — `UnknownError: Failed to parse input arguments` |
| Malformed JSON | `{oops}` | FAIL — `UnknownError: Failed to parse input arguments` |

**Verdict: CONFIRMED that returned error envelopes survive verbatim.** The audit's fear that the
browser flattens our message applies **only to thrown errors** (§8), not returned values. Our
`recovery` strings do reach the agent.

Chrome's own parse failures (`Failed to parse input arguments`) are the one class we cannot
intercept — an agent that sends malformed JSON gets a generic message. Nothing we can do about it.

---

## 8. Throw vs. return — **the audit's claim is CONFIRMED, with the exact wording**

Three probe tools, one throwing an `Error`, one throwing a `DOMException`, one returning a rejected
promise:

| Handler does | What `executeTool` gives the caller |
|---|---|
| `throw new Error('MY_CUSTOM_ERROR_MESSAGE_12345')` | `DOMException` · name `UnknownError` · message **`"Tool was executed but the invocation failed. For example, the script function threw an error"`** |
| `throw new DOMException('MY_DOM_MESSAGE_67890','DataError')` | identical generic `UnknownError` — the `DataError` name is discarded too |
| `return Promise.reject(new Error('MY_REJECT_MESSAGE_ABCDE'))` | identical generic `UnknownError` |

All three original messages appear **only** in the page's own console
(`Uncaught Error: MY_CUSTOM_ERROR_MESSAGE_12345`), never in the caller's error. `e.code === 0`,
`e instanceof DOMException === true`.

**CONFIRMED: never throw for an expected condition.** Every message is destroyed.

### Return-value serialization — one row of the audit is **REFUTED**

| Handler returns | Caller receives (string) | Audit said | Verdict |
|---|---|---|---|
| `'plain string result'` | `"plain string result"` | OK | CONFIRMED |
| `{ok:true,n:1,nested:{x:[1,2]}}` | `{"ok":true,"n":1,"nested":{"x":[1,2]}}` | OK | CONFIRMED |
| `{content:[{type:'text',text:'mcp style'}]}` | `{"content":[{"type":"text","text":"mcp style"}]}` | works, not privileged | CONFIRMED |
| **`return;` (undefined)** | **the 9-character string `"undefined"` — the call SUCCEEDS** | "the serializer throws → the call is completed as a **failure**" | **REFUTED** |
| `null` | `"null"` | — | new |
| **synchronous, non-Promise return** | works — `"sync return value"` | — | new; `execute` need not be `async` |
| `'X'.repeat(5000)` | 5000 chars, intact | 1.5K "limit" | **advisory only** |
| `'Y'.repeat(200000)` | 200000 chars, intact | — | **no enforced output cap** |

Returning `undefined` is still a bad idea (the agent gets the literal word "undefined"), but it does
not fail the call. Our `workspaceData()` payload measures **460 characters** — the audit's worry that
it is "close to the edge" of 1.5K is **REFUTED**; we have 3x headroom.

---

## 9. bfcache — **the audit's suspicion is CONFIRMED, and it is worse than described**

Sequence driven over CDP: load `/learn` → set `window.__marker` → navigate to `/` → `history.back()`.

```
# 1. fresh /learn
tools before: {"count":5,"names":["check_current_attempt","get_learning_receipt","get_learning_workspace","show_targeted_lesson","start_transfer_problem"]}
# 2. navigate away to /
tools on new doc: {"count":0,"names":[]}
# 3. history back
url now: http://localhost:4322/learn
marker: ORIGINAL_DOCUMENT          <- same document, restored from bfcache
tools after Back: {"count":0,"names":[]}
```

**Zero tools after a back-navigation.** And the header still reads:

```
"headerLine": ["5 AGENT TOOLS LIVE"]
```

**The badge lies.** A judge who navigates away and comes back sees a confident green "5 AGENT TOOLS
LIVE" over an empty tool list.

### Is this Chrome, or is it us? — It is entirely us.

Control experiment: register `control_survivor` with **no** `pagehide` teardown, then repeat the
navigate-away/back cycle.

```
lifecycle events:   ["pagehide persisted=true","pageshow persisted=true"]
same document?      YES (bfcache restore)
controller aborted? false
getTools:           ["control_survivor"]
```

**Chrome preserves WebMCP registrations across bfcache perfectly.** `control_survivor` came back
alive; our five did not, because `ensureRegistration()` attaches
`window.addEventListener('pagehide', onPageHide, { once: true })` and `onPageHide` calls
`controller.abort()`. `pagehide` fires with `persisted === true`, we tear everything down, React
never remounts, and `ensureRegistration()` is never called again.

**Fix: delete the `pagehide` teardown.** Document teardown already destroys the model context.

---

## 10. DevTools support in Chrome 151 — **partially REFUTED / partially NEW**

The audit said the "Inspect and debug registered tools in Chrome DevTools" claim was **UNVERIFIED**
and that no DevTools panel appeared to exist. Both halves turn out to be half-true.

### 10a. There IS a working CDP `WebMCP` domain — **NEW, undocumented in the audit**

It is *not* listed by `Schema.getDomains()` (that list is stale in Chrome), but every command works:

```
WebMCP.enable                       → {}
WebMCP.invokeTool {frameId, toolName, input:<object>}  → {"invocationId":"51501ABADA5C2357CC3BBBB69F372ED7"}
WebMCP.invokeTool {… toolName:'no_such_tool'}          → {"code":-32602,"message":"Tool not found"}
```

On `enable`, Chrome emits `WebMCP.toolsAdded` with the full inventory — and here `inputSchema`
arrives as a **parsed object**, annotations are renamed, and a registration `stackTrace` is included:

```json
{"name":"check_current_attempt",
 "description":"Check one answer and move the visible learning session to its honest result.",
 "inputSchema":{"type":"object","properties":{"...":"..."},"additionalProperties":false},
 "annotations":{"readOnly":false,"untrustedContent":true},
 "frameId":"6C79004EBB449FBFFE051AE87EEE4BC9",
 "stackTrace":{"callFrames":[{"scriptId":"7","url":"http://localhost:4399/_astro/LearningStudio.NHaLmuQL.js","lineNumber":1,"columnNumber":6903}]}}
```

Invocation events, verbatim:

```json
WebMCP.toolInvoked   {"toolName":"check_current_attempt","frameId":"…","invocationId":"3FB5B86D…","input":"{\"attempt\":\"99\",\"expectedRevision\":4,\"requestId\":\"cdp-test-0001\"}"}
WebMCP.toolResponded {"invocationId":"3FB5B86D…","status":"Completed","output":{"ok":false,"revision":4,"error":{"code":"invalid_phase","message":"There is no answer to check at this stage.","recovery":"Read the workspace and use one of its valid next actions."}}}
```

Note the **inconsistency**: the CDP `invokeTool` `input` parameter must be an **object** (a string
fails with `CBOR: map start expected`), while the JS `executeTool` requires a **string**. Also
`toolResponded.output` came back as a raw string for one call and a parsed object for another.

Parameter naming is exact and unforgiving: `{frameId, toolName, input}`. `name` is rejected with
`Failed to deserialize params.toolName`.

### 10b. There is NO DevTools *panel* in Chrome 151 — REFUTES the Devpost resources page

Launched a second instance with `--enable-features=WebMCPTesting,DevToolsWebMCPSupport
--auto-open-devtools-for-tabs`, attached to the DevTools frontend target, and enumerated it:

```
DevTools tab titles: ["Elements","Console","Sources","Network","Styles","Computed","Layout",
                      "Event Listeners","DOM Breakpoints","Properties"]
Any "WebMCP"/"Model Context" text anywhere in the DevTools UI: []
Registered ViewManager ids: [... 62 ids, none matching /mcp|model.?context/ ...]
DevTools experiments: ["instrumentation-breakpoints","protocol-monitor","durable-messages","jpeg-xl","plus-button"]
```

The flag *is* plumbed through — `Root.Runtime.hostConfig.devToolsWebMCPSupport === {enabled: true}` —
but the bundled DevTools frontend in 151.0.7922.174 registers no WebMCP view. **The backend agent
shipped ahead of the frontend.** Do not build the demo around a DevTools panel.

### 10c. The Model Context Tool Inspector extension — CONFIRMED, live

```
GET https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd
HTTP 200
<title>WebMCP - Model Context Tool Inspector - Chrome Web Store</title>
og:description "Inspect, monitor, and execute WebMCP tools manually or with Gemini"
og:url         .../detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd
```

Extension ID `gbpdfapgefenggkahomfgkhfehlcenpd` is correct. The canonical slug has changed to
`webmcp-model-context-tool` — **use the ID-based URL in the README**, not the old slug.

---

## 11. Latency — negligible

30 sequential `executeTool(get_learning_workspace, '{}')` calls on the patched build:

```json
{"n":30,"min":0.1,"p50":0.2,"p95":0.4,"max":0.6,"mean":0.19}     // milliseconds
{"getTools_ms":{"p50":0.1,"max":0.2}}
```

**Median 0.2 ms.** Mutating calls that go through React commit + `afterCommit`: 11.6–29.8 ms.
WebMCP dispatch adds no measurable overhead; all latency is our own render path.

---

## 12. Registration semantics — mostly CONFIRMED, one important nuance

| Test | Exact result | Verdict |
|---|---|---|
| Re-register an existing name | `InvalidStateError: Duplicate tool name` | CONFIRMED |
| `registerTool()` resolve value | `undefined` | CONFIRMED |
| Empty name | `InvalidStateError: Invalid tool name` | CONFIRMED |
| Name with a space | `InvalidStateError: Invalid tool name` | CONFIRMED |
| 129-char name | `InvalidStateError: Invalid tool name` | CONFIRMED (128 is the cap) |
| `ok.name-1_2` | ACCEPTED | CONFIRMED (`.` `-` `_` legal) |
| Empty description | `InvalidStateError: Description is required` | CONFIRMED |
| Omitted `inputSchema` | ACCEPTED, surfaced as `undefined` | NEW |
| `controller.abort()` unregisters | yes — aborted tools vanish from `getTools()` | CONFIRMED |
| `toolchange` event | fires on **both** register and unregister; plain `Event`, `bubbles:false`, only key `isTrusted`; `ontoolchange` present | CONFIRMED |
| `registerTool(tool, {signal, exposedTo:['https://example.com']})` | ACCEPTED | CONFIRMED |
| `getTools({fromOrigins:['https://example.com']})` | ACCEPTED | CONFIRMED |
| `document.featurePolicy.features()` | includes `"tools"`; `allowedFeatures()` includes `"tools"` | CONFIRMED |
| `window.originAgentCluster` | `true` | CONFIRMED (origin-isolated) |

### The `Promise.all` hazard is REAL — and worse than the audit guessed

```js
await Promise.all([mk('batch_a'), mk('get_learning_workspace'), mk('batch_c')]
        .map(x => mc.registerTool(x, {signal: ac2.signal})));
→ REJECTED: InvalidStateError: Duplicate tool name

getTools() afterwards:
["batch_a","batch_c","check_current_attempt","get_learning_receipt",
 "get_learning_workspace","show_targeted_lesson","start_transfer_problem"]
```

**`batch_a` and `batch_c` registered anyway.** Registration is not atomic. Our current
`.catch(() => controller.abort())` therefore tears down every successfully-registered tool the moment
one name collides — turning a partial failure into a total one.

### Declarative form API works in Chrome 151 — NEW

```js
const f = document.createElement('form');
f.setAttribute('toolname', 'declarative_signup');
f.setAttribute('tooldescription', 'Sign the learner up declaratively');
f.innerHTML = '<input name="email" type="email" tooldescription="learner email">…';
document.body.appendChild(f);
```

Auto-registered within ~400 ms:

```json
{"name":"declarative_signup","title":"","description":"Sign the learner up declaratively",
 "origin":"http://localhost:4399",
 "inputSchema":"{\"type\":\"object\",\"properties\":{\"email\":{\"type\":\"string\"}},\"required\":[]}",
 "annotationsType":"undefined"}
```

Schema is derived from the form controls. Note declarative tools carry **no `annotations` key at
all** — an inconsistency worth a sentence in the write-up if we use them.

---

## Corrections to `02_WEBMCP_AND_RUBRIC_AUDIT.md`

1. **§2.5 is wrong.** `execute` does **not** receive `(inputObject, {signal})` in Chrome 151. It
   receives **one argument only**. The `signal` is never delivered to the handler, even when the
   caller passes `{signal}` as `executeTool`'s third argument. This is the direct cause of our app
   being non-functional. *(This makes §3.1 item 4's "Every `execute` returns a value; none ever
   throws" false in practice — all five throw on line 1.)*
2. **§2.9 / §2.10 row 2 — resolved in favour of the Chrome docs.** `executeTool`'s second argument
   must be a **JSON string**. The object form fails with `UnknownError: Failed to parse input
   arguments`. Our defensive snippet must try **string first**, object second.
3. **§2.6 row 4 is wrong.** Returning `undefined` does **not** fail the call. Chrome returns the
   literal string `"undefined"` and reports success. (Still avoid it.)
4. **§2.2 — `navigator.modelContext` still exists in Chrome 151**, is the *same object* as
   `document.modelContext`, and logs a deprecation warning. Now CONFIRMED against the binary rather
   than UNVERIFIED.
5. **§1.8 / §2.9 — a DevTools story exists, but not the one advertised.** Chrome 151 ships a working
   CDP `WebMCP` domain (`enable`, `invokeTool`, `toolsAdded`, `toolsRemoved`, `toolInvoked`,
   `toolResponded`) plus a `chrome://flags/#devtools-webmcp-support` flag that reaches
   `hostConfig.devToolsWebMCPSupport`. But the **DevTools frontend has no WebMCP panel**. The
   audit's "do not build the demo around a DevTools panel" stands.
6. **§2.4 / §3.1 item 9 — the 1.5K output budget is not enforced.** 200,000 characters round-tripped
   intact. Our `workspaceData()` payload is **460 characters**, not "close to the edge".
7. **§3.1 item 11 — the local `declare global` is wrong in two ways**, not one: `executeTool` takes a
   `RegisteredTool` object *and* a **string** input, plus an optional third options argument.
8. **New, undocumented:** `RegisteredTool` objects carry `origin` and a live `window` reference.
   `JSON.stringify(await getTools())` **throws** on the circular `window` reference.
9. **New:** `getTools()` returns tools **alphabetically sorted**, not in registration order.
10. **New:** registration is **not atomic** — a rejected `Promise.all` still leaves the
    successfully-registered tools installed.
11. **New:** omitting `inputSchema` is accepted and surfaces as `undefined`.
12. **New:** the declarative `<form toolname tooldescription>` API is live in Chrome 151.
13. **Confirmed and important in our favour:** a **returned** error envelope survives verbatim.
    Only **thrown** errors are flattened to the generic
    `"Tool was executed but the invocation failed. For example, the script function threw an error"`.

---

## Required code changes

### P0-1 — `execute` receives ONE argument. This is why nothing works. *(blocks everything)*

`src/lib/webmcp.ts` — six sites: lines 161, 195, 216, 239, 262, 276, plus the type on line 68.

```diff
-type ToolExecutionContext = { signal?: AbortSignal }
+// Chrome 151 invokes execute(input) with exactly one argument. The spec's
+// second `{signal}` parameter is not implemented yet, so it must be optional.
+type ToolExecutionContext = { signal?: AbortSignal }
@@ type WebMcpTool
-  execute: (input: unknown, context: ToolExecutionContext) => Promise<ToolEnvelope>
+  execute: (input: unknown, context?: ToolExecutionContext) => Promise<ToolEnvelope>
```

Then, at every one of the six call sites, change

```diff
-  if (context.signal?.aborted) return failure(state, 'aborted', …)
+  if (context?.signal?.aborted) return failure(state, 'aborted', …)
```

and update `mutationExecutor`'s parameter to `context?: ToolExecutionContext`.

Mechanically equivalent to the verified `sed`:

```
sed -i 's/context\.signal?\.aborted/context?.signal?.aborted/g' src/lib/webmcp.ts
```

Verified: with this single change applied to the compiled bundle, all 5 tools execute correctly and
the full end-to-end sequence in §6 passes.

**Note:** the `aborted` branch is currently unreachable in Chrome 151 (the signal never arrives).
Keep it for forward compatibility, but do not describe it as a live feature in the submission — a
Chrome judge can check.

### P0-2 — remove the `pagehide` teardown (bfcache)

Lines 319–331. Proven above: Chrome preserves registrations across bfcache; our own handler destroys
them, and the badge then lies.

```diff
   registration = current
-  const onPageHide = () => {
-    controller.abort()
-    delegates = undefined
-    lastState = undefined
-    pageRequestCache.clear()
-    if (registration === current) registration = undefined
-  }
-  window.addEventListener('pagehide', onPageHide, { once: true })
   current.promise.catch(() => {
-    controller.abort()
-    window.removeEventListener('pagehide', onPageHide)
     if (registration === current) registration = undefined
   })
   return current.promise
```

Document teardown already destroys the model context. If a teardown is wanted for tidiness, gate it
on a real discard and re-register on restore:

```ts
window.addEventListener('pageshow', (event) => {
  if ((event as PageTransitionEvent).persisted) void ensureRegistration()
})
```

### P0-3 — `Promise.all` → `Promise.allSettled`, and never abort the whole batch

Line 316 + 327. Registration is not atomic; one duplicate name currently unregisters all five.

```diff
   const current = {
     controller,
-    promise: Promise.all(tools.map((tool) => document.modelContext!.registerTool(tool, { signal: controller.signal }))).then(() => true),
+    promise: Promise.allSettled(
+      tools.map((tool) => document.modelContext!.registerTool(tool, { signal: controller.signal })),
+    ).then((results) => {
+      for (const [i, r] of results.entries()) {
+        if (r.status === 'rejected') console.warn(`[webmcp] ${tools[i].name} failed to register:`, r.reason)
+      }
+      return results.some((r) => r.status === 'fulfilled')
+    }),
   }
```

### P1-1 — `pageBridge.getState()` must not throw

Line 291. A throw here escapes `execute` and the agent receives the generic
`"Tool was executed but the invocation failed…"` with our message destroyed — verified in §8.

```diff
+const UNMOUNTED_STATE: StudioState = {
+  session_id: 'unmounted', stage: 'initial', revision: -1,
+  initial_attempted: false, transfer_attempted: false,
+  initial_message: '', transfer_message: '', used_lesson: false, activities: [],
+}
 const pageBridge: ToolBridge = {
   getState() {
     if (delegates) lastState = delegates.getState()
-    if (!lastState) throw new Error('The learning studio is not mounted.')
-    return lastState
+    return lastState ?? UNMOUNTED_STATE
   },
```

and short-circuit in each handler:

```ts
if (state.revision < 0) {
  return failure(state, 'invalid_phase',
    'The learning studio is still loading.',
    'Wait one second and call get_learning_workspace again.')
}
```

### P1-2 — fix the `declare global` block (lines 351–358)

The current declaration is wrong about both the tool argument and the input type. Verified signature:

```ts
type RegisteredTool = {
  name: string
  title: string
  description: string
  inputSchema?: string          // JSON *string*, or undefined if none was registered
  annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean }
  origin: string
  window: Window                // live reference — never JSON.stringify a RegisteredTool
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: WebMcpTool,
        options?: { signal?: AbortSignal; exposedTo?: string[] },
      ) => Promise<void>
      getTools: (options?: { fromOrigins?: string[] }) => Promise<RegisteredTool[]>
      /** Chrome 151: the second argument MUST be a JSON string, not an object. */
      executeTool: (
        tool: RegisteredTool,
        inputJson: string,
        options?: { signal?: AbortSignal },
      ) => Promise<string>
      ontoolchange: ((this: unknown, ev: Event) => unknown) | null
      addEventListener: (type: 'toolchange', listener: (ev: Event) => void) => void
    }
  }
}
```

### P1-3 — add `title` to all five tools

Verified: `title` surfaces exactly as registered; ours are all `""` today. ChatGPT's Site Tools panel
renders it, and that panel is a screenshot a judge sees before the product.

```ts
{ name: 'get_learning_workspace',  title: 'Read the learning workspace',  /* … */ }
{ name: 'check_current_attempt',   title: 'Check the current answer',     /* … */ }
{ name: 'show_targeted_lesson',    title: 'Open the targeted lesson',     /* … */ }
{ name: 'start_transfer_problem',  title: 'Start the transfer problem',   /* … */ }
{ name: 'get_learning_receipt',    title: 'Read the learning receipt',    /* … */ }
```

### P1-4 — add `description` to every `inputSchema` property

The browser does not validate `inputSchema`, but the agent reads it verbatim (it is passed through as
a JSON string). `expectedRevision` and `requestId` are non-obvious and will be hallucinated without
prose. Example:

```ts
expectedRevision: {
  type: 'integer', minimum: 0, maximum: 1_000_000_000,
  description: 'The revision from the most recent get_learning_workspace call. If it no longer matches, the call is refused as stale.',
},
requestId: {
  type: 'string', minLength: 8, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$',
  description: 'A fresh unique id you invent for this call. Reusing one replays the cached result instead of applying the action twice.',
},
attempt: {
  type: 'string', minLength: 1, maxLength: 256,
  description: 'The learner\u2019s answer to the visible problem, as short text — for example "36".',
},
```

### P1-5 — make the status banner honest

Two verified failures in the current banner:

1. After a bfcache restore it still reads **"5 AGENT TOOLS LIVE"** while `getTools()` returns `[]`.
2. On stock Chrome 151 it reads **"USE CHROME 149+ OR THE CHATGPT BROWSER FOR AGENT TOOLS"** — but
   the judge *is* on Chrome 151. It must name the flag.

Derive the count from `document.modelContext.getTools()` (filtered to our five names) rather than
from the resolution of `ensureRegistration()`, refresh it on the `toolchange` event, and change the
fallback copy to include the literal, selectable string `chrome://flags/#enable-webmcp-testing`.

```ts
document.modelContext?.addEventListener('toolchange', () => void refreshBadge())
```

### P2-1 — publish the correct manual-test snippet

The README and Devpost description must carry the **string-first** form. The audit's
object-first snippet fails on every Chrome shipping today.

```js
const mc = document.modelContext;
const t  = (await mc.getTools()).find(x => x.name === 'get_learning_workspace');
const out = await mc.executeTool(t, '{}').catch(() => mc.executeTool(t, {})); // string first
console.log(JSON.parse(out));
```

Also link the extension by ID (`.../detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd`),
and do **not** promise a DevTools panel.

### P2-2 — one honest sentence about the abort signal

We currently imply in the design notes that "`AbortSignal` is honored in every handler." In Chrome
151 the handler never receives one. Rephrase to something falsifiable, e.g. *"handlers are written to
accept the spec's `{signal}` argument as soon as Chrome delivers it; Chrome 151 does not, so
cancellation today rejects the caller while the handler runs to completion."* That sentence
demonstrates we tested the binary, not the spec — exactly the signal this judging panel rewards.
