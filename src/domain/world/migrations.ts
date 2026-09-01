import type { SemanticBinding, SemanticEntity } from '../semantic/types'
import { validateSemanticWorld } from '../semantic/bindings'
import type { AnimationKeyframe, AnimationTargetPath, AnimationTimeline } from '../animation/types'
import type { EquationObject, GraphObject, MatrixObject, WorldObject, WorldState } from './types'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => Boolean(
  value && typeof value === 'object' && !Array.isArray(value),
)

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const FORBIDDEN_NAMES = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
])

const isSafeIdentifier = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0
  && !FORBIDDEN_NAMES.has(value)

const isSafeName = (value: unknown): value is string => isSafeIdentifier(value)
  && !value.includes('.')
  && !value.includes('[')
  && !value.includes(']')
  && !value.includes('\\')
  && !value.includes('/')
  && !value.includes(' ')

const isFiniteNumberRecord = (value: unknown): value is Record<string, number> => isRecord(value)
  && Object.keys(value).every((key) => isSafeName(key) && isFiniteNumber(value[key]))

const isFiniteNumberArray = (value: unknown): value is number[] => Array.isArray(value)
  && value.every(isFiniteNumber)

const isPair = (value: unknown): value is [number, number] => Array.isArray(value)
  && value.length === 2
  && value.every(isFiniteNumber)

const isQuad = (value: unknown): value is [number, number, number, number] => Array.isArray(value)
  && value.length === 4
  && value.every(isFiniteNumber)

const isSafeIdArray = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(isSafeIdentifier)

const isViewport = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.zoom)
  && value.zoom > 0

const isPoint = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)

const isBounds = (value: unknown): boolean => isRecord(value)
  && isFiniteNumber(value.x)
  && isFiniteNumber(value.y)
  && isFiniteNumber(value.width)
  && isFiniteNumber(value.height)
  && value.width > 0
  && value.height > 0

const OBJECT_KINDS = new Set([
  'ink',
  'text',
  'image',
  'shape',
  'arrow',
  'equation',
  'graph',
  'geometry',
  'matrix',
  'attention',
  'training',
  'barycentric',
  'simplex',
  'numberTheory',
  'frame',
  'group',
])

const isSemanticViewLink = (value: UnknownRecord): boolean => (
  (value.entityId === undefined || isSafeIdentifier(value.entityId))
  && (value.bindingIds === undefined || isSafeIdArray(value.bindingIds))
)

const isBaseObject = (value: unknown): value is UnknownRecord => isRecord(value)
  && isSafeIdentifier(value.id)
  && typeof value.kind === 'string'
  && OBJECT_KINDS.has(value.kind)
  && isBounds(value.bounds)
  && isFiniteNumber(value.rotation)
  && (value.author === 'human' || value.author === 'agent')
  && isFiniteNumber(value.opacity)
  && (value.locked === undefined || typeof value.locked === 'boolean')
  && isSemanticViewLink(value)

const isWorldShape = (value: UnknownRecord, version: 1 | 2): boolean => (
  value.version === version
  && typeof value.title === 'string'
  && isRecord(value.objects)
  && isSafeIdArray(value.order)
  && isSafeIdArray(value.selection)
  && isViewport(value.viewport)
  && Array.isArray(value.history)
  && Array.isArray(value.future)
  && Array.isArray(value.activity)
  && isRecord(value.session)
  && hasOwn(value, 'reconstruction')
  && (version === 1 || (isRecord(value.entities) && isRecord(value.bindings) && isRecord(value.timelines)))
)

const isMatrixValues = (value: unknown): value is [[number, number], [number, number]] => Array.isArray(value)
  && value.length === 2
  && value.every((row) => Array.isArray(row) && row.length === 2 && row.every(isFiniteNumber))

const isStringArray = (value: unknown): value is string[] => Array.isArray(value)
  && value.every((item) => typeof item === 'string')

const isVector = (value: unknown, length: number): value is number[] => Array.isArray(value)
  && value.length === length
  && value.every(isFiniteNumber)

const isMatrix = (value: unknown, rows: number, columns: number): boolean => Array.isArray(value)
  && value.length === rows
  && value.every((row) => isVector(row, columns))

