import type { Point, WorldObject, WorldState } from './types'

export const HERO_EQUATION_ID = 'eq_integral'
export const HERO_GRAPH_ID = 'graph_integrand'
export const SOURCE_IMAGE_ID = 'source'

export const DEMO_SCENES = {
  calculus: { label: 'Calculus', title: 'Integration by parts', center: { x: 640, y: 340 } satisfies Point, zoom: 0.95 },
  geometry: { label: 'Geometry', title: 'Homothety & tangency', center: { x: 1840, y: 350 } satisfies Point, zoom: 1 },
  matrix: { label: 'Transformer', title: 'Attention as geometry', center: { x: 2900, y: 350 } satisfies Point, zoom: 1 },
} as const

export type DemoScene = keyof typeof DEMO_SCENES

export function createSeedWorld(): WorldState {
  const objects: WorldObject[] = [
    { id: 'problem', kind: 'frame', title: 'Integration by parts', childIds: [SOURCE_IMAGE_ID, HERO_EQUATION_ID], bounds: { x: 80, y: 80, width: 660, height: 520 }, rotation: 0, author: 'human', opacity: 1 },
    { id: SOURCE_IMAGE_ID, kind: 'image', src: '/demo/calculus-source.png', alt: 'Photographed integration-by-parts problem', bounds: { x: 120, y: 150, width: 280, height: 210 }, rotation: -1.2, author: 'human', opacity: 1 },
    { id: HERO_EQUATION_ID, kind: 'equation', latex: '\\int x e^x\\,dx', color: '#171713', bounds: { x: 440, y: 155, width: 240, height: 76 }, rotation: 0, author: 'human', opacity: 0 },
    { id: 'eq_integrand', kind: 'equation', latex: 'a x e^x', color: '#171713', bounds: { x: 785, y: 92, width: 210, height: 54 }, rotation: 0, author: 'agent', opacity: 0 },
    { id: HERO_GRAPH_ID, kind: 'graph', equationId: 'eq_integrand', xDomain: [-2, 2], yDomain: [-1, 16], color: '#7c5cff', parameters: { a: 1 }, showTangentAt: 1, shadeIntegral: [0, 1], bounds: { x: 740, y: 150, width: 460, height: 330 }, rotation: 0, author: 'agent', opacity: 0 },
    {
      id: 'geometry_problem', kind: 'frame', title: 'Homothety & tangency',
      childIds: ['geometry_construction', 'geometry_prompt', 'geometry_ratio', 'geometry_hint'],
      bounds: { x: 1450, y: 80, width: 780, height: 540 }, rotation: 0, author: 'human', opacity: 1,
    },
    {
      id: 'geometry_construction', kind: 'geometry', accent: '#7c5cff',
      bounds: { x: 1490, y: 145, width: 500, height: 390 }, rotation: 0, author: 'agent', opacity: 1,
      primitives: [
        { kind: 'point', id: 'A', at: { x: 70, y: 310 }, label: 'A', draggable: true },
        { kind: 'point', id: 'B', at: { x: 430, y: 310 }, label: 'B', draggable: true },
        { kind: 'point', id: 'C', at: { x: 250, y: 58 }, label: 'C' },
        { kind: 'polygon', id: 'triangle-ABC', points: ['A', 'B', 'C'] },
        { kind: 'line', id: 'center-line', through: ['A', 'B'] },
        { kind: 'segment', id: 'side-AC', from: 'A', to: 'C' },
        { kind: 'segment', id: 'side-BC', from: 'B', to: 'C' },
        { kind: 'midpoint', id: 'O', of: ['A', 'B'], label: 'O' },
        { kind: 'circle', id: 'source-circle', center: 'A', through: 'O' },
        { kind: 'homothety', id: 'A2', center: 'O', source: 'A', factor: -0.52, label: 'A′' },
        { kind: 'homothety', id: 'B2', center: 'O', source: 'B', factor: -0.52, label: 'B′' },
        { kind: 'homothety', id: 'C2', center: 'O', source: 'C', factor: -0.52, label: 'C′' },
        { kind: 'polygon', id: 'triangle-image', points: ['A2', 'B2', 'C2'] },
        { kind: 'circle', id: 'image-circle', center: 'A2', through: 'O' },
        { kind: 'segment', id: 'homothety-ray', from: 'A', to: 'A2' },
        { kind: 'angle', id: 'angle-A', a: 'B', vertex: 'A', b: 'C' },
      ],
    },
    {
      id: 'geometry_prompt', kind: 'text', text: 'Prove the circles stay tangent after the homothety.',
      color: '#171713', fontSize: 24, bounds: { x: 2020, y: 150, width: 170, height: 112 },
      rotation: 0, author: 'human', opacity: 1,
    },
    {
      id: 'geometry_ratio', kind: 'equation', latex: 'h_{O,-0.52}', color: '#7c5cff',
      bounds: { x: 2022, y: 292, width: 166, height: 62 }, rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: 'geometry_hint', kind: 'text', text: 'Drag A or B. Every dependent point and circle recomputes.',
      color: '#817d73', fontSize: 15, bounds: { x: 2022, y: 400, width: 170, height: 82 },
      rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: 'transformer_problem', kind: 'frame', title: 'Attention as geometry',
      childIds: ['query_vector', 'key_vector', 'value_vector', 'transformer_matrix', 'transformer_equation', 'attention_equation', 'transformer_note'],
      bounds: { x: 2470, y: 80, width: 860, height: 540 }, rotation: 0, author: 'human', opacity: 1,
    },
    {
      id: 'query_vector', kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 2.2, y: 0.8 }, color: '#171713',
      bounds: { x: 2510, y: 145, width: 1, height: 1 }, rotation: 0, author: 'human', opacity: 0,
    },
    {
      id: 'key_vector', kind: 'arrow', from: { x: 0, y: 0 }, to: { x: -0.6, y: 2.4 }, color: '#171713',
      bounds: { x: 2510, y: 145, width: 1, height: 1 }, rotation: 0, author: 'human', opacity: 0,
    },
    {
      id: 'value_vector', kind: 'arrow', from: { x: 0, y: 0 }, to: { x: 1.2, y: -1.8 }, color: '#171713',
      bounds: { x: 2510, y: 145, width: 1, height: 1 }, rotation: 0, author: 'human', opacity: 0,
    },
    {
      id: 'transformer_matrix', kind: 'matrix', values: [[0.85, -0.65], [0.55, 1.1]],
      sourceIds: ['query_vector', 'key_vector', 'value_vector'], accent: '#7c5cff',
      bounds: { x: 2510, y: 145, width: 560, height: 390 }, rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: 'transformer_equation', kind: 'equation', latex: 'Q=XW_Q', color: '#171713',
      bounds: { x: 3105, y: 150, width: 178, height: 66 }, rotation: 0, author: 'human', opacity: 1,
    },
    {
      id: 'attention_equation', kind: 'equation', latex: '\\operatorname{softmax}(QK^\\top)', color: '#7c5cff',
      bounds: { x: 3096, y: 275, width: 194, height: 66 }, rotation: 0, author: 'agent', opacity: 1,
    },
    {
      id: 'transformer_note', kind: 'text', text: 'Double-click W_Q. The transformed query, key, and value geometry moves live.',
      color: '#817d73', fontSize: 16, bounds: { x: 3106, y: 390, width: 170, height: 94 },
      rotation: 0, author: 'agent', opacity: 1,
    },
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
