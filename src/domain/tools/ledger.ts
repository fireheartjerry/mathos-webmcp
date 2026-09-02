import type { WorldTool, WorldTraceEvent } from './definitions'

/**
 * A trace event as the workspace should keep it: the raw WorldTraceEvent plus
 * the wall-clock instant it arrived. `at` is optional so untimed events still
 * work, but relative times and burst grouping need it; stamp `Date.now()` in
 * the bridge's onTrace before appending.
 */
export type LedgerEvent = WorldTraceEvent & { at?: number }

export type ToolLedgerEntry = {
  calls: number
  lastPhase: WorldTraceEvent['phase']
  lastSummary: string
  readOnly: boolean
}

export type LedgerSummary = {
  /** Distinct tool names that have been invoked at least once (running counts). */
  distinctUsed: number
  totalTools: number
  /** Finished invocations: phase complete or error. Running calls are not counted yet. */
  totalCalls: number
  perTool: Record<string, ToolLedgerEntry>
  unusedTools: string[]
  /** One entry per invocation (latest phase wins), newest first. */
  recent: LedgerEvent[]
}

export type ToolBurst = {
  id: string
  /** Deduped, in first-call order. */
  toolNames: string[]
  /** Same order as toolNames, with the read/write glyph the chips need. */
  tools: { name: string; readOnly: boolean }[]
  /** Invocations in the burst, not events: a running + complete pair is one call. */
  count: number
  /** Instant of the burst's last event. */
  at: number
}

/**
 * Collapse the event stream to one entry per invocation, in first-seen order,
 * carrying the latest phase and summary. A `running` event followed by its
 * `complete` becomes a single complete entry.
 */
export function collapseInvocations(events: LedgerEvent[]): LedgerEvent[] {
  const byId = new Map<string, LedgerEvent>()
  for (const event of events) {
    const existing = byId.get(event.invocationId)
    if (!existing) {
      byId.set(event.invocationId, event)
      continue
    }
    // Keep the original insertion slot; carry the newest phase, summary and time.
    byId.set(event.invocationId, { ...existing, ...event, at: event.at ?? existing.at })
  }
  return [...byId.values()]
}

export function summarizeLedger(events: LedgerEvent[], tools: WorldTool[]): LedgerSummary {
  const invocations = collapseInvocations(events)
  const perTool: Record<string, ToolLedgerEntry> = {}
  let totalCalls = 0
  for (const invocation of invocations) {
    const finished = invocation.phase !== 'running'
    if (finished) totalCalls += 1
    const entry = perTool[invocation.toolName]
    if (entry) {
      entry.calls += finished ? 1 : 0
      entry.lastPhase = invocation.phase
      entry.lastSummary = invocation.summary
    } else {
      perTool[invocation.toolName] = {
        calls: finished ? 1 : 0,
        lastPhase: invocation.phase,
        lastSummary: invocation.summary,
        readOnly: invocation.readOnly,
      }
    }
  }
  const used = new Set(Object.keys(perTool))
  const unusedTools = tools.map((tool) => tool.name).filter((name) => !used.has(name))
  return {
    distinctUsed: used.size,
    totalTools: tools.length,
    totalCalls,
    perTool,
    unusedTools,
    recent: [...invocations].reverse(),
  }
}

/**
 * Group invocations that landed within `windowMs` of the previous one into a
 * burst, so an agent that fires four reads at once produces one toast. Bursts
 * are in chronological order; the last one is the live one.
 */
export function groupBurst(events: LedgerEvent[], windowMs = 900): ToolBurst[] {
  const bursts: ToolBurst[] = []
  let previousAt: number | null = null
  for (const invocation of collapseInvocations(events)) {
    const at: number = invocation.at ?? previousAt ?? Date.now()
    const current: ToolBurst | undefined = bursts[bursts.length - 1]
    const joins = current !== undefined && previousAt !== null && at - previousAt <= windowMs
    if (joins) {
      current.count += 1
      current.at = Math.max(current.at, at)
      if (!current.toolNames.includes(invocation.toolName)) {
        current.toolNames.push(invocation.toolName)
        current.tools.push({ name: invocation.toolName, readOnly: invocation.readOnly })
      }
    } else {
      bursts.push({
        id: invocation.invocationId,
        toolNames: [invocation.toolName],
        tools: [{ name: invocation.toolName, readOnly: invocation.readOnly }],
        count: 1,
        at,
      })
    }
    previousAt = at
  }
  return bursts
}

/** Short relative label for the ledger list: "now", "12 s", "3 min", "2 h". */
export function relativeTime(at: number | undefined, now: number): string {
  if (at === undefined) return ''
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 3) return 'now'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}
