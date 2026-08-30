# Platform probe transcript — executed evidence

WebMCP **was** successfully enabled. All results below were produced by execution, not
inference.

## Environment

- Chrome 151 (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like
  Gecko) Chrome/151.0.0.0 Safari/537.36`), launched with:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9377 \
  --user-data-dir="C:\Users\fireh\AppData\Local\Temp\claude\webmcp-probe-profile" \
  --enable-features=WebMCPTesting \
  --no-first-run --no-default-browser-check \
  http://localhost:3000/learn
```

- Driven over raw CDP (`Runtime.evaluate`, `awaitPromise: true`, `returnByValue: true`)
  against the `/learn` page target found via `http://localhost:9377/json`. The
  `chrome-devtools` MCP was not used, because it launches Chrome without the feature flag.
- Page under test: `http://localhost:3000/learn`, `location.origin === "http://localhost:3000"`.
- Probe module read before execution:
  `C:\Jerry\Important\Coding\Mathos\mathos-webmcp\.worktrees\hackathon-build\src\domain\tools\platform.ts`

## 0. `document.modelContext` exists; six product tools registered

```js
(async()=>{const mc=document.modelContext; return {
  hasModelContext: !!mc,
  keys: mc ? Object.getOwnPropertyNames(Object.getPrototypeOf(mc)) : null,
  isEventTarget: mc ? (typeof mc.addEventListener==='function') : null,
  ua: navigator.userAgent};})()
```

```json
{
  "hasModelContext": true,
  "keys": ["ontoolchange", "executeTool", "getTools", "registerTool", "constructor"],
  "isEventTarget": true,
  "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
}
```

```js
(async()=>{const t=await document.modelContext.getTools();
  return {count:t.length, names:t.map(x=>x.name)};})()
```

```json
{
  "count": 9,
  "names": ["__probe_annot_mtfax2yr", "__probe_change_mtfax1xw", "__probe_exposed_mtfax1xp",
            "annotate_step", "check_work", "get_receipt", "get_scratchpad", "new_problem",
            "propose_step"]
}
```

All six product tools present: `get_scratchpad`, `check_work`, `annotate_step`,
`propose_step`, `new_problem`, `get_receipt`.

## 1. Probe results as the page computed them

```js
[...document.querySelectorAll('.console-platform li')].map(li => li.innerText)
```

```json
[
  "Origin scoping (exposedTo)\nsupported\nAccepted exposedTo: [\"http://localhost:3000\"] and the tool is listed for this origin.",
  "Cross-origin read (getTools fromOrigins)\nsupported\ngetTools({fromOrigins:[\"http://localhost:3000\"]}) returned 7; unscoped returned 7.",
  "Live tool-list events (toolchange)\nsupported\nRegistering a tool dispatched toolchange on document.modelContext.",
  "Declarative tools (form toolname)\nsupported\nA form carrying a toolname attribute was registered by the browser with no imperative call.",
  "Phase-dependent descriptions\nsupported\nre-registering a name in place updates its description, so a tool can say it is closed without being withdrawn.",
  "Annotations beyond the two hints\npartial\nSent four, kept 2: readOnlyHint, untrustedContentHint. Dropped: destructiveHint, idempotentHint."
]
```

This exact output reproduced identically across two independent page loads.

---

# Independent re-verification

## Feature 1 — `exposedTo` (origin scoping)

Code:

```js
(async()=>{const mc=document.modelContext;const n='__probe_v_exposed';let res;
 try{res=await mc.registerTool({name:n,title:'v',description:'verify exposedTo',
   inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false},
   execute:()=>({ok:true})},{exposedTo:[location.origin]});
 }catch(e){return{threw:String(e)}}
 const t=await mc.getTools();
 return{resolved:true,returned:String(res),present:t.some(x=>x.name===n),count:t.length};})()
```

Result:

```json
{ "resolved": true, "returned": "undefined", "present": true, "count": 10 }
```

Additional control — registering with an origin that is **not** this page's origin:

```js
// same call, but { exposedTo: ['https://example.com'] }
```

