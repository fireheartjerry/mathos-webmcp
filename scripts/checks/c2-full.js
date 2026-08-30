/**
 * One valid call and one invalid call for every registered tool, executed exactly as
 * an agent reaches them.
 *
 * The round-1 version sequenced the valid calls badly: several ran while the session
 * was in a phase that refuses them (get_receipt before any round had ended, new_problem
 * before the work was sound, add_step past the step limit), so they returned ok:false
 * and were reported as though they had succeeded. This version starts from a clean
 * session and drives the phase each tool needs before calling it.
 */
const BS = String.fromCharCode(92)
const CDOT = BS + 'cdot'
const DYDX = BS + 'frac{dy}{dx}'
const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `req_${Date.now().toString(36)}_${(n++).toString(36)}`
const MUTATING = new Set(['add_step','edit_step','remove_step','check_work','annotate_step','propose_step','resolve_proposal','new_problem','reset_session'])
const log = []

const call = async (name, args, { record = true } = {}) => {
  const startedAt = new Date().toISOString()
  const before = document.querySelector('.steps')?.innerHTML ?? ''
  const t0 = performance.now()
  let settled = 'resolved', result = null
  // Fill the envelope fields only when the caller has not supplied them. Overwriting
  // them unconditionally silently repaired the invalid calls that deliberately send a
  // bad expectedRevision, so those were reported as accepted.
  const payload = { ...args }
  if (MUTATING.has(name)) {
    if (!('expectedRevision' in payload)) payload.expectedRevision = await revision()
    if (!('requestId' in payload)) payload.requestId = rid()
  }
  try {
    const raw = await mc.executeTool(by[name], JSON.stringify(payload))
    result = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return raw } })() : raw
  } catch (e) { settled = 'REJECTED'; result = String(e).slice(0, 300) }
  const entry = { tool: name, startedAt, ms: Math.round(performance.now() - t0), args: payload, settled,
    domChanged: (document.querySelector('.steps')?.innerHTML ?? '') !== before, result }
  if (record) log.push(entry)
  return entry
}
async function revision() {
  const raw = await mc.executeTool(by.get_scratchpad, '{}')
  return (typeof raw === 'string' ? JSON.parse(raw) : raw).data.revision
}
const read = async () => {
  const raw = await mc.executeTool(by.get_scratchpad, '{}')
  return (typeof raw === 'string' ? JSON.parse(raw) : raw).data
}

// ---- Clean slate, so no earlier run's steps push us past the limit. -------------
// A line is written first so that reset_session has something visible to clear:
// resetting an already-empty scratchpad is a real success with no DOM diff, which
// would read as an unobservable effect.
await call('add_step', { latex: 'x^2' }, { record: false })
await call('reset_session', {})

// ---- Valid calls, each in a phase where it applies. -----------------------------
await call('get_scratchpad', {})
await call('list_problem_families', {})
await call('validate_expression', { latex: '4x^3 + x^2' })
await call('compare_expressions', { left: '2x + 2x', right: '4x' })
await call('differentiate_expression', { latex: '4x^3 + x^2' })
await call('evaluate_expression', { latex: '12x^2 + 2x', at: 2 })
await call('get_platform', {})

const problem = await read()
// The premise is built from the problem's own definitions. This used to assume the
// product-rule shape `a \cdot b + a`, which broke the moment a family arrived with two
// definitions instead of three - the script then reported the page broken rather than
// itself.
const defs = Object.fromEntries(problem.problem.given.map(g => {
  const at = g.indexOf(' = ')
  return [g.slice(0, at).trim(), g.slice(at + 3).trim()]
}))
const substitute = (body, name, latex) =>
  body.replace(new RegExp(`(^|[^A-Za-z])${name}(?![A-Za-z])`, 'g'), `$1(${latex})`)
const premise = Object.entries(defs).filter(([k]) => k !== 'y')
  .reduce((b, [k, v]) => substitute(b, k, v), defs.y)
await call('add_step', { latex: `y = ${premise}` })
await call('get_changes_since', { since: 0 })

