import type { Activity } from '../domain/session/types'
import { actorLabel } from './proofPresentation'

/**
 * The append-only activity history.
 *
 * The page tools and the local inspector used to live here too, behind this
 * disclosure. They moved to the margin column, where they are a permanent
 * surface in every browser (10 section 4.2). What remains is the audit trail,
 * which is genuinely secondary: it records what already happened, and the
 * learner reads the outcome in the work column, not here.
 */

type Props = {
  activities: Activity[]
}

export default function SessionDetails({ activities }: Props) {
  return (
    <details className="session-details">
      <summary>
        Activity history{' '}
        <span className="session-details-status">
          · {activities.length === 0 ? 'nothing yet' : `${activities.length} recorded`}
        </span>
        <span className="session-details-marker" aria-hidden="true">
          <span className="session-details-marker-closed">+</span>
          <span className="session-details-marker-open">−</span>
        </span>
      </summary>
      <div className="session-details-body">
        <section className="activity" aria-labelledby="activity-heading">
          <h2 id="activity-heading">Every action, in order</h2>
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
