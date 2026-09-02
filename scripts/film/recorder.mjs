/**
 * Tab recorder: the page records itself with MediaRecorder (tab capture at the
 * emulated size) and streams WebM chunks to a local HTTP sink owned by Node.
 * Nothing is faked: the encoder sees exactly what the compositor painted.
 */
import { createServer } from 'node:http'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export async function startSink(outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  const stream = createWriteStream(outputPath)
  let received = 0
  let chunks = 0
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', '*')
    if (request.method === 'OPTIONS') { response.end(); return }
    if (request.method !== 'POST') { response.statusCode = 405; response.end(); return }
    const parts = []
    request.on('data', (part) => parts.push(part))
    request.on('end', () => {
      const buffer = Buffer.concat(parts)
      received += buffer.length
      chunks += 1
      stream.write(buffer, () => { response.statusCode = 204; response.end() })
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    url: `http://127.0.0.1:${port}/chunk`,
    stats: () => ({ received, chunks }),
    close: () => new Promise((resolve) => { stream.end(() => server.close(() => resolve())) }),
  }
}

/** Injected into the page. Starts recording the current tab and returns when the stream is live. */
export const startRecordingScript = ({ uploadUrl, fps = 60, bitrate = 28_000_000, width, height }) => `
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: ${fps}, max: ${fps} }, width: { ideal: ${width} }, height: { ideal: ${height} }, displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
  })
  const [track] = stream.getVideoTracks()
  const settings = track.getSettings()
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: ${bitrate} })
  const queue = []
  let uploading = Promise.resolve()
  recorder.ondataavailable = (event) => {
    if (!event.data || event.data.size === 0) return
    const blob = event.data
    uploading = uploading.then(() => fetch(${JSON.stringify(uploadUrl)}, { method: 'POST', body: blob, keepalive: false }).catch(() => {}))
  }
  window.__filmRecorder = {
    recorder, track, stream,
    startedAt: performance.now(),
    stop: async () => {
      await new Promise((resolve) => { recorder.onstop = resolve; recorder.stop() })
      await uploading
      track.stop()
      return { stoppedAt: performance.now() }
    },
  }
  recorder.start(1000)
  return { settings: { width: settings.width, height: settings.height, frameRate: settings.frameRate }, startedAt: window.__filmRecorder.startedAt }
`
