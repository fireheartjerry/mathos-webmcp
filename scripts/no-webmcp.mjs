/**
 * What a judge in an unflagged browser sees.
 *
 * `Page.addScriptToEvaluateOnNewDocument` removes `document.modelContext` before any
 * page script runs, which is the only faithful way to reach the fallback: deleting it
 * after load would leave the app already registered.
 *
 * The probe below deliberately uses `includes` rather than regular expressions — an
 * earlier version put them in a template literal inside a shell heredoc and the escapes
 * did not survive, which is a recurring hazard in this repository.
 */
const PORT = process.env.CDP_PORT ?? '9333'
const url = process.env.URL ?? 'http://localhost:3300/learn'

const created = await (
  await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
).json()
const ws = new WebSocket(created.webSocketDebuggerUrl)
await new Promise((r, j) => {
  ws.addEventListener('open', r, { once: true })
  ws.addEventListener('error', j, { once: true })
})

let id = 1
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mine = id++
    const timer = setTimeout(() => reject(new Error('timeout ' + method)), 30000)
    ws.addEventListener('message', function once(e) {
      const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data))
      if (m.id !== mine) return
      ws.removeEventListener('message', once)
      clearTimeout(timer)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    })
    ws.send(JSON.stringify({ id: mine, method, params }))
  })

await send('Page.enable')
await send('Page.addScriptToEvaluateOnNewDocument', {
  source:
    "try { Object.defineProperty(document, 'modelContext', { get: () => undefined, configurable: true }) } catch (e) {}",
})
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 8000))

const probe = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const text = document.body.innerText
    const line = (needle) => {
      const at = text.indexOf(needle)
      return at === -1 ? null : text.slice(at, text.indexOf('\\n', at) === -1 ? at + 90 : text.indexOf('\\n', at))
    }
    return {
      modelContext: typeof document.modelContext,
      saysUnavailable: text.includes('WebMCP unavailable'),
      claimsToolsLive: text.includes('page tools available'),
      tellsYouTheFlag: text.includes('enable-webmcp-testing'),
      tellsYouChatGPT: text.includes('ChatGPT'),
      detected: line('Detected:'),
      groupsShown: document.querySelectorAll('.console-group-head').length,
      runLocallyControls: Array.prototype.filter.call(
        document.querySelectorAll('button'),
        (b) => (b.textContent || '').toLowerCase().includes('run locally'),
      ).length,
      composerUsable: !(document.querySelector('input[type="text"]') || {}).disabled,
      problemVisible: text.includes('Find'),
      addLineButton: Array.prototype.some.call(
        document.querySelectorAll('button'),
        (b) => (b.textContent || '').includes('Add line'),
      ),
    }
  })()`,
})
console.log(JSON.stringify(probe.result.value, null, 1))

await fetch(`http://127.0.0.1:${PORT}/json/close/${created.id}`)
ws.close()
