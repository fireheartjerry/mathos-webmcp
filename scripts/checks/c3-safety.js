const mc = document.modelContext
const tools = await mc.getTools()
const by = Object.fromEntries(tools.map(t => [t.name, t]))
let n = 0
const rid = () => `req_${Date.now().toString(36)}_${(n++).toString(36)}`
// Every call is raced against a timeout. A call that never settles is a result, not
// a reason to hang the harness.
const raw = async (name, args, opts, ms = 6000) => {
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ neverSettled: true }), ms))
  const attempt = (async () => {
    try {
      const r = await mc.executeTool(by[name], JSON.stringify(args), opts)
      return typeof r === 'string' ? JSON.parse(r) : r
    } catch (e) { return { threw: String(e).slice(0, 200) } }
  })()
  return Promise.race([attempt, timeout])
}
const snap = async () => {
  const s = await raw('get_scratchpad', {})
  return { revision: s.data.revision, steps: JSON.stringify(s.data.steps) }
}
const out = {}

// Seed one step.
await raw('add_step', { latex: 'a = x^2', expectedRevision: (await snap()).revision, requestId: rid() })

// C3.1 stale revision leaves state identical
{
  const before = await snap()
  const env = await raw('add_step', { latex: 'stale write', expectedRevision: before.revision - 1, requestId: rid() })
  const after = await snap()
  out['C3.1'] = { code: env.error?.code, field: env.error?.field, recovery: !!env.error?.recovery,
    stateIdentical: before.steps === after.steps && before.revision === after.revision }
}

// C3.2 replayed requestId applies once and returns the first result
{
  const before = await snap()
  const id = rid()
  const args = { latex: 'replayed line', expectedRevision: before.revision, requestId: id }
  const first = await raw('add_step', args)
  const mid = await snap()
  const second = await raw('add_step', args)
  const after = await snap()
  out['C3.2'] = { first: JSON.stringify(first).slice(0,200), second: JSON.stringify(second).slice(0,200), firstOk: first.ok ?? null, secondOk: second.ok ?? null,
    identicalEnvelope: JSON.stringify(first) === JSON.stringify(second),
    appliedOnce: mid.steps === after.steps && mid.revision === after.revision }
}

// C3.3 two unawaited mutations serialise
{
  const before = await snap()
  const a = raw('add_step', { latex: 'race one', expectedRevision: before.revision, requestId: rid() })
  const b = raw('add_step', { latex: 'race two', expectedRevision: before.revision, requestId: rid() })
  const [ra, rb] = await Promise.all([a, b])
  const after = await snap()
  const steps = JSON.parse(after.steps)
  out['C3.3'] = { a: JSON.stringify(ra).slice(0,200), b: JSON.stringify(rb).slice(0,200), aOk: ra.ok ?? null, bOk: rb.ok ?? null, aThrew: !!ra.threw, bThrew: !!rb.threw,
    loserCode: [ra, rb].find(r => r && r.ok === false)?.error?.code,
    stepCount: steps.length,
    // exactly one of the two may land against a single revision
    exactlyOneApplied: [ra.ok, rb.ok].filter(Boolean).length === 1 }
}

// C3.4 abort mid-flight: all-or-nothing
{
  const before = await snap()
  const ac = new AbortController()
  const abortedId = rid()
  const retryId = abortedId
  const p = raw('add_step', { latex: 'aborted line', expectedRevision: before.revision, requestId: abortedId }, { signal: ac.signal })
  ac.abort()
  const env = await p
  const after = await snap()
  const steps = JSON.parse(after.steps)
  const applied = steps.some(s => s.latex.includes('aborted'))
  // The criterion is "never partial", not "never applied". Chrome rejects the call at
  // the browser layer and never passes the signal to the handler, so an abort cannot
  // cancel a write that already ran. What must hold is that the step is either wholly
  // there or wholly absent, and that a retry cannot double-apply it.
  const partial = steps.some(s => s.latex.includes('aborted') && s.latex !== 'aborted line')
  const retry = await raw('add_step', { latex: 'aborted line', expectedRevision: after.revision, requestId: retryId })
  const afterRetry = JSON.parse((await snap()).steps)
  out['C3.4'] = { env: JSON.stringify(env).slice(0, 220), applied, settled: !env.neverSettled,
    partial, retrySafe: afterRetry.filter(s => s.latex === 'aborted line').length === 1,
    allOrNothing: !partial && !env.neverSettled }
}

// C3.10 registration during an in-flight probe leaves the list intact
{
  const before = (await mc.getTools()).length
  const probe = raw('get_platform', {})
  const extra = new AbortController()
  await mc.registerTool({
    name: `inflight_${Date.now().toString(36)}`, title: 'p', description: 'registered during a probe',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ ok: true }),
  }, { signal: extra.signal })
  await probe
  extra.abort()
  await new Promise(r => setTimeout(r, 300))
  out['C3.10'] = { before, after: (await mc.getTools()).length }
}
return out