```json
{ "resolved": true, "presentLocally": true, "count": 11 }
```

Observation: `registerTool` accepts the `exposedTo` option without throwing and resolves to
`undefined`; the tool appears in `getTools()`. A tool scoped to a foreign origin
(`https://example.com`) *also* appears in this origin's `getTools()`, so no filtering effect
was observable from within the page.

Verdict: **partial**

## Feature 2 — `getTools({ fromOrigins })`

Code:

```js
(async()=>{const mc=document.modelContext;
 const s=await mc.getTools({fromOrigins:[location.origin]});
 const u=await mc.getTools();
 let bogus=null;
 try{bogus=(await mc.getTools({fromOrigins:['https://example.com']})).length}
 catch(e){bogus='threw: '+e}
 return{scopedLen:s.length,unscopedLen:u.length,scopedNames:s.map(x=>x.name),
        bogusOriginLen:bogus};})()
```

Result:

```json
{
  "scopedLen": 11,
  "unscopedLen": 11,
  "scopedNames": ["__probe_annot_mtfax2yr","__probe_change_mtfax1xw","__probe_exposed_mtfax1xp",
                  "__probe_v_exposed","__probe_v_exposed_other","annotate_step","check_work",
                  "get_receipt","get_scratchpad","new_problem","propose_step"],
  "bogusOriginLen": 11
}
```

Observation: the option is accepted and does not throw. Scoped and unscoped lengths are
identical (11 vs 11). An origin the page has nothing to do with (`https://example.com`)
returns the same 11. The argument is therefore accepted but had no observable filtering
effect.

Verdict: **partial**

## Feature 3 — `toolchange` event

Code:

```js
(async()=>{const mc=document.modelContext;let fired=0;const evs=[];
 const h=(e)=>{fired++;evs.push(e.type)};
 mc.addEventListener('toolchange',h);
 await mc.registerTool({name:'__probe_v_change',title:'v',description:'verify toolchange',
   inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({ok:true})});
 await new Promise(r=>setTimeout(r,300));
 mc.removeEventListener('toolchange',h);
 return{fired,count:fired,types:evs};})()
```

Result:

```json
{ "fired": 1, "count": 1, "types": ["toolchange"] }
```

Observation: `document.modelContext` is an `EventTarget` (and exposes an `ontoolchange`
property on its prototype). Registering one tool dispatched exactly one `toolchange` event
within 300 ms.

Verdict: **supported**

## Feature 4 — Declarative tools (`<form toolname>`)

Code:

```js
(async()=>{const mc=document.modelContext;const n='__probe_v_form';
 const f=document.createElement('form');
 f.setAttribute('toolname',n);
 f.setAttribute('tooldescription','verify declarative');
 f.style.display='none';
 const i=document.createElement('input');i.name='q';
 i.setAttribute('tooldescription','a query');
 f.appendChild(i);document.body.appendChild(f);
 await new Promise(r=>setTimeout(r,300));
 const t=await mc.getTools();const found=t.find(x=>x.name===n);
 return{present:!!found,tool:found?{name:found.name,description:found.description,
        inputSchema:found.inputSchema}:null,count:t.length};})()
```

Result:

```json
{
  "present": true,
  "tool": {
    "name": "__probe_v_form",
    "description": "verify declarative",
    "inputSchema": "{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}},\"required\":[]}"
  },
  "count": 13
}
```

Observation: the form appeared in `getTools()` with no imperative `registerTool` call. The
browser derived an input schema from the form's fields, mapping `<input name="q">` to a
string property `q`.

Verdict: **supported**

## Feature 5 — Phase-dependent descriptions (re-register same name, new description)

Code:

```js
(async()=>{const mc=document.modelContext;const n='__probe_v_phase2';
 const base={title:'v',inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({ok:true})};
 const log={};
 try{await mc.registerTool({name:n,description:'DESCRIPTION ONE',...base});
     log.firstRegister='ok'}catch(e){log.firstRegister='THREW '+e;return log}
 let t=await mc.getTools();
 log.descAfterFirst=t.find(x=>x.name===n)?.description;
 log.countAfterFirst=t.length;
 try{await mc.registerTool({name:n,description:'DESCRIPTION TWO',...base});
     log.secondRegister='ok'}catch(e){log.secondRegister='THREW '+String(e)}
 t=await mc.getTools();
 log.descAfterSecond=t.find(x=>x.name===n)?.description;
 log.countAfterSecond=t.length;
 log.dupes=t.filter(x=>x.name===n).length;
 return log;})()
```

