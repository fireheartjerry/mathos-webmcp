/**
 * C3.9: put a tab genuinely into the background and read what the page sees.
 *
 * Round 1 opened a second tab and the first still reported "visible"; round 2 overrode
 * the page's own visibilityState, which reproduces the report rather than the state.
 * This activates another target through CDP, which is what actually backgrounds a tab,
 * and then asks the page what it observes.
 */
const PORT = process.env.CDP_PORT ?? '9333'
const list = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()

const send = async (target, method, params = {}) => {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
  const out = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 130_000)
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
      if (m.id !== 1) return
      clearTimeout(timer)
      if (m.error) return reject(new Error(JSON.stringify(m.error)))
      resolve(m.result)
    })
    ws.send(JSON.stringify({ id: 1, method, params }))
  })
  ws.close()
  return out
}

const evaluate = (target, expression) =>
  send(target, 'Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
    .then((r) => r.result.value)

const pages = (await list()).filter((t) => t.type === 'page')
const learn = pages.find((t) => t.url.includes('/learn'))
if (!learn) { console.error('no /learn tab'); process.exit(1) }

const before = await evaluate(learn, `
  const t = await document.modelContext.getTools()
  return { visibility: document.visibilityState, names: t.map(x => x.name).sort() }
`)

// Open a second tab and activate it, which is what backgrounds the first.
const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
await new Promise((r) => setTimeout(r, 1500))
await fetch(`http://127.0.0.1:${PORT}/json/activate/${created.id}`)
await new Promise((r) => setTimeout(r, 1500))

const duringStart = await evaluate(learn, `return document.visibilityState`)

// Wait 60s with the tab in the background, then read back and write.
const during = await evaluate(learn, `
  const started = Date.now()
  const seen = []
  const tick = () => seen.push(document.visibilityState)
  tick()
  await new Promise(r => setTimeout(r, 62000))
  tick()
  const mc = document.modelContext
  const tools = await mc.getTools()
  const by = Object.fromEntries(tools.map(t => [t.name, t]))
  let write = null
  try {
    const s = JSON.parse(await mc.executeTool(by.get_scratchpad, '{}'))
    write = JSON.parse(await mc.executeTool(by.add_step, JSON.stringify({
      latex: 'x^2 + 3', expectedRevision: s.data.revision,
      requestId: 'req_bg_' + Math.random().toString(36).slice(2, 8),
    })))
  } catch (e) { write = { threw: String(e).slice(0, 160) } }
  return {
    waitedMs: Date.now() - started,
    visibilitySeen: seen,
    names: tools.map(t => t.name).sort(),
    writeOk: write?.ok ?? null,
    writeSettled: !!write,
    paintedBeforeReturning: write?.data?.paintedBeforeReturning ?? null,
  }
`)

await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`)

console.log(JSON.stringify({
  visibilityBefore: before.visibility,
  visibilityAfterActivatingAnotherTab: duringStart,
  waitedMs: during.waitedMs,
  visibilitySeenDuringWait: during.visibilitySeen,
  countBefore: before.names.length,
  countAfter: during.names.length,
  identical: JSON.stringify(before.names) === JSON.stringify(during.names),
  dupes: during.names.filter((n, i) => during.names[i - 1] === n),
  residue: during.names.filter((n) => n.startsWith('probe_')),
  writeSettled: during.writeSettled,
  writeOk: during.writeOk,
  paintedBeforeReturning: during.paintedBeforeReturning,
}, null, 2))
