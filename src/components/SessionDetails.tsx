import type { Activity } from '../domain/session/types'
import type { ToolDefinition } from '../domain/tools/definitions'
import type { RegistrationStatus } from '../domain/tools/registry'
import AgentConsole from './AgentConsole'
import { actorLabel, registrationStatusLabel } from './proofPresentation'
import type { ProposalSeed } from './inspectorPresentation'

type Props = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  onRun: (toolName: string, argsJson: string) => Promise<string>
  revision: number
  proposalSeed: ProposalSeed | null
  activities: Activity[]
}

export default function SessionDetails({
  status,
  tools,
  onRun,
  revision,
  proposalSeed,
  activities,
}: Props) {
  return (
    <details className="session-details">
      <summary>
        Session details{' '}
        <span className="session-details-status">· {registrationStatusLabel(status)}</span>
        <span className="session-details-marker" aria-hidden="true">
          <span className="session-details-marker-closed">+</span>
          <span className="session-details-marker-open">−</span>
        </span>
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
          proposalSeed={proposalSeed}
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
