'use client'

import {
  getProject,
  getScenesForProject,
  PROJECTS,
  type CatalogSceneId,
  type ProjectId,
  type SceneId,
} from '../domain/world/projects'
import type { CSSProperties } from 'react'

export type ProjectNavigatorProps = {
  activeProject: ProjectId
  activeScene: CatalogSceneId
  onProjectChange: (projectId: ProjectId) => void
  onSceneChange: (sceneId: SceneId) => void
  onOverview: () => void
}

/**
 * Compact controlled navigator for the persistent project bookmarks.  It owns
 * no camera or world state: the workspace remains the single source of truth.
 */
export default function ProjectNavigator({
  activeProject,
  activeScene,
  onProjectChange,
  onSceneChange,
  onOverview,
}: ProjectNavigatorProps) {
  const project = getProject(activeProject)
  const scenes = getScenesForProject(activeProject)

  return (
    <nav className="project-navigator" aria-label="Saved mathematical projects">
      <div className="project-navigator-topline">
        <span className="project-navigator-label">World library</span>
        <button
          className="project-overview"
          type="button"
          aria-pressed={activeScene === 'overview'}
          onClick={onOverview}
        >
          <b>0</b> Projects
        </button>
      </div>

      <div className="project-tabs" role="tablist" aria-label="Saved projects">
        {PROJECTS.map((candidate) => (
          <button
            key={candidate.id}
            className="project-tab"
            type="button"
            role="tab"
            aria-selected={candidate.id === activeProject}
            aria-controls={`project-scenes-${candidate.id}`}
            style={{ '--project-accent': candidate.accent } as CSSProperties}
            onClick={() => onProjectChange(candidate.id)}
          >
            <span className="project-tab-eyebrow">{candidate.eyebrow}</span>
            <span className="project-tab-title">{candidate.title}</span>
          </button>
        ))}
      </div>

      <div
        className="project-scenes"
        id={`project-scenes-${project.id}`}
        role="tabpanel"
        aria-label={`${project.title} scenes`}
      >
        <span className="project-scenes-context">{project.description}</span>
        {scenes.map((scene) => (
          <button
            key={scene.id}
            className="project-scene"
            type="button"
            data-camera-target={scene.id}
            aria-pressed={activeScene === scene.id}
            onClick={() => onSceneChange(scene.id)}
          >
            <b>{String(scene.keyboard).padStart(2, '0')}</b>
            <span>
              <strong>{scene.title}</strong>
              <small>{scene.subtitle}</small>
            </span>
          </button>
        ))}
      </div>

      <span className="project-proof" aria-label="Four saved projects, eight live scenes, eighteen WebMCP tools">
        4 saved projects <i>·</i> 8 live scenes <i>·</i> 18 WebMCP tools
      </span>
    </nav>
  )
}