Result (run on a page with prior probe state):

```json
{
  "firstRegister": "ok",
  "descAfterFirst": "DESCRIPTION ONE",
  "countAfterFirst": 16,
  "secondRegister": "THREW InvalidStateError: Duplicate tool name",
  "descAfterSecond": "DESCRIPTION ONE",
  "countAfterSecond": 16,
  "dupes": 1
}
```

Reproduced on a freshly reloaded page:

```json
{
  "firstRegister": "ok",
  "descAfterFirst": "DESCRIPTION ONE",
  "countAfterFirst": 1,
  "secondRegister": "THREW InvalidStateError: Duplicate tool name",
  "descAfterSecond": "DESCRIPTION ONE",
  "countAfterSecond": 1,
  "dupes": 1
}
```

Same test against an actual product tool (`annotate_step`), which is what
`announcePhase()` in `platform.ts` does:

```js
(async()=>{const mc=document.modelContext;const t0=await mc.getTools();
 const tool=t0.find(x=>x.name==='annotate_step');const before=tool?.description;
 let err=null;
 try{await mc.registerTool({name:'annotate_step',title:'x',
   description:'PHASE CHANGED TEST',
   inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({ok:true})})}
 catch(e){err=String(e)}
 const t1=await mc.getTools();
 return{before:before&&before.slice(0,80),error:err,
        after:t1.find(x=>x.name==='annotate_step')?.description.slice(0,80),
        countBefore:t0.length,countAfter:t1.length};})()
```

```json
{
  "before": "During guided practice, attach a short explanation beside one learner-written li",
  "error": "InvalidStateError: Duplicate tool name",
  "after": "During guided practice, attach a short explanation beside one learner-written li",
  "countBefore": 16,
  "countAfter": 16
}
```

Observation: re-registering an already-registered name throws
`InvalidStateError: Duplicate tool name`. The description did **not** update in place; the
count stayed the same because the second registration was rejected outright, not because it
was merged. No duplicate entry was created.

Note for the record: the `phase` entry in `probePlatform()` (`src/domain/tools/platform.ts`,
lines 253-259) is a hard-coded literal with `status: 'supported'` — unlike the other five
entries, it is not produced by executing anything. That is why the rendered panel reports
`supported` for this row while direct execution reports the throw above.

Verdict: **unsupported**

## Feature 6 — Annotations beyond the two hints

Code:

```js
(async()=>{const mc=document.modelContext;const n='__probe_v_annot';
 await mc.registerTool({name:n,title:'v',description:'verify annotations',
   inputSchema:{type:'object',properties:{},additionalProperties:false},
   annotations:{readOnlyHint:true,untrustedContentHint:false,
                destructiveHint:false,idempotentHint:true},
   execute:()=>({ok:true})});
 const t=await mc.getTools();const f=t.find(x=>x.name===n);
 return{annotationsObject:f?f.annotations:null,
        keys:f&&f.annotations?Object.keys(f.annotations):[],
        json:JSON.stringify(f&&f.annotations)};})()
```

Result:

```json
{
  "annotationsObject": { "readOnlyHint": true, "untrustedContentHint": false },
  "keys": ["readOnlyHint", "untrustedContentHint"],
  "json": "{\"readOnlyHint\":true,\"untrustedContentHint\":false}"
}
```

Observation: four annotation keys were sent. Exactly two survive in `getTools()` —
`readOnlyHint` and `untrustedContentHint`. `destructiveHint` and `idempotentHint` were
silently dropped; no error was raised. This matches the page's own `partial` verdict
verbatim.

Verdict: **partial**

---

## Tool-count check

Page reloaded, waited 6 s for the app's own load-time probes to settle, then:

