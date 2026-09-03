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
import cutlist from '../public/film/cutlist.json'
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

/**
 * The film is cut, not played straight through. `cutlist.json` says which span of the
 * capture each shot uses and where it sits in the finished film; the pans between
 * scenes are excised there and replaced by the transitions below.
 */
/** The closing lockup holds this long after the last word. Shared with build-narration-manifest.mjs. */
const TAIL_SECONDS = 1.6
export const FILM_START = Math.max(0, timeline.shots[0].start)
/**
 * Where the narration actually stops. The tail used to run from the last SHOT,
 * which is a different moment: the closing line plays over a 13.1s shot and runs
 * 15.5s, so a shot-measured tail ended the film mid-sentence. The last frame holds
 * the closing lockup either way, so extending it costs nothing but the hold.
 */
const LAST_WORD_ENDS = Math.max(...narration.clips.map((clip) => clip.offset + clip.duration))
export const FILM_SECONDS = Math.min(
  manifest.output.maxSeconds,
  Math.max(cutlist.filmSeconds, LAST_WORD_ENDS) + TAIL_SECONDS,
)
export const FILM_FRAMES = Math.round(FILM_SECONDS * FILM_FPS)

const SHOTS = cutlist.shots.map((shot) => {
  const spec = manifest.shots.find((candidate: ManifestShot) => candidate.id === shot.id)
  return { ...shot, spec }
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

/**
 * One shot's span of the capture, with the composition's camera push applied.
 *
 * MUST be rendered inside a <Sequence from={filmStart}>. OffthreadVideo advances with
 * the frame it sees, so outside a Sequence every layer plays `srcStart + globalFrame`
 * and shows content its own filmStart seconds too late -- which silently made every
 * shot after the first display the wrong scene. Inside a Sequence the clock is
 * relative, so `startFrom` means what it says.
 */
function Segment({ shot, opacity, push }: { shot: (typeof SHOTS)[number]; opacity: number; push: number }) {
  const seconds = useCurrentFrame() / FILM_FPS
  const camera = cameraAt(shot, Math.max(0, seconds))
  // Never scale above 1. A composition zoom crops the captured frame, and what it
  // crops is the app's own chrome -- the wordmark, the tool rail, the WebMCP badge,
  // the activity panel. A frame review found the header sliced to a stray "st" and
  // the tool rail gone entirely in shots that zoomed to 1.35. The cinematography now
  // lives in the product's own camera, so the composition does not need its own.
  // Scaling BELOW 1 is safe and is what the transition push uses: the composition
  // background is the same cream as the canvas, so a receding frame shows paper.
  const zoom = Math.min(1, clamp(camera.zoom, 1, 1.35) * push)
  const left = zoom >= 1
    ? clamp(FILM_W / 2 - camera.x * FILM_W * zoom, FILM_W - FILM_W * zoom, 0)
    : (FILM_W - FILM_W * zoom) / 2
  const top = zoom >= 1
    ? clamp(FILM_H / 2 - camera.y * FILM_H * zoom, FILM_H - FILM_H * zoom, 0)
    : (FILM_H - FILM_H * zoom) / 2
  const style: CSSProperties = { position: 'absolute', display: 'block', width: FILM_W * zoom, height: FILM_H * zoom, left, top }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity }}>
      <OffthreadVideo src={staticFile('film/capture.mp4')} startFrom={Math.max(0, Math.round(shot.srcStart * FILM_FPS))} style={style} muted />
    </AbsoluteFill>
  )
}

/**
 * A real transition, not a pan.
 *
 * Every join renders both shots at once and moves through them. A `camera` join is a
 * push: the outgoing shot keeps travelling toward the viewer as it leaves and the
 * incoming one settles back from slightly too close, so the cut carries momentum in
 * one direction instead of stopping dead. A `bridge` join is gentler -- the product is
 * already animating a match between two representations underneath, and a heavy
 * effect on top would fight it -- so it is a short dissolve with almost no scale.
 *
 * Both are eased, so neither begins or ends at full velocity.
 */
function Stage() {
  const frame = useCurrentFrame()
  const seconds = frame / FILM_FPS

  // Segments OVERLAP by their transition length, so "the last shot that has started"
  // picks the incoming shot the moment the overlap opens -- the outgoing shot then
  // never renders during its own transition and every join collapses to a hard cut.
  // The active shot is the earliest one that has not yet ended.
  const running = SHOTS.findIndex((candidate) => candidate.filmEnd > seconds)
  const index = running === -1 ? SHOTS.length - 1 : running
  const shot = SHOTS[index]
  const next = SHOTS[index + 1]

  const layers: Array<{ shot: (typeof SHOTS)[number]; opacity: number; push: number }> = []
  const overlap = shot.transitionSeconds ?? 0
  const intoTransition = next && overlap > 0 ? seconds - (shot.filmEnd - overlap) : -1

  let veil = 0
  if (next && intoTransition >= 0) {
    const t = clamp(intoTransition / overlap, 0, 1)
    const eased = Easing.bezier(0.4, 0, 0.2, 1)(t)
    if (shot.kind === 'bridge') {
      // The product is animating a real match underneath; a plain cross-dissolve
      // lets one representation become the other without fighting it.
      layers.push({ shot, opacity: 1 - eased, push: 1 - 0.012 * eased })
      layers.push({ shot: next, opacity: eased, push: 1 - 0.012 * (1 - eased) })
    } else {
      // Two unrelated scenes superimposed on cream paper just reads muddy -- both are
      // light, busy and low-contrast, so a 50/50 frame is a smear rather than a blend.
      // Dipping through the paper colour instead keeps every frame clean: the outgoing
      // shot leaves into the page while pushing toward the viewer, the page holds for
      // an instant, and the incoming shot settles back out of it.
      const out = clamp(eased / 0.55, 0, 1)
      const incoming = clamp((eased - 0.45) / 0.55, 0, 1)
      // Capped below 1: at full strength the paper holds for about nine frames, which
      // reads as a flash rather than a breath. Leaving a ghost keeps the cut continuous.
      veil = 0.88 * Math.sin(Math.PI * eased)
      layers.push({ shot, opacity: 1 - out, push: 1 - 0.038 * eased })
      layers.push({ shot: next, opacity: incoming, push: 1 - 0.038 * (1 - eased) })
    }
  } else {
    layers.push({ shot, opacity: 1, push: 1 })
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#f4f0e6' }}>
      {layers.map((layer) => (
        <Sequence
          key={layer.shot.id}
          from={Math.round(layer.shot.filmStart * FILM_FPS)}
          durationInFrames={Math.max(1, Math.round((layer.shot.seconds + 1) * FILM_FPS))}
          layout="none"
          name={`shot ${layer.shot.id}`}
        >
          <Segment shot={layer.shot} opacity={layer.opacity} push={layer.push} />
        </Sequence>
      ))}
      {veil > 0 && <AbsoluteFill style={{ background: '#f4f0e6', opacity: veil, pointerEvents: 'none' }} />}
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
        // `offset` is ALREADY absolute film time: build-narration-manifest.mjs resolves
        // each clip's shot-relative offset against the cut list and enforces the no-two-
        // voices-at-once gap there. This used to look the shot up by `clip.shot` and add
        // its filmStart, but since the v3 spec `clip.shot` holds the CLIP's id and the
        // shot id moved to `overShot`, so the lookup matched nothing, every clip returned
        // null, and the film rendered with no narration at all.
        const from = Math.round(clip.offset * FILM_FPS)
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
