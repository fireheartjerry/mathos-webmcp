import { cueRestObjectIds } from '../domain/demo/cues'
import type { DemoCueId } from '../domain/demo/shotContract'
import { DIRECTOR_SHOTS } from '../domain/world/director'
import type { DirectorReviewState, DirectorShot } from '../domain/world/director'
import type { WorldState } from '../domain/world/types'

function shotStatus(shot: DirectorShot, approved: boolean, availableObjectIds: Set<string>) {
  if (shot.status === 'planned') return 'planned'
  if (shot.editable.some((target) => !availableObjectIds.has(target.id))) return 'setup'
  return approved ? 'approved' : 'ready'
}

function statusLabel(status: string) {
  return status === 'approved' ? 'Approved' : status === 'ready' ? 'Ready' : status === 'setup' ? 'Needs state' : 'Planned'
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const paths = {
    up: 'M12 19V5m0 0-5 5m5-5 5 5',
    down: 'M12 5v14m0 0 5-5m-5 5-5-5',
    left: 'M19 12H5m0 0 5-5m-5 5 5 5',
    right: 'M5 12h14m0 0-5-5m5 5-5 5',
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[direction]} /></svg>
}

function ZoomIcon({ direction }: { direction: 'in' | 'out' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d={direction === 'in' ? 'M10.8 7.5v6.6M7.5 10.8h6.6M15.7 15.7 21 21' : 'M7.5 10.8h6.6M15.7 15.7 21 21'} />
    </svg>
  )
}

