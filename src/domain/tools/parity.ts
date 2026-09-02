/**
 * Parity tools: the verbs a learner has with pen, keyboard and timeline that
 * the agent lacked — free ink, targeted edits of text / equations / shapes /
 * matrices / graphs / arrows, and authoring or driving animation timelines.
 *
 * Every mutation goes through bridge.runAgentAction, so it is attributed to
 * the agent, visible in the activity rail and undoable like a human edit.
 */
import { evaluateLatexAt } from '../math/graph'
import type { AnimationKeyframe, AnimationTimeline, AnimationTrack, AnimationValue } from '../animation/types'
import type { Bounds, Point, WorldObject, WorldOperation, WorldState } from '../world/types'
import {
  action, boundsSchema, changedIds, emptySchema, isBounds, isPair, isPoint, isRecord, isStringArray, isStringNumberMap,
  requiredString, schema, tool, values,
} from './definitions'
import type { ToolResult, WorldBridge, WorldTool } from './definitions'

const PEN = { color: '#171713', width: 3, opacity: 1 }
const HIGHLIGHTER = { color: '#7c5cff', width: 18, opacity: 0.34 }
const SHAPE_PADDING = 6
const MAX_SAMPLES = 400
const MAX_POINTS = 4000
const SCALAR_PATHS = new Set(['opacity', 'rotation', 'bounds.x', 'bounds.y', 'bounds.width', 'bounds.height', 'drawProgress'])
const CAMERA_PATHS = new Set(['x', 'y', 'zoom'])

const pointSchema = { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false }
const pointsSchema = { type: 'array', minItems: 2, items: pointSchema }
const round = (value: number, places = 2) => Number(value.toFixed(places))
const finiteNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number.`)
  return value
}
const optionalNumber = (value: unknown, field: string): number | undefined => (value === undefined ? undefined : finiteNumber(value, field))
const optionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`)
  return value
}
const unavailable = (feature: string): ToolResult => ({ ok: false, summary: 'No changes made', error: `${feature} is not available on this page.` })

function objectOfKind<K extends WorldObject['kind']>(world: WorldState, id: unknown, kind: K, field = 'objectId'): Extract<WorldObject, { kind: K }> {
  const objectId = requiredString(id, field)
  const object = world.objects[objectId]
  if (!object) throw new Error(`Object ${objectId} does not exist.`)
  if (object.kind !== kind) throw new Error(`Object ${objectId} is a ${object.kind}, not a ${kind}.`)
  return object as Extract<WorldObject, { kind: K }>
}

/** Fit bounds around world points with padding, returning the points relative to the new origin. */
function fitPoints(groups: Point[][], padding: number): { bounds: Bounds; local: Point[][] } {
  const flat = groups.flat()
  if (!flat.length) throw new Error('At least one point is required.')
  const minX = Math.min(...flat.map((point) => point.x)) - padding
  const minY = Math.min(...flat.map((point) => point.y)) - padding
  const maxX = Math.max(...flat.map((point) => point.x)) + padding
  const maxY = Math.max(...flat.map((point) => point.y)) + padding
  const bounds = { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
  return { bounds, local: groups.map((group) => group.map((point) => ({ x: point.x - minX, y: point.y - minY }))) }
}

function worldPointList(value: unknown, field: string, minimum = 1): Point[] {
  if (!Array.isArray(value) || value.length < minimum || !value.every(isPoint)) throw new Error(`${field} must be an array of at least ${minimum} finite {x, y} points.`)
  return value as Point[]
}

function sampleCount(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const count = finiteNumber(value, 'samples')
  if (!Number.isInteger(count) || count < 2 || count > MAX_SAMPLES) throw new Error(`samples must be an integer between 2 and ${MAX_SAMPLES}.`)
  return count
}

/** Sample a parametric curve; the LaTeX may use t or x as the parameter. */
function sampleParametric(spec: unknown): Point[][] {
  if (!isRecord(spec)) throw new Error('parametric must be an object.')
  const xLatex = requiredString(spec.x, 'parametric.x'); const yLatex = requiredString(spec.y, 'parametric.y')
  const t0 = finiteNumber(spec.t0, 'parametric.t0'); const t1 = finiteNumber(spec.t1, 'parametric.t1')
  if (t1 <= t0) throw new Error('parametric.t1 must exceed t0.')
  const samples = sampleCount(spec.samples, 120)
  const strokes: Point[][] = []; let current: Point[] = []
  for (let index = 0; index < samples; index += 1) {
    const t = t0 + ((t1 - t0) * index) / (samples - 1)
    const x = evaluateLatexAt(xLatex, t, { t }); const y = evaluateLatexAt(yLatex, t, { t })
    if (x === null || y === null) { if (current.length) strokes.push(current); current = []; continue }
    current.push({ x, y })
  }
  if (current.length) strokes.push(current)
  if (!strokes.flat().length) throw new Error('The parametric curve produced no finite points; check that x and y use t as the parameter.')
  return strokes
}

/** Sample y = f(x) on each piece; undefined points split the stroke. */
function samplePiecewise(pieces: unknown): Point[][] {
  if (!Array.isArray(pieces) || !pieces.length || pieces.length > 32) throw new Error('piecewise must be an array of 1 to 32 pieces.')
  const strokes: Point[][] = []
  for (const piece of pieces) {
    if (!isRecord(piece)) throw new Error('Each piece must be an object.')
    const latex = requiredString(piece.latex, 'piece.latex'); const from = finiteNumber(piece.from, 'piece.from'); const to = finiteNumber(piece.to, 'piece.to')
    if (to <= from) throw new Error('piece.to must exceed piece.from.')
    const samples = sampleCount(piece.samples, 80)
    let current: Point[] = []
    for (let index = 0; index < samples; index += 1) {
      const x = from + ((to - from) * index) / (samples - 1)
      const y = evaluateLatexAt(latex, x)
      if (y === null) { if (current.length) strokes.push(current); current = []; continue }
      current.push({ x, y })
    }
    if (current.length) strokes.push(current)
  }
  if (!strokes.flat().length) throw new Error('The piecewise definition produced no finite points.')
  return strokes
}

const intersects = (a: Bounds, b: Bounds) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

function matrixValues(value: unknown): number[][] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) throw new Error('values must have 1 to 4 rows.')
  const columns = Array.isArray(value[0]) ? value[0].length : 0
  if (columns < 1 || columns > 4) throw new Error('values must have 1 to 4 columns.')
  if (!value.every((row) => Array.isArray(row) && row.length === columns && row.every((entry) => typeof entry === 'number' && Number.isFinite(entry)))) throw new Error('values must be a rectangular array of finite numbers.')
  return (value as number[][]).map((row) => [...row])
}

