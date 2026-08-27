import type { Activity } from '../domain/session/types'
import type { ToolDefinition } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import AgentConsole from './AgentConsole'
import { actorLabel } from './proofPresentation'

type Props = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  onRun: (toolName: string, argsJson: string) => Promise<string>
  revision: number
  suggestedLatex: string
  activities: Activity[]
}

function connectionLabel(status: RegistrationStatus): string {
  switch (status.state) {
    case 'live':
      return `${status.registered} page tools available`
    case 'partial':
      return `${status.registered} of ${status.total} page tools available`
    case 'failed':
      return 'Page tool registration failed'
    case 'unsupported':
      return status.detail.startsWith('Checking')
        ? 'Checking page tool availability'
        : 'WebMCP unavailable'
  }
}

export default function SessionDetails({
  status,
  tools,
  onRun,
  revision,
  suggestedLatex,
  activities,
}: Props) {
  return (
    <details className="session-details">
      <summary>
        Session details <span>· {connectionLabel(status)}</span>
      </summary>
      <div className="session-details-body">
        <p className="session-details-intro">
          The exact page tools, local inspector, and activity history are verification detail for
          this session.
        </p>
        <AgentConsole
          status={status}
          tools={tools}
          onRun={onRun}
          revision={revision}
          suggestedLatex={suggestedLatex}
        />

        <section className="activity" aria-labelledby="activity-heading">
          <h2 id="activity-heading">Activity history</h2>
          {activities.length === 0 ? (
            <p className="activity-empty">No actions recorded yet.</p>
          ) : (
            <ol>
              {activities.map((activity) => (
                <li key={activity.id}>
                  <span className={`activity-source source-${activity.source}`}>
                    {actorLabel(activity.source)}
                  </span>
                  <span className="activity-action">{activity.action}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </details>
  )
}
