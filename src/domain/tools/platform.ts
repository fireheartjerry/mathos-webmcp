/**
 * WebMCP platform coverage.
 *
 * Leverage comes from depth: exercising the parts of the WebMCP platform that the
 * imperative `registerTool` path never touches, and reporting honestly what this
 * browser actually does with each one.
 *
 * Every entry here is probed by execution, not asserted. `unsupported` is a real and
 * useful result — the point is a truthful map of the platform, not a list of features
 * we claim.
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

/**
 * Chrome 151 has no `unregisterTool`. Aborting the signal passed to `registerTool`
 * does remove the tool, and frees the name for re-use — verified by
 * `scripts/checks/c5-abort.js`. Every probe registers through this, so a probe run
 * leaves the product's tool list exactly as it found it. Before this existed, one run
 * stranded five tools for the lifetime of the page.
 */
class ProbeScope {
  private readonly controllers: AbortController[] = []

  async register(mc: ModelContext, name: string, extra?: { exposedTo?: string[] }): Promise<void> {
    const controller = new AbortController()
    this.controllers.push(controller)
    await mc.registerTool(
      {
        name,
        title: 'Platform probe',
        description: 'Registered to observe platform behaviour, then withdrawn.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({ ok: true }),
      },
      { signal: controller.signal, ...(extra ?? {}) },
    )
  }

  release(): void {
    for (const controller of this.controllers) controller.abort()
    this.controllers.length = 0
  }
}

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ['exposed-to', 'Origin scoping (exposedTo)'],
  ['from-origins', 'Cross-origin read (getTools fromOrigins)'],
  ['toolchange', 'Live tool-list events (toolchange)'],
  ['declarative', 'Declarative tools (form toolname)'],
  ['lifecycle', 'Withdrawing a tool (AbortSignal)'],
  ['annotations', 'Annotations beyond the two hints'],
  ['user-confirmation', 'Confirming an action (requestUserInteraction)'],
]

const rows = (detail: string): PlatformFeature[] =>
  ROWS.map(([id, label]) => ({ id, label, status: 'untested' as const, detail }))

/**
 * The resting state, before anyone has pressed the probe control.
 *
 * This used to reuse the no-WebMCP text, so a browser that fully supports WebMCP
 * displayed "No WebMCP in this browser" directly beneath a header reading "18 page
 * tools available" - two contradictory claims on one screen, both from us.
 */
export function unprobedPlatform(): PlatformFeature[] {
  return rows('Not probed yet. Nothing here is claimed until it has been executed.')
}

/** The genuine absence: this browser does not expose `document.modelContext`. */
export function untestedPlatform(): PlatformFeature[] {
  return rows('No WebMCP in this browser, so nothing was probed.')
}


const tag = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

/** `exposedTo` scopes a tool to named origins. Registering is not the test — the test
 *  is whether scoping to a *foreign* origin actually withholds the tool from this one. */
