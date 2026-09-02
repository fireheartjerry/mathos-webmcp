import type { ComponentType } from 'react'
import MathburstWorkspace from '../../../src/components/MathburstWorkspace'

// `/p/<id>` opens the workspace on a specific project. Project ids live in the
// browser's localStorage library (built-ins such as 'gamma-lab' plus user uuids),
// so the server cannot validate them: the page only forwards the id and the
// workspace resolves it after hydration (unknown ids fall back to the gallery).
// No generateStaticParams: vinext skips prerendering dynamic routes without it
// and server-renders each request, which is what a purely client-resolved
// route needs.
export const dynamic = 'force-dynamic'

// The workspace owner adds `initialProjectId?: string` to the workspace props;
// this cast keeps the route compiling in the meantime.
const Workspace = MathburstWorkspace as unknown as ComponentType<{ initialProjectId?: string }>

type ProjectPageProps = { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  return <Workspace initialProjectId={decodeURIComponent(id)} />
}
