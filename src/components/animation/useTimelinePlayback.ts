'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { evaluateActiveTimelines, type ActivePlaybacks } from '../../domain/animation/evaluate'
import { PlaybackController, type PlaybackAction, type PlaybackOptions, type PlaybackStates } from '../../domain/animation/playback'
import type { WorldState } from '../../domain/world/types'

export type TimelineControl = (timelineId: string, action: PlaybackAction, options?: PlaybackOptions) => void

export type TimelinePlayback = {
  /** Immutable snapshot of every known timeline's playback state. */
  playbacks: PlaybackStates
  control: TimelineControl
  /** Overlay active timelines on a world; returns the same reference when nothing is active. */
  derivedWorld: (world: WorldState) => WorldState
  /** Times of active timelines, for callers that evaluate themselves. */
  activeTimes: ActivePlaybacks
}

export type TimelinePlaybackOptions = {
  /** Fired once whenever a non-looping timeline reaches its end. */
  onEnd?: (timelineId: string) => void
}

/**
 * React binding for PlaybackController. `world` is read through a ref so the
 * controller always sees the latest timelines without re-creating the loop.
 */
export function useTimelinePlayback(world: WorldState, options: TimelinePlaybackOptions = {}): TimelinePlayback {
  const worldRef = useRef(world)
  worldRef.current = world
  const onEndRef = useRef(options.onEnd)
  onEndRef.current = options.onEnd

  const [playbacks, setPlaybacks] = useState<PlaybackStates>({})
  const controllerRef = useRef<PlaybackController | null>(null)
  if (controllerRef.current === null) {
    controllerRef.current = new PlaybackController({
      getTimeline: (id) => worldRef.current.timelines[id],
      onChange: (states) => setPlaybacks(states),
      onEnd: (id) => onEndRef.current?.(id),
    })
  }

  useEffect(() => {
    const controller = controllerRef.current
    return () => { controller?.dispose() }
  }, [])

  // Forget playback state for timelines that left the world (undo, delete).
  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return
    for (const id of Object.keys(controller.getStates())) {
      if (!world.timelines[id]) controller.remove(id)
    }
  }, [world.timelines])

  const control = useCallback<TimelineControl>((timelineId, action, controlOptions) => {
    controllerRef.current?.control(timelineId, action, controlOptions)
  }, [])

  const activeTimes = useMemo<ActivePlaybacks>(() => {
    const times: ActivePlaybacks = {}
    for (const [id, state] of Object.entries(playbacks)) if (state.active) times[id] = state.time
    return times
  }, [playbacks])

  const hasActive = Object.keys(activeTimes).length > 0
  const derivedWorld = useCallback(
    (base: WorldState) => (hasActive ? evaluateActiveTimelines(base, activeTimes) : base),
    [activeTimes, hasActive],
  )

  return { playbacks, control, derivedWorld, activeTimes }
}
