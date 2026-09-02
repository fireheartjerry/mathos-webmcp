'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { WorldObject } from '../../domain/world/types'
import InspectorField from './InspectorField'
import type { InspectorFieldSpec, InspectorStatus, InspectorTab, ProgressiveInspectorProps } from './types'
import '../../styles/inspector.css'

const tabs: Array<{ id: InspectorTab; label: string }> = [
  { id: 'values', label: 'Values' },
  { id: 'structure', label: 'Structure' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'style', label: 'Style' },
  { id: 'bindings', label: 'Bindings' },
  { id: 'animation', label: 'Animation' },
]

// Explicit capability maps keep the tab row honest instead of advertising
// empty panels for every selected object.
const structuredKinds = new Set<WorldObject['kind']>([
  'graph', 'geometry', 'matrix', 'attention', 'training', 'barycentric', 'simplex', 'numberTheory', 'frame', 'group',
])
const constrainedKinds = new Set<WorldObject['kind']>([
  'geometry', 'barycentric', 'graph', 'attention', 'training', 'simplex', 'numberTheory',
])
const styleCapableKinds = new Set<WorldObject['kind']>([
  'text', 'equation', 'graph', 'arrow', 'ink', 'shape', 'matrix', 'geometry',
])

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  if (Array.isArray(value)) return value.map((entry) => formatValue(entry)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return value == null ? '—' : String(value)
}

const boundsLabel = (object: WorldObject) => `${formatValue(object.bounds.width)} × ${formatValue(object.bounds.height)} @ ${formatValue(object.bounds.x)}, ${formatValue(object.bounds.y)}`

/** IDs this object explicitly points at in the small world dependency graph. */
const linkedReferenceIdsFor = (object: WorldObject): string[] => {
  if (object.kind === 'graph') return [object.equationId]
  if (object.kind === 'matrix') return object.sourceIds
  if (object.kind === 'training') return [object.linkedAttentionId]
  if (object.kind === 'barycentric') return object.linkedAttentionId ? [object.linkedAttentionId] : []
  if (object.kind === 'numberTheory') return object.linkedSimplexId ? [object.linkedSimplexId] : []
  return object.kind === 'frame' || object.kind === 'group' ? object.childIds : []
}

const entityIdFor = (object: WorldObject): string | undefined => (
  'entityId' in object && typeof object.entityId === 'string' && object.entityId.length > 0 ? object.entityId : undefined
)

const uniqueExistingIds = (ids: string[], world: ProgressiveInspectorProps['world'], exclude?: string): string[] => (
  [...new Set(ids)].filter((id) => id !== exclude && Boolean(world.objects[id]))
)

/** Include declared metadata and bindings discovered from either endpoint. */
const bindingIdsFor = (object: WorldObject, world: ProgressiveInspectorProps['world'], entityId?: string): string[] => {
  const declared = 'bindingIds' in object && Array.isArray(object.bindingIds)
    ? object.bindingIds.filter((id): id is string => typeof id === 'string')
    : []
  const discovered = Object.values(world.bindings)
    .filter((binding) => binding.target.objectId === object.id || (entityId !== undefined && binding.source.entityId === entityId))
    .map((binding) => binding.id)
  return [...new Set([...declared, ...discovered])]
}

const linkedViewIdsFor = (object: WorldObject, world: ProgressiveInspectorProps['world']): string[] => (
  uniqueExistingIds(linkedReferenceIdsFor(object), world, object.id)
)

/**
 * Find reverse links without introducing a general dependency engine. This is
 * deliberately a scan over the supported object relationships and semantic
 * binding endpoints, which keeps the inspector cheap and predictable.
 */
