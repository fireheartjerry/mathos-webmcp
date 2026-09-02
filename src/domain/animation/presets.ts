import type { Viewport } from '../world/types'
import type { AnimationEasing, AnimationKeyframe, AnimationTimeline, AnimationTrack, AnimationValue } from './types'

type KeyframeSpec = { time: number; value: AnimationValue; easing?: AnimationEasing }

function keyframes(specs: KeyframeSpec[]): Record<string, AnimationKeyframe> {
  const out: Record<string, AnimationKeyframe> = {}
  specs.forEach((spec, index) => {
    const id = `k${index}`
    out[id] = { id, time: Math.max(0, spec.time), value: spec.value, easing: spec.easing }
  })
  return out
}

export function objectTrack(trackId: string, objectId: string, path: string, specs: KeyframeSpec[]): AnimationTrack {
  return { id: trackId, target: { kind: 'object', objectId, path }, keyframes: keyframes(specs) }
}

export function cameraTrack(trackId: string, path: 'x' | 'y' | 'zoom', specs: KeyframeSpec[]): AnimationTrack {
  return { id: trackId, target: { kind: 'camera', path }, keyframes: keyframes(specs) }
}

export function makeTimeline(id: string, name: string, duration: number, tracks: AnimationTrack[]): AnimationTimeline {
  const safeDuration = Math.max(0, duration)
  return {
    id,
    name,
    duration: safeDuration,
    playbackRange: { start: 0, end: safeDuration },
    tracks: Object.fromEntries(tracks.map((track) => [track.id, track])),
  }
}

/** A linear 0 → 1 drawProgress track: every staged view reads its sub-stages from this one fraction. */
function drawTrack(objectId: string, seconds: number, trackId = 'draw'): AnimationTrack {
  return objectTrack(trackId, objectId, 'drawProgress', [
    { time: 0, value: 0, easing: 'linear' },
    { time: seconds, value: 1 },
  ])
}

/** Reveal an ink/shape object stroke by stroke (drawProgress 0 to 1, linear so speed matches path length). */
export function drawIn(objectId: string, seconds: number, id = `draw-${objectId}`): AnimationTimeline {
  return makeTimeline(id, 'Draw in', seconds, [drawTrack(objectId, seconds)])
}

/** Fade an object's opacity 0 to `to` (default 1). */
export function fadeIn(objectId: string, seconds: number, to = 1, id = `fade-${objectId}`): AnimationTimeline {
  return makeTimeline(id, 'Fade in', seconds, [
    objectTrack('opacity', objectId, 'opacity', [
      { time: 0, value: 0, easing: 'easeOut' },
      { time: seconds, value: to },
    ]),
  ])
}

/** Sweep a graph parameter (e.g. `a` in `a x^2`) with a smooth ease. */
export function sweepParameter(graphId: string, name: string, from: number, to: number, seconds: number, id = `sweep-${graphId}-${name}`): AnimationTimeline {
  return makeTimeline(id, `Sweep ${name}`, seconds, [
    objectTrack(`parameter-${name}`, graphId, `parameters.${name}`, [
      { time: 0, value: from, easing: 'easeInOut' },
      { time: seconds, value: to },
    ]),
  ])
}

/** Slide a simplex section plane from one level to another. */
export function sweepSection(simplexId: string, from: number, to: number, seconds: number, id = `section-${simplexId}`): AnimationTimeline {
  return makeTimeline(id, 'Sweep section', seconds, [
    objectTrack('section', simplexId, 'section', [
      { time: 0, value: from, easing: 'easeInOut' },
      { time: seconds, value: to },
    ]),
  ])
}

/**
 * Glide the camera to `viewport`. Pass the current `world.viewport` as
 * `fromViewport`; without it the track has a single keyframe and the camera
 * snaps instead of gliding.
 */
export function cameraTo(viewport: Viewport, seconds: number, fromViewport?: Viewport, id = 'camera-move'): AnimationTimeline {
  const track = (path: 'x' | 'y' | 'zoom') => cameraTrack(`camera-${path}`, path, fromViewport
    ? [{ time: 0, value: fromViewport[path], easing: 'easeInOut' }, { time: seconds, value: viewport[path] }]
    : [{ time: seconds, value: viewport[path] }])
  return makeTimeline(id, 'Camera', seconds, [track('x'), track('y'), track('zoom')])
}

/**
 * Swap an equation's LaTeX at the midpoint while dipping its opacity so the
 * change reads as a crossfade. `opacity` is the resting opacity to return to.
 */
