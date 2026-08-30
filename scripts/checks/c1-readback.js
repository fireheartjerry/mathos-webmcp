const mc = document.modelContext
if (!mc) return { error: 'no modelContext' }
const tools = await mc.getTools()
return {
  count: tools.length,
  names: tools.map(t => t.name),
  annotations: tools.map(t => ({ n: t.name, ro: t.annotations?.readOnlyHint, uc: t.annotations?.untrustedContentHint })),
  schemaType: typeof tools[0]?.inputSchema,
}
