import type { ReconstructionDraft, WorldAction, WorldObject, WorldState } from './types'

const actionId = () => crypto.randomUUID()

export function proposeReconstruction(
  sourceImageId: string,
  proposedObjects: WorldObject[],
  uncertainObjectIds: string[],
): WorldAction {
  const draft: ReconstructionDraft = {
    sourceImageId,
    proposedObjects,
    uncertainObjectIds,
    auditSummary: 'First pass complete. One handwritten term needs a second look.',
  }
  return {
    id: actionId(),
    source: 'agent',
    summary: 'Reconstructed the photographed problem',
    operations: [
      { type: 'reconstruction', draft },
      { type: 'session', patch: { reconstructionStatus: 'draft' } },
    ],
  }
}

export function auditReconstruction(
  currentDraft: ReconstructionDraft,
  auditSummary: string,
  proposedObjects = currentDraft.proposedObjects,
  uncertainObjectIds = currentDraft.uncertainObjectIds,
): WorldAction {
  return {
    id: actionId(),
    source: 'agent',
    summary: 'Audited the reconstruction against the source',
    operations: [
      {
        type: 'reconstruction',
        draft: { ...currentDraft, proposedObjects, uncertainObjectIds, auditSummary },
      },
      { type: 'session', patch: { reconstructionStatus: 'audited' } },
    ],
  }
}

/**
 * Approval commits the audited objects as live semantic children of the frame
 * that owns the source image. The source stays fully visible: the film shows
 * ink and LaTeX linked side by side, never one replacing the other.
 */
export function approveReconstruction(world: WorldState): WorldAction {
  const draft = world.reconstruction
  if (!draft) throw new Error('There is no reconstruction to approve.')
  const source = world.objects[draft.sourceImageId]
  const owningFrame = Object.values(world.objects).find((candidate) => (
    candidate.kind === 'frame' && candidate.childIds.includes(draft.sourceImageId)
  )) ?? world.objects.problem
  const approvedIds = draft.proposedObjects.map((object) => object.id)
  return {
    id: actionId(),
    source: 'human',
    summary: 'Approved the clean reconstruction',
    operations: [
      ...draft.proposedObjects.map((object) => ({ type: 'put' as const, object })),
      ...(source && source.opacity < 1 ? [{ type: 'put' as const, object: { ...source, opacity: 1 } }] : []),
      ...(owningFrame?.kind === 'frame'
        ? [{ type: 'put' as const, object: { ...owningFrame, childIds: [...new Set([...owningFrame.childIds, ...approvedIds])] } }]
        : []),
      { type: 'session', patch: { reconstructionStatus: 'approved' } },
      { type: 'reconstruction', draft: null },
      { type: 'select', ids: approvedIds },
    ],
  }
}

export function rejectReconstruction(): WorldAction {
  return {
    id: actionId(),
    source: 'human',
    summary: 'Rejected the reconstruction',
    operations: [{ type: 'reconstruction', draft: null }],
  }
}
