const mc = document.modelContext
const before = (await mc.getTools()).map(t => t.name)
const tag = Date.now().toString(36)
const out = {}
const reg = (name, opts) => mc.registerTool({
  name, title: 'p', description: 'probe',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: () => ({ ok: true }),
}, opts)

// exposedTo: is a foreign-scoped tool withheld from this origin?
try {
  await reg(`px_own_${tag}`, { exposedTo: [location.origin] })
  await reg(`px_foreign_${tag}`, { exposedTo: ['https://example.invalid'] })
  const l = (await mc.getTools()).map(t => t.name)
  out.exposedTo = { own: l.includes(`px_own_${tag}`), foreignLeaked: l.includes(`px_foreign_${tag}`) }
} catch (e) { out.exposedTo = { threw: String(e).slice(0,120) } }

// fromOrigins: does it filter?
try {
  const all = (await mc.getTools()).length
  const here = (await mc.getTools({ fromOrigins: [location.origin] })).length
  const foreign = (await mc.getTools({ fromOrigins: ['https://example.invalid'] })).length
  out.fromOrigins = { all, here, foreign, filters: foreign < all }
} catch (e) { out.fromOrigins = { threw: String(e).slice(0,120) } }

// toolchange
let fired = false
const h = () => { fired = true }
mc.addEventListener?.('toolchange', h)
await reg(`px_change_${tag}`)
await new Promise(r => setTimeout(r, 200))
mc.removeEventListener?.('toolchange', h)
out.toolchange = { isEventTarget: typeof mc.addEventListener === 'function', fired }

// declarative form
const f = document.createElement('form')
f.setAttribute('toolname', `px_form_${tag}`)
f.setAttribute('tooldescription', 'probe')
f.style.display = 'none'
const i = document.createElement('input'); i.name = 'q'; f.appendChild(i)
document.body.appendChild(f)
await new Promise(r => setTimeout(r, 300))
out.declarative = { present: (await mc.getTools()).some(t => t.name === `px_form_${tag}`) }
f.remove()

// re-registration / phase
try { await reg(`px_phase_${tag}`); await reg(`px_phase_${tag}`); out.phase = { duplicateAllowed: true } }
catch (e) { out.phase = { duplicateAllowed: false, error: String(e).slice(0,140) } }

// annotations kept
await mc.registerTool({
  name: `px_annot_${tag}`, title: 'p', description: 'probe',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false, destructiveHint: false, idempotentHint: true },
  execute: () => ({ ok: true }),
})
const got = (await mc.getTools()).find(t => t.name === `px_annot_${tag}`)
out.annotations = { keys: got?.annotations ? Object.keys(got.annotations) : [] }

// residue: is there any way to remove a probe tool?
const after = (await mc.getTools()).map(t => t.name)
out.residue = { before: before.length, after: after.length, leftBehind: after.filter(n => !before.includes(n)).length,
  hasUnregister: ['unregisterTool','removeTool','deleteTool'].filter(k => typeof mc[k] === 'function') }
return out
