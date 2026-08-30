const mc = document.modelContext
if (!mc) return { error: 'no modelContext' }
const base = (await mc.getTools()).length
const log = []
let registered = 0
let stop = null
const BATCH = 50
const MAX = 1000
const t0 = performance.now()
outer:
for (let batch = 0; registered < MAX; batch++) {
  const start = performance.now()
  for (let i = 0; i < BATCH && registered < MAX; i++) {
    const name = `ceil_${registered}`
    try {
      await mc.registerTool({
        name,
        title: 'Ceiling probe',
        description: 'Registered solely to find the maximum registrable tool count.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ ok: true }),
      })
      registered++
    } catch (e) {
      stop = { reason: 'registerTool rejected', at: registered, error: String(e).slice(0, 200) }
      break outer
    }
  }
  const listed = (await mc.getTools()).length
  const expected = base + registered
  log.push({ registered, listed, expected, batchMs: Math.round(performance.now() - start) })
  if (listed !== expected) {
    stop = { reason: 'getTools truncated', at: registered, listed, expected }
    break
  }
}
return {
  base,
  registered,
  stop: stop ?? { reason: `reached MAX ${MAX} with no failure` },
  totalMs: Math.round(performance.now() - t0),
  finalListed: (await mc.getTools()).length,
  log,
}
