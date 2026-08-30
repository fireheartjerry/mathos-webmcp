const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const call = async (n, a) => { try { const r = await mc.executeTool(by[n], JSON.stringify(a)); return typeof r === 'string' ? JSON.parse(r) : r } catch (e) { return { threw: String(e).slice(0,150) } } }
const s = await call('get_scratchpad', {})
const w = await call('add_step', { latex: 'written from the second tab', expectedRevision: s.data.revision, requestId: 'req_tabB_' + Math.random().toString(36).slice(2,8) })
return { ok: w.ok, revision: w.revision, sessionId: s.data.sessionId }
