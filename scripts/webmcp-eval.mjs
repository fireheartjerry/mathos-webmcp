/**
 * Minimal CDP driver for the WebMCP criteria checks.
 *
 * Usage:  node scripts/webmcp-eval.mjs <file-with-js>  [tab-url-substring]
 *
 * Evaluates the file's contents as an async expression in the page and prints the
 * JSON result. Kept deliberately tiny: every criterion check is a different script
 * file, so the instrument stays constant across rounds while the probes vary.
 */
import { readFileSync } from 'node:fs'

const PORT = process.env.CDP_PORT ?? '9333'
const source = readFileSync(process.argv[2], 'utf8')
const match = process.argv[3] ?? '/learn'

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(match))
if (!page) {
  console.error(`No page matching ${match}. Open tabs:`)
  for (const t of targets) console.error(`  ${t.type} ${t.url}`)
  process.exit(1)
}

// Node 26 ships a native WebSocket, so this driver has no dependencies.
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

const result = await new Promise((resolve, reject) => {
  const id = 1
  const timer = setTimeout(() => reject(new Error('CDP evaluate timed out after 120s')), 120_000)
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
    if (message.id !== id) return
    clearTimeout(timer)
    if (message.error) return reject(new Error(JSON.stringify(message.error)))
    const { result: value, exceptionDetails } = message.result
    if (exceptionDetails) {
      return reject(new Error(exceptionDetails.exception?.description ?? JSON.stringify(exceptionDetails)))
    }
    resolve(value.value)
  })
  ws.send(
    JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => { ${source} })()`,
        awaitPromise: true,
        returnByValue: true,
        allowUnsafeEvalBlockedByCSP: true,
      },
    }),
  )
})

ws.close()
console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