const isTinyModel = (value: unknown): boolean => isRecord(value)
  && isStringArray(value.tokens)
  && value.tokens.length === 3
  && isMatrix(value.embeddings, 3, 2)
  && isMatrix(value.wq, 2, 2)
  && isMatrix(value.wk, 2, 2)
  && isMatrix(value.wv, 2, 2)
  && isMatrix(value.classifier, 2, 3)
  && isVector(value.bias, 3)
  && isFiniteNumber(value.queryIndex)
  && Number.isInteger(value.queryIndex)
  && value.queryIndex >= 0
  && value.queryIndex < 3
  && isFiniteNumber(value.targetIndex)
  && Number.isInteger(value.targetIndex)
  && value.targetIndex >= 0
  && value.targetIndex < 3

const isEquationObject = (value: unknown): value is EquationObject => isBaseObject(value)
  && value.kind === 'equation'
  && typeof value.latex === 'string'
  && typeof value.color === 'string'

const isGraphObject = (value: unknown): value is GraphObject => isBaseObject(value)
  && value.kind === 'graph'
  && isSafeIdentifier(value.equationId)
  && isPair(value.xDomain)
  && isPair(value.yDomain)
  && typeof value.color === 'string'
  && (value.parameters === undefined || isFiniteNumberRecord(value.parameters))
  && (value.showTangentAt === undefined || isFiniteNumber(value.showTangentAt))
  && (value.shadeIntegral === undefined || isPair(value.shadeIntegral))
  && (value.visualization === undefined || value.visualization === 'standard' || value.visualization === 'gamma-density')
  && (value.binEdges === undefined || isQuad(value.binEdges))

const isMatrixObject = (value: unknown): value is MatrixObject => isBaseObject(value)
  && value.kind === 'matrix'
  && isMatrixValues(value.values)
  && isSafeIdArray(value.sourceIds)
  && typeof value.accent === 'string'

const isPointArray = (value: unknown): boolean => Array.isArray(value)
  && value.every(isPoint)

const isInkStroke = (value: unknown): boolean => isRecord(value)
  && isPointArray(value.points)

const isInkObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'ink'
  && isPointArray(value.points)
  && (value.strokes === undefined || (Array.isArray(value.strokes)
    && value.strokes.every(isInkStroke)))
  && (value.strokeScale === undefined || (isFiniteNumber(value.strokeScale) && value.strokeScale > 0))
  && typeof value.color === 'string'
  && isFiniteNumber(value.width)
  && value.width > 0

const isTextObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'text'
  && typeof value.text === 'string'
  && typeof value.color === 'string'
  && isFiniteNumber(value.fontSize)
  && value.fontSize > 0
  && (value.presentation === undefined || value.presentation === 'typed' || value.presentation === 'handwritten')

const isImageObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'image'
  && typeof value.src === 'string'
  && typeof value.alt === 'string'

const isShapeObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'shape'
  && (value.shape === 'rectangle' || value.shape === 'ellipse' || value.shape === 'triangle')
  && typeof value.fill === 'string'
  && typeof value.stroke === 'string'

const isArrowObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'arrow'
  && isPoint(value.from)
  && isPoint(value.to)
  && typeof value.color === 'string'

const isPrimitiveRefArray = (value: unknown, length?: number, minimum = 0): boolean => (
  isSafeIdArray(value)
  && (length === undefined || value.length === length)
  && value.length >= minimum
)

const isOptionalPrimitiveLabel = (value: UnknownRecord): boolean => (
  value.label === undefined || typeof value.label === 'string'
)

