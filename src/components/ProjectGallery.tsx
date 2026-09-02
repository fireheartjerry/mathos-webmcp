'use client'

import { useMemo, useState } from 'react'
import { ArchiveRestore, Copy, Plus, RotateCcw, Trash2, X as CloseIcon } from 'lucide-react'
import { PROJECTS, getScenesForProject, type ProjectId } from '../domain/world/projects'
import type { LibraryProject } from '../domain/world/library'
import type { CSSProperties, FormEvent } from 'react'

type Props = {
  projects: LibraryProject[]
  onOpen: (project: LibraryProject) => void
  onCreate: (title: string, templateId: ProjectId | null) => void
  onDuplicate: (project: LibraryProject) => void
  onTrash: (project: LibraryProject) => void
  onRestore: (project: LibraryProject) => void
  onDeleteForever: (project: LibraryProject) => void
}

const PROJECT_GLYPHS: Record<ProjectId, string> = {
  'gamma-lab': 'Γ',
  'tiny-transformer': 'QKᵀ',
  'olympiad-geometry': '△',
  'simplex-ramanujan': 'p(n)',
}

const PROJECT_ACCENTS: Record<ProjectId, string> = {
  'gamma-lab': '#8b6cf6',
  'tiny-transformer': '#e38b57',
  'olympiad-geometry': '#4c9f9a',
  'simplex-ramanujan': '#c5759e',
}

function ProjectCard({
  project,
  index,
  deleted,
  onOpen,
  onDuplicate,
  onTrash,
  onRestore,
  onDeleteForever,
}: {
  project: LibraryProject
  index: number
  deleted: boolean
  onOpen: () => void
  onDuplicate: () => void
  onTrash: () => void
  onRestore: () => void
  onDeleteForever: () => void
}) {
  const template = project.templateId ? PROJECTS.find((candidate) => candidate.id === project.templateId) : null
  const scenes = project.templateId ? getScenesForProject(project.templateId) : []
  const accent = project.templateId ? PROJECT_ACCENTS[project.templateId] : '#7c5cff'
  const glyph = project.templateId ? PROJECT_GLYPHS[project.templateId] : '+'

  return (
    <article
      className={`library-card${project.kind === 'user' ? ' is-personal' : ''}${deleted ? ' is-deleted' : ''}`}
      style={{ '--library-accent': accent, '--library-delay': `${index * 55}ms` } as CSSProperties}
    >
      <header>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <em>{project.kind === 'built-in' ? 'Mathburst original' : 'Personal project'}</em>
        <i>{deleted ? 'Deleted' : 'Saved'}</i>
      </header>
      <button className="library-card-open" type="button" onClick={onOpen} disabled={deleted} aria-label={`Open ${project.title}`}>
        <span className="library-card-glyph" aria-hidden="true">{glyph}</span>
        <span className="library-card-copy">
          <small>{template?.eyebrow ?? 'NEW / WHITEBOARD'}</small>
          <strong>{project.title}</strong>
          <span>{project.description}</span>
        </span>
      </button>
      <div className="library-card-scenes" aria-label={project.templateId ? 'Project scenes' : 'Project type'}>
        {scenes.length ? scenes.map((scene) => <span key={scene.id}>{scene.title}</span>) : <span>Blank canvas</span>}
      </div>
      <footer>
        {deleted ? (
          <>
            <button type="button" className="library-restore" onClick={onRestore}><RotateCcw aria-hidden="true" /> Restore</button>
            {project.kind === 'user' && <button type="button" className="library-delete-forever" onClick={onDeleteForever}><Trash2 aria-hidden="true" /> Delete forever</button>}
          </>
        ) : (
          <>
            <button type="button" onClick={onDuplicate} aria-label={`Duplicate ${project.title}`}><Copy aria-hidden="true" /> Duplicate</button>
            <button type="button" onClick={onTrash} aria-label={`Move ${project.title} to deleted projects`}><Trash2 aria-hidden="true" /> Delete</button>
          </>
        )}
      </footer>
    </article>
  )
}

