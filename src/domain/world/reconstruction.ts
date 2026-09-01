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

export function approveReconstruction(world: WorldState): WorldAction {
  const draft = world.reconstruction
  if (!draft) throw new Error('There is no reconstruction to approve.')
  const source = world.objects[draft.sourceImageId]
  const problem = world.objects.problem
  const approvedIds = draft.proposedObjects.map((object) => object.id)
  return {
    id: actionId(),
    source: 'human',
    summary: 'Approved the clean reconstruction',
    operations: [
      ...draft.proposedObjects.map((object) => ({ type: 'put' as const, object })),
      ...(source ? [{ type: 'put' as const, object: { ...source, opacity: 0.18 } }] : []),
      ...(problem?.kind === 'frame'
        ? [{ type: 'put' as const, object: { ...problem, childIds: [...new Set([...problem.childIds, ...approvedIds])] } }]
        : []),
      { type: 'session', patch: { reconstructionStatus: 'approved' } },
      { type: 'reconstruction', draft: null },
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
