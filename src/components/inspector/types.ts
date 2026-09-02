import type { ReactNode } from 'react'
import type { SemanticEdit } from '../../domain/semantic/transactions'
import type { WorldObject, WorldState } from '../../domain/world/types'

export type InspectorStatus = 'free' | 'constrained' | 'derived' | 'computed'
export type InspectorTab = 'values' | 'structure' | 'constraints' | 'style' | 'bindings' | 'animation'

export type InspectorFieldSpec = {
  label: string
  value: ReactNode
  status: InspectorStatus
  detail?: string
  children?: ReactNode
}

export type ProgressiveInspectorProps = {
  object: WorldObject
  world: Pick<WorldState, 'objects' | 'entities' | 'bindings' | 'timelines'>
  editorId: string | null
  editorValue: string
  editorMatrix: [[number, number], [number, number]] | null
  onEdit: (id: string) => void
  onValueChange: (value: string) => void
  onMatrixChange: (row: 0 | 1, column: 0 | 1, value: number) => void
  onPatchObject: (id: string, patch: Record<string, unknown>, summary?: string) => void
  onSemanticEdit: (edit: SemanticEdit, summary?: string) => void
  onSave: () => void
  onCancel: () => void
}
