import { Composition } from 'remotion'
import { Demo, DURATION_IN_FRAMES, FPS } from './Demo'

export function RemotionRoot() {
  return (
    <Composition
      id="Demo"
      component={Demo}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  )
}
