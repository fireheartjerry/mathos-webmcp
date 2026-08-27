import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const CDP_PORT = process.env.WEBMCP_CDP_PORT ?? '9444'
const PAGE_MATCH = process.env.WEBMCP_PAGE_MATCH ?? '/learn'
const SCREENSHOT_DIR = process.env.WEBMCP_SCREENSHOT_DIR
const STORAGE_KEY = 'second-try.session.v1'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const targets = await fetch(`http://127.0.0.1:${CDP_PORT}/json`).then((response) => response.json())
const target = targets.find((item) => item.type === 'page' && item.url.includes(PAGE_MATCH))
if (!target) throw new Error(`No Chrome page matched ${PAGE_MATCH} on CDP port ${CDP_PORT}.`)

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

async function evaluate(expression) {
  const response = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text)
  }
  return response.result.value
}

async function waitFor(expression, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await delay(50)
  }
  throw new Error(`Timed out waiting for ${label}.`)
}

const readState = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))`)

async function waitForRevision(revision) {
  await waitFor(
    `JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))?.revision >= ${revision}`,
    `revision ${revision}`,
  )
  return readState()
}

async function setInputAndSubmit(selector, value) {
  const ok = await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!(input instanceof HTMLInputElement) || !input.form) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.form.requestSubmit();
    return true;
  })()`)
  if (!ok) throw new Error(`Could not submit ${selector}.`)
}

async function addLine(value, expectedRevision) {
  await setInputAndSubmit('#next-step', value)
  return waitForRevision(expectedRevision)
}

async function editLine(position, value, expectedRevision) {
  const opened = await evaluate(`(() => {
    const button = document.querySelectorAll('.step-latex')[${position - 1}];
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  })()`)
  if (!opened) throw new Error(`Could not open line ${position} for editing.`)
  await waitFor(`document.querySelector('input[aria-label="Line ${position}"]') !== null`, `line ${position} editor`)
  await setInputAndSubmit(`input[aria-label="Line ${position}"]`, value)
  return waitForRevision(expectedRevision)
}

