# WebMCP and rules audit — canonical summary

This is the current executive layer. The exhaustive runtime transcript remains in
`02b_WEBMCP_LIVE_VERIFICATION.md`; the longer rubric analysis remains in
`02_WEBMCP_AND_RUBRIC_AUDIT.md`.

## Governing facts

- Submission deadline: **September 3, 2026 at 1:00 PM Pacific Time**.
- Stage Two is equally weighted across WebMCP Leverage, Execution, Potential Impact, and
  Creativity/Ambition.
- The tiebreak order begins with WebMCP Leverage, then Execution.
- A working URL, open-source repository, testing instructions, and demonstration video are
  submission-critical.
- Organization entries need an authorized representative and must satisfy the official
  challenge-period/existing-product rules.

Official sources checked on 2026-08-27:

- <https://webmcp.devpost.com/rules>
- <https://developer.chrome.com/docs/ai/webmcp>
- <https://developer.chrome.com/docs/ai/webmcp/best-practices>
- <https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app>

## Shipped-browser contract

Chrome 151.0.7922.174 with `--enable-features=WebMCPTesting` exposes
`document.modelContext`. The current runtime accepts
`executeTool(registeredToolObject, '<JSON string>')` and returns a JSON string. This shipped
behavior outranks draft-interface assumptions for the submission.

Expected failures are returned as structured values. Throwing or rejecting loses useful error
detail in Chrome, so every handler returns `{ok:false,error:{code,message,recovery}}`.

## Final six-tool surface

| Tool | Mode | Visible effect | Critical guard |
| --- | --- | --- | --- |
| `get_scratchpad` | read | reads live learner artifact | output bounded; learner text untrusted |
| `check_work` | write | paints deterministic verdicts | revision + idempotency |
| `annotate_step` | write | attaches teaching to a line | practice round only |
| `propose_step` | write | offers, never applies, a replacement | genuine retry gate; learner decides |
| `new_problem` | write | starts fresh unaided transfer | only after sound **and complete** work |
| `get_receipt` | read | reads bounded session evidence | explicitly does not claim mastery |

Exactly two tools are marked read-only and untrusted-output-bearing. Four are mutations. The
surface stays at six because annotation and proposal have different agency semantics; combining
them would make tool selection less reliable and consent less legible.

## Security and state conclusions

- Same-document revisions prevent stale writes.
- Request IDs deduplicate concurrent retries.
- A completed cached success is not replayed after the document advances.
- Learner writing/editing/deleting/accepting is structurally absent from the WebMCP surface.
- Transfer closes coaching and proposal tools for every caller.
- Persisted state is validated deeply before restoration.
- Unsupported browsers get an honest human fallback, never a false connected badge.

## Current runtime evidence

`pnpm test:webmcp` drove the production build through real Chrome 151 WebMCP and confirmed:

- all six titles and annotations;
- two read-only tools;
- visible “6 page tools registered” status;
- line-2 first-break diagnosis;
- agent annotation;
- policy-gated proposal after genuine learner retries;
- learner acceptance;
- complete repaired practice round;
- generated unaided transfer round;
- sound and complete transfer check;
- bounded evidence read.
