/**
 * Shared Chrome + CDP helpers for the Mathburst film pipeline.
 *
 * Launches a private Chrome profile with tab-capture flags, connects to the
 * first page over the DevTools protocol, and exposes evaluate/wait helpers.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  `${process.env.HOME ?? ''}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
]

export const wait = (ms) => new Promise((done) => setTimeout(done, ms))

export function findChrome() {
  const found = (process.env.CHROME ? [process.env.CHROME] : []).concat(CANDIDATES).find((path) => existsSync(path))
  if (!found) throw new Error('Chrome was not found. Set CHROME=<path to the Chrome binary>.')
  return found
}

export async function launchChrome({ port = 9444, width = 2560, height = 1440, headless = false, position = '1707,0' } = {}) {
  // The manifest's chromePosition assumes the authoring machine's second monitor.
  // CHROME_POSITION overrides it so another display can place the window on screen:
  // the screencast wants a visible window, not one pushed off the desktop.
  const windowPosition = process.env.CHROME_POSITION ?? position
  const profile = mkdtempSync(join(tmpdir(), 'mathburst-film-'))
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--enable-features=WebMCP',
    '--use-fake-ui-for-media-stream',
    '--auto-select-tab-capture-source-by-title=Mathburst',
    `--window-size=${width},${height + 90}`,
    `--window-position=${windowPosition}`,
    '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--disable-infobars',
    '--disable-session-crashed-bubble',
    '--noerrdialogs',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    'about:blank',
  ]
  if (headless) args.unshift('--headless=new')
  const child = spawn(findChrome(), args, { stdio: 'ignore', detached: false })
  const close = () => {
    try { child.kill() } catch { /* already gone */ }
    setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch { /* profile busy */ } }, 1500)
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      if (targets.some((target) => target.type === 'page')) return { child, port, close, profile }
    } catch { /* not up yet */ }
    await wait(250)
  }
  close()
  throw new Error('Chrome did not expose the DevTools port.')
}

export async function connectPage(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((target) => target.type === 'page')
  if (!page) throw new Error('No page target.')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolveOpen, rejectOpen) => {
    ws.addEventListener('open', resolveOpen, { once: true })
    ws.addEventListener('error', rejectOpen, { once: true })
  })
  let commandId = 1
  const pending = new Map()
  const listeners = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data))
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id)
      pending.delete(message.id)
      message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result)
      return
    }
    if (message.method && listeners.has(message.method)) {
      for (const listener of listeners.get(message.method)) listener(message.params)
    }
  })
  const send = (method, params = {}, timeoutMs = 60_000) => new Promise((resolveCommand, rejectCommand) => {
    const id = commandId++
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand })
    setTimeout(() => {
      if (!pending.has(id)) return
      pending.delete(id)
      rejectCommand(new Error(`Timed out waiting for ${method}`))
    }, timeoutMs)
    ws.send(JSON.stringify({ id, method, params }))
  })
  const on = (method, listener) => {
    if (!listeners.has(method)) listeners.set(method, new Set())
    listeners.get(method).add(listener)
    return () => listeners.get(method)?.delete(listener)
  }
  const evaluate = (body, { userGesture = false, timeoutMs = 120_000 } = {}) => send('Runtime.evaluate', {
    expression: `(async () => { ${body} })()`,
    awaitPromise: true,
    returnByValue: true,
    userGesture,
  }, timeoutMs).then((result) => {
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text
      throw new Error(detail ?? 'Page evaluation failed.')
    }
    return result.result.value
  })
  const waitFor = async (body, timeoutMs = 20_000, interval = 150) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      try { if (await evaluate(body)) return } catch { /* navigating */ }
      await wait(interval)
    }
    throw new Error(`Timed out waiting for: ${body}`)
  }
  return { ws, send, on, evaluate, waitFor, close: () => ws.close() }
}
