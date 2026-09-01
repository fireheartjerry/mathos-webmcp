'use client'

import { Check, LayoutGrid } from 'lucide-react'
import { getScenesForProject, type CatalogSceneId, type ProjectId, type SceneId } from '../domain/world/projects'

export default function PersonalProjectNavigator({
  title,
  templateId,
  activeScene,
  kind,
  onHome,
  onSceneChange,
}: {
  title: string
  templateId: ProjectId | null
  activeScene: CatalogSceneId
  kind: 'built-in' | 'user'
  onHome: () => void
  onSceneChange: (scene: SceneId) => void
}) {
  const scenes = templateId ? getScenesForProject(templateId) : []
  return (
    <nav className="personal-project-navigator" aria-label={`${title} project navigation`}>
      <button type="button" className="personal-project-home" onClick={onHome}>
        <LayoutGrid aria-hidden="true" />
        <span>Projects</span>
      </button>
      <div className="personal-project-identity">
        <small>{kind === 'built-in' ? 'Mathburst project' : 'Personal project'}</small>
        <strong>{title}</strong>
      </div>
      <div className="personal-project-scenes">
        {scenes.length ? scenes.map((scene, index) => (
          <button type="button" key={scene.id} aria-pressed={activeScene === scene.id} onClick={() => onSceneChange(scene.id)}>
            <b>{String(index + 1).padStart(2, '0')}</b><span>{scene.title}</span>
          </button>
        )) : <span><b>01</b> Blank canvas</span>}
      </div>
      <div className="personal-project-proof"><Check aria-hidden="true" /> Saved</div>
    </nav>
  )
}
