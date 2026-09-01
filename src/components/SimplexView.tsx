'use client'

import { useMemo } from 'react'
import { pascalRecurrence, pointFromSimplexWeights, projectTetrahedron, normalizedSimplexLatticePoints, type EulerRotation, type Tetrahedron, type Vec3 } from '../domain/math/simplex'
import type { SimplexObject, WorldAction } from '../domain/world/types'

type Props = {
  object: SimplexObject
  run: (action: WorldAction) => void
}

const humanPut = (summary: string, object: SimplexObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

const TETRAHEDRON: Tetrahedron = [
  { x: -2.3, y: -1.35, z: -1.15 },
  { x: 2.3, y: -1.35, z: -1.15 },
  { x: 0, y: 2.25, z: -1.15 },
  { x: 0, y: 0, z: 2.25 },
]
const EDGE_PAIRS: Array<[number, number]> = [[0, 1], [1, 2], [2, 0], [0, 3], [1, 3], [2, 3]]
const LABELS = ['A', 'B', 'C', 'D']

function fmt(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function lerp(first: Vec3, second: Vec3, amount: number): Vec3 {
  return {
    x: first.x * (1 - amount) + second.x * amount,
    y: first.y * (1 - amount) + second.y * amount,
    z: first.z * (1 - amount) + second.z * amount,
  }
}

export default function SimplexView({ object, run }: Props) {
  const width = Math.max(320, object.bounds.width)
  const height = Math.max(245, object.bounds.height)
  const plotHeight = height - 108
  const center = { x: width * 0.48, y: plotHeight * 0.55 }
  const rotation: EulerRotation = { x: object.rotationX, y: object.rotationY, z: 0 }
  const projection = { scale: Math.min(width, plotHeight) / 6.8, distance: 8, offset: center }
  const projected = useMemo(() => projectTetrahedron(TETRAHEDRON, rotation, projection), [object.rotationX, object.rotationY, width, plotHeight])
  const point = pointFromSimplexWeights(TETRAHEDRON, object.weights)
  const projectedPoint = projectTetrahedron([point, point, point, point], rotation, projection)[0]
  const section = Math.max(0, Math.min(1, object.section))
  const section3D = TETRAHEDRON.slice(0, 3).map((vertex) => lerp(vertex, TETRAHEDRON[3], section)) as [Vec3, Vec3, Vec3]
  const sectionPoints = projectTetrahedron([...section3D, section3D[0]], rotation, projection).slice(0, 3)
  const recurrence = pascalRecurrence(Math.max(1, Math.round(object.denominator)), 3)
  const lattice = object.showLattice ? normalizedSimplexLatticePoints(Math.max(1, Math.round(object.denominator))) : []

  const update = (summary: string, patch: Partial<SimplexObject>) => run(humanPut(summary, { ...object, ...patch }))

  return (
    <div className="simplex-view" onPointerDown={(event) => event.stopPropagation()}>
      <svg className="simplex-canvas" viewBox={`0 0 ${width} ${plotHeight}`} aria-label="Rotatable tetrahedral probability simplex">
        <defs><linearGradient id={`simplex-fill-${object.id}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#7c5cff" stopOpacity=".24" /><stop offset="1" stopColor="#4c9f9a" stopOpacity=".12" /></linearGradient></defs>
        <rect className="simplex-paper" width={width} height={plotHeight} rx="8" />
        <text className="simplex-kicker" x="16" y="21">4-WEIGHT PROBABILITY SIMPLEX</text>
        <polygon className="simplex-face" points={projected.slice(0, 3).map((item) => `${item.x},${item.y}`).join(' ')} />
        {sectionPoints.length === 3 && <polygon className="simplex-section" points={sectionPoints.map((item) => `${item.x},${item.y}`).join(' ')} />}
        {EDGE_PAIRS.map(([first, second]) => <line key={`${first}-${second}`} className="simplex-edge" x1={projected[first].x} y1={projected[first].y} x2={projected[second].x} y2={projected[second].y} />)}
        {lattice.map((weights, index) => {
          const latticePoint = pointFromSimplexWeights(TETRAHEDRON, weights)
          const mapped = projectTetrahedron([latticePoint, latticePoint, latticePoint, latticePoint], rotation, projection)[0]
          return <circle key={`lattice-${index}`} className="simplex-lattice-point" cx={mapped.x} cy={mapped.y} r="2.1" />
        })}
        <circle className="simplex-interior-point" cx={projectedPoint.x} cy={projectedPoint.y} r="7" />
        <text className="simplex-interior-label" x={projectedPoint.x + 11} y={projectedPoint.y - 9}>P(α,β,γ,δ)</text>
        {projected.map((vertex, index) => <g key={LABELS[index]}><circle className="simplex-vertex" cx={vertex.x} cy={vertex.y} r="4.5" /><text className="simplex-vertex-label" x={vertex.x + 9} y={vertex.y - 9}>{LABELS[index]}</text></g>)}
        <text className="simplex-section-label" x={width - 18} y={27} textAnchor="end">section {Math.round(section * 100)}%</text>
      </svg>
      <div className="simplex-readout">
        <div className="simplex-weight-row">{object.weights.map((weight, index) => <span key={LABELS[index]}><b>{LABELS[index]}</b> {fmt(weight)}</span>)}<strong>Σ {fmt(object.weights.reduce((sum, weight) => sum + weight, 0))}</strong></div>
        <div className="simplex-count-row"><b>{object.showLattice ? lattice.length : recurrence.total}</b> lattice points · <code>L₃({Math.round(object.denominator)}) = C({Math.round(object.denominator) + 3}, 3)</code></div>
        <div className="simplex-pascal-row">Pascal: {recurrence.previous} + {recurrence.lowerDimension} = {recurrence.sum} <span>{recurrence.verified ? '✓ verified' : '—'}</span></div>
      </div>
      <div className="simplex-controls" onPointerDown={(event) => event.stopPropagation()}>
        {object.weights.map((weight, index) => <label key={LABELS[index]}><span>{LABELS[index]} <b>{fmt(weight)}</b></span><input type="range" min="0" max="1" step="0.01" value={weight} aria-label={`${LABELS[index]} simplex weight`} onChange={(event) => { const next = [...object.weights] as [number, number, number, number]; next[index] = Number(event.target.value); const total = next.reduce((sum, item) => sum + item, 0) || 1; update(`Adjusted simplex weight ${LABELS[index]}`, { weights: next.map((item) => item / total) as [number, number, number, number] }) }} /></label>)}
        <label><span>rotate X <b>{fmt(object.rotationX)}</b></span><input type="range" min={-Math.PI} max={Math.PI} step="0.02" value={object.rotationX} aria-label="Rotate simplex X" onChange={(event) => update('Rotated simplex around X', { rotationX: Number(event.target.value) })} /></label>
        <label><span>rotate Y <b>{fmt(object.rotationY)}</b></span><input type="range" min={-Math.PI} max={Math.PI} step="0.02" value={object.rotationY} aria-label="Rotate simplex Y" onChange={(event) => update('Rotated simplex around Y', { rotationY: Number(event.target.value) })} /></label>
        <label><span>section <b>{Math.round(section * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={object.section} aria-label="Simplex section sweep" onChange={(event) => update('Swept simplex section', { section: Number(event.target.value) })} /></label>
        <label><span>denominator <b>{Math.round(object.denominator)}</b></span><input type="range" min="1" max="12" step="1" value={object.denominator} aria-label="Simplex lattice denominator" onChange={(event) => update('Changed simplex lattice denominator', { denominator: Number(event.target.value) })} /></label>
        <button type="button" onClick={() => update(object.showLattice ? 'Hid simplex lattice' : 'Showed simplex lattice', { showLattice: !object.showLattice })}>{object.showLattice ? 'hide lattice' : 'show lattice'}</button>
      </div>
    </div>
  )
}
