/**
 * The judged journey, executed through the tools exactly as the README promises it.
 *
 * Run after any change that touches the domain, the tools, or the console. Every step
 * asserts the thing a judge is told to look for, so a regression shows up as a named
 * failure rather than as a page that merely looks fine.
 */
const BS = String.fromCharCode(92)
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map((t) => [t.name, t]))
let n = 0
const rid = () => `jj_${Date.now().toString(36)}_${(n++).toString(36)}`
const call = async (name, args) => {
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision

const checks = []
const expect = (label, actual, predicate, detail) =>
  checks.push({ label, pass: predicate(actual), observed: detail ?? actual })

// A clean session, so the judge's first problem is the deterministic one.
await call('reset_session', { expectedRevision: await rev(), requestId: rid() })

const start = await read()
expect('18 tools registered', tools.length, (v) => v === 18)
expect('starts in practice', start.round, (v) => v === 'practice')
expect('problem is generated with givens', start.problem.given.length, (v) => v >= 2)

// Correct first two lines, then a deliberately wrong third.
//
// The premise is built from the problem's own definitions rather than assumed: a
// reset regenerates within whatever family is current, and an earlier version of this
// script hard-coded the product-rule shape and then reported the page broken when it
// met a quotient.
const defs = Object.fromEntries(start.problem.given.map((g) => {
  const at = g.indexOf(' = ')
  return [g.slice(0, at).trim(), g.slice(at + 3).trim()]
}))
// Deliberately no `\b` in this pattern. Written that way, the escape does not survive
// the shell that writes this file and becomes a literal backspace, so the substitution
// silently does nothing and the premise goes to the page as `\dfrac{a}{b}`.
const substitute = (body, name, latex) =>
  body.replace(new RegExp(`(^|[^A-Za-z])${name}(?![A-Za-z])`, 'g'), `$1(${latex})`)
const yExpr = Object.entries(defs)
  .filter(([name]) => name !== 'y')
  .reduce((body, [name, latex]) => substitute(body, name, latex), defs.y)
const derivative = (await call('differentiate_expression', { latex: yExpr })).data.simplified
const at = Number(/x\s*=\s*(-?\d+)/.exec(start.problem.prompt)[1])
const value = (await call('evaluate_expression', { latex: derivative, at })).data.value

for (const latex of [`y = ${yExpr}`, `${BS}frac{dy}{dx} = ${derivative}`]) {
  const r = await call('add_step', { latex, expectedRevision: await rev(), requestId: rid() })
  if (!r.ok) return { fatal: `could not write "${latex}"`, error: r.error, checks }
}
// The wrong line: the right answer with a term dropped.
const wrong = `${BS}frac{dy}{dx} = ${value + 1}`
await call('add_step', { latex: wrong, expectedRevision: await rev(), requestId: rid() })

const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
const afterCheck = await read()
expect('check marks a first failing line', checked.data.firstBrokenStep ?? checked.data.firstUnresolvedStep, (v) => v === 3)
expect('earlier lines stay sound', afterCheck.steps.slice(0, 2).map((s) => s.verdict), (v) => v.every((x) => x === 'sound'))
expect('derivation is not sound yet', checked.data.allSound, (v) => v === false)

// new_problem must be refused while the work is wrong.
const early = await call('new_problem', { expectedRevision: await rev(), requestId: rid() })
expect('fresh problem refused while unsound', early.error?.code, (v) => v === 'invalid_phase')

// Repair the line and re-check.
const brokenId = afterCheck.steps[2].id
await call('edit_step', { stepId: brokenId, latex: `${BS}frac{dy}{dx} = ${value}`, expectedRevision: await rev(), requestId: rid() })
const recheck = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
expect('sound after the repair', recheck.data.allSound, (v) => v === true)
expect('and reaches the requested answer', recheck.data.reachesAnswer, (v) => v === true)

// Move to the unaided round; coaching must close.
const moved = await call('new_problem', { expectedRevision: await rev(), requestId: rid() })
expect('fresh problem allowed once sound', moved.ok, (v) => v === true)
const transfer = await read()
expect('round is the unaided one', transfer.round, (v) => v === 'transfer')
const coaching = await call('annotate_step', { stepId: 'step-1', note: 'x', expectedRevision: await rev(), requestId: rid() })
expect('annotation closed in the unaided round', coaching.error?.code, (v) => v === 'refused_policy')

// The receipt.
const receipt = await call('get_receipt', {})
expect('receipt is available', receipt.ok, (v) => v === true, JSON.stringify(receipt.error ?? 'ok'))
const rd = receipt.data ?? {}
const firstRound = (rd.rounds ?? [])[0] ?? {}
expect('receipt attributes the writing', firstRound.linesWritten ?? {}, (v) => (v.agent ?? 0) > 0, JSON.stringify(firstRound.linesWritten ?? null))
expect('receipt states its limits', (rd.limits ?? []).length, (v) => v >= 5)
expect('receipt discloses restarts', rd.sessionRestarts, (v) => typeof v === 'number')

// Budgets, on the real payloads this journey produced.
for (const [name, args] of [['get_scratchpad', {}], ['get_receipt', {}], ['get_changes_since', { since: 0 }]]) {
  const size = JSON.stringify(await call(name, args)).length
  expect(`${name} within the 1.5K output budget`, size, (v) => v <= 1500, `${size} chars`)
}

// Every family reachable.
const families = (await call('list_problem_families', {})).data.families
expect('four problem families offered', families, (v) => v.length === 4, families.join(', '))

return { premise: yExpr, derivative, value, at, given: start.problem.given, family: start.problem.given.length, failed: checks.filter((c) => !c.pass), passed: checks.filter((c) => c.pass).length, total: checks.length }
