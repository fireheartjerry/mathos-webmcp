/**
 * The beats of the demo, as page-side functions.
 *
 * Injected by `scripts/record-demo.mjs` before recording starts. Everything here drives
 * the product through its real tools — nothing is faked for the camera, which is the
 * point: the video has to show the thing working, not a reconstruction of it.
 */
const BS = String.fromCharCode(92)
const mc = document.modelContext
let seq = 0
const rid = () => `demo_${Date.now().toString(36)}_${(seq++).toString(36)}`

const call = async (name, args) => {
  const tools = await mc.getTools()
  const by = Object.fromEntries(tools.map((t) => [t.name, t]))
  const raw = await mc.executeTool(by[name], JSON.stringify(args))
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
const read = async () => (await call('get_scratchpad', {})).data
const rev = async () => (await read()).revision

window.__demo = {
  /** A derivation whose last line drops a term, already checked, so the mark is visible. */
  async setup() {
    await call('reset_session', { expectedRevision: await rev(), requestId: rid() })
    const s = await read()
    const defs = Object.fromEntries(s.problem.given.map((g) => {
      const at = g.indexOf(' = ')
      return [g.slice(0, at).trim(), g.slice(at + 3).trim()]
    }))
    const sub = (body, name, latex) =>
      body.replace(new RegExp(`(^|[^A-Za-z])${name}(?![A-Za-z])`, 'g'), `$1(${latex})`)
    const y = Object.entries(defs).filter(([k]) => k !== 'y').reduce((b, [k, v]) => sub(b, k, v), defs.y)
    const d = (await call('differentiate_expression', { latex: y })).data.simplified
    window.__demo._full = d
    await call('add_step', { latex: `y = ${y}`, expectedRevision: await rev(), requestId: rid() })
    await call('add_step', { latex: `${BS}frac{dy}{dx} = ${d}`, expectedRevision: await rev(), requestId: rid() })
    const dropped = d.replace(/\s*\+\s*[^+]+$/, '')
    await call('add_step', { latex: `${BS}frac{dy}{dx} = ${dropped}`, expectedRevision: await rev(), requestId: rid() })
    const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
    window.scrollTo({ top: 0 })
    return { marked: checked.data.firstBrokenStep ?? checked.data.firstUnresolvedStep }
  },

  async showConsole() {
    document.querySelector('.agent-console')?.scrollIntoView({ block: 'start' })
    return true
  },

  async openGroup(label) {
    const head = [...document.querySelectorAll('.console-group-head')]
      .find((b) => (b.textContent || '').includes(label))
    head?.click()
    head?.scrollIntoView({ block: 'center' })
    return Boolean(head)
  },

  /** The agent rewrites the line it broke, and the page re-checks. */
  async repair() {
    const s = await read()
    const last = s.steps[s.steps.length - 1]
    document.querySelector('.work')?.scrollIntoView({ block: 'start' })
    await call('edit_step', {
      stepId: last.id,
      latex: `${BS}frac{dy}{dx} = ${window.__demo._full}`,
      expectedRevision: await rev(),
      requestId: rid(),
    })
    const checked = await call('check_work', { expectedRevision: await rev(), requestId: rid() })
    return { allSound: checked.data.allSound, reaches: checked.data.reachesAnswer }
  },

  async probe() {
    const button = [...document.querySelectorAll('button')]
      .find((b) => /probe this browser/i.test(b.textContent || ''))
    button?.click()
    await new Promise((r) => setTimeout(r, 2400))
    document.querySelector('.console-platform')?.scrollIntoView({ block: 'start' })
    return document.querySelectorAll('.console-platform li').length
  },
}
return 'driver ready'
