import type { InspectorFieldSpec } from './types'

const statusLabels = {
  free: 'free',
  constrained: 'constrained',
  derived: 'derived',
  computed: 'computed',
} as const

export default function InspectorField({ label, value, status, detail, children }: InspectorFieldSpec) {
  return (
    <div className="inspector-field">
      <div className="inspector-field-label">
        <span>{label}</span>
        <span className={`inspector-status is-${status}`}>{statusLabels[status]}</span>
      </div>
      <div className="inspector-field-value">
        {children ?? <span className="inspector-value-text">{value}</span>}
        {detail && <small>{detail}</small>}
      </div>
    </div>
  )
}
