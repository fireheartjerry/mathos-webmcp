/**
 * Records console errors and unhandled rejections while another script drives the page.
 * A judge with devtools open should see a quiet console.
 */
const PORT = process.env.CDP_PORT ?? '9333'
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(process.env.TAB_MATCH ?? '/learn'))
if (!page) { console.error('no page'); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
const problems = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
    problems.push({ kind: m.params.type, text: (m.params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 200) })
  }
  if (m.method === 'Runtime.exceptionThrown') {
    problems.push({ kind: 'exception', text: (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text ?? '').slice(0, 200) })
  }
  if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
    problems.push({ kind: `log:${m.params.entry.level}`, text: (m.params.entry.text ?? '').slice(0, 200) })
  }
})
let id = 10
const send = (method) => ws.send(JSON.stringify({ id: id++, method }))
send('Runtime.enable'); send('Log.enable')
await new Promise((r) => setTimeout(r, Number(process.env.WATCH_MS ?? 25000)))
ws.close()
console.log(JSON.stringify({ count: problems.length, problems: problems.slice(0, 15) }, null, 1))
