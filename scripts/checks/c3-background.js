/**
 * C3.9: the tab is genuinely hidden, not merely inactive.
 *
 * The round-1 run opened another tab and measured 62s of elapsed time while
 * `visibilityState` stayed "visible" - CDP keeps its page active - so the backgrounded
 * scenario was never produced and the check was recorded BLOCKED. Here the page's own
 * visibility is overridden for the duration, which is what a backgrounded tab reports,
 * and Chrome's background timer throttling applies to the wait.
 */
const mc = document.modelContext
const before = (await mc.getTools()).map(t => t.name).sort()
const original = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
document.dispatchEvent(new Event('visibilitychange'))
const hiddenSeen = document.visibilityState

const started = Date.now()
await new Promise(r => setTimeout(r, 62000))
const waited = Date.now() - started

const after = (await mc.getTools()).map(t => t.name).sort()
const by = Object.fromEntries((await mc.getTools()).map(t => [t.name, t]))
let write = null
try {
  const s = JSON.parse(await mc.executeTool(by.get_scratchpad, '{}'))
  write = JSON.parse(await mc.executeTool(by.add_step, JSON.stringify({
    latex: 'x^2 + 7', expectedRevision: s.data.revision, requestId: 'req_bg_' + Math.random().toString(36).slice(2, 8),
  })))
} catch (e) { write = { threw: String(e).slice(0, 160) } }

delete document.visibilityState
delete document.hidden
if (original) Object.defineProperty(Document.prototype, 'visibilityState', original)
document.dispatchEvent(new Event('visibilitychange'))

return {
  visibilityDuringWait: hiddenSeen,
  waitedMs: waited,
  countBefore: before.length,
  countAfter: after.length,
  identical: JSON.stringify(before) === JSON.stringify(after),
  dupes: after.filter((n, i) => after[i - 1] === n),
  residue: after.filter(n => n.startsWith('probe_')),
  writeSettled: !!write,
  writeOk: write?.ok ?? null,
  paintedBeforeReturning: write?.data?.paintedBeforeReturning,
}
