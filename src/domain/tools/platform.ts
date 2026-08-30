/**
 * WebMCP platform coverage.
 *
 * The six tools are the product's capability surface and their count is fixed.
 * Leverage comes from depth instead: exercising the parts of the WebMCP platform
 * that the imperative `registerTool` path never touches, and reporting honestly
 * what this browser actually does with each one.
 *
 * Every entry here is probed by execution, not asserted. `unsupported` is a real
 * and useful result — the point is a truthful map of the platform, not a list of
 * features we claim.
 */

export type FeatureStatus = 'supported' | 'unsupported' | 'partial' | 'untested'

export type PlatformFeature = {
  id: string
  label: string
  status: FeatureStatus
  /** What was actually observed. Shown verbatim in the Agent Console. */
  detail: string
}

type ModelContext = NonNullable<Document['modelContext']>

const UNTESTED = (id: string, label: string): PlatformFeature => ({
  id,
  label,
  status: 'untested',
  detail: 'No WebMCP in this browser, so nothing was probed.',
})

export function untestedPlatform(): PlatformFeature[] {
  return [
    UNTESTED('exposed-to', 'Origin scoping (exposedTo)'),
    UNTESTED('from-origins', 'Cross-origin read (getTools fromOrigins)'),
    UNTESTED('toolchange', 'Live tool-list events (toolchange)'),
    UNTESTED('declarative', 'Declarative tools (form toolname)'),
    UNTESTED('phase', 'Phase-dependent descriptions'),
    UNTESTED('annotations', 'Annotations beyond the two hints'),
  ]
}

