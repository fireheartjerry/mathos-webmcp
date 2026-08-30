import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createTools } from './definitions'
import type { ToolBridge } from './definitions'
import { createSession } from '../session/reducer'

/**
 * The README quotes one tool in full — the challenge rules ask the repository to
 * document a registered tool's name, description, inputSchema and execute function, and
 * a quotation is the clearest way to do it. A quotation is also the easiest thing in the
 * repository to leave behind when the source moves.
 *
 * `citations.test.ts` guards the file:line references in `docs/`. This guards the copied
 * text in the README, on the same principle: the claim that the snippet matches the code
 * is checked rather than asserted.
 */

const README = readFileSync('README.md', 'utf8')

const bridge: ToolBridge = {
  getState: () => createSession(2026, 'session-readme'),
  run: async () => ({ ok: false, error: 'unused' }) as never,
  requestCache: new Map(),
  onToolSuccess: () => {},
  probePlatform: async () => [],
}

const ADD_STEP = createTools(bridge).find((tool) => tool.name === 'add_step')!

/**
 * The README wraps long strings across lines, so compare on collapsed whitespace — and
 * splice the `' + '` concatenations back together, since a description broken across
 * source lines for width is still the same string.
 */
const flat = (text: string) => text.replace(/\s+/g, ' ').trim()
const FLAT_README = flat(README).replace(/' \+ '/g, '')

describe('the tool the README quotes', () => {
  it('quotes the real description, not a paraphrase of it', () => {
    expect(FLAT_README).toContain(flat(ADD_STEP.description))
  })

  it('quotes the real title and name', () => {
    expect(FLAT_README).toContain(`name: 'add_step'`)
    expect(FLAT_README).toContain(`title: '${ADD_STEP.title}'`)
  })

  it('quotes the real parameter description', () => {
    const properties = ADD_STEP.inputSchema.properties as Record<string, { description?: string }>
    expect(FLAT_README).toContain(flat(properties.latex.description as string))
  })

  it('quotes the real required list and bounds', () => {
    const schema = ADD_STEP.inputSchema as {
      required: string[]
      additionalProperties: boolean
      properties: Record<string, { maxLength?: number }>
    }
    expect(schema.required).toEqual(['latex', 'expectedRevision', 'requestId'])
    expect(FLAT_README).toContain(`required: ['latex', 'expectedRevision', 'requestId']`)
    expect(schema.additionalProperties).toBe(false)
    expect(FLAT_README).toContain('additionalProperties: false')
    expect(FLAT_README).toContain(`maxLength: ${schema.properties.latex.maxLength}`)
  })

  it('quotes the real annotations', () => {
    expect(ADD_STEP.annotations).toEqual({ readOnlyHint: false, untrustedContentHint: false })
    expect(FLAT_README).toContain('annotations: { readOnlyHint: false, untrustedContentHint: false }')
  })

  it('quotes a registerTool call carrying every field the registry actually passes', () => {
    const registry = readFileSync('src/domain/tools/registry.ts', 'utf8')
    // Whatever the registry hands the browser, the README's snippet must hand it too.
    const call = /registerTool\(\{([\s\S]*?)\n {6}\}\)/.exec(registry)
    expect(call, 'registerTool call not found in registry.ts').not.toBeNull()
    const keys = [...(call as RegExpExecArray)[1].matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1])
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(FLAT_README, `README's registerTool snippet omits ${key}`).toContain(`${key}: `)
    }
  })
})
