export const meta = {
  name: 'mathburst-film-judge',
  description: 'Judge every distinct state frame of the film and return an actionable verdict',
  phases: [{ title: 'Judge' }, { title: 'Verdict' }],
}

// args: { round: number, dir: string, frames: [{file, at, shot, kind, label}] }
const ROUND = args?.round ?? 1
const DIR = args?.dir ?? 'C:/Jerry/Important/Coding/Mathos/mathos-webmcp/.worktrees/hackathon-build/.film/states'
const FRAMES = args?.frames ?? []

const BRIEF = `You are judging ONE frame from a hackathon submission film for Mathburst, a shared mathematical canvas where a student and an AI tutor work in the same document through WebMCP tools.

This is a SETTLED frame: the app has finished animating. Anything wrong here is wrong in the finished video.

The film is judged on execution and polish, so judge like someone looking for a reason to mark it down. But a false finding is worse than a missed one, because it sends a fix at something that is not broken. Only report what you can actually see.

REPORT:
1. Text clipped, truncated mid-word, or cut off by a panel or the frame edge.
2. Elements overlapping something they should not cover.
3. Content cut off by the edge of the frame that looks unintentional.
4. Panels or chrome covering the thing the frame is about.
5. Large dead or empty regions that make the frame look unfinished.
6. Misalignment, inconsistent spacing, or anything that reads as unpolished.

DO NOT REPORT (these are the design, not defects):
- The cream/paper background, the dotted canvas grid, or the handwriting style.
- The presence of floating panels, a left tool rail, or a header -- this is a canvas app.
- Purple as the tutor's colour and graphite as the learner's.
- A widget showing numbers you cannot verify. You are judging layout, not mathematics.

ALSO ANSWER: is any WebMCP evidence visible in this frame -- a tool count, a badge, a named tool call in the activity rail, or an agent-attributed edit? Answer only from what is on screen.`

phase('Judge')
const judged = await parallel(FRAMES.map((frame) => () =>
  agent(`${BRIEF}

FRAME: ${DIR}/${frame.file}
It is at ${frame.at}s, during the "${frame.shot}" shot.
What just happened: ${frame.kind === 'shot-begin' ? 'the shot just settled' : frame.kind === 'shot-end' ? 'the shot is about to end' : `${frame.kind} action -- ${frame.label}`}

Read the image and judge it.`, {
    label: `${frame.shot}@${frame.at}`,
    phase: 'Judge',
    model: 'sonnet',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string' },
        clean: { type: 'boolean' },
        webmcpVisible: { type: 'boolean' },
        webmcpEvidence: { type: 'string' },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['high', 'medium', 'low'] },
              where: { type: 'string' },
              what: { type: 'string' },
            },
            required: ['severity', 'where', 'what'],
            additionalProperties: false,
          },
        },
      },
      required: ['file', 'clean', 'webmcpVisible', 'webmcpEvidence', 'findings'],
      additionalProperties: false,
    },
  }).then((r) => ({ ...frame, ...(r || { clean: true, webmcpVisible: false, webmcpEvidence: '', findings: [] }) }))
))

const rows = judged.filter(Boolean)
const high = rows.flatMap((row) => (row.findings || []).filter((f) => f.severity === 'high').map((f) => ({ at: row.at, shot: row.shot, file: row.file, ...f })))
const medium = rows.flatMap((row) => (row.findings || []).filter((f) => f.severity === 'medium').map((f) => ({ at: row.at, shot: row.shot, file: row.file, ...f })))
const withMcp = rows.filter((row) => row.webmcpVisible).length

phase('Verdict')
const verdict = await agent(`You are the final judge on round ${ROUND} of a submission film.

${rows.length} settled frames were each reviewed independently. Here is what came back.

HIGH severity (${high.length}):
${high.map((f) => `- [${f.shot} @${f.at}s] ${f.where}: ${f.what}`).join('\n') || '(none)'}

MEDIUM severity (${medium.length}):
${medium.map((f) => `- [${f.shot} @${f.at}s] ${f.where}: ${f.what}`).join('\n') || '(none)'}

WebMCP evidence visible in ${withMcp} of ${rows.length} frames.
Frames judged fully clean: ${rows.filter((r) => r.clean).length}/${rows.length}.

Your job:
1. Group the findings by ROOT CAUSE, not by frame. Several frames reporting truncated text in the same panel are one bug, not five. Say how many distinct bugs there actually are.
2. Rank the root causes by how much they would cost the film with a judge scoring execution and polish.
3. For each, say the single cheapest change that would fix it.
4. Give a release verdict: is this film good enough to submit as it stands? Answer plainly, and say what the one thing is that most needs fixing.

Be concrete and short. No preamble.`, {
  label: 'verdict',
  phase: 'Verdict',
  model: 'sonnet',
  effort: 'high',
  schema: {
    type: 'object',
    properties: {
      distinctBugs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rootCause: { type: 'string' },
            affectedFrames: { type: 'number' },
            cost: { type: 'string', enum: ['severe', 'noticeable', 'minor'] },
            cheapestFix: { type: 'string' },
          },
          required: ['rootCause', 'affectedFrames', 'cost', 'cheapestFix'],
          additionalProperties: false,
        },
      },
      submittable: { type: 'boolean' },
      mostImportantThing: { type: 'string' },
      summary: { type: 'string' },
    },
    required: ['distinctBugs', 'submittable', 'mostImportantThing', 'summary'],
    additionalProperties: false,
  },
})

return {
  round: ROUND,
  framesJudged: rows.length,
  cleanFrames: rows.filter((r) => r.clean).length,
  webmcpVisibleFrames: withMcp,
  highCount: high.length,
  mediumCount: medium.length,
  verdict,
  high,
}