// ---------------------------------------------------------------------------
// Timelines
// ---------------------------------------------------------------------------

type TrackTarget = AnimationTrack['target']

/** Describe the value shape a path accepts, or throw when the path is not animatable on this target. */
function pathValueKind(world: WorldState, target: TrackTarget): 'number' | 'pair' | 'weights3' | 'weights4' | 'string' {
  if (target.kind === 'camera') {
    if (!CAMERA_PATHS.has(target.path)) throw new Error(`Camera path ${target.path} is not animatable; use x, y or zoom.`)
    return 'number'
  }
  if (target.kind === 'entity') throw new Error('Entity targets are not supported by this tool; animate an object or the camera.')
  const object = world.objects[target.objectId]
  if (!object) throw new Error(`Object ${target.objectId} does not exist.`)
  const path = target.path
  if (SCALAR_PATHS.has(path)) return 'number'
  if (object.kind === 'graph') {
    if (path.startsWith('parameters.') && path.length > 'parameters.'.length) return 'number'
    if (path === 'showTangentAt') return 'number'
    if (path === 'shadeIntegral') return 'pair'
  }
  if (object.kind === 'barycentric' && path === 'weights') return 'weights3'
  if (object.kind === 'simplex' && (path === 'weights' || path === 'section')) return path === 'weights' ? 'weights4' : 'number'
  if (object.kind === 'geometry' && /^primitives\.[^.]+\.at$/.test(path)) {
    const pointId = path.slice('primitives.'.length, -'.at'.length)
    const primitive = object.primitives.find((entry) => entry.id === pointId)
    if (!primitive) throw new Error(`Construction ${object.id} has no primitive ${pointId}.`)
    if (primitive.kind !== 'point') throw new Error(`${pointId} is a ${primitive.kind}; only base points can be animated.`)
    return 'pair'
  }
  if (object.kind === 'arrow' && (path === 'from' || path === 'to')) return 'pair'
  if (object.kind === 'equation' && path === 'latex') return 'string'
  throw new Error(`Path ${path} is not animatable on a ${object.kind} object.`)
}

function keyframeValue(value: unknown, kind: ReturnType<typeof pathValueKind>, at: number): AnimationValue {
  const fail = () => new Error(`Keyframe at t=${at} needs a ${kind === 'number' ? 'finite number' : kind === 'pair' ? '[x, y] pair' : kind === 'weights3' ? 'three-number array' : kind === 'weights4' ? 'four-number array' : 'LaTeX string'}.`)
  if (kind === 'number') { if (typeof value !== 'number' || !Number.isFinite(value)) throw fail(); return value }
  if (kind === 'string') { if (typeof value !== 'string') throw fail(); return value }
  if (kind === 'pair') {
    if (isPoint(value)) return [value.x, value.y]
    if (isPair(value)) return [...value]
    throw fail()
  }
  const length = kind === 'weights3' ? 3 : 4
  if (!Array.isArray(value) || value.length !== length || !value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) throw fail()
  return [...(value as number[])]
}

function parseTarget(value: unknown): TrackTarget {
  if (!isRecord(value)) throw new Error('Each track needs a target.')
  const path = requiredString(value.path, 'target.path')
  if (value.kind === 'camera') return { kind: 'camera', path }
  if (value.kind === 'object') return { kind: 'object', objectId: requiredString(value.objectId, 'target.objectId'), path }
  throw new Error('target.kind must be object or camera.')
}

