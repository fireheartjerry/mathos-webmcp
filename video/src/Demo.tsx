import type { CSSProperties } from 'react'
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import narration from '../public/narration.json'
import beatsFile from '../public/beats.json'

/**
 * The Mathburst film keeps the real product on screen for its entire duration.
 * There is no title card or end card: frame one is already a functioning whiteboard,
 * and the final beat closes on the product itself.
 *
 * `beats.json` is measured from the captured page. Focus rectangles are used only for
 * restrained camera moves. Narrow regions keep the whole product in view so a tool
 * panel or equation can never be enlarged at the expense of the subject.
 */

export const FPS = 30
const SRC_W = 1280
const SRC_H = 800
const FRAME_W = 1920
const FRAME_H = 1080

type Focus = { sel: string; x: number; y: number; width: number; height: number } | null
type RecordedBeat = { beat: string; startSeconds: number; endSeconds: number; focus: Focus }
type SpokenSegment = { beat: string; startSeconds: number; durationSeconds: number; text: string }

const RECORDED = (beatsFile as { beats: RecordedBeat[] }).beats
const SPOKEN = narration as { segments: SpokenSegment[] }

type HeldCopy = { marker: string; caption: string }

const HELD_BY_INDEX: HeldCopy[] = [
  { marker: 'Photograph → live mathematics', caption: 'The page turns a problem image into editable, semantic math.' },
  { marker: 'The learner stays in the work', caption: 'A repeated mistake unlocks a tutor question, not an answer dump.' },
  { marker: 'One world, two representations', caption: 'The tutor adds a graph linked to the live equation.' },
  { marker: 'Agents act inside the world', caption: 'The same handler creates visible, attributed, undoable changes.' },
  { marker: 'Dependencies stay live', caption: 'Move a point and the construction recomputes.' },
  { marker: 'Matrices become geometry', caption: 'Edit a cell and linked vectors move with it.' },
  { marker: 'Eighteen tools. One mathematical world.', caption: 'The page owns the state. Any WebMCP tutor can inhabit it.' },
]

/** Aliases keep the copy aligned if capture labels use shorter beat names. */
const HELD_BY_BEAT: Record<string, HeldCopy> = {
  source: HELD_BY_INDEX[0], setup: HELD_BY_INDEX[0], calculus: HELD_BY_INDEX[0],
  mistake: HELD_BY_INDEX[1], tutoring: HELD_BY_INDEX[1], attempts: HELD_BY_INDEX[1],
  graph: HELD_BY_INDEX[2], representation: HELD_BY_INDEX[2],
  parity: HELD_BY_INDEX[3], agent: HELD_BY_INDEX[3], action: HELD_BY_INDEX[3],
  geometry: HELD_BY_INDEX[4], construction: HELD_BY_INDEX[4],
  matrix: HELD_BY_INDEX[5], transformer: HELD_BY_INDEX[5],
  close: HELD_BY_INDEX[6], closing: HELD_BY_INDEX[6],
}

export const SEGMENTS = SPOKEN.segments.map((segment, index) => ({
  ...segment,
  ...(HELD_BY_BEAT[segment.beat] ?? HELD_BY_INDEX[index] ?? HELD_BY_INDEX[HELD_BY_INDEX.length - 1]),
  focus: RECORDED.find((beat) => beat.beat === segment.beat)?.focus ?? RECORDED[index]?.focus ?? null,
  index,
}))

const lastSegment = SEGMENTS[SEGMENTS.length - 1]
const BODY_SECONDS = lastSegment ? lastSegment.startSeconds + lastSegment.durationSeconds : 155
export const DURATION_IN_FRAMES = Math.round(BODY_SECONDS * FPS)

const INK = '#191816'
const IVORY = '#f5f1e8'
const PURPLE = '#7c5cff'
const SERIF = "'STIXTwo', Georgia, 'Times New Roman', serif"
const MONO = "'FiraCodeVideo', ui-monospace, Consolas, monospace"
const OUT = Easing.bezier(0.23, 1, 0.32, 1)
const CARD: CSSProperties = {
  background: 'rgba(245,241,232,0.94)',
  border: `1px solid ${INK}`,
  boxShadow: '8px 8px 0 rgba(25,24,22,0.18)',
}

const frames = (seconds: number) => Math.round(seconds * FPS)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount

type Shot = { zoom: number; cx: number; cy: number }

/** A narrow focus stays at a full-page shot. Broad regions get only a gentle push. */
function shotFor(focus: Focus): Shot {
  if (!focus) return { zoom: 1, cx: SRC_W / 2, cy: SRC_H / 2 }
  const base = FRAME_W / SRC_W
  const wide = focus.width >= SRC_W * 0.52
  const zoom = wide ? clamp((FRAME_W * 0.82) / (focus.width * base), 1, 1.08) : 1
  const cx = wide ? focus.x + focus.width / 2 : SRC_W / 2
  const visibleCss = FRAME_H / (base * zoom)
  const cy = focus.height > visibleCss ? focus.y + visibleCss / 2 : focus.y + focus.height / 2
  return { zoom, cx, cy }
}

const SHOTS = SEGMENTS.map((segment) => ({
  at: segment.startSeconds,
  shot: shotFor(segment.focus),
  focus: segment.focus,
}))

function place({ zoom, cx, cy }: Shot) {
  const scale = (FRAME_W / SRC_W) * zoom
  return {
    scale,
    left: clamp(FRAME_W / 2 - cx * scale, FRAME_W - SRC_W * scale, 0),
    top: clamp(FRAME_H / 2 - cy * scale, FRAME_H - SRC_H * scale, 0),
  }
}

