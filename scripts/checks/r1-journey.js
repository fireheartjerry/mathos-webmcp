const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const rid = () => 'req_' + Math.random().toString(36).slice(2, 10)
const call = async (n, a) => {
  try {
    const raw = await mc.executeTool(by[n], JSON.stringify(a))
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) { return { threw: String(e).slice(0, 160) } }
}
const read = async () => (await call('get_scratchpad', {}))
const out = { toolCount: tools.length, names: tools.map(t => t.name).sort(), steps: [] }

// Can an agent now write, unaided, from a fresh session?
let s = await read()
const rev = () => s.revision
out.steps.push(['add_step', await call('add_step', { latex: 'a = x^2', expectedRevision: rev(), requestId: rid() })])
s = await read()
out.steps.push(['add_step2', await call('add_step', { latex: '12x^2 + 2x', expectedRevision: rev(), requestId: rid() })])
s = await read()
out.steps.push(['check_work', await call('check_work', { expectedRevision: rev(), requestId: rid() })])
s = await read()
out.afterWrites = { revision: s.revision, stepCount: (s.data ?? s).steps?.length ?? (s.data?.steps?.length), available: (s.data ?? s).availableActions }

// Maths tools
out.differentiate = await call('differentiate_expression', { latex: '4x^3 + x^2' })
out.evaluate = await call('evaluate_expression', { latex: '12x^2 + 2x', at: 2 })
out.compare = await call('compare_expressions', { left: '2x + 2x', right: '4x' })
out.changes = await call('get_changes_since', { since: 0 })

// Probe residue: does a platform run leave the list at 18?
const beforeProbe = (await mc.getTools()).length
out.platform = await call('get_platform', {})
await new Promise(r => setTimeout(r, 400))
out.residue = { beforeProbe, afterProbe: (await mc.getTools()).length }
return out
