const mc = document.modelContext
const tools = await mc.getTools()
const names = tools.map(t => t.name).sort()
const dupes = names.filter((n, i) => names[i - 1] === n)
const header = document.querySelector('.console-status, .agent-status, header')?.textContent?.slice(0, 160) ?? ''
const conflict = document.body.textContent?.includes('another tab') || document.body.textContent?.includes('other tab')
return { count: tools.length, dupes, probeResidue: names.filter(n => n.startsWith('probe_') || n.startsWith('ceil_')), header: header.replace(/\s+/g, ' ').trim(), conflictShown: conflict }
