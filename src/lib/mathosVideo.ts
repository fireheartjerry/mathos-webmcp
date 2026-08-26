export const CANONICAL_MATHOS_VIDEO_ID = 'dec88f8290464fbe88707899523145e6'

export const MATHOS_VIDEO_PROMPT = 'Create a concise visual math lesson for a calculus learner who answered 36 instead of 40. Show a = x², b = 3x, and y = a·b + a at x = 2. Animate the two routes from a to y: through the product a·b and directly through +a. Explain in plain English that derivative contributions from both routes add, so 36 + 4 = 40. End by asking the learner to try the same shared-path idea on a fresh problem. Keep it under 75 seconds.'

export const MATHOS_PLAYER_HOST = 'https://video-generation-web-host-staging.mathos.ai'

export type MathosVideoVariant = 'open' | 'full'

export type MathosSseEvent = {
  category: string
  data: Record<string, unknown>
}

export type MathosGenerationState = {
  requestId: string | null
  openingReady: boolean
  fullReady: boolean
  statusLines: string[]
}

export function mathosPlayerUrl(requestId: string, variant: MathosVideoVariant = 'full') {
  return `${MATHOS_PLAYER_HOST}/${requestId}-${variant}/index.html?autoplay=1`
}

export function parseMathosSseBlock(block: string): MathosSseEvent | null {
  const lines = block.replace(/\r\n?/g, '\n').split('\n')
  let category = 'message'
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('event:')) category = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!dataLines.length) return null
  try {
    const parsed: unknown = JSON.parse(dataLines.join('\n'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return { category, data: parsed as Record<string, unknown> }
  } catch {
    return null
  }
}

function statusFor(event: MathosSseEvent) {
  const kind = String(event.data.kind ?? '')
  if (kind === 'projects_bootstrapped') return 'Lesson workspace prepared.'
  if (kind === 'script_llm_start') return 'Writing the lesson script.'
  if (kind === 'section_opened' && event.data.section === 'opening') return 'Opening narration started.'
  if (kind === 'section_opened' && event.data.section === 'body') return 'Building the shared-path explanation.'
  if (kind === 'upload_opening_end') return 'Opening preview published.'
  if (kind === 'full_build_start') return 'Assembling the complete lesson.'
  if (kind === 'upload_full_start') return 'Publishing the complete lesson.'
  if (kind === 'upload_full_end') return 'Complete lesson published.'
  if (kind === 'pipeline_end') return 'Generation complete.'
  return null
}

export function startMathosGeneration(onUpdate: (state: MathosGenerationState) => void) {
  const controller = new AbortController()
  const state: MathosGenerationState = { requestId: null, openingReady: false, fullReady: false, statusLines: [] }

  const finished = (async () => {
    const response = await fetch('/video-api/video-generation', {
      method: 'POST',
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: [{ type: 'text', text: MATHOS_VIDEO_PROMPT }] }),
      signal: controller.signal,
    })
    if (!response.ok || !response.body) throw new Error(`Mathos video service returned ${response.status}.`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const consume = (block: string) => {
      const event = parseMathosSseBlock(block)
      if (!event) return
      const kind = String(event.data.kind ?? '')
      if (kind === 'pipeline_failed' || event.category === 'client_error') {
        throw new Error(String(event.data.detail ?? event.data.error_type ?? 'Mathos generation failed.'))
      }
      if (kind === 'projects_bootstrapped' && typeof event.data.request_id === 'string') state.requestId = event.data.request_id
      if (kind === 'upload_opening_end') state.openingReady = true
      if (kind === 'upload_full_end') state.fullReady = true
      const line = statusFor(event)
      if (line && state.statusLines.at(-1) !== line) state.statusLines = [...state.statusLines.slice(-4), line]
      onUpdate({ ...state, statusLines: [...state.statusLines] })
    }

    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let boundary = buffer.search(/\r?\n\r?\n/)
      while (boundary !== -1) {
        const match = buffer.slice(boundary).match(/^\r?\n\r?\n/)
        const size = match?.[0].length ?? 2
        consume(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + size)
        boundary = buffer.search(/\r?\n\r?\n/)
      }
      if (done) break
    }
    if (buffer.trim()) consume(buffer)
    if (!state.fullReady) throw new Error('Mathos generation ended before the full lesson was published.')
    return { ...state, statusLines: [...state.statusLines] }
  })()

  return { cancel: () => controller.abort(), finished }
}
