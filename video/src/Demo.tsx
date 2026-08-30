import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

/**
 * The demo, composed rather than merely recorded.
 *
 * The screencast is the evidence and stays the subject: it sits in the frame at full
 * size and is never cut during a verdict. Everything added around it is there to help a
 * viewer follow what just happened — a caption carrying the sentence being spoken, and a
 * quiet marker naming the beat. Black and white, one serif, because the product is.
 */

export const FPS = 30
/** 163.7s of picture, rounded up so the last caption is never clipped. */
export const DURATION_IN_FRAMES = Math.round(164 * FPS)

type Segment = {
  beat: string
  startSeconds: number
  durationSeconds: number
  text: string
  /** Short label shown top-left while this beat runs. */
  marker: string
}

export const SEGMENTS: Segment[] = [
  {
    beat: 'setup',
    startSeconds: 0,
    durationSeconds: 27.2,
    marker: 'The first line that stopped being true',
    text: 'The working is real, half finished, and never submitted — so no server has ever seen it. The page has marked line three, and nothing after it.',
  },
  {
    beat: 'hold',
    startSeconds: 27.2,
    durationSeconds: 15.3,
    marker: 'The verdict is computed, not guessed',
    text: 'That verdict came from a computer algebra system inside the page, not from a language model.',
  },
  {
    beat: 'console',
    startSeconds: 42.5,
    durationSeconds: 22.1,
    marker: '18 tools · 9 read · 9 write',
    text: 'The whole WebMCP surface, grouped so its shape and size are legible without a click.',
  },
  {
    beat: 'mathematics',
    startSeconds: 64.6,
    durationSeconds: 22.1,
    marker: 'An agent can check itself first',
    text: 'Differentiate, evaluate and compare against the page’s own engine — before writing anything to a learner’s work.',
  },
  {
    beat: 'repair',
    startSeconds: 86.7,
    durationSeconds: 25.5,
    marker: 'Agents may write. We withdrew the refusal.',
    text: 'A permission check in our own code never bound anything outside this page. What replaces it is attribution.',
  },
  {
    beat: 'sound',
    startSeconds: 112.2,
    durationSeconds: 17.0,
    marker: 'Every line sound',
    text: 'The receipt records who wrote each line — and says so even when the answer is that an agent wrote all of them.',
  },
  {
    beat: 'probe',
    startSeconds: 129.2,
    durationSeconds: 34.5,
    marker: 'What this browser actually does',
    text: 'Seven features, each executed live. Two Chrome accepts and silently does not honour. We publish what the platform does not do.',
  },
]

const INK = '#000000'
const PAPER = '#ffffff'
const RULE = '#e0e0e0'
const MUTED = '#6f6f6f'
const SERIF = "'STIX Two Text', Georgia, 'Times New Roman', serif"

/** Layout, computed once so the picture and the caption cannot collide.
 *  1920x1080 frame; the 1280x800 screencast is 1.6:1. */
const VIDEO_TOP = 56
const VIDEO_WIDTH = 1180
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH / 1280) * 800)
const CAPTION_TOP = VIDEO_TOP + VIDEO_HEIGHT + 36

/** Eases in over `frames`, holds, then eases out — so nothing pops. */
const fade = (local: number, total: number, frames = 10) =>
  interpolate(local, [0, frames, total - frames, total], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

function Caption({ segment }: { segment: Segment }) {
  const frame = useCurrentFrame()
  const total = Math.round(segment.durationSeconds * FPS)
  const opacity = fade(frame, total)
  return (
    // Pinned to a reserved band beneath the screencast. It used to sit at the bottom of
    // the frame and overlapped the product's lower edge, covering the very thing the
    // caption was describing.
    <AbsoluteFill style={{ top: CAPTION_TOP, alignItems: 'center' }}>
      <div
        style={{
          opacity,
          width: 1480,
          padding: '24px 36px',
          background: PAPER,
          border: `1px solid ${RULE}`,
          borderLeft: `3px solid ${INK}`,
          fontFamily: SERIF,
          fontSize: 34,
          lineHeight: 1.45,
          color: INK,
          textAlign: 'left',
        }}
      >
        {segment.text}
      </div>
    </AbsoluteFill>
  )
}

function Marker({ segment }: { segment: Segment }) {
  const frame = useCurrentFrame()
  const total = Math.round(segment.durationSeconds * FPS)
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 44 }}>
      <div
        style={{
          opacity: fade(frame, total, 8),
          fontFamily: SERIF,
          fontSize: 26,
          letterSpacing: '0.01em',
          color: MUTED,
          borderBottom: `1px solid ${RULE}`,
          paddingBottom: 6,
        }}
      >
        {segment.marker}
      </div>
    </AbsoluteFill>
  )
}

/** A hairline that fills as the video runs. The only moving decoration. */
function Progress() {
  const frame = useCurrentFrame()
  const { durationInFrames, width } = useVideoConfig()
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
      <div style={{ height: 3, background: RULE }}>
        <div style={{ height: 3, width: (frame / durationInFrames) * width, background: INK }} />
      </div>
    </AbsoluteFill>
  )
}

export function Demo() {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: VIDEO_TOP }}>
        <div
          style={{
            width: VIDEO_WIDTH,
            border: `1px solid ${RULE}`,
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <OffthreadVideo src={staticFile('screen.mp4')} style={{ width: '100%', display: 'block' }} />
        </div>
      </AbsoluteFill>

      {SEGMENTS.map((segment, i) => (
        <Sequence
          key={segment.beat}
          from={Math.round(segment.startSeconds * FPS)}
          durationInFrames={Math.round(segment.durationSeconds * FPS)}
          name={segment.beat}
        >
          <Marker segment={segment} />
          <Caption segment={segment} />
          <Audio src={staticFile(`seg${String(i).padStart(2, '0')}.wav`)} />
        </Sequence>
      ))}

      <Progress />
    </AbsoluteFill>
  )
}
