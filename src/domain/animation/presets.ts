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

/** Reveal an ink/shape object stroke by stroke (drawProgress 0 to 1, linear so speed matches path length). */
export function drawIn(objectId: string, seconds: number, id = `draw-${objectId}`): AnimationTimeline {
  return makeTimeline(id, 'Draw in', seconds, [
    objectTrack('draw', objectId, 'drawProgress', [
      { time: 0, value: 0, easing: 'linear' },
      { time: seconds, value: 1 },
    ]),
  ])
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

export const timelinePresets = { drawIn, fadeIn, sweepParameter, sweepSection, cameraTo, crossfadeLatex }
