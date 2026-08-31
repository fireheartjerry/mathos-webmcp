import type { CSSProperties, ReactNode } from 'react'
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
 * The demo.
 *
 * The product fills the frame and a camera moves over it. This is not a deck with a
 * screenshot pasted in the middle. An earlier cut put the screencast in a 1340px box
 * floating in white, which reads as a presentation *about* software rather than software.
 *
 * The camera is not hand-placed. `scripts/record-demo.mjs` measures the bounding box of
 * the region each beat is about, at capture time, and writes it to `beats.json`. This
 * file turns those rectangles into a zoom and a centre. Measuring rather than hard-coding
 * means the camera cannot drift off the subject when the layout changes.
 *
 * Motion rules, applied throughout, because the temptation is to add more:
 *
 *   - Entrances ease out. Nothing eases in, which reads as sluggish at exactly the moment
 *     the eye is most attentive.
 *   - Nothing scales from zero. Text arrives from 0.985 and eight pixels low.
 *   - Camera moves are springs, so a move interrupted by the next beat continues from
 *     where it was instead of snapping back.
 *   - The camera never moves horizontally unless the region already spans most of the
 *     page. Zoom is capped at 1.15 and is often exactly 1. A demo that lunges at the
 *     screen is harder to read, not easier.
 *   - Exits are faster than entrances. Leaving is a system response, not a decision.
 */

export const FPS = 30
const TITLE_SECONDS = 3.6
const END_SECONDS = 4.2

/** The capture viewport in CSS pixels. The recording is 2x this in real pixels (2560x1600). */
const SRC_W = 1280
const SRC_H = 800
const FRAME_W = 1920
const FRAME_H = 1080

type Focus = { sel: string; x: number; y: number; width: number; height: number } | null
type RecordedBeat = { beat: string; startSeconds: number; endSeconds: number; focus: Focus }

const RECORDED = (beatsFile as { beats: RecordedBeat[] }).beats
const SPOKEN = narration as {
  segments: Array<{ beat: string; startSeconds: number; durationSeconds: number; text: string }>
}

/** Held on screen for the beat. Deliberately not a transcript: the voice says the rest. */
const HELD: Record<string, { marker: string; pull: string }> = {
  setup: { marker: 'The first line that stopped being true', pull: 'The page marks the first broken line, and nothing after it.' },
  hold: { marker: 'The verdict is computed, not guessed', pull: 'A computer algebra system wrote that verdict.' },
  console: { marker: 'The surface an agent sees', pull: '18 tools. 9 read the page. 9 change it.' },
  mathematics: { marker: 'An agent can check itself first', pull: 'Differentiate, evaluate, compare, against the page engine.' },
  repair: { marker: 'Agents may write', pull: 'Attribution replaces the refusal.' },
  receipt: { marker: 'The page reports who did what', pull: 'It also states what it does not prove.' },
  probe: { marker: 'What this browser actually does', pull: 'Seven features, executed here, just now.' },
}

export const SEGMENTS = SPOKEN.segments.map((s, i) => ({ ...s, ...HELD[s.beat], index: i }))
const LAST = SEGMENTS[SEGMENTS.length - 1]
const BODY_SECONDS = LAST.startSeconds + LAST.durationSeconds
export const DURATION_IN_FRAMES = Math.round((TITLE_SECONDS + BODY_SECONDS + END_SECONDS) * FPS)

const INK = '#000000'
const PAPER = '#ffffff'
const RULE = '#e0e0e0'
const SOFT = '#444444'
const MUTED = '#6f6f6f'
const SERIF = "'STIXTwo', Georgia, 'Times New Roman', serif"
const MONO = "'FiraCodeVideo', ui-monospace, Consolas, monospace"
const OUT = Easing.bezier(0.23, 1, 0.32, 1)

const frames = (seconds: number) => Math.round(seconds * FPS)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Where the camera sits for a beat: a zoom, and a point in CSS coordinates to centre. */
type Shot = { zoom: number; cx: number; cy: number }