function parseKeyframes(world: WorldState, target: TrackTarget, raw: unknown, duration: number): Record<string, AnimationKeyframe> {
  if (!Array.isArray(raw) || !raw.length || raw.length > 200) throw new Error('keyframes must be an array of 1 to 200 entries.')
  const kind = pathValueKind(world, target)
  const keyframes: Record<string, AnimationKeyframe> = {}
  for (const entry of raw) {
    if (!isRecord(entry)) throw new Error('Each keyframe needs time and value.')
    const time = finiteNumber(entry.time, 'keyframe.time')
    if (time < 0 || time > duration) throw new Error(`Keyframe time ${time} is outside [0, ${duration}].`)
    const id = crypto.randomUUID()
    keyframes[id] = { id, time, value: keyframeValue(entry.value, kind, time) }
  }
  return keyframes
}

const targetLabel = (target: TrackTarget) => (target.kind === 'camera' ? `camera.${target.path}` : target.kind === 'object' ? `${target.objectId}.${target.path}` : `${target.entityId}.${target.path}`)
const sameTarget = (a: TrackTarget, b: TrackTarget) => targetLabel(a) === targetLabel(b) && a.kind === b.kind

function summarizeTimeline(timeline: AnimationTimeline) {
  const tracks = Object.values(timeline.tracks)
  return {
    id: timeline.id, name: timeline.name, duration: timeline.duration, playbackRange: timeline.playbackRange, trackCount: tracks.length,
    tracks: tracks.slice(0, 24).map((track) => ({ id: track.id, target: track.target, keyframeCount: Object.keys(track.keyframes).length })),
  }
}

/** Built lazily: definitions.ts and parity.ts import each other, so top-level use of `schema` would hit the TDZ. */
const trackSchema = () => schema({
  target: { type: 'object', description: 'Object field or camera axis to animate.', properties: { kind: { type: 'string', enum: ['object', 'camera'] }, objectId: { type: 'string' }, path: { type: 'string' } }, required: ['kind', 'path'], additionalProperties: false },
  keyframes: { type: 'array', minItems: 1, maxItems: 200, items: schema({ time: { type: 'number', minimum: 0 }, value: { description: 'Number, [x, y], weight array or LaTeX string, matching the path.' } }, ['time', 'value']) },
}, ['target', 'keyframes'])

