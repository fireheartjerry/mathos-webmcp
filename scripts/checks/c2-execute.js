const mc = document.modelContext
const tools = await mc.getTools()
const byName = Object.fromEntries(tools.map(t => [t.name, t]))
const call = async (name, args) => {
  const t0 = performance.now()
  try {
    const raw = await mc.executeTool(byName[name], JSON.stringify(args))
    let parsed = raw
    try { parsed = JSON.parse(raw) } catch {}
    return { name, args, ms: Math.round(performance.now() - t0), settled: 'resolved', result: parsed }
  } catch (e) {
    return { name, args, ms: Math.round(performance.now() - t0), settled: 'REJECTED', error: String(e).slice(0, 300) }
  }
}
// Read state first so mutating calls can carry a fresh revision.
const pad = await call('get_scratchpad', {})
const body = pad.result?.content?.[0]?.text ?? pad.result
let state = body
try { state = typeof body === 'string' ? JSON.parse(body) : body } catch {}
const rev = state?.revision ?? state?.expectedRevision ?? 0
const stepId = state?.steps?.[0]?.id ?? 'step-1'
const rid = () => 'req_' + Math.random().toString(36).slice(2, 10)

const valid = [
  ['get_scratchpad', {}],
  ['get_receipt', {}],
  ['check_work', { expectedRevision: rev, requestId: rid() }],
  ['annotate_step', { stepId, note: 'Baseline probe annotation.', expectedRevision: rev, requestId: rid() }],
  ['propose_step', { stepId, latex: '2x', rationale: 'Baseline probe rationale.', expectedRevision: rev, requestId: rid() }],
  ['new_problem', { expectedRevision: rev, requestId: rid() }],
]
const invalid = [
  ['get_scratchpad', { unexpected: 1 }],
  ['get_receipt', { unexpected: 1 }],
  ['check_work', { requestId: rid() }],
  ['annotate_step', { stepId, note: '', expectedRevision: rev, requestId: rid() }],
  ['propose_step', { stepId, latex: 'x', rationale: 'r', expectedRevision: 'not-a-number', requestId: rid() }],
  ['new_problem', { familyId: 'x'.repeat(500), expectedRevision: rev, requestId: rid() }],
]
const out = { revisionSeen: rev, stepIdSeen: stepId, valid: [], invalid: [] }
for (const [n, a] of valid) out.valid.push(await call(n, a))
for (const [n, a] of invalid) out.invalid.push(await call(n, a))
out.summary = {
  rejected: [...out.valid, ...out.invalid].filter(r => r.settled === 'REJECTED').length,
  total: 12,
}
return out
