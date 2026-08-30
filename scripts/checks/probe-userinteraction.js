const mc = document.modelContext
const shapes = {
  onModelContext: typeof mc.requestUserInteraction,
  onNavigator: typeof navigator.requestUserInteraction,
  onWindow: typeof window.requestUserInteraction,
  modelContextKeys: [],
  protoKeys: [],
}
try { shapes.modelContextKeys = Object.keys(mc) } catch {}
try { shapes.protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(mc)) } catch {}
// Does a tool's execute receive anything that could carry a confirmation callback?
let executeArgCount = null
const ac = new AbortController()
const name = `probe_args_${Date.now().toString(36)}`
await mc.registerTool({
  name, title: 'p', description: 'observe what the browser passes to execute',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: function () { executeArgCount = arguments.length; return { ok: true } },
}, { signal: ac.signal })
const tools = await mc.getTools()
const mine = tools.find(t => t.name === name)
try { await mc.executeTool(mine, '{}') } catch (e) { shapes.executeThrew = String(e).slice(0, 120) }
ac.abort()
return { ...shapes, executeArgCount }
