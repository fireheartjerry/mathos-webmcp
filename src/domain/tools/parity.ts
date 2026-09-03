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
import { TIMELINE_PRESETS, TIMELINE_PRESET_NAMES, type PresetArgs } from '../animation/presets'
import type { Bounds, Point, WorldObject, WorldOperation, WorldState } from '../world/types'
import {
  action, boundsSchema, changedIds, commit, emptySchema, isBounds, isPair, isPoint, isRecord, isStringArray, isStringNumberMap,
  nameOf, requiredString, schema, tool, values,
} from './definitions'
import { CONSTRUCT_FIELD, unbuilt } from './definitions'
import type { ToolResult, WorldBridge, WorldTool } from './definitions'

const PEN = { color: '#171713', width: 3, opacity: 1 }
const HIGHLIGHTER = { color: '#7c5cff', width: 18, opacity: 0.34 }
const SHAPE_PADDING = 6
const MAX_SAMPLES = 400
const MAX_POINTS = 4000
const SHAPES = ['rectangle', 'ellipse', 'triangle', 'polygon', 'freeform']
const SCALAR_PATHS = new Set(['opacity', 'rotation', 'bounds.x', 'bounds.y', 'bounds.width', 'bounds.height', 'drawProgress'])
const CAMERA_PATHS = new Set(['x', 'y', 'zoom'])
const PATH_HELP = 'Animatable paths: opacity, rotation, bounds.x/y/width/height, drawProgress (any object); parameters.<name>, showTangentAt, shadeIntegral, binEdges (graph); values (matrix); weights (barycentric, simplex); section (simplex); primitives.<pointId>.at (geometry); from, to (arrow); latex (equation); camera x, y, zoom.'

// Local copies: parity.ts and definitions.ts import each other, so top-level code here must not touch definitions.ts exports.
const pointSchema = {
  type: 'object',
  description: 'A point {x, y} in world px (canvas units, y grows downward).',
  properties: { x: { type: 'number', description: 'Horizontal position in world px.' }, y: { type: 'number', description: 'Vertical position in world px; larger is lower.' } },
  required: ['x', 'y'], additionalProperties: false,
}
const pointsSchema = { type: 'array', minItems: 2, items: pointSchema, description: 'Ordered {x, y} points.' }
const round = (value: number, places = 2) => Number(value.toFixed(places))
const finiteNumber = (value: unknown, field: string, example = '1'): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number, e.g. ${example}.`)
  return value
}
const optionalNumber = (value: unknown, field: string, example = '1'): number | undefined => (value === undefined ? undefined : finiteNumber(value, field, example))
const optionalString = (value: unknown, field: string, example = '"#7c5cff"'): string | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${field} must be a string, e.g. ${example}.`)
  return value
}
const unavailable = (feature: string): ToolResult => ({ ok: false, summary: 'No changes made', error: `${feature} is not available on this page; the workspace has not wired that bridge method.` })

function objectOfKind<K extends WorldObject['kind']>(world: WorldState, id: unknown, kind: K, field = 'objectId'): Extract<WorldObject, { kind: K }> {
  const objectId = requiredString(id, field)
  const object = world.objects[objectId]
  if (!object) throw new Error(`Object ${objectId} does not exist. Read ${kind} ids with get_objects {"kinds": ["${kind}"]}.`)
  if (object.kind !== kind) throw new Error(`Object ${objectId} is a ${object.kind}, not a ${kind}. Read ${kind} ids with get_objects {"kinds": ["${kind}"]}.`)
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
  if (!Array.isArray(value) || value.length < minimum || !value.every(isPoint)) throw new Error(`${field} must be an array of at least ${minimum} finite {x, y} point${minimum === 1 ? '' : 's'}, e.g. [{"x": 100, "y": 120}, {"x": 180, "y": 140}].`)
  return value as Point[]
}

function sampleCount(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const count = finiteNumber(value, 'samples', String(fallback))
  if (!Number.isInteger(count) || count < 2 || count > MAX_SAMPLES) throw new Error(`samples must be an integer between 2 and ${MAX_SAMPLES} (default ${fallback}).`)
  return count
}

/** Sample a parametric curve; the LaTeX may use t or x as the parameter. */
function sampleParametric(spec: unknown): Point[][] {
  if (!isRecord(spec)) throw new Error('parametric must be an object {x, y, t0, t1, samples?}, e.g. {"x": "200+80\\\\cos(t)", "y": "300+80\\\\sin(t)", "t0": 0, "t1": 6.283}.')
  const xLatex = requiredString(spec.x, 'parametric.x'); const yLatex = requiredString(spec.y, 'parametric.y')
  const t0 = finiteNumber(spec.t0, 'parametric.t0', '0'); const t1 = finiteNumber(spec.t1, 'parametric.t1', '6.283')
  if (t1 <= t0) throw new Error(`parametric.t1 (${t1}) must exceed t0 (${t0}).`)
  const samples = sampleCount(spec.samples, 120)
  const strokes: Point[][] = []; let current: Point[] = []
  for (let index = 0; index < samples; index += 1) {
    const t = t0 + ((t1 - t0) * index) / (samples - 1)
    const x = evaluateLatexAt(xLatex, t, { t }); const y = evaluateLatexAt(yLatex, t, { t })
    if (x === null || y === null) { if (current.length) strokes.push(current); current = []; continue }
    current.push({ x, y })
  }
  if (current.length) strokes.push(current)
  if (!strokes.flat().length) throw new Error('The parametric curve produced no finite points; check that x and y are LaTeX in t (or x) and evaluate on [t0, t1], e.g. x: "200+80\\cos(t)".')
  return strokes
}

/** Sample y = f(x) on each piece; undefined points split the stroke. */
function samplePiecewise(pieces: unknown): Point[][] {
  if (!Array.isArray(pieces) || !pieces.length || pieces.length > 32) throw new Error('piecewise must be an array of 1 to 32 pieces {latex, from, to, samples?}, e.g. [{"latex": "300-0.01(x-400)^2", "from": 200, "to": 600}].')
  const strokes: Point[][] = []
  for (const piece of pieces) {
    if (!isRecord(piece)) throw new Error('Each piece must be an object {latex, from, to, samples?}.')
    const latex = requiredString(piece.latex, 'piece.latex'); const from = finiteNumber(piece.from, 'piece.from', '200'); const to = finiteNumber(piece.to, 'piece.to', '600')
    if (to <= from) throw new Error(`piece.to (${to}) must exceed piece.from (${from}).`)
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
  if (!strokes.flat().length) throw new Error('The piecewise definition produced no finite points; each latex must be a function of x that is defined on [from, to].')
  return strokes
}

const intersects = (a: Bounds, b: Bounds) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

function matrixValues(value: unknown): number[][] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) throw new Error('values must have 1 to 4 rows, e.g. [[1, 0.8], [0, 1]].')
  const columns = Array.isArray(value[0]) ? value[0].length : 0
  if (columns < 1 || columns > 4) throw new Error('values must have 1 to 4 columns per row, e.g. [[1, 0.8], [0, 1]].')
  if (!value.every((row) => Array.isArray(row) && row.length === columns && row.every((entry) => typeof entry === 'number' && Number.isFinite(entry)))) throw new Error('values must be a rectangular array of finite numbers (every row the same length), e.g. [[1, 0.8], [0, 1]].')
  return (value as number[][]).map((row) => [...row])
}

// ---------------------------------------------------------------------------
// Timelines
// ---------------------------------------------------------------------------

type TrackTarget = AnimationTrack['target']

