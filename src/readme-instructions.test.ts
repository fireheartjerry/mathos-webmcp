import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The README tells a judge, in order, which controls to press. This asserts those
 * controls exist.
 *
 * It is the general form of a bug this repository shipped twice. The README named a
 * badge — "not equivalent" — that the page has never rendered; it renders "Does not
 * follow". `proofPresentation.test.ts` pins the nine verdict labels. But labels were only
 * the instance. The class is: **the README quotes the product, and nothing checked the
 * quotations**, so a rename anywhere in the interface silently turned the judge-facing
 * walkthrough into instructions for a different program.
 *
 * A judge who cannot find "Check my work" does not conclude that the README is stale.
 * They conclude the demo does not work.
 */

function sourceFiles(base: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path)) out.push(path)
    }
  }
  walk(base)
  return out
}

/** Whitespace-collapsed, so a phrase wrapped across two lines still matches. */
const collapse = (text: string) => text.replace(/\s+/g, ' ')

const SOURCE = collapse(
  [...sourceFiles('src'), ...sourceFiles('app')]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n'),
)
const README = collapse(readFileSync('README.md', 'utf8'))

/**
 * Every control the README instructs a judge to press, in the order it names them.
 * A string here must be renderable by the product and quoted by the README.
 */
const CONTROLS = [
  'Add line',
  'Check my work',
  'Try a fresh problem, unaided',
  'Probe this browser',
  'Run locally',
  'Agent Console',
]

/** Vocabulary the README attributes to the product rather than to itself. */
const PRODUCT_TERMS = ['refused_policy', 'local-inspector', 'stale_revision']

describe('the walkthrough a judge is told to follow', () => {
  it.each(CONTROLS)('the product can render %s', (control) => {
    expect(SOURCE).toContain(control)
  })

  it.each(CONTROLS)('the README still names %s', (control) => {
    expect(README).toContain(control)
  })

  it.each(PRODUCT_TERMS)('%s is a real string in the product, not a paraphrase', (term) => {
    expect(SOURCE).toContain(term)
    expect(README).toContain(term)
  })

  it('names the four problem families the generator actually builds', () => {
    const problems = readFileSync('src/domain/math/problems.ts', 'utf8')
    for (const family of ['shared-path', 'nested-power', 'quotient', 'trig-chain']) {
      expect(problems).toContain(family)
    }
    // The README describes them by rule rather than by id, which is the right thing to
    // do for a reader — so the count is what is checked here, not the ids.
    expect(README).toContain('four generated families')
  })
})