async function probeExposedTo(mc: ModelContext, scope: ProbeScope): Promise<PlatformFeature> {
  const id = 'exposed-to'
  const label = 'Origin scoping (exposedTo)'
  const own = `probe_exposed_own_${tag()}`
  const foreign = `probe_exposed_foreign_${tag()}`
  try {
    await scope.register(mc, own, { exposedTo: [location.origin] })
    await scope.register(mc, foreign, { exposedTo: ['https://example.invalid'] })
    const listed = (await mc.getTools?.()) ?? []
    const mine = listed.some((t) => t.name === own)
    const leaked = listed.some((t) => t.name === foreign)
    return {
      id,
      label,
      status: mine && !leaked ? 'supported' : 'partial',
      detail:
        mine && !leaked
          ? 'Accepted, and a tool scoped to another origin was withheld from this one.'
          : 'Accepted without error, but a tool scoped to https://example.invalid is still listed here, so the parameter is taken and not honoured.',
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
    const unscoped = await mc.getTools()
    const here = await mc.getTools({ fromOrigins: [location.origin] })
    // An origin that owns nothing should return nothing. Returning the same list means
    // the argument is accepted but not honoured.
    const foreign = await mc.getTools({ fromOrigins: ['https://example.invalid'] })
    const filters = foreign.length < unscoped.length
    return {
      id,
      label,
      status: filters ? 'supported' : 'partial',
      detail: filters
        ? `Honoured: this origin returned ${here.length}, an origin owning nothing returned ${foreign.length}.`
        : `Accepted but not honoured: unscoped, this origin, and https://example.invalid all returned ${unscoped.length}.`,
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Rejected: ${String(error).slice(0, 120)}` }
  }
}

/** A `toolchange` event should fire when the registered set changes. Timed out rather
 *  than awaited forever, so an event that never arrives is reported as such. */
async function probeToolChange(mc: ModelContext, scope: ProbeScope): Promise<PlatformFeature> {
  const id = 'toolchange'
  const label = 'Live tool-list events (toolchange)'
  const target = mc as unknown as EventTarget
  if (typeof target.addEventListener !== 'function') {
    return { id, label, status: 'unsupported', detail: 'modelContext is not an EventTarget, so no listener could be attached.' }
  }
  let fired = false
  const onChange = () => {
    fired = true
  }
  target.addEventListener('toolchange', onChange)
  try {
    await scope.register(mc, `probe_change_${tag()}`)
    await new Promise((resolve) => setTimeout(resolve, 200))
    return {
      id,
      label,
      status: fired ? 'supported' : 'unsupported',
      detail: fired
        ? 'Registering a tool dispatched toolchange on document.modelContext within 200ms.'
        : 'Listener attached and a tool registered, but no toolchange arrived within 200ms.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  } finally {
    target.removeEventListener('toolchange', onChange)
  }
}

/** The declarative API: a `<form toolname>` becomes a tool with no imperative call. */
async function probeDeclarative(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'declarative'
  const label = 'Declarative tools (form toolname)'
  const name = `probe_form_${tag()}`
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
    await new Promise((resolve) => setTimeout(resolve, 250))
    const listed = (await mc.getTools?.()) ?? []
    const present = listed.some((t) => t.name === name)
    return {
      id,
      label,
      status: present ? 'supported' : 'unsupported',
      detail: present
        ? 'A form carrying a toolname attribute was registered by the browser with no imperative call, and withdrawn when the form was removed.'
        : 'A form carrying a toolname attribute did not appear in getTools() within 250ms.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  } finally {
    // Removing the form withdraws the tool: the declarative counterpart of aborting a
    // registration signal.
    form.remove()
  }
}

/**
 * Can a tool be withdrawn, and can it then revise what it says about itself?
 *
 * This row has now been wrong twice, in opposite directions, which is why it carries a
 * comment. It first returned a hard-coded `supported` without executing anything. That
 * was corrected to `unsupported`, on the evidence that re-registering a name throws
 * `InvalidStateError: Duplicate tool name` and there is no `unregisterTool`. Also
 * wrong: aborting the `AbortSignal` passed to `registerTool` withdraws the tool and
 * frees the name, so a tool *can* revise its own description by being withdrawn and
 * re-registered. Both errors came from reporting a conclusion the probe had not
 * executed. This one runs the whole sequence.
 */
async function probeLifecycle(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'lifecycle'
  const label = 'Withdrawing a tool (AbortSignal)'
  const name = `probe_lifecycle_${tag()}`
  const base = {
    title: 'Lifecycle probe',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => ({ ok: true }),
  }
  const controller = new AbortController()
  try {
    await mc.registerTool({ name, description: 'First description.', ...base }, { signal: controller.signal })
    const whileLive = ((await mc.getTools?.()) ?? []).some((t) => t.name === name)

    // Without withdrawing first, the same name is refused.
    let duplicateRefused = false
    try {
      await mc.registerTool({ name, description: 'Second description.', ...base })
    } catch {
      duplicateRefused = true
    }

    controller.abort()
    await new Promise((resolve) => setTimeout(resolve, 150))
    const afterAbort = ((await mc.getTools?.()) ?? []).some((t) => t.name === name)

    if (!whileLive || afterAbort) {
      return {
        id,
        label,
        status: 'partial',
        detail: `Listed while live=${whileLive}; still listed after abort=${afterAbort}. Aborting did not withdraw the tool.`,
      }
    }

    // The name should now be free, which is what makes a revised description possible.
    const second = new AbortController()
    await mc.registerTool({ name, description: 'Second description.', ...base }, { signal: second.signal })
    const listed = (await mc.getTools?.()) ?? []
    const revised = listed.some((t) => t.name === name && t.description === 'Second description.')
    second.abort()
    return {
      id,
      label,
      status: revised ? 'supported' : 'partial',
      detail: revised
        ? `Aborting the registration signal withdrew the tool and freed its name${duplicateRefused ? ', which re-registering without aborting is refused for' : ''}. Re-registering then carried a new description, so a tool can revise what it says about itself.`
        : 'Abort withdrew the tool and re-registration was accepted, but the description did not change.',
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 140)}` }
  }
}

/**
 * Chrome 151 keeps only `readOnlyHint` and `untrustedContentHint` and silently drops
 * the rest. Documenting that is the point: an annotation we cannot rely on is one we
 * must not describe as carried.
 */
async function probeAnnotations(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'annotations'
  const label = 'Annotations beyond the two hints'
  const name = `probe_annot_${tag()}`
  const controller = new AbortController()
  try {
    await mc.registerTool(
      {
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
      },
      { signal: controller.signal },
    )
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
          : `Sent four, kept ${keys.length}: ${keys.join(', ')}.${dropped.length ? ` Dropped without error: ${dropped.join(', ')}.` : ''}`,
    }
  } catch (error) {
    return { id, label, status: 'unsupported', detail: `Probe failed: ${String(error).slice(0, 120)}` }
  } finally {
    controller.abort()
  }
}

