/**
 * A command-line front door to the page's WebMCP tools.
 *
 * Lets an agent drive the product itself, rather than proposing calls for someone else
 * to relay. Each invocation opens its own CDP connection, executes the calls in order,
 * and prints the envelopes as JSON.
 *
 *   node scripts/agent-call.mjs '[{"tool":"get_scratchpad","args":{}}]'
 *   node scripts/agent-call.mjs --file calls.json
 *
 * Nothing is substituted for the caller: every argument is sent exactly as given, so a
 * stale `expectedRevision` really is stale. That is the point — an agent that cannot
 * tell it guessed wrong has not been tested.
 */
import { readFileSync } from 'node:fs'

const PORT = process.env.CDP_PORT ?? '9333'
const MATCH = process.env.TAB_MATCH ?? '/learn'

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node scripts/agent-call.mjs \'[{"tool":"name","args":{}}]\'  |  --file <path>')
  process.exit(2)
}
const raw = arg === '--file' ? readFileSync(process.argv[3], 'utf8') : arg

let calls
try {
  calls = JSON.parse(raw)
} catch (error) {
  console.error(`The calls argument is not valid JSON: ${String(error)}`)
  process.exit(2)
}
if (!Array.isArray(calls)) {
  console.error('Expected a JSON array of {"tool","args"} objects.')
  process.exit(2)
}

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && t.url.includes(MATCH))
if (!page) {
  console.error(`No page matching ${MATCH}. Is the scratchpad open?`)
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

const expression = `
  const mc = document.modelContext
  if (!mc) return [{ error: 'This browser does not expose document.modelContext.' }]
  const tools = await mc.getTools()
  const by = Object.fromEntries(tools.map((t) => [t.name, t]))
  const calls = ${JSON.stringify(calls)}
  const out = []
  for (const c of calls) {
    if (!by[c.tool]) {
      out.push({ tool: c.tool, error: 'No such tool. Names: ' + tools.map((t) => t.name).sort().join(', ') })
      break
    }
    let result
    const startedAt = performance.now()
    try {
      const rawResult = await mc.executeTool(by[c.tool], JSON.stringify(c.args ?? {}))
      result = typeof rawResult === 'string'
        ? (() => { try { return JSON.parse(rawResult) } catch { return rawResult } })()
        : rawResult
    } catch (e) {
      result = { threw: String(e).slice(0, 200) }
    }
    out.push({ tool: c.tool, ms: Math.round(performance.now() - startedAt), result })
    // Stop at the first refusal, so a wrong argument does not cascade.
    if (result && result.ok === false) break
  }
  return out
`

const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timed out after 120s')), 120_000)
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
    if (message.id !== 1) return
    clearTimeout(timer)
    if (message.error) return reject(new Error(JSON.stringify(message.error)))
    const { result: value, exceptionDetails } = message.result
    if (exceptionDetails) return reject(new Error(exceptionDetails.exception?.description ?? 'evaluation failed'))
    resolve(value.value)
  })
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true },
  }))
})

ws.close()
console.log(JSON.stringify(result, null, 1))
