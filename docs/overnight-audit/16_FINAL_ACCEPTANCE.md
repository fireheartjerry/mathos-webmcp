# 16 — Final Acceptance

## 2026-08-27 frontier-rescue verdict

**NOT SUBMISSION READY.**

The current code is a release candidate: 178 tests, type checks and build pass; the human fallback
journey passes; Chrome 151 registers all six real WebMCP tools and completes the full production
journey; accessibility and performance gates pass. The remaining blockers are external submission
work:

1. publish the current branch to the authorized public repository;
2. publish and verify a stable working URL;
3. replace the README deployment placeholder;
4. record the 1:50–2:00 product-first demo video;
5. run ChatGPT Desktop Site Tools against the public URL if an eligible client/account is
   available, recording exact client/model/date/outcome.

No deployment, push, or client-compatibility result was fabricated during this rescue.

Prompt-pack closure, archive integrity, exact artifact mapping, fresh runtime results, and the
remaining authorization boundary are recorded in
[`22_PROMPT_PACK_EXECUTION_MATRIX.md`](./22_PROMPT_PACK_EXECUTION_MATRIX.md). The authoritative
visual proof is [`AI_SLOP_FINAL_SCREENSHOT_AUDIT.md`](./AI_SLOP_FINAL_SCREENSHOT_AUDIT.md).

> The remainder of this file is the retained 2026-08-26 acceptance record. Where its build counts,
> blocker count or runtime details differ, the 2026-08-27 verdict above is authoritative.

Written 2026-08-27. This answers the acceptance questions directly, with evidence, and
says plainly what is not done.

---

## The short answer

**The product was rebuilt, not repaired.** The concept, the mathematics, the interface,
the WebMCP layer, the landing page and the documentation are all new. What survived from
the previous build is the architectural kernel — one shared transition function,
monotonic revisions, `expectedRevision`, `requestId` idempotency, the commit barrier, and
the activity log — because the audit found those were genuinely right.

**It is not submission-ready yet.** One thing stands between here and submittable, and it
is not an engineering problem: the application source has never been pushed. That is
§"What remains blocking".

---

## Question by question

### Is the complete product implemented?

Yes. The canonical journey runs end to end, verified in a browser rather than inferred
from tests: write a derivation → the page marks the **first** line that stopped being
true → rewrite that line → check again → take a freshly generated problem unaided →
receive an evidence surface that states its own limits.

### Does real WebMCP work?

Yes, and this was verified by execution, not by reading the specification. All six tools
were registered and invoked in **Chrome 151.0.7922.174** with `--enable-features=WebMCPTesting`,
through `executeTool(toolObject, '<json string>')`. Full transcript in `14`.

This matters more than it sounds, because the *previous* build's WebMCP layer **could not
execute at all**. Chrome calls `execute` with exactly one argument; every handler opened
with `context.signal?.aborted` and threw a `TypeError` on every call — while the header
displayed "5 agent tools live". A judge who enabled WebMCP would have found the entire
submission dead beneath a badge claiming it worked. Nothing short of live testing would
have caught it.

Confirmed live: registration, all six schemas and annotations, the read/write split,
every error code with its `recovery` string intact, idempotency, no thrown errors across
a 24-call sweep, survival across the back-forward cache, and `localStorage` restore.
Latency p50: reads 0.2 ms, `check_work` 13.5 ms.

### Does the canonical journey pass?

Yes. Measured in the running app: line 1 `equals` (anchored to the problem statement),
line 2 `differentiates`, line 3 `not equivalent` with *"Short of the derivative by 24x+2"*,
line 4 dimmed as `after the first break`. After the repair: `equals` /
`differentiates` / `evaluates`, and *"Every line follows, and the last one is the answer
this problem asked for."*

### Does the human fallback work?

Yes, and it is a designed surface rather than an apology. In a browser without WebMCP the
**Agent Console** still lists all six real tools with their schemas and annotations, and
each has a Run control that invokes the **identical** `execute` path, logged as
`local-inspector` and labelled as not being an agent. Nothing is simulated. The previous
build's entire answer to this case was a 10 px grey line in a corner.

### Does the interface meet the design target?

The four deletions that carried most of the improvement — **no serif, no `box-shadow`, no
green buttons, no rust type** — are done, on tokens measured from both references.
Verified in the running page: Archivo, display type at weight 300, UI type at 600,
hairline separation, KaTeX-typeset mathematics, and **zero third-party requests**.

The mechanical score is in `13`. The gate is ≥36/40.

| Stage | Score |
| --- | --- |
| The build inherited at the start of the night | **19 / 40** |
| First audit after the redesign | **29 / 40** |
| After repair | **37 / 40** |
| After the final pass on rules 6, 26 and 32 | measured clean; see below |

The three rules that survived the 37/40 re-score were then closed: contrast failures on
`/learn` went from 27 pairs to 2, and both remaining are *disabled controls*, which
WCAG 1.4.3 explicitly exempts — raised from 2.23:1 to 2.98:1 regardless, because
"Check my work" is disabled on first paint and should still be readable. The empty regions
went from 480×410 and 880×730 to 260 and 60, against a 400 px threshold. Every text field
now defines hover, focus, active and disabled.

