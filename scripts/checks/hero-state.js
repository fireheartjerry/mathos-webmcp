/**
 * Drives the page into the state worth showing: a derivation whose third line is
 * wrong, checked, so the first failing line is marked and later lines are not.
 * Then opens the Review group so the console shows both the shape and a name.
 */
const BS = String.fromCharCode(92)
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map((t) => [t.name, t]))
let n = 0
const rid = () => `hero_${Date.now().toString(36)}_${(n++).toString(36)}`
const call = async (name, args) => {
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision

await call('reset_session', { expectedRevision: await rev(), requestId: rid() })
const s = await read()
const defs = Object.fromEntries(s.problem.given.map((g) => {
  const at = g.indexOf(' = ')
  return [g.slice(0, at).trim(), g.slice(at + 3).trim()]
}))
const sub = (body, name, latex) =>
  body.replace(new RegExp(`(^|[^A-Za-z])${name}(?![A-Za-z])`, 'g'), `$1(${latex})`)
const yExpr = Object.entries(defs).filter(([k]) => k !== 'y')
  .reduce((b, [k, v]) => sub(b, k, v), defs.y)
const deriv = (await call('differentiate_expression', { latex: yExpr })).data.simplified

// Two correct lines, then one with a term dropped — the mistake the page exists to find.
await call('add_step', { latex: `y = ${yExpr}`, expectedRevision: await rev(), requestId: rid() })
await call('add_step', { latex: `${BS}frac{dy}{dx} = ${deriv}`, expectedRevision: await rev(), requestId: rid() })
const dropped = deriv.replace(/\s*\+\s*[^+]+$/, '')
await call('add_step', { latex: `${BS}frac{dy}{dx} = ${dropped}`, expectedRevision: await rev(), requestId: rid() })
const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })

const review = [...document.querySelectorAll('.console-group-head')]
  .find((b) => b.textContent?.includes('Review'))
review?.click()
await new Promise((r) => setTimeout(r, 400))
window.scrollTo(0, 0)
return { premise: yExpr, derivative: deriv, dropped, firstIssue: checked.data.firstBrokenStep ?? checked.data.firstUnresolvedStep, allSound: checked.data.allSound }
