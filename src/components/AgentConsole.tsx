import { useEffect, useMemo, useState } from 'react'
import type { ToolDefinition } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import { registrationStatusLabel } from './proofPresentation'
import { suggestedInspectorArgs } from './inspectorPresentation'
import type { ProposalSeed } from './inspectorPresentation'

/** The exact page-tool inspector, including its truthful no-WebMCP recovery path. */

type Props = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  onRun: (toolName: string, argsJson: string) => Promise<string>
  revision: number
  proposalSeed: ProposalSeed | null
}

function StatusLine({ status }: { status: RegistrationStatus }) {
  if (status.state === 'live') {
    return (
      <p className="console-status console-live">
        <span className="dot" aria-hidden="true" />
        {registrationStatusLabel(status)}
      </p>
    )
  }
  if (status.state === 'partial') {
    return (
      <p className="console-status console-warn">
        <span className="dot" aria-hidden="true" />
        {registrationStatusLabel(status)}. Failed: {status.failures.join(', ')}
      </p>
    )
  }
  if (status.state === 'failed') {
    return (
      <p className="console-status console-warn">
        <span className="dot" aria-hidden="true" />
        {registrationStatusLabel(status)}. {status.detail}
      </p>
    )
  }
  return (
    <p className="console-status console-idle">
      <span className="dot" aria-hidden="true" />
      {registrationStatusLabel(status)}
    </p>
  )
}

export default function AgentConsole({ status, tools, onRun, revision, proposalSeed }: Props) {
  const suggested = useMemo(() => suggestedInspectorArgs(proposalSeed), [proposalSeed])
  const [openTool, setOpenTool] = useState<string | null>(null)
  const [args, setArgs] = useState<string>('')
  const [output, setOutput] = useState<{ tool: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const connected = status.state === 'live' || status.state === 'partial'
  const checking =
    status.state === 'unsupported' && status.detail.startsWith('Checking')

  const proposalSeedKey = proposalSeed
    ? `${proposalSeed.stepId}:${proposalSeed.latex}`
    : 'redacted'

  useEffect(() => {
    if (openTool === 'propose_step') {
      setArgs(suggested.propose_step(revision))
    }
  }, [proposalSeedKey])

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
    <div className="agent-console">
      <StatusLine status={status} />
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
                <span className="tool-access">
                  {tool.annotations.readOnlyHint ? 'Read only' : 'May change this session'}
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

      {!connected && !checking && (
        <div className="console-connect">
          <p className="console-connect-head">Test with a real agent</p>
          {status.state === 'unsupported' && (
            <p className="console-hint">Detected: {status.detail}</p>
          )}
          <ul>
            <li>ChatGPT Desktop&rsquo;s built-in browser with a supported account and model.</li>
            <li>
              Chrome 149 or later with <code>chrome://flags/#enable-webmcp-testing</code> enabled.
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