export function crossfadeLatex(equationId: string, fromLatex: string, toLatex: string, seconds: number, opacity = 1, id = `latex-${equationId}`): AnimationTimeline {
  return makeTimeline(id, 'Crossfade', seconds, [
    objectTrack('latex', equationId, 'latex', [
      { time: 0, value: fromLatex, easing: 'linear' },
      { time: seconds, value: toLatex },
    ]),
    objectTrack('opacity', equationId, 'opacity', [
      { time: 0, value: opacity, easing: 'easeIn' },
      { time: seconds / 2, value: 0.08, easing: 'easeOut' },
      { time: seconds, value: opacity },
    ]),
  ])
}

// ---------------------------------------------------------------------------
// Construction presets. Each staged view maps drawProgress sub-ranges to its
// own elements (axes → curve → area → bins, points → segments → circles, ...),
// so a single linear drawProgress track is the whole construction.
// ---------------------------------------------------------------------------

/** Gamma density / live graph: axes, curve left→right, shaded area, then bin edges and mass labels. */
export function densityConstruct(graphId: string, seconds = 4, id = `density-${graphId}`): AnimationTimeline {
  return makeTimeline(id, 'Density construction', seconds, [drawTrack(graphId, seconds)])
}

/** The mass → log → softmax chain the bridge equation crossfades through. */
export const BRIDGE_LATEX_CHAIN: readonly [string, string, string] = [
  'w_j=\\int_{b_{j-1}}^{b_j} g_a(x)\\,dx',
  '\\ell_j=\\log w_j',
  '\\operatorname{softmax}(\\ell)_j=w_j',
]

export type BinEdges = [number, number, number, number]
const DEFAULT_BIN_EDGES_FROM: BinEdges = [0, 3.15, 6.075, 16]
const DEFAULT_BIN_EDGES_TO: BinEdges = [0, 2.1, 8.4, 16]

/**
 * Slide the graph's bin edges from → to while each equation crossfades its
 * LaTeX through the mass → log → softmax chain, dipping opacity at each swap.
 * Equations are staggered slightly so a row of them reads as a cascade.
 */
export function bridgeMorph(
  graphId: string,
  equationIds: string[],
  seconds = 5,
  options: { fromEdges?: BinEdges; toEdges?: BinEdges; chain?: readonly string[]; opacity?: number } = {},
  id = `bridge-${graphId}`,
): AnimationTimeline {
  const fromEdges = options.fromEdges ?? DEFAULT_BIN_EDGES_FROM
  const toEdges = options.toEdges ?? DEFAULT_BIN_EDGES_TO
  const chain = options.chain && options.chain.length >= 2 ? options.chain : BRIDGE_LATEX_CHAIN
  const resting = options.opacity ?? 1
  const tracks: AnimationTrack[] = [
    objectTrack('bin-edges', graphId, 'binEdges', [
      { time: 0, value: fromEdges.slice(), easing: 'easeInOut' },
      { time: seconds, value: toEdges.slice() },
    ]),
  ]
  const swaps = chain.length - 1
  const dip = Math.min(0.35, seconds / (swaps * 4))
  const flip = Math.min(0.01, dip / 4)
  equationIds.forEach((equationId, index) => {
    const offset = Math.min(index * 0.15, seconds * 0.2)
    const latex: KeyframeSpec[] = [{ time: 0, value: chain[0], easing: 'linear' }]
    const opacity: KeyframeSpec[] = [{ time: 0, value: resting, easing: 'easeIn' }]
    for (let swap = 1; swap <= swaps; swap += 1) {
      // Strings swap at the midpoint of a segment; a ±flip window pins that midpoint to the dip.
      const at = Math.min(seconds - flip, (seconds * swap) / (swaps + 1) + offset)
      latex.push({ time: at - flip, value: chain[swap - 1], easing: 'linear' }, { time: at + flip, value: chain[swap], easing: 'linear' })
      opacity.push(
        { time: Math.max(0, at - dip), value: resting, easing: 'easeIn' },
        { time: at, value: 0.08, easing: 'easeOut' },
        { time: Math.min(seconds, at + dip), value: resting, easing: 'easeIn' },
      )
    }
    latex.push({ time: seconds, value: chain[swaps] })
    opacity.push({ time: seconds, value: resting })
    tracks.push(objectTrack(`latex-${equationId}`, equationId, 'latex', latex))
    tracks.push(objectTrack(`opacity-${equationId}`, equationId, 'opacity', opacity))
  })
  return makeTimeline(id, 'Bridge morph', seconds, tracks)
}

/** Attention card: matrix rows top→bottom, score columns and softmax bars, then the readouts. */
export function attentionDrawIn(attentionId: string, seconds = 3, id = `attention-${attentionId}`): AnimationTimeline {
  return makeTimeline(id, 'Attention draw-in', seconds, [drawTrack(attentionId, seconds)])
}

