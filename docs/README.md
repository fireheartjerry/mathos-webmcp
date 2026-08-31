# What is in `docs/`

Two kinds of document live here, and it matters which you are reading.

**Current** — describes the product as it is now. If one of these disagrees with the
code, that is a bug and worth reporting.

**Point-in-time record** — describes the product as it was on a given date, usually
alongside the reasoning for changing it. These are *deliberately not updated*. An audit
that gets quietly rewritten every time its findings are addressed is not an audit, and a
changelog that only ever describes the present is not a changelog.

Two redactions were made to those records before this repository went public, and neither
touches a finding. One row of a workspace map named two sibling checkouts of Mathos' own
private monorepo and said they hold live credentials — true, unrelated to this submission,
and not something to publish the location of. And several reproduction commands hard-coded
a local Windows user profile path, now `%TEMP%`. Both are marked where they occur.

So several older documents here say the surface has **six tools**, or quote the page
telling an agent *"Only the learner can write, edit, delete, or accept work."* Both were
true when written. Neither is true now: the surface is eighteen tools, and that refusal
was withdrawn and replaced by attribution. The reasoning for the change is in the record
that still carries the old claim — which is the point of keeping it.

---

## Current

| Document | What it is |
|---|---|
| [`SUBMISSION.md`](SUBMISSION.md) | Readiness against the challenge rules, checked line by line, with what is done and what is not. |
| [`DEVPOST_FORM.md`](DEVPOST_FORM.md) | Every submission field, written out. |
| [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | How the demo video is built, and the narration. |
| [`narration.json`](narration.json) | The spoken track, beat-aligned to the video. |
| [`video/`](video/) | The finished 2:44 walkthrough. |
| [`webmcp/capabilities.md`](webmcp/capabilities.md) | The eighteen capabilities, each cited to a file and line. A test checks every citation. |
| [`webmcp/ceiling.md`](webmcp/ceiling.md) | How many tools Chrome will actually take, measured. |
| [`webmcp/platform.md`](webmcp/platform.md) | What Chrome 151 does with seven WebMCP features, executed rather than assumed. |
| [`webmcp/evidence-round4.md`](webmcp/evidence-round4.md) | The most recent full evidence pack. |
| [`webmcp/transcripts/round4-blind-agent.md`](webmcp/transcripts/round4-blind-agent.md) | An agent that saw only `getTools()` finishing a problem, call by call. |
| [`criteria/webmcp-criteria.md`](criteria/webmcp-criteria.md) | The rubric this work was scored against, and the score log. |
| [`criteria/webmcp-rounds.md`](criteria/webmcp-rounds.md) | Each scoring round, including what the scorer caught us getting wrong. |

## Point-in-time records

| Directory | Date | What it captures |
|---|---|---|
| [`overnight-audit/`](overnight-audit/) | 2026-08-26 → 27 | A hostile audit of the previous build, the research behind the rebuild, and the live Chrome 151 findings that the tool layer is written against. Contains the original six-tool surface. |
| [`anti-slop-reaudit-2026-08-27/`](anti-slop-reaudit-2026-08-27/) | 2026-08-27 | A second pass over the visual design, with before-and-after screenshots. |
| [`superpowers/plans/`](superpowers/plans/) | various | Implementation plans, kept so the sequence of decisions is inspectable. |
| [`webmcp/evidence-round0.md`](webmcp/evidence-round0.md) … `round3` | 2026-08-30 | Earlier evidence packs. Round 0 records a build in which five of six tool calls failed because no tool could create a step. |

## The short version of what changed

- **Six tools → eighteen**, one per capability the reducer supports.
- **The write refusal was withdrawn.** Agents may do anything a learner can; what carries
  the claim now is attribution, and the receipt publishes the split.
- **One problem family → four**: product rule, chain rule, quotient rule, and the chain
  rule through a sine.
- **Platform claims are all executed.** Nothing reports `supported` without having run.

If you want the shortest honest tour, read [`../README.md`](../README.md) and then
[`webmcp/platform.md`](webmcp/platform.md) — the second one is where the project says what
the browser does *not* do.
