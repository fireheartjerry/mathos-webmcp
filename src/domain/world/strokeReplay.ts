import type { AnimationTimeline } from '../animation/types'
import { handwritingSampleToInk, type HandwritingSample } from './handwriting'
import type { InkObject, Point } from './types'

export type StrokeReplayOptions = Pick<InkObject, 'id' | 'bounds' | 'color' | 'width' | 'rotation' | 'author' | 'opacity'>

export type StrokeReplayEntry = {
  index: number
  /** Path length of this stroke in the ink's local units. */
  length: number
  /** Cumulative length at the start and end of this stroke. */
  startLength: number
  endLength: number
  /** drawProgress values at which this stroke starts and finishes being revealed. */
  startProgress: number
  endProgress: number
  /** Wall-clock seconds at which this stroke starts and finishes when each stroke takes `secondsPerStroke`. */
  startSeconds: number
  endSeconds: number
}

export type StrokeReplaySchedule = {
  totalLength: number
  totalSeconds: number
  strokes: StrokeReplayEntry[]
  /** Index of the stroke being drawn at a drawProgress value (last stroke once complete). */
  strokeAt: (progress: number) => number
  /** drawProgress that corresponds to `seconds` on the per-stroke schedule. */
  progressAtSeconds: (seconds: number) => number
}

const strokesOf = (ink: InkObject): Point[][] =>
  ink.strokes && ink.strokes.length > 0 ? ink.strokes.map((stroke) => stroke.points) : [ink.points]

export function strokeLength(points: Point[]): number {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  return length
}

/**
 * Cumulative stroke lengths for an ink object.
 *
 * Mapping contract with WorldObjectView: `drawProgress` p reveals the first
 * `p * totalLength` units of path, walking `strokes` in order (legacy
 * single-stroke ink uses `points`). So stroke i is "being drawn" while
 * `startProgress <= p < endProgress`, and a linear drawProgress tween moves the
 * pen at constant speed regardless of stroke count. Zero-length strokes (dots)
 * are given a tiny epsilon so they still occupy a slice of progress.
 */
export function strokeReplaySchedule(ink: InkObject, secondsPerStroke = 0.35): StrokeReplaySchedule {
  const lengths = strokesOf(ink).map((points) => Math.max(strokeLength(points), 0.001))
  const totalLength = lengths.reduce((sum, length) => sum + length, 0)
  const strokes: StrokeReplayEntry[] = []
  let cumulative = 0
  lengths.forEach((length, index) => {
    const startLength = cumulative
    cumulative += length
    strokes.push({
      index,
      length,
      startLength,
      endLength: cumulative,
      startProgress: totalLength > 0 ? startLength / totalLength : 0,
      endProgress: totalLength > 0 ? cumulative / totalLength : 1,
      startSeconds: index * secondsPerStroke,
      endSeconds: (index + 1) * secondsPerStroke,
    })
  })
  const totalSeconds = lengths.length * secondsPerStroke
  return {
    totalLength,
    totalSeconds,
    strokes,
    strokeAt: (progress) => {
      const p = Math.min(1, Math.max(0, progress))
      const found = strokes.findIndex((entry) => p < entry.endProgress)
      return found === -1 ? Math.max(0, strokes.length - 1) : found
    },
    progressAtSeconds: (seconds) => {
      if (strokes.length === 0 || secondsPerStroke <= 0) return 1
      const s = Math.min(Math.max(0, seconds), totalSeconds)
      const index = Math.min(strokes.length - 1, Math.floor(s / secondsPerStroke))
      const entry = strokes[index]
      const within = (s - entry.startSeconds) / secondsPerStroke
      return entry.startProgress + (entry.endProgress - entry.startProgress) * Math.min(1, Math.max(0, within))
    },
  }
}

/** Timeline that tweens `drawProgress` 0 to 1 linearly over `seconds` (pen speed proportional to path length). */
export function revealTimeline(objectId: string, seconds: number, timelineId = `reveal-${objectId}`): AnimationTimeline {
  const duration = Math.max(0, seconds)
  return {
    id: timelineId,
    name: 'Stroke replay',
    duration,
    playbackRange: { start: 0, end: duration },
    tracks: {
      draw: {
        id: 'draw',
        target: { kind: 'object', objectId, path: 'drawProgress' },
        keyframes: {
          k0: { id: 'k0', time: 0, value: 0, easing: 'linear' },
          k1: { id: 'k1', time: duration, value: 1 },
        },
      },
    },
  }
}

/**
 * Variant that spends `secondsPerStroke` on every stroke (a human cadence),
 * using one keyframe per stroke boundary so progress stays linear in length
 * inside each stroke.
 */
export function revealTimelinePerStroke(ink: InkObject, objectId: string, secondsPerStroke: number, timelineId = `reveal-${objectId}`): AnimationTimeline {
  const schedule = strokeReplaySchedule(ink, secondsPerStroke)
  const frames = schedule.strokes.flatMap((entry, index) => {
    const start = { id: `s${index}`, time: entry.startSeconds, value: entry.startProgress, easing: 'linear' as const }
    return index === schedule.strokes.length - 1
      ? [start, { id: `s${index + 1}`, time: entry.endSeconds, value: 1, easing: 'linear' as const }]
      : [start]
  })
  return {
    id: timelineId,
    name: 'Stroke replay',
    duration: schedule.totalSeconds,
    playbackRange: { start: 0, end: schedule.totalSeconds },
    tracks: {
      draw: {
        id: 'draw',
        target: { kind: 'object', objectId, path: 'drawProgress' },
        keyframes: Object.fromEntries(frames.map((frame) => [frame.id, frame])),
      },
    },
  }
}

export type StrokeReplay = {
  /** Final ink object; put it with `drawProgress: 0` before playing. */
  ink: InkObject
  schedule: StrokeReplaySchedule
  /** Timeline revealing the ink over `seconds`; defaults to this ink's id. */
  revealTimeline: (seconds: number, objectId?: string) => AnimationTimeline
  /** Timeline revealing stroke by stroke at a fixed cadence. */
  revealTimelinePerStroke: (secondsPerStroke: number, objectId?: string) => AnimationTimeline
}

/**
 * Build a replayable ink object from a captured handwriting sample.
 *
 * Workspace recipe: (a) `put` `{ ...ink, drawProgress: 0 }`, (b) `putTimeline`
 * the reveal timeline and play it, (c) on `onEnd` put the ink again without
 * `drawProgress` (and reset/remove the timeline) so the object is fully drawn
 * and no transient field is persisted.
 */
export function buildStrokeReplay(
  sampleId: string,
  samples: Record<string, HandwritingSample>,
  options: StrokeReplayOptions,
): StrokeReplay | null {
  const ink = handwritingSampleToInk(samples, sampleId, options)
  if (!ink) return null
  return {
    ink,
    schedule: strokeReplaySchedule(ink),
    revealTimeline: (seconds, objectId = ink.id) => revealTimeline(objectId, seconds),
    revealTimelinePerStroke: (secondsPerStroke, objectId = ink.id) => revealTimelinePerStroke(ink, objectId, secondsPerStroke),
  }
}
