'use client'

import { useMemo, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  normalizedSimplexLatticePoints,
  pascalRecurrence,
  pointFromSimplexWeights,
  projectTetrahedron,
  rotateAndProject,
  setSimplexWeight,
  type EulerRotation,
  type SimplexWeights,
  type Tetrahedron,
  type Vec3,
} from '../domain/math/simplex'
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
const GREEK = ['α', 'β', 'γ', 'δ']
const fmt = (value: number) => value.toFixed(3)
const short = (value: number, digits = 2) => Number(value.toFixed(digits)).toString()

function lerp(first: Vec3, second: Vec3, amount: number): Vec3 {
  return {
    x: first.x * (1 - amount) + second.x * amount,
    y: first.y * (1 - amount) + second.y * amount,
    z: first.z * (1 - amount) + second.z * amount,
  }
}

type Draft = Partial<Pick<SimplexObject, 'weights' | 'section' | 'rotationX' | 'rotationY' | 'denominator'>>

/**
 * A mathematically projected tetrahedron, not a physics engine. The hero
 * control is δ: setting it redistributes the remainder so α, β, γ keep their
 * ratios and the four weights still sum to one. The section plane δ = t cuts
 * a triangle; when t equals the point's δ, P lies on that triangle with
 * barycentrics (α, β, γ)/(1 − δ), which is the previous act's triangle.
 */
