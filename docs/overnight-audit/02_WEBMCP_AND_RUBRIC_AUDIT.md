# WebMCP & Challenge Rules Audit

**Research window:** 2026-08-27 00:17 UTC → 2026-08-27 01:05 UTC (= 2026-08-26 17:17–18:05 PDT).
All claims below were re-verified live in that window against primary sources. Anything I could not
verify is marked **UNVERIFIED** in bold.

---

# PART 1 — The WebMCP Challenge (competition)

Primary source: <https://webmcp.devpost.com/> (Overview, Rules, Resources, Project Gallery, Updates tabs).

## 1.1 Dates

| Event | Value | Source |
|---|---|---|
| Submission period opens | 2026-08-25, 11:00 AM PT | [rules](https://webmcp.devpost.com/rules) |
| **Submission deadline** | **2026-09-03, 1:00 PM PDT** (4:00 PM EDT / 20:00 UTC) | [overview](https://webmcp.devpost.com/), [rules](https://webmcp.devpost.com/rules) |
| Judging period | 2026-09-04 → 2026-09-21 | [rules](https://webmcp.devpost.com/rules) |
| Winners announced | ~2026-09-23 | [rules](https://webmcp.devpost.com/rules) |

There are **no interim deadlines**. There is no editing after the deadline — the Resources tab states
"No editing after September 3, 1:00 PM PT deadline" ([resources](https://webmcp.devpost.com/resources)).

Time remaining as of this audit: **~7 days 20 hours.**

## 1.2 Who may enter

- Individuals at or above the age of majority in their place of residence, in supported countries.
- Teams of eligible individuals.
- Organizations (corporations, nonprofits, LLCs, partnerships) based in supported countries.
- An organization or team must designate a **Representative** who is authorized to act on its behalf
  and who submits the entry. (Relevant: MetaDigits.AI Inc. entering as the company requires the
  Representative to be authorized to bind the company.)
- Excluded: residents of unsupported / US-sanctioned regions; employees of the promotion entities and
  their immediate family/household; **judges and their employers**; parents/subsidiaries/affiliates of
  ineligible orgs; anyone with an apparent conflict of interest.

Note: judges' employers are Cloudflare, Shopify, Vercel, OpenAI, Netlify, Google/Chrome, and MCP-B.
Source: [rules](https://webmcp.devpost.com/rules).

## 1.3 Existing products / pre-existing code

Verbatim from the rules:

> "Projects must be either newly created during the Hackathon Submission Period or, if the Project
> existed prior to the Submission Period, must have been meaningfully extended using WebMCP after the
> Submission Period start date."

> "Pre-existing Projects will be evaluated only on work added during the Submission Period."

Clear documentation distinguishing prior work is required (timestamped commits etc.).

**Implication (hard):** because Mathos is a pre-existing product, *only* work committed after
2026-08-25 11:00 AM PT counts for scoring. Any borrowed Mathos code must be visibly attributed as
pre-existing, and the WebMCP layer must be unmistakably new in git history. A repo whose first commit
predates 2026-08-25 without a clear "prior work" boundary invites a Stage One / scoring haircut.

## 1.4 Submission requirements

**Live deployment.** A working live URL "accessible via ChatGPT's in-app browser or Chrome with
WebMCP enabled." Hosting on ChatGPT Sites, Cloudflare, Vercel, Render, Netlify or equivalent.

**Text description** must explain: why WebMCP fits the use case; how it improves the user experience;
what people and agents can accomplish together that was previously difficult or impossible; and the
implementation approach.

**Public repository.** GitHub/GitLab/Bitbucket, containing all source, assets, and instructions to
run it. Verbatim: "must be open source by including an open source license file. This license should
be detectable and visible at the top of the repository page (in the About section)."
→ This means a real `LICENSE` file at repo root that GitHub's licensee detector recognizes (MIT /
Apache-2.0), so the About sidebar shows the license badge. A `LICENSE.md` with custom text will not
be detected and technically fails this clause.

**Demo video.** Verbatim: "must be less than three (3) minutes. Judges are not required to watch
beyond three minutes [and] must include a clear demo of your project functioning and with audio."
Uploaded to **YouTube**, publicly visible. No unlicensed trademarks, copyrighted music or protected
material.

**Testing access.** Verbatim: "The Entrant must make the Project available free of charge and without
any restriction, for testing, evaluation and use by the Sponsor, Administrator and Judges." Provide
login credentials if login is necessary. Critically: **"Judges may evaluate based solely on text,
images, and video if they choose."**

**Language.** English, or complete English translations.

## 1.5 Judging

**Stage One — pass/fail eligibility screen.** Verbatim:

> "The first stage will determine via pass/fail whether the ideas meet a baseline level of viability,
> in that the Project reasonably fits the theme and reasonably applies the required APIs/SDKs featured
> in the Hackathon."

Two independent gates: (a) fits the theme — humans and agents interacting/collaborating/creating
together on the open web; (b) reasonably applies WebMCP. A project that merely calls an LLM, or that
registers a token WebMCP tool nobody uses, is where this gate bites.

**Stage Two — four criteria, equally weighted (25% each), scored in this order:**

1. **WebMCP Leverage** — "How thoroughly and skillfully does the project use WebMCP? Does the code
   reflect genuine effort and a working, non-trivial implementation?"
2. **Execution** — "Does the project deliver a working or runnable project that has a complete,
   coherent product experience — not just a technical proof of concept?"
3. **Potential Impact** — "Does the project make a credible, specific case for solving a real problem
   for a real audience — and does the solution actually address that problem based on what's
   demonstrated?"
4. **Creativity & Ambition** — "How creative and novel is the concept and does the project differ
   from existing concepts?"

The rules text says the criteria are equally weighted; Devpost does not publish explicit numeric
percentages next to each criterion. Treat as 25/25/25/25.

**Tiebreak.** Verbatim: "For each Prize listed below, if two or more Submissions are tied, the tied
Submission with the highest score in the first applicable criterion listed above will be considered
the higher scoring Submission." If tied on every criterion, judges vote.
→ **Criterion order is load-bearing: WebMCP Leverage is the tiebreak axis.** In a field of 2,000+
registrants competing for 10 prizes, ties at the top are likely. Optimize WebMCP Leverage first.

**Prizes.** 10 winners, ~$3,500 combined value each, $35,000 total. OpenAI $3,000 cash + Codex Micro
+ 1-yr ChatGPT Pro + @OpenAIDevs spotlight; Cloudflare $10,000 credits; Vercel ~$4,200 credits;
Netlify $500 cash; Render $300 credits; Shopify gear; Google Chrome 3-month AI Ultra. One prize per
project.

**Judges.** Andrew Galloni (Cloudflare, VP Research & Innovation), Alex Nahas (creator of MCP-B),
Ilya Grigorik (Shopify, Distinguished Engineer), Jude Gao (Vercel), Justin Rushing (OpenAI, Browser
Platform Lead), Sarah Drasner (Google/Chrome, Distinguished Engineer), Sean Roberts (Netlify, VP
Applied AI).
→ This panel is unusually API-literate. Alex Nahas wrote a WebMCP implementation; Justin Rushing owns
OpenAI's browser platform; Sarah Drasner sits inside Chrome. They will read the tool definitions.
Cargo-culted or non-idiomatic WebMCP usage will be visible to them at a glance.

## 1.6 What judges will and will not execute

- The rules **do not obligate judges to run the code**: "Judges may evaluate based solely on text,
  images, and video if they choose."
- Where they do run it, the two supported runtimes named by the organizers are:
  1. **ChatGPT desktop app's built-in browser** ("supports WebMCP out of the box"), and
  2. **Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` set to Enabled**
     (relaunch required).
  Source: [resources](https://webmcp.devpost.com/resources).
- Therefore the flag *is* a real friction point for a judge on stock Chrome. See §3.2 — shipping an
  origin-trial token removes it.

## 1.7 Visible competition

- **Project Gallery is not published.** As of this audit the gallery renders: "The hackathon managers
  haven't published this gallery yet, but hang tight!" ([project-gallery](https://webmcp.devpost.com/project-gallery)).
  **We have zero visibility into competing submissions, including any education/tutoring entries.**
- Registered participants: **2,065 → 2,071** over the ~45 minutes of this audit (the counter moved
  across successive fetches). Registration ≠ submission; historical Devpost conversion is a small
  fraction, but assume a few hundred submissions for 10 prizes.
- **Updates tab is empty** — "Stay tuned for important announcements." No rule amendments, no
  clarifications, no errata to date. Re-check before submitting.
- Discussion board: <https://webmcp.devpost.com/forum_topics>. Support also via OpenAI Discord
  (discord.gg/openai).

## 1.8 Resources-page items that change how we build/present

From [resources](https://webmcp.devpost.com/resources):

- Chrome 149+ and the `#enable-webmcp-testing` flag are the sanctioned Chrome path.
- Official docs the judges will consider canonical: `developer.chrome.com/docs/ai/webmcp`,
  the origin-trial blog post, the tool-security guide, and `github.com/webmachinelearning/webmcp`.
- "Inspect and debug registered tools in Chrome DevTools" is listed — **UNVERIFIED**: I found no
  shipped WebMCP DevTools panel documented on developer.chrome.com. The documented inspection path is
  the **Model Context Tool Inspector Extension**, not a DevTools panel. Do not build the demo around
  a DevTools panel that may not exist.
- A "WebMCP evals framework for pre-release testing" is referenced; the Chrome best-practices page
  pushes evaluation-driven development. Showing an eval harness is a cheap, high-signal
  differentiator on "WebMCP Leverage."
- Sponsor credit codes exist (Vercel `OAIWEBMH-9E2F-MUT4`, Netlify 3,000 credits, Render $50).

---

# PART 2 — WebMCP as actually shipped

Sources: Chrome for Developers WebMCP docs (last updated 2026-08-07 / 2026-08-20 depending on page),
the W3C WebML CG spec draft `index.bs` (repo pushed 2026-08-26T20:23Z), the `webmcp-types` npm
typings v0.1.5 (published 2026-08-20), OpenAI's Site Tools doc, and the explainer issue tracker
(110 open issues).

## 2.1 Browser support and the flag

| Runtime | Status | Source |
|---|---|---|
| Chrome | Origin Trial **live from Chrome 149**; local dev flag `chrome://flags/#enable-webmcp-testing` → Enabled → relaunch | [docs](https://developer.chrome.com/docs/ai/webmcp), [blog 2026-06-09](https://developer.chrome.com/blog/ai-webmcp-origin-trial) |
| Chrome stable **right now** | **153.0.8010.12** (early-stable, rolled 2026-08-26); prior stable 152.0.7977.65 | chromiumdash `fetch_releases` |
| Edge | Origin Trial live from **Edge 150** | [implementation-status.md](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) |
| ChatGPT Desktop | **Supported, no flag** | implementation-status.md, [learn.chatgpt.com/docs/webmcp](https://learn.chatgpt.com/docs/webmcp) |
| Brave | Experimental in Leo AI chat | implementation-status.md |
| Firefox / Safari | No implementation; standards-positions filed only | implementation-status.md |

- The flag name **`chrome://flags/#enable-webmcp-testing` is confirmed still correct** as of the
  2026-08-07 revision of the Chrome docs.
- Origin trial registration: <https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241>.
  **UNVERIFIED:** the trial's end milestone. Chrome Status' JSON for feature 5117755740913664 reports
  `ot_milestone_desktop_end: null` and `origintrial: false`, which contradicts the blog post and the
  explainer's implementation-status page. The blog + implementation-status govern (they are
  maintained by the feature owners; the Chrome Status entry is visibly stale — `intent_stage: "None"`,
  `status: "Proposed"`). Register and read the actual end milestone off the trial page before relying
  on it past September.
- Spec maturity: "Specification being incubated in a Community Group" (WebML CG). Spec URL:
  <https://webmachinelearning.github.io/webmcp>.

## 2.2 `document.modelContext` vs `navigator.modelContext`

**`document.modelContext` is correct today. Use it.**

- Spec IDL: `[Exposed=Window, SecureContext] interface ModelContext : EventTarget`, reached via
  `Document.modelContext`. The move from `Navigator` to `Document` landed in the 2026-05-27 draft
  (explainer issue #173, "Make tools Document-scoped instead of Window-scoped", closed 2026-05-27).
- Every code sample on `developer.chrome.com/docs/ai/webmcp*` uses `document.modelContext`;
  **zero occurrences of `navigator.modelContext`** across the index, imperative-API and
  best-practices pages (verified by grep of the fetched HTML).
- `webmcp-types@0.1.5` declares `interface Document { readonly modelContext?: WebMCP.ModelContext }`
  and declares nothing on `Navigator`.
- `navigator.modelContext` was deprecated in Chromium 150 and retained as an alias pending removal
  (secondary sources only — **UNVERIFIED against a Chrome primary source**; treat as legacy either
  way). Do not use it. A `document.modelContext ?? navigator.modelContext` fallback is harmless but
  unnecessary for Chrome 149+ / ChatGPT desktop.

## 2.3 Registration API — the imperative `registerTool(tool, {signal})` form is current and correct

This is the critical finding for our codebase. **Our call shape is right.**

Spec IDL (from `index.bs`, repo HEAD 2026-08-26):

```webidl
[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined>                 registerTool(ModelContextTool tool,
                                                  optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>>  getTools(optional ModelContextGetToolOptions options = {});
  Promise<DOMString>                 executeTool(RegisteredTool tool,
                                                 optional object inputObject = {},
                                                 optional ModelContextExecuteToolOptions options = {});
  attribute EventHandler ontoolchange;
};
```

- **There is no `provideContext()`, no `clearContext()`, no `unregisterTool()`, no `registerTools()`
  in the current spec, in the Chrome docs, or in the official typings.** Those methods existed in the
  2025/early-2026 `navigator.modelContext` era and were removed (explainer issue #101 refers to
  `navigator.modelContext.provideContext`, closed 2026-03-06). Third-party blog posts that describe a
  declarative `provideContext({tools:[...]})` batch model are describing a dead API. **The spec repo
  and Chrome docs govern; the blogs are stale.**
- Unregistration is done **only** via `AbortSignal`: pass `{ signal }` at registration, call
  `controller.abort()` to unregister.
- Chrome docs, verbatim: *"As of Chrome 153, you can unregister a tool without cancelling and breaking
  in-flight executions."* The `{signal}` option itself works before 153; what changed in 153 is that
  aborting no longer kills a running `execute`. Judges on Chrome 152 or 153 in September are both fine.
- There is a separate **Declarative API** (annotate a `<form>` with `toolname` / `tooldescription`
  attributes). It is complementary, not a replacement.

## 2.4 Tool descriptor — exact shape

```webidl
dictionary ModelContextTool {
  required DOMString           name;         // 1–128 chars; ASCII alphanumeric, '_', '-', '.' ONLY
  USVString                    title;        // optional, display label, localize it
  required DOMString           description;  // non-empty
  object                       inputSchema;  // optional; a JSON Schema object
  required ToolExecuteCallback execute;
  ToolAnnotations              annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint = false;
  boolean untrustedContentHint = false;
};
```

- **Annotations: only `readOnlyHint` and `untrustedContentHint` exist.** There is **no
  `destructiveHint`** and **no `idempotentHint`** in WebMCP (those are MCP-server-side annotations,
  not WebMCP). Passing them is silently dropped — `RegisteredTool.annotations` is reconstructed from
  only these two fields.
- `inputSchema` is **not validated by the browser**. It is `JSON.stringify()`'d verbatim at
  registration and handed to the agent as a string. Native input/output schema validation is an *open
  question* (explainer issue #92). Therefore: **the schema is advisory; your `execute` must validate.**
  Chrome best practices say exactly this — "Validate strictly in code, loosely in schema."
- `registerTool()` **rejects** with `InvalidStateError` if: a tool of that name is already registered;
  `name` or `description` is the empty string; `name` exceeds 128 chars or contains a disallowed code
  point. It rejects with a `TypeError` if `inputSchema` is not JSON-serializable, `SecurityError` on a
  non-secure/non-`file:` origin, and `NotAllowedError` when the `tools` permissions policy blocks it.
- **Character budgets** (Chrome security guidance, explicitly "recommended", not enforced):
  500 chars per tool description; 150 chars per parameter description; 30 chars per tool name and per
  parameter name; **1.5K chars per individual tool output**. Exceeding these risks tripping agent
  guardrails.

## 2.5 Handler signature, arguments, AbortSignal

```webidl
callback ToolExecuteCallback = Promise<any> (object inputObject, ToolExecuteCallbackOptions options);
dictionary ToolExecuteCallbackOptions { required AbortSignal signal; };
```

- Two arguments: `(inputObject, { signal })`. `signal` is **required and always present** per the
  dictionary. Chrome's own sample: `execute: async ({ url, priority }, { signal }) => { ... }`.
- The signal aborts when the user or agent cancels the call; pass it through to `fetch()` and
  long-running work.

## 2.6 Return shape — plain string OR any JSON-serializable value; both are correct

The spec algorithm is unambiguous: when the developer's promise fulfils with value `v`, the browser
runs *"serializing a JavaScript value to a JSON string given v"* and returns that string.
`executeTool()` is typed `Promise<DOMString>`.

Consequences, all falsifiable:

| You return | Agent receives | Verdict |
|---|---|---|
| `"Added todo: milk"` | `"Added todo: milk"` (JSON string) | OK — Chrome's docs use this form |
| `{ ok: true, data: {...} }` | the JSON text of that object | OK — OpenAI's own Site Tools sample returns `({ title: document.title })` |
| `{ content: [{ type:'text', text:'…' }] }` | the JSON text of that object | Works, but it is **not** an MCP envelope the browser understands — it is just an object you chose |
| `undefined` / bare `return;` | `JSON.stringify(undefined)` → the serializer **throws** → the call is completed as a **failure** | **never return void** |
| a promise that **rejects**, or a handler that **throws** | call completed as failure; `executeTool()` rejects with a generic `UnknownError` `DOMException`; the browser *may* log a console warning — **your error message does not reach the agent** | **never throw for expected errors** |

**Divergence, resolved:** the explainer README's headline sample returns
`{ content: [{ type: 'text', text: '…' }] }` (MCP-flavoured), while the Chrome docs (updated
2026-08-20) return plain strings and OpenAI returns a plain object. **The spec's serialization
algorithm governs and it accepts all three** — there is no privileged `content` envelope in WebMCP.
The README is carrying MCP habit, not a requirement. Pick whichever is clearest for the model and
stay under 1.5K chars.

**The error path is the sharp edge.** Because a thrown error is flattened to `UnknownError` with the
message discarded, an agent cannot self-correct from an exception. Chrome best practices instruct:
"Add descriptive errors to your function code to allow the model to self-correct and retry with new,
valid parameters." That only works if you **return** the error as a value.

## 2.7 Lifecycle, dynamic re-registration, notifications

- **Re-registering an existing name rejects** (`InvalidStateError`). There is no upsert. To swap a
  tool: `controller.abort()` the old one, then register again.
- `toolchange` event fires on `document.modelContext` when the available tool list changes:
  `document.modelContext.addEventListener("toolchange", e => {...})`. Also `ontoolchange`.
- Chrome best practices: *"For most applications, static registration should be the default
  approach."* Register once; do not churn the tool list per UI state. Related open issue #262
  ("WebMCP loses important context when tools appear or disappear", opened 2026-08-26) documents that
  unregistering destroys the *reason* a capability went away — the agent only sees a vanished tool.
- `registerTool()` resolves to `undefined`, not to the registered tool (open issue #234). To confirm
  registration, call `getTools()` and inspect names, or listen for `toolchange`.
- Tools are **document-scoped and page-lifetime-scoped**. OpenAI: "Tools belong to the page that
  provides them. Closing or navigating away from a page can make its tools unavailable." A full
  navigation destroys the tool set; an SPA route change does not.
- Cross-document tool responses (tool causes a navigation) are an **open question** (issue #135);
  `executeTool()` returns `null` when a navigation is triggered. **Do not let a tool navigate.**

## 2.8 Origin, security and iframe behavior

- **`SecureContext` required** — HTTPS (or `localhost`, or `file:` per the spec's scheme carve-out).
- **Origin isolation required.** Verbatim from the Chrome docs: *"WebMCP is only available in
  origin-isolated documents … If a document has `document.domain` enabled (for example, by using the
  `Origin-Agent-Cluster: ?0` HTTP header), WebMCP APIs are disabled."* Check your host/CDN does not
  emit `Origin-Agent-Cluster: ?0`.
- **Permissions Policy `tools`**, default `self`. Top-level and same-origin frames can register;
  cross-origin iframes cannot unless the embedder adds `<iframe allow="tools">`.
- **Cross-origin exposure is opt-in twice**: the registrant must list the consumer in
  `registerTool(tool, { exposedTo: ['https://example.com'] })`, *and* the consumer must ask for it via
  `getTools({ fromOrigins: [...] })`. Both arrays accept secure origins only.
- Chrome extensions with `host_permissions` can query and execute WebMCP tools via content scripts.
- ChatGPT treats "website-provided tool definitions and results" as **untrusted content**, runs a
  safety review per invocation, and still applies its confirmation policy for consequential actions.

## 2.9 How a developer or judge actually invokes a tool

Three real paths, in descending order of what a judge will plausibly do:

1. **ChatGPT desktop built-in browser (zero setup).** Open the URL in ChatGPT desktop's browser →
   the address bar shows a **Site tools** control → expand **Available site tools (N)** to inspect
   each tool (ChatGPT's own screenshot shows e.g. *"Available site tools (10) — 3 read, 7 write
   tools"*) → ask the agent in natural language → **Recently used → Sources** shows the actual tool
   calls made. Requires the latest ChatGPT desktop app and **GPT-5.6 Sol or GPT-5.6 Terra**
   (**GPT-5.6 Luna has WebMCP disabled**). Not available in Enterprise or Edu workspaces. Toggle at
   *Settings > Browser > Permissions > Enable site tools*.
2. **Chrome + Model Context Tool Inspector Extension.** Chrome Web Store item
   `gbpdfapgefenggkahomfgkhfehlcenpd`
   (<https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd>).
   It lists registered tools, lets you **call them manually**, validates the JSON Schema, shows the
   structured output or error, and offers a natural-language chat that routes to
   `gemini-3-flash-preview`. This is the closest thing to an official harness.
3. **DevTools console, manually:**
   ```js
   const tools = await document.modelContext.getTools();
   const t = tools.find(x => x.name === 'get_learning_workspace');
   const out = await document.modelContext.executeTool(t, {});   // spec: an object
   console.log(out);                                             // a JSON string
   ```
   **Divergence, unresolved:** the current spec IDL takes `optional object inputObject = {}` (explainer
   issue #243, *"The `executeTool()` method should take an object, not a string"*, **closed
   2026-08-17**), but the Chrome docs page — last updated 2026-08-20 — still shows the *string* form
   `executeTool(tool, '{"text": "Buy milk"}')`. **UNVERIFIED which form shipped Chrome 152/153
   accepts.** The spec is newer than the shipped implementation, and Chrome docs sometimes lag the
   spec rather than the binary. **Any console snippet we publish must try the object form and fall
   back to the JSON-string form**, e.g.
   `await mc.executeTool(t, {}).catch(() => mc.executeTool(t, '{}'))`. Verify locally tonight in the
   installed Chrome and pin the working form in the README.

   Note `webmcp-types@0.1.5` **does not declare `executeTool` at all** on `ModelContext` (only
   `registerTool`, `getTools`, `ontoolchange`). Another sign this method's surface is in flux. If we
   use the typings package, we will need a local augmentation for `executeTool`.

## 2.10 Known divergences and open issues that matter to a 5-tool stateful education app

| # | Divergence / issue | Impact on us |
|---|---|---|
| 1 | README returns `{content:[…]}`; Chrome docs return a string; spec JSON-serializes anything | Cosmetic. Any is legal. Stay under 1.5K chars. |
| 2 | `executeTool` object-vs-string (issue #243 closed 2026-08-17 vs Chrome docs 2026-08-20) | Our published manual-test snippet could fail in front of a judge. Ship a defensive snippet. |
| 3 | `webmcp-types` missing `executeTool` | Type augmentation needed. |
| 4 | Errors flattened to `UnknownError`, message discarded | **Never throw.** Return an error value. |
| 5 | `undefined` return = failure | **Never `return;`.** |
| 6 | Duplicate name ⇒ `registerTool` rejects | Guard against double-registration (StrictMode, HMR, bfcache restore). |
| 7 | Issue #262 — unregistering loses the *reason* | Argues for static registration of all 5 tools + a state machine that returns "not available yet, do X first" rather than hiding tools. |
| 8 | Issue #92 — no native schema validation | Validate every field in `execute`. |
| 9 | Issue #9 — no `outputSchema` yet | Our return contract must be self-describing in prose/JSON, not declared. |
| 10 | Issue #135 — cross-document responses undefined; `executeTool` → `null` on navigation | Tools must never trigger a navigation. |
| 11 | Issue #165 / #50 — `requestUserInteraction()` is spec-draft only, not shipped | Cannot rely on a browser-mediated confirmation dialog. Build confirmation into the UI. |
| 12 | "No maximum number of tools", but each tool consumes agent context | 5 tools is comfortably in the sweet spot. Do not grow to 12. |

---

# PART 3 — What this means for our build

## 3.1 API shape we MUST use (falsifiable checklist)

Our current `src/lib/webmcp.ts` calls
`document.modelContext.registerTool(tool, { signal: controller.signal })`.
**That is the correct, current API. Do not migrate to `provideContext`. Do not migrate to
`navigator.modelContext`.** Anyone who tells you otherwise is reading a pre-March-2026 blog post.

Concrete required properties, each checkable:

1. `document.modelContext`, feature-detected as
   `typeof document.modelContext?.registerTool === "function"` (OpenAI's own recommended guard).
2. Tool names match `^[A-Za-z0-9_.-]{1,128}$`. Ours (`get_learning_workspace`,
   `check_current_attempt`, `show_targeted_lesson`, `start_transfer_problem`,
   `get_learning_receipt`) all pass and all sit under the recommended 30-char name budget. Leave them.
3. `annotations` uses **only** `readOnlyHint` and `untrustedContentHint`. Ours does. Do not add
   `destructiveHint` / `idempotentHint`.
4. **Every `execute` returns a value; none ever throws.** Our handlers return a `ToolEnvelope`, which
   JSON-serializes fine — **except one real bug:** `pageBridge.getState()` does
   `throw new Error('The learning studio is not mounted.')`. If an agent calls any tool before React
   mounts (entirely plausible — ChatGPT can call a tool the instant `toolchange` fires), the throw
   escapes `execute`, the browser flattens it to `UnknownError`, and the agent gets a blank failure it
   cannot recover from. **Fix: make `getState()` return a sentinel and have each handler return an
   `invalid_phase` envelope with a recovery string instead.**
5. `registerTool` is called once per tool, guarded against duplicates.
   **Second real risk:** `Promise.all(tools.map(registerTool))` means a single `InvalidStateError`
   (duplicate name after an HMR reload) rejects the whole batch, and the `.catch` then calls
   `controller.abort()`, unregistering *every* tool. Use `Promise.allSettled` and log per-tool
   failures, or abort only the failed registration.
6. **Third real risk — bfcache.** We `controller.abort()` on `pagehide`. `pagehide` fires when the
   page enters the back/forward cache; on restore React does not remount, so `ensureRegistration()`
   is never called again and **the site silently has zero tools after a back-navigation**. A judge who
   navigates away and back sees an empty tool list. Fix: re-register on `pageshow` when
   `event.persisted`, or drop the `pagehide` teardown entirely (document teardown already destroys
   the model context).
7. `inputSchema` properties need **`description` strings**. Ours currently have none — every property
   is a bare `{type, minLength, maxLength}`. Chrome best practices allocate 150 chars per parameter
   description precisely because the agent reads them. Add one sentence per parameter, especially for
   `expectedRevision` and `requestId`, which are non-obvious and will otherwise be hallucinated.
8. Add the optional **`title`** field to all five tools. ChatGPT's Site Tools panel renders tool
   labels; a judge expanding "Available site tools (5)" should see human-readable names, not
   `snake_case`. Cheap, visible, directly serves Execution.
9. Keep every `data` payload under **1.5K characters**. `workspaceData()` is close to the edge; audit it.
10. Confirm the deployment is **HTTPS** and does **not** send `Origin-Agent-Cluster: ?0`.
11. Fix the local `declare global` block — it types
    `executeTool?: (name: string, input: unknown)`. The real signature takes a `RegisteredTool`
    object, not a name. Either depend on `webmcp-types@0.1.5` and augment `executeTool`, or correct
    the hand-rolled declaration.

## 3.2 The judge's actual click-path — design for it

Assume a judge does **one** of these, in this order of likelihood:

**Path A (most likely, zero-setup): ChatGPT desktop built-in browser.**
Opens our URL → clicks **Site tools** in the address bar → expands **Available site tools (5)** →
types a prompt → watches the page change → clicks **Recently used → Sources** to see which tools ran.
Design consequences:
- The tool list panel is a **screenshot the judge sees before they see our product.** Five tools with
  clear titles and one-sentence descriptions, correctly split read/write, is a scored artifact.
  ChatGPT displays the read/write split ("3 read, 7 write tools") — our `readOnlyHint` values directly
  produce that line. Ours yields "2 read, 3 write", which is correct as-is.
- Requires GPT-5.6 **Sol or Terra**. **Our README and Devpost description must say so**, because a
  judge on Luna will see nothing and conclude we're broken. This single line may be the
  highest-leverage sentence in the whole submission.
- Not available in Enterprise/Edu workspaces — another reason Path B must also work.

**Path B: Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.**
Three steps and a browser relaunch before they see anything.
**Mitigation, and the single highest-ROI infrastructure task tonight: register for the WebMCP origin
trial** (<https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241>) for our
deployed origin and ship the token as `<meta http-equiv="origin-trial" content="…">`. Then
`document.modelContext` exists in **stock Chrome 149+ with no flag**, and the judge's click-path
collapses to "open URL." **UNVERIFIED:** whether the trial is still accepting registrations and
whether its end milestone covers September 2026 — check on the trial page before promising this. If
it does not, put the exact flag URL, as copyable text, in the first line of the README and on-screen
in the app itself.

**Path C: they never run it.** The rules explicitly permit judging from text, images and video alone.
Therefore the video and the description must independently carry all four criteria. Budget the video
as if it is the only artifact consumed.

**On-page insurance for all three paths:** render a small, honest runtime banner —
"WebMCP: 5 tools registered" (green) vs "WebMCP not available in this browser — enable
chrome://flags/#enable-webmcp-testing or open in ChatGPT desktop" (amber, with the flag string
selectable). This converts the worst failure mode (judge sees a normal web app and scores WebMCP
Leverage as zero) into a self-diagnosing one.

## 3.3 Presentation choices that maximize Stage Two, criterion by criterion

**Stage One first (pass/fail, and it is not free):** the theme is *humans and agents interacting,
collaborating, and creating together*. A tutoring app where the agent does the work **fails the
theme's spirit** and risks reading as "AI does homework." Our shared-workspace framing — agent and
learner acting on one live state machine with visible revisions and an activity log attributing each
action to `agent` or `learner` — is exactly on-theme. **Say that explicitly in the first two sentences
of the Devpost description**, using the rules' own vocabulary ("interact, collaborate, and create
together"). Do not make the judge infer it.

**1. WebMCP Leverage (also the tiebreak axis — optimize this first).**
"Thoroughly and skillfully … genuine effort and a working, non-trivial implementation."
Things this panel will recognize as skill, which we already have or can add cheaply:
- Optimistic-concurrency via `expectedRevision` (the agent cannot act on stale state) — a serious
  answer to the hardest problem in agent/human co-editing. **Lead with it.**
- `requestId` idempotency caching (replayed tool calls do not double-apply).
- `AbortSignal` honored in every handler.
- `readOnlyHint` / `untrustedContentHint` set deliberately per tool, with a sentence explaining *why*
  the learner-authored attempt is flagged untrusted. This maps 1:1 onto Chrome's published security
  guidance — a Chrome judge will notice.
- Errors returned as structured, recoverable values with a `recovery` string rather than thrown — plus
  a one-line README note explaining that WebMCP flattens thrown errors to `UnknownError`, which is
  why. **That paragraph demonstrates we read the spec, not a blog post.**
- Static registration of all five tools with phase gating in the return value (per issue #262's
  reasoning) rather than register/unregister churn — and say so.
- An **eval script** (even 10 prompts × expected tool sequence) checked into the repo. The organizers'
  resources page and Chrome's best-practices page both push evaluation-driven development; almost no
  hackathon entry will have one.

**2. Execution.** "A complete, coherent product experience — not just a technical proof of concept."
The tool list is part of the product surface here: titles, descriptions, read/write split. Beyond
that, the app must be fully usable by a **human with no agent at all** — progressive enhancement is
the stated WebMCP philosophy ("Preserve the normal interface for people and browsers that don't
support WebMCP"). Demo the human path for 15 seconds before the agent path.

**3. Potential Impact.** "A credible, specific case for solving a real problem for a real audience —
and does the solution actually address that problem **based on what's demonstrated**." That last
clause is a demonstration requirement, not a claim requirement. Our transfer-problem + learning-receipt
loop *is* the demonstration: the agent diagnoses, teaches, then the learner solves a *fresh* problem
unaided. **Show the fresh-problem success on camera.** The receipt's third claim — "This receipt does
not prove permanent mastery" — is an honesty signal that will read as credibility to this panel; keep it.

**4. Creativity & Ambition.** "Does the project differ from existing concepts?" The gallery is
unpublished so we cannot differentiate against actual entrants, but the predictable modal entries are
shopping carts, form-fillers, dashboards and travel booking — these are literally the examples in
Chrome's own docs and OpenAI's own docs. An education app with a **stateful, revision-guarded,
pedagogically-sequenced** tool set is off that beaten path. Frame the novelty as *the agent is a tutor
constrained by the app, not a chatbot* — the app owns the pedagogy and the agent must ask permission
via the state machine. That inversion is the creative claim.

**Tiebreak reminder:** WebMCP Leverage breaks ties, then Execution, then Impact, then Creativity.
When a trade-off arises tonight, spend the hour on the WebMCP layer.

## 3.4 Compliance punch-list (do not lose on a technicality)

- [ ] `LICENSE` (MIT or Apache-2.0) at repo root, **detected by GitHub**, badge visible in the About sidebar.
- [ ] Repo public, contains all source + run instructions.
- [ ] Git history makes the pre-existing/new boundary unmistakable; README section "What existed before 2026-08-25".
- [ ] Live HTTPS URL, no auth wall, free, unrestricted for judges.
- [ ] YouTube video, **public**, **under 3:00**, with **audio narration**, showing the project working
      and explaining the WebMCP usage. No copyrighted music.
- [ ] Devpost description covers, as four labeled sections: why WebMCP fits; how it improves UX; what
      humans + agents can now do together that was hard or impossible; the implementation approach.
- [ ] Testing instructions naming: ChatGPT desktop (latest, **GPT-5.6 Sol or Terra**) *or*
      Chrome 149+ with `chrome://flags/#enable-webmcp-testing`.
- [ ] Re-check <https://webmcp.devpost.com/updates> before submitting — it is empty today.
- [ ] Submit well before **2026-09-03 1:00 PM PDT**; no edits after.

---

## Source index

- <https://webmcp.devpost.com/> · /rules · /resources · /project-gallery · /updates
- <https://developer.chrome.com/docs/ai/webmcp> (updated 2026-08-07)
- <https://developer.chrome.com/docs/ai/webmcp/imperative-api> (updated 2026-08-20)
- <https://developer.chrome.com/docs/ai/webmcp/best-practices> (2026-05-18)
- <https://developer.chrome.com/docs/ai/webmcp/secure-tools> (updated 2026-07-01)
- <https://developer.chrome.com/blog/ai-webmcp-origin-trial> (2026-06-09)
- <https://github.com/webmachinelearning/webmcp> — README.md, index.bs, implementation-status.md (HEAD 2026-08-26)
- Explainer issues #9, #92, #101, #135, #165, #173, #234, #243, #262
- <https://learn.chatgpt.com/docs/webmcp> (ChatGPT Site Tools)
- npm `webmcp-types@0.1.5` (2026-08-20), `usewebmcp@5.0.1` (2026-08-23)
- chromiumdash `fetch_releases` / `fetch_milestone_schedule`; chromestatus feature 5117755740913664
- <https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd>
