const BS = String.fromCharCode(92)
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `tr_${Date.now().toString(36)}_${(n++).toString(36)}`
const call = async (name, args) => {
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision
// Reach the trig family: solve whatever is current, then switch.
const solve = async () => {
  const s = await read()
  const defs = Object.fromEntries(s.problem.given.map(g => { const i = g.indexOf(' = '); return [g.slice(0,i).trim(), g.slice(i+3).trim()] }))
  const sub = (b, k, v) => b.replace(new RegExp(`(^|[^A-Za-z])${k}(?![A-Za-z])`, 'g'), `$1(${v})`)
  const y = Object.entries(defs).filter(([k]) => k !== 'y').reduce((b,[k,v]) => sub(b,k,v), defs.y)
  const d = (await call('differentiate_expression', { latex: y })).data.simplified
  const at = Number(/x\s*=\s*(-?\d+)/.exec(s.problem.prompt)[1])
  const v = (await call('evaluate_expression', { latex: d, at })).data.value
  for (const l of [`y = ${y}`, `${BS}frac{dy}{dx} = ${d}`, `${BS}frac{dy}{dx} = ${v}`]) {
    const r = await call('add_step', { latex: l, expectedRevision: await rev(), requestId: rid() })
    if (!r.ok) return { failed: l, error: r.error }
  }
  const c = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
  return { prompt: s.problem.prompt, given: s.problem.given, premise: y, derivative: d, value: v, allSound: c.data.allSound, reaches: c.data.reachesAnswer }
}
await call('reset_session', { expectedRevision: await rev(), requestId: rid() })
const first = await solve()
if (!first.allSound) return { stage: 'first', first }
const moved = await call('new_problem', { familyId: 'trig-chain', expectedRevision: await rev(), requestId: rid() })
if (!moved.ok) return { stage: 'switch', error: moved.error }
return { first: first.prompt, trig: await solve() }