/** Describe the value shape a path accepts, or throw when the path is not animatable on this target. */
function pathValueKind(world: WorldState, target: TrackTarget): 'number' | 'pair' | 'weights3' | 'weights4' | 'string' | 'matrix' {
  if (target.kind === 'camera') {
    if (!CAMERA_PATHS.has(target.path)) throw new Error(`Camera path “${target.path}” is not animatable; use x, y or zoom.`)
    return 'number'
  }
  if (target.kind === 'entity') throw new Error('Entity targets are not supported by this tool; animate an object (kind "object" with objectId) or the camera.')
  const object = world.objects[target.objectId]
  if (!object) throw new Error(`Object ${target.objectId} does not exist. Read ids with get_objects.`)
  const path = target.path
  if (SCALAR_PATHS.has(path)) return 'number'
  if (object.kind === 'graph') {
    if (path.startsWith('parameters.') && path.length > 'parameters.'.length) return 'number'
    if (path === 'showTangentAt') return 'number'
    if (path === 'shadeIntegral') return 'pair'
    if (path === 'binEdges') return 'weights4'
  }
  if (object.kind === 'matrix' && path === 'values') return 'matrix'
  if (object.kind === 'barycentric' && path === 'weights') return 'weights3'
  if (object.kind === 'simplex' && (path === 'weights' || path === 'section')) return path === 'weights' ? 'weights4' : 'number'
  if (object.kind === 'geometry' && /^primitives\.[^.]+\.at$/.test(path)) {
    const pointId = path.slice('primitives.'.length, -'.at'.length)
    const primitive = object.primitives.find((entry) => entry.id === pointId)
    if (!primitive) throw new Error(`Construction ${object.id} has no primitive ${pointId}. Base points: ${object.primitives.filter((entry) => entry.kind === 'point').map((entry) => entry.id).join(', ')}.`)
    if (primitive.kind !== 'point') throw new Error(`${pointId} is a ${primitive.kind}; only base points (primitives.<id>.at) can be animated.`)
    return 'pair'
  }
  if (object.kind === 'arrow' && (path === 'from' || path === 'to')) return 'pair'
  if (object.kind === 'equation' && path === 'latex') return 'string'
  throw new Error(`Path “${path}” is not animatable on a ${object.kind} object. ${PATH_HELP}`)
}

function keyframeValue(value: unknown, kind: ReturnType<typeof pathValueKind>, at: number): AnimationValue {
  const expected = kind === 'number' ? 'a finite number, e.g. 0.5' : kind === 'pair' ? 'an [x, y] pair or {x, y}, e.g. [120, 80]' : kind === 'weights3' ? 'three numbers, e.g. [0.2, 0.5, 0.3]' : kind === 'weights4' ? 'four numbers, e.g. [0, 2.5, 5, 12]' : kind === 'matrix' ? 'a rectangular number[][], e.g. [[1, 0], [0, 1]]' : 'a LaTeX string'
  const fail = () => new Error(`Keyframe at t=${at} needs ${expected}.`)
  if (kind === 'number') { if (typeof value !== 'number' || !Number.isFinite(value)) throw fail(); return value }
  if (kind === 'matrix') { try { return matrixValues(value) } catch { throw fail() } }
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
  if (!isRecord(value)) throw new Error('Each track needs a target {kind: "object", objectId, path} or {kind: "camera", path}.')
  const path = requiredString(value.path, 'target.path')
  if (value.kind === 'camera') return { kind: 'camera', path }
  if (value.kind === 'object') return { kind: 'object', objectId: requiredString(value.objectId, 'target.objectId'), path }
  throw new Error('target.kind must be "object" (with objectId and path) or "camera" (path x, y or zoom).')
}

