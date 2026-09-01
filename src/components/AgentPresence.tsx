import type { AgentPresenceState } from '../domain/world/types'

export default function AgentPresence({ presence }: { presence: AgentPresenceState }) {
  if (!presence.visible) return null
  return (
    <div
      className="agent-presence"
      style={{ transform: `translate(${presence.x}px, ${presence.y}px)` }}
      aria-live="polite"
    >
      <svg viewBox="0 0 28 34" aria-hidden="true">
        <path d="M2 2L24 19L14 21L9 31Z" />
      </svg>
      <div>
        <b>{presence.label}</b>
        <span>{presence.action}</span>
      </div>
    </div>
  )
}
