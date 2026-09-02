import type { AnimationTimeline } from './types'
import type { ActivePlaybacks } from './evaluate'

export type PlaybackState = {
  playing: boolean
  /** Seconds into the timeline. */
  time: number
  /** Multiplier on wall-clock seconds; 1 is real time. */
  speed: number
  loop: boolean
  /**
   * True while the timeline should be overlaid on the world (after play/seek,
   * until reset). A finished, non-looping timeline stays active on its last
   * frame so the end state keeps showing until the workspace resets it.
   */
  active: boolean
}

export type PlaybackAction = 'play' | 'pause' | 'toggle' | 'seek' | 'reset' | 'setSpeed' | 'setLoop'
export type PlaybackOptions = { time?: number; speed?: number; loop?: boolean }
export type PlaybackStates = Record<string, PlaybackState>

export type PlaybackControllerOptions = {
  getTimeline: (timelineId: string) => AnimationTimeline | undefined
  /** Called with a fresh, immutable snapshot whenever any state changes. */
  onChange: (states: PlaybackStates) => void
  /** Fired once each time a non-looping timeline reaches its end. */
  onEnd?: (timelineId: string) => void
  now?: () => number
  requestFrame?: (callback: (now: number) => void) => number
  cancelFrame?: (handle: number) => void
}

const DEFAULT_STATE: PlaybackState = { playing: false, time: 0, speed: 1, loop: false, active: false }

function rangeOf(timeline: AnimationTimeline | undefined): { start: number; end: number } {
  if (!timeline) return { start: 0, end: 0 }
  const duration = Math.max(0, timeline.duration)
  const range = timeline.playbackRange
  const start = Number.isFinite(range?.start) ? Math.min(Math.max(0, range.start), duration) : 0
  const end = Number.isFinite(range?.end) && range.end > start ? Math.min(range.end, duration) : duration
  return { start, end }
}

/**
 * Frame-driven playback for any number of timelines. Framework-agnostic; the
 * React hook in components/animation wraps it. The loop only runs while
 * something is playing, so an idle controller costs nothing per frame.
 */
export class PlaybackController {
  private states: PlaybackStates = {}
  private frame: number | null = null
  private lastTick = 0
  private readonly options: PlaybackControllerOptions
  private readonly now: () => number
  private readonly requestFrame: (callback: (now: number) => void) => number
  private readonly cancelFrame: (handle: number) => void

  constructor(options: PlaybackControllerOptions) {
    this.options = options
    this.now = options.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))
    this.requestFrame = options.requestFrame
      ?? ((callback) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : (setTimeout(() => callback(this.now()), 16) as unknown as number)))
    this.cancelFrame = options.cancelFrame
      ?? ((handle) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(handle) : clearTimeout(handle)))
  }

  getStates(): PlaybackStates { return this.states }
  getState(timelineId: string): PlaybackState { return this.states[timelineId] ?? DEFAULT_STATE }

  /** Times for every active timeline, ready for evaluateActiveTimelines. */
  activeTimes(): ActivePlaybacks {
    const times: ActivePlaybacks = {}
    for (const [id, state] of Object.entries(this.states)) if (state.active) times[id] = state.time
    return times
  }

  control(timelineId: string, action: PlaybackAction, options: PlaybackOptions = {}) {
    switch (action) {
      case 'play': return this.play(timelineId, options)
      case 'pause': return this.pause(timelineId)
      case 'toggle': return this.getState(timelineId).playing ? this.pause(timelineId) : this.play(timelineId, options)
      case 'seek': return this.seek(timelineId, options.time ?? 0)
      case 'reset': return this.reset(timelineId)
      case 'setSpeed': return this.patch(timelineId, { speed: options.speed ?? 1 })
      case 'setLoop': return this.patch(timelineId, { loop: options.loop ?? false })
    }
  }

  play(timelineId: string, options: PlaybackOptions = {}) {
    const timeline = this.options.getTimeline(timelineId)
    if (!timeline) return
    const { start, end } = rangeOf(timeline)
    const current = this.getState(timelineId)
    let time = options.time ?? current.time
    if (time >= end || time < start) time = start
    this.patch(timelineId, {
      playing: end > start,
      active: true,
      time,
      speed: options.speed ?? current.speed,
      loop: options.loop ?? current.loop,
    })
    if (end <= start) this.options.onEnd?.(timelineId)
    this.ensureLoop()
  }

  pause(timelineId: string) {
    if (!this.states[timelineId]?.playing) return
    this.patch(timelineId, { playing: false })
  }

  seek(timelineId: string, time: number) {
    const { start, end } = rangeOf(this.options.getTimeline(timelineId))
    const clamped = Math.min(Math.max(Number.isFinite(time) ? time : start, 0), Math.max(end, start))
    this.patch(timelineId, { time: clamped, active: true })
  }

  /** Stops the timeline and lifts its overlay from the world. */
  reset(timelineId: string) {
    const { start } = rangeOf(this.options.getTimeline(timelineId))
    this.patch(timelineId, { playing: false, active: false, time: start })
  }

  /** Forget a timeline entirely (e.g. after it was removed from the world). */
  remove(timelineId: string) {
    if (!(timelineId in this.states)) return
    const next = { ...this.states }
    delete next[timelineId]
    this.states = next
    this.options.onChange(this.states)
  }

  dispose() {
    if (this.frame !== null) this.cancelFrame(this.frame)
    this.frame = null
    this.states = {}
  }

  private patch(timelineId: string, patch: Partial<PlaybackState>) {
    const previous = this.getState(timelineId)
    const next = { ...previous, ...patch }
    this.states = { ...this.states, [timelineId]: next }
    this.options.onChange(this.states)
    if (next.playing) this.ensureLoop()
  }

  private ensureLoop() {
    if (this.frame !== null) return
    if (!Object.values(this.states).some((state) => state.playing)) return
    this.lastTick = this.now()
    this.frame = this.requestFrame(this.tick)
  }

  private readonly tick = (frameNow: number) => {
    this.frame = null
    const now = Number.isFinite(frameNow) ? frameNow : this.now()
    const delta = Math.max(0, Math.min(0.25, (now - this.lastTick) / 1000))
    this.lastTick = now

    let changed = false
    let anyPlaying = false
    const next: PlaybackStates = { ...this.states }
    const ended: string[] = []
    for (const [id, state] of Object.entries(this.states)) {
      if (!state.playing) continue
      const timeline = this.options.getTimeline(id)
      if (!timeline) { next[id] = { ...state, playing: false }; changed = true; continue }
      const { start, end } = rangeOf(timeline)
      let time = state.time + delta * state.speed
      let playing = true
      if (time >= end) {
        if (state.loop && end > start) {
          time = start + ((time - start) % (end - start))
        } else {
          time = end
          playing = false
          ended.push(id)
        }
      } else if (time < start) {
        time = start
      }
      next[id] = { ...state, time, playing }
      changed = true
      if (playing) anyPlaying = true
    }
    if (changed) {
      this.states = next
      this.options.onChange(this.states)
    }
    for (const id of ended) this.options.onEnd?.(id)
    if (anyPlaying || Object.values(this.states).some((state) => state.playing)) {
      this.frame = this.requestFrame(this.tick)
    }
  }
}
