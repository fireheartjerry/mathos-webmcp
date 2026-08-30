const BS = String.fromCharCode(92)
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `vr_${Date.now().toString(36)}_${(n++).toString(36)}`
const call = async (name, args) => {
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision

const s = await read()
const [d0, d1] = s.problem.given.map(g => g.split(' = ')[1])
const y = `${d0} ${BS}cdot ${d1} + ${d0}`
const deriv = (await call('differentiate_expression', { latex: y })).data.simplified
const at = Number(/x\s*=\s*(-?\d+)/.exec(s.problem.prompt)?.[1] ?? 2)
const value = (await call('evaluate_expression', { latex: deriv, at })).data.value

for (const latex of [`y = ${y}`, `${BS}frac{dy}{dx} = ${deriv}`, `${BS}frac{dy}{dx} = ${value}`]) {
  const r = await call('add_step', { latex, expectedRevision: await rev(), requestId: rid() })
  if (!r.ok) return { failedAt: latex, error: r.error }
}
const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
if (!checked.data.allSound) return { notSound: checked.data }
await call('new_problem', { expectedRevision: await rev(), requestId: rid() })
const receipt = await call('get_receipt', {})
return {
  ok: receipt.ok,
  sessionRestarts: receipt.data.sessionRestarts,
  linesWritten: receipt.data.rounds[0].linesWritten,
  limits: receipt.data.limits,
}
