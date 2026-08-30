import { writeFileSync } from 'node:fs'
const PORT = process.env.CDP_PORT ?? '9333'
const match = process.argv[2] ?? '/learn'
const out = process.argv[3] ?? 'shot.png'
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(match))
if (!page) { console.error('no page for', match); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }) })
const send = (id, method, params = {}) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout ' + method)), 30000)
  ws.addEventListener('message', function once(e) {
    const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
    if (m.id !== id) return
    ws.removeEventListener('message', once); clearTimeout(t)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  })
  ws.send(JSON.stringify({ id, method, params }))
})
const shot = await send(1, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
ws.close()
console.log('wrote', out)