function useCamera() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const seconds = frame / FPS
  const index = SHOTS.reduce((current, shot, candidate) => seconds >= shot.at ? candidate : current, 0)
  const from = SHOTS[Math.max(0, index - 1)]?.shot ?? { zoom: 1, cx: SRC_W / 2, cy: SRC_H / 2 }
  const to = SHOTS[index]?.shot ?? from
  const since = frame - frames(SHOTS[index]?.at ?? 0)
  const travel = index === 0 ? 1 : spring({ frame: since, fps, config: { damping: 200, mass: 1.1 }, durationInFrames: 42 })
  const live: Shot = {
    zoom: mix(from.zoom, to.zoom, travel),
    cx: mix(from.cx, to.cx, travel),
    cy: mix(from.cy, to.cy, travel),
  }
  const drift = interpolate(since, [0, 40 * FPS], [0, 0.018], { extrapolateRight: 'clamp' })
  return { ...place({ ...live, zoom: live.zoom + drift }), index, since }
}

function Stage() {
  const { scale, left, top } = useCamera()
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: INK }}>
      <OffthreadVideo
        src={staticFile('screen.mp4')}
        style={{ position: 'absolute', display: 'block', width: SRC_W * scale, height: SRC_H * scale, left, top }}
      />
    </AbsoluteFill>
  )
}

function Reticle() {
  const { scale, left, top, index, since } = useCamera()
  const { fps } = useVideoConfig()
  const focus = SHOTS[index]?.focus
  if (!focus) return null
  const draw = spring({ frame: since - 8, fps, config: { damping: 200 }, durationInFrames: 20 })
  const fade = interpolate(since, [8, 20, 64, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  const pad = 10
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: left + focus.x * scale - pad, top: top + focus.y * scale - pad, width: focus.width * scale + pad * 2, height: focus.height * scale + pad * 2, border: `2px solid ${PURPLE}`, opacity: fade * 0.55, transform: `scale(${mix(1.012, 1, draw)})` }} />
    </AbsoluteFill>
  )
}

function useEntrance(total: number, delay = 0) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 }, durationInFrames: 18 })
  const exit = interpolate(frame, [total - 9, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  return { opacity: enter * exit, transform: `translateY(${interpolate(enter, [0, 1], [8, 0])}px) scale(${interpolate(enter, [0, 1], [0.985, 1])})` }
}

function Marker({ segment, total }: { segment: (typeof SEGMENTS)[number]; total: number }) {
  const entrance = useEntrance(total)
  return (
    <AbsoluteFill style={{ padding: 40, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <div style={{ ...CARD, ...entrance, display: 'flex', alignItems: 'baseline', gap: 18, padding: '13px 20px' }}>
        <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.08em', color: PURPLE, fontVariantNumeric: 'tabular-nums' }}>{String(segment.index + 1).padStart(2, '0')} / {String(SEGMENTS.length).padStart(2, '0')}</span>
        <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, letterSpacing: '-0.012em', color: INK }}>{segment.marker}</span>
      </div>
    </AbsoluteFill>
  )
}

function Caption({ segment, total }: { segment: (typeof SEGMENTS)[number]; total: number }) {
  const entrance = useEntrance(total, 4)
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const grow = spring({ frame: frame - 4, fps, config: { damping: 200, mass: 0.5 }, durationInFrames: 20 })
  return (
    <AbsoluteFill style={{ padding: 40, paddingBottom: 54, alignItems: 'flex-start', justifyContent: 'flex-end' }}>
      <div style={{ ...CARD, ...entrance, display: 'flex', alignItems: 'stretch', gap: 16, padding: '13px 22px 13px 0', maxWidth: 1320 }}>
        <div style={{ width: 4, background: PURPLE, transform: `scaleY(${grow})`, transformOrigin: 'top' }} />
        <span style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.3, color: INK }}>{segment.caption}</span>
      </div>
    </AbsoluteFill>
  )
}

function Progress({ elapsed }: { elapsed: number }) {
  const gap = 5
  const each = (FRAME_W - gap * (SEGMENTS.length - 1)) / SEGMENTS.length
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', gap, height: 3 }}>
        {SEGMENTS.map((segment) => {
          const fill = clamp((elapsed - segment.startSeconds) / segment.durationSeconds, 0, 1)
          return <div key={`${segment.beat}-${segment.index}`} style={{ width: each, height: 3, background: 'rgba(25,24,22,0.2)', position: 'relative' }}><div style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, background: PURPLE }} /></div>
        })}
      </div>
    </AbsoluteFill>
  )
}

function Body() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Stage />
      <Reticle />
      {SEGMENTS.map((segment) => (
        <Sequence key={`${segment.beat}-${segment.index}`} from={frames(segment.startSeconds)} durationInFrames={frames(segment.durationSeconds)} name={segment.beat}>
          <Marker segment={segment} total={frames(segment.durationSeconds)} />
          <Caption segment={segment} total={frames(segment.durationSeconds)} />
          <Audio src={staticFile(`seg${String(segment.index).padStart(2, '0')}.wav`)} />
        </Sequence>
      ))}
      <Progress elapsed={frame / FPS} />
    </AbsoluteFill>
  )
}

export function Demo() {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <style>{`
        @font-face { font-family: 'STIXTwo'; src: url('${staticFile('stix-two-text-var.woff2')}') format('woff2'); font-weight: 400 700; }
        @font-face { font-family: 'FiraCodeVideo'; src: url('${staticFile('fira-code-var.woff2')}') format('woff2'); font-weight: 300 700; }
      `}</style>
      <Body />
    </AbsoluteFill>
  )
}
