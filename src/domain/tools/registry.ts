import { createWorldTools } from './definitions'
import type { WorldBridge, WorldTool } from './definitions'

export type RegisteredToolView = {
  name: string
  title: string
  description: string
  readOnly: boolean
  untrustedContent: boolean
}

export type RegistrationStatus =
  | { state: 'unsupported'; detail: string }
  | { state: 'live'; registered: number; total: number }
  | { state: 'partial'; registered: number; total: number; failures: string[] }
  | { state: 'failed'; detail: string }

export type Registration = {
  status: RegistrationStatus
  tools: WorldTool[]
  readBack: () => Promise<RegisteredToolView[]>
}

export const webMcpAvailable = () => typeof document !== 'undefined' && typeof document.modelContext?.registerTool === 'function'

export function unsupportedDetail() {
  if (typeof document === 'undefined') return 'No document is available.'
  if (!document.modelContext) return 'This browser does not expose document.modelContext. The identical local inspector remains available.'
  return 'document.modelContext is present but registerTool is unavailable.'
}

export async function registerWorldTools(bridge: WorldBridge): Promise<Registration> {
  const tools = createWorldTools(bridge)
  const readBack = async (): Promise<RegisteredToolView[]> => {
    try {
      const listed = (await document.modelContext?.getTools?.()) ?? []
      return listed.filter((item) => tools.some((tool) => tool.name === item.name)).map((item) => ({
        name: String(item.name ?? ''),
        title: String(item.title ?? ''),
        description: String(item.description ?? ''),
        readOnly: item.annotations?.readOnlyHint === true,
        untrustedContent: item.annotations?.untrustedContentHint === true,
      }))
    } catch {
      return []
    }
  }

  if (!webMcpAvailable()) return { status: { state: 'unsupported', detail: unsupportedDetail() }, tools, readBack: async () => [] }

  const outcomes = await Promise.allSettled(tools.map((tool) => document.modelContext!.registerTool({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    execute: (input: unknown) => tool.execute(input),
  })))

  const rejected = outcomes.flatMap((outcome, index) => outcome.status === 'rejected' ? [tools[index].name] : [])
  if (typeof document.modelContext?.getTools === 'function') {
    const confirmed = await readBack()
    const missing = tools.filter((tool) => !confirmed.some((item) => item.name === tool.name)).map((tool) => tool.name)
    if (confirmed.length === tools.length) return { status: { state: 'live', registered: tools.length, total: tools.length }, tools, readBack }
    return { status: { state: 'partial', registered: confirmed.length, total: tools.length, failures: missing }, tools, readBack }
  }
  if (!rejected.length) return { status: { state: 'live', registered: tools.length, total: tools.length }, tools, readBack }
  if (rejected.length === tools.length) return { status: { state: 'failed', detail: 'No Mathburst tool could be registered.' }, tools, readBack }
  return { status: { state: 'partial', registered: tools.length - rejected.length, total: tools.length, failures: rejected }, tools, readBack }
}

type RegisteredTool = {
  name: string
  title?: string
  description?: string
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
  origin?: string
  window?: unknown
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string
          title?: string
          description: string
          inputSchema?: Record<string, unknown>
          annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean }
          execute: (input: unknown) => unknown
        },
        options?: { signal?: AbortSignal; exposedTo?: string[] },
      ) => Promise<void>
      getTools?: (options?: { fromOrigins?: string[] }) => Promise<RegisteredTool[]>
      executeTool?: (tool: RegisteredTool, inputJson: string, options?: { signal?: AbortSignal }) => Promise<string>
    }
  }
}
