/**
 * How the page holds up at the widths a judge might actually use.
 *
 * Judges test in ChatGPT's in-app browser as well as desktop Chrome, and that can be
 * narrow. Overflow at those widths is an Execution failure in the exact environment
 * being judged, so it is measured rather than assumed.
 */
const PORT = process.env.CDP_PORT ?? '9333'
const URL_ = process.env.URL ?? 'http://localhost:3000/learn'
const WIDTHS = [
  [390, 844, 'phone'],
  [430, 932, 'large phone'],
  [768, 1024, 'tablet portrait'],
  [1024, 768, 'small laptop'],
  [1280, 800, 'laptop'],
]

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

await send('Page.enable')
const results = []
for (const [width, height, label] of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  await send('Page.navigate', { url: URL_ })
  await new Promise((r) => setTimeout(r, 5000))
  const probe = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement
      const overflowing = []
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (r.right > innerWidth + 1 || r.left < -1) {
          const cls = (el.className && el.className.toString) ? el.className.toString().slice(0, 40) : ''
          overflowing.push(el.tagName.toLowerCase() + (cls ? '.' + cls : '') + ' @' + Math.round(r.left) + '..' + Math.round(r.right))
        }
      }
      const tiny = []
      for (const el of document.querySelectorAll('button, a[href], input')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (Math.min(r.width, r.height) < 32) tiny.push((el.textContent || el.className).toString().trim().slice(0, 24))
      }
      return {
        horizontalScroll: doc.scrollWidth > innerWidth + 1,
        scrollWidth: doc.scrollWidth,
        innerWidth,
        overflowing: overflowing.slice(0, 6),
        overflowCount: overflowing.length,
        tinyTargets: tiny.slice(0, 5),
        consoleVisible: Boolean(document.querySelector('.agent-console')),
        groups: document.querySelectorAll('.console-group-head').length,
        composer: Boolean(document.querySelector('.composer input')),
        headline: (document.querySelector('h1')?.textContent || '').slice(0, 30),
      }
    })()`,
  })
  results.push({ label, width, height, ...probe.result.value })
}
await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`)
ws.close()
for (const r of results) {
  console.log(`${r.label.padEnd(16)} ${String(r.width).padStart(4)}px  hscroll=${r.horizontalScroll ? 'YES' : 'no '}  overflow=${String(r.overflowCount).padStart(3)}  groups=${r.groups}  composer=${r.composer}  tiny=${r.tinyTargets.length}`)
  if (r.overflowCount) console.log('    ', r.overflowing.join(' | ').slice(0, 150))
  if (r.tinyTargets.length) console.log('     tiny:', r.tinyTargets.join(', ').slice(0, 120))
}