/** Geometry: primitives draw in dependency order (base points, then what references them, ...). */
export function geometryDependencyDraw(geometryId: string, seconds = 4, id = `geometry-${geometryId}`): AnimationTimeline {
  return makeTimeline(id, 'Dependency draw', seconds, [drawTrack(geometryId, seconds)])
}

/**
 * Simplex: edges, lattice and the section plane sweep in (drawProgress), then
 * the section slides from → to over the remaining time.
 */
export function simplexSweep(simplexId: string, fromSection: number, toSection: number, seconds = 4, id = `simplex-${simplexId}`): AnimationTimeline {
  const drawSeconds = seconds * 0.55
  return makeTimeline(id, 'Simplex sweep', seconds, [
    drawTrack(simplexId, drawSeconds),
    objectTrack('section', simplexId, 'section', [
      { time: 0, value: fromSection, easing: 'linear' },
      { time: drawSeconds, value: fromSection, easing: 'easeInOut' },
      { time: seconds, value: toSection },
    ]),
  ])
}

/** Partition observatory: coefficient cells left→right, residue lanes row by row, theorem card last. */
export function partitionRows(numberTheoryId: string, seconds = 3, id = `partition-${numberTheoryId}`): AnimationTimeline {
  return makeTimeline(id, 'Partition rows', seconds, [drawTrack(numberTheoryId, seconds)])
}

/** Matrix plane: tween the matrix entries from → to so the lattice and basis vectors glide. */
export function matrixSweep(matrixId: string, fromValues: number[][], toValues: number[][], seconds = 3, id = `matrix-${matrixId}`): AnimationTimeline {
  return makeTimeline(id, 'Matrix sweep', seconds, [
    objectTrack('values', matrixId, 'values', [
      { time: 0, value: fromValues.map((row) => row.slice()), easing: 'easeInOut' },
      { time: seconds, value: toValues.map((row) => row.slice()) },
    ]),
  ])
}

/** Barycentric triangle: edges, then cevians, then P. */
export function barycentricDrawIn(barycentricId: string, seconds = 2, id = `barycentric-${barycentricId}`): AnimationTimeline {
  return makeTimeline(id, 'Barycentric draw-in', seconds, [drawTrack(barycentricId, seconds)])
}

// ---------------------------------------------------------------------------
// Registry, so tools and scripts can build presets by name.
// ---------------------------------------------------------------------------

/** Arguments a preset accepts. Which ones matter is described per preset in `params`. */
export type PresetArgs = {
  objectId?: string
  objectIds?: string[]
  seconds?: number
  from?: unknown
  to?: unknown
  /** Graph parameter name for sweepParameter. */
  parameter?: string
}

export type PresetParam = { type: string; description: string; required?: boolean; default?: unknown }

