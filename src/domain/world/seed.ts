import type { WorldObject, WorldState } from './types'

export const HERO_EQUATION_ID = 'eq_integral'
export const HERO_GRAPH_ID = 'graph_integrand'
export const SOURCE_IMAGE_ID = 'source'

export function createSeedWorld(): WorldState {
  const objects: WorldObject[] = [
    { id: 'problem', kind: 'frame', title: 'Integration by parts', childIds: [SOURCE_IMAGE_ID, HERO_EQUATION_ID], bounds: { x: 80, y: 80, width: 660, height: 520 }, rotation: 0, author: 'human', opacity: 1 },
    { id: SOURCE_IMAGE_ID, kind: 'image', src: '/demo/calculus-source.png', alt: 'Photographed integration-by-parts problem', bounds: { x: 120, y: 150, width: 280, height: 210 }, rotation: -1.2, author: 'human', opacity: 1 },
    { id: HERO_EQUATION_ID, kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713', bounds: { x: 440, y: 155, width: 240, height: 76 }, rotation: 0, author: 'human', opacity: 0 },
    { id: 'eq_integrand', kind: 'equation', latex: 'a x e^x', color: '#171713', bounds: { x: 785, y: 92, width: 210, height: 54 }, rotation: 0, author: 'agent', opacity: 0 },
    { id: HERO_GRAPH_ID, kind: 'graph', equationId: 'eq_integrand', xDomain: [-2, 2], yDomain: [-1, 16], color: '#7c5cff', parameters: { a: 1 }, showTangentAt: 1, shadeIntegral: [0, 1], bounds: { x: 740, y: 150, width: 460, height: 330 }, rotation: 0, author: 'agent', opacity: 0 },
  ]
  return {
    version: 1,
    title: 'Mathburst',
    objects: Object.fromEntries(objects.map((object) => [object.id, object])),
    order: objects.map((object) => object.id),
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    history: [],
    future: [],
    activity: [],
    session: { attempts: 0, helpShown: [], currentMisconception: null, reconstructionStatus: 'source' },
    reconstruction: null,
  }
}
