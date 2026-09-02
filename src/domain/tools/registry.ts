import { createWorldTools } from './definitions'
import type { ToolResult, WorldBridge, WorldTool } from './definitions'

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

/** The MCP-shaped value handed back to the browser for one tool call. */
export type McpToolResult = {
  content: { type: 'text'; text: string }[]
  structuredContent: Record<string, unknown>
  isError: boolean
}

const MAX_TEXT = 1400
const MAX_ARRAY = 40
const MAX_STRING = 1500
const MAX_DEPTH = 8
const MAX_JSON = 12_000

function bound(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return { truncated: true }
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((entry) => bound(entry, depth + 1))
    return value.length > MAX_ARRAY ? [...items, { truncated: true, omitted: value.length - MAX_ARRAY }] : items
  }
  const record: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) record[key] = bound(entry, depth + 1)
  return record
}

/** Shape an internal ToolResult the way MCP clients expect: text content plus bounded structured content. */
export function toMcpResult(result: ToolResult): McpToolResult {
  const raw = result.ok ? result.summary : (result.error ?? result.summary)
  const text = raw.length > MAX_TEXT ? `${raw.slice(0, MAX_TEXT - 1)}…` : raw
  let structured = bound({ ...result }) as Record<string, unknown>
  if (JSON.stringify(structured).length > MAX_JSON) {
    structured = { ok: result.ok, summary: result.summary, ...(result.error ? { error: result.error } : {}), ...(result.changedIds ? { changedIds: result.changedIds.slice(0, MAX_ARRAY) } : {}), data: { truncated: true }, truncated: true }
  }
  return { content: [{ type: 'text', text }], structuredContent: structured, isError: !result.ok }
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
    // The browser receives an MCP-shaped result; tool.execute keeps returning ToolResult for the inspector and cues.
    execute: async (input: unknown) => toMcpResult(await tool.execute(input)),
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
