const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
const call = async (n, a) => { try { const r = await mc.executeTool(by[n], JSON.stringify(a)); return typeof r === 'string' ? JSON.parse(r) : r } catch (e) { return { threw: String(e).slice(0,150) } } }
const rev = async () => (await call('get_scratchpad', {})).data.revision
const rid = () => 'req_' + Math.random().toString(36).slice(2, 10)

// C4.6: omitting each required field must be refused; omitting an optional one must not.
const requiredResults = []
for (const t of tools) {
  let schema = t.inputSchema
  if (typeof schema === 'string') { try { schema = JSON.parse(schema) } catch { schema = null } }
  const req = schema?.required ?? []
  const props = Object.keys(schema?.properties ?? {})
  const optional = props.filter(p => !req.includes(p))
  const base = {}
  for (const p of props) {
    const spec = schema.properties[p]
    base[p] = p === 'expectedRevision' ? await rev()
      : p === 'requestId' ? rid()
      : spec.type === 'number' || spec.type === 'integer' ? 1
      : spec.type === 'boolean' ? false
      : p === 'stepId' ? 'step-1'
      : p === 'variable' ? 'x'
      : 'x'
  }
  for (const missing of req) {
    const args = { ...base }
    delete args[missing]
    if ('expectedRevision' in args) args.expectedRevision = await rev()
    if ('requestId' in args) args.requestId = rid()
    const env = await call(t.name, args)
    requiredResults.push({ tool: t.name, missing, refused: env.ok === false, code: env.error?.code, field: env.error?.field })
  }
  requiredResults.push({ tool: t.name, optionalCount: optional.length })
}

// C4.8: readOnlyHint must match whether a valid call changes the revision - checked
// for BOTH halves. The round-1 audit only exercised the nine read-only tools, so the
// readOnlyHint:false half was asserted rather than measured.
const readOnlyResults = []
const validArgsFor = async (name) => {
  const state = await snapshot()
  const sid = state.steps[0]?.id
  switch (name) {
    case 'get_changes_since': return { since: 0 }
    case 'validate_expression': return { latex: 'x^2' }
    case 'compare_expressions': return { left: 'x', right: 'x' }
    case 'differentiate_expression': return { latex: 'x^2' }
    case 'evaluate_expression': return { latex: 'x^2', at: 2 }
    case 'add_step': return { latex: 'x^2 + 1' }
    case 'edit_step': return { stepId: sid, latex: `x^${2 + state.steps.length}` }
    case 'remove_step': return { stepId: sid }
    case 'check_work': return {}
    case 'annotate_step': return { stepId: sid, note: 'A note, to observe the write.' }
    case 'reset_session': return {}
    default: return {}
  }
}
async function snapshot() {
  const raw = await mc.executeTool(by.get_scratchpad, '{}')
  return (typeof raw === 'string' ? JSON.parse(raw) : raw).data
}
const SKIP = new Set(['propose_step', 'resolve_proposal', 'new_problem'])
for (const t of tools) {
  // Three writes need a phase this audit does not build; they are exercised by the C2
  // transcript instead, and are listed rather than silently omitted.
  if (SKIP.has(t.name)) { readOnlyResults.push({ tool: t.name, skipped: 'needs a phase built in the C2 transcript' }); continue }
  if (t.name === 'add_step' || t.name === 'edit_step' || t.name === 'annotate_step' || t.name === 'remove_step') {
    if ((await snapshot()).steps.length === 0) await call('add_step', { latex: 'x^2', expectedRevision: await rev(), requestId: rid() })
  }
  const before = await rev()
  const args = await validArgsFor(t.name)
  const payload = t.annotations?.readOnlyHint ? args : { ...args, expectedRevision: before, requestId: rid() }
  const envelope = await call(t.name, payload)
  const after = await rev()
  readOnlyResults.push({
    tool: t.name, readOnlyHint: !!t.annotations?.readOnlyHint,
    ok: envelope.ok === true, changedRevision: before !== after,
    mismatch: envelope.ok === true && (!!t.annotations?.readOnlyHint === (before !== after)),
  })
}

// C5.9: two probe runs must agree.
const first = await call('get_platform', {})
const second = await call('get_platform', {})
const statuses = r => (r.data?.features ?? []).map(f => `${f.id}:${f.status}`)
return {
  requiredRefusals: requiredResults.filter(r => r.missing),
  requiredNotRefused: requiredResults.filter(r => r.missing && !r.refused),
  readOnlyMismatches: readOnlyResults.filter(r => r.mismatch),
  readOnlySkipped: readOnlyResults.filter(r => r.skipped),
  readOnlyChecked: readOnlyResults.filter(r => !r.skipped).length,
  readOnlyDetail: readOnlyResults,
  probeRun1: statuses(first),
  probeRun2: statuses(second),
  probesAgree: JSON.stringify(statuses(first)) === JSON.stringify(statuses(second)),
  details: (first.data?.features ?? []).map(f => ({ id: f.id, status: f.status, observed: f.observed })),
  toolsAfterProbes: (await mc.getTools()).length,
}