/**
 * Frames the measured region.
 *
 * The page is two columns across its full width, and that constrains the camera far more
 * than it first appears. Filling the frame with one region necessarily slices both
 * columns: at a 1.5 ceiling the console beat showed the right half of the working beside
 * the left half of the console, and a still at 1.22 was still cutting expressions in half
 * at the left edge. Neither reads as a product.
 *
 * So the rule is narrow, and it is about width:
 *
 *   - A region that already spans most of the page (the working, the receipt) can take a
 *     gentle push and a horizontal move, because moving toward something that wide cannot
 *     cut much off the other side.
 *   - A narrow region (the console is 256 of 1280 CSS pixels) gets no zoom and no
 *     horizontal move at all. The whole page stays on screen and the reticle points.
 *
 * Vertical movement is always allowed: the page is 800 CSS pixels tall in a 720-pixel
 * window, so following a region down the page costs nothing.
 *
 * Directing attention is the reticle's job. The camera's job is to stay out of the way
 * while keeping the interface legible.
 */
const WIDE_ENOUGH = 0.55
const MAX_ZOOM_WIDE = 1.15

function shotFor(focus: Focus): Shot {
  if (!focus) return { zoom: 1, cx: SRC_W / 2, cy: SRC_H / 2 }
  const base = FRAME_W / SRC_W
  const wide = focus.width >= SRC_W * WIDE_ENOUGH
  const zoom = wide ? clamp((FRAME_W * 0.78) / (focus.width * base), 1, MAX_ZOOM_WIDE) : 1
  const cx = wide ? focus.x + focus.width / 2 : SRC_W / 2
  const visibleCss = FRAME_H / (base * zoom)
  // A region taller than the window is anchored near its top, where its heading is.
  const cy = focus.height > visibleCss ? focus.y + visibleCss / 2 : focus.y + focus.height / 2
  return { zoom, cx, cy }
}

const SHOTS = RECORDED.map((b) => ({ beat: b.beat, at: b.startSeconds, shot: shotFor(b.focus), focus: b.focus }))

/** Places the camera so the frame is always covered by picture, never by background. */
function place({ zoom, cx, cy }: Shot) {
  const scale = (FRAME_W / SRC_W) * zoom
  return {
    scale,
    left: clamp(FRAME_W / 2 - cx * scale, FRAME_W - SRC_W * scale, 0),
    top: clamp(FRAME_H / 2 - cy * scale, FRAME_H - SRC_H * scale, 0),
  }
}

/** The current camera, springing between shots rather than cutting between them. */
function useCamera() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const seconds = frame / FPS

  let index = 0
  for (let i = 0; i < SHOTS.length; i += 1) if (seconds >= SHOTS[i].at) index = i
  const from = SHOTS[Math.max(0, index - 1)].shot
  const to = SHOTS[index].shot
  const since = frame - frames(SHOTS[index].at)
  // 1.4s to travel: long enough to read as a move, short enough to arrive before the
  // narration reaches the thing it is moving to.
  const t = index === 0 ? 1 : spring({ frame: since, fps, config: { damping: 200, mass: 1.1 }, durationInFrames: 42 })

  const live: Shot = {
    zoom: mix(from.zoom, to.zoom, t),
    cx: mix(from.cx, to.cx, t),
    cy: mix(from.cy, to.cy, t),
  }
  // A slow push within the shot, so a page that does not animate is never a still image.
  const drift = interpolate(since, [0, 40 * FPS], [0, 0.022], { extrapolateRight: 'clamp' })
  return { ...place({ ...live, zoom: live.zoom + drift }), index, since }
}

/** The product, full bleed. Nothing covers it except the two text cards. */
function Stage() {
  const { scale, left, top } = useCamera()
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: PAPER }}>
      <OffthreadVideo
        src={staticFile('screen.mp4')}
        style={{ position: 'absolute', width: SRC_W * scale, height: SRC_H * scale, left, top }}
      />
    </AbsoluteFill>
  )
}