const isGeometryPrimitive = (value: unknown): boolean => {
  if (!isRecord(value) || !isSafeIdentifier(value.id) || typeof value.kind !== 'string') return false
  switch (value.kind) {
    case 'point':
      return isPoint(value.at)
        && isOptionalPrimitiveLabel(value)
        && (value.draggable === undefined || typeof value.draggable === 'boolean')
    case 'segment':
      return isSafeIdentifier(value.from) && isSafeIdentifier(value.to)
    case 'line':
      return isPrimitiveRefArray(value.through, 2)
    case 'circle':
      return isSafeIdentifier(value.center) && isSafeIdentifier(value.through)
    case 'polygon':
      return isPrimitiveRefArray(value.points, undefined, 3)
    case 'midpoint':
      return isPrimitiveRefArray(value.of, 2) && isOptionalPrimitiveLabel(value)
    case 'perpendicular':
    case 'parallel':
      return isSafeIdentifier(value.through) && isSafeIdentifier(value.to)
    case 'intersection':
      return isPrimitiveRefArray(value.lines, 2) && isOptionalPrimitiveLabel(value)
    case 'angle':
      return isSafeIdentifier(value.a)
        && isSafeIdentifier(value.vertex)
        && isSafeIdentifier(value.b)
    case 'homothety':
      return isSafeIdentifier(value.center)
        && isSafeIdentifier(value.source)
        && isFiniteNumber(value.factor)
        && isOptionalPrimitiveLabel(value)
    case 'similarity':
      return isSafeIdentifier(value.center)
        && isSafeIdentifier(value.source)
        && isFiniteNumber(value.factor)
        && value.factor !== 0
        && isFiniteNumber(value.angle)
        && isOptionalPrimitiveLabel(value)
    default:
      return false
  }
}

const isGeometryObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'geometry'
  && Array.isArray(value.primitives)
  && value.primitives.length > 0
  && value.primitives.every(isGeometryPrimitive)
  && typeof value.accent === 'string'

const isAttentionObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'attention'
  && isTinyModel(value.model)
  && isVector(value.bridgeMasses, 3)
  && isFiniteNumber(value.temperature)
  && value.temperature > 0

const isTrainingObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'training'
  && isTinyModel(value.model)
  && isSafeIdentifier(value.linkedAttentionId)
  && isFiniteNumber(value.step)
  && Number.isInteger(value.step)
  && value.step >= 0
  && isFiniteNumberArray(value.lossHistory)
  && isFiniteNumberArray(value.probabilityHistory)
  && isFiniteNumber(value.learningRate)
  && value.learningRate >= 0

const isBarycentricObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'barycentric'
  && Array.isArray(value.vertices)
  && value.vertices.length === 3
  && value.vertices.every(isPoint)
  && isStringArray(value.labels)
  && value.labels.length === 3
  && isVector(value.weights, 3)
  && (value.linkedAttentionId === undefined || isSafeIdentifier(value.linkedAttentionId))

const isSimplexObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'simplex'
  && isVector(value.weights, 4)
  && isFiniteNumber(value.rotationX)
  && isFiniteNumber(value.rotationY)
  && isFiniteNumber(value.section)
  && isFiniteNumber(value.denominator)
  && Number.isInteger(value.denominator)
  && value.denominator > 0
  && typeof value.showLattice === 'boolean'

const isNumberTheoryObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'numberTheory'
  && isFiniteNumber(value.selectedN)
  && Number.isInteger(value.selectedN)
  && value.selectedN >= 0
  && isFiniteNumber(value.maxN)
  && Number.isInteger(value.maxN)
  && value.maxN >= value.selectedN
  && isFiniteNumber(value.finiteCutoff)
  && Number.isInteger(value.finiteCutoff)
  && value.finiteCutoff >= value.selectedN
  && (value.linkedSimplexId === undefined || isSafeIdentifier(value.linkedSimplexId))
  && typeof value.revealTheorem === 'boolean'

const isFrameObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'frame'
  && typeof value.title === 'string'
  && isSafeIdArray(value.childIds)

const isGroupObject = (value: unknown): boolean => isBaseObject(value)
  && value.kind === 'group'
  && isSafeIdArray(value.childIds)

const isExpressionEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'expression' }> => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'expression'
  && typeof value.latex === 'string'
  && isFiniteNumberRecord(value.parameters)

const isMatrixEntity = (value: unknown): value is Extract<SemanticEntity, { kind: 'matrix' }> => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'matrix'
  && typeof value.name === 'string'
  && Array.isArray(value.values)
  && value.values.every(isFiniteNumberArray)

const isScalarEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'scalar'
  && typeof value.name === 'string'
  && isFiniteNumber(value.value)

const isVectorEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'vector'
  && typeof value.name === 'string'
  && isFiniteNumberArray(value.values)

const isDataEntity = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && value.kind === 'data'
  && isRecord(value.columns)
  && Object.keys(value.columns).every((key) => isSafeName(key) && isFiniteNumberArray((value.columns as UnknownRecord)[key]))

const isSemanticEntity = (value: unknown): value is SemanticEntity => (
  isExpressionEntity(value)
  || isScalarEntity(value)
  || isVectorEntity(value)
  || isMatrixEntity(value)
  || isDataEntity(value)
)

const isSemanticEntityStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, entity]) => isSafeIdentifier(key)
    && isRecord(entity)
    && entity.id === key
    && isSemanticEntity(entity))

const BINDING_ADAPTERS = new Set(['identity', 'expression-parameter', 'matrix-cell', 'point-coordinate'])

const isSemanticPath = (value: unknown): value is string => typeof value === 'string'
  && value.length > 0
  && !value.split('.').some((part) => !isSafeName(part))

const isSemanticBinding = (value: unknown): value is SemanticBinding => isRecord(value)
  && isSafeIdentifier(value.id)
  && isRecord(value.source)
  && isSafeIdentifier(value.source.entityId)
  && isSemanticPath(value.source.path)
  && isRecord(value.target)
  && isSafeIdentifier(value.target.objectId)
  && isSemanticPath(value.target.path)
  && typeof value.forward === 'string'
  && BINDING_ADAPTERS.has(value.forward)
  && (value.inverse === null || (typeof value.inverse === 'string' && BINDING_ADAPTERS.has(value.inverse)))

const isSemanticBindingStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, binding]) => isSafeIdentifier(key)
    && isRecord(binding)
    && binding.id === key
    && isSemanticBinding(binding))

const isAnimationValue = (value: unknown): boolean => isFiniteNumber(value)
  || typeof value === 'string'
  || isFiniteNumberArray(value)
  || (Array.isArray(value) && value.every(isFiniteNumberArray))

const isAnimationTarget = (value: unknown): value is AnimationTargetPath => isRecord(value)
  && (value.kind === 'camera'
    ? isSemanticPath(value.path)
    : value.kind === 'entity'
      ? isSafeIdentifier(value.entityId) && isSemanticPath(value.path)
      : value.kind === 'object'
        && isSafeIdentifier(value.objectId) && isSemanticPath(value.path))

const isAnimationKeyframe = (key: string, value: unknown): value is AnimationKeyframe => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && isFiniteNumber(value.time)
  && isAnimationValue(value.value)

const isAnimationTrack = (key: string, value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && isAnimationTarget(value.target)
  && isRecord(value.keyframes)
  && Object.entries(value.keyframes).every(([frameKey, frame]) => isAnimationKeyframe(frameKey, frame))

const isAnimationTimeline = (key: string, value: unknown): value is AnimationTimeline => isRecord(value)
  && isSafeIdentifier(key)
  && value.id === key
  && typeof value.name === 'string'
  && isFiniteNumber(value.duration)
  && isRecord(value.playbackRange)
  && isFiniteNumber(value.playbackRange.start)
  && isFiniteNumber(value.playbackRange.end)
  && isRecord(value.tracks)
  && Object.entries(value.tracks).every(([trackKey, track]) => isAnimationTrack(trackKey, track))

const isAnimationTimelineStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, timeline]) => isAnimationTimeline(key, timeline))

const isSessionPatch = (value: unknown): boolean => isRecord(value)
  && Object.entries(value).every(([key, patchValue]) => {
    switch (key) {
      case 'attempts':
        return isFiniteNumber(patchValue) && Number.isInteger(patchValue) && patchValue >= 0
      case 'helpShown':
        return isSafeIdArray(patchValue)
      case 'currentMisconception':
        return patchValue === null || typeof patchValue === 'string'
      case 'reconstructionStatus':
        return patchValue === 'source'
          || patchValue === 'draft'
          || patchValue === 'audited'
          || patchValue === 'approved'
      default:
        return false
    }
  })

