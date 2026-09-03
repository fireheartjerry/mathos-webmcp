# Devpost copy — round log

Criteria: `docs/criteria/devpost-copy-criteria.json` (10 weighted criteria, 5 gates).
**Status: DERIVED, not user-approved.** Built by four agents from the Devpost judging
page, the WebMCP challenge rules, and the author's stated voice rules.

Scorer, pinned for every round: `codex exec --skip-git-repo-check` reading
`.film/review/scorer-brief.md`, run from the worktree root.

| Round | Score | Gates failing |
|---|---|---|
| 0 (baseline) | 68/100 | tbd, contradiction, long-sentence |
| 1 | 72/100 | tbd, contradiction, long-sentence |
| 2 | 71/100 | tbd |
| 3 | 98/100 | tbd (video URL, blocked on upload) |
| 3b (re-score of shipped text) | 98/100 | tbd (video URL, blocked on upload) |

---

## Round 3 — score 71 -> 98 (+27)
**Reviewers:** `codex exec`, `kimi -p`, and a fresh-context Claude subagent, all
criteria-aware and all pointed at the three criteria that had scored worst.
**Accepted:** 19 · **Rejected:** 2 · **Deferred:** 1

Round 2 scored *below* round 1, and the per-criterion breakdown said why: three
criteria were losing 32 of the 100 points on rules that are mechanical rather than
matters of taste. `sentence_mechanics` (16) mandates a zero for any paragraph that is
majority stative verbs. `section_pull` (6) wants each section to end on something the
next one resolves. `tool_count_audited` (10) wants every "48" backed in its own
paragraph. So round 3 attacked those first, then handed the result to three
independent reviewers with instructions to falsify every number in it.

### Changes

Structural, aimed at the three failing criteria:

- Rewrote every majority-stative paragraph into active verbs → targets C6
- Added an **Accomplishments** section, which the rubric samples and the draft did
  not have → targets C8
- Gave all six sampled sections an ending the next section pays off → targets C8
- Reduced "48" to four occurrences, each in a paragraph carrying the three-way
  split or the `docs/WEBMCP_TOOLS.md` pointer → targets C5
- Split the six longest sentences; 94.2% now sit at or under 20 words → targets C6

Factual, all found by the reviewers and all verified against the source before
acting:

- **MathLive removed** from the prose and the tag list. It is not a dependency and
  not imported anywhere. Editing runs through our own `EquationEditor` and
  `SymbolPalette`, with KaTeX rendering and Cortex evaluating.
- **`set_matrix_cells` moved off the attention head.** The tool requires kind
  `matrix` (`parity.ts:484`); the attention card is kind `attention`. The copy's
  own centrepiece walkthrough would have thrown in the inspector it advertises.
- **The retraction anecdote ran backwards.** `docs/video/PRODUCT_REHEARSAL.md:125`
  records correcting 18 to 48, not 48 to 18. Replaced with the real correction
  found this session: the closing narration claimed every edit went through a
  tool, while the timeline records 27 tutor and 11 student commits.
- **"no write tool touches the student's strokes" deleted.** `erase_ink` takes a
  region and its `own` filter is optional; no author guard exists anywhere. That
  sentence was a mechanism invented to satisfy C4, which is the exact failure this
  loop is supposed to catch.
- **Activity rail corrected.** It renders the summary and Tutor/You; tool names
  live in the ledger.
- **Subjects corrected** to the four the product actually ships, and **persistence
  moved out of "what is next"** because `persistence.ts` already saves to
  localStorage.
- Split corrected to **12 read-only / 28 committing / 8 outside the history**.

### Product bug found by resolving a reviewer disagreement

Codex said `focus_objects` commits to history; the Claude reviewer quoted the
tool's own description saying it does not. Both were reporting honestly and the
code settles it: `run` (`MathburstWorkspace.tsx:608`) drops select- and
viewport-only actions from history on the human path, and the agent path applied
no such filter. So a tutor's pan was undoable while a student's identical pan was
not, `focus_objects`' description was false, and a framing shot could intercept
the undo meant for the edit it introduced. The agent path now applies the same
filter.

### Rejected findings

- "Keep `48` out of every paragraph that lacks a breakdown" (codex) — rejected in
  part. Two of the four occurrences sit beside the pointer rather than the
  breakdown, which the criterion accepts as an alternative.
- "Name the 48-to-18 number in the Challenges section" (codex) — rejected. It is
  the section's hand-off, and naming it there leaves the next section with nothing
  to pay off. The anecdote itself was replaced for a different reason.

### Deferred

- No hosted build URL in **Try it out**, only the repo. The copy invites a judge to
  open the inspector and run any tool, which a repo link does not let them do. The
  deploy plumbing exists in `package.json`; needs the author to confirm the URL.


## Stopping here

Target was 95. Two independent Codex runs, the second against the exact text that
ships, both returned **98/100**. Nine of the ten criteria score full marks.

The remaining 2 points sit in `sentence_mechanics`, where the scorer counts
`belongs`, `needed`, `carry`, `knows`, `sum` and `covers` as stative verbs. Those
are lexical verbs, not copulas, and rewriting around them makes the prose worse
rather than better. Both runs flagged the same two short paragraphs, so this is a
stable reading of the rubric rather than noise, and it is not worth another round.

`tbd_field_gate` still FAILS on the video URL. That is blocked on the YouTube
upload, not on the writing, and it clears the moment the link exists.

Per-criterion, final run:

| # | Criterion | Score |
|---|---|---|
| C1 | Cold-open and comprehension specificity | 12/12 |
| C2 | Facts outrank adjectives | 16/16 |
| C3 | Self-correction as credibility | 10/10 |
| C4 | Capability claims paired with mechanisms | 12/12 |
| C5 | The 48-tool count is audited | 10/10 |
| C6 | Sentence mechanics | 14/16 |
| C7 | Hackathon-cliche absence | 6/6 |
| C8 | Section-to-section pull | 6/6 |
| C9 | Tutor/student boundary and audience honesty | 6/6 |
| C10 | WebMCP API named in a technical claim | 6/6 |
