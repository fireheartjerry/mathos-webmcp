export type {
  AnimationEasing,
  AnimationKeyframe,
  AnimationPlaybackRange,
  AnimationTargetPath,
  AnimationTimeline,
  AnimationTrack,
  AnimationValue,
} from './types'

export {
  EASINGS,
  crossfade,
  easeIn,
  easeInOut,
  easeOut,
  interpolate,
  linear,
  resolveEasing,
  smoothStep,
  type EasingFunction,
  type Interpolable,
  type InterpolablePoint,
} from './easing'

export {
  applyObjectPath,
  evaluateActiveTimelines,
  evaluateTimeline,
  revealDash,
  revealItem,
  revealLerp,
  revealProgress,
  revealStage,
  sampleTrack,
  sortedKeyframes,
  type ActivePlaybacks,
} from './evaluate'

export {
  PlaybackController,
  type PlaybackAction,
  type PlaybackControllerOptions,
  type PlaybackOptions,
  type PlaybackState,
  type PlaybackStates,
} from './playback'

export {
  BRIDGE_LATEX_CHAIN,
  TIMELINE_PRESETS,
  TIMELINE_PRESET_NAMES,
  attentionDrawIn,
  barycentricDrawIn,
  bridgeMorph,
  cameraTo,
  cameraTrack,
  crossfadeLatex,
  densityConstruct,
  drawIn,
  fadeIn,
  geometryDependencyDraw,
  makeTimeline,
  matrixSweep,
  objectTrack,
  partitionRows,
  simplexSweep,
  sweepParameter,
  sweepSection,
  timelinePresets,
  type BinEdges,
  type PresetArgs,
  type PresetParam,
  type TimelinePreset,
} from './presets'

export {
  buildStrokeReplay,
  revealTimeline,
  revealTimelinePerStroke,
  strokeLength,
  strokeReplaySchedule,
  type StrokeReplay,
  type StrokeReplayEntry,
  type StrokeReplayOptions,
  type StrokeReplaySchedule,
} from '../world/strokeReplay'
