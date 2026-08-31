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

/**
 * The demo, composed rather than merely recorded.
 *
 * The screencast is the evidence and stays the subject. It is never cut during a verdict,
 * never sped up, and never covered. Everything around it is there so a viewer can follow
 * what just happened: which beat this is, the one sentence that matters, and how far
 * through the run they are.
 *
 * Motion rules, applied throughout and worth stating because the temptation is to add
 * more of it:
 *
 *   - Entrances ease out. Nothing eases in, which reads as sluggish at the moment the eye
 *     is most attentive.
 *   - Nothing scales from zero. Text arrives from 0.985 and eight pixels below its rest
 *     position, because objects do not appear out of nothing.
 *   - Bands stagger by two frames rather than arriving together.
 *   - Exits are faster than entrances. Leaving is a system response, not a decision.
 *   - The only continuous motion is the progress rule, which is information.
 *
 * The typeface is the product's own STIX Two Text, loaded from the same woff2 the page
 * ships, so the film and the thing it is about are set in one face.
 */

export const FPS = 30

const TITLE_SECONDS = 4
const END_SECONDS = 4.4

type Segment = {
  beat: string
  startSeconds: number
  durationSeconds: number
  text: string
  marker: string
  /** The one line held on screen. Not a transcript of the narration. */
  pull: string
}

/** Spoken text and beat timing come from the file the narration is built from. */
const SPOKEN = narration as { segments: Array<{ beat: string; startSeconds: number; durationSeconds: number; text: string }> }

const MARKERS: Record<string, { marker: string; pull: string }> = {
  setup: {
    marker: 'The first line that stopped being true',
    pull: 'The page marks the first broken line, and nothing after it.',
  },
  hold: {
    marker: 'The verdict is computed, not guessed',
    pull: 'A computer algebra system wrote that verdict.',
  },
  console: {
    marker: 'The surface an agent sees',
    pull: '18 tools. 9 read the page. 9 change it.',
  },
  mathematics: {
    marker: 'An agent can check itself first',
    pull: 'Differentiate, evaluate, compare. Against the page engine.',
  },
  repair: {
    marker: 'Agents may write',
    pull: 'Attribution replaces the refusal.',
  },
  receipt: {
    marker: 'The page reports who did what',
    pull: 'It also states what it does not prove.',
  },
  probe: {
    marker: 'What this browser actually does',
    pull: 'Seven features, executed here, just now.',
  },
}

export const SEGMENTS: Segment[] = SPOKEN.segments.map((s) => ({
  beat: s.beat,
  startSeconds: s.startSeconds,
  durationSeconds: s.durationSeconds,
  text: s.text,
  ...MARKERS[s.beat],
}))

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

/** A strong ease-out. The built-in curves are too weak to read as deliberate. */
const OUT = Easing.bezier(0.23, 1, 0.32, 1)

/**
 * Layout, derived once. Every offset below comes from these, so a longer marker cannot
 * reach the picture and a caption cannot cover it. An earlier cut placed the marker
 * independently and a long label ran straight across the product.
 */
const MARGIN = 290
const STAGE_WIDTH = 1920 - MARGIN * 2
const STAGE_HEIGHT = Math.round((STAGE_WIDTH / 1280) * 800)
const TOP_BAND = 38
const STAGE_TOP = 116
const PULL_HEIGHT = 52
const PULL_TOP = STAGE_TOP + STAGE_HEIGHT + 28
const PROGRESS_TOP = PULL_TOP + PULL_HEIGHT + 18

// Four bands must fit inside 1080 with nothing overlapping. The first cut had the
// progress rule at a fixed 1052, which landed inside the pull line's box.
if (PROGRESS_TOP + 3 > 1080) {
  throw new Error(`Layout overflows the frame: progress ends at ${PROGRESS_TOP + 3}px of 1080`)
}

const frames = (seconds: number) => Math.round(seconds * FPS)

