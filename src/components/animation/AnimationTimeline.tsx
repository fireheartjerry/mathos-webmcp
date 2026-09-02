'use client'

import type { KeyboardEvent } from 'react'
import type { AnimationTimeline as AnimationTimelineModel, AnimationTrack } from '../../domain/animation/types'
import type { PlaybackState, PlaybackStates } from '../../domain/animation/playback'
import type { WorldState } from '../../domain/world/types'
import type { TimelineControl } from './useTimelinePlayback'
import '../../styles/animation.css'

const IDLE: PlaybackState = { playing: false, time: 0, speed: 1, loop: false, active: false }

const formatSeconds = (seconds: number) => `${Math.max(0, seconds).toFixed(2)}s`

function trackLabel(track: AnimationTrack, world: WorldState): string {
  const target = track.target
  if (target.kind === 'camera') return `camera.${target.path}`
  if (target.kind === 'object') {
    const object = world.objects[target.objectId]
    return `${object ? object.kind : target.objectId}.${target.path}`
  }
  const entity = world.entities[target.entityId]
  return `${entity ? entity.kind : target.entityId}.${target.path}`
}

function TimelineRow({
  timeline,
  state,
  world,
  control,
  onDelete,
}: {
  timeline: AnimationTimelineModel
  state: PlaybackState
  world: WorldState
  control: TimelineControl
  onDelete?: (timelineId: string) => void
}) {
  const duration = Math.max(0, timeline.duration)
  const progress = duration > 0 ? Math.min(1, Math.max(0, state.time / duration)) : 0
  const tracks = Object.values(timeline.tracks)

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      control(timeline.id, 'toggle')
    } else if (event.key === 'Home') {
      event.preventDefault()
      control(timeline.id, 'seek', { time: 0 })
    } else if (event.key === 'End') {
      event.preventDefault()
      control(timeline.id, 'seek', { time: duration })
    }
  }

  return (
    <li
      className={`animation-row${state.playing ? ' is-playing' : ''}${state.active ? ' is-active' : ''}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`${timeline.name} timeline`}
    >
      <div className="animation-row-head">
        <button
          type="button"
          className="animation-play"
          onClick={() => control(timeline.id, 'toggle')}
          aria-label={state.playing ? `Pause ${timeline.name}` : `Play ${timeline.name}`}
          aria-pressed={state.playing}
        >
          {state.playing ? (
            <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="2" y="1.5" width="2" height="7" /><rect x="6" y="1.5" width="2" height="7" /></svg>
          ) : (
            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 1.5 8.5 5 2.5 8.5z" /></svg>
          )}
        </button>
        <span className="animation-name" title={timeline.id}>{timeline.name}</span>
        <span className="animation-clock">{formatSeconds(state.time)} / {formatSeconds(duration)}</span>
      </div>
      <input
        type="range"
        className="animation-scrubber"
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(duration, Math.max(0, state.time))}
        onChange={(event) => control(timeline.id, 'seek', { time: Number(event.target.value) })}
        onKeyDown={(event) => { if (event.key === ' ') { event.preventDefault(); control(timeline.id, 'toggle') } }}
        aria-label={`Scrub ${timeline.name}`}
        aria-valuetext={formatSeconds(state.time)}
        style={{ ['--progress' as string]: `${progress * 100}%` }}
      />
      <div className="animation-row-foot">
        <ul className="animation-tracks" aria-label="Tracks">
          {tracks.length === 0 ? <li className="is-empty">no tracks</li> : tracks.map((track) => (
            <li key={track.id}>{trackLabel(track, world)}</li>
          ))}
        </ul>
        <div className="animation-actions">
          <button
            type="button"
            className={`animation-chip${state.loop ? ' is-on' : ''}`}
            onClick={() => control(timeline.id, 'setLoop', { loop: !state.loop })}
            aria-pressed={state.loop}
            title="Loop"
          >
            loop
          </button>
          <button
            type="button"
            className="animation-chip"
            onClick={() => control(timeline.id, 'reset')}
            disabled={!state.active}
            title="Stop and lift the overlay"
          >
            reset
          </button>
          {onDelete ? (
            <button
              type="button"
              className="animation-chip is-danger"
              onClick={() => { control(timeline.id, 'reset'); onDelete(timeline.id) }}
              title="Remove timeline"
            >
              delete
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * Compact sidebar listing the world's timelines with transport controls.
 * Renders nothing when there are no timelines. Space toggles the focused row.
 */
export default function AnimationTimeline({
  world,
  playbacks,
  control,
  onDeleteTimeline,
  className,
}: {
  world: WorldState
  playbacks: PlaybackStates
  control: TimelineControl
  onDeleteTimeline?: (timelineId: string) => void
  className?: string
}) {
  const timelines = Object.values(world.timelines)
  if (timelines.length === 0) return null
  const playingCount = timelines.filter((timeline) => playbacks[timeline.id]?.playing).length

  return (
    <aside className={`animation-panel${className ? ` ${className}` : ''}`} aria-label="Animation timelines">
      <header className="animation-panel-head">
        <span>Timelines</span>
        <b>{playingCount > 0 ? `${playingCount} playing` : timelines.length}</b>
      </header>
      <ul className="animation-list">
        {timelines.map((timeline) => (
          <TimelineRow
            key={timeline.id}
            timeline={timeline}
            state={playbacks[timeline.id] ?? IDLE}
            world={world}
            control={control}
            onDelete={onDeleteTimeline}
          />
        ))}
      </ul>
    </aside>
  )
}