const dependentObjectIdsFor = (
  object: WorldObject,
  world: ProgressiveInspectorProps['world'],
  entityId?: string,
): string[] => {
  const reverseObjectLinks = Object.values(world.objects)
    .filter((candidate) => candidate.id !== object.id)
    .filter((candidate) => linkedReferenceIdsFor(candidate).includes(object.id))
    .map((candidate) => candidate.id)
  const sharedEntityViews = entityId === undefined ? [] : Object.values(world.objects)
    .filter((candidate) => candidate.id !== object.id && entityIdFor(candidate) === entityId)
    .map((candidate) => candidate.id)
  const bindingTargets = entityId === undefined ? [] : Object.values(world.bindings)
    .filter((binding) => binding.source.entityId === entityId)
    .map((binding) => binding.target.objectId)
  const bindingSourceViews = Object.values(world.bindings)
    .filter((binding) => binding.target.objectId === object.id)
    .flatMap((binding) => Object.values(world.objects)
      .filter((candidate) => candidate.id !== object.id && entityIdFor(candidate) === binding.source.entityId)
      .map((candidate) => candidate.id))
  return uniqueExistingIds([
    ...reverseObjectLinks,
    ...sharedEntityViews,
    ...bindingTargets,
    ...bindingSourceViews,
  ], world, object.id)
}

const parseFinite = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function InlineNumberEditor({
  value,
  ariaLabel,
  onCommit,
}: {
  value: number
  ariaLabel: string
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(() => formatValue(value))
  const focused = useRef(false)
  const committedValue = useRef<number | null>(null)

  useEffect(() => {
    if (!focused.current) setDraft(formatValue(value))
  }, [value])

  const commit = () => {
    const parsed = parseFinite(draft)
    if (parsed === null) {
      committedValue.current = null
      setDraft(formatValue(value))
      return
    }
    setDraft(formatValue(parsed))
    if (committedValue.current === parsed) return
    committedValue.current = parsed
    if (!Object.is(parsed, value)) onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      aria-label={ariaLabel}
      onFocus={() => { focused.current = true; committedValue.current = null }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          committedValue.current = null
          setDraft(formatValue(value))
          event.currentTarget.blur()
        }
      }}
      onBlur={() => {
        focused.current = false
        commit()
      }}
    />
  )
}

type NumericTuple = [number, number, ...number[]]

const parseFiniteTuple = (raw: string, expectedLength: number): number[] | null => {
  const trimmed = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (!trimmed) return null
  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  if (parts.length !== expectedLength) return null
  const values = parts.map(parseFinite)
  return values.every((value): value is number => value !== null) ? values : null
}

function InlineTupleEditor({
  values,
  ariaLabel,
  onCommit,
}: {
  values: NumericTuple
  ariaLabel: string
  onCommit: (values: number[]) => void
}) {
  const [draft, setDraft] = useState(() => formatValue(values))
  const focused = useRef(false)
  const committedValues = useRef<string | null>(null)

  useEffect(() => {
    if (!focused.current) setDraft(formatValue(values))
  }, [values])

  const commit = () => {
    const parsed = parseFiniteTuple(draft, values.length)
    if (!parsed) {
      committedValues.current = null
      setDraft(formatValue(values))
      return
    }
    const key = parsed.join('|')
    setDraft(formatValue(parsed))
    if (committedValues.current === key) return
    committedValues.current = key
    if (parsed.some((value, index) => !Object.is(value, values[index]))) onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      aria-label={ariaLabel}
      onFocus={() => { focused.current = true; committedValues.current = null }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          committedValues.current = null
          setDraft(formatValue(values))
          event.currentTarget.blur()
        }
      }}
      onBlur={() => {
        focused.current = false
        commit()
      }}
    />
  )
}

function InlineRangeEditor({
  values,
  ariaLabel,
  onCommit,
}: {
  values: [number, number]
  ariaLabel: string
  onCommit: (values: [number, number]) => void
}) {
  return (
    <div className="inspector-range-editor">
      <InlineNumberEditor value={values[0]} ariaLabel={`${ariaLabel} start`} onCommit={(next) => onCommit([next, values[1]])} />
      <InlineNumberEditor value={values[1]} ariaLabel={`${ariaLabel} end`} onCommit={(next) => onCommit([values[0], next])} />
    </div>
  )
}

function TextEditor({
  id,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSave()
    if (event.key === 'Escape') onCancel()
  }
  return (
    <input
      id={id}
      autoFocus
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      aria-label="Edit value"
    />
  )
}