The auditor's note on the thinnest pass is worth keeping: rule 9 (chromatic colour under
5% of painted elements) passes at 4.73% **by area** but sits at 9.6% **by element count**.
The rule says area. It is a pass, and it is close.

### Is it free of AI-slop patterns?

The research finding that decided the visual direction is worth restating, because it
inverted the brief: **cream ground + serif display + sage green is the single loudest
generated-design signal of 2026, ranked above AI purple** — and that was precisely the
previous palette. The build was not "not slop yet"; it was 2026-flavoured slop. That is
why the redesign was a palette and typeface replacement rather than a polish pass.

### Are the tests green?

**154 passing**, `astro check` reports **0 errors, 0 warnings**. The suite is
adversarial rather than descriptive: hostile-input tests asserting no handler throws or
returns `undefined`; the collision guard exercised over 250 generated seeds; diagnosis
transfer over 60 unseen instances; and a test that the misconception case returns
`mismatch` rather than `uncertain`, which is the exact bug the first oracle design had.

### Is the verifier trustworthy inside its claimed bounds?

Yes, and the bound is stated: derivatives of polynomial expressions evaluated at a point,
and algebraic rewriting.

The design is deliberately asymmetric, because building it disproved the symmetric design
the audit had specified. `isEqual('9x^2+2x', '9x^2')` returns `undefined`, not `false` —
the engine cannot disprove symbolic inequality, which is exactly the misconception we most
need to catch. So a verified numeric counterexample establishes `mismatch` on its own,
while equality requires both routes and is described as "consistent with equivalence",
never as proof. Everything else returns `uncertain`, which is a visible state.

The independent route earns its place: it caught the engine claiming `\sqrt{x^2} = x`,
which is false for every negative x.

Hostile QA reported fifteen unusual correct forms accepted, seven wrong-but-plausible
lines caught and named, fourteen abusive inputs each rejected with a specific code and no
thrown exception, and no case where a wrong line was called right or a right line wrong.

### Are the public claims defensible?

The claim boundary is enforced in the product, not only in the README. The product says
*checked*, *equivalent*, *not equivalent*, *could not determine*, *unaided in this
session*. It does not say *proved*, *mastered*, *understands*, or *guaranteed*.

Two claims were withdrawn during the night because the sources did not support them: no
App Store rating, no funding figure, no university partners. **Y Combinator W24** and
**Forbes 30 Under 30** are what remains, and the marketing line in the README's technical
section is deleted.

One correctness hole in this area was found late by hostile QA and fixed: a derivation
could be internally consistent and about a completely unrelated expression, and still earn
"every line follows". The problem statement is now line zero, and the report distinguishes
`allSound` from `reachesAnswer`. The receipt requires both.

### Is the Mathos integration truthfully represented?

The Mathos video is no longer on the judged path at all, so there is nothing to
misrepresent. `PROVENANCE.md` records the challenge-period boundary, the concept change
rather than erasing it, and the new dependencies.

The **plain-HTTP bare-IP proxy to internal infrastructure** that both `vercel.json` and
`astro.config.mjs` carried is removed, and the address is redacted from the audit prose as
well. The retired plan documents were deleted rather than left to contradict the frozen
spec.

---

## What remains blocking

**1. The application source has never been published.** `origin/main` contains
documentation and no product. Everything built tonight lives on the local
`hackathon-build` branch. The competition requires a public repository with a
GitHub-detected licence. `LICENSE` (MIT) is written and the tree is clean of secrets — I
scanned it — but **pushing is the owner's decision and I have not taken it.**

**2. The deployment is still named `hackathon-build-eta.vercel.app`**, which reads as a
hackathon artifact rather than a Mathos product. Cheap to change, and it is the first
thing a judge sees.

**3. The demo video does not exist.** `docs/DEMO_SCRIPT.md` is a shot-by-shot storyboard
for a sub-3-minute recording; the existing `mathos-webmcp-demo-draft.mp4` is a narrated
still-capture of the *retired* product and must not be submitted.

---

## Not blocking, but honest

- **`new_problem` has the weakest page-native claim of the six tools.** A server could
  generate a problem. It earns its slot because it is what retires "this is hardcoded",
  and the README says so rather than dressing it up.
- **One problem family.** 160 generated instances of one template, with four fixed
  teaching sentences. Honest, and thin. A second family is the highest-value next
  addition.
- **The domain is narrow** and both the README and the product say so.
- **The origin trial token was never registered.** It would remove the `chrome://flags`
  step for stock Chrome, which is the single biggest obstacle between a judge and a
  working demonstration. Nothing depends on it.
- **MathLive is not used.** The learner types LaTeX, re-rendered through KaTeX. A real
  math editor is a v2 claim, not a v1 one.

---

## The verdict

The engineering is done and it is defensible. The submission is not blocked on code; it is
blocked on three decisions that belong to the owner — publish, rename, record.

The one thing I would not change if I had the night again is the decision to test against
the shipped browser rather than the specification. Every other finding tonight was a
quality improvement. That one was the difference between a working submission and a broken
one presented as working.
