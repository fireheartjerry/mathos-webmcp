window.__CALLS__ = "[{\"tool\": \"reset_session\", \"args\": {\"expectedRevision\": \"__NEEDS__\", \"requestId\": \"reset-fresh-1\"}}, {\"tool\": \"add_step\", \"args\": {\"latex\": \"y = 15x^4 + 3x^3\", \"expectedRevision\": \"__NEEDS__\", \"requestId\": \"auth-1\"}}, {\"tool\": \"get_receipt\", \"args\": {}}]";
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const calls = JSON.parse(window.__CALLS__ || '[]')
const out = []
const currentRevision = async () => {
  const raw = await mc.executeTool(by.get_scratchpad, '{}')
  return (typeof raw === 'string' ? JSON.parse(raw) : raw).data.revision
}
for (const c of calls) {
  if (!by[c.tool]) { out.push({ tool: c.tool, error: 'no such tool' }); break }
  // The caller asked for the live revision rather than guessing one.
  if (c.args && c.args.expectedRevision === '__NEEDS__') c.args.expectedRevision = await currentRevision()
  let res
  try {
    const raw = await mc.executeTool(by[c.tool], JSON.stringify(c.args ?? {}))
    res = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) { res = { threw: String(e).slice(0, 200) } }
  out.push({ tool: c.tool, args: c.args, result: res })
  if (res && res.ok === false) break
}
return out
