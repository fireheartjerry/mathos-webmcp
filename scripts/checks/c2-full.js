const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `req_${Date.now().toString(36)}_${(n++).toString(36)}`
const stamp = () => new Date().toISOString()
const call = async (name, args) => {
  const startedAt = stamp()
  const before = document.querySelector('.steps')?.innerHTML ?? ''
  const t0 = performance.now()
  let settled = 'resolved', result = null
  try {
    const raw = await mc.executeTool(by[name], JSON.stringify(args))
    result = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return raw } })() : raw
  } catch (e) { settled = 'REJECTED'; result = String(e).slice(0, 300) }
  const after = document.querySelector('.steps')?.innerHTML ?? ''
  return { tool: name, startedAt, ms: Math.round(performance.now() - t0), args, settled, domChanged: before !== after, result }
}
const read = async () => (await call('get_scratchpad', {})).result
const rev = async () => (await read()).data.revision
const firstStep = async () => (await read()).data.steps?.[0]?.id ?? 'step-1'

const out = []
// Seed enough state that every tool has something to act on.
out.push(await call('add_step', { latex: 'a = x^2', expectedRevision: await rev(), requestId: rid() }))
out.push(await call('add_step', { latex: '12x^2 + 2x', expectedRevision: await rev(), requestId: rid() }))
out.push(await call('check_work', { expectedRevision: await rev(), requestId: rid() }))
const sid = await firstStep()

const valid = [
  ['get_scratchpad', {}],
  ['get_changes_since', { since: 0 }],
  ['list_problem_families', {}],
  ['validate_expression', { latex: '4x^3 + x^2' }],
  ['compare_expressions', { left: '2x + 2x', right: '4x' }],
  ['differentiate_expression', { latex: '4x^3 + x^2' }],
  ['evaluate_expression', { latex: '12x^2 + 2x', at: 2 }],
  ['get_platform', {}],
  ['annotate_step', { stepId: sid, note: 'Check the product rule here.' }],
  ['edit_step', { stepId: sid, latex: 'a = x^2' }],
  ['propose_step', { stepId: sid, latex: 'x^2', rationale: 'Matches the given definition.' }],
  ['resolve_proposal', { accept: false }],
  ['remove_step', { stepId: sid }],
  ['get_receipt', {}],
  ['new_problem', {}],
  ['reset_session', {}],
]
const invalid = [
  ['get_scratchpad', { nope: 1 }],
  ['get_changes_since', { since: -5 }],
  ['list_problem_families', { nope: 1 }],
  ['validate_expression', { latex: '' }],
  ['compare_expressions', { left: 'x' }],
  ['differentiate_expression', { latex: 'x', variable: 12 }],
  ['evaluate_expression', { latex: 'x', at: 'two' }],
  ['get_platform', { nope: 1 }],
  ['add_step', { latex: '', expectedRevision: 0, requestId: 'req-bad-1' }],
  ['edit_step', { stepId: 'nope', latex: 'x', expectedRevision: 0, requestId: 'req-bad-2' }],
  ['remove_step', { expectedRevision: 0, requestId: 'req-bad-3' }],
  ['check_work', { requestId: 'req-bad-4' }],
  ['annotate_step', { stepId: 'x', note: '', expectedRevision: 0, requestId: 'req-bad-5' }],
  ['propose_step', { stepId: 'x', latex: 'x', rationale: 'r', expectedRevision: 'no', requestId: 'req-bad-6' }],
  ['resolve_proposal', { accept: 'yes', expectedRevision: 0, requestId: 'req-bad-7' }],
  ['new_problem', { familyId: 42, expectedRevision: 0, requestId: 'req-bad-8' }],
  ['reset_session', { expectedRevision: 999999, requestId: 'req-bad-9' }],
  ['get_receipt', { nope: 1 }],
]
const mutating = new Set(['add_step','edit_step','remove_step','check_work','annotate_step','propose_step','resolve_proposal','new_problem','reset_session'])
for (const [name, args] of valid) {
  out.push(await call(name, mutating.has(name) ? { ...args, expectedRevision: await rev(), requestId: rid() } : args))
}
for (const [name, args] of invalid) out.push(await call(name, args))

return {
  toolCount: tools.length,
  callCount: out.length,
  rejected: out.filter(r => r.settled === 'REJECTED').length,
  unstructured: out.filter(r => r.result && r.result.ok === false && !r.result.error?.code).length,
  noField: out.filter(r => r.result && r.result.ok === false && r.result.error?.code === 'invalid_input' && !r.result.error?.field).length,
  transcripts: out,
}
