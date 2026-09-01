export type Actor = 'human' | 'agent'
export type Point = { x: number; y: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Viewport = { x: number; y: number; zoom: number }

export type BaseObject = {
  id: string
  bounds: Bounds
  rotation: number
  author: Actor
  opacity: number
  locked?: boolean
}

export type InkObject = BaseObject & { kind: 'ink'; points: Point[]; color: string; width: number }
export type TextObject = BaseObject & { kind: 'text'; text: string; color: string; fontSize: number }
export type ImageObject = BaseObject & { kind: 'image'; src: string; alt: string }
export type ShapeObject = BaseObject & {
  kind: 'shape'; shape: 'rectangle' | 'ellipse' | 'triangle'; fill: string; stroke: string
}
export type ArrowObject = BaseObject & { kind: 'arrow'; from: Point; to: Point; color: string }
export type EquationObject = BaseObject & { kind: 'equation'; latex: string; color: string }
export type GraphObject = BaseObject & {
  kind: 'graph'
  equationId: string
  xDomain: [number, number]
  yDomain: [number, number]
  color: string
  parameters?: Record<string, number>
  showTangentAt?: number
  shadeIntegral?: [number, number]
}
export type GeometryPrimitive =
  | { kind: 'point'; id: string; at: Point; label?: string; draggable?: boolean }
  | { kind: 'segment'; id: string; from: string; to: string }
  | { kind: 'line'; id: string; through: [string, string] }
  | { kind: 'circle'; id: string; center: string; through: string }
  | { kind: 'polygon'; id: string; points: string[] }
  | { kind: 'midpoint'; id: string; of: [string, string]; label?: string }
  | { kind: 'perpendicular'; id: string; through: string; to: string }
  | { kind: 'parallel'; id: string; through: string; to: string }
  | { kind: 'intersection'; id: string; lines: [string, string]; label?: string }
  | { kind: 'angle'; id: string; a: string; vertex: string; b: string }
  | { kind: 'homothety'; id: string; center: string; source: string; factor: number; label?: string }
export type GeometryObject = BaseObject & { kind: 'geometry'; primitives: GeometryPrimitive[]; accent: string }
export type MatrixObject = BaseObject & {
  kind: 'matrix'; values: [[number, number], [number, number]]; sourceIds: string[]; accent: string
}
export type FrameObject = BaseObject & { kind: 'frame'; title: string; childIds: string[] }
export type GroupObject = BaseObject & { kind: 'group'; childIds: string[] }

export type WorldObject =
  | InkObject | TextObject | ImageObject | ShapeObject | ArrowObject | EquationObject
  | GraphObject | GeometryObject | MatrixObject | FrameObject | GroupObject

export type SessionContext = {
  attempts: number
  helpShown: string[]
  currentMisconception: string | null
  reconstructionStatus: 'source' | 'draft' | 'audited' | 'approved'
}
export type ReconstructionDraft = {
  sourceImageId: string
  proposedObjects: WorldObject[]
  uncertainObjectIds: string[]
  auditSummary: string
}
export type AgentPresenceState = {
  visible: boolean
  x: number
  y: number
  label: string
  action: string
}
export type WorldOperation =
  | { type: 'put'; object: WorldObject }
  | { type: 'remove'; id: string }
  | { type: 'select'; ids: string[] }
  | { type: 'viewport'; viewport: Viewport }
  | { type: 'order'; ids: string[] }
  | { type: 'session'; patch: Partial<SessionContext> }
  | { type: 'reconstruction'; draft: ReconstructionDraft | null }
export type WorldAction = { id: string; source: Actor; summary: string; operations: WorldOperation[] }
export type WorldCommit = { action: WorldAction; inverse: WorldOperation[]; at: number }
export type WorldState = {
  version: 1
  title: string
  objects: Record<string, WorldObject>
  order: string[]
  selection: string[]
  viewport: Viewport
  history: WorldCommit[]
  future: WorldCommit[]
  activity: WorldCommit[]
  session: SessionContext
  reconstruction: ReconstructionDraft | null
}