const isWorldObject = (value: unknown): value is WorldObject => {
  if (!isBaseObject(value)) return false
  switch (value.kind) {
    case 'ink': return isInkObject(value)
    case 'text': return isTextObject(value)
    case 'image': return isImageObject(value)
    case 'shape': return isShapeObject(value)
    case 'arrow': return isArrowObject(value)
    case 'equation': return isEquationObject(value)
    case 'graph': return isGraphObject(value)
    case 'geometry': return isGeometryObject(value)
    case 'matrix': return isMatrixObject(value)
    case 'attention': return isAttentionObject(value)
    case 'training': return isTrainingObject(value)
    case 'barycentric': return isBarycentricObject(value)
    case 'simplex': return isSimplexObject(value)
    case 'numberTheory': return isNumberTheoryObject(value)
    case 'frame': return isFrameObject(value)
    case 'group': return isGroupObject(value)
    default: return false
  }
}

const isWorldObjectStore = (value: unknown): value is UnknownRecord => isRecord(value)
  && Object.entries(value).every(([key, object]) => isSafeIdentifier(key)
    && isWorldObject(object)
    && object.id === key)

const isWorldOperation = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  switch (value.type) {
    case 'put': return isWorldObject(value.object)
    case 'remove':
    case 'removeEntity':
    case 'removeBinding':
    case 'removeTimeline': return isSafeIdentifier(value.id)
    case 'putEntity': return isSemanticEntity(value.entity)
    case 'putBinding': return isSemanticBinding(value.binding)
    case 'putTimeline': return isRecord(value.timeline)
      && typeof value.timeline.id === 'string'
      && isAnimationTimeline(value.timeline.id, value.timeline)
    case 'select':
    case 'order': return isSafeIdArray(value.ids)
    case 'viewport': return isViewport(value.viewport)
    case 'session': return isSessionPatch(value.patch)
    case 'reconstruction': return value.draft === null || isReconstructionDraft(value.draft)
    default: return false
  }
}

const isWorldAction = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.id)
  && (value.source === 'human' || value.source === 'agent')
  && typeof value.summary === 'string'
  && Array.isArray(value.operations)
  && value.operations.every(isWorldOperation)

const isWorldCommit = (value: unknown): boolean => isRecord(value)
  && isWorldAction(value.action)
  && Array.isArray(value.inverse)
  && value.inverse.every(isWorldOperation)
  && isFiniteNumber(value.at)

const isSession = (value: unknown): value is WorldState['session'] => isRecord(value)
  && isFiniteNumber(value.attempts)
  && Number.isInteger(value.attempts)
  && value.attempts >= 0
  && isSafeIdArray(value.helpShown)
  && (value.currentMisconception === null || typeof value.currentMisconception === 'string')
  && (value.reconstructionStatus === 'source'
    || value.reconstructionStatus === 'draft'
    || value.reconstructionStatus === 'audited'
    || value.reconstructionStatus === 'approved')

const isReconstructionDraft = (value: unknown): boolean => isRecord(value)
  && isSafeIdentifier(value.sourceImageId)
  && Array.isArray(value.proposedObjects)
  && value.proposedObjects.every(isWorldObject)
  && isSafeIdArray(value.uncertainObjectIds)
  && typeof value.auditSummary === 'string'

const isObjectArray = (value: unknown, predicate: (item: unknown) => boolean): value is unknown[] => Array.isArray(value)
  && value.every(predicate)

const POINT_PRIMITIVE_KINDS = new Set(['point', 'midpoint', 'intersection', 'homothety', 'similarity'])
const DIRECTION_PRIMITIVE_KINDS = new Set(['line', 'segment', 'perpendicular', 'parallel'])

const hasObjectKind = (objects: UnknownRecord, id: string, kind: string): boolean => {
  const candidate = hasOwn(objects, id) ? objects[id] : undefined
  return isRecord(candidate) && candidate.kind === kind
}