/** Enters from slightly small and slightly low, leaves faster than it arrived. */
function useEntrance(total: number, delay = 0) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 }, durationInFrames: 18 })
  const exit = interpolate(frame, [total - 8, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: OUT,
  })
  return {
    opacity: enter * exit,
    transform: `translateY(${interpolate(enter, [0, 1], [8, 0])}px) scale(${interpolate(enter, [0, 1], [0.985, 1])})`,
  }
}

/** The screencast. Bordered, shadowed, and never covered by anything. */
function Stage() {
  const frame = useCurrentFrame()
  // A 1.5% drift across the whole film. Below the threshold of notice per second, but it
  // stops a static screenshot of a static page from reading as a still image.
  const scale = interpolate(frame, [0, DURATION_IN_FRAMES], [1, 1.015], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: STAGE_TOP }}>
      <div
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          border: `1px solid ${RULE}`,
          boxShadow: '0 18px 48px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          background: PAPER,
        }}
      >
        <OffthreadVideo
          src={staticFile('screen.mp4')}
          style={{ width: '100%', display: 'block', transform: `scale(${scale})`, transformOrigin: 'center top' }}
        />
      </div>
    </AbsoluteFill>
  )
}

/** Beat number, then the beat's name. Staggered, because they are two facts. */
function TopBand({ segment, index, total }: { segment: Segment; index: number; total: number }) {
  const number = useEntrance(total, 0)
  const marker = useEntrance(total, 2)
  return (
    <AbsoluteFill style={{ paddingTop: TOP_BAND, paddingLeft: MARGIN, paddingRight: MARGIN }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <span
          style={{
            ...number,
            fontFamily: MONO,
            fontSize: 20,
            letterSpacing: '0.06em',
            color: MUTED,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(index + 1).padStart(2, '0')} / {String(SEGMENTS.length).padStart(2, '0')}
        </span>
        <span style={{ ...marker, fontFamily: SERIF, fontSize: 38, fontWeight: 600, letterSpacing: '-0.012em', color: INK }}>
          {segment.marker}
        </span>
      </div>
    </AbsoluteFill>
  )
}

/**
 * One line, held. Deliberately not the narration: a subtitle that repeats the voice word
 * for word is three lines of noise under the thing the viewer is meant to be watching.
 */
function PullLine({ segment, total }: { segment: Segment; total: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const line = useEntrance(total, 3)
  // The rule grows to meet the text rather than fading in with it.
  const grow = spring({ frame, fps, config: { damping: 200, mass: 0.5 }, durationInFrames: 20 })
  return (
    <AbsoluteFill style={{ paddingTop: PULL_TOP, paddingLeft: MARGIN, paddingRight: MARGIN }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, height: PULL_HEIGHT }}>
        <div style={{ width: 3, background: INK, transform: `scaleY(${grow})`, transformOrigin: 'top', opacity: line.opacity }} />
        <span style={{ ...line, fontFamily: SERIF, fontSize: 34, lineHeight: 1.35, color: SOFT }}>{segment.pull}</span>
      </div>
    </AbsoluteFill>
  )
}

/** Seven segments. Past ones are filled, the current one fills, later ones are a rule. */
function Progress({ elapsed }: { elapsed: number }) {
  const gap = 8
  const width = 1920 - MARGIN * 2
  const each = (width - gap * (SEGMENTS.length - 1)) / SEGMENTS.length
  return (
    <AbsoluteFill style={{ paddingTop: PROGRESS_TOP, paddingLeft: MARGIN, paddingRight: MARGIN }}>
      <div style={{ display: 'flex', gap, height: 3 }}>
        {SEGMENTS.map((segment) => {
          const done = (elapsed - segment.startSeconds) / segment.durationSeconds
          const fill = Math.max(0, Math.min(1, done))
          return (
            <div key={segment.beat} style={{ width: each, height: 3, background: RULE, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, background: INK }} />
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

/** Opening. Names the thing and the one claim, then gets out of the way. */
function TitleCard() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const total = frames(TITLE_SECONDS)
  const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 })
  const b = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 22 })
  const c = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 22 })
  const out = interpolate(frame, [total - 12, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: OUT })
  const rise = (s: number) => ({
    opacity: s * out,
    transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
  })
  return (
    <AbsoluteFill style={{ background: PAPER, paddingLeft: MARGIN, paddingRight: MARGIN, justifyContent: 'center' }}>
      <div style={{ ...rise(a), fontFamily: MONO, fontSize: 20, letterSpacing: '0.06em', color: MUTED, marginBottom: 26 }}>
        MATHOS
      </div>
      <div style={{ ...rise(b), fontFamily: SERIF, fontSize: 86, fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.06, color: INK }}>
        Second Try
      </div>
      <div style={{ ...rise(c), fontFamily: SERIF, fontSize: 34, lineHeight: 1.4, color: SOFT, marginTop: 26, maxWidth: 1080 }}>
        A calculus scratchpad. The page checks the working and marks the first line that
        stopped being true. Eighteen WebMCP tools let an agent read it, verify against the
        same engine, and write.
      </div>
      <div style={{ ...rise(c), height: 3, width: 96, background: INK, marginTop: 34 }} />
    </AbsoluteFill>
  )
}

/** Closing. Where to get it, and the licence. Nothing is claimed here that is not true. */
function EndCard() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 })
  const b = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 22 })
  const rise = (s: number) => ({ opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` })
  return (
    <AbsoluteFill style={{ background: PAPER, paddingLeft: MARGIN, paddingRight: MARGIN, justifyContent: 'center' }}>
      <div style={{ ...rise(a), fontFamily: SERIF, fontSize: 52, fontWeight: 600, letterSpacing: '-0.018em', color: INK }}>
        Everything in this film was executed, not staged.
      </div>
      <div style={{ ...rise(b), marginTop: 30, fontFamily: MONO, fontSize: 24, lineHeight: 1.75, color: SOFT }}>
        <div>github.com/fireheartjerry/mathos-webmcp</div>
        <div>mathos-second-try.fireheartjerry.chatgpt.site</div>
      </div>
      <div style={{ ...rise(b), marginTop: 34, fontFamily: SERIF, fontSize: 22, color: MUTED }}>
        MIT licensed. Built for the WebMCP Challenge.
      </div>
    </AbsoluteFill>
  )
}

export function Demo() {
  const bodyStart = frames(TITLE_SECONDS)
  const bodyFrames = frames(BODY_SECONDS)
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <style>{`
        @font-face {
          font-family: 'STIXTwo';
          src: url('${staticFile('stix-two-text-var.woff2')}') format('woff2');
          font-weight: 400 700;
        }
        @font-face {
          font-family: 'FiraCodeVideo';
          src: url('${staticFile('fira-code-var.woff2')}') format('woff2');
          font-weight: 300 700;
        }
      `}</style>

      <Sequence durationInFrames={bodyStart} name="title">
        <TitleCard />
      </Sequence>

      <Sequence from={bodyStart} durationInFrames={bodyFrames} name="body">
        <Body />
      </Sequence>

      <Sequence from={bodyStart + bodyFrames} name="end">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  )
}

function Body() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Stage />
      {SEGMENTS.map((segment, i) => {
        const total = frames(segment.durationSeconds)
        return (
          <Sequence key={segment.beat} from={frames(segment.startSeconds)} durationInFrames={total} name={segment.beat}>
            <TopBand segment={segment} index={i} total={total} />
            <PullLine segment={segment} total={total} />
            <Audio src={staticFile(`seg${String(i).padStart(2, '0')}.wav`)} />
          </Sequence>
        )
      })}
      <Progress elapsed={frame / FPS} />
    </AbsoluteFill>
  )
}
