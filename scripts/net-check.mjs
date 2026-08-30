const PORT = process.env.CDP_PORT ?? '9333'
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(process.env.TAB_MATCH ?? '/learn'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
const failures = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    failures.push({ status: m.params.response.status, url: m.params.response.url, type: m.params.type })
  }
  if (m.method === 'Network.loadingFailed') failures.push({ status: 'failed', url: m.params.errorText, type: m.params.type })
})
let id = 20
ws.send(JSON.stringify({ id: id++, method: 'Network.enable' }))
await new Promise((r) => setTimeout(r, 500))
ws.send(JSON.stringify({ id: id++, method: 'Page.navigate', params: { url: page.url } }))
await new Promise((r) => setTimeout(r, 9000))
ws.close()
console.log(JSON.stringify(failures, null, 1))
