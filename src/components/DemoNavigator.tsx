'use client'

import { DEMO_SCENES } from '../domain/world/seed'
import type { DemoScene } from '../domain/world/seed'

const sceneOrder = ['opening', 'calculus', 'geometry', 'matrix', 'overview'] as const satisfies readonly DemoScene[]

export default function DemoNavigator({
  active,
  onNavigate,
}: {
  active: DemoScene
  onNavigate: (scene: DemoScene) => void
}) {
  return (
    <nav className="demo-navigator" aria-label="Mathematical world scenes">
      <span className="demo-navigator-label">World map <kbd>0–4</kbd></span>
      {sceneOrder.map((scene, index) => (
        <button
          key={scene}
          type="button"
          data-camera-target={scene}
          aria-pressed={active === scene}
          onClick={() => onNavigate(scene)}
        >
          <b>0{index + 1}</b>
          {DEMO_SCENES[scene].label}
        </button>
      ))}
    </nav>
  )
}
