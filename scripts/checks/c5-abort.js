const mc = document.modelContext
const tag = Date.now().toString(36)
const ac = new AbortController()
const before = (await mc.getTools()).length
await mc.registerTool({
  name: `abt_${tag}`, title: 'p', description: 'abort-unregister probe',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: () => ({ ok: true }),
}, { signal: ac.signal })
const during = (await mc.getTools()).map(t => t.name)
ac.abort()
await new Promise(r => setTimeout(r, 150))
const after = (await mc.getTools()).map(t => t.name)
// If abort unregisters, the name can be re-registered afterwards.
let reRegistered = null
try {
  await mc.registerTool({
    name: `abt_${tag}`, title: 'p', description: 'second registration after abort',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => ({ ok: true }),
  })
  reRegistered = 'accepted'
} catch (e) { reRegistered = String(e).slice(0, 120) }
return {
  before,
  presentWhileLive: during.includes(`abt_${tag}`),
  presentAfterAbort: after.includes(`abt_${tag}`),
  abortUnregisters: during.includes(`abt_${tag}`) && !after.includes(`abt_${tag}`),
  reRegisteredAfterAbort: reRegistered,
}
