/** Values that can be stored in an animation keyframe. */
export type AnimationValue = number | number[] | number[][] | string

/** A stable path into a canonical entity, visible object, or the world camera. */
export type AnimationTargetPath =
  | { kind: 'entity'; entityId: string; path: string }
  | { kind: 'object'; objectId: string; path: string }
  | { kind: 'camera'; path: string }

export type AnimationKeyframe = {
  id: string
  time: number
  value: AnimationValue
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
