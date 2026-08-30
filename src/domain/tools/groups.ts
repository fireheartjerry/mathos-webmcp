/**
 * How the tool surface is organised for a reader.
 *
 * With six tools the console could list every name in the first viewport. With
 * eighteen it cannot, so the console shows groups and their counts unscrolled and
 * reveals names when a group is opened. The grouping lives here rather than in the
 * component so a test can assert that every tool belongs to exactly one group — an
 * ungrouped tool would silently vanish from the console otherwise.
 */

import type { ToolDefinition } from './definitions'

export type ToolGroup = {
  id: string
  label: string
  /** One line, shown beside the count. Says what an agent would come here to do. */
  purpose: string
  tools: string[]
}

export const TOOL_GROUPS: readonly ToolGroup[] = [
  {
    id: 'read',
    label: 'Read',
    purpose: 'See the current state',
    tools: ['get_scratchpad', 'get_changes_since', 'get_receipt'],
  },
  {
    id: 'write',
    label: 'Write',
    purpose: 'Change the derivation',
    tools: ['add_step', 'edit_step', 'remove_step'],
  },
  {
    id: 'review',
    label: 'Review',
    purpose: 'Check it and teach from it',
    tools: ['check_work', 'annotate_step', 'propose_step', 'resolve_proposal'],
  },
  {
    id: 'session',
    label: 'Session',
    purpose: 'Move between problems',
    tools: ['new_problem', 'reset_session', 'list_problem_families'],
  },
  {
    id: 'mathematics',
    label: 'Mathematics',
    purpose: 'Compute without touching the page',
    tools: ['validate_expression', 'compare_expressions', 'differentiate_expression', 'evaluate_expression'],
  },
  {
    id: 'platform',
    label: 'Platform',
    purpose: 'Probe what this browser supports',
    tools: ['get_platform'],
  },
] as const

export type GroupedTools = {
  group: ToolGroup
  tools: ToolDefinition[]
}

/**
 * Groups the registered tools for display. Any tool missing from `TOOL_GROUPS` is
 * returned in `ungrouped` rather than dropped, so a surface that outgrows this file
 * is visible instead of quietly incomplete.
 */
export function groupTools(tools: ToolDefinition[]): { groups: GroupedTools[]; ungrouped: ToolDefinition[] } {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const claimed = new Set<string>()
  const groups: GroupedTools[] = []
  for (const group of TOOL_GROUPS) {
    const members = group.tools
      .map((name) => {
        const tool = byName.get(name)
        if (tool) claimed.add(name)
        return tool
      })
      .filter((tool): tool is ToolDefinition => tool !== undefined)
    if (members.length > 0) groups.push({ group, tools: members })
  }
  return { groups, ungrouped: tools.filter((tool) => !claimed.has(tool.name)) }
}
