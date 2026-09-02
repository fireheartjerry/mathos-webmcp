/** Six-second capture spike: proves tab capture at the emulated film size and reports fps. */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { connectPage, launchChrome, wait } from './chrome.mjs'
import { startRecordingScript, startSink } from './recorder.mjs'

const URL_ = process.env.URL ?? 'http://localhost:3400/'
const WIDTH = 2560
const HEIGHT = 1440
const OUT = resolve(process.env.OUT ?? '.film/spike.webm')

const chrome = await launchChrome({ port: 9444, width: WIDTH, height: HEIGHT })
try {
  const page = await connectPage(chrome.port)
  await page.send('Page.enable')
  await page.send('Runtime.enable')
  await page.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await page.send('Page.navigate', { url: URL_ })
  await page.waitFor('return document.readyState === "complete" && document.querySelector("[data-hydrated=true]") !== null', 30_000)
  const webmcp = await page.evaluate('return { modelContext: typeof document.modelContext, register: typeof document.modelContext?.registerTool, inner: [innerWidth, innerHeight] }')
  console.log('page', JSON.stringify(webmcp))
  const sink = await startSink(OUT)
  const started = await page.evaluate(startRecordingScript({ uploadUrl: sink.url, width: WIDTH, height: HEIGHT }), { userGesture: true })
  console.log('recording', JSON.stringify(started))
  // Animate something real: open the Gamma project so the camera transition paints.
  await page.evaluate('document.querySelector(\'button[aria-label="Open Gamma Function"]\')?.click(); return true')
  await wait(6000)
  const stopped = await page.evaluate('return await window.__filmRecorder.stop()')
  await wait(500)
  await sink.close()
  console.log('stopped', JSON.stringify(stopped), 'bytes', sink.stats())
  page.close()
} finally {
  chrome.close()
}
const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_read_frames,duration', '-count_frames', '-of', 'default=noprint_wrappers=1', OUT]).toString()
console.log(probe)
