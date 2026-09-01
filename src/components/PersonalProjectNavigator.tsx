'use client'

import { getScenesForProject, type CatalogSceneId, type ProjectId, type SceneId } from '../domain/world/projects'

export default function PersonalProjectNavigator({
  title,
  templateId,
  activeScene,
  onHome,
  onSceneChange,
}: {
  title: string
  templateId: ProjectId | null
  activeScene: CatalogSceneId
  onHome: () => void
  onSceneChange: (scene: SceneId) => void
}) {
  const scenes = templateId ? getScenesForProject(templateId) : []
  return (
    <nav className="personal-project-navigator" aria-label={`${title} project navigation`}>
      <button type="button" className="personal-project-home" onClick={onHome}><span>←</span> Projects</button>
      <div className="personal-project-identity"><small>PERSONAL PROJECT</small><strong>{title}</strong></div>
      <div className="personal-project-scenes">
        {scenes.length ? scenes.map((scene) => (
          <button type="button" key={scene.id} aria-pressed={activeScene === scene.id} onClick={() => onSceneChange(scene.id)}>
            <b>{String(scene.keyboard).padStart(2, '0')}</b><span>{scene.title}</span>
          </button>
        )) : <span><b>01</b> Blank canvas</span>}
      </div>
      <div className="personal-project-proof"><i /> autosaved locally <b>·</b> 18 WebMCP tools</div>
    </nav>
  )
}
