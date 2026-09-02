import type { WorldTool, WorldTraceEvent } from './definitions'

/**
 * A trace event as the workspace should keep it: the raw WorldTraceEvent plus
 * the wall-clock instant it arrived. `at` is optional so untimed events still
 * work, but relative times and burst grouping need it; stamp `Date.now()` in
 * the bridge's onTrace before appending.
 */
export type LedgerEvent = WorldTraceEvent & { at?: number }

/** One invocation after collapsing its running/complete/error events. */
export type LedgerInvocation = LedgerEvent & {
  /** Instant the invocation started (its first event); `at` is its latest event. */
  startedAt?: number
}

export type ToolLedgerEntry = {
  /** Successful completions only. */
  calls: number
  /** Invocations that ended in error. */
  errors: number
  lastPhase: WorldTraceEvent['phase']
  lastSummary: string
  /** Instant of the tool's most recent event, when known. */
  lastAt?: number
  readOnly: boolean
}

export type LedgerSummary = {
  /** Distinct tool names with at least one successful completion. Running or failed calls do not count. */
  distinctUsed: number
  totalTools: number
  /** Finished invocations: phase complete or error. Running calls are not counted yet. */
  totalCalls: number
  /** Invocations that ended in error. */
  errorCount: number
  /** Invocations still running. */
  runningCount: number
  perTool: Record<string, ToolLedgerEntry>
  /** Most recent event instant per tool, for "last used" labels. */
  perToolLastAt: Record<string, number>
  /** Tools with no successful completion yet. */
  unusedTools: string[]
  /** One entry per invocation (latest phase wins), newest first. */
  recent: LedgerInvocation[]
}

export type ToolBurst = {
  id: string
  /** Deduped, in first-call order. */
  toolNames: string[]
  /** Same order as toolNames, with the read/write glyph the chips need. */
  tools: { name: string; readOnly: boolean }[]
  /** Invocations in the burst, not events: a running + complete pair is one call. */
  count: number
  /** Invocations in the burst that ended in error. */
  errorCount: number
  /** Instant of the burst's first invocation. */
  startedAt: number
  /** Instant of the burst's last event. */
  at: number
}

/**
 * Collapse the event stream to one entry per invocation, in first-seen order,
 * carrying the latest phase and summary. A `running` event followed by its
 * `complete` becomes a single complete entry. `startedAt` keeps the first
 * instant so bursts group by when a call landed, not by when it finished.
 */
export function collapseInvocations(events: LedgerEvent[]): LedgerInvocation[] {
  const byId = new Map<string, LedgerInvocation>()
  for (const event of events) {
    const existing = byId.get(event.invocationId)
    if (!existing) {
      byId.set(event.invocationId, { ...event, startedAt: event.at })
      continue
    }
    // Keep the original insertion slot; carry the newest phase, summary and time.
    byId.set(event.invocationId, { ...existing, ...event, at: event.at ?? existing.at, startedAt: existing.startedAt ?? event.at })
  }
  return [...byId.values()]
}

export function summarizeLedger(events: LedgerEvent[], tools: WorldTool[]): LedgerSummary {
  const invocations = collapseInvocations(events)
  const perTool: Record<string, ToolLedgerEntry> = {}
  const perToolLastAt: Record<string, number> = {}
  const used = new Set<string>()
  let totalCalls = 0
  let errorCount = 0
  let runningCount = 0
  for (const invocation of invocations) {
    const completed = invocation.phase === 'complete'
    const failed = invocation.phase === 'error'
    if (completed || failed) totalCalls += 1
    if (failed) errorCount += 1
    if (invocation.phase === 'running') runningCount += 1
    if (completed) used.add(invocation.toolName)
    const entry = perTool[invocation.toolName] ?? (perTool[invocation.toolName] = { calls: 0, errors: 0, lastPhase: invocation.phase, lastSummary: invocation.summary, readOnly: invocation.readOnly })
    entry.calls += completed ? 1 : 0
    entry.errors += failed ? 1 : 0
    entry.lastPhase = invocation.phase
    entry.lastSummary = invocation.summary
    if (invocation.at !== undefined) {
      entry.lastAt = Math.max(entry.lastAt ?? 0, invocation.at)
      perToolLastAt[invocation.toolName] = entry.lastAt
    }
  }
  const unusedTools = tools.map((tool) => tool.name).filter((name) => !used.has(name))
  return {
    distinctUsed: used.size,
    totalTools: tools.length,
    totalCalls,
    errorCount,
    runningCount,
    perTool,
    perToolLastAt,
    unusedTools,
    recent: [...invocations].reverse(),
  }
}

/**
 * Group invocations that landed within `windowMs` of the previous one into a
 * burst, so an agent that fires four reads at once produces one toast. Grouping
 * uses each invocation's start instant in chronological order, so a slow call
 * that finishes late never drags later calls into its burst, and a gap larger
 * than `windowMs` always starts a new burst. Bursts are in chronological
 * order; the last one is the live one.
 */
export function groupBurst(events: LedgerEvent[], windowMs = 900): ToolBurst[] {
  // Assign every invocation a start instant in insertion order; an untimed one
  // inherits the previous start so it stays with its neighbours.
  let carried = 0
  const timed = collapseInvocations(events).map((invocation) => {
    carried = invocation.startedAt ?? invocation.at ?? carried
    return { invocation, startedAt: carried, latest: invocation.at ?? carried }
  })
  const sorted = timed.map((entry, index) => ({ ...entry, index })).sort((a, b) => a.startedAt - b.startedAt || a.index - b.index)
  const bursts: ToolBurst[] = []
  let previousStart: number | null = null
  for (const { invocation, startedAt, latest } of sorted) {
    const current = bursts[bursts.length - 1]
    const joins = current !== undefined && previousStart !== null && startedAt - previousStart <= windowMs
    if (joins) {
      current.count += 1
      current.errorCount += invocation.phase === 'error' ? 1 : 0
      current.at = Math.max(current.at, latest)
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
        errorCount: invocation.phase === 'error' ? 1 : 0,
        startedAt,
        at: latest,
      })
    }
    previousStart = startedAt
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
