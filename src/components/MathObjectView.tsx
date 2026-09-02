'use client'

import type { EquationObject, GeometryObject, GraphObject, MatrixObject, WorldAction, WorldState } from '../domain/world/types'
import GammaProbabilityView from './GammaProbabilityView'
import LiveGeometry from './LiveGeometry'
import LiveGraph from './LiveGraph'
import MatrixPlane from './MatrixPlane'
import { Tex } from './Tex'

export default function MathObjectView({
  object,
  world,
  run,
}: {
  object: EquationObject | GraphObject | GeometryObject | MatrixObject
  world: WorldState
  run: (action: WorldAction) => void
}) {
  if (object.kind === 'equation') return <div className="math-equation-object"><Tex latex={object.latex} display ariaLabel={object.latex} /></div>
  if (object.kind === 'graph') return object.visualization === 'gamma-density'
    ? <GammaProbabilityView object={object} run={run} />
    : <LiveGraph object={object} world={world} run={run} />
  if (object.kind === 'geometry') return <LiveGeometry object={object} run={run} />
  return <MatrixPlane object={object} world={world} run={run} />
}