export function createParityTools(bridge: WorldBridge): WorldTool[] {
  const drawInk = tool('draw_ink', 'Draw pen or highlighter ink', 'Draw one ink object as pen or highlighter. Give exactly one of: strokes (arrays of world {x,y} points), parametric ({x, y} LaTeX in t, t0, t1, samples ≤ 400), or piecewise ([{latex f(x), from, to}]). Curves are sampled with the graph evaluator in world units. Use for underlines, circling, arrows of attention and sketched curves; use graph_expression for a live plot.', schema({
    mode: { type: 'string', enum: ['pen', 'highlighter'], description: 'pen: thin graphite. highlighter: wide translucent violet.' },
    color: { type: 'string', description: 'CSS color; defaults by mode.' },
    width: { type: 'number', exclusiveMinimum: 0, maximum: 60, description: 'Stroke width in world px.' },
    strokes: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'array', minItems: 1, items: pointSchema }, description: 'World-coordinate point arrays, one per stroke.' },
    parametric: schema({ x: { type: 'string' }, y: { type: 'string' }, t0: { type: 'number' }, t1: { type: 'number' }, samples: { type: 'integer', minimum: 2, maximum: MAX_SAMPLES } }, ['x', 'y', 't0', 't1']),
    piecewise: { type: 'array', minItems: 1, maxItems: 32, items: schema({ latex: { type: 'string' }, from: { type: 'number' }, to: { type: 'number' }, samples: { type: 'integer', minimum: 2, maximum: MAX_SAMPLES } }, ['latex', 'from', 'to']) },
  }), false, async (input) => {
    const args = values(input, ['mode', 'color', 'width', 'strokes', 'parametric', 'piecewise'])
    const mode = args.mode === undefined ? 'pen' : args.mode
    if (mode !== 'pen' && mode !== 'highlighter') throw new Error('mode must be pen or highlighter.')
    const sources = ['strokes', 'parametric', 'piecewise'].filter((key) => args[key] !== undefined)
    if (sources.length !== 1) throw new Error('Provide exactly one of strokes, parametric or piecewise.')
    let strokes: Point[][]
    if (args.strokes !== undefined) {
      if (!Array.isArray(args.strokes) || !args.strokes.length || args.strokes.length > 64) throw new Error('strokes must contain 1 to 64 strokes.')
      strokes = args.strokes.map((stroke, index) => worldPointList(stroke, `strokes[${index}]`))
    } else if (args.parametric !== undefined) strokes = sampleParametric(args.parametric)
    else strokes = samplePiecewise(args.piecewise)
    if (strokes.flat().length > MAX_POINTS) throw new Error(`Ink is limited to ${MAX_POINTS} points per call.`)
    const defaults = mode === 'pen' ? PEN : HIGHLIGHTER
    const width = optionalNumber(args.width, 'width') ?? defaults.width
    if (width <= 0 || width > 60) throw new Error('width must be between 0 and 60.')
    const color = optionalString(args.color, 'color') ?? defaults.color
    const { bounds, local } = fitPoints(strokes, width / 2 + 2)
    const object: WorldObject = { id: crypto.randomUUID(), kind: 'ink', points: local[0], strokes: local.map((points) => ({ points })), color, width, bounds, rotation: 0, author: 'agent', opacity: defaults.opacity }
    const outcome = await bridge.runAgentAction(action(mode === 'pen' ? 'Drew ink' : 'Highlighted', [{ type: 'put', object }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, objectId: object.id, mode, strokeCount: strokes.length, pointCount: strokes.flat().length, bounds } } : outcome
  })

  const eraseInk = tool('erase_ink', 'Erase ink', 'Remove ink objects. Give ids, or a world rectangle region (every ink whose bounds intersect it), or own: true to remove only ink the agent drew. Other object kinds are never touched; use delete_objects for those. Undoable.', schema({
    ids: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Ink object ids to remove.' },
    region: { ...boundsSchema, description: 'World rectangle; all intersecting ink is removed.' },
    own: { type: 'boolean', description: 'true: remove only agent-authored ink.' },
  }), false, async (input) => {
    const args = values(input, ['ids', 'region', 'own'])
    const world = bridge.getWorld()
    const inks = world.order.map((id) => world.objects[id]).filter((object): object is Extract<WorldObject, { kind: 'ink' }> => object?.kind === 'ink')
    let targets: string[]
    if (args.ids !== undefined) {
      if (!isStringArray(args.ids) || !args.ids.length) throw new Error('ids must be a non-empty string array.')
      for (const id of args.ids) { const object = world.objects[id]; if (!object) throw new Error(`Object ${id} does not exist.`); if (object.kind !== 'ink') throw new Error(`Object ${id} is a ${object.kind}, not ink.`) }
      targets = args.ids
    } else if (args.region !== undefined) {
      if (!isBounds(args.region)) throw new Error('region must be finite positive bounds.')
      targets = inks.filter((ink) => intersects(ink.bounds, args.region as Bounds)).map((ink) => ink.id)
    } else if (args.own === true) targets = inks.filter((ink) => ink.author === 'agent').map((ink) => ink.id)
    else throw new Error('Provide ids, region or own: true.')
    if (args.own === true) targets = targets.filter((id) => world.objects[id]?.author === 'agent')
    if (!targets.length) return { ok: true, summary: 'No ink matched', changedIds: [], data: { removed: 0 } }
    const operations: WorldOperation[] = targets.map((id) => ({ type: 'remove', id }))
    const outcome = await bridge.runAgentAction(action('Erased ink', operations), targets)
    return outcome.ok ? { ...outcome, data: { ...outcome.data, removed: targets.length, ids: targets } } : outcome
  })

  const editText = tool('edit_text', 'Edit a text object', 'Change the text, color, fontSize, presentation (typed or handwritten) or textAlign of one existing text object, keeping its id, position and author. Use annotate_object to add a new note instead.', schema({
    objectId: { type: 'string', minLength: 1 }, text: { type: 'string', maxLength: 2000 }, color: { type: 'string' }, fontSize: { type: 'number', exclusiveMinimum: 0, maximum: 200 },
    presentation: { type: 'string', enum: ['typed', 'handwritten'] }, textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'text', 'color', 'fontSize', 'presentation', 'textAlign'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'text')
    const patch: Partial<typeof object> = {}
    const text = optionalString(args.text, 'text'); if (text !== undefined) patch.text = text.slice(0, 2000)
    const color = optionalString(args.color, 'color'); if (color !== undefined) patch.color = color
    const fontSize = optionalNumber(args.fontSize, 'fontSize'); if (fontSize !== undefined) { if (fontSize <= 0 || fontSize > 200) throw new Error('fontSize must be between 0 and 200.'); patch.fontSize = fontSize }
    if (args.presentation !== undefined) { if (args.presentation !== 'typed' && args.presentation !== 'handwritten') throw new Error('presentation must be typed or handwritten.'); patch.presentation = args.presentation }
    if (args.textAlign !== undefined) { if (args.textAlign !== 'left' && args.textAlign !== 'center' && args.textAlign !== 'right') throw new Error('textAlign must be left, center or right.'); patch.textAlign = args.textAlign }
    if (!Object.keys(patch).length) throw new Error('Provide at least one field to change.')
    return bridge.runAgentAction(action('Edited text', [{ type: 'put', object: { ...object, ...patch } }]), [object.id])
  })

  const editEquation = tool('edit_equation', 'Edit an equation', 'Replace the LaTeX (and optionally the color) of one existing equation object. Graphs linked to it re-plot automatically; the result lists their ids. Use graph_expression to create a new equation with a plot.', schema({ objectId: { type: 'string', minLength: 1 }, latex: { type: 'string', minLength: 1, maxLength: 2000 }, color: { type: 'string' } }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'latex', 'color'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'equation')
    const latex = optionalString(args.latex, 'latex'); const color = optionalString(args.color, 'color')
    if (latex === undefined && color === undefined) throw new Error('Provide latex or color.')
    if (latex !== undefined && !latex.trim()) throw new Error('latex must be a non-empty string.')
    const dependents = world.order.filter((id) => { const item = world.objects[id]; return item?.kind === 'graph' && item.equationId === object.id })
    const next = { ...object, latex: latex ?? object.latex, color: color ?? object.color }
    const outcome = await bridge.runAgentAction(action('Edited equation', [{ type: 'put', object: next }]), [object.id, ...dependents])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, latex: next.latex, dependentGraphIds: dependents } } : outcome
  })

  const createShape = tool('create_shape', 'Create a shape', 'Create a rectangle, ellipse or triangle at bounds, or a polygon (closed) / freeform (open path) from world {x,y} points; bounds are fitted around the points with 6px padding. Optional fill, stroke, strokeWidth and cornerRadius. For hand-drawn marks use draw_ink.', schema({
    shape: { type: 'string', enum: ['rectangle', 'ellipse', 'triangle', 'polygon', 'freeform'] },
    bounds: { ...boundsSchema, description: 'Required for rectangle, ellipse and triangle.' },
    points: { ...pointsSchema, description: 'World points; required for polygon and freeform.' },
    fill: { type: 'string' }, stroke: { type: 'string' }, strokeWidth: { type: 'number', minimum: 0, maximum: 40 }, cornerRadius: { type: 'number', minimum: 0, maximum: 200 }, summary: { type: 'string' },
  }, ['shape']), false, async (input) => {
    const args = values(input, ['shape', 'bounds', 'points', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'summary'])
    const shape = String(args.shape)
    if (!['rectangle', 'ellipse', 'triangle', 'polygon', 'freeform'].includes(shape)) throw new Error('shape must be rectangle, ellipse, triangle, polygon or freeform.')
    let bounds: Bounds; let points: Point[] | undefined
    if (shape === 'polygon' || shape === 'freeform') {
      if (args.bounds !== undefined) throw new Error(`${shape} shapes take points, not bounds.`)
      const world = worldPointList(args.points, 'points', shape === 'polygon' ? 3 : 2)
      const fitted = fitPoints([world], SHAPE_PADDING); bounds = fitted.bounds; points = fitted.local[0]
    } else {
      if (args.points !== undefined) throw new Error(`${shape} shapes take bounds, not points.`)
      if (!isBounds(args.bounds)) throw new Error('bounds must be finite positive bounds.')
      bounds = args.bounds
    }
    const strokeWidth = optionalNumber(args.strokeWidth, 'strokeWidth'); if (strokeWidth !== undefined && (strokeWidth < 0 || strokeWidth > 40)) throw new Error('strokeWidth must be between 0 and 40.')
    const cornerRadius = optionalNumber(args.cornerRadius, 'cornerRadius'); if (cornerRadius !== undefined && (cornerRadius < 0 || cornerRadius > 200)) throw new Error('cornerRadius must be between 0 and 200.')
    const object: WorldObject = {
      id: crypto.randomUUID(), kind: 'shape', shape: shape as Extract<WorldObject, { kind: 'shape' }>['shape'],
      fill: optionalString(args.fill, 'fill') ?? (shape === 'freeform' ? 'none' : 'rgba(124, 92, 255, 0.14)'), stroke: optionalString(args.stroke, 'stroke') ?? '#7c5cff',
      ...(points ? { points } : {}), ...(strokeWidth !== undefined ? { strokeWidth } : {}), ...(cornerRadius !== undefined ? { cornerRadius } : {}),
      bounds, rotation: 0, author: 'agent', opacity: 1,
    }
    const outcome = await bridge.runAgentAction(action(typeof args.summary === 'string' && args.summary.trim() ? args.summary : 'Created shape', [{ type: 'put', object }, { type: 'select', ids: [object.id] }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, objectId: object.id, shape, bounds } } : outcome
  })

  const editShape = tool('edit_shape', 'Edit a shape', 'Patch fill, stroke, strokeWidth, cornerRadius or points (local to bounds, polygon/freeform only) of one existing shape object. Use transform_objects to move or resize it.', schema({
    objectId: { type: 'string', minLength: 1 }, fill: { type: 'string' }, stroke: { type: 'string' }, strokeWidth: { type: 'number', minimum: 0, maximum: 40 }, cornerRadius: { type: 'number', minimum: 0, maximum: 200 },
    points: { ...pointsSchema, description: 'Points local to the shape bounds.' },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'points'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'shape')
    const patch: Partial<typeof object> = {}
    const fill = optionalString(args.fill, 'fill'); if (fill !== undefined) patch.fill = fill
    const stroke = optionalString(args.stroke, 'stroke'); if (stroke !== undefined) patch.stroke = stroke
    const strokeWidth = optionalNumber(args.strokeWidth, 'strokeWidth'); if (strokeWidth !== undefined) { if (strokeWidth < 0 || strokeWidth > 40) throw new Error('strokeWidth must be between 0 and 40.'); patch.strokeWidth = strokeWidth }
    const cornerRadius = optionalNumber(args.cornerRadius, 'cornerRadius'); if (cornerRadius !== undefined) { if (cornerRadius < 0 || cornerRadius > 200) throw new Error('cornerRadius must be between 0 and 200.'); patch.cornerRadius = cornerRadius }
    if (args.points !== undefined) {
      if (object.shape !== 'polygon' && object.shape !== 'freeform') throw new Error(`points can only be set on polygon or freeform shapes, not ${object.shape}.`)
      patch.points = worldPointList(args.points, 'points', object.shape === 'polygon' ? 3 : 2)
    }
    if (!Object.keys(patch).length) throw new Error('Provide at least one field to change.')
    return bridge.runAgentAction(action('Edited shape', [{ type: 'put', object: { ...object, ...patch } }]), [object.id])
  })

  const setMatrixCells = tool('set_matrix_cells', 'Set matrix cells', 'Edit a matrix object: set individual cells [{row, column, value}] (0-based, within the current size) or replace values with a rectangular 1–4 × 1–4 number array. Linked vector transforms recompute. Use inspect_math to read the matrix first.', schema({
    objectId: { type: 'string', minLength: 1 },
    cells: { type: 'array', minItems: 1, maxItems: 16, items: schema({ row: { type: 'integer', minimum: 0, maximum: 3 }, column: { type: 'integer', minimum: 0, maximum: 3 }, value: { type: 'number' } }, ['row', 'column', 'value']) },
    values: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'number' } }, description: 'Replaces the whole matrix.' },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'cells', 'values'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'matrix')
    if ((args.cells === undefined) === (args.values === undefined)) throw new Error('Provide exactly one of cells or values.')
    let next: number[][]; const notes: string[] = []
    if (args.values !== undefined) { next = matrixValues(args.values); notes.push(`${next.length}×${next[0].length} values`) } else {
      if (!Array.isArray(args.cells) || !args.cells.length) throw new Error('cells must be a non-empty array.')
      next = object.values.map((row) => [...row])
      for (const cell of args.cells) {
        if (!isRecord(cell)) throw new Error('Each cell needs row, column and value.')
        const row = finiteNumber(cell.row, 'row'); const column = finiteNumber(cell.column, 'column'); const value = finiteNumber(cell.value, 'value')
        if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= next.length || column >= next[0].length) throw new Error(`Cell (${row}, ${column}) is outside the ${next.length}×${next[0].length} matrix.`)
        next[row][column] = value; notes.push(`[${row}][${column}] = ${round(value, 3)}`)
      }
    }
    const outcome = await bridge.runAgentAction(action('Set matrix cells', [{ type: 'put', object: { ...object, values: next } }]), [object.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, values: next, changes: notes } } : outcome
  })

  const setGraph = tool('set_graph', 'Update a graph', 'Update one existing graph: latex (rewrites its linked equation), xDomain, yDomain, color, parameters (merged), showTangentAt or shadeIntegral (null clears), visualization, binEdges. Use graph_expression to create a graph; inspect_math to read one.', schema({
    objectId: { type: 'string', minLength: 1 }, latex: { type: 'string', minLength: 1 }, xDomain: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } }, yDomain: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number' } },
    color: { type: 'string' }, parameters: { type: 'object', additionalProperties: { type: 'number' }, description: 'Merged into existing parameters.' },
    showTangentAt: { type: ['number', 'null'] }, shadeIntegral: { type: ['array', 'null'], minItems: 2, maxItems: 2, items: { type: 'number' } },
    visualization: { type: 'string', enum: ['standard', 'gamma-density'] }, binEdges: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'number' } },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'latex', 'xDomain', 'yDomain', 'color', 'parameters', 'showTangentAt', 'shadeIntegral', 'visualization', 'binEdges'])
    const world = bridge.getWorld(); const graph = objectOfKind(world, args.objectId, 'graph')
    const next: typeof graph = { ...graph }; const operations: WorldOperation[] = []; const notes: string[] = []
    const latex = optionalString(args.latex, 'latex')
    if (latex !== undefined) {
      if (!latex.trim()) throw new Error('latex must be a non-empty string.')
      const equation = world.objects[graph.equationId]
      if (equation?.kind !== 'equation') throw new Error(`Graph ${graph.id} has no linked equation to rewrite.`)
      operations.push({ type: 'put', object: { ...equation, latex } }); notes.push('latex')
    }
    if (args.xDomain !== undefined) { if (!isPair(args.xDomain) || args.xDomain[1] <= args.xDomain[0]) throw new Error('xDomain must be [min, max] with max > min.'); next.xDomain = [args.xDomain[0], args.xDomain[1]]; notes.push('xDomain') }
    if (args.yDomain !== undefined) { if (!isPair(args.yDomain) || args.yDomain[1] <= args.yDomain[0]) throw new Error('yDomain must be [min, max] with max > min.'); next.yDomain = [args.yDomain[0], args.yDomain[1]]; notes.push('yDomain') }
    const color = optionalString(args.color, 'color'); if (color !== undefined) { next.color = color; notes.push('color') }
    if (args.parameters !== undefined) { if (!isStringNumberMap(args.parameters)) throw new Error('parameters must map names to numbers.'); next.parameters = { ...(graph.parameters ?? {}), ...args.parameters }; notes.push('parameters') }
    if (args.showTangentAt !== undefined) { if (args.showTangentAt === null) delete next.showTangentAt; else next.showTangentAt = finiteNumber(args.showTangentAt, 'showTangentAt'); notes.push('tangent') }
    if (args.shadeIntegral !== undefined) { if (args.shadeIntegral === null) delete next.shadeIntegral; else { if (!isPair(args.shadeIntegral)) throw new Error('shadeIntegral must be [from, to] or null.'); next.shadeIntegral = [args.shadeIntegral[0], args.shadeIntegral[1]] } notes.push('integral') }
    if (args.visualization !== undefined) { if (args.visualization !== 'standard' && args.visualization !== 'gamma-density') throw new Error('visualization must be standard or gamma-density.'); next.visualization = args.visualization; notes.push('visualization') }
    if (args.binEdges !== undefined) { if (!Array.isArray(args.binEdges) || args.binEdges.length !== 4 || !args.binEdges.every((value) => typeof value === 'number' && Number.isFinite(value))) throw new Error('binEdges must contain four finite numbers.'); next.binEdges = [args.binEdges[0], args.binEdges[1], args.binEdges[2], args.binEdges[3]]; notes.push('binEdges') }
    if (!notes.length) throw new Error('Provide at least one field to change.')
    operations.push({ type: 'put', object: next })
    const outcome = await bridge.runAgentAction(action('Updated graph', operations), changedIds(operations))
    return outcome.ok ? { ...outcome, data: { ...outcome.data, changed: notes, latex: latex ?? null, xDomain: next.xDomain, yDomain: next.yDomain } } : outcome
  })

  const setArrow = tool('set_arrow', 'Move an arrow', 'Move the head (to) and/or tail (from) of one existing arrow to world coordinates. Bounds are refitted and endpoints stored locally. Use transform_objects to shift the whole arrow.', schema({ objectId: { type: 'string', minLength: 1 }, from: { ...pointSchema, description: 'World tail point.' }, to: { ...pointSchema, description: 'World head point.' }, color: { type: 'string' } }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'from', 'to', 'color'])
    const world = bridge.getWorld(); const arrow = objectOfKind(world, args.objectId, 'arrow')
    if (args.from === undefined && args.to === undefined && args.color === undefined) throw new Error('Provide from, to or color.')
    if (args.from !== undefined && !isPoint(args.from)) throw new Error('from must be a finite {x, y} point.')
    if (args.to !== undefined && !isPoint(args.to)) throw new Error('to must be a finite {x, y} point.')
    const worldFrom = args.from !== undefined ? args.from : { x: arrow.bounds.x + arrow.from.x, y: arrow.bounds.y + arrow.from.y }
    const worldTo = args.to !== undefined ? args.to : { x: arrow.bounds.x + arrow.to.x, y: arrow.bounds.y + arrow.to.y }
    const { bounds, local } = fitPoints([[worldFrom, worldTo]], 8)
    const next: WorldObject = { ...arrow, from: local[0][0], to: local[0][1], bounds, color: optionalString(args.color, 'color') ?? arrow.color }
    const outcome = await bridge.runAgentAction(action('Moved arrow', [{ type: 'put', object: next }]), [arrow.id])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, from: worldFrom, to: worldTo, bounds } } : outcome
  })

  const createTimeline = tool('create_timeline', 'Create an animation timeline', 'Create a keyframed timeline. Tracks target an object field or the camera (x, y, zoom). Object paths: opacity, rotation, bounds.x/y/width/height, drawProgress, parameters.<name> / showTangentAt / shadeIntegral (graph), weights / section (barycentric, simplex), primitives.<pointId>.at (geometry), from / to (arrow), latex (equation). Play it with play_timeline.', schema({
    name: { type: 'string', minLength: 1, maxLength: 80 }, duration: { type: 'number', exclusiveMinimum: 0, maximum: 600, description: 'Seconds.' },
    tracks: { type: 'array', minItems: 1, maxItems: 32, items: trackSchema() },
  }, ['name', 'duration', 'tracks']), false, async (input) => {
    const args = values(input, ['name', 'duration', 'tracks'])
    const name = requiredString(args.name, 'name').trim().slice(0, 80); const duration = finiteNumber(args.duration, 'duration')
    if (duration <= 0 || duration > 600) throw new Error('duration must be between 0 and 600 seconds.')
    if (!Array.isArray(args.tracks) || !args.tracks.length || args.tracks.length > 32) throw new Error('tracks must contain 1 to 32 tracks.')
    const world = bridge.getWorld(); const tracks: Record<string, AnimationTrack> = {}; const seen: TrackTarget[] = []
    for (const raw of args.tracks) {
      if (!isRecord(raw)) throw new Error('Each track must be an object.')
      const target = parseTarget(raw.target)
      if (seen.some((existing) => sameTarget(existing, target))) throw new Error(`Track target ${targetLabel(target)} is repeated.`)
      seen.push(target)
      const id = crypto.randomUUID()
      tracks[id] = { id, target, keyframes: parseKeyframes(world, target, raw.keyframes, duration) }
    }
    const timeline: AnimationTimeline = { id: crypto.randomUUID(), name, duration, playbackRange: { start: 0, end: duration }, tracks }
    const outcome = await bridge.runAgentAction(action('Created timeline', [{ type: 'putTimeline', timeline }]), seen.flatMap((target) => (target.kind === 'object' ? [target.objectId] : [])))
    return outcome.ok ? { ...outcome, data: { ...outcome.data, timelineId: timeline.id, ...summarizeTimeline(timeline) } } : outcome
  })

  const addKeyframes = tool('add_keyframes', 'Add keyframes to a timeline', 'Append keyframes to an existing timeline track, matched by trackId or by target; a track is created when no match exists. replace: true discards the track’s existing keyframes first. Times must lie within the timeline duration.', schema({
    timelineId: { type: 'string', minLength: 1 }, trackId: { type: 'string' },
    target: { type: 'object', properties: { kind: { type: 'string', enum: ['object', 'camera'] }, objectId: { type: 'string' }, path: { type: 'string' } }, required: ['kind', 'path'], additionalProperties: false },
    keyframes: { type: 'array', minItems: 1, maxItems: 200, items: schema({ time: { type: 'number', minimum: 0 }, value: {} }, ['time', 'value']) },
    replace: { type: 'boolean' },
  }, ['timelineId', 'keyframes']), false, async (input) => {
    const args = values(input, ['timelineId', 'trackId', 'target', 'keyframes', 'replace'])
    const world = bridge.getWorld(); const timelineId = requiredString(args.timelineId, 'timelineId'); const timeline = world.timelines[timelineId]
    if (!timeline) throw new Error(`Timeline ${timelineId} does not exist.`)
    if ((args.trackId === undefined) === (args.target === undefined)) throw new Error('Provide exactly one of trackId or target.')
    let track: AnimationTrack | undefined
    if (args.trackId !== undefined) { track = timeline.tracks[requiredString(args.trackId, 'trackId')]; if (!track) throw new Error(`Timeline ${timelineId} has no track ${String(args.trackId)}.`) } else {
      const target = parseTarget(args.target)
      track = Object.values(timeline.tracks).find((candidate) => sameTarget(candidate.target, target)) ?? { id: crypto.randomUUID(), target, keyframes: {} }
    }
    const added = parseKeyframes(world, track.target, args.keyframes, timeline.duration)
    const keyframes = args.replace === true ? added : { ...track.keyframes, ...added }
    const next: AnimationTimeline = { ...timeline, tracks: { ...timeline.tracks, [track.id]: { ...track, keyframes } } }
    const outcome = await bridge.runAgentAction(action(`Added ${Object.keys(added).length} keyframes`, [{ type: 'putTimeline', timeline: next }]), track.target.kind === 'object' ? [track.target.objectId] : [])
    return outcome.ok ? { ...outcome, data: { ...outcome.data, timelineId, trackId: track.id, target: track.target, keyframeCount: Object.keys(keyframes).length } } : outcome
  })

  const playTimeline = tool('play_timeline', 'Play or scrub a timeline', 'Control playback of a timeline: play, pause, seek (to time in seconds) or reset. Optional speed multiplier. Playback is transient, never a history commit; the learner sees the animation live.', schema({
    timelineId: { type: 'string', minLength: 1 }, action: { type: 'string', enum: ['play', 'pause', 'seek', 'reset'] }, time: { type: 'number', minimum: 0, description: 'Seconds; required for seek.' }, speed: { type: 'number', exclusiveMinimum: 0, maximum: 8 },
  }, ['timelineId', 'action']), false, async (input) => {
    const args = values(input, ['timelineId', 'action', 'time', 'speed'])
    const timelineId = requiredString(args.timelineId, 'timelineId'); const world = bridge.getWorld(); const timeline = world.timelines[timelineId]
    if (!timeline) throw new Error(`Timeline ${timelineId} does not exist.`)
    const control = args.action
    if (control !== 'play' && control !== 'pause' && control !== 'seek' && control !== 'reset') throw new Error('action must be play, pause, seek or reset.')
    const time = optionalNumber(args.time, 'time'); const speed = optionalNumber(args.speed, 'speed')
    if (control === 'seek' && time === undefined) throw new Error('seek needs a time in seconds.')
    if (time !== undefined && (time < 0 || time > timeline.duration)) throw new Error(`time must lie within [0, ${timeline.duration}].`)
    if (speed !== undefined && (speed <= 0 || speed > 8)) throw new Error('speed must be between 0 and 8.')
    if (!bridge.controlTimeline) return unavailable('Timeline playback')
    return bridge.controlTimeline(timelineId, control, { ...(time !== undefined ? { time } : {}), ...(speed !== undefined ? { speed } : {}) })
  })

  const getTimelines = tool('get_timelines', 'List animation timelines', 'Read every timeline in the world with its duration, playback range, track targets and keyframe counts. Use before add_keyframes or play_timeline.', emptySchema, true, (input) => {
    values(input, [])
    const world = bridge.getWorld(); const timelines = Object.values(world.timelines).map(summarizeTimeline)
    return { ok: true, summary: `Read ${timelines.length} timeline${timelines.length === 1 ? '' : 's'}`, data: { timelines: timelines.slice(0, 50), ...(timelines.length > 50 ? { truncated: true } : {}) } }
  })

  return [drawInk, eraseInk, editText, editEquation, createShape, editShape, setMatrixCells, setGraph, setArrow, createTimeline, addKeyframes, playTimeline, getTimelines]
}
