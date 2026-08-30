import { useEffect, useMemo, useRef, useState } from 'react'
import type { ToolDefinition } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import type { PlatformFeature } from '../domain/tools/platform'
import { groupTools } from '../domain/tools/groups'
import {
  registrationAllowsDirectCalls,
  registrationRecovery,
  registrationStatusLabel,
} from './proofPresentation'
import { suggestedInspectorArgs } from './inspectorPresentation'
import type { ProposalSeed } from './inspectorPresentation'

/** The exact page-tool inspector, including its truthful no-WebMCP recovery path. */

type Props = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  onRun: (toolName: string, argsJson: string) => Promise<string>
  revision: number
  proposalSeed: ProposalSeed | null
  platform: PlatformFeature[]
  onProbePlatform: () => Promise<void>
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

export default function AgentConsole({ status, tools, onRun, revision, proposalSeed, platform, onProbePlatform }: Props) {
  const suggested = useMemo(() => suggestedInspectorArgs(proposalSeed), [proposalSeed])
  const [openTool, setOpenTool] = useState<string | null>(null)
  // Groups start closed. Eighteen names cannot fit the first viewport, but six group
  // labels and their counts can, so what a reader sees without acting is the shape of
  // the surface and its size rather than an arbitrary first screenful of it.
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [args, setArgs] = useState<string>('')
  const [output, setOutput] = useState<{ tool: string; text: string; runId: number } | null>(null)
  // Every run is its own event, even when it returns the same bytes.
  const runCount = useRef(0)
  const [busy, setBusy] = useState(false)

  const connected = registrationAllowsDirectCalls(status)
  const partialRecovery = registrationRecovery(status)
  const checking =
    status.state === 'unsupported' && status.detail.startsWith('Checking')

  const proposalSeedKey = proposalSeed
    ? proposalSeed.stepId
    : 'redacted'

  useEffect(() => {
    if (openTool === 'propose_step') {
      setArgs(suggested.propose_step(revision))
    }
  }, [openTool, proposalSeedKey, revision, suggested])

  async function run(name: string) {
    setBusy(true)
    try {
      const text = await onRun(name, args || (suggested[name]?.(revision) ?? '{}'))
      runCount.current += 1
      setOutput({ tool: name, text, runId: runCount.current })
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
      {/* The header already carries registration state. Repeating it verbatim
          here made the same six words appear twice on one screen. Only a
          partial or failed registration says anything the header does not,
          so only those speak. */}
      {(status.state === 'partial' || status.state === 'failed') && (
        <StatusLine status={status} />
      )}
      {partialRecovery && <p className="console-hint">{partialRecovery}</p>}
      {/* When the browser cannot run the tools, the remedy belongs beside the
          problem. The header states "WebMCP unavailable" at the top of the page,
          and this block used to sit below the entire tool list - so a reader in an
          unflagged browser met the diagnosis and had to go looking for the fix. */}
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
      <ul className="console-groups">
        {groupTools(tools).groups.map(({ group, tools: members }) => {
          const groupOpen = openGroup === group.id
          const listId = `group-body-${group.id}`
          return (
            <li key={group.id} className={groupOpen ? 'is-open' : undefined}>
              <button
                type="button"
                className="console-group-head"
                aria-expanded={groupOpen}
                aria-controls={listId}
                onClick={() => setOpenGroup(groupOpen ? null : group.id)}
              >
                <span className="console-group-label">{group.label}</span>
                <span className="console-group-purpose">{group.purpose}</span>
                <span className="console-group-count">{members.length}</span>
              </button>
              {groupOpen && (
                <ul className="console-tools" id={listId}>
                  {members.map((tool) => {
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
                            <button
                              type="button"
                              className="button button-sm"
                              disabled={busy}
                              onClick={() => run(tool.name)}
                            >
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
              )}
            </li>
          )
        })}
      </ul>


      {output && (
        /* Keyed on the run, not the returned text. Keying on the text looked
           right and failed the case that matters: running get_scratchpad twice
           on unchanged state returns identical bytes, so React reused the node
           and the second click produced no motion at all. A run is an event
           whether or not the answer changed. */
        <div className="console-output" key={output.runId}>
          <p className="console-output-head">
            <code>{output.tool}</code> returned
          </p>
          <pre>{output.text}</pre>
        </div>
      )}

      {platform.length > 0 && (
        <div className="console-platform">
          <p className="console-platform-head">Platform, as this browser answered it</p>
          <button type="button" className="button-text" onClick={() => void onProbePlatform()}>
            Probe this browser
          </button>
          {platform.every((feature) => !feature.detail) && (
            <p className="console-platform-note">Nothing is claimed here until it has been executed.</p>
          )}
          <ul>
            {platform.map((feature) => (
              <li key={feature.id}>
                <span className="platform-label">{feature.label}</span>
                <span className={`platform-status platform-${feature.status}`}>{feature.status}</span>
                {feature.detail && <span className="platform-detail">{feature.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
