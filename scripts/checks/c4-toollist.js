const tools = await document.modelContext.getTools()
return JSON.stringify(tools.map(t => ({
  name: t.name, title: t.title, description: t.description,
  inputSchema: typeof t.inputSchema === 'string' ? JSON.parse(t.inputSchema) : t.inputSchema,
  annotations: t.annotations,
})), null, 1)