const isGeometryDependenciesValid = (value: UnknownRecord): boolean => {
  if (!Array.isArray(value.primitives)) return false
  const primitives = value.primitives.filter(isRecord)
  if (primitives.length !== value.primitives.length) return false

  const primitiveKinds = new Map<string, string>()
  for (const primitive of primitives) {
    if (!isSafeIdentifier(primitive.id) || typeof primitive.kind !== 'string' || primitiveKinds.has(primitive.id)) return false
    primitiveKinds.set(primitive.id, primitive.kind)
  }
  const hasKind = (id: unknown, kinds: Set<string>): boolean => (
    isSafeIdentifier(id) && kinds.has(primitiveKinds.get(id) ?? '')
  )
  const hasPoints = (ids: unknown): boolean => isSafeIdArray(ids) && ids.every((id) => hasKind(id, POINT_PRIMITIVE_KINDS))
  const hasDirections = (ids: unknown): boolean => isSafeIdArray(ids) && ids.every((id) => hasKind(id, DIRECTION_PRIMITIVE_KINDS))

  for (const primitive of primitives) {
    switch (primitive.kind) {
      case 'point':
        break
      case 'segment':
        if (!hasPoints([primitive.from, primitive.to])) return false
        break
      case 'line':
        if (!hasPoints(primitive.through)) return false
        break
      case 'circle':
        if (!hasPoints([primitive.center, primitive.through])) return false
        break
      case 'polygon':
        if (!hasPoints(primitive.points)) return false
        break
      case 'midpoint':
        if (!hasPoints(primitive.of)) return false
        break
      case 'perpendicular':
      case 'parallel':
        if (!hasPoints([primitive.through]) || !hasDirections([primitive.to])) return false
        break
      case 'intersection':
        if (!hasDirections(primitive.lines)) return false
        break
      case 'angle':
        if (!hasPoints([primitive.a, primitive.vertex, primitive.b])) return false
        break
      case 'homothety':
      case 'similarity':
        if (!hasPoints([primitive.center, primitive.source])) return false
        break
      default:
        return false
    }
  }
  return true
}

const isWorldDependenciesValid = (objects: UnknownRecord): boolean => {
  for (const object of Object.values(objects)) {
    if (!isWorldObject(object)) return false
    if ((object.kind === 'frame' || object.kind === 'group')
      && !object.childIds.every((id) => hasOwn(objects, id))) return false
    if (object.kind === 'matrix'
      && !object.sourceIds.every((id) => hasObjectKind(objects, id, 'arrow'))) return false
    if (object.kind === 'graph'
      && (!hasOwn(objects, object.equationId) || !isEquationObject(objects[object.equationId]))) return false
    if (object.kind === 'geometry' && !isGeometryDependenciesValid(object)) return false
    if (object.kind === 'training'
      && !hasObjectKind(objects, object.linkedAttentionId, 'attention')) return false
    if (object.kind === 'numberTheory' && object.linkedSimplexId !== undefined
      && !hasObjectKind(objects, object.linkedSimplexId, 'simplex')) return false
    if (object.kind === 'barycentric' && object.linkedAttentionId !== undefined
      && !hasObjectKind(objects, object.linkedAttentionId, 'attention')) return false
  }
  return true
}

const isWorldStore = (value: UnknownRecord, version: 1 | 2): boolean => {
  if (!isWorldObjectStore(value.objects)
    || !isSafeIdArray(value.order)
    || !isSafeIdArray(value.selection)
    || !isObjectArray(value.history, isWorldCommit)
    || !isObjectArray(value.future, isWorldCommit)
    || !isObjectArray(value.activity, isWorldCommit)
    || !isSession(value.session)
    || !(value.reconstruction === null || isReconstructionDraft(value.reconstruction))) return false

  const objects = value.objects
  const order = value.order
  const selection = value.selection
  if (!isSafeIdArray(order)
    || !isSafeIdArray(selection)
    || !order.every((id) => hasOwn(objects, id))
    || !selection.every((id) => hasOwn(objects, id))
    || !isWorldDependenciesValid(objects)) return false

  if (version === 1) {
    // v1 did not define semantic stores, but preserve and validate an
    // optional forward-compatible store if a caller attached one.
    return (value.entities === undefined || isSemanticEntityStore(value.entities))
      && (value.bindings === undefined || isSemanticBindingStore(value.bindings))
      && (value.timelines === undefined || isAnimationTimelineStore(value.timelines))
  }

  return isSemanticEntityStore(value.entities)
    && isSemanticBindingStore(value.bindings)
    && isAnimationTimelineStore(value.timelines)
}

