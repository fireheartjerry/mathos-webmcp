/** First-load timing and transfer weight on the production build. */
const PORT = process.env.CDP_PORT ?? '9333'
const url = process.env.URL ?? 'http://localhost:3500/learn'
const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(created.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
let id = 1
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const mine = id++
  const t = setTimeout(() => reject(new Error('timeout ' + method)), 30000)
  ws.addEventListener('message', function once(e) {
    const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
    if (m.id !== mine) return
    ws.removeEventListener('message', once); clearTimeout(t)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  })
  ws.send(JSON.stringify({ id: mine, method, params }))
})
let bytes = 0
ws.addEventListener('message', (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
  if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength || 0
})
await send('Network.enable')
await send('Network.setCacheDisabled', { cacheDisabled: true })
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 9000))
const t = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {}
    const paints = {}
    for (const p of performance.getEntriesByType('paint')) paints[p.name] = Math.round(p.startTime)
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      load: Math.round(nav.loadEventEnd || 0),
      firstPaint: paints['first-paint'] ?? null,
      firstContentfulPaint: paints['first-contentful-paint'] ?? null,
      resources: performance.getEntriesByType('resource').length,
    }
  })()`,
})
console.log(JSON.stringify({ ...t.result.value, transferredKB: Math.round(bytes / 1024) }, null, 1))
await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`)
ws.close()