function MatrixEditor({
  matrix,
  onChange,
  onSave,
  onCancel,
}: {
  matrix: [[number, number], [number, number]]
  onChange: ProgressiveInspectorProps['onMatrixChange']
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="inspector-matrix-editor" role="group" aria-label="Edit 2 by 2 matrix">
      {matrix.map((row, rowIndex) => row.map((value, columnIndex) => (
        <input
          key={`${rowIndex}-${columnIndex}`}
          autoFocus={rowIndex === 0 && columnIndex === 0}
          type="text"
          inputMode="decimal"
          value={value}
          aria-label={`Matrix row ${rowIndex + 1}, column ${columnIndex + 1}`}
          onChange={(event) => onChange(rowIndex as 0 | 1, columnIndex as 0 | 1, Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSave()
            if (event.key === 'Escape') onCancel()
          }}
        />
      )))}
    </div>
  )
}

export default function ProgressiveInspector({
  object,
  world,
  editorId,
  editorValue,
  editorMatrix,
  onEdit,
  onValueChange,
  onMatrixChange,
  onPatchObject,
  onSave,
  onCancel,
}: ProgressiveInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('values')
  const isEditing = editorId === object.id
  const canEdit = object.kind === 'text' || object.kind === 'equation' || object.kind === 'matrix'
  const entityId = entityIdFor(object)
  const bindingIds = bindingIdsFor(object, world, entityId)
  const linkedViewIds = linkedViewIdsFor(object, world)
  const dependentObjectIds = dependentObjectIdsFor(object, world, entityId)

  const inputKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isEditing) onCancel()
  }

  const editableText = (label: string, value: string, status: InspectorFieldSpec['status'] = 'free'): InspectorFieldSpec => ({
    label,
    value,
    status,
    children: isEditing ? (
      <TextEditor id={`inspector-${object.id}-${label.toLowerCase().replace(/\s+/g, '-')}`} value={editorValue} onChange={onValueChange} onSave={onSave} onCancel={onCancel} />
    ) : undefined,
  })

  const numericField = (
    label: string,
    value: number,
    status: InspectorStatus,
    patch: (next: number) => Record<string, unknown>,
    summary: string,
  ): InspectorFieldSpec => ({
    label,
    value: formatValue(value),
    status,
    children: <InlineNumberEditor value={value} ariaLabel={`${label} for ${object.id}`} onCommit={(next) => onPatchObject(object.id, patch(next), summary)} />,
  })

  const tupleField = (
    label: string,
    values: NumericTuple,
    status: InspectorStatus,
    patch: (next: number[]) => Record<string, unknown>,
    summary: string,
  ): InspectorFieldSpec => ({
    label,
    value: formatValue(values),
    status,
    children: <InlineTupleEditor values={values} ariaLabel={`${label} for ${object.id}`} onCommit={(next) => onPatchObject(object.id, patch(next), summary)} />,
  })

  const rangeField = (
    label: string,
    values: [number, number],
    status: InspectorStatus,
    patch: (next: [number, number]) => Record<string, unknown>,
    summary: string,
  ): InspectorFieldSpec => ({
    label,
    value: `[${formatValue(values[0])}, ${formatValue(values[1])}]`,
    status,
    children: <InlineRangeEditor values={values} ariaLabel={`${label} for ${object.id}`} onCommit={(next) => onPatchObject(object.id, patch(next), summary)} />,
  })

  const valueFields = useMemo<InspectorFieldSpec[]>(() => {
    switch (object.kind) {
      case 'text':
        return [
          editableText('Content', object.text),
          numericField('Font size', object.fontSize, 'free', (next) => ({ fontSize: next }), 'Changed text font size'),
          { label: 'Presentation', value: object.presentation ?? 'typed', status: 'derived' },
          { label: 'Author', value: object.author, status: 'derived' },
        ]
      case 'equation':
        return [
          editableText('Expression', object.latex),
          { label: 'Semantic entity', value: entityId ?? 'local expression', status: entityId ? 'derived' : 'free' },
          { label: 'Color', value: object.color, status: 'free' },
          { label: 'Author', value: object.author, status: 'derived' },
        ]
      case 'matrix': {
        const matrix = editorMatrix ?? object.values
        return [
          { label: 'Matrix A', value: `${matrix[0].join('  ')}  /  ${matrix[1].join('  ')}`, status: 'free', children: isEditing ? <MatrixEditor matrix={matrix} onChange={onMatrixChange} onSave={onSave} onCancel={onCancel} /> : undefined },
          { label: 'Dimensions', value: '2 × 2', status: 'constrained' },
          { label: 'Source vectors', value: `${object.sourceIds.length} linked`, status: 'derived' },
          { label: 'Accent', value: object.accent, status: 'free' },
        ]
      }
      case 'graph': {
        const parameters = Object.entries(object.parameters ?? {})
          .filter(([, value]) => Number.isFinite(value))
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, value]) => numericField(
            `Parameter ${name}`,
            value,
            'free',
            (next) => ({ parameters: { ...(object.parameters ?? {}), [name]: next } }),
            `Changed graph parameter ${name}`,
          ))
        const fields: InspectorFieldSpec[] = [
          { label: 'Equation view', value: object.equationId, status: 'derived' },
          ...parameters,
          rangeField('X domain', object.xDomain, 'constrained', (next) => ({ xDomain: next }), 'Changed graph X domain'),
          rangeField('Y domain', object.yDomain, 'constrained', (next) => ({ yDomain: next }), 'Changed graph Y domain'),
        ]
        if (typeof object.showTangentAt === 'number' && Number.isFinite(object.showTangentAt)) {
          fields.push(numericField('Tangent', object.showTangentAt, 'free', (next) => ({ showTangentAt: next }), 'Changed graph tangent'))
        }
        if (Array.isArray(object.shadeIntegral) && object.shadeIntegral.length === 2) {
          fields.push(rangeField('Integral', object.shadeIntegral, 'constrained', (next) => ({ shadeIntegral: next }), 'Changed graph integral range'))
        }
        return fields
      }
      case 'shape':
        return [
          { label: 'Shape', value: object.shape, status: 'free' },
          { label: 'Fill', value: object.fill, status: 'free' },
          { label: 'Stroke', value: object.stroke, status: 'free' },
          { label: 'Opacity', value: formatValue(object.opacity), status: 'constrained' },
        ]
      case 'arrow':
        return [
          { label: 'From', value: formatValue(object.from), status: 'free' },
          { label: 'To', value: formatValue(object.to), status: 'free' },
          { label: 'Color', value: object.color, status: 'free' },
          { label: 'Length', value: formatValue(Math.hypot(object.to.x - object.from.x, object.to.y - object.from.y)), status: 'computed' },
        ]
      case 'geometry':
        return [
          { label: 'Primitives', value: `${object.primitives.length} construction steps`, status: 'computed' },
          { label: 'Points', value: `${object.primitives.filter((primitive) => primitive.kind === 'point').length} free points`, status: 'free' },
          { label: 'Accent', value: object.accent, status: 'free' },
        ]
      case 'attention':
        return [
          numericField('Temperature', object.temperature, 'free', (next) => ({ temperature: Math.max(Number.EPSILON, next) }), 'Changed attention temperature'),
          { label: 'Bridge mass', value: formatValue(object.bridgeMasses), status: 'computed' },
          { label: 'Tokens', value: object.model.tokens.join(' · '), status: 'derived' },
        ]
      case 'training':
        return [
          { label: 'Step', value: formatValue(object.step), status: 'computed' },
          numericField('Learning rate', object.learningRate, 'free', (next) => ({ learningRate: Math.max(0, next) }), 'Changed training learning rate'),
          { label: 'Loss', value: formatValue(object.lossHistory.at(-1)), status: 'computed' },
        ]
      case 'barycentric':
        return [
          tupleField('Weights', object.weights, 'free', (next) => ({ weights: next }), 'Changed barycentric weights'),
          { label: 'Weight sum', value: formatValue(object.weights.reduce((sum, value) => sum + value, 0)), status: 'computed' },
          { label: 'Labels', value: object.labels.join(' · '), status: 'derived' },
        ]
      case 'simplex':
        return [
          tupleField('Weights', object.weights, 'free', (next) => ({ weights: next }), 'Changed simplex weights'),
          numericField('Rotation X', object.rotationX, 'free', (next) => ({ rotationX: next }), 'Changed simplex X rotation'),
          numericField('Rotation Y', object.rotationY, 'free', (next) => ({ rotationY: next }), 'Changed simplex Y rotation'),
          numericField('Section', object.section, 'constrained', (next) => ({ section: next }), 'Changed simplex section'),
          numericField('Denominator', object.denominator, 'constrained', (next) => ({ denominator: Math.max(1, Math.round(next)) }), 'Changed simplex denominator'),
          { label: 'Lattice', value: formatValue(object.showLattice), status: 'free' },
        ]
      case 'numberTheory':
        return [
          numericField('Selected N', object.selectedN, 'free', (next) => {
            const selectedN = Math.max(0, Math.min(Math.round(next), object.maxN))
            return { selectedN, finiteCutoff: Math.max(object.finiteCutoff, selectedN) }
          }, 'Changed selected partition N'),
          numericField('Max N', object.maxN, 'constrained', (next) => ({ maxN: Math.max(object.selectedN, Math.round(next)) }), 'Changed partition max N'),
          numericField('Finite cutoff', object.finiteCutoff, 'constrained', (next) => ({ finiteCutoff: Math.max(object.selectedN, Math.round(next)) }), 'Changed Euler product cutoff'),
          { label: 'Theorem', value: object.revealTheorem ? 'revealed' : 'hidden', status: 'derived' },
        ]
      case 'frame':
        return [{ label: 'Title', value: object.title, status: 'derived' }, { label: 'Children', value: `${object.childIds.length} views`, status: 'derived' }, { label: 'Author', value: object.author, status: 'derived' }]
      case 'group':
        return [{ label: 'Children', value: `${object.childIds.length} views`, status: 'derived' }, { label: 'Selection', value: object.childIds.join(', '), status: 'derived' }, { label: 'Author', value: object.author, status: 'derived' }]
      case 'image':
        return [{ label: 'Alt text', value: object.alt, status: 'free' }, { label: 'Source', value: object.src.startsWith('data:') ? 'embedded image' : object.src, status: 'derived' }, { label: 'Size', value: boundsLabel(object), status: 'constrained' }]
      case 'ink':
        return [{ label: 'Strokes', value: `${object.strokes?.length ?? 1}`, status: 'derived' }, { label: 'Width', value: formatValue(object.width), status: 'free' }, { label: 'Color', value: object.color, status: 'free' }]
    }
  }, [editorMatrix, editorValue, entityId, isEditing, numericField, object, onCancel, onMatrixChange, onPatchObject, onSave, onValueChange, rangeField, tupleField])

  const structureFields: InspectorFieldSpec[] = [
    { label: 'Kind', value: object.kind, status: 'derived' },
    { label: 'Bounds', value: boundsLabel(object), status: 'constrained' },
    { label: 'Rotation', value: `${formatValue(object.rotation)}°`, status: 'free' },
    { label: 'Object ID', value: object.id, status: 'derived' },
  ]

  const constraintsFields: InspectorFieldSpec[] = [
    { label: 'Locked', value: formatValue(object.locked ?? false), status: 'constrained' },
    { label: 'Opacity', value: formatValue(object.opacity), status: 'constrained' },
    { label: 'Canvas bounds', value: `${formatValue(object.bounds.width)} × ${formatValue(object.bounds.height)}`, status: 'constrained' },
  ]

  const styleFields: InspectorFieldSpec[] = (() => {
    if (object.kind === 'text') return [{ label: 'Color', value: object.color, status: 'free' }, { label: 'Font size', value: `${formatValue(object.fontSize)} px`, status: 'free' }]
    if (object.kind === 'equation' || object.kind === 'graph' || object.kind === 'arrow' || object.kind === 'ink') return [{ label: 'Color', value: object.color, status: 'free' }, { label: 'Opacity', value: formatValue(object.opacity), status: 'constrained' }]
    if (object.kind === 'shape') return [{ label: 'Fill', value: object.fill, status: 'free' }, { label: 'Stroke', value: object.stroke, status: 'free' }]
    if (object.kind === 'matrix' || object.kind === 'geometry') return [{ label: 'Accent', value: object.accent, status: 'free' }]
    return []
  })()

  const animationTracks = Object.values(world.timelines).flatMap((timeline) => Object.values(timeline.tracks).filter((track) => (
    (track.target.kind === 'object' && track.target.objectId === object.id)
      || (track.target.kind === 'entity' && entityId !== undefined && track.target.entityId === entityId)
  )).map((track) => ({ timeline, track })))

  const supportedTabs = useMemo<InspectorTab[]>(() => {
    const supported: InspectorTab[] = []
    if (valueFields.length > 0) supported.push('values')
    if (structuredKinds.has(object.kind)) supported.push('structure')
    if (constrainedKinds.has(object.kind)) supported.push('constraints')
    if (styleCapableKinds.has(object.kind) && styleFields.length > 0) supported.push('style')
    if (entityId || bindingIds.length > 0 || linkedViewIds.length > 0 || dependentObjectIds.length > 0) supported.push('bindings')
    if (animationTracks.length > 0) supported.push('animation')
    return supported.length > 0 ? supported : ['values']
  }, [animationTracks.length, bindingIds.length, dependentObjectIds.length, entityId, linkedViewIds.length, object.kind, styleFields.length, valueFields.length])

  useEffect(() => {
    if (!supportedTabs.includes(tab)) setTab(supportedTabs[0])
  }, [supportedTabs, tab])

  const activeTab = supportedTabs.includes(tab) ? tab : supportedTabs[0]
  const hasInlineEditors = valueFields.some((field) => Boolean(field.children))

  const panel: ReactNode = activeTab === 'values' ? (
    <div className="inspector-fields">{valueFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : activeTab === 'structure' ? (
    <div className="inspector-fields">{structureFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : activeTab === 'constraints' ? (
    <div className="inspector-fields">{constraintsFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : activeTab === 'style' ? (
    <div className="inspector-fields">{styleFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : activeTab === 'bindings' ? (
    <div className="inspector-fields">
      {entityId && <InspectorField label="Entity ID" value={entityId} status="derived" />}
      {bindingIds.length > 0 && <InspectorField label="Binding IDs" value={bindingIds.join(', ')} status="derived" />}
      {linkedViewIds.length > 0 && <InspectorField label="Linked views" value={linkedViewIds.join(', ')} status="derived" />}
      {dependentObjectIds.length > 0 && <InspectorField label="Dependencies" value={dependentObjectIds.join(', ')} status="derived" detail="reverse object and semantic links" />}
    </div>
  ) : (
    <div className="inspector-fields">{animationTracks.map(({ timeline, track }) => <InspectorField key={track.id} label={timeline.name} value={`${track.id} · ${Object.keys(track.keyframes).length} keyframes`} status="derived" detail={track.target.kind === 'entity' ? `${track.target.entityId}.${track.target.path}` : track.target.path} />)}</div>
  )

  return (
    <aside className="progressive-inspector" role="dialog" aria-label={`Inspector for ${object.kind}`} onKeyDown={inputKeyDown} tabIndex={-1}>
      <header className="inspector-header">
        <div>
          <span className="inspector-kicker">semantic inspector</span>
          <h2>{object.kind}<span> · {object.id}</span></h2>
        </div>
        <div className="inspector-header-meta">
          {entityId && <span>entity <b>{entityId}</b></span>}
          {bindingIds.length > 0 && <span>{bindingIds.length} binding{bindingIds.length === 1 ? '' : 's'}</span>}
          {linkedViewIds.length + dependentObjectIds.length > 0 && <span>{linkedViewIds.length + dependentObjectIds.length} linked view{linkedViewIds.length + dependentObjectIds.length === 1 ? '' : 's'}</span>}
        </div>
      </header>

      <nav className="inspector-tabs" aria-label="Inspector sections" role="tablist">
        {tabs.filter((item) => supportedTabs.includes(item.id)).map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={activeTab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>

      <section className="inspector-panel" aria-label={`${activeTab} properties`}>
        <div className="inspector-panel-heading"><span>{activeTab}</span>{activeTab === 'values' && <small>{canEdit ? 'edit text or matrix values' : hasInlineEditors ? 'inline numbers · Enter or blur to commit' : 'read-only view'}</small>}</div>
        {panel}
      </section>

      <footer className="inspector-footer">
        {isEditing ? (
          <>
            <button type="button" className="inspector-save" onClick={onSave}>Save</button>
            <button type="button" className="inspector-cancel" onClick={onCancel}>Cancel</button>
            <span className="inspector-hint">Enter to save · Esc to cancel</span>
          </>
        ) : canEdit ? (
          <button type="button" className="inspector-edit" onClick={() => onEdit(object.id)}>Edit values</button>
        ) : hasInlineEditors ? (
          <span className="inspector-hint">Inline values commit on Enter or blur.</span>
        ) : <span className="inspector-hint">Selection stays live on the canvas.</span>}
      </footer>
    </aside>
  )
}
