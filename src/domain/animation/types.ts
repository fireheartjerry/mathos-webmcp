/** Values that can be stored in an animation keyframe. Points are stored as `[x, y]` pairs. */
export type AnimationValue = number | number[] | number[][] | string

/** Named easing curves understood by the runtime (see easing.ts). */
export type AnimationEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'smoothStep' | 'backOut' | 'bounceOut'

/** A stable path into a canonical entity, visible object, or the world camera. */
export type AnimationTargetPath =
  | { kind: 'entity'; entityId: string; path: string }
  | { kind: 'object'; objectId: string; path: string }
  | { kind: 'camera'; path: string }

export type AnimationKeyframe = {
  id: string
  time: number
  value: AnimationValue
  /** Easing applied on the segment that starts at this keyframe. Defaults to 'linear'. */
  easing?: AnimationEasing
}

export type AnimationTrack = {
  id: string
  target: AnimationTargetPath
  keyframes: Record<string, AnimationKeyframe>
}

export type AnimationPlaybackRange = {
  start: number
  end: number
}

export type AnimationTimeline = {
  id: string
  name: string
  duration: number
  playbackRange: AnimationPlaybackRange
  tracks: Record<string, AnimationTrack>
}
