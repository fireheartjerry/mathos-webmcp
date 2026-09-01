'use client'

import { useMemo, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { WorldObject } from '../../domain/world/types'
import InspectorField from './InspectorField'
import type { InspectorFieldSpec, InspectorTab, ProgressiveInspectorProps } from './types'
import '../../styles/inspector.css'

const tabs: Array<{ id: InspectorTab; label: string }> = [
  { id: 'values', label: 'Values' },
  { id: 'structure', label: 'Structure' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'style', label: 'Style' },
  { id: 'bindings', label: 'Bindings' },
  { id: 'animation', label: 'Animation' },
]

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  if (typeof value === 'boolean') return value ? 'on' : 'off'
  if (Array.isArray(value)) return value.map((entry) => formatValue(entry)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return value == null ? '—' : String(value)
}

const boundsLabel = (object: WorldObject) => `${formatValue(object.bounds.width)} × ${formatValue(object.bounds.height)} @ ${formatValue(object.bounds.x)}, ${formatValue(object.bounds.y)}`

const linkedViewIdsFor = (object: WorldObject): string[] => {
  if (object.kind === 'graph') return [object.equationId]
  if (object.kind === 'matrix') return object.sourceIds
  if (object.kind === 'training') return [object.linkedAttentionId]
  if (object.kind === 'barycentric') return object.linkedAttentionId ? [object.linkedAttentionId] : []
  if (object.kind === 'simplex') return []
  if (object.kind === 'numberTheory') return object.linkedSimplexId ? [object.linkedSimplexId] : []
  return object.kind === 'frame' || object.kind === 'group' ? object.childIds : []
}

const entityIdFor = (object: WorldObject): string | undefined => (
  'entityId' in object && typeof object.entityId === 'string' ? object.entityId : undefined
)

const bindingIdsFor = (object: WorldObject, world: ProgressiveInspectorProps['world']): string[] => {
  const declared = 'bindingIds' in object && Array.isArray(object.bindingIds) ? object.bindingIds : []
  const discovered = Object.values(world.bindings)
    .filter((binding) => binding.target.objectId === object.id)
    .map((binding) => binding.id)
  return [...new Set([...declared, ...discovered])]
}

const EmptyPanel = ({ children }: { children: string }) => (
  <div className="inspector-empty"><span>◌</span><p>{children}</p></div>
)

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
  onSave,
  onCancel,
}: ProgressiveInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('values')
  const isEditing = editorId === object.id
  const canEdit = object.kind === 'text' || object.kind === 'equation' || object.kind === 'frame' || object.kind === 'matrix'
  const entityId = entityIdFor(object)
  const bindingIds = bindingIdsFor(object, world)
  const linkedViewIds = linkedViewIdsFor(object)

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

  const valueFields = useMemo<InspectorFieldSpec[]>(() => {
    switch (object.kind) {
      case 'text':
        return [
          editableText('Content', object.text),
          { label: 'Font size', value: `${formatValue(object.fontSize)} px`, status: 'free' },
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
      case 'graph':
        return [
          { label: 'Equation view', value: object.equationId, status: 'derived' },
          { label: 'X domain', value: `[${formatValue(object.xDomain[0])}, ${formatValue(object.xDomain[1])}]`, status: 'constrained' },
          { label: 'Y domain', value: `[${formatValue(object.yDomain[0])}, ${formatValue(object.yDomain[1])}]`, status: 'constrained' },
          { label: 'Tangent', value: object.showTangentAt == null ? 'off' : `x = ${formatValue(object.showTangentAt)}`, status: 'computed' },
        ]
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
          { label: 'Temperature', value: formatValue(object.temperature), status: 'free' },
          { label: 'Bridge mass', value: formatValue(object.bridgeMasses), status: 'computed' },
          { label: 'Tokens', value: object.model.tokens.join(' · '), status: 'derived' },
        ]
      case 'training':
        return [
          { label: 'Step', value: formatValue(object.step), status: 'computed' },
          { label: 'Learning rate', value: formatValue(object.learningRate), status: 'free' },
          { label: 'Loss', value: formatValue(object.lossHistory.at(-1)), status: 'computed' },
        ]
      case 'barycentric':
        return [
          { label: 'Weights', value: formatValue(object.weights), status: 'free' },
          { label: 'Weight sum', value: formatValue(object.weights.reduce((sum, value) => sum + value, 0)), status: 'computed' },
          { label: 'Labels', value: object.labels.join(' · '), status: 'derived' },
        ]
      case 'simplex':
        return [
          { label: 'Weights', value: formatValue(object.weights), status: 'free' },
          { label: 'Section', value: `${formatValue(object.section)} / ${formatValue(object.denominator)}`, status: 'constrained' },
          { label: 'Lattice', value: formatValue(object.showLattice), status: 'free' },
        ]
      case 'numberTheory':
        return [
          { label: 'Selected N', value: formatValue(object.selectedN), status: 'free' },
          { label: 'Finite cutoff', value: formatValue(object.finiteCutoff), status: 'constrained' },
          { label: 'Theorem', value: object.revealTheorem ? 'revealed' : 'hidden', status: 'derived' },
        ]
      case 'frame':
        return [editableText('Title', object.title), { label: 'Children', value: `${object.childIds.length} views`, status: 'derived' }, { label: 'Author', value: object.author, status: 'derived' }]
      case 'group':
        return [{ label: 'Children', value: `${object.childIds.length} views`, status: 'derived' }, { label: 'Selection', value: object.childIds.join(', '), status: 'derived' }, { label: 'Author', value: object.author, status: 'derived' }]
      case 'image':
        return [{ label: 'Alt text', value: object.alt, status: 'free' }, { label: 'Source', value: object.src.startsWith('data:') ? 'embedded image' : object.src, status: 'derived' }, { label: 'Size', value: boundsLabel(object), status: 'constrained' }]
      case 'ink':
        return [{ label: 'Strokes', value: `${object.strokes?.length ?? 1}`, status: 'derived' }, { label: 'Width', value: formatValue(object.width), status: 'free' }, { label: 'Color', value: object.color, status: 'free' }]
    }
  }, [editorMatrix, editorValue, isEditing, object, onCancel, onMatrixChange, onSave, onValueChange])

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
    if (object.kind === 'image') return [{ label: 'Alt text', value: object.alt, status: 'free' }]
    return []
  })()

  const animationTracks = Object.values(world.timelines).flatMap((timeline) => Object.values(timeline.tracks).filter((track) => (
    track.target.kind === 'object' && track.target.objectId === object.id
  )).map((track) => ({ timeline, track })))

  const panel: ReactNode = tab === 'values' ? (
    <div className="inspector-fields">{valueFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : tab === 'structure' ? (
    <div className="inspector-fields">{structureFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : tab === 'constraints' ? (
    <div className="inspector-fields">{constraintsFields.map((field) => <InspectorField key={field.label} {...field} />)}</div>
  ) : tab === 'style' ? (
    styleFields.length ? <div className="inspector-fields">{styleFields.map((field) => <InspectorField key={field.label} {...field} />)}</div> : <EmptyPanel>Style controls for this view are coming next.</EmptyPanel>
  ) : tab === 'bindings' ? (
    entityId || bindingIds.length || linkedViewIds.length ? (
      <div className="inspector-fields">
        {entityId && <InspectorField label="Entity ID" value={entityId} status="derived" />}
        {bindingIds.length > 0 && <InspectorField label="Binding IDs" value={bindingIds.join(', ')} status="derived" />}
        {linkedViewIds.length > 0 && <InspectorField label="Linked views" value={linkedViewIds.join(', ')} status="derived" />}
      </div>
    ) : <EmptyPanel>This view is local. Add a semantic entity to expose bindings here.</EmptyPanel>
  ) : animationTracks.length ? (
    <div className="inspector-fields">{animationTracks.map(({ timeline, track }) => <InspectorField key={track.id} label={timeline.name} value={`${track.id} · ${Object.keys(track.keyframes).length} keyframes`} status="derived" />)}</div>
  ) : <EmptyPanel>No animation tracks target this view yet.</EmptyPanel>

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
          {linkedViewIds.length > 0 && <span>{linkedViewIds.length} linked view{linkedViewIds.length === 1 ? '' : 's'}</span>}
        </div>
      </header>

      <nav className="inspector-tabs" aria-label="Inspector sections" role="tablist">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>

      <section className="inspector-panel" aria-label={`${tab} properties`}>
        <div className="inspector-panel-heading"><span>{tab}</span>{tab === 'values' && <small>{canEdit ? 'double-click or edit values' : 'read-only view'}</small>}</div>
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
        ) : <span className="inspector-hint">Selection stays live on the canvas.</span>}
      </footer>
    </aside>
  )
}
