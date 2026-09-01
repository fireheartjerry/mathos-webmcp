import type { Bounds, InkObject, Point } from './types'
import capturedHandwriting from './captured-handwriting.json'

export const HANDWRITING_STORAGE_KEY = 'mathburst.handwriting.v1'

export type HandwritingSample = {
  id: string
  label?: string
  canvas: { width: number; height: number }
  strokes: Array<Array<{ x: number; y: number }>>
  capturedAt?: number
}

type HandwritingStore = { version: 1; samples: Record<string, HandwritingSample> }

const finitePoint = (point: { x: number; y: number }): point is Point =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

const BUNDLED_HANDWRITING_SAMPLES = Object.fromEntries(
  Object.entries(
    (capturedHandwriting as unknown as Partial<HandwritingStore>).samples ?? {},
  ).filter(([, sample]) => isHandwritingSample(sample)),
) as Record<string, HandwritingSample>

/** Use bundled demo ink everywhere, with same-origin studio captures as overrides. */
export function loadHandwritingSamples(): Record<string, HandwritingSample> {
  if (typeof window === 'undefined') return BUNDLED_HANDWRITING_SAMPLES
  try {
    const raw = window.localStorage.getItem(HANDWRITING_STORAGE_KEY)
    if (!raw) return BUNDLED_HANDWRITING_SAMPLES
    const parsed = JSON.parse(raw) as Partial<HandwritingStore>
    if (parsed.version !== 1 || !parsed.samples || typeof parsed.samples !== 'object') {
      return BUNDLED_HANDWRITING_SAMPLES
    }
    const localSamples = Object.fromEntries(
      Object.entries(parsed.samples).filter(([, sample]) => isHandwritingSample(sample)),
    ) as Record<string, HandwritingSample>
    return { ...BUNDLED_HANDWRITING_SAMPLES, ...localSamples }
  } catch {
    return BUNDLED_HANDWRITING_SAMPLES
  }
}

function isHandwritingSample(value: unknown): value is HandwritingSample {
  if (!value || typeof value !== 'object') return false
  const sample = value as Partial<HandwritingSample>
  return typeof sample.id === 'string'
    && Boolean(sample.canvas)
    && Number.isFinite(sample.canvas?.width)
    && Number.isFinite(sample.canvas?.height)
    && sample.canvas!.width > 0
    && sample.canvas!.height > 0
    && Array.isArray(sample.strokes)
    && sample.strokes.every((stroke) => Array.isArray(stroke) && stroke.every((point) => Boolean(point) && typeof point === 'object' && finitePoint(point as { x: number; y: number })))
}

function cropAndFit(
  sample: HandwritingSample,
  target: Bounds,
  padding = 8,
): { strokes: Point[][]; scale: number } | null {
  const sourceStrokes = sample.strokes
    .map((stroke) => stroke.filter(finitePoint))
    .filter((stroke) => stroke.length > 0)
  const points = sourceStrokes.flat()
  if (points.length === 0) return null

  const left = Math.min(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const right = Math.max(...points.map((point) => point.x))
  const bottom = Math.max(...points.map((point) => point.y))
  const sourceWidth = Math.max(1, right - left)
  const sourceHeight = Math.max(1, bottom - top)
  const availableWidth = Math.max(1, target.width - padding * 2)
  const availableHeight = Math.max(1, target.height - padding * 2)
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight)
  const fittedWidth = sourceWidth * scale
  const fittedHeight = sourceHeight * scale
  const offsetX = (target.width - fittedWidth) / 2
  const offsetY = (target.height - fittedHeight) / 2

  return {
    scale,
    strokes: sourceStrokes.map((stroke) => stroke.map((point) => ({
      x: offsetX + (point.x - left) * scale,
      y: offsetY + (point.y - top) * scale,
    }))),
  }
}

/** Turn a named studio sample into a world-local, aspect-fitted ink object. */
export function handwritingSampleToInk(
  samples: Record<string, HandwritingSample>,
  sampleId: string,
  options: Pick<InkObject, 'id' | 'bounds' | 'color' | 'width' | 'rotation' | 'author' | 'opacity'>,
): InkObject | null {
  const sample = samples[sampleId]
  if (!sample) return null
  const fitted = cropAndFit(sample, options.bounds)
  if (!fitted) return null
  return {
    ...options,
    kind: 'ink',
    points: fitted.strokes[0] ?? [],
    strokes: fitted.strokes.map((points) => ({ points })),
    strokeScale: fitted.scale,
  }
}
