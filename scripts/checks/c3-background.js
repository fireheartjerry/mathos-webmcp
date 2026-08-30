const started = Date.now()
const mc = document.modelContext
await new Promise(r => setTimeout(r, 62000))
const tools = await mc.getTools()
const names = tools.map(t => t.name).sort()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
// A write after backgrounding must still settle - this is the case the paint deadline
// was added for.
let write = null
try {
  const s = JSON.parse(await mc.executeTool(by.get_scratchpad, '{}'))
  const raw = await mc.executeTool(by.add_step, JSON.stringify({
    latex: 'written after backgrounding', expectedRevision: s.data.revision, requestId: 'req_bg_' + Math.random().toString(36).slice(2, 8),
  }))
  write = JSON.parse(raw)
} catch (e) { write = { threw: String(e).slice(0, 160) } }
return {
  waitedMs: Date.now() - started,
  hidden: document.visibilityState,
  count: tools.length,
  dupes: names.filter((n, i) => names[i - 1] === n),
  residue: names.filter(n => n.startsWith('probe_')),
  writeOk: write?.ok ?? null,
  writeSettled: !!write,
  painted: write?.data?.paintedBeforeReturning,
}
