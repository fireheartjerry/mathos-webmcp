import type { ToolMode } from '../ToolRail'

export type CreationOption<T extends string = string> = {
  id: T
  label: string
  description?: string
  disabled?: boolean
  disabledLabel?: string
}

export type ShapeCreationOption = CreationOption<'rectangle' | 'ellipse' | 'triangle' | 'polygon' | 'freeform'>

/** Choices supported by the current annotation schema. The node editor will
 * add polygon/freeform support without making this first-click flow lie. */
export const shapeCreationOptions: ShapeCreationOption[] = [
  { id: 'rectangle', label: 'Rectangle', description: 'A clean rectangular annotation.' },
  { id: 'ellipse', label: 'Ellipse', description: 'A rounded annotation.' },
  { id: 'triangle', label: 'Triangle', description: 'A three-sided annotation.' },
  { id: 'polygon', label: 'Polygon', disabled: true, disabledLabel: 'node editor next' },
  { id: 'freeform', label: 'Freeform', disabled: true, disabledLabel: 'node editor next' },
]

export const matrixCreationOptions: CreationOption<'matrix-next'>[] = [
  { id: 'matrix-next', label: 'Matrix editor coming next', description: 'Arbitrary dimensions arrive in the matrix editor task.', disabled: true },
]

export const creationTitleFor = (mode: ToolMode): string => mode === 'shape' ? 'Choose a shape' : 'Create object'
