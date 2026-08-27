import { useState } from 'react'
import type { ToolDefinition } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'

/**
 * The Agent Console.
 *
 * The default judge browser has no WebMCP. The previous build's entire answer to that
 * was a 10px grey line in a corner saying agent tools were unavailable, which meant
 * the one thing this submission is about was invisible by default and announced only
 * as an absence.
 *
 * So this panel is a permanent product surface, rendered in every browser. It lists
 * the real tool objects, states the detection result verbatim, and lets anyone run a
 * tool through the *identical* execute path the agent uses - logged as
 * `local-inspector`, and labelled as not being an agent. Nothing is simulated.
 */

type Props = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  onRun: (toolName: string, argsJson: string) => Promise<string>
  revision: number
  suggestedLatex: string
}

const suggestedArgs = (suggestedLatex: string): Record<string, (revision: number) => string> => ({
  get_scratchpad: () => '{}',
  get_receipt: () => '{}',
  check_work: (r) => `{ "expectedRevision": ${r}, "requestId": "inspector-${r}" }`,
  annotate_step: (r) =>
    `{ "stepId": "step-1", "note": "Re-check this line against the premise.", "expectedRevision": ${r}, "requestId": "inspector-${r}" }`,
  propose_step: (r) =>
    JSON.stringify({
      stepId: 'step-1',
      latex: suggestedLatex,
      rationale: 'This is the derivative implied by the current premise.',
      expectedRevision: r,
      requestId: `inspector-${r}`,
    }),
  new_problem: (r) => `{ "expectedRevision": ${r}, "requestId": "inspector-${r}" }`,
})

function StatusLine({ status }: { status: RegistrationStatus }) {
  if (status.state === 'live') {
    return (
      <p className="console-status console-live">
        <span className="dot" aria-hidden="true" />
        {status.registered} tools registered with this tab
      </p>
    )
  }
  if (status.state === 'partial') {
    return (
      <p className="console-status console-warn">
        <span className="dot" aria-hidden="true" />
        {status.registered} of {status.total} tools registered. Failed: {status.failures.join(', ')}
      </p>
    )
  }
  if (status.state === 'failed') {
    return (
      <p className="console-status console-warn">
        <span className="dot" aria-hidden="true" />
        {status.detail}
      </p>
    )
  }
  return (
    <p className="console-status console-idle">
      <span className="dot" aria-hidden="true" />
      WebMCP unavailable in this browser
    </p>
  )
}

export default function AgentConsole({ status, tools, onRun, revision, suggestedLatex }: Props) {
  const suggested = suggestedArgs(suggestedLatex)
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [args, setArgs] = useState<string>('')
  const [output, setOutput] = useState<{ tool: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const connected = status.state === 'live' || status.state === 'partial'

  async function run(name: string) {
    setBusy(true)
    try {
      const text = await onRun(name, args || (suggested[name]?.(revision) ?? '{}'))
      setOutput({ tool: name, text })
    } finally {
      setBusy(false)
    }
  }

  function toggle(name: string) {
    if (openTool === name) {
      setOpenTool(null)
      return
    }
    setOpenTool(name)
    setArgs(suggested[name]?.(revision) ?? '{}')
  }

  return (
    <section className="agent-console" aria-labelledby="console-heading">
      <p className="kicker" id="console-heading">
        Page capability
      </p>
      <hr className="rule" />
      <StatusLine status={status} />
      <p className="capability-thesis">
        The agent can read this live proof and ask the page to check it. The page&rsquo;s algebra
        engine owns every verdict; the model cannot turn a wrong line green.
      </p>

      <details className="capability-inspector">
        <summary>Inspect {tools.length} page capabilities</summary>
        <p className="inspector-intro">
          These are the exact site tools registered with a supported browser. The local runner
          below uses the same handlers; it is an inspector, not a simulated agent.
        </p>
        <ul className="console-tools">
          {tools.map((tool) => {
            const open = openTool === tool.name
            const bodyId = `tool-body-${tool.name}`
            return (
              <li key={tool.name} className={open ? 'is-open' : undefined}>
                <button
                  type="button"
                  className="console-tool-head"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() => toggle(tool.name)}
                >
                  <span className="console-tool-name">{tool.name}</span>
                  <span className={tool.annotations.readOnlyHint ? 'tag tag-read' : 'tag tag-write'}>
                    {tool.annotations.readOnlyHint ? 'read' : 'write'}
                  </span>
                </button>
                {open && (
                  <div className="console-tool-body" id={bodyId}>
                    <p className="console-tool-desc">{tool.description}</p>
                    <label className="console-args-label" htmlFor={`args-${tool.name}`}>
                      Arguments
                    </label>
                    <textarea
                      id={`args-${tool.name}`}
                      className="console-args"
                      rows={3}
                      spellCheck={false}
                      value={args}
                      onChange={(event) => setArgs(event.target.value)}
                    />
                    <button type="button" className="button button-sm" disabled={busy} onClick={() => run(tool.name)}>
                      {busy ? 'Running' : 'Run locally'}
                    </button>
                    <p className="console-hint">
                      Recorded as <code>local-inspector</code>, never as an agent.
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {output && (
          <div className="console-output">
            <p className="console-output-head">
              <code>{output.tool}</code> returned
            </p>
            <pre>{output.text}</pre>
          </div>
        )}

        {!connected && (
          <div className="console-connect">
            <p className="console-connect-head">Test with a real agent</p>
            {status.state === 'unsupported' && (
              <p className="console-hint">Detected: {status.detail}</p>
            )}
            <ul>
              <li>
                ChatGPT Desktop&rsquo;s built-in browser with a supported account and model.
              </li>
              <li>
                Chrome 149 or later with <code>chrome://flags/#enable-webmcp-testing</code> enabled.
              </li>
            </ul>
          </div>
        )}
      </details>
    </section>
  )
}
