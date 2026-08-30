window.__CALLS__ = "[{\"tool\": \"new_problem\", \"args\": {\"expectedRevision\": 116, \"requestId\": \"close-round1-a\"}}, {\"tool\": \"get_receipt\", \"args\": {}}]";
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
  // No revision substitution. A real agent gets no helper filling this in, and the
  // round-1 run's `__NEEDS__` crutch meant the agent never once met a refusal - which
  // left the error-recovery check with no instances to measure.
  let res
  try {
    const raw = await mc.executeTool(by[c.tool], JSON.stringify(c.args ?? {}))
    res = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) { res = { threw: String(e).slice(0, 200) } }
  out.push({ tool: c.tool, args: c.args, result: res })
  if (res && res.ok === false) break
}
return out
