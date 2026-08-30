window.__CALLS__ = "[{\"tool\": \"add_step\", \"args\": {\"latex\": \"y = 15x^4 + 3x^3\", \"expectedRevision\": 32, \"requestId\": \"expand-2\"}}, {\"tool\": \"add_step\", \"args\": {\"latex\": \"\\\\frac{dy}{dx} = 60x^3 + 9x^2\", \"expectedRevision\": \"__NEEDS__\", \"requestId\": \"differentiate-3\"}}, {\"tool\": \"add_step\", \"args\": {\"latex\": \"60(2)^3 + 9(2)^2 = 516\", \"expectedRevision\": \"__NEEDS__\", \"requestId\": \"evaluate-4\"}}, {\"tool\": \"check_work\", \"args\": {\"expectedRevision\": \"__NEEDS__\", \"requestId\": \"check-round1-a\"}}]";
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
