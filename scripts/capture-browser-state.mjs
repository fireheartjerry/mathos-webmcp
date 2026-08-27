import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const port = process.env.CDP_PORT ?? '9444'
const pageMatch = process.env.PAGE_MATCH ?? '/learn'
const output = process.env.SCREENSHOT_OUTPUT
const width = Number(process.env.VIEWPORT_WIDTH ?? 1440)
const height = Number(process.env.VIEWPORT_HEIGHT ?? 900)
const reducedMotion = process.env.REDUCED_MOTION === '1'
const hoverSelector = process.env.HOVER_SELECTOR

if (!output) throw new Error('SCREENSHOT_OUTPUT is required.')

const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
const target = targets.find((item) => item.type === 'page' && item.url.includes(pageMatch))
if (!target) throw new Error(`No page matched ${pageMatch} on CDP port ${port}.`)

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 1
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(JSON.stringify(message.error)))
  else resolve(message.result)
})

function command(method, params = {}) {
  const id = nextId++
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

try {
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  if (reducedMotion) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })
  }
  if (hoverSelector) {
    const expression = `(() => {
      const element = document.querySelector(${JSON.stringify(hoverSelector)});
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`
    const evaluated = await command('Runtime.evaluate', { expression, returnByValue: true })
    const point = evaluated.result?.value
    if (!point) throw new Error(`No hover target matched ${hoverSelector}.`)
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
  } else {
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: width - 1, y: height - 1 })
  }
  await new Promise((resolve) => setTimeout(resolve, 150))
  const shot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, Buffer.from(shot.data, 'base64'))
  const inspected = await command('Runtime.evaluate', {
    expression: `(() => {
      const root = document.documentElement;
      const button = document.querySelector('.button');
      return {
        url: location.href,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        horizontalOverflow: root.scrollWidth > root.clientWidth,
        reducedMotionMatched: matchMedia('(prefers-reduced-motion: reduce)').matches,
        buttonTransitionDuration: button ? getComputedStyle(button).transitionDuration : null,
        headingName: document.querySelector('h1')?.getAttribute('aria-label') ?? document.querySelector('h1')?.textContent?.trim() ?? null,
      };
    })()`,
    returnByValue: true,
  })
  const metadata = {
    output,
    width,
    height,
    reducedMotion,
    hoverSelector: hoverSelector ?? null,
    ...inspected.result.value,
  }
  const metadataOutput = output.replace(/\.png$/i, '.json')
  await writeFile(metadataOutput, `${JSON.stringify(metadata, null, 2)}\n`)
  console.log(JSON.stringify({ ...metadata, metadataOutput }))
} finally {
  socket.close()
}
