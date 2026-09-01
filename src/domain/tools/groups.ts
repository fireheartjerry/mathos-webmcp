import type { WorldTool } from './definitions'

export type ToolGroup = { id: string; label: string; purpose: string; tools: string[] }

export const TOOL_GROUPS: readonly ToolGroup[] = [
  { id: 'world', label: 'World', purpose: 'Read the shared scene', tools: ['get_world', 'get_objects', 'get_selection'] },
  { id: 'context', label: 'Context', purpose: 'Read tutoring and math state', tools: ['get_session_context', 'get_history', 'inspect_math'] },
  { id: 'objects', label: 'Objects', purpose: 'Create, edit and remove', tools: ['create_objects', 'update_objects', 'transform_objects', 'delete_objects'] },
  { id: 'control', label: 'Control', purpose: 'Batch, history and viewport', tools: ['apply_actions', 'step_history', 'set_viewport'] },
  { id: 'reconstruction', label: 'Reconstruct', purpose: 'Turn images into live math', tools: ['reconstruct_problem', 'audit_reconstruction'] },
  { id: 'mathematics', label: 'Mathematics', purpose: 'Graph, construct and visualize', tools: ['graph_expression', 'construct_geometry', 'visualize_concept'] },
] as const

export function groupTools(tools: WorldTool[]) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const claimed = new Set<string>()
  const groups = TOOL_GROUPS.map((group) => ({
    group,
    tools: group.tools.flatMap((name) => {
      const member = byName.get(name)
      if (!member) return []
      claimed.add(name)
      return [member]
    }),
  }))
  return { groups, ungrouped: tools.filter((tool) => !claimed.has(tool.name)) }
}