/**
 * A rule drawn around the region the beat is about, for the moment the camera arrives.
 *
 * The coordinates are the ones measured during capture, so it lands on the real element
 * rather than on a guess. It fades once it has done its work. Leaving it up would turn
 * the film into a diagram.
 */
function Reticle() {
  const { scale, left, top, index, since } = useCamera()
  const { fps } = useVideoConfig()
  const focus = SHOTS[index].focus
  if (!focus) return null
  const draw = spring({ frame: since - 10, fps, config: { damping: 200 }, durationInFrames: 20 })
  const fade = interpolate(since, [10, 22, 70, 96], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: OUT,
  })
  const pad = 12
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: left + focus.x * scale - pad,
          top: top + focus.y * scale - pad,
          width: focus.width * scale + pad * 2,
          height: focus.height * scale + pad * 2,
          border: `2px solid ${INK}`,
          opacity: fade * 0.45,
          transform: `scale(${mix(1.012, 1, draw)})`,
        }}
      />
    </AbsoluteFill>
  )
}

function useEntrance(total: number, delay = 0) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 }, durationInFrames: 18 })
  const exit = interpolate(frame, [total - 9, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: OUT,
  })
  return {
    opacity: enter * exit,
    transform: `translateY(${interpolate(enter, [0, 1], [8, 0])}px) scale(${interpolate(enter, [0, 1], [0.985, 1])})`,
  }
}

const CARD: CSSProperties = {
  background: 'rgba(255,255,255,0.94)',
  border: `1px solid ${RULE}`,
  boxShadow: '0 10px 34px rgba(0,0,0,0.10)',
}