export default function SimplexView({ object, run }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const width = Math.max(320, object.bounds.width)
  const height = Math.max(245, object.bounds.height)
  const plotWidth = width - 232
  const plotHeight = height - 20
  const center = { x: plotWidth * 0.5, y: plotHeight * 0.53 }
  const weights = (draft?.weights ?? object.weights) as SimplexWeights
  const section = Math.max(0, Math.min(1, draft?.section ?? object.section))
  const rotationX = draft?.rotationX ?? object.rotationX
  const rotationY = draft?.rotationY ?? object.rotationY
  const denominator = Math.max(1, Math.round(draft?.denominator ?? object.denominator))
  const rotation: EulerRotation = { x: rotationX, y: rotationY, z: 0 }
  const projection = { scale: Math.min(plotWidth, plotHeight) / 6.4, distance: 8, offset: center }
  const projected = useMemo(() => projectTetrahedron(TETRAHEDRON, rotation, projection), [rotationX, rotationY, plotWidth, plotHeight])
  const point3D = pointFromSimplexWeights(TETRAHEDRON, weights)
  const projectedPoint = rotateAndProject(point3D, rotation, projection)
  const section3D = TETRAHEDRON.slice(0, 3).map((vertex) => lerp(vertex, TETRAHEDRON[3], section)) as [Vec3, Vec3, Vec3]
  const sectionPoints = section3D.map((vertex) => rotateAndProject(vertex, rotation, projection))
  const recurrence = pascalRecurrence(denominator, 3)
  const lattice = useMemo(() => object.showLattice ? normalizedSimplexLatticePoints(denominator) : [], [object.showLattice, denominator])
  const onSection = Math.abs(section - weights[3]) < 0.012
  const sectionWeights = weights[3] < 0.999
    ? [weights[0], weights[1], weights[2]].map((weight) => weight / (1 - weights[3]))
    : [1 / 3, 1 / 3, 1 / 3]
  const sum = weights.reduce((total, weight) => total + weight, 0)

  const commit = (summary: string, patch: Partial<SimplexObject>) => {
    setDraft(null)
    const next: SimplexObject = { ...object, ...patch }
    if (JSON.stringify(next) === JSON.stringify(object)) return
    run(humanPut(summary, next))
  }
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  const slider = (
    label: string,
    value: number,
    range: { min: number; max: number; step: number },
    onDraft: (value: number) => Draft,
    summary: (value: number) => string,
    extra?: { target?: string; className?: string },
  ) => (
    <label className={extra?.className}>
      <span>{label} <b>{Number.isInteger(range.step) ? String(Math.round(value)) : fmt(value)}</b></span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-label={label}
        data-demo-target={extra?.target}
        onChange={(event) => setDraft((current) => ({ ...(current ?? {}), ...onDraft(Number(event.target.value)) }))}
        onPointerUp={() => commit(summary(value), draft ?? {})}
        onKeyUp={() => commit(summary(value), draft ?? {})}
        onBlur={() => { if (draft) commit(summary(value), draft) }}
      />
    </label>
  )

  return (
    <div className="simplex-view" onPointerDown={stop}>
      <svg className="simplex-canvas" viewBox={`0 0 ${plotWidth} ${plotHeight}`} aria-label="Projected tetrahedral probability simplex">
        <rect className="simplex-paper" width={plotWidth} height={plotHeight} />
        <text className="simplex-kicker" x="16" y="19">4-WEIGHT PROBABILITY SIMPLEX · PERSPECTIVE PROJECTION</text>
        <polygon className="simplex-face" points={projected.slice(0, 3).map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(' ')} />
        {EDGE_PAIRS.map(([first, second]) => <line key={`${first}-${second}`} className="simplex-edge" x1={projected[first].x} y1={projected[first].y} x2={projected[second].x} y2={projected[second].y} />)}
        {lattice.map((latticeWeights, index) => {
          const mapped = rotateAndProject(pointFromSimplexWeights(TETRAHEDRON, latticeWeights), rotation, projection)
          const onPlane = Math.abs(latticeWeights[3] - section) < 1e-9
          return <circle key={`lattice-${index}`} className={`simplex-lattice-point${onPlane ? ' is-on-section' : ''}`} cx={mapped.x} cy={mapped.y} r={onPlane ? 2.8 : 2} />
        })}
        <polygon className={`simplex-section${onSection ? ' is-holding-point' : ''}`} points={sectionPoints.map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(' ')} />
        {sectionPoints.map((vertex, index) => (
          <text key={`section-${index}`} className="simplex-section-vertex" x={vertex.x + 6} y={vertex.y - 5}>{LABELS[index]}<tspan baselineShift="sub" fontSize="8">t</tspan></text>
        ))}
        <circle className={`simplex-interior-point${onSection ? ' is-on-section' : ''}`} cx={projectedPoint.x} cy={projectedPoint.y} r="7" />
        <text className="simplex-interior-label" x={projectedPoint.x + 11} y={projectedPoint.y - 9}>P [{weights.map((weight) => weight.toFixed(2)).join(' : ')}]</text>
        {projected.map((vertex, index) => <g key={LABELS[index]}><circle className="simplex-vertex" cx={vertex.x} cy={vertex.y} r="4.5" /><text className="simplex-vertex-label" x={vertex.x + 9} y={vertex.y - 9}>{LABELS[index]}</text></g>)}
        <text className="simplex-section-label" x={plotWidth - 16} y={19} textAnchor="end">section δ = {section.toFixed(2)}{onSection ? ' · holds P' : ''}</text>
      </svg>

      <aside className="simplex-side" onPointerDown={stop}>
        <div className="simplex-weight-grid">
          {weights.map((weight, index) => (
            <div key={LABELS[index]} className={index === 3 ? 'is-hero' : undefined}>
              {slider(
                `${GREEK[index]} · ${LABELS[index]}`,
                weight,
                { min: 0, max: 1, step: 0.01 },
                (value) => ({ weights: setSimplexWeight(weights, index, value) }),
                (value) => `Set ${GREEK[index]} to ${short(value)}; the other weights keep their ratios`,
                { target: index === 3 ? 'simplex-weight-delta' : undefined },
              )}
            </div>
          ))}
          <strong>Σ = {fmt(sum)}</strong>
        </div>
        <div className="simplex-section-control">
          {slider('section plane δ = t', section, { min: 0, max: 1, step: 0.01 }, (value) => ({ section: value }), (value) => `Swept the section plane to δ = ${short(value)}`, { target: 'simplex-section', className: 'is-section' })}
          <p className={onSection ? 'is-active' : undefined}>
            {onSection
              ? <>P lies on this triangle with barycentrics [{sectionWeights.map((weight) => weight.toFixed(3)).join(' : ')}] = (α, β, γ)/(1 − δ)</>
              : <>the section at δ = t is a triangle; sweep to t = {weights[3].toFixed(2)} to recall the barycentric triangle holding P</>}
          </p>
        </div>
        <div className="simplex-lattice-row">
          <b>{recurrence.total}</b> lattice points · L₃({denominator}) = C({denominator + 3}, 3)
          <small>Pascal: {recurrence.previous} + {recurrence.lowerDimension} = {recurrence.sum} {recurrence.verified ? '✓' : ''}</small>
        </div>
        <details className="simplex-orbit">
          <summary>orbit · lattice</summary>
          {slider('rotate X', rotationX, { min: -Math.PI, max: Math.PI, step: 0.02 }, (value) => ({ rotationX: value }), () => 'Orbited the simplex')}
          {slider('rotate Y', rotationY, { min: -Math.PI, max: Math.PI, step: 0.02 }, (value) => ({ rotationY: value }), () => 'Orbited the simplex')}
          {slider('denominator N', denominator, { min: 1, max: 12, step: 1 }, (value) => ({ denominator: Math.round(value) }), (value) => `Changed the lattice denominator to ${Math.round(value)}`)}
          <button type="button" onClick={() => commit(object.showLattice ? 'Hid the simplex lattice' : 'Showed the simplex lattice', { showLattice: !object.showLattice })}>{object.showLattice ? 'hide lattice' : 'show lattice'}</button>
        </details>
      </aside>
    </div>
  )
}