export default function ProjectGallery({ projects, onOpen, onCreate, onDuplicate, onTrash, onRestore, onDeleteForever }: Props) {
  const [view, setView] = useState<'projects' | 'deleted'>('projects')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('Untitled project')
  const [templateId, setTemplateId] = useState<ProjectId | null>(null)
  const active = useMemo(() => projects.filter((project) => project.deletedAt === null), [projects])
  const deleted = useMemo(() => projects.filter((project) => project.deletedAt !== null), [projects])
  const shown = view === 'projects' ? active : deleted

  const closeCreator = () => {
    setCreating(false)
    setTitle('Untitled project')
    setTemplateId(null)
  }

  const create = (event: FormEvent) => {
    event.preventDefault()
    onCreate(title, templateId)
    closeCreator()
  }

  return (
    <section className="project-gallery" aria-labelledby="project-gallery-title">
      <div className="project-gallery-shell">
        <header className="project-gallery-hero">
          <div>
            {/* Edited while a concurrent agent worked in this worktree. Text and one
                class name only — no props, state, or handlers changed. All is well. */}
            <h1 id="project-gallery-title">Projects</h1>
            <p className="project-gallery-lede">
              This is a shared math whiteboard for you and an AI tutor.
              The tutor reads the same page and can change every object on it.
            </p>
          </div>
          <button className="new-project-button" type="button" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> New project</button>
        </header>

        <div className="project-gallery-toolbar">
          <div role="tablist" aria-label="Project library views">
            <button type="button" role="tab" aria-selected={view === 'projects'} onClick={() => setView('projects')}>Projects <b>{active.length}</b></button>
            <button type="button" role="tab" aria-selected={view === 'deleted'} onClick={() => setView('deleted')}>Deleted projects <b>{deleted.length}</b></button>
          </div>
          <span>{view === 'projects' ? 'Select a project' : 'Restore a project'}</span>
        </div>

        {shown.length ? (
          <div className="project-gallery-grid">
            {shown.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                deleted={view === 'deleted'}
                onOpen={() => onOpen(project)}
                onDuplicate={() => onDuplicate(project)}
                onTrash={() => onTrash(project)}
                onRestore={() => onRestore(project)}
                onDeleteForever={() => onDeleteForever(project)}
              />
            ))}
            {view === 'projects' && (
              <button type="button" className="library-add-card" onClick={() => setCreating(true)}>
                <Plus aria-hidden="true" /><strong>Create another project</strong><small>Blank canvas or one of four templates</small>
              </button>
            )}
          </div>
        ) : (
          <div className="project-gallery-empty">
            {view === 'deleted' ? <ArchiveRestore aria-hidden="true" /> : <Plus aria-hidden="true" />}
            <h2>{view === 'deleted' ? 'Nothing deleted.' : 'No projects yet.'}</h2>
            <p>{view === 'deleted' ? 'Projects moved here can be restored later.' : 'Create a project to start drawing.'}</p>
            {view === 'projects' && <button type="button" onClick={() => setCreating(true)}>New project</button>}
          </div>
        )}
      </div>

      {creating && (
        <div className="project-creator-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeCreator() }}>
          <form className="project-creator" role="dialog" aria-modal="true" aria-labelledby="project-creator-title" onSubmit={create}>
            <header><div><span>NEW PROJECT</span><h2 id="project-creator-title">Create a project</h2></div><button type="button" aria-label="Close new project dialog" onClick={closeCreator}><CloseIcon aria-hidden="true" /></button></header>
            <label htmlFor="new-project-title">Project title</label>
            <input id="new-project-title" autoFocus value={title} maxLength={54} onChange={(event) => setTitle(event.target.value)} />
            <fieldset>
              <legend>Start from</legend>
              <div className="project-template-grid">
                <button type="button" aria-pressed={templateId === null} onClick={() => setTemplateId(null)}><b>+</b><span><strong>Blank canvas</strong><small>Start with every whiteboard tool</small></span></button>
                {PROJECTS.map((project) => <button key={project.id} type="button" aria-pressed={templateId === project.id} onClick={() => setTemplateId(project.id)}><b>{PROJECT_GLYPHS[project.id]}</b><span><strong>{project.title}</strong><small>{project.sceneIds.length} live scenes</small></span></button>)}
              </div>
            </fieldset>
            <footer><button type="button" onClick={closeCreator}>Cancel</button><button type="submit" className="project-create-submit" disabled={!title.trim()}>Create project →</button></footer>
          </form>
        </div>
      )}
    </section>
  )
}
