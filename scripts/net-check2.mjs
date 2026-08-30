const PORT = process.env.CDP_PORT ?? '9333'
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(process.env.TAB_MATCH ?? '/learn'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
const seen = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
  if (m.method === 'Network.requestWillBeSent') seen.push({ id: m.params.requestId, url: m.params.request.url })
  if (m.method === 'Network.responseReceived') {
    const r = seen.find((s) => s.id === m.params.requestId)
    if (r) r.status = m.params.response.status
  }
  if (m.method === 'Network.loadingFailed') {
    const r = seen.find((s) => s.id === m.params.requestId)
    if (r) r.status = 'FAILED ' + m.params.errorText
  }
})
let id = 40
ws.send(JSON.stringify({ id: id++, method: 'Network.enable' }))
await new Promise((r) => setTimeout(r, 400))
ws.send(JSON.stringify({ id: id++, method: 'Page.navigate', params: { url: page.url } }))
await new Promise((r) => setTimeout(r, 10000))
ws.close()
const bad = seen.filter((s) => s.status !== 200 && s.status !== 204 && s.status !== 304)
console.log(JSON.stringify({ total: seen.length, notOk: bad, urls: seen.map((s) => `${s.status} ${s.url.replace(/^https?:\/\/[^/]+/, '')}`) }, null, 1))