```js
(async()=>{const t=await document.modelContext.getTools();
 const P=['get_scratchpad','check_work','annotate_step','propose_step','new_problem','get_receipt'];
 const names=t.map(x=>x.name);
 return{total:t.length,
        productCount:names.filter(n=>P.includes(n)).length,
        probeCount:names.filter(n=>n.startsWith('__probe_')).length,
        allNames:names};})()
```

```json
{
  "total": 9,
  "productCount": 6,
  "probeCount": 3,
  "allNames": ["__probe_annot_mtfazbzk", "__probe_change_mtfazakk", "__probe_exposed_mtfazaki",
               "annotate_step", "check_work", "get_receipt", "get_scratchpad", "new_problem",
               "propose_step"]
}
```

- Product tools: **6** — exactly the six expected, none missing, none extra.
- Probe tools with a `__probe_` prefix: **3** (`__probe_exposed_*`, `__probe_change_*`,
  `__probe_annot_*`). Total 9.
- The declarative form probe leaves no residue: `platform.ts` removes the `<form>` in its
  `finally` block, and no `__probe_form_*` name is present after load.
- The load-time probe surface did not inflate beyond these 3. A separate earlier check on a
  session polluted by my own re-verification tools showed `total: 16` = 6 product + 10 probe;
  that extra 7 was mine, not the page's, and did not survive reload.

## `executeTool` check

```js
(async()=>{const mc=document.modelContext;const t=await mc.getTools();
 const tool=t.find(x=>x.name==='get_scratchpad');
 const r=await mc.executeTool(tool,'{}');
 return{type:typeof r,value:typeof r==='string'?r.slice(0,600):JSON.stringify(r).slice(0,600)};})()
```

Result — `typeof r === "string"`:

```
{"ok":true,"revision":0,"data":{"sessionId":"st_3f1ef781f5cf","revision":0,"round":"practice","problem":{"prompt":"Find dy/dx at x = 2.","given":["a = x^2","b = 4x","y = a \\cdot b + a"],"variable":"x"},"steps":[],"checked":false,"firstBrokenStep":null,"firstUnresolvedStep":null,"pendingProposal":null,"availableActions":[],"note":"You cannot write, edit, or accept steps. Only the learner can."}}
```

All six product tools were then invoked via `executeTool(tool, '{}')`. Every call returned
a string without throwing:

| tool | returned (truncated) |
| --- | --- |
| `get_scratchpad` | `{"ok":true,"revision":0,"data":{"sessionId":"st_3f1ef781f5cf","revision":0,"round":"practice","problem":{"prompt":"Find ` |
| `check_work` | `{"ok":false,"revision":0,"error":{"code":"invalid_input","message":"requestId must be 6-64 characters of letters, digits` |
| `annotate_step` | `{"ok":false,"revision":0,"error":{"code":"invalid_input","message":"requestId must be 6-64 characters of letters, digits` |
| `propose_step` | `{"ok":false,"revision":0,"error":{"code":"invalid_input","message":"requestId must be 6-64 characters of letters, digits` |
| `new_problem` | `{"ok":false,"revision":0,"error":{"code":"invalid_input","message":"requestId must be 6-64 characters of letters, digits` |
| `get_receipt` | `{"ok":false,"revision":0,"error":{"code":"invalid_phase","message":"No round has finished yet.","recovery":"There is not` |

The four `invalid_input` results and the one `invalid_phase` result are the tools' own
validation responses to an empty `{}` argument object, not transport or registration
failures — the handlers ran and returned structured errors.

---

## Summary of verdicts

| # | Feature | Page-reported | Independently verified |
| --- | --- | --- | --- |
| 1 | Origin scoping (`exposedTo`) | supported | **partial** |
| 2 | Cross-origin read (`getTools fromOrigins`) | supported | **partial** |
| 3 | Live tool-list events (`toolchange`) | supported | **supported** |
| 4 | Declarative tools (`form toolname`) | supported | **supported** |
| 5 | Phase-dependent descriptions | supported | **unsupported** |
| 6 | Annotations beyond the two hints | partial | **partial** |
