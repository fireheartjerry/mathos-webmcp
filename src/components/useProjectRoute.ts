'use client'

import { useEffect } from 'react'

const PROJECT_ROUTE_PREFIX = '/p/'

/** Reads the project id from a `/p/<id>` pathname, or null on any other path. */
export function readProjectIdFromLocation(pathname?: string): string | null {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  if (!path.startsWith(PROJECT_ROUTE_PREFIX)) return null
  const rest = path.slice(PROJECT_ROUTE_PREFIX.length).replace(/\/+$/, '')
  if (rest === '' || rest.includes('/')) return null
  try {
    return decodeURIComponent(rest)
  } catch {
    return rest
  }
}

/** Builds the pathname for a project id (or `/` for the gallery). */
export function projectPathFor(projectId: string | null): string {
  return projectId === null ? '/' : `${PROJECT_ROUTE_PREFIX}${encodeURIComponent(projectId)}`
}

type UseProjectRouteOptions = {
  /** Id of the open project; 'main' or null means no project is open. */
  activeProjectId: string | null
  /** True while the project gallery is showing, which maps to `/`. */
  galleryOpen: boolean
  /** While true the URL is left alone (a deep link has not been resolved yet). */
  paused?: boolean
}

/**
 * Mirrors workspace state into the address bar with history.replaceState:
 * `/p/<id>` while a project is open, `/` while the gallery is open. Existing
 * query strings (for example `?film=1`) and hashes are preserved, and no
 * navigation or re-render is triggered.
 */
export function useProjectRoute({ activeProjectId, galleryOpen, paused }: UseProjectRouteOptions): void {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // A deep link is still being resolved; rewriting now would discard it.
    if (paused) return
    const projectId = galleryOpen || activeProjectId === null || activeProjectId === 'main' ? null : activeProjectId
    const nextPath = projectPathFor(projectId)
    const { pathname, search, hash } = window.location
    if (pathname === nextPath) return
    try {
      window.history.replaceState(window.history.state, '', `${nextPath}${search}${hash}`)
    } catch {
      // Sandboxed iframes and opaque origins can refuse history writes; the
      // canvas still works without a synced URL.
    }
  }, [activeProjectId, galleryOpen, paused])
}