let sid = (await read()).steps[0].id
// Two edits are needed to satisfy the proposal attempt gate, and they must differ
// from each other and from the original. Parenthesising is the smallest change that is
// textually different and mathematically identical, and it works whatever the family -
// swapping `a` and `b` produced the same string on a family with only one definition.
await call('edit_step', { stepId: sid, latex: `y = (${premise})` })
await call('annotate_step', { stepId: sid, note: 'Multiplication commutes, so this is the same line.' })
// propose_step needs two learner attempts since the last check; the edit above is one,
// and this second edit is the other.
await call('edit_step', { stepId: sid, latex: `y = ${premise}` })
await call('propose_step', { stepId: sid, latex: `y = (${premise})`, rationale: 'The same premise, written with the grouping made explicit.' })
await call('resolve_proposal', { accept: true })
await call('check_work', {})
await call('remove_step', { stepId: (await read()).steps.at(-1).id })

// Drive to a sound derivation so new_problem and get_receipt are both in phase.
// The problem is regenerated by reset_session, so the answer is computed from this
// session's own givens rather than hard-coded - an earlier version pasted a previous
// problem's answer and never reached `allSound`, leaving both tools out of phase.
const compute = async (tool, args) => {
  const entry = await call(tool, args, { record: false })
  if (entry.result?.ok !== true) throw new Error(`${tool} failed: ${JSON.stringify(entry.result)}`)
  return entry.result.data
}
const yExpr = premise
const derivative = (await compute('differentiate_expression', { latex: yExpr })).simplified
const at = Number(/x\s*=\s*(-?\d+)/.exec(problem.problem.prompt)?.[1] ?? 2)
const value = (await compute('evaluate_expression', { latex: derivative, at })).value
const answerSteps = [`y = ${yExpr}`, `${DYDX} = ${derivative}`, `${DYDX} = ${value}`]
for (const s of (await read()).steps) await call('remove_step', { stepId: s.id }, { record: false })
for (const latex of answerSteps) await call('add_step', { latex }, { record: false })
await call('check_work', {}, { record: false })
const checked = await read()
const soundness = { allSound: checked.firstBrokenStep === null && checked.firstUnresolvedStep === null,
  checked: checked.checked, steps: checked.steps.length, answerSteps }
await call('new_problem', {})
await call('get_receipt', {})

// ---- Invalid calls: a missing required field, a wrong type, or out of range. ----
const invalid = [
  ['get_scratchpad', { nope: 1 }],
  ['get_changes_since', { since: -5 }],
  ['list_problem_families', { nope: 1 }],
  ['get_platform', { nope: 1 }],
  ['get_receipt', { nope: 1 }],
  ['validate_expression', { latex: '' }],
  ['compare_expressions', { left: 'x' }],
  ['differentiate_expression', { latex: 'x', variable: 12 }],
  ['evaluate_expression', { latex: 'x', at: 'two' }],
  ['add_step', { latex: '' }],
  ['edit_step', { stepId: 'nope', latex: 'x' }],
  ['remove_step', {}],
  ['check_work', { expectedRevision: 'no' }],
  ['annotate_step', { stepId: 'x', note: '' }],
  ['propose_step', { stepId: 'x', latex: 'x' }],
  ['resolve_proposal', { accept: 'yes' }],
  ['new_problem', { familyId: 42 }],
  ['reset_session', { nope: 1 }],
]
for (const [name, args] of invalid) await call(name, args)

const validEntries = log.filter((e, i) => i < log.length - invalid.length)
const invalidEntries = log.slice(-invalid.length)
return {
  toolCount: tools.length,
  callCount: log.length,
  rejected: log.filter(e => e.settled === 'REJECTED').length,
  validFailures: validEntries.filter(e => e.result?.ok !== true).map(e => ({ tool: e.tool, code: e.result?.error?.code })),
  validMutatingWithoutDomChange: validEntries.filter(e => MUTATING.has(e.tool) && e.result?.ok === true && !e.domChanged).map(e => e.tool),
  invalidAccepted: invalidEntries.filter(e => e.result?.ok !== false).map(e => e.tool),
  invalidWithoutCode: invalidEntries.filter(e => e.result?.ok === false && !e.result?.error?.code).map(e => e.tool),
  invalidWithoutField: invalidEntries.filter(e => e.result?.ok === false && !e.result?.error?.field).map(e => e.tool),
  toolsCovered: new Set(log.map(e => e.tool)).size,
  soundReached: soundness,
  transcripts: log,
}
