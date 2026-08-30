const BS = String.fromCharCode(92)
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `fs_${Date.now().toString(36)}_${(n++).toString(36)}`
const call = async (name, args) => {
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision

const solve = async () => {
  const s = await read()
  const given = Object.fromEntries(s.problem.given.map(g => g.split(' = ')))
  const yLatex = given.y.replace(/\ba\b/g, `(${given.a})`).replace(/\bb\b/g, `(${given.b})`)
  const deriv = (await call('differentiate_expression', { latex: yLatex })).data.simplified
  const at = s.problem.prompt.match(/x = (-?\d+)/)[1]
  const value = (await call('evaluate_expression', { latex: deriv, at: Number(at) })).data.value
  for (const latex of [`y = ${yLatex}`, `${BS}frac{dy}{dx} = ${deriv}`, `${BS}frac{dy}{dx} = ${value}`]) {
    const r = await call('add_step', { latex, expectedRevision: await rev(), requestId: rid() })
    if (!r.ok) return { wrote: false, latex, error: r.error }
  }
  const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
  return { wrote: true, prompt: s.problem.prompt, given: s.problem.given, allSound: checked.data.allSound, reaches: checked.data.reachesAnswer }
}

const out = []
out.push({ family: (await read()).problem, solved: await solve() })
for (const familyId of ['nested-power', 'quotient']) {
  const moved = await call('new_problem', { familyId, expectedRevision: await rev(), requestId: rid() })
  if (!moved.ok) { out.push({ familyId, error: moved.error }); break }
  const s = await read()
  out.push({ familyId, prompt: s.problem.prompt, given: s.problem.given, round: s.round, solved: await solve() })
}
return out