/** Assign a generated key without allowing a legacy `__proto__` key to mutate a store prototype. */
const setOwn = (record: UnknownRecord, key: string, value: unknown): void => {
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  })
}

const clone = <T>(value: T): T => structuredClone(value)

const entityIdFor = (object: UnknownRecord): string | null => (
  typeof object.entityId === 'string' && object.entityId.length > 0
    ? object.entityId
    : typeof object.id === 'string' && object.id.length > 0
      ? `entity:${object.id}`
      : null
)

const addExpressionEntity = (
  entities: UnknownRecord,
  object: EquationObject,
): string | null => {
  const entityId = entityIdFor(object as unknown as UnknownRecord)
  if (!entityId) return null

  if (object.entityId !== entityId) object.entityId = entityId

  const existing = hasOwn(entities, entityId) ? entities[entityId] : undefined
  if (!existing) {
    setOwn(entities, entityId, {
      id: entityId,
      kind: 'expression',
      latex: object.latex,
      parameters: {},
    } satisfies Extract<SemanticEntity, { kind: 'expression' }>)
  } else if (isExpressionEntity(existing) && !isRecord(existing.parameters)) {
    // A partially written v2 entity is still recoverable. Existing values are
    // retained; only the missing parameter container is made usable.
    existing.parameters = {}
  }

  return entityId
}

const addMatrixEntity = (
  entities: UnknownRecord,
  object: MatrixObject,
): string | null => {
  const entityId = entityIdFor(object as unknown as UnknownRecord)
  if (!entityId) return null

  if (object.entityId !== entityId) object.entityId = entityId

  const existing = hasOwn(entities, entityId) ? entities[entityId] : undefined
  if (!existing) {
    setOwn(entities, entityId, {
      id: entityId,
      kind: 'matrix',
      // Object IDs are stable and matrix views do not have a legacy title.
      name: object.id,
      values: clone(object.values),
    } satisfies Extract<SemanticEntity, { kind: 'matrix' }>)
  } else if (isMatrixEntity(existing) && typeof existing.name !== 'string') {
    existing.name = object.id
  }

  return entityId
}

const bindingForParameter = (
  bindingId: string,
  entityId: string,
  graphId: string,
  name: string,
): SemanticBinding => ({
  id: bindingId,
  source: { entityId, path: `parameters.${name}` },
  target: { objectId: graphId, path: `parameters.${name}` },
  forward: 'expression-parameter',
  inverse: 'expression-parameter',
})

const addGraphBindings = (
  entities: UnknownRecord,
  bindings: UnknownRecord,
  graph: GraphObject,
  equationEntityId: string,
): void => {
  const expression = hasOwn(entities, equationEntityId) ? entities[equationEntityId] : undefined
  if (!isExpressionEntity(expression) || !isRecord(graph.parameters)) return
  if (!isRecord(expression.parameters)) expression.parameters = {}

  const bindingIds = Array.isArray(graph.bindingIds) ? graph.bindingIds : []
  const nextBindingIds = [...bindingIds]

  // Sort names so generated store/array order is deterministic even when a
  // legacy object was assembled by a non-deterministic source.
  for (const name of Object.keys(graph.parameters).sort()) {
    if (!isSafeName(name)) continue
    const value = graph.parameters[name]
    if (!isFiniteNumber(value)) continue

    if (!hasOwn(expression.parameters, name)) setOwn(expression.parameters, name, value)

    const bindingId = `binding:${graph.id}:parameter:${name}`
    if (!hasOwn(bindings, bindingId)) {
      setOwn(bindings, bindingId, bindingForParameter(bindingId, equationEntityId, graph.id, name))
    }
    if (!nextBindingIds.includes(bindingId)) nextBindingIds.push(bindingId)
  }

  if (nextBindingIds.length > 0) graph.bindingIds = nextBindingIds
}