export type TimelinePreset = {
  describe: string
  /** Object kind(s) `objectId` / `objectIds` must have; omitted for camera presets. */
  kinds?: string[]
  params: Record<string, PresetParam>
  build: (args: PresetArgs) => AnimationTimeline
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isNumbers = (value: unknown, length?: number): value is number[] =>
  Array.isArray(value) && value.every(isFiniteNumber) && (length === undefined || value.length === length)
const isMatrix = (value: unknown): value is number[][] =>
  Array.isArray(value) && value.length > 0 && value.every((row) => isNumbers(row) && row.length === (value[0] as number[]).length && row.length > 0)
const isViewport = (value: unknown): value is Viewport =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  && isFiniteNumber((value as Viewport).x) && isFiniteNumber((value as Viewport).y) && isFiniteNumber((value as Viewport).zoom)

function needId(args: PresetArgs, name: string): string {
  const id = args.objectId ?? args.objectIds?.[0]
  if (typeof id !== 'string' || !id.trim()) throw new Error(`Preset ${name} needs objectId.`)
  return id
}
function needSeconds(args: PresetArgs, fallback: number, name: string): number {
  const seconds = args.seconds ?? fallback
  if (!isFiniteNumber(seconds) || seconds <= 0 || seconds > 600) throw new Error(`Preset ${name}: seconds must be between 0 and 600.`)
  return seconds
}
function needNumber(value: unknown, field: string, name: string): number {
  if (!isFiniteNumber(value)) throw new Error(`Preset ${name}: ${field} must be a finite number.`)
  return value
}
function needString(value: unknown, field: string, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Preset ${name}: ${field} must be a non-empty string.`)
  return value
}
function edgesOrUndefined(value: unknown, field: string, name: string): BinEdges | undefined {
  if (value === undefined) return undefined
  if (!isNumbers(value, 4)) throw new Error(`Preset ${name}: ${field} must be four finite numbers.`)
  return [value[0], value[1], value[2], value[3]]
}

const OBJECT_ID: PresetParam = { type: 'string', description: 'Target object id.', required: true }
const SECONDS = (fallback: number): PresetParam => ({ type: 'number', description: 'Duration in seconds.', default: fallback })

export const TIMELINE_PRESETS: Record<string, TimelinePreset> = {
  drawIn: {
    describe: 'Reveal any object with drawProgress 0→1 (ink by stroke length; math views by their staged construction).',
    params: { objectId: OBJECT_ID, seconds: SECONDS(2) },
    build: (args) => drawIn(needId(args, 'drawIn'), needSeconds(args, 2, 'drawIn')),
  },
  fadeIn: {
    describe: 'Fade an object from opacity 0 to `to` (default 1).',
    params: { objectId: OBJECT_ID, seconds: SECONDS(1), to: { type: 'number', description: 'Resting opacity 0..1.', default: 1 } },
    build: (args) => {
      const to = args.to === undefined ? 1 : needNumber(args.to, 'to', 'fadeIn')
      if (to < 0 || to > 1) throw new Error('Preset fadeIn: to must lie in [0, 1].')
      return fadeIn(needId(args, 'fadeIn'), needSeconds(args, 1, 'fadeIn'), to)
    },
  },
  sweepParameter: {
    describe: 'Ease a graph parameter (parameters.<name>) from → to.',
    kinds: ['graph'],
    params: { objectId: OBJECT_ID, parameter: { type: 'string', description: 'Parameter name, e.g. "a".', required: true }, from: { type: 'number', description: 'Start value.', required: true }, to: { type: 'number', description: 'End value.', required: true }, seconds: SECONDS(3) },
    build: (args) => sweepParameter(needId(args, 'sweepParameter'), needString(args.parameter, 'parameter', 'sweepParameter'), needNumber(args.from, 'from', 'sweepParameter'), needNumber(args.to, 'to', 'sweepParameter'), needSeconds(args, 3, 'sweepParameter')),
  },
  sweepSection: {
    describe: 'Slide a simplex section plane from → to.',
    kinds: ['simplex'],
    params: { objectId: OBJECT_ID, from: { type: 'number', description: 'Start section 0..1 (defaults to the current section).' }, to: { type: 'number', description: 'End section 0..1.', required: true }, seconds: SECONDS(3) },
    build: (args) => sweepSection(needId(args, 'sweepSection'), needNumber(args.from, 'from', 'sweepSection'), needNumber(args.to, 'to', 'sweepSection'), needSeconds(args, 3, 'sweepSection')),
  },
  cameraTo: {
    describe: 'Glide the camera to a viewport {x, y, zoom}; from defaults to the current viewport.',
    params: { to: { type: 'object', description: 'Viewport {x, y, zoom}.', required: true }, from: { type: 'object', description: 'Starting viewport; defaults to the live camera.' }, seconds: SECONDS(2) },
    build: (args) => {
      if (!isViewport(args.to)) throw new Error('Preset cameraTo: to must be a viewport {x, y, zoom}.')
      if (args.from !== undefined && !isViewport(args.from)) throw new Error('Preset cameraTo: from must be a viewport {x, y, zoom}.')
      return cameraTo(args.to, needSeconds(args, 2, 'cameraTo'), args.from)
    },
  },
  crossfadeLatex: {
    describe: 'Swap an equation LaTeX from → to with an opacity dip at the midpoint.',
    kinds: ['equation'],
    params: { objectId: OBJECT_ID, from: { type: 'string', description: 'Starting LaTeX (defaults to the current latex).' }, to: { type: 'string', description: 'Ending LaTeX.', required: true }, seconds: SECONDS(1.5) },
    build: (args) => crossfadeLatex(needId(args, 'crossfadeLatex'), needString(args.from, 'from', 'crossfadeLatex'), needString(args.to, 'to', 'crossfadeLatex'), needSeconds(args, 1.5, 'crossfadeLatex')),
  },
  densityConstruct: {
    describe: 'Graph / gamma density: axes and grid, curve left→right, shaded area, then bin edges and counting mass labels.',
    kinds: ['graph'],
    params: { objectId: OBJECT_ID, seconds: SECONDS(4) },
    build: (args) => densityConstruct(needId(args, 'densityConstruct'), needSeconds(args, 4, 'densityConstruct')),
  },
  bridgeMorph: {
    describe: 'Slide a gamma graph binEdges from → to while equations crossfade w_j → ℓ_j = log w_j → softmax(ℓ)_j = w_j.',
    kinds: ['graph'],
    params: { objectId: { type: 'string', description: 'Graph id.', required: true }, objectIds: { type: 'string[]', description: 'Equation ids to crossfade through the chain.' }, from: { type: 'number[4]', description: 'Starting bin edges (defaults to the graph binEdges).' }, to: { type: 'number[4]', description: 'Ending bin edges.', default: DEFAULT_BIN_EDGES_TO }, seconds: SECONDS(5) },
    build: (args) => {
      const graphId = needId(args, 'bridgeMorph')
      const equationIds = (args.objectIds ?? []).filter((id) => id !== graphId)
      return bridgeMorph(graphId, equationIds, needSeconds(args, 5, 'bridgeMorph'), {
        fromEdges: edgesOrUndefined(args.from, 'from', 'bridgeMorph'),
        toEdges: edgesOrUndefined(args.to, 'to', 'bridgeMorph'),
      })
    },
  },
  attentionDrawIn: {
    describe: 'Attention card: matrix rows top→bottom, score columns and softmax bars, then the readouts.',
    kinds: ['attention'],
    params: { objectId: OBJECT_ID, seconds: SECONDS(3) },
    build: (args) => attentionDrawIn(needId(args, 'attentionDrawIn'), needSeconds(args, 3, 'attentionDrawIn')),
  },
  geometryDependencyDraw: {
    describe: 'Geometry: primitives draw in dependency order (base points, then segments/lines, circles, derived points and angles).',
    kinds: ['geometry'],
    params: { objectId: OBJECT_ID, seconds: SECONDS(4) },
    build: (args) => geometryDependencyDraw(needId(args, 'geometryDependencyDraw'), needSeconds(args, 4, 'geometryDependencyDraw')),
  },
  simplexSweep: {
    describe: 'Simplex: edges, lattice and section plane draw in, then the section slides from → to.',
    kinds: ['simplex'],
    params: { objectId: OBJECT_ID, from: { type: 'number', description: 'Start section 0..1 (defaults to the current section).' }, to: { type: 'number', description: 'End section 0..1.', required: true }, seconds: SECONDS(4) },
    build: (args) => simplexSweep(needId(args, 'simplexSweep'), needNumber(args.from, 'from', 'simplexSweep'), needNumber(args.to, 'to', 'simplexSweep'), needSeconds(args, 4, 'simplexSweep')),
  },
  partitionRows: {
    describe: 'Partition observatory: coefficient cells left→right, residue lanes row by row, theorem card last.',
    kinds: ['numberTheory'],
    params: { objectId: OBJECT_ID, seconds: SECONDS(3) },
    build: (args) => partitionRows(needId(args, 'partitionRows'), needSeconds(args, 3, 'partitionRows')),
  },
  matrixSweep: {
    describe: 'Matrix plane: tween the matrix values from → to so lattice and basis vectors glide.',
    kinds: ['matrix'],
    params: { objectId: OBJECT_ID, from: { type: 'number[][]', description: 'Starting values (defaults to the current matrix).' }, to: { type: 'number[][]', description: 'Ending values, same shape.', required: true }, seconds: SECONDS(3) },
    build: (args) => {
      if (!isMatrix(args.from)) throw new Error('Preset matrixSweep: from must be a rectangular number[][].')
      if (!isMatrix(args.to)) throw new Error('Preset matrixSweep: to must be a rectangular number[][].')
      if (args.from.length !== args.to.length || args.from[0].length !== args.to[0].length) throw new Error('Preset matrixSweep: from and to must have the same shape.')
      return matrixSweep(needId(args, 'matrixSweep'), args.from, args.to, needSeconds(args, 3, 'matrixSweep'))
    },
  },
  barycentricDrawIn: {
    describe: 'Barycentric triangle: edges, then cevians, then P.',
    kinds: ['barycentric'],
    params: { objectId: OBJECT_ID, seconds: SECONDS(2) },
    build: (args) => barycentricDrawIn(needId(args, 'barycentricDrawIn'), needSeconds(args, 2, 'barycentricDrawIn')),
  },
}

export const TIMELINE_PRESET_NAMES = Object.keys(TIMELINE_PRESETS)

export const timelinePresets = {
  drawIn, fadeIn, sweepParameter, sweepSection, cameraTo, crossfadeLatex,
  densityConstruct, bridgeMorph, attentionDrawIn, geometryDependencyDraw, simplexSweep, partitionRows, matrixSweep, barycentricDrawIn,
}