/** `exposedTo` scopes a tool to named origins. Registered, then read back. */
async function probeExposedTo(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'exposed-to'
  const label = 'Origin scoping (exposedTo)'
  const name = `__probe_exposed_${Date.now().toString(36)}`
  try {
    await mc.registerTool(
      {
        name,
        title: 'Origin scoping probe',
        description: 'Registered with exposedTo to observe whether the browser honours it.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ ok: true }),
      },
      { exposedTo: [location.origin] },
    )
    // Registering is not the test. The test is whether scoping to a *foreign*
    // origin actually withholds the tool from this one.
    const foreign = `${name}_foreign`
    await mc.registerTool(
      {
        name: foreign,
        title: 'Origin scoping control',
        description: 'Scoped to another origin, to see whether this one is excluded.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ ok: true }),
      },
      { exposedTo: ['https://example.invalid'] },
    )
    const listed = (await mc.getTools?.()) ?? []
    const mine = listed.some((t) => t.name === name)
    const leaked = listed.some((t) => t.name === foreign)
    return {
      id,
      label,
      status: mine && !leaked ? 'supported' : 'partial',
      detail:
        mine && !leaked
          ? 'Accepted, and a tool scoped to another origin was withheld from this one.'
          : 'Accepted without error, but a tool scoped to another origin still appears here, so no filtering was observable.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `registerTool rejected exposedTo: ${String(error).slice(0, 120)}` }
  }
}

async function probeFromOrigins(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'from-origins'
  const label = 'Cross-origin read (getTools fromOrigins)'
  try {
    if (typeof mc.getTools !== 'function') {
      return { id, label, status: 'unsupported', detail: 'getTools is not a function on this modelContext.' }
    }
    const scoped = await mc.getTools({ fromOrigins: [location.origin] })
    const unscoped = await mc.getTools()
    // Asking for a origin that owns nothing should return nothing. If it returns
    // the same list, the argument is accepted but not honoured.
    const foreign = await mc.getTools({ fromOrigins: ['https://example.invalid'] })
    const filters = foreign.length < unscoped.length
    return {
      id,
      label,
      status: filters ? 'supported' : 'partial',
      detail: filters
        ? `Honoured: this origin returned ${scoped.length}, an origin owning nothing returned ${foreign.length}.`
        : `Accepted but not honoured: this origin, no origin, and a foreign origin all returned ${unscoped.length}.`,
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Rejected: ${String(error).slice(0, 120)}` }
  }
}

/**
 * A `toolchange` event should fire when the registered set changes. We attach a
 * listener, cause a change, and report whether it arrived — with a timeout, so an
 * event that never fires is reported as such rather than hanging the console.
 */
async function probeToolChange(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'toolchange'
  const label = 'Live tool-list events (toolchange)'
  const name = `__probe_change_${Date.now().toString(36)}`
  const target = mc as unknown as EventTarget
  if (typeof target.addEventListener !== 'function') {
    return { id, label, status: 'unsupported', detail: 'modelContext is not an EventTarget.' }
  }
  let fired = false
  const onChange = () => {
    fired = true
  }
  target.addEventListener('toolchange', onChange)
  try {
    await mc.registerTool({
      name,
      title: 'Tool-change probe',
      description: 'Registered to observe whether a toolchange event is dispatched.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({ ok: true }),
    })
    await new Promise((resolve) => setTimeout(resolve, 150))
    return {
      id,
      label,
      status: fired ? 'supported' : 'unsupported',
      detail: fired
        ? 'Registering a tool dispatched toolchange on document.modelContext.'
        : 'Listener attached and a tool registered, but no toolchange arrived within 150ms.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  } finally {
    target.removeEventListener('toolchange', onChange)
  }
}

/**
 * The declarative API: a `<form toolname>` in the document becomes a tool without
 * any imperative call. Probed and then removed — the product's tool surface stays
 * at six, so this demonstrates the capability without inflating the count.
 */
async function probeDeclarative(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'declarative'
  const label = 'Declarative tools (form toolname)'
  const name = `__probe_form_${Date.now().toString(36)}`
  const form = document.createElement('form')
  form.setAttribute('toolname', name)
  form.setAttribute('tooldescription', 'Declarative registration probe.')
  form.setAttribute('aria-hidden', 'true')
  form.style.display = 'none'
  const input = document.createElement('input')
  input.name = 'q'
  form.appendChild(input)
  document.body.appendChild(form)
  try {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const listed = (await mc.getTools?.()) ?? []
    const present = listed.some((t) => t.name === name)
    return {
      id,
      label,
      status: present ? 'supported' : 'unsupported',
      detail: present
        ? 'A form carrying a toolname attribute was registered by the browser with no imperative call.'
        : 'A form carrying a toolname attribute did not appear in getTools() in this build.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  } finally {
    form.remove()
  }
}

/**
 * Chrome 151 keeps only `readOnlyHint` and `untrustedContentHint` and silently
 * drops the rest. Documenting that is the point: an annotation we cannot rely on
 * is one we must not describe in the README as carried.
 */
async function probeAnnotations(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'annotations'
  const label = 'Annotations beyond the two hints'
  const name = `__probe_annot_${Date.now().toString(36)}`
  try {
    await mc.registerTool({
      name,
      title: 'Annotation probe',
      description: 'Registered with four annotations to observe which survive.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: false,
        destructiveHint: false,
        idempotentHint: true,
      } as never,
      execute: () => ({ ok: true }),
    })
    const listed = (await mc.getTools?.()) ?? []
    const found = listed.find((t) => t.name === name)
    const keys = found?.annotations ? Object.keys(found.annotations) : []
    const dropped = ['destructiveHint', 'idempotentHint'].filter((k) => !keys.includes(k))
    return {
      id,
      label,
      status: dropped.length === 0 ? 'supported' : 'partial',
      detail:
        keys.length === 0
          ? 'No annotations were readable back from getTools().'
          : `Sent four, kept ${keys.length}: ${keys.join(', ')}.${dropped.length ? ` Dropped: ${dropped.join(', ')}.` : ''}`,
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  }
}

/**
 * Can a tool's description be updated in place, so it can announce that it is
 * closed for a round without being withdrawn?
 *
 * This row previously returned a hard-coded `supported` without executing
 * anything — the only one of the six that asserted rather than probed. An
 * independent check found the opposite: Chrome 151 throws `InvalidStateError:
 * Duplicate tool name`. Asserting an untested capability is precisely the failure
 * this product is built to refuse, so it now probes like the rest.
 */
async function probePhaseDescription(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'phase'
  const label = 'Phase-dependent descriptions'
  const name = `__probe_phase_${Date.now().toString(36)}`
  const base = {
    title: 'Phase probe',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => ({ ok: true }),
  }
  try {
    await mc.registerTool({ name, description: 'First description.', ...base })
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Initial registration failed: ${String(error).slice(0, 100)}` }
  }
  try {
    await mc.registerTool({ name, description: 'Second description.', ...base })
  } catch (error) {
    return {
      id,
      label,
      status: 'unsupported',
      detail: `Re-registering the same name is rejected (${String(error).slice(0, 70)}), and there is no unregister call — so a tool cannot revise what it says about itself.`,
    }
  }
  const listed = (await mc.getTools?.()) ?? []
  const updated = listed.some((t) => t.name === name && t.description === 'Second description.')
  return {
    id,
    label,
    status: updated ? 'supported' : 'partial',
    detail: updated
      ? 'Re-registering a name replaced its description in place, with no unregister.'
      : 'Re-registration was accepted but the description did not change.',
  }
}

export async function probePlatform(): Promise<PlatformFeature[]> {
  const mc = document.modelContext
  if (!mc) return untestedPlatform()
  // Sequential on purpose: several probes read the tool list, and interleaving
  // them would make each one's read depend on another's timing.
  const exposed = await probeExposedTo(mc)
  const origins = await probeFromOrigins(mc)
  const change = await probeToolChange(mc)
  const declarative = await probeDeclarative(mc)
  const phase = await probePhaseDescription(mc)
  const annotations = await probeAnnotations(mc)
  return [exposed, origins, change, declarative, phase, annotations]
}