/** Beat number and name, over the picture rather than in a band beside it. */
function Marker({ segment, total }: { segment: (typeof SEGMENTS)[number]; total: number }) {
  const number = useEntrance(total, 0)
  const name = useEntrance(total, 2)
  return (
    <AbsoluteFill style={{ padding: 44, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <div style={{ ...CARD, display: 'flex', alignItems: 'baseline', gap: 20, padding: '16px 26px' }}>
        <span
          style={{
            ...number,
            fontFamily: MONO,
            fontSize: 18,
            letterSpacing: '0.06em',
            color: MUTED,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(segment.index + 1).padStart(2, '0')} / {String(SEGMENTS.length).padStart(2, '0')}
        </span>
        <span style={{ ...name, fontFamily: SERIF, fontSize: 34, fontWeight: 600, letterSpacing: '-0.012em', color: INK }}>
          {segment.marker}
        </span>
      </div>
    </AbsoluteFill>
  )
}

/** One line, held, bottom left. */
function Held({ segment, total }: { segment: (typeof SEGMENTS)[number]; total: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const line = useEntrance(total, 4)
  const grow = spring({ frame: frame - 4, fps, config: { damping: 200, mass: 0.5 }, durationInFrames: 20 })
  return (
    <AbsoluteFill style={{ padding: 44, paddingBottom: 64, alignItems: 'flex-start', justifyContent: 'flex-end' }}>
      <div style={{ ...CARD, display: 'flex', alignItems: 'stretch', gap: 18, padding: '16px 26px 16px 0' }}>
        <div style={{ width: 3, background: INK, transform: `scaleY(${grow})`, transformOrigin: 'top', opacity: line.opacity }} />
        <span style={{ ...line, fontFamily: SERIF, fontSize: 32, lineHeight: 1.35, color: SOFT }}>{segment.pull}</span>
      </div>
    </AbsoluteFill>
  )
}

/** Seven segments pinned to the frame edge. The only continuous motion in the film. */
function Progress({ elapsed }: { elapsed: number }) {
  const gap = 6
  const each = (FRAME_W - gap * (SEGMENTS.length - 1)) / SEGMENTS.length
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', gap, height: 4 }}>
        {SEGMENTS.map((segment) => {
          const fill = clamp((elapsed - segment.startSeconds) / segment.durationSeconds, 0, 1)
          return (
            <div key={segment.beat} style={{ width: each, height: 4, background: 'rgba(0,0,0,0.16)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, background: INK }} />
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

function Rise({ children, at = 0 }: { children: ReactNode; at?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 22 })
  return <div style={{ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` }}>{children}</div>
}

function TitleCard() {
  const frame = useCurrentFrame()
  const total = frames(TITLE_SECONDS)
  const out = interpolate(frame, [total - 12, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  return (
    <AbsoluteFill style={{ background: PAPER, paddingLeft: 200, paddingRight: 200, justifyContent: 'center', opacity: out }}>
      <Rise>
        <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.06em', color: MUTED, marginBottom: 24 }}>MATHOS</div>
      </Rise>
      <Rise at={5}>
        <div style={{ fontFamily: SERIF, fontSize: 92, fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1.04, color: INK }}>
          Second Try
        </div>
      </Rise>
      <Rise at={11}>
        <div style={{ fontFamily: SERIF, fontSize: 33, lineHeight: 1.42, color: SOFT, marginTop: 24, maxWidth: 1120 }}>
          A calculus scratchpad. The page checks the working and marks the first line that
          stopped being true. Eighteen WebMCP tools let an agent read it, verify against the
          same engine, and write.
        </div>
      </Rise>
      <Rise at={11}>
        <div style={{ height: 3, width: 92, background: INK, marginTop: 32 }} />
      </Rise>
    </AbsoluteFill>
  )
}

function EndCard() {
  return (
    <AbsoluteFill style={{ background: PAPER, paddingLeft: 200, paddingRight: 200, justifyContent: 'center' }}>
      <Rise>
        <div style={{ fontFamily: SERIF, fontSize: 50, fontWeight: 600, letterSpacing: '-0.018em', color: INK }}>
          Everything in this film was executed, not staged.
        </div>
      </Rise>
      <Rise at={6}>
        <div style={{ marginTop: 30, fontFamily: MONO, fontSize: 23, lineHeight: 1.75, color: SOFT }}>
          <div>github.com/fireheartjerry/mathos-webmcp</div>
          <div>mathos-second-try.fireheartjerry.chatgpt.site</div>
        </div>
      </Rise>
      <Rise at={6}>
        <div style={{ marginTop: 32, fontFamily: SERIF, fontSize: 21, color: MUTED }}>
          MIT licensed. Built for the WebMCP Challenge.
        </div>
      </Rise>
    </AbsoluteFill>
  )
}

function Body() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Stage />
      <Reticle />
      {SEGMENTS.map((segment) => {
        const total = frames(segment.durationSeconds)
        return (
          <Sequence key={segment.beat} from={frames(segment.startSeconds)} durationInFrames={total} name={segment.beat}>
            <Marker segment={segment} total={total} />
            <Held segment={segment} total={total} />
            <Audio src={staticFile(`seg${String(segment.index).padStart(2, '0')}.wav`)} />
          </Sequence>
        )
      })}
      <Progress elapsed={frame / FPS} />
    </AbsoluteFill>
  )
}

export function Demo() {
  const bodyStart = frames(TITLE_SECONDS)
  const bodyFrames = frames(BODY_SECONDS)
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <style>{`
        @font-face { font-family: 'STIXTwo'; src: url('${staticFile('stix-two-text-var.woff2')}') format('woff2'); font-weight: 400 700; }
        @font-face { font-family: 'FiraCodeVideo'; src: url('${staticFile('fira-code-var.woff2')}') format('woff2'); font-weight: 300 700; }
      `}</style>
      <Sequence durationInFrames={bodyStart} name="title"><TitleCard /></Sequence>
      <Sequence from={bodyStart} durationInFrames={bodyFrames} name="body"><Body /></Sequence>
      <Sequence from={bodyStart + bodyFrames} name="end"><EndCard /></Sequence>
    </AbsoluteFill>
  )
}
