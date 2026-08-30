window.__CALLS__ = "[{\"tool\": \"differentiate_expression\", \"args\": {\"latex\": \"15x^4 + 3x^3\", \"variable\": \"x\"}}, {\"tool\": \"compare_expressions\", \"args\": {\"left\": \"3x^3 \\\\cdot 5x + 3x^3\", \"right\": \"15x^4 + 3x^3\"}}, {\"tool\": \"evaluate_expression\", \"args\": {\"latex\": \"60x^3 + 9x^2\", \"at\": 2, \"variable\": \"x\"}}, {\"tool\": \"add_step\", \"args\": {\"latex\": \"y = 3x^3 \\\\cdot 5x + 3x^3\", \"expectedRevision\": 31, \"requestId\": \"sub-given-1\"}}]";
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const calls = JSON.parse(window.__CALLS__ || '[]')
const out = []
for (const c of calls) {
  if (!by[c.tool]) { out.push({ tool: c.tool, error: 'no such tool' }); break }
  let res
  try {
    const raw = await mc.executeTool(by[c.tool], JSON.stringify(c.args ?? {}))
    res = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) { res = { threw: String(e).slice(0, 200) } }
  out.push({ tool: c.tool, args: c.args, result: res })
  if (res && res.ok === false) break
}
return out