function parseKeyframes(world: WorldState, target: TrackTarget, raw: unknown, duration: number): Record<string, AnimationKeyframe> {
  if (!Array.isArray(raw) || !raw.length || raw.length > 200) throw new Error('keyframes must be an array of 1 to 200 entries {time, value}, e.g. [{"time": 0, "value": 0}, {"time": 2, "value": 1}].')
  const kind = pathValueKind(world, target)
  const keyframes: Record<string, AnimationKeyframe> = {}
  for (const entry of raw) {
    if (!isRecord(entry)) throw new Error('Each keyframe needs {time: seconds, value}, e.g. {"time": 1, "value": 0.5}.')
    const time = finiteNumber(entry.time, 'keyframe.time', '1')
    if (time < 0 || time > duration) throw new Error(`Keyframe time ${time} is outside the timeline duration [0, ${duration}] seconds.`)
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

const TYPEWRITER_MIN_MS = 200
const TYPEWRITER_MAX_MS = 6000
const TYPEWRITER_DEFAULT_MS = 1400
const typewriterSchema = {
  typewriter: { type: 'boolean', description: 'true: type the new value live, character by character, before committing it. Default false.' },
  typewriterMs: { type: 'number', minimum: TYPEWRITER_MIN_MS, maximum: TYPEWRITER_MAX_MS, description: `Typing duration in ms, ${TYPEWRITER_MIN_MS}..${TYPEWRITER_MAX_MS}. Default ${TYPEWRITER_DEFAULT_MS}.` },
}

/** Validate the shared typewriter options; returns the duration when the preview is requested, otherwise null. */
function typewriterMs(args: Record<string, unknown>): number | null {
  if (args.typewriter !== undefined && typeof args.typewriter !== 'boolean') throw new Error('typewriter must be true or false.')
  const ms = optionalNumber(args.typewriterMs, 'typewriterMs', String(TYPEWRITER_DEFAULT_MS)) ?? TYPEWRITER_DEFAULT_MS
  if (ms < TYPEWRITER_MIN_MS || ms > TYPEWRITER_MAX_MS) throw new Error(`typewriterMs must be between ${TYPEWRITER_MIN_MS} and ${TYPEWRITER_MAX_MS} milliseconds (default ${TYPEWRITER_DEFAULT_MS}).`)
  return args.typewriter === true ? ms : null
}

/** Play the live typing preview when requested and the bridge supports it; the commit always follows. */
async function typewrite(bridge: WorldBridge, ms: number | null, objectId: string, field: 'latex' | 'text', value: string | undefined): Promise<void> {
  if (ms === null || value === undefined || !bridge.typewrite) return
  await bridge.typewrite(objectId, field, value, ms)
}

/**
 * Build a timeline from a named preset, validating that the referenced objects
 * exist and have the kind the preset expects. Missing `from` values default to
 * the live state (bin edges, section, matrix values, latex, camera).
 */
function buildPresetTimeline(world: WorldState, raw: unknown, name: string | undefined, duration: number | undefined): { timeline: AnimationTimeline; presetName: string; objectIds: string[] } {
  if (!isRecord(raw)) throw new Error(`preset must be an object {name, objectId?, objectIds?, seconds?, from?, to?, parameter?}, e.g. {"name": "drawIn", "objectId": "graph-1"}. Presets: ${TIMELINE_PRESET_NAMES.join(', ')}.`)
  const presetName = requiredString(raw.name, 'preset.name')
  const preset = TIMELINE_PRESETS[presetName]
  if (!preset) throw new Error(`Unknown preset “${presetName}”. Available: ${TIMELINE_PRESET_NAMES.join(', ')}.`)
  const objectId = optionalString(raw.objectId, 'preset.objectId', '"graph-1"')
  if (raw.objectIds !== undefined && !isStringArray(raw.objectIds)) throw new Error('preset.objectIds must be an array of object id strings.')
  const objectIds = (raw.objectIds as string[] | undefined) ?? []
  const seconds = optionalNumber(raw.seconds, 'preset.seconds', '3') ?? duration
  const parameter = optionalString(raw.parameter, 'preset.parameter', '"a"')
  const all = [...(objectId ? [objectId] : []), ...objectIds]
  for (const id of all) if (!world.objects[id]) throw new Error(`Object ${id} does not exist. Read ids with get_objects.`)
  if (preset.kinds && objectId) {
    const object = world.objects[objectId]
    if (!preset.kinds.includes(object.kind)) throw new Error(`Preset ${presetName} needs a ${preset.kinds.join(' or ')} object; ${objectId} is a ${object.kind}.`)
  }
  if (preset.params.objectId?.required && !objectId) throw new Error(`Preset ${presetName} needs objectId${preset.kinds ? ` of a ${preset.kinds.join(' or ')} object` : ''}.`)
  let from = raw.from
  const object = objectId ? world.objects[objectId] : undefined
  if (from === undefined && object) {
    if (presetName === 'bridgeMorph' && object.kind === 'graph') from = object.binEdges
    else if ((presetName === 'simplexSweep' || presetName === 'sweepSection') && object.kind === 'simplex') from = object.section
    else if (presetName === 'matrixSweep' && object.kind === 'matrix') from = object.values
    else if (presetName === 'crossfadeLatex' && object.kind === 'equation') from = object.latex
    else if (presetName === 'sweepParameter' && object.kind === 'graph' && parameter) from = object.parameters?.[parameter] ?? 1
  }
  if (from === undefined && presetName === 'cameraTo') from = world.viewport
  if (presetName === 'bridgeMorph') {
    for (const id of objectIds) if (world.objects[id].kind !== 'equation') throw new Error(`Preset bridgeMorph: objectIds must be equation ids to crossfade; ${id} is a ${world.objects[id].kind}.`)
  }
  const args: PresetArgs = { objectId, objectIds, seconds, from, to: raw.to, parameter }
  const built = preset.build(args)
  const timeline: AnimationTimeline = { ...built, id: crypto.randomUUID(), name: name ?? built.name }
  return { timeline, presetName, objectIds: all }
}

const targetSchema = {
  type: 'object',
  description: 'What to animate: {kind: "object", objectId, path} or {kind: "camera", path: "x" | "y" | "zoom"}.',
  properties: {
    kind: { type: 'string', enum: ['object', 'camera'], description: '"object" animates a field of an object; "camera" animates the viewport.' },
    objectId: { type: 'string', description: 'Object id; required when kind is "object".' },
    path: { type: 'string', description: 'Field path, e.g. "opacity", "bounds.x", "parameters.a", "section", "values", "primitives.A.at", "latex"; camera: "x", "y", "zoom".' },
  },
  required: ['kind', 'path'], additionalProperties: false,
}
const keyframesSchema = {
  type: 'array', minItems: 1, maxItems: 200, description: 'Keyframes in seconds within the duration; values interpolate linearly between them.',
  items: {
    type: 'object', description: 'One keyframe {time, value}.', required: ['time', 'value'], additionalProperties: false,
    properties: {
      time: { type: 'number', minimum: 0, description: 'Time in seconds from the start, 0..duration.' },
      value: { description: 'Value at that time, matching the path: number, [x, y], number[3], number[4], number[][] or LaTeX string.' },
    },
  },
}
/** Built lazily: definitions.ts and parity.ts import each other, so top-level use of `schema` would hit the TDZ. */
const trackSchema = () => schema({ target: targetSchema, keyframes: keyframesSchema }, ['target', 'keyframes'], { description: 'One track: a target path plus its keyframes.' })

export function createParityTools(bridge: WorldBridge): WorldTool[] {
  const drawInk = tool('draw_ink', 'Draw pen or highlighter ink', 'Draw one ink object as pen or highlighter. Give exactly one of: strokes (arrays of world {x,y} points), parametric ({x, y} LaTeX in t, t0, t1), or piecewise ([{latex f(x), from, to}]) sampled in world px. Use for underlines, circling and sketched curves; use graph_expression for a live plot. Returns bounds and stroke count.', schema({
    mode: { type: 'string', enum: ['pen', 'highlighter'], description: '"pen" (default): thin graphite, width 3. "highlighter": wide translucent violet, width 18.' },
    color: { type: 'string', description: 'CSS color. Default "#171713" for pen, "#7c5cff" for highlighter.' },
    width: { type: 'number', exclusiveMinimum: 0, maximum: 60, description: 'Stroke width in world px, 0..60. Default by mode.' },
    strokes: { type: 'array', minItems: 1, maxItems: 64, items: { type: 'array', minItems: 1, items: pointSchema, description: 'One stroke: ordered world points.' }, description: 'Up to 64 strokes of world px points, e.g. [[{x: 100, y: 200}, {x: 300, y: 200}]].' },
    parametric: schema({
      x: { type: 'string', description: 'LaTeX for x(t) in world px, e.g. "200+80\\\\cos(t)".' }, y: { type: 'string', description: 'LaTeX for y(t) in world px, e.g. "300+80\\\\sin(t)".' },
      t0: { type: 'number', description: 'Start of the parameter range, e.g. 0.' }, t1: { type: 'number', description: 'End of the parameter range (> t0), e.g. 6.283.' },
      samples: { type: 'integer', minimum: 2, maximum: MAX_SAMPLES, description: `Sample count 2..${MAX_SAMPLES}. Default 120.` },
    }, ['x', 'y', 't0', 't1'], { description: 'A parametric curve (x(t), y(t)) in world px.' }),
    piecewise: { type: 'array', minItems: 1, maxItems: 32, description: 'Pieces of y = f(x) in world px; undefined points split the stroke.', items: schema({
      latex: { type: 'string', description: 'LaTeX for y(x) in world px, e.g. "300-0.01(x-400)^2".' },
      from: { type: 'number', description: 'Start x in world px.' }, to: { type: 'number', description: 'End x in world px (> from).' },
      samples: { type: 'integer', minimum: 2, maximum: MAX_SAMPLES, description: `Sample count 2..${MAX_SAMPLES}. Default 80.` },
    }, ['latex', 'from', 'to'], { description: 'One piece {latex, from, to, samples?}.' }) },
    ...CONSTRUCT_FIELD,
  }, [], { examples: [
    { mode: 'highlighter', strokes: [[{ x: 120, y: 210 }, { x: 380, y: 212 }]] },
    { strokes: [[{ x: 100, y: 100 }, { x: 140, y: 160 }, { x: 180, y: 100 }]], color: '#c0392b' },
    { parametric: { x: '400+60\\cos(t)', y: '300+60\\sin(t)', t0: 0, t1: 6.2832 } },
  ] }), false, async (input) => {
    const args = values(input, ['mode', 'color', 'width', 'strokes', 'parametric', 'piecewise', 'construct'])
    const mode = args.mode === undefined ? 'pen' : args.mode
    if (mode !== 'pen' && mode !== 'highlighter') throw new Error('mode must be "pen" or "highlighter".')
    const sources = ['strokes', 'parametric', 'piecewise'].filter((key) => args[key] !== undefined)
    if (sources.length !== 1) throw new Error(`Provide exactly one of strokes, parametric or piecewise${sources.length ? ` (got ${sources.join(' and ')})` : ''}, e.g. {"strokes": [[{"x": 100, "y": 200}, {"x": 300, "y": 200}]]}.`)
    let strokes: Point[][]
    if (args.strokes !== undefined) {
      if (!Array.isArray(args.strokes) || !args.strokes.length || args.strokes.length > 64) throw new Error('strokes must contain 1 to 64 strokes, each an array of world {x, y} points.')
      strokes = args.strokes.map((stroke, index) => worldPointList(stroke, `strokes[${index}]`))
    } else if (args.parametric !== undefined) strokes = sampleParametric(args.parametric)
    else strokes = samplePiecewise(args.piecewise)
    const pointCount = strokes.flat().length
    if (pointCount > MAX_POINTS) throw new Error(`Ink is limited to ${MAX_POINTS} points per call (got ${pointCount}); reduce samples or split into several calls.`)
    const defaults = mode === 'pen' ? PEN : HIGHLIGHTER
    const width = optionalNumber(args.width, 'width', '3') ?? defaults.width
    if (width <= 0 || width > 60) throw new Error('width must be between 0 and 60 world px, e.g. 3 for pen or 18 for highlighter.')
    const color = optionalString(args.color, 'color') ?? defaults.color
    if (!color.trim()) throw new Error('color must be a non-empty CSS color string, e.g. "#171713".')
    const { bounds, local } = fitPoints(strokes, width / 2 + 2)
    const object: WorldObject = { id: crypto.randomUUID(), kind: 'ink', points: local[0], strokes: local.map((points) => ({ points })), color, width, bounds, rotation: 0, author: 'agent', opacity: defaults.opacity }
    const summary = mode === 'pen' ? `Drew ${strokes.length} pen stroke${strokes.length === 1 ? '' : 's'}` : `Highlighted with ${strokes.length} stroke${strokes.length === 1 ? '' : 's'}`
    return commit(bridge, action(summary, unbuilt([{ type: 'put', object }], args.construct)), [object.id], { objectId: object.id, mode, color, width, strokeCount: strokes.length, pointCount, bounds })
  })

  const eraseInk = tool('erase_ink', 'Erase ink', 'Remove ink objects in one undoable commit. Give ids, or region (a world px rectangle; every ink whose bounds intersect it), or own: true (only ink the agent drew). Other object kinds are never touched; use delete_objects for those.', schema({
    ids: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1, description: 'Ink object id.' }, description: 'Ink object ids to remove.' },
    region: { ...boundsSchema, description: 'World px rectangle; all ink intersecting it is removed.' },
    own: { type: 'boolean', description: 'true: remove only agent-authored ink (alone, or as a filter on ids/region).' },
  }), false, async (input) => {
    const args = values(input, ['ids', 'region', 'own'])
    if (args.own !== undefined && typeof args.own !== 'boolean') throw new Error('own must be true or false.')
    const world = bridge.getWorld()
    const inks = world.order.map((id) => world.objects[id]).filter((object): object is Extract<WorldObject, { kind: 'ink' }> => object?.kind === 'ink')
    let targets: string[]; let scope: string
    if (args.ids !== undefined) {
      if (!isStringArray(args.ids) || !args.ids.length) throw new Error('ids must be a non-empty array of ink object id strings.')
      for (const id of args.ids) { const object = world.objects[id]; if (!object) throw new Error(`Object ${id} does not exist. Read ink ids with get_objects {"kinds": ["ink"]}.`); if (object.kind !== 'ink') throw new Error(`Object ${id} is a ${object.kind}, not ink; use delete_objects for other kinds.`) }
      targets = args.ids; scope = 'by id'
    } else if (args.region !== undefined) {
      if (!isBounds(args.region)) throw new Error('region must be {x, y, width > 0, height > 0} in world px, e.g. {"x": 100, "y": 100, "width": 300, "height": 200}.')
      targets = inks.filter((ink) => intersects(ink.bounds, args.region as Bounds)).map((ink) => ink.id); scope = 'in the region'
    } else if (args.own === true) { targets = inks.filter((ink) => ink.author === 'agent').map((ink) => ink.id); scope = 'drawn by the Tutor' }
    else throw new Error('Provide ids (ink object ids), region ({x, y, width, height} in world px) or own: true.')
    if (args.own === true) targets = targets.filter((id) => world.objects[id]?.author === 'agent')
    if (!targets.length) return { ok: true, summary: `No ink matched ${scope}`, changedIds: [], data: { removed: 0, ids: [] } }
    const operations: WorldOperation[] = targets.map((id) => ({ type: 'remove', id }))
    return commit(bridge, action(`Erased ${targets.length} ink object${targets.length === 1 ? '' : 's'} ${scope}`, operations), targets, { removed: targets.length, ids: targets })
  })

  const editText = tool('edit_text', 'Edit a text object', 'Change the text, color, fontSize, presentation (typed or handwritten) or textAlign of one existing text object, keeping its id, position and author. typewriter: true types the value live so the learner watches it appear. Use annotate_object to add a new note instead.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the text object.' },
    text: { type: 'string', maxLength: 2000, description: 'New text, up to 2000 characters.' },
    color: { type: 'string', description: 'CSS text color, e.g. "#171713".' },
    fontSize: { type: 'number', exclusiveMinimum: 0, maximum: 200, description: 'Font size in px, 0..200, e.g. 18.' },
    presentation: { type: 'string', enum: ['typed', 'handwritten'], description: '"typed" or "handwritten" rendering.' },
    textAlign: { type: 'string', enum: ['left', 'center', 'right'], description: 'Alignment for multi-line text.' },
    ...typewriterSchema,
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'text', 'color', 'fontSize', 'presentation', 'textAlign', 'typewriter', 'typewriterMs'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'text'); const typing = typewriterMs(args)
    const patch: Partial<typeof object> = {}
    const text = optionalString(args.text, 'text', '"Try factoring first"'); if (text !== undefined) patch.text = text.slice(0, 2000)
    const color = optionalString(args.color, 'color'); if (color !== undefined) patch.color = color
    const fontSize = optionalNumber(args.fontSize, 'fontSize', '18'); if (fontSize !== undefined) { if (fontSize <= 0 || fontSize > 200) throw new Error('fontSize must be between 0 and 200 px, e.g. 18.'); patch.fontSize = fontSize }
    if (args.presentation !== undefined) { if (args.presentation !== 'typed' && args.presentation !== 'handwritten') throw new Error('presentation must be "typed" or "handwritten".'); patch.presentation = args.presentation }
    if (args.textAlign !== undefined) { if (args.textAlign !== 'left' && args.textAlign !== 'center' && args.textAlign !== 'right') throw new Error('textAlign must be "left", "center" or "right".'); patch.textAlign = args.textAlign }
    if (!Object.keys(patch).length) throw new Error('Provide at least one of text, color, fontSize, presentation or textAlign.')
    await typewrite(bridge, typing, object.id, 'text', patch.text)
    const next = { ...object, ...patch }
    return commit(bridge, action(`Edited ${nameOf(next)} (${Object.keys(patch).join(', ')})`, [{ type: 'put', object: next }]), [object.id], { objectId: object.id, changed: Object.keys(patch), text: next.text, color: next.color, fontSize: next.fontSize, presentation: next.presentation ?? 'typed', textAlign: next.textAlign ?? 'left' })
  })

  const editEquation = tool('edit_equation', 'Edit an equation', 'Replace the LaTeX and/or color of one existing equation object. Graphs linked to it re-plot automatically; their ids are returned. typewriter: true types the value live so the learner watches it appear. Use graph_expression to create a new equation with a plot.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the equation object.' },
    latex: { type: 'string', minLength: 1, maxLength: 2000, description: 'New LaTeX, e.g. "x^2-2x+1".' },
    color: { type: 'string', description: 'CSS color, e.g. "#171713".' },
    ...typewriterSchema,
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'latex', 'color', 'typewriter', 'typewriterMs'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'equation'); const typing = typewriterMs(args)
    const latex = optionalString(args.latex, 'latex', '"x^2-2x+1"'); const color = optionalString(args.color, 'color')
    if (latex === undefined && color === undefined) throw new Error('Provide latex (e.g. "x^2-2x+1") and/or color.')
    if (latex !== undefined && !latex.trim()) throw new Error('latex must be a non-empty LaTeX string, e.g. "x^2-2x+1".')
    const dependents = world.order.filter((id) => { const item = world.objects[id]; return item?.kind === 'graph' && item.equationId === object.id })
    const next = { ...object, latex: latex ?? object.latex, color: color ?? object.color }
    await typewrite(bridge, typing, object.id, 'latex', latex)
    const changed = [...(latex !== undefined ? ['latex'] : []), ...(color !== undefined ? ['color'] : [])]
    return commit(bridge, action(`Edited ${nameOf(next)} (${changed.join(', ')})`, [{ type: 'put', object: next }]), [object.id, ...dependents], { objectId: object.id, changed, latex: next.latex, color: next.color, dependentGraphIds: dependents })
  })

  const createShape = tool('create_shape', 'Create a shape', 'Create a rectangle, ellipse or triangle at bounds (world px), or a polygon (closed) / freeform (open path) from world {x,y} points; bounds are fitted around the points with 6 px padding. Optional fill, stroke, strokeWidth and cornerRadius. For hand-drawn marks use draw_ink. Returns the id and bounds.', schema({
    shape: { type: 'string', enum: SHAPES, description: '"rectangle", "ellipse", "triangle" (need bounds) or "polygon", "freeform" (need points).' },
    bounds: { ...boundsSchema, description: 'World px box for rectangle, ellipse and triangle.' },
    points: { ...pointsSchema, description: 'World px points; polygon needs ≥ 3, freeform ≥ 2.' },
    fill: { type: 'string', description: 'CSS fill color or "none". Default translucent violet ("none" for freeform).' },
    stroke: { type: 'string', description: 'CSS stroke color. Default "#7c5cff".' },
    strokeWidth: { type: 'number', minimum: 0, maximum: 40, description: 'Outline width in world px, 0..40.' },
    cornerRadius: { type: 'number', minimum: 0, maximum: 200, description: 'Corner radius in world px for rectangles, 0..200.' },
    summary: { type: 'string', maxLength: 120, description: 'Past-tense label for the activity rail, e.g. "Boxed the answer". Optional.' },
  }, ['shape']), false, async (input) => {
    const args = values(input, ['shape', 'bounds', 'points', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'summary'])
    const shape = String(args.shape)
    if (!SHAPES.includes(shape)) throw new Error(`shape must be one of: ${SHAPES.join(', ')}.`)
    let bounds: Bounds; let points: Point[] | undefined
    if (shape === 'polygon' || shape === 'freeform') {
      if (args.bounds !== undefined) throw new Error(`${shape} shapes take points (world px), not bounds; the bounds are fitted around the points.`)
      const world = worldPointList(args.points, 'points', shape === 'polygon' ? 3 : 2)
      const fitted = fitPoints([world], SHAPE_PADDING); bounds = fitted.bounds; points = fitted.local[0]
    } else {
      if (args.points !== undefined) throw new Error(`${shape} shapes take bounds, not points; use polygon or freeform for point-defined shapes.`)
      if (!isBounds(args.bounds)) throw new Error(`${shape} needs bounds {x, y, width > 0, height > 0} in world px, e.g. {"x": 100, "y": 100, "width": 200, "height": 120}.`)
      bounds = args.bounds
    }
    const strokeWidth = optionalNumber(args.strokeWidth, 'strokeWidth', '2'); if (strokeWidth !== undefined && (strokeWidth < 0 || strokeWidth > 40)) throw new Error('strokeWidth must be between 0 and 40 world px, e.g. 2.')
    const cornerRadius = optionalNumber(args.cornerRadius, 'cornerRadius', '12'); if (cornerRadius !== undefined && (cornerRadius < 0 || cornerRadius > 200)) throw new Error('cornerRadius must be between 0 and 200 world px, e.g. 12.')
    const object: WorldObject = {
      id: crypto.randomUUID(), kind: 'shape', shape: shape as Extract<WorldObject, { kind: 'shape' }>['shape'],
      fill: optionalString(args.fill, 'fill', '"rgba(124, 92, 255, 0.14)"') ?? (shape === 'freeform' ? 'none' : 'rgba(124, 92, 255, 0.14)'), stroke: optionalString(args.stroke, 'stroke') ?? '#7c5cff',
      ...(points ? { points } : {}), ...(strokeWidth !== undefined ? { strokeWidth } : {}), ...(cornerRadius !== undefined ? { cornerRadius } : {}),
      bounds, rotation: 0, author: 'agent', opacity: 1,
    }
    const summary = typeof args.summary === 'string' && args.summary.trim() ? args.summary.trim().slice(0, 120) : `Created ${nameOf(object)}${points ? ` with ${points.length} points` : ''}`
    return commit(bridge, action(summary, [{ type: 'put', object }, { type: 'select', ids: [object.id] }]), [object.id], { objectId: object.id, shape, bounds, pointCount: points?.length ?? 0, fill: object.fill, stroke: object.stroke })
  })

  const editShape = tool('edit_shape', 'Edit a shape', 'Patch fill, stroke, strokeWidth, cornerRadius or points (px local to the bounds; polygon/freeform only) of one existing shape object. Use transform_objects to move or resize it.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the shape object.' },
    fill: { type: 'string', description: 'CSS fill color or "none".' },
    stroke: { type: 'string', description: 'CSS stroke color.' },
    strokeWidth: { type: 'number', minimum: 0, maximum: 40, description: 'Outline width in world px, 0..40.' },
    cornerRadius: { type: 'number', minimum: 0, maximum: 200, description: 'Corner radius in world px, 0..200.' },
    points: { ...pointsSchema, description: 'Points in px local to the shape bounds (polygon ≥ 3, freeform ≥ 2).' },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'points'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'shape')
    const patch: Partial<typeof object> = {}
    const fill = optionalString(args.fill, 'fill'); if (fill !== undefined) patch.fill = fill
    const stroke = optionalString(args.stroke, 'stroke'); if (stroke !== undefined) patch.stroke = stroke
    const strokeWidth = optionalNumber(args.strokeWidth, 'strokeWidth', '2'); if (strokeWidth !== undefined) { if (strokeWidth < 0 || strokeWidth > 40) throw new Error('strokeWidth must be between 0 and 40 world px, e.g. 2.'); patch.strokeWidth = strokeWidth }
    const cornerRadius = optionalNumber(args.cornerRadius, 'cornerRadius', '12'); if (cornerRadius !== undefined) { if (cornerRadius < 0 || cornerRadius > 200) throw new Error('cornerRadius must be between 0 and 200 world px, e.g. 12.'); patch.cornerRadius = cornerRadius }
    if (args.points !== undefined) {
      if (object.shape !== 'polygon' && object.shape !== 'freeform') throw new Error(`points can only be set on polygon or freeform shapes, not ${object.shape}; use transform_objects to resize it.`)
      patch.points = worldPointList(args.points, 'points', object.shape === 'polygon' ? 3 : 2)
    }
    if (!Object.keys(patch).length) throw new Error('Provide at least one of fill, stroke, strokeWidth, cornerRadius or points.')
    const next = { ...object, ...patch }
    return commit(bridge, action(`Edited ${nameOf(object)} (${Object.keys(patch).join(', ')})`, [{ type: 'put', object: next }]), [object.id], { objectId: object.id, changed: Object.keys(patch), shape: object.shape, bounds: object.bounds, fill: next.fill, stroke: next.stroke })
  })

  const setMatrixCells = tool('set_matrix_cells', 'Set matrix cells', 'Edit a matrix object: set individual cells [{row, column, value}] (0-based, within the current size) or replace values with a rectangular 1–4 × 1–4 number array. Linked vector transforms recompute; the full matrix is returned. Use inspect_math to read it first.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the matrix object.' },
    cells: { type: 'array', minItems: 1, maxItems: 16, description: 'Cells to overwrite, e.g. [{"row": 0, "column": 1, "value": 0.8}]. Give this or values.', items: schema({
      row: { type: 'integer', minimum: 0, maximum: 3, description: '0-based row index.' }, column: { type: 'integer', minimum: 0, maximum: 3, description: '0-based column index.' }, value: { type: 'number', description: 'New cell value.' },
    }, ['row', 'column', 'value'], { description: 'One cell {row, column, value}.' }) },
    values: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'number', description: 'Cell value.' }, description: 'One row.' }, description: 'Replaces the whole matrix, e.g. [[1, 0.8], [0, 1]]. Give this or cells.' },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'cells', 'values'])
    const world = bridge.getWorld(); const object = objectOfKind(world, args.objectId, 'matrix')
    if ((args.cells === undefined) === (args.values === undefined)) throw new Error('Provide exactly one of cells ([{row, column, value}]) or values (number[][]).')
    let next: number[][]; const notes: string[] = []
    if (args.values !== undefined) { next = matrixValues(args.values); notes.push(`${next.length}×${next[0].length} values`) } else {
      if (!Array.isArray(args.cells) || !args.cells.length) throw new Error('cells must be a non-empty array of {row, column, value}, e.g. [{"row": 0, "column": 1, "value": 0.8}].')
      next = object.values.map((row) => [...row])
      for (const cell of args.cells) {
        if (!isRecord(cell)) throw new Error('Each cell needs {row, column, value}, e.g. {"row": 0, "column": 1, "value": 0.8}.')
        const row = finiteNumber(cell.row, 'row', '0'); const column = finiteNumber(cell.column, 'column', '1'); const value = finiteNumber(cell.value, 'value', '0.8')
        if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= next.length || column >= next[0].length) throw new Error(`Cell (${row}, ${column}) is outside the ${next.length}×${next[0].length} matrix; indices are 0-based.`)
        next[row][column] = value; notes.push(`[${row}][${column}] = ${round(value, 3)}`)
      }
    }
    return commit(bridge, action(`Set ${nameOf(object)} ${notes.join(', ')}`, [{ type: 'put', object: { ...object, values: next } }]), [object.id], { objectId: object.id, values: next, rows: next.length, columns: next[0].length, changes: notes, sourceIds: object.sourceIds })
  })

  const setGraph = tool('set_graph', 'Update a graph', 'Update one existing graph: latex (rewrites its linked equation), xDomain, yDomain, color, parameters (merged into the existing ones), showTangentAt or shadeIntegral (null clears), visualization, binEdges. With latex, typewriter: true types it live. Returns the resulting parameters and value at the tangent. Use graph_expression to create a graph.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the graph object.' },
    latex: { type: 'string', minLength: 1, description: 'New LaTeX in x for the linked equation, e.g. "a x^2".' },
    xDomain: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', description: 'x bound.' }, description: '[min, max] of x, e.g. [-4, 4].' },
    yDomain: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', description: 'y bound.' }, description: '[min, max] of y, e.g. [-5, 10].' },
    color: { type: 'string', description: 'CSS curve color, e.g. "#7c5cff".' },
    parameters: { type: 'object', additionalProperties: { type: 'number', description: 'Parameter value.' }, description: 'Named constants merged into the existing parameters, e.g. {"a": 2}.' },
    showTangentAt: { type: ['number', 'null'], description: 'x at which to draw the tangent; null removes it.' },
    shadeIntegral: { type: ['array', 'null'], minItems: 2, maxItems: 2, items: { type: 'number', description: 'x bound.' }, description: '[from, to] in x to shade; null removes the shading.' },
    visualization: { type: 'string', enum: ['standard', 'gamma-density'], description: '"standard" or "gamma-density" (normalised density with mass bins).' },
    binEdges: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'number', description: 'x edge.' }, description: 'Four ascending x edges for the gamma-density bins, e.g. [0, 2.5, 5, 12].' },
    ...typewriterSchema,
  }, ['objectId'], { examples: [
    { objectId: 'graph-1', parameters: { a: 2 } },
    { objectId: 'graph-1', xDomain: [-6, 6], showTangentAt: 1.5 },
    { objectId: 'graph-1', latex: 'x^3-3x', typewriter: true, shadeIntegral: null },
  ] }), false, async (input) => {
    const args = values(input, ['objectId', 'latex', 'xDomain', 'yDomain', 'color', 'parameters', 'showTangentAt', 'shadeIntegral', 'visualization', 'binEdges', 'typewriter', 'typewriterMs'])
    const world = bridge.getWorld(); const graph = objectOfKind(world, args.objectId, 'graph'); const typing = typewriterMs(args)
    const next: typeof graph = { ...graph }; const operations: WorldOperation[] = []; const notes: string[] = []
    const latex = optionalString(args.latex, 'latex', '"a x^2"'); let equationId: string | null = null
    const equation = world.objects[graph.equationId]; const currentLatex = equation?.kind === 'equation' ? equation.latex : null
    if (latex !== undefined) {
      if (!latex.trim()) throw new Error('latex must be a non-empty LaTeX string in x, e.g. "a x^2".')
      if (equation?.kind !== 'equation') throw new Error(`Graph ${graph.id} has no linked equation to rewrite (equationId ${graph.equationId} is missing); create a new plot with graph_expression.`)
      operations.push({ type: 'put', object: { ...equation, latex } }); notes.push('latex'); equationId = equation.id
    }
    if (args.xDomain !== undefined) { if (!isPair(args.xDomain) || args.xDomain[1] <= args.xDomain[0]) throw new Error('xDomain must be [min, max] with max > min, e.g. [-4, 4].'); next.xDomain = [args.xDomain[0], args.xDomain[1]]; notes.push('xDomain') }
    if (args.yDomain !== undefined) { if (!isPair(args.yDomain) || args.yDomain[1] <= args.yDomain[0]) throw new Error('yDomain must be [min, max] with max > min, e.g. [-5, 10].'); next.yDomain = [args.yDomain[0], args.yDomain[1]]; notes.push('yDomain') }
    const color = optionalString(args.color, 'color'); if (color !== undefined) { next.color = color; notes.push('color') }
    if (args.parameters !== undefined) { if (!isStringNumberMap(args.parameters)) throw new Error('parameters must map names to finite numbers, e.g. {"a": 2}.'); next.parameters = { ...(graph.parameters ?? {}), ...args.parameters }; notes.push('parameters') }
    if (args.showTangentAt !== undefined) { if (args.showTangentAt === null) delete next.showTangentAt; else next.showTangentAt = finiteNumber(args.showTangentAt, 'showTangentAt', '1.5'); notes.push('tangent') }
    if (args.shadeIntegral !== undefined) { if (args.shadeIntegral === null) delete next.shadeIntegral; else { if (!isPair(args.shadeIntegral)) throw new Error('shadeIntegral must be [from, to] in x (e.g. [0, 1]) or null to clear it.'); next.shadeIntegral = [args.shadeIntegral[0], args.shadeIntegral[1]] } notes.push('integral') }
    if (args.visualization !== undefined) { if (args.visualization !== 'standard' && args.visualization !== 'gamma-density') throw new Error('visualization must be "standard" or "gamma-density".'); next.visualization = args.visualization; notes.push('visualization') }
    if (args.binEdges !== undefined) { if (!Array.isArray(args.binEdges) || args.binEdges.length !== 4 || !args.binEdges.every((value) => typeof value === 'number' && Number.isFinite(value))) throw new Error('binEdges must be four finite ascending x values, e.g. [0, 2.5, 5, 12].'); next.binEdges = [args.binEdges[0], args.binEdges[1], args.binEdges[2], args.binEdges[3]]; notes.push('binEdges') }
    if (!notes.length) throw new Error('Provide at least one of latex, xDomain, yDomain, color, parameters, showTangentAt, shadeIntegral, visualization or binEdges.')
    operations.push({ type: 'put', object: next })
    if (equationId) await typewrite(bridge, typing, equationId, 'latex', latex)
    const effectiveLatex = latex ?? currentLatex
    const at = next.showTangentAt ?? 0
    return commit(bridge, action(`Updated ${nameOf(graph)} (${notes.join(', ')})`, operations), changedIds(operations), { objectId: graph.id, equationId: graph.equationId, changed: notes, latex: effectiveLatex, xDomain: next.xDomain, yDomain: next.yDomain, parameters: next.parameters ?? {}, parameterNames: Object.keys(next.parameters ?? {}), showTangentAt: next.showTangentAt ?? null, shadeIntegral: next.shadeIntegral ?? null, visualization: next.visualization ?? 'standard', binEdges: next.binEdges ?? null, valueAt: { x: at, y: effectiveLatex ? evaluateLatexAt(effectiveLatex, at, next.parameters) : null } })
  })

  const setArrow = tool('set_arrow', 'Move an arrow', 'Move the head (to) and/or tail (from) of one existing arrow to world px coordinates, and/or recolour it. Bounds are refitted around the endpoints. Use transform_objects to shift the whole arrow.', schema({
    objectId: { type: 'string', minLength: 1, description: 'Id of the arrow object.' },
    from: { ...pointSchema, description: 'New tail point in world px.' },
    to: { ...pointSchema, description: 'New head point in world px.' },
    color: { type: 'string', description: 'CSS color, e.g. "#171713".' },
  }, ['objectId']), false, async (input) => {
    const args = values(input, ['objectId', 'from', 'to', 'color'])
    const world = bridge.getWorld(); const arrow = objectOfKind(world, args.objectId, 'arrow')
    if (args.from === undefined && args.to === undefined && args.color === undefined) throw new Error('Provide at least one of from {x, y}, to {x, y} (world px) or color.')
    if (args.from !== undefined && !isPoint(args.from)) throw new Error('from must be {x, y} with finite numbers in world px, e.g. {"x": 100, "y": 200}.')
    if (args.to !== undefined && !isPoint(args.to)) throw new Error('to must be {x, y} with finite numbers in world px, e.g. {"x": 300, "y": 200}.')
    const worldFrom = args.from !== undefined ? args.from : { x: arrow.bounds.x + arrow.from.x, y: arrow.bounds.y + arrow.from.y }
    const worldTo = args.to !== undefined ? args.to : { x: arrow.bounds.x + arrow.to.x, y: arrow.bounds.y + arrow.to.y }
    const { bounds, local } = fitPoints([[worldFrom, worldTo]], 8)
    const next: WorldObject = { ...arrow, from: local[0][0], to: local[0][1], bounds, color: optionalString(args.color, 'color') ?? arrow.color }
    const changed = [...(args.from !== undefined ? ['from'] : []), ...(args.to !== undefined ? ['to'] : []), ...(args.color !== undefined ? ['color'] : [])]
    const summary = changed.includes('from') || changed.includes('to') ? `Moved ${nameOf(arrow)} to (${round(worldFrom.x, 0)}, ${round(worldFrom.y, 0)}) → (${round(worldTo.x, 0)}, ${round(worldTo.y, 0)})` : `Recoloured ${nameOf(arrow)}`
    return commit(bridge, action(summary, [{ type: 'put', object: next }]), [arrow.id], { objectId: arrow.id, changed, from: worldFrom, to: worldTo, bounds, color: next.color })
  })

  const createTimeline = tool('create_timeline', 'Create an animation timeline', `Create a timeline from explicit tracks (name + duration + keyframes) or a preset {name, objectId?, objectIds?, seconds?, from?, to?, parameter?}. Presets: ${TIMELINE_PRESET_NAMES.join(', ')}. Read preset params with get_timelines. Returns the timeline id, duration and tracks; then play_timeline.`, schema({
    name: { type: 'string', minLength: 1, maxLength: 80, description: 'Timeline name, up to 80 characters. Required with tracks; optional with preset.' },
    duration: { type: 'number', exclusiveMinimum: 0, maximum: 600, description: 'Length in seconds, 0..600. Required with tracks; optional with preset (its default otherwise).' },
    tracks: { type: 'array', minItems: 1, maxItems: 32, items: trackSchema(), description: 'Up to 32 tracks, one per target path. Give this or preset.' },
    preset: schema({
      name: { type: 'string', enum: TIMELINE_PRESET_NAMES, description: 'Preset name; the enum lists them and get_timelines describes each with its params.' },
      objectId: { type: 'string', minLength: 1, description: 'Target object id (required by every preset except cameraTo).' },
      objectIds: { type: 'array', maxItems: 16, items: { type: 'string', minLength: 1, description: 'Object id.' }, description: 'Extra ids; bridgeMorph: equation ids to crossfade.' },
      seconds: { type: 'number', exclusiveMinimum: 0, maximum: 600, description: 'Duration in seconds; overrides the preset default.' },
      from: { description: 'Start value; defaults to the live state (section, values, latex, binEdges, viewport).' },
      to: { description: 'End value: number (sweeps), number[4] (bridgeMorph), number[][] (matrixSweep), LaTeX (crossfadeLatex) or {x, y, zoom} (cameraTo).' },
      parameter: { type: 'string', description: 'Graph parameter name for sweepParameter, e.g. "a".' },
    }, ['name'], { description: 'A named preset and its arguments. Give this or tracks.' }),
  }, [], { examples: [
    { preset: { name: 'drawIn', objectId: 'graph-1', seconds: 3 } },
    { preset: { name: 'sweepParameter', objectId: 'graph-1', parameter: 'a', from: 0.5, to: 3, seconds: 4 } },
    { name: 'Fade the note', duration: 2, tracks: [{ target: { kind: 'object', objectId: 'note-1', path: 'opacity' }, keyframes: [{ time: 0, value: 0 }, { time: 2, value: 1 }] }] },
    { preset: { name: 'cameraTo', to: { x: -200, y: -80, zoom: 1.4 }, seconds: 2 } },
  ] }), false, async (input) => {
    const args = values(input, ['name', 'duration', 'tracks', 'preset'])
    const name = optionalString(args.name, 'name', '"Reveal the graph"')?.trim().slice(0, 80) || undefined
    const duration = optionalNumber(args.duration, 'duration', '3')
    if (duration !== undefined && (duration <= 0 || duration > 600)) throw new Error('duration must be between 0 and 600 seconds, e.g. 3.')
    if ((args.tracks === undefined) === (args.preset === undefined)) throw new Error(`Provide exactly one of tracks (with name and duration) or preset {name, objectId, …}. Presets: ${TIMELINE_PRESET_NAMES.join(', ')}.`)
    const world = bridge.getWorld()
    if (args.preset !== undefined) {
      const { timeline, presetName, objectIds } = buildPresetTimeline(world, args.preset, name, duration)
      const summary = summarizeTimeline(timeline)
      return commit(bridge, action(`Created ${presetName} timeline “${timeline.name}” (${round(timeline.duration, 1)} s, ${summary.trackCount} track${summary.trackCount === 1 ? '' : 's'})`, [{ type: 'putTimeline', timeline }]), objectIds, { timelineId: timeline.id, preset: presetName, objectIds, ...summary })
    }
    if (!name) throw new Error('name is required with tracks, e.g. "Reveal the graph".')
    if (duration === undefined) throw new Error('duration (seconds) is required with tracks, e.g. 3.')
    if (!Array.isArray(args.tracks) || !args.tracks.length || args.tracks.length > 32) throw new Error('tracks must contain 1 to 32 tracks, each {target, keyframes}.')
    const tracks: Record<string, AnimationTrack> = {}; const seen: TrackTarget[] = []
    for (const raw of args.tracks) {
      if (!isRecord(raw)) throw new Error('Each track must be an object {target, keyframes}.')
      const target = parseTarget(raw.target)
      if (seen.some((existing) => sameTarget(existing, target))) throw new Error(`Track target ${targetLabel(target)} is repeated; merge its keyframes into one track.`)
      seen.push(target)
      const id = crypto.randomUUID()
      tracks[id] = { id, target, keyframes: parseKeyframes(world, target, raw.keyframes, duration) }
    }
    const timeline: AnimationTimeline = { id: crypto.randomUUID(), name, duration, playbackRange: { start: 0, end: duration }, tracks }
    const objectIds = seen.flatMap((target) => (target.kind === 'object' ? [target.objectId] : []))
    const summary = summarizeTimeline(timeline)
    return commit(bridge, action(`Created timeline “${name}” (${round(duration, 1)} s, ${summary.trackCount} track${summary.trackCount === 1 ? '' : 's'})`, [{ type: 'putTimeline', timeline }]), objectIds, { timelineId: timeline.id, objectIds, ...summary })
  })

  const addKeyframes = tool('add_keyframes', 'Add keyframes to a timeline', 'Append keyframes to an existing timeline track, matched by trackId or by target; a new track is created when no track matches the target. replace: true discards the track\'s existing keyframes first. Times must lie within the timeline duration.', schema({
    timelineId: { type: 'string', minLength: 1, description: 'Timeline id from create_timeline or get_timelines.' },
    trackId: { type: 'string', description: 'Existing track id. Give this or target.' },
    target: targetSchema,
    keyframes: keyframesSchema,
    replace: { type: 'boolean', description: 'true: drop the track\'s existing keyframes before adding. Default false (merge).' },
  }, ['timelineId', 'keyframes']), false, async (input) => {
    const args = values(input, ['timelineId', 'trackId', 'target', 'keyframes', 'replace'])
    const world = bridge.getWorld(); const timelineId = requiredString(args.timelineId, 'timelineId'); const timeline = world.timelines[timelineId]
    if (!timeline) throw new Error(`Timeline ${timelineId} does not exist. Read ids with get_timelines.`)
    if ((args.trackId === undefined) === (args.target === undefined)) throw new Error('Provide exactly one of trackId (existing track) or target ({kind, objectId, path}).')
    if (args.replace !== undefined && typeof args.replace !== 'boolean') throw new Error('replace must be true or false.')
    let track: AnimationTrack | undefined; let created = false
    if (args.trackId !== undefined) { track = timeline.tracks[requiredString(args.trackId, 'trackId')]; if (!track) throw new Error(`Timeline ${timelineId} has no track ${String(args.trackId)}. Tracks: ${Object.keys(timeline.tracks).join(', ') || 'none'}.`) } else {
      const target = parseTarget(args.target)
      track = Object.values(timeline.tracks).find((candidate) => sameTarget(candidate.target, target))
      if (!track) { track = { id: crypto.randomUUID(), target, keyframes: {} }; created = true }
    }
    const added = parseKeyframes(world, track.target, args.keyframes, timeline.duration)
    const keyframes = args.replace === true ? added : { ...track.keyframes, ...added }
    const next: AnimationTimeline = { ...timeline, tracks: { ...timeline.tracks, [track.id]: { ...track, keyframes } } }
    const count = Object.keys(added).length
    return commit(bridge, action(`Added ${count} keyframe${count === 1 ? '' : 's'} to ${targetLabel(track.target)} in “${timeline.name}”`, [{ type: 'putTimeline', timeline: next }]), track.target.kind === 'object' ? [track.target.objectId] : [], { timelineId, trackId: track.id, trackCreated: created, target: track.target, added: count, keyframeCount: Object.keys(keyframes).length, duration: timeline.duration })
  })

  const playTimeline = tool('play_timeline', 'Play or scrub a timeline', 'Control playback of a timeline: play, pause, seek (to time in seconds) or reset. Optional speed multiplier 0..8. Playback is transient, never a history commit; the learner sees the animation live. Get ids from get_timelines.', schema({
    timelineId: { type: 'string', minLength: 1, description: 'Timeline id from get_timelines.' },
    action: { type: 'string', enum: ['play', 'pause', 'seek', 'reset'], description: '"play", "pause", "seek" (needs time) or "reset" (back to 0, stopped).' },
    time: { type: 'number', minimum: 0, description: 'Seconds from the start, 0..duration; required for seek.' },
    speed: { type: 'number', exclusiveMinimum: 0, maximum: 8, description: 'Playback speed multiplier, 0..8. Default 1.' },
  }, ['timelineId', 'action']), false, async (input) => {
    const args = values(input, ['timelineId', 'action', 'time', 'speed'])
    const timelineId = requiredString(args.timelineId, 'timelineId'); const world = bridge.getWorld(); const timeline = world.timelines[timelineId]
    if (!timeline) throw new Error(`Timeline ${timelineId} does not exist. Read ids with get_timelines.`)
    const control = args.action
    if (control !== 'play' && control !== 'pause' && control !== 'seek' && control !== 'reset') throw new Error('action must be "play", "pause", "seek" or "reset".')
    const time = optionalNumber(args.time, 'time', '1.5'); const speed = optionalNumber(args.speed, 'speed', '1')
    if (control === 'seek' && time === undefined) throw new Error(`seek needs time in seconds within [0, ${timeline.duration}].`)
    if (time !== undefined && (time < 0 || time > timeline.duration)) throw new Error(`time must lie within [0, ${timeline.duration}] seconds for this timeline.`)
    if (speed !== undefined && (speed <= 0 || speed > 8)) throw new Error('speed must be between 0 and 8, e.g. 1.')
    if (!bridge.controlTimeline) return unavailable('Timeline playback')
    const outcome = await bridge.controlTimeline(timelineId, control, { ...(time !== undefined ? { time } : {}), ...(speed !== undefined ? { speed } : {}) })
    return outcome.ok ? { ...outcome, changedIds: outcome.changedIds ?? [], data: { ...(outcome.data ?? {}), timelineId, name: timeline.name, action: control, duration: timeline.duration, ...(time !== undefined ? { time } : {}), ...(speed !== undefined ? { speed } : {}) } } : outcome
  })

  const getTimelines = tool('get_timelines', 'List animation timelines', 'Read every timeline in the world with its id, duration, playback range, track targets and keyframe counts, plus the preset catalogue (name, description, accepted kinds, params). Use before create_timeline, add_keyframes or play_timeline.', emptySchema, true, (input) => {
    values(input, [])
    const world = bridge.getWorld(); const timelines = Object.values(world.timelines).map(summarizeTimeline)
    const presets = Object.entries(TIMELINE_PRESETS).map(([name, preset]) => ({ name, describe: preset.describe, kinds: preset.kinds ?? null, params: preset.params }))
    return { ok: true, summary: `Read ${timelines.length} timeline${timelines.length === 1 ? '' : 's'}`, data: { timelines: timelines.slice(0, 50), ...(timelines.length > 50 ? { truncated: true } : {}), presets, paths: PATH_HELP } }
  })

  const spotlightObjects = tool('spotlight_objects', 'Spotlight objects before changing them', 'Draw a purple aura with an optional caption around up to 8 objects for 0.5..6 seconds, so the learner sees what you are about to touch. Read-only: changes nothing in the world and is not a history commit. Call it before an edit, then make the edit.', schema({
    ids: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 1, description: 'Object id.' }, description: 'Object ids to ring, 1..8.' },
    label: { type: 'string', maxLength: 60, description: 'Short caption above the aura, up to 60 characters, e.g. "about to move P".' },
    seconds: { type: 'number', minimum: 0.5, maximum: 6, description: 'How long the aura stays, 0.5..6 seconds. Default 2.5.' },
  }, ['ids'], { examples: [{ ids: ['graph-1'], label: 'changing a' }, { ids: ['geo-1'], seconds: 4 }] }), true, (input) => {
    const args = values(input, ['ids', 'label', 'seconds'])
    if (!isStringArray(args.ids) || !args.ids.length || args.ids.length > 8) throw new Error('ids must contain 1 to 8 object id strings, e.g. ["graph-1"].')
    const ids = args.ids.map((id, index) => requiredString(id, `ids[${index}]`))
    const seconds = optionalNumber(args.seconds, 'seconds', '2.5') ?? 2.5
    if (seconds < 0.5 || seconds > 6) throw new Error('seconds must be between 0.5 and 6 (default 2.5).')
    const label = optionalString(args.label, 'label', '"about to move P"')?.slice(0, 60)
    const world = bridge.getWorld()
    const missing = ids.filter((id) => !world.objects[id])
    if (missing.length) throw new Error(`Object${missing.length > 1 ? 's' : ''} ${missing.join(', ')} ${missing.length > 1 ? 'do' : 'does'} not exist. Read ids with get_objects.`)
    if (!bridge.spotlight) return unavailable('Spotlight')
    return bridge.spotlight(ids, seconds, label)
  })

  return [drawInk, eraseInk, editText, editEquation, createShape, editShape, setMatrixCells, setGraph, setArrow, createTimeline, addKeyframes, playTimeline, getTimelines, spotlightObjects]
}
