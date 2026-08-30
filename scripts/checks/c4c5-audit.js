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

// C4.8: readOnlyHint must match whether a valid call changes the revision.
const readOnlyResults = []
for (const t of tools) {
  if (!t.annotations?.readOnlyHint) continue
  const before = await rev()
  await call(t.name, t.name === 'get_changes_since' ? { since: 0 } :
    t.name === 'validate_expression' ? { latex: 'x^2' } :
    t.name === 'compare_expressions' ? { left: 'x', right: 'x' } :
    t.name === 'differentiate_expression' ? { latex: 'x^2' } :
    t.name === 'evaluate_expression' ? { latex: 'x^2', at: 2 } : {})
  const after = await rev()
  readOnlyResults.push({ tool: t.name, changedRevision: before !== after })
}

// C5.9: two probe runs must agree.
const first = await call('get_platform', {})
const second = await call('get_platform', {})
const statuses = r => (r.data?.features ?? []).map(f => `${f.id}:${f.status}`)
return {
  requiredRefusals: requiredResults.filter(r => r.missing),
  requiredNotRefused: requiredResults.filter(r => r.missing && !r.refused),
  readOnlyViolations: readOnlyResults.filter(r => r.changedRevision),
  readOnlyChecked: readOnlyResults.length,
  probeRun1: statuses(first),
  probeRun2: statuses(second),
  probesAgree: JSON.stringify(statuses(first)) === JSON.stringify(statuses(second)),
  details: (first.data?.features ?? []).map(f => ({ id: f.id, status: f.status, observed: f.observed })),
  toolsAfterProbes: (await mc.getTools()).length,
}
