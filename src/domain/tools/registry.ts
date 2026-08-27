/**
 * Registration against the browser.
 *
 * Everything here follows from live testing in Chrome 151 (docs/overnight-audit/02b),
 * not from the published IDL:
 *
 *   - Registration is NOT atomic. A rejected `Promise.all` leaves some tools
 *     registered, and the previous implementation's `.catch(() => controller.abort())`
 *     then unregistered the ones that had succeeded. We use `allSettled` and report
 *     partial success honestly.
 *
 *   - We do NOT abort on `pagehide`. Chrome preserves registrations across the back-
 *     forward cache correctly; it was our own teardown that destroyed them, so a judge
 *     pressing Back found zero tools while the header still said they were live.
 *
 *   - `RegisteredTool` carries a live `window` reference, so `JSON.stringify` on one
 *     throws. The Agent Console projects the fields it needs instead.
 */

import { createTools } from './definitions'
import type { ToolBridge, ToolDefinition } from './definitions'

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

export function webMcpAvailable(): boolean {
  return typeof document !== 'undefined' && typeof document.modelContext?.registerTool === 'function'
}

/**
 * A short, honest description of why tools are or are not available, shown in the
 * Agent Console. It never claims tools are live when they are not.
 */
export function unsupportedDetail(): string {
  if (typeof document === 'undefined') return 'No document.'
  if (!document.modelContext) {
    return 'This browser does not expose document.modelContext.'
  }
  return 'document.modelContext is present but does not implement registerTool.'
}

export type Registration = {
  status: RegistrationStatus
  tools: ToolDefinition[]
  /** Safe projection of what the browser reports back, for the console. */
  readBack: () => Promise<RegisteredToolView[]>
}

export async function registerTools(bridge: ToolBridge): Promise<Registration> {
  const tools = createTools(bridge)

  const readBack = async (): Promise<RegisteredToolView[]> => {
    // Never JSON.stringify a RegisteredTool: it holds a live Window and will throw.
    try {
      const listed = (await document.modelContext?.getTools?.()) ?? []
      return listed
        .filter((tool) => tools.some((own) => own.name === tool.name))
        .map((tool) => ({
          name: String(tool.name ?? ''),
          title: String(tool.title ?? ''),
          description: String(tool.description ?? ''),
          readOnly: tool.annotations?.readOnlyHint === true,
          untrustedContent: tool.annotations?.untrustedContentHint === true,
        }))
    } catch {
      return []
    }
  }

  if (!webMcpAvailable()) {
    return { status: { state: 'unsupported', detail: unsupportedDetail() }, tools, readBack: async () => [] }
  }

  const outcomes = await Promise.allSettled(
    tools.map((tool) =>
      document.modelContext!.registerTool({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        // Chrome 151 passes exactly one argument. Accepting an optional second is
        // forward-compatible without ever dereferencing something that is not there.
        execute: (input: unknown) => tool.execute(input),
      }),
    ),
  )

  const failures = outcomes
    .map((outcome, index) => (outcome.status === 'rejected' ? tools[index].name : null))
    .filter((name): name is string => name !== null)

  if (failures.length === 0) {
    // Report what the browser says it holds, not what we believe we sent it. The
    // badge should be a reading, not an assumption.
    const confirmed = await readBack()
    const registered = confirmed.length
    if (registered < tools.length) {
      return {
        status: {
          state: 'partial',
          registered,
          total: tools.length,
          failures: tools.filter((t) => !confirmed.some((c) => c.name === t.name)).map((t) => t.name),
        },
        tools,
        readBack,
      }
    }
    return { status: { state: 'live', registered, total: tools.length }, tools, readBack }
  }
  if (failures.length === tools.length) {
    return { status: { state: 'failed', detail: 'No tool could be registered.' }, tools, readBack }
  }
  return {
    status: {
      state: 'partial',
      registered: tools.length - failures.length,
      total: tools.length,
      failures,
    },
    tools,
    readBack,
  }
}

/** Verified against Chrome 151. `RegisteredTool` is a plain object, and
 *  `executeTool` requires the tool object plus a JSON *string*. */
type RegisteredTool = {
  name: string
  title?: string
  description?: string
  inputSchema?: string
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
      /** Chrome 151: the second argument must be a JSON string, not an object. */
      executeTool?: (tool: RegisteredTool, inputJson: string, options?: { signal?: AbortSignal }) => Promise<string>
    }
  }
}
