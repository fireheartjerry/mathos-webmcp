import type { ReconstructionDraft, SessionContext, WorldObject } from '../domain/world/types'
import { Tex } from './Tex'

function ObjectPreview({ object, uncertain }: { object: WorldObject; uncertain: boolean }) {
  let content
  if (object.kind === 'equation') content = <Tex latex={object.latex} />
  else if (object.kind === 'text') content = object.text
  else content = object.kind
  return (
    <div className={`reconstruction-object${uncertain ? ' is-uncertain' : ''}`}>
      <span>{object.kind}</span>
      <div>{content}</div>
      <i>{uncertain ? 'verify' : 'live'}</i>
    </div>
  )
}

export default function ReconstructionPanel({
  draft,
  status,
  busy,
  onAudit,
  onApprove,
  onReject,
}: {
  draft: ReconstructionDraft
  status: SessionContext['reconstructionStatus']
  busy: boolean
  onAudit: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const audited = status === 'audited'
  return (
    <section className="reconstruction-panel" aria-label="Problem reconstruction preview">
      <header>
        <div><span>Image → live math</span><h2>{audited ? 'Audit passed' : 'Semantic draft'}</h2></div>
        <b>{draft.proposedObjects.length} objects</b>
      </header>

      <div className="reconstruction-stack">
        {draft.proposedObjects.map((object) => (
          <ObjectPreview key={object.id} object={object} uncertain={draft.uncertainObjectIds.includes(object.id)} />
        ))}
      </div>

      <div className={`audit-result${audited ? ' is-passed' : ''}`}>
        <i>{audited ? '✓' : '?'}</i>
        <p><b>{audited ? 'Second-pass comparison' : 'Needs one double-check'}</b>{draft.auditSummary}</p>
      </div>

      <footer>
        {!audited && <button type="button" className="audit-button" disabled={busy} onClick={onAudit}>AI double-check</button>}
        {audited && <button type="button" className="approve-button" disabled={busy} onClick={onApprove}>Approve clean conversion</button>}
        <button type="button" className="reject-button" disabled={busy} onClick={onReject}>Reject</button>
      </footer>
      <small>Approval only applies to image reconstruction. All later tutor edits are direct and undoable.</small>
    </section>
  )
}
