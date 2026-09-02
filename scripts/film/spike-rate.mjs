/** Compare frame delivery: tab-capture track callbacks vs CDP screencast, while the page animates. */
import { connectPage, launchChrome, wait } from './chrome.mjs'

const URL_ = process.env.URL ?? 'http://localhost:3400/'
const WIDTH = 2560
const HEIGHT = 1440
const chrome = await launchChrome({ port: 9444, width: WIDTH, height: HEIGHT, position: process.env.CHROME_POSITION ?? '1707,0' })
try {
  const page = await connectPage(chrome.port)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await page.send('Page.navigate', { url: URL_ })
  await page.waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null', 30_000)
  console.log('visibility', await page.evaluate('return { vis: document.visibilityState, hidden: document.hidden, focus: document.hasFocus(), win: [outerWidth, outerHeight, screenX, screenY] }'))
  await page.evaluate('document.querySelector(\'button[aria-label="Open Gamma Function"]\')?.click(); return true')
  await wait(1500)

  // Animation loop driven by the page itself: a real product control every 400 ms.
  await page.evaluate(`
    window.__spin = setInterval(() => {
      const zoomIn = document.querySelector('button[aria-label="Zoom in"]')
      const zoomOut = document.querySelector('button[aria-label="Zoom out"]')
      const percent = Number(document.querySelector('.zoom-controls span')?.textContent?.replace('%', '') || 100)
      ;(percent > 110 ? zoomOut : zoomIn)?.click()
    }, 400)
    return true
  `)

  // (a) rVFC on the captured stream
  const track = await page.evaluate(`
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' })
    const video = document.createElement('video')
    video.muted = true
    video.srcObject = stream
    await video.play()
    let count = 0
    const tick = () => { count += 1; video.requestVideoFrameCallback(tick) }
    video.requestVideoFrameCallback(tick)
    await new Promise((done) => setTimeout(done, 4000))
    const settings = stream.getVideoTracks()[0].getSettings()
    stream.getTracks().forEach((t) => t.stop())
    return { count, seconds: 4, settings }
  `, { userGesture: true })
  console.log('tab capture frames in 4s:', JSON.stringify(track))

  // (b) CDP screencast
  let frames = 0
  const stop = page.on('Page.screencastFrame', async (params) => {
    frames += 1
    try { await page.send('Page.screencastFrameAck', { sessionId: params.sessionId }) } catch { /* ended */ }
  })
  await page.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 })
  await wait(4000)
  await page.send('Page.stopScreencast')
  stop()
  console.log('screencast frames in 4s:', frames)
  await page.evaluate('clearInterval(window.__spin); return true')
  page.close()
} finally {
  chrome.close()
}
