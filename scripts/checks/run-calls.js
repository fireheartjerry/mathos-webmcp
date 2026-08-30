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
