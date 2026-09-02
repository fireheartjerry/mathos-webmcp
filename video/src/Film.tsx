import type { CSSProperties } from 'react'
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion'
import manifest from '../film.manifest.json'
import timeline from '../public/film/timeline.json'
import narration from '../public/film/narration.json'

/**
 * Mathburst — the cinematic product film.
 *
 * One continuous product capture (2560×1440, 60 fps) plays full-bleed. The
 * composition adds only what the product cannot: a restrained camera push per
 * shot, narration, music, and event-locked sound design. Every transition
 * between mathematical objects happened inside the product during capture.
 * Shot timing, camera keyframes and narration all come from
 * `video/film.manifest.json` plus the measured `timeline.json`.
 */

export const FILM_FPS = manifest.output.fps
export const FILM_W = manifest.output.width
export const FILM_H = manifest.output.height

type CameraKey = { at: number; zoom: number; x: number; y: number }
type ManifestShot = (typeof manifest.shots)[number]
type TimelineShot = (typeof timeline.shots)[number]

const OUT = Easing.bezier(0.22, 1, 0.36, 1)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** The film starts at the first shot's start and ends after the last shot plus a short rest. */
const FIRST = timeline.shots[0]
const LAST = timeline.shots[timeline.shots.length - 1]
const TAIL_SECONDS = 0.8
export const FILM_START = Math.max(0, FIRST.start)
export const FILM_SECONDS = Math.min(manifest.output.maxSeconds, LAST.end - FILM_START + TAIL_SECONDS)
export const FILM_FRAMES = Math.round(FILM_SECONDS * FILM_FPS)

const SHOTS = timeline.shots.map((shot: TimelineShot) => {
  const spec = manifest.shots.find((candidate: ManifestShot) => candidate.id === shot.id)
  return { ...shot, spec, filmStart: shot.start - FILM_START, filmEnd: shot.end - FILM_START }
})

/** Interpolate the manifest's camera keyframes for a shot at `t` seconds into it. */
function cameraAt(shot: (typeof SHOTS)[number], t: number): CameraKey {
  const keys: CameraKey[] = (shot.spec?.camera ?? [{ at: 0, zoom: 1, x: 0.5, y: 0.5 }]) as CameraKey[]
  if (keys.length === 1) return keys[0]
  const times = keys.map((key) => key.at)
  const pick = (field: 'zoom' | 'x' | 'y') => interpolate(t, times, keys.map((key) => key[field]), {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })
  return { at: t, zoom: pick('zoom'), x: pick('x'), y: pick('y') }
}

function useCamera(): CameraKey {
  const frame = useCurrentFrame()
  const seconds = frame / FILM_FPS
  const index = SHOTS.reduce((current, shot, candidate) => (seconds >= shot.filmStart ? candidate : current), 0)
  const shot = SHOTS[index]
  const target = cameraAt(shot, seconds - shot.filmStart)
  // Blend from the previous shot's final camera over the first 0.9 s so a cut
  // never snaps the push; the product's own camera move carries the transition.
  const previous = index > 0 ? SHOTS[index - 1] : null
  if (!previous) return target
  const from = cameraAt(previous, previous.filmEnd - previous.filmStart)
  const blend = interpolate(seconds - shot.filmStart, [0, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  return {
    at: target.at,
    zoom: from.zoom + (target.zoom - from.zoom) * blend,
    x: from.x + (target.x - from.x) * blend,
    y: from.y + (target.y - from.y) * blend,
  }
}

function Stage() {
  const camera = useCamera()
  const zoom = clamp(camera.zoom, 1, 1.35)
  const scale = zoom
  const left = clamp(FILM_W / 2 - camera.x * FILM_W * scale, FILM_W - FILM_W * scale, 0)
  const top = clamp(FILM_H / 2 - camera.y * FILM_H * scale, FILM_H - FILM_H * scale, 0)
  const style: CSSProperties = { position: 'absolute', display: 'block', width: FILM_W * scale, height: FILM_H * scale, left, top }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#f4f0e6' }}>
      <OffthreadVideo src={staticFile('film/capture.mp4')} startFrom={Math.round(FILM_START * FILM_FPS)} style={style} />
    </AbsoluteFill>
  )
}

/** A two-frame breath at the very start and end so the first frame is never a hard cut from black. */
function Breath() {
  const frame = useCurrentFrame()
  const opening = interpolate(frame, [0, 14], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  const closing = interpolate(frame, [FILM_FRAMES - 30, FILM_FRAMES - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) })
  const opacity = Math.max(opening, closing)
  if (opacity <= 0) return null
  return <AbsoluteFill style={{ background: '#f4f0e6', opacity, pointerEvents: 'none' }} />
}

function Narration() {
  const gain = Math.pow(10, (manifest.narration.gainDb ?? 0) / 20)
  return (
    <>
      {narration.clips.map((clip) => {
        const shot = SHOTS.find((candidate) => candidate.id === clip.shot)
        if (!shot) return null
        const from = Math.round((shot.filmStart + clip.offset) * FILM_FPS)
        const duration = Math.round(clip.duration * FILM_FPS) + 6
        if (from >= FILM_FRAMES) return null
        return (
          <Sequence key={clip.shot} from={from} durationInFrames={Math.min(duration, FILM_FRAMES - from)} name={`narration ${clip.shot}`}>
            <Audio src={staticFile(clip.file)} volume={gain} />
          </Sequence>
        )
      })}
    </>
  )
}

/** Music ducks under speech: the manifest's duck depth applies while any clip plays. */
function Music() {
  const base = Math.pow(10, (manifest.music.gainDb ?? -24) / 20)
  const duck = Math.pow(10, (manifest.music.duckDb ?? -6) / 20)
  const windows = narration.clips.flatMap((clip) => {
    const shot = SHOTS.find((candidate) => candidate.id === clip.shot)
    return shot ? [{ start: shot.filmStart + clip.offset, end: shot.filmStart + clip.offset + clip.duration }] : []
  })
  return (
    <Audio
      src={staticFile('film/music.wav')}
      startFrom={Math.round(FILM_START * FILM_FPS)}
      volume={(frame) => {
        const seconds = frame / FILM_FPS
        const speaking = windows.some((window) => seconds >= window.start - 0.25 && seconds <= window.end + 0.35)
        return base * (speaking ? duck : 1)
      }}
    />
  )
}

function SoundDesign() {
  return <Audio src={staticFile('film/sfx.wav')} startFrom={Math.round(FILM_START * FILM_FPS)} volume={0.9} />
}

export function Film() {
  return (
    <AbsoluteFill style={{ backgroundColor: '#f4f0e6' }}>
      <Stage />
      <Breath />
      <Narration />
      <Music />
      <SoundDesign />
    </AbsoluteFill>
  )
}