async function clickButton(label, expectedRevision) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
    if (!button) return false;
    button.click();
    return true;
  })()`)
  if (!clicked) throw new Error(`Could not click ${label}.`)
  return waitForRevision(expectedRevision)
}

async function runTool(name, input = {}) {
  const output = await evaluate(`(async () => {
    const context = document.modelContext;
    const tools = await context.getTools();
    const tool = tools.find((item) => item.name === ${JSON.stringify(name)});
    if (!tool) throw new Error('Tool not registered: ${name}');
    const raw = await context.executeTool(tool, ${JSON.stringify(JSON.stringify(input))});
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  })()`)
  return output
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const screenshots = []
async function capture(name) {
  if (!SCREENSHOT_DIR) return
  await delay(120)
  const shot = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const filename = `${name}.png`
  await writeFile(join(SCREENSHOT_DIR, filename), Buffer.from(shot.data, 'base64'))
  screenshots.push(filename)
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  if (SCREENSHOT_DIR) {
    await mkdir(SCREENSHOT_DIR, { recursive: true })
    await command('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
  }
  await evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`)
  await command('Page.reload', { ignoreCache: true })
  await waitFor(
    `document.querySelector('#next-step:not(:disabled)') !== null && document.modelContext?.getTools !== undefined`,
    'the hydrated scratchpad and WebMCP',
  )
  await waitFor(`document.modelContext.getTools().then((tools) => tools.length === 6)`, 'six registered tools')

  const registration = await evaluate(`document.modelContext.getTools().then((tools) => tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    readOnlyHint: tool.annotations?.readOnlyHint,
    untrustedContentHint: tool.annotations?.untrustedContentHint,
  })).sort((a, b) => a.name.localeCompare(b.name)))`)
  assert(registration.length === 6, 'Expected six registered tools.')
  assert(registration.filter((tool) => tool.readOnlyHint).length === 2, 'Expected exactly two read-only tools.')
  const headerStatus = await evaluate(`document.querySelector('.header-status')?.textContent.trim()`)
  assert(headerStatus === '6 page tools registered', 'The product did not visibly confirm all six registrations.')
  await capture('01-webmcp-connected-cold')

  let state = await readState()
  const practice = {
    premise: state.problem.premiseLatex,
    wrong: state.problem.errorModes[0].latex,
    otherWrong: state.problem.errorModes[1].latex,
    thirdWrong: state.problem.errorModes[2].latex,
    derivative: state.problem.answer.latex,
    value: String(state.problem.answer.value),
  }

  const initialRead = await runTool('get_scratchpad')
  assert(initialRead.ok && initialRead.revision === 0, 'get_scratchpad did not read the initial revision.')

  state = await addLine(practice.premise, 1)
  state = await addLine(practice.wrong, 2)
  const broken = await runTool('check_work', { expectedRevision: 2, requestId: 'final-check-001' })
  assert(broken.ok && broken.data.firstBrokenStep === 2, 'check_work did not identify line 2.')
  await capture('02-first-break-diagnosis')

  const gatedProposal = await runTool('propose_step', {
    stepId: state.steps[1].id,
    latex: practice.derivative,
    rationale: 'Restore both dependency paths before evaluating.',
    expectedRevision: 3,
    requestId: 'final-proposal-gated',
  })
  assert(
    !gatedProposal.ok && gatedProposal.error.code === 'refused_policy',
    'propose_step did not visibly enforce the second-attempt gate.',
  )
  await capture('03-policy-refusal-recovery')
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Dismiss'))?.click()`)

  const note = await runTool('annotate_step', {
    stepId: state.steps[1].id,
    note: state.problem.errorModes[0].teach,
    focus: true,
    expectedRevision: 3,
    requestId: 'final-note-001',
  })
  assert(note.ok, 'annotate_step failed.')
  await capture('04-targeted-agent-note')

  state = await editLine(2, practice.otherWrong, 5)
  state = await editLine(2, practice.thirdWrong, 6)
  const proposal = await runTool('propose_step', {
    stepId: state.steps[1].id,
    latex: practice.derivative,
    rationale: 'Restore both dependency paths before evaluating.',
    expectedRevision: 6,
    requestId: 'final-proposal-001',
  })
  if (!proposal.ok) console.error('propose_step response:', JSON.stringify(proposal))
  assert(proposal.ok, 'propose_step failed after a genuine second attempt.')
  await capture('05-learner-owned-proposal')
  state = await clickButton('Use this', 8)
  const derivativeOnlyCheck = await runTool('check_work', {
    expectedRevision: 8,
    requestId: 'final-check-derivative-only',
  })
  assert(
    derivativeOnlyCheck.ok &&
      derivativeOnlyCheck.data.allSound &&
      derivativeOnlyCheck.data.reachesAnswer === false,
    'The derivative-only chain was not distinguished from the requested value at a point.',
  )
  const prematureTransfer = await runTool('new_problem', {
    expectedRevision: 9,
    requestId: 'final-transfer-premature',
  })
  assert(
    !prematureTransfer.ok && prematureTransfer.error.code === 'invalid_phase',
    'new_problem unlocked before the derivative was evaluated at the requested point.',
  )
  state = await addLine(practice.value, 10)
  const repaired = await runTool('check_work', { expectedRevision: 10, requestId: 'final-check-002' })
  assert(repaired.ok && repaired.data.allSound && repaired.data.reachesAnswer, 'The repaired practice round was not complete.')
  await capture('06-practice-complete')

  const next = await runTool('new_problem', { expectedRevision: 11, requestId: 'final-transfer-001' })
  assert(next.ok, 'new_problem did not start after complete, sound practice work.')
  state = await waitForRevision(12)
  await capture('07-fresh-transfer-transition')
  const transfer = {
    premise: state.problem.premiseLatex,
    derivative: state.problem.answer.latex,
    value: String(state.problem.answer.value),
  }
  state = await addLine(transfer.premise, 13)
  state = await addLine(transfer.derivative, 14)
  state = await addLine(transfer.value, 15)
  await capture('08-transfer-attempt')
  const transferCheck = await runTool('check_work', { expectedRevision: 15, requestId: 'final-check-003' })
  assert(transferCheck.ok && transferCheck.data.allSound && transferCheck.data.reachesAnswer, 'The transfer round did not finish sound.')
  await command('Runtime.evaluate', {
    expression: `document.querySelector('.receipt')?.scrollIntoView({ block: 'start', behavior: 'instant' })`,
  })
  await new Promise((resolve) => setTimeout(resolve, 120))
  await capture('09-immediate-transfer-signal')

  const receipt = await runTool('get_receipt')
  assert(receipt.ok && receipt.data.unaidedTransfer.startsWith('every step sound'), 'get_receipt did not report the completed transfer round.')

  const result = {
    chrome: (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`).then((response) => response.json())).Browser,
    url: target.url,
    headerStatus,
    registered: registration,
    practice: { firstBrokenStep: broken.data.firstBrokenStep, repaired: repaired.data },
    derivativeOnly: derivativeOnlyCheck.data,
    prematureTransfer: prematureTransfer.error,
    transfer: transferCheck.data,
    receipt: receipt.data,
    screenshots,
  }
  console.log(JSON.stringify(result, null, 2))
} finally {
  socket.close()
}
