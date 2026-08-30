const mc = document.modelContext
const out = { storageKeys: Object.keys(localStorage) }
const tools = mc ? await mc.getTools() : []
out.tools = tools.length
out.header = document.body.textContent?.match(/\d+ page tools available|WebMCP unavailable/)?.[0] ?? null
out.kicker = document.querySelector('.kicker')?.textContent?.trim()
out.h1 = document.querySelector('h1')?.textContent?.trim().slice(0, 60)
const composer = document.querySelector('.composer input')
out.composerPresent = Boolean(composer)
out.composerEnabled = Boolean(composer) && !composer.disabled
out.stepCount = document.querySelectorAll('.step').length
// The first problem must be the deterministic one, so the README's instructions hold.
const by = Object.fromEntries(tools.map(t => [t.name, t]))
if (by.get_scratchpad) {
  const raw = await mc.executeTool(by.get_scratchpad, '{}')
  const d = (typeof raw === 'string' ? JSON.parse(raw) : raw).data
  out.problem = d.problem.given
  out.round = d.round
  out.revision = d.revision
  out.available = d.availableActions
}
out.consoleGroups = [...document.querySelectorAll('.console-group-head')].map(b => b.querySelector('.console-group-count')?.textContent)
return out
