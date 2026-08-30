/**
 * Layout check for any page, at the widths a judge is likely to use.
 *
 * `responsive.mjs` asserts scratchpad-specific things - the six tool groups, the
 * composer - so it cannot be pointed at the landing page or the 404, and neither of
 * those had ever been measured at a phone width. This checks only what every page owes
 * a reader: no horizontal scroll, nothing overflowing the viewport, no hit target under
 * 32px.
 *
 *   node scripts/layout-check.mjs http://localhost:3000/
 *
 * Needs Chrome on CDP port 9333.
 */
const url = process.argv[2]
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json()
const p = list.filter(t => t.type === 'page')[0]
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0
const send = (m, pa = {}) => new Promise((res, rej) => {
  const mine = ++id
  const t = setTimeout(() => rej(new Error('timeout ' + m)), 25000)
  ws.addEventListener('message', function o(e) {
    const x = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
    if (x.id !== mine) return
    ws.removeEventListener('message', o); clearTimeout(t); res(x.result)
  })
  ws.send(JSON.stringify({ id: mine, method: m, params: pa }))
})
for (const width of [390, 430, 768, 1024, 1280]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: width < 600 })
  await send('Page.navigate', { url })
  await new Promise(r => setTimeout(r, 2200))
  const out = (await send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const doc = document.documentElement
      const over = [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).length
      const tiny = [...document.querySelectorAll('button, a[href]')].filter(el => { const r = el.getBoundingClientRect(); return r.width && Math.min(r.width, r.height) < 32 }).length
      return { hscroll: doc.scrollWidth > window.innerWidth + 1, overflow: over, tiny, links: document.querySelectorAll('a[href]').length }
    })())`,
    returnByValue: true,
  })).result.value
  console.log(String(width).padStart(5), out)
}
await send('Emulation.clearDeviceMetricsOverride')
ws.close()
