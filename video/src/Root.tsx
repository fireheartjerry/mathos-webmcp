import { Composition } from 'remotion'
import { Demo, DURATION_IN_FRAMES, FPS } from './Demo'
import { Film, FILM_FPS, FILM_FRAMES, FILM_H, FILM_W } from './Film'

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="Film"
        component={Film}
        durationInFrames={FILM_FRAMES}
        fps={FILM_FPS}
        width={FILM_W}
        height={FILM_H}
      />
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  )
}