/** Keep view metadata usable without carrying dangling or duplicate binding IDs. */
const normalizeBindingIds = (objects: UnknownRecord, bindings: UnknownRecord): void => {
  for (const object of Object.values(objects)) {
    if (!isRecord(object) || !hasOwn(object, 'bindingIds')) continue
    if (!Array.isArray(object.bindingIds)) continue
    const semanticViewKinds = new Set([
      'equation',
      'graph',
      'geometry',
      'matrix',
      'attention',
      'training',
      'barycentric',
      'simplex',
      'numberTheory',
    ])
    const entityId = semanticViewKinds.has(typeof object.kind === 'string' ? object.kind : '')
      && isSafeIdentifier(object.entityId)
      ? object.entityId
      : null
    const ids = [...new Set(object.bindingIds.filter((id): id is string => {
      if (!isSafeIdentifier(id) || !hasOwn(bindings, id)) return false
      const binding = bindings[id]
      if (!isSemanticBinding(binding) || binding.target.objectId !== object.id) return false
      return entityId === null || binding.source.entityId === entityId
    }))]
    if (ids.length > 0) object.bindingIds = ids
    else delete object.bindingIds
  }
}

/**
 * Populate semantic stores on a cloned v1/v2 world.
 *
 * This helper deliberately mutates only the clone supplied by `migrateWorld`.
 * It is also used for the fresh seed so built-ins and persisted worlds share
 * exactly the same stable IDs and parameter bindings.
 */
export function backfillSemanticWorld(world: WorldState): WorldState {
  const objects = world.objects as unknown as Record<string, unknown>
  const entities = world.entities as unknown as UnknownRecord
  const bindings = world.bindings as unknown as UnknownRecord
  const equationEntityIds = new Map<string, string>()

  const orderedObjects = Object.values(objects)
    .filter((object): object is WorldObject => isRecord(object))
    .sort((left, right) => left.id.localeCompare(right.id))

  // First create/link all expression entities. Graphs can appear before their
  // equations in legacy order, so linking is intentionally a second pass.
  for (const object of orderedObjects) {
    if (!isEquationObject(object)) continue
    const entityId = addExpressionEntity(entities, object)
    if (entityId) equationEntityIds.set(object.id, entityId)
  }

  for (const object of orderedObjects) {
    if (isGraphObject(object)) {
      const equation = objects[object.equationId]
      const equationEntityId = isEquationObject(equation)
        ? equationEntityIds.get(equation.id) ?? entityIdFor(equation as unknown as UnknownRecord)
        : undefined
      if (equationEntityId) {
        // A graph is a view of its equation. Normalize even a stale existing
        // link so generated bindings and the graph view agree.
        object.entityId = equationEntityId
        addGraphBindings(entities, bindings, object, equationEntityId)
      }
    } else if (isMatrixObject(object)) {
      addMatrixEntity(entities, object)
    }
  }

  normalizeBindingIds(objects, bindings)

  return world
}

/** Clone and normalize persisted v1/v2 world data without writing to storage. */
export function migrateWorld(value: unknown): WorldState | null {
  try {
    if (!isRecord(value) || (!isWorldShape(value, 1) && !isWorldShape(value, 2))) return null
    const cloned = clone(value) as UnknownRecord
    if (!isRecord(cloned)) return null

    const version = cloned.version as 1 | 2
    if (!isWorldStore(cloned, version)) return null

    // Existing v2 semantic records must be valid before backfill begins. This
    // prevents migration from silently carrying a dangling or malformed link.
    if (version === 2 && validateSemanticWorld(cloned as unknown as WorldState)) return null

    if (version === 1) {
      cloned.version = 2
      // Keep any forward-compatible stores a caller may already have attached
      // to a v1 payload, while still initializing the required v2 containers.
      if (!isRecord(cloned.entities)) cloned.entities = {}
      if (!isRecord(cloned.bindings)) cloned.bindings = {}
      if (!isRecord(cloned.timelines)) cloned.timelines = {}
    }

    const migrated = backfillSemanticWorld(cloned as unknown as WorldState)
    if (!isWorldStore(migrated as unknown as UnknownRecord, 2)) return null
    if (validateSemanticWorld(migrated)) return null
    return migrated
  } catch {
    // A DataCloneError or malformed nested payload must never make loading
    // mutate storage or take down the workspace.
    return null
  }
}
