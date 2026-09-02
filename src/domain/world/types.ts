import type { AnimationTimeline } from '../animation/types'
import type { SemanticBinding, SemanticEntity } from '../semantic/types'

export type Actor = 'human' | 'agent'
export type Point = { x: number; y: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Viewport = { x: number; y: number; zoom: number }
export type InkStroke = { points: Point[] }

export type BaseObject = {
  id: string
  bounds: Bounds
  rotation: number
  author: Actor
  opacity: number
  locked?: boolean
  /** Transient 0..1 reveal used by stroke replay and draw tracks; never persisted. */
  drawProgress?: number
}

export type InkObject = BaseObject & {
  kind: 'ink'
  /** Legacy single-stroke representation retained for existing drawings and tools. */
  points: Point[]
  /** Optional captured/multi-stroke representation. Coordinates are local to bounds. */
  strokes?: InkStroke[]
  /** Source-to-world scale for captured stroke widths. */
  strokeScale?: number
  color: string
  width: number
}
export type TextObject = BaseObject & {
  kind: 'text'
  text: string
  color: string
  fontSize: number
  /** Optional presentation hint for authored handwriting-style text. */
  presentation?: 'typed' | 'handwritten'
  /** Optional alignment for multiline text; legacy text defaults to left. */
  textAlign?: 'left' | 'center' | 'right'
}
export type ImageObject = BaseObject & { kind: 'image'; src: string; alt: string }
export type ShapeObject = BaseObject & {
  kind: 'shape'
  shape: 'rectangle' | 'ellipse' | 'triangle' | 'polygon' | 'freeform'
  fill: string
  stroke: string
  /** Node positions local to bounds for polygon (closed) and freeform (open path) shapes. */
  points?: Point[]
  strokeWidth?: number
  cornerRadius?: number
}
export type ArrowObject = BaseObject & { kind: 'arrow'; from: Point; to: Point; color: string }
export type SemanticViewLink = { entityId?: string; bindingIds?: string[] }
export type EquationObject = BaseObject & SemanticViewLink & { kind: 'equation'; latex: string; color: string }
export type GraphObject = BaseObject & {
  kind: 'graph'
  equationId: string
  xDomain: [number, number]
  yDomain: [number, number]
  color: string
  parameters?: Record<string, number>
  showTangentAt?: number
  shadeIntegral?: [number, number]
  visualization?: 'standard' | 'gamma-density'
  binEdges?: [number, number, number, number]
} & SemanticViewLink
export type GeometryPrimitive =
  | { kind: 'point'; id: string; at: Point; label?: string; draggable?: boolean; hidden?: boolean }
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
  | { kind: 'similarity'; id: string; center: string; source: string; factor: number; angle: number; label?: string }
  /** The unique fixed point of the spiral similarity sending a→a2 and b→b2. */
  | { kind: 'spiralCenter'; id: string; a: string; b: string; a2: string; b2: string; label?: string }
export type GeometryObject = BaseObject & SemanticViewLink & { kind: 'geometry'; primitives: GeometryPrimitive[]; accent: string }
/** Rows × columns, 1..4 each. Only 2×2 matrices drive the transformation plane. */
export type MatrixObject = BaseObject & {
  kind: 'matrix'; values: number[][]; sourceIds: string[]; accent: string
} & SemanticViewLink

export type Vector2 = [number, number]
export type Vector3 = [number, number, number]
export type Matrix2 = [Vector2, Vector2]
export type TinyModelState = {
  tokens: [string, string, string]
  embeddings: [Vector2, Vector2, Vector2]
  wq: Matrix2
  wk: Matrix2
  wv: Matrix2
  classifier: [Vector3, Vector3]
  bias: Vector3
  queryIndex: number
  targetIndex: number
}
export type AttentionObject = BaseObject & {
  kind: 'attention'
  model: TinyModelState
  bridgeMasses: Vector3
  temperature: number
} & SemanticViewLink
export type TrainingObject = BaseObject & {
  kind: 'training'
  model: TinyModelState
  linkedAttentionId: string
  step: number
  lossHistory: number[]
  probabilityHistory: number[]
  learningRate: number
} & SemanticViewLink
export type BarycentricObject = BaseObject & {
  kind: 'barycentric'
  vertices: [Point, Point, Point]
  labels: [string, string, string]
  weights: Vector3
  linkedAttentionId?: string
} & SemanticViewLink
export type SimplexObject = BaseObject & {
  kind: 'simplex'
  weights: [number, number, number, number]
  rotationX: number
  rotationY: number
  section: number
  denominator: number
  showLattice: boolean
} & SemanticViewLink
export type NumberTheoryObject = BaseObject & {
  kind: 'numberTheory'
  selectedN: number
  maxN: number
  finiteCutoff: number
  linkedSimplexId?: string
  revealTheorem: boolean
} & SemanticViewLink
export type FrameObject = BaseObject & { kind: 'frame'; title: string; childIds: string[] }
export type GroupObject = BaseObject & { kind: 'group'; childIds: string[] }

export type WorldObject =
  | InkObject | TextObject | ImageObject | ShapeObject | ArrowObject | EquationObject
  | GraphObject | GeometryObject | MatrixObject | AttentionObject | TrainingObject
  | BarycentricObject | SimplexObject | NumberTheoryObject | FrameObject | GroupObject

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
  | { type: 'putEntity'; entity: SemanticEntity }
  | { type: 'removeEntity'; id: string }
  | { type: 'putBinding'; binding: SemanticBinding }
  | { type: 'removeBinding'; id: string }
  | { type: 'putTimeline'; timeline: AnimationTimeline }
  | { type: 'removeTimeline'; id: string }
  | { type: 'select'; ids: string[] }
  | { type: 'viewport'; viewport: Viewport }
  | { type: 'order'; ids: string[] }
  | { type: 'session'; patch: Partial<SessionContext> }
  | { type: 'reconstruction'; draft: ReconstructionDraft | null }
export type WorldAction = { id: string; source: Actor; summary: string; operations: WorldOperation[] }
export type WorldCommit = { action: WorldAction; inverse: WorldOperation[]; at: number }
export type WorldState = {
  version: 2
  title: string
  objects: Record<string, WorldObject>
  entities: Record<string, SemanticEntity>
  bindings: Record<string, SemanticBinding>
  timelines: Record<string, AnimationTimeline>
  order: string[]
  selection: string[]
  viewport: Viewport
  history: WorldCommit[]
  future: WorldCommit[]
  activity: WorldCommit[]
  session: SessionContext
  reconstruction: ReconstructionDraft | null
}
