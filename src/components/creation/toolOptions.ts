import type { ToolMode } from '../ToolRail'

export type CreationOption<T extends string = string> = {
  id: T
  label: string
  description?: string
  disabled?: boolean
  disabledLabel?: string
}

export type ShapeCreationOption = CreationOption<'rectangle' | 'ellipse' | 'triangle' | 'polygon' | 'freeform'>

export const shapeCreationOptions: ShapeCreationOption[] = [
  { id: 'rectangle', label: 'Rectangle', description: 'A clean rectangular annotation.' },
  { id: 'ellipse', label: 'Ellipse', description: 'A rounded annotation.' },
  { id: 'triangle', label: 'Triangle', description: 'A three-sided annotation.' },
  { id: 'polygon', label: 'Polygon', description: 'Click each vertex; double-click or Enter to close.' },
  { id: 'freeform', label: 'Freeform', description: 'Drag a free path; nodes stay editable.' },
]

export type MatrixCreationOption = CreationOption<'2x2' | '2x3' | '3x2' | '3x3' | '4x4'>

export const matrixCreationOptions: MatrixCreationOption[] = [
  { id: '2x2', label: '2 × 2', description: 'Drives the live transformation plane.' },
  { id: '2x3', label: '2 × 3', description: 'Two rows, three columns.' },
  { id: '3x2', label: '3 × 2', description: 'Three rows, two columns.' },
  { id: '3x3', label: '3 × 3', description: 'Three rows, three columns.' },
  { id: '4x4', label: '4 × 4', description: 'Four rows, four columns.' },
]

export const creationTitleFor = (mode: ToolMode): string => mode === 'shape' ? 'Choose a shape' : 'Create object'