export default function DirectorReviewPanel({
  state,
  activeShot,
  controlsHidden,
  availableObjectIds,
  selectedObjectIds,
  cueRunning,
  world,
  onClose,
  onToggleControls,
  onSelectShot,
  onSelectObject,
  onNudgeCamera,
  onZoomCamera,
  onResetShot,
  onApproveShot,
  onPreviewNext,
  onPrepareShot,
  onRunCue,
}: {
  state: DirectorReviewState
  activeShot: DirectorShot | null
  controlsHidden: boolean
  availableObjectIds: Set<string>
  selectedObjectIds: string[]
  cueRunning: DemoCueId | null
  world: WorldState
  onClose: () => void
  onToggleControls: () => void
  onSelectShot: (id: string) => void
  onSelectObject: (id: string) => void
  onNudgeCamera: (dx: number, dy: number) => void
  onZoomCamera: (factor: number) => void
  onResetShot: () => void
  onApproveShot: () => void
  onPreviewNext: () => void
  onPrepareShot: () => void
  onRunCue: (cue: DemoCueId) => void
}) {
  if (controlsHidden) {
    return (
      <button type="button" className="director-panel-peek" onClick={onToggleControls} aria-label="Show storyboard controls">
        <i aria-hidden="true" /> Review frame
      </button>
    )
  }

  const approvedIds = new Set(Object.entries(state.shots).filter(([id, edit]) => {
    const shot = DIRECTOR_SHOTS.find((candidate) => candidate.id === id)
    return Boolean(edit.approved && shot?.status === 'live' && shot.editable.every((target) => availableObjectIds.has(target.id)))
  }).map(([id]) => id))
  const approvedCount = approvedIds.size
  const targets = activeShot?.editable ?? []
  const targetIds = targets.map((target) => target.id)
  const status = activeShot ? shotStatus(activeShot, approvedIds.has(activeShot.id), availableObjectIds) : 'planned'
  const restIds = activeShot ? cueRestObjectIds(activeShot.cue) : []
  const restReady = restIds.every((id) => Boolean(world.objects[id]))
  const nextShot = activeShot
    ? DIRECTOR_SHOTS[(DIRECTOR_SHOTS.findIndex((shot) => shot.id === activeShot.id) + 1) % DIRECTOR_SHOTS.length]
    : null

  return (
    <aside className="director-panel" aria-label="Live director review">
      <header className="director-header">
        <div className="director-heading">
          <span className="director-eyebrow"><i aria-hidden="true" /> Live director</span>
          <h2>Storyboard review</h2>
        </div>
        <div className="director-header-actions">
          <span className="director-approved-count" aria-label={`${approvedCount} frames approved`}>
            <b>{approvedCount}</b><small>/{DIRECTOR_SHOTS.length} approved</small>
          </span>
          <button type="button" className="director-preview-toggle" onClick={onToggleControls} aria-label="Hide controls for a full-frame preview">⛶</button>
          <button type="button" className="director-close" onClick={onClose} aria-label="Close storyboard review">×</button>
        </div>
      </header>

      <nav className="director-shot-list" aria-label="Storyboard frames">
        {DIRECTOR_SHOTS.map((shot, index) => {
          const isApproved = approvedIds.has(shot.id)
          const itemStatus = shotStatus(shot, isApproved, availableObjectIds)
          const isActive = activeShot?.id === shot.id
          return (
            <button
              type="button"
              key={shot.id}
              className={`director-shot-card${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectShot(shot.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="director-shot-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="director-shot-copy">
                <b>{shot.title}</b>
                <small>{shot.timecode}</small>
              </span>
              <span className={`director-status is-${itemStatus}`}>{statusLabel(itemStatus)}</span>
            </button>
          )
        })}
      </nav>

      {activeShot ? (
        <div className="director-detail">
          <section className="director-shot-detail" aria-labelledby="director-active-shot">
            <div className="director-detail-meta">
              <span>{activeShot.timecode}</span>
              <span className={`director-status is-${status}`}>{statusLabel(status)}</span>
            </div>
            <h3 id="director-active-shot">{activeShot.title}</h3>
            <p>{activeShot.intent}</p>
            <dl className="director-contract">
              <div><dt>Invariant</dt><dd>{activeShot.invariant}</dd></div>
              <div><dt>Gesture</dt><dd>{activeShot.gesture}</dd></div>
            </dl>
          </section>

          <section className="director-cues" aria-labelledby="director-cues-heading">
            <div className="director-section-label">
              <span id="director-cues-heading">Cue</span>
              <small>{cueRunning ? `running ${cueRunning}` : restReady ? 'rest state present' : 'rest state missing'}</small>
            </div>
            <div className="director-cue-row">
              <button type="button" className={`director-prepare${restReady ? ' is-ready' : ''}`} disabled={Boolean(cueRunning)} onClick={onPrepareShot}>
                <span><i aria-hidden="true" /> Prepare rest state</span><small>{activeShot.cue}</small>
              </button>
              {activeShot.beats.map((beat) => (
                <button
                  type="button"
                  key={beat.cue}
                  className={`director-beat is-${beat.actor}`}
                  disabled={Boolean(cueRunning)}
                  onClick={() => onRunCue(beat.cue)}
                  title={beat.cue}
                >
                  <i aria-hidden="true" />{beat.label}
                </button>
              ))}
            </div>
          </section>

          <section className="director-targets" aria-labelledby="director-targets-heading">
            <div className="director-section-label">
              <span id="director-targets-heading">Editable targets</span>
              <small>{targetIds.length} linked</small>
            </div>
            <div className="director-target-chips">
              {targets.length ? targets.map((target) => {
                const available = availableObjectIds.has(target.id)
                const selected = selectedObjectIds.includes(target.id)
                return (
                  <button
                    type="button"
                    key={target.id}
                    className={`director-target-chip${selected ? ' is-selected' : ''}${available ? '' : ' is-missing'}`}
                    disabled={!available}
                    onClick={() => onSelectObject(target.id)}
                    title={available ? `Select ${target.label}` : `${target.label} is not on the board yet`}
                  >
                    <i aria-hidden="true" />{target.label}{!available && <small>missing</small>}
                  </button>
                )
              }) : <span className="director-empty-targets">Camera-only frame. Nudge or zoom to reframe.</span>}
            </div>
          </section>

          <section className="director-camera" aria-labelledby="director-camera-heading">
            <div className="director-section-label">
              <span id="director-camera-heading">Camera framing</span>
              <small>drag-free controls</small>
            </div>
            <div className="director-camera-controls">
              <div className="director-dpad" aria-label="Nudge camera">
                <span />
                <button type="button" aria-label="Nudge camera up" onClick={() => onNudgeCamera(0, -16)}><ArrowIcon direction="up" /></button>
                <span />
                <button type="button" aria-label="Nudge camera left" onClick={() => onNudgeCamera(-16, 0)}><ArrowIcon direction="left" /></button>
                <button type="button" className="director-dpad-center" aria-label="Reset camera framing" onClick={onResetShot}>·</button>
                <button type="button" aria-label="Nudge camera right" onClick={() => onNudgeCamera(16, 0)}><ArrowIcon direction="right" /></button>
                <span />
                <button type="button" aria-label="Nudge camera down" onClick={() => onNudgeCamera(0, 16)}><ArrowIcon direction="down" /></button>
                <span />
              </div>
              <div className="director-zoom-controls">
                <button type="button" aria-label="Zoom out" onClick={() => onZoomCamera(0.92)}><ZoomIcon direction="out" /></button>
                <span>Zoom</span>
                <button type="button" aria-label="Zoom in" onClick={() => onZoomCamera(1.08)}><ZoomIcon direction="in" /></button>
              </div>
            </div>
          </section>

          <footer className="director-actions">
            <button type="button" className="director-secondary-action" onClick={onResetShot}>Reset framing</button>
            <button type="button" className="director-secondary-action" onClick={onPreviewNext} title={activeShot.bridge ? `Bridge: ${activeShot.bridge}` : 'Camera move only'}>
              {activeShot.bridge ? activeShot.transition : 'Preview next'} <span aria-hidden="true">→</span>{nextShot && <small>{nextShot.number}</small>}
            </button>
            <button type="button" className={`director-approve-action is-${status}`} onClick={onApproveShot} disabled={status !== 'ready'}>
              {status === 'planned' ? 'Awaiting build' : status === 'setup' ? 'State missing' : status === 'approved' ? 'Frame approved' : 'Approve frame'} <span aria-hidden="true">✓</span>
            </button>
          </footer>
        </div>
      ) : (
        <div className="director-empty-state">
          <span aria-hidden="true">✦</span>
          <p>Select a storyboard frame to tune its final composition.</p>
        </div>
      )}
    </aside>
  )
}