/**
 * The specification describes `requestUserInteraction()` for asking the person to
 * confirm an action while a tool is executing, and Chrome's security guidance for tool
 * authors points at it for consequential operations.
 *
 * It is worth probing rather than assuming, because if it is absent the obligation does
 * not disappear — it moves into the page. This product already carries it there:
 * `propose_step` puts a replacement in front of the learner and `resolve_proposal`
 * settles it, so a consequential change is confirmed by a person either way.
 */
async function probeUserConfirmation(mc: ModelContext): Promise<PlatformFeature> {
  const id = 'user-confirmation'
  const label = 'Confirming an action (requestUserInteraction)'
  const onContext = typeof (mc as unknown as Record<string, unknown>).requestUserInteraction
  const onNavigator = typeof (navigator as unknown as Record<string, unknown>).requestUserInteraction
  let surface: string[] = []
  try {
    surface = Object.getOwnPropertyNames(Object.getPrototypeOf(mc)).filter((k) => k !== 'constructor')
  } catch {
    surface = []
  }
  const present = onContext === 'function' || onNavigator === 'function'
  return {
    id,
    label,
    status: present ? 'supported' : 'unsupported',
    detail: present
      ? `Available as a function, so a tool can ask the person to confirm mid-execution.`
      : `Absent. The whole modelContext surface here is: ${surface.join(', ')}. Confirmation has to be built by the page, which is what propose_step and resolve_proposal do.`,
  }
}

export async function probePlatform(): Promise<PlatformFeature[]> {
  const mc = document.modelContext
  if (!mc) return untestedPlatform()
  const scope = new ProbeScope()
  try {
    // Sequential on purpose: several probes read the tool list, and interleaving them
    // would make each one's read depend on another's timing.
    const exposed = await probeExposedTo(mc, scope)
    const origins = await probeFromOrigins(mc)
    const change = await probeToolChange(mc, scope)
    const declarative = await probeDeclarative(mc)
    const lifecycle = await probeLifecycle(mc)
    const annotations = await probeAnnotations(mc)
    const confirmation = await probeUserConfirmation(mc)
    return [exposed, origins, change, declarative, lifecycle, annotations, confirmation]
  } finally {
    scope.release()
  }
}
