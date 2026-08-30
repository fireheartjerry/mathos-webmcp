const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const call = async (n, a) => {
  try { const r = await mc.executeTool(by[n], JSON.stringify(a)); return typeof r === 'string' ? JSON.parse(r) : r }
  catch (e) { return { threw: String(e).slice(0, 200) } }
}
const s = await call('get_scratchpad', {})
const env = await call('add_step', { latex: 'written from a conflicted tab', expectedRevision: s.data?.revision ?? 0, requestId: 'req_conflict_1' })
const text = document.body.textContent ?? ''
const recovery = env.error?.recovery ?? ''
// Does the recovery name something a reader can actually act on in this DOM?
const buttons = [...document.querySelectorAll('button')].map(b => b.textContent?.trim()).filter(Boolean)
return {
  envelope: JSON.stringify(env).slice(0, 320),
  code: env.error?.code, recovery,
  recoveryActionable: /fresh session|start over|reload/i.test(recovery),
  offersButton: buttons.some(b => /fresh session|start over/i.test(b)),
  buttons: buttons.slice(0, 12),
  toolCount: tools.length,
}
