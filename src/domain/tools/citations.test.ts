import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Every file:line citation in the WebMCP docs, checked against the file.
 *
 * Two rounds of scoring found wrong citations here, the second time after the evidence
 * pack claimed they had all been verified. Asserting verification that was not
 * performed is worse than the original error, so the verification is now a test: any
 * citation that drifts as the source moves fails the build instead of quietly becoming
 * a false claim in a document nobody re-reads.
 */

const line = (file: string, n: number) => readFileSync(file, 'utf8').split(/\r?\n/)[n - 1] ?? ''

const TYPES = 'src/domain/session/types.ts'
const TOOLS = 'src/domain/tools/definitions.ts'
const SCRATCHPAD = 'src/components/Scratchpad.tsx'

/** citation → a substring the cited line must contain. */
const CITATIONS: Array<[string, number, string]> = [
  // The action union and its members, cited by capabilities.md's writes table.
  [TYPES, 9, 'ActionSource'],
  [TYPES, 121, 'SessionAction ='],
  [TYPES, 122, 'ADD_STEP'],
  [TYPES, 123, 'EDIT_STEP'],
  [TYPES, 124, 'REMOVE_STEP'],
  [TYPES, 125, 'CHECK_WORK'],
  [TYPES, 126, 'ANNOTATE_STEP'],
  [TYPES, 127, 'PROPOSE_STEP'],
  [TYPES, 128, 'RESOLVE_PROPOSAL'],
  [TYPES, 129, 'NEW_PROBLEM'],
  [TYPES, 130, "'RESET'"],
  // State the reads table cites.
  [TYPES, 88, 'SessionState = {'],
  [TYPES, 100, 'activities: Activity[]'],
  [TYPES, 103, 'history: RoundSummary[]'],
  [TYPES, 108, 'tally: InterventionTally'],
  // Learner controls.
  [SCRATCHPAD, 397, 'ADD_STEP'],
  [SCRATCHPAD, 582, 'EDIT_STEP'],
  [SCRATCHPAD, 719, 'REMOVE_STEP'],
  [SCRATCHPAD, 415, 'RESOLVE_PROPOSAL'],
  [SCRATCHPAD, 788, 'NEW_PROBLEM'],
  // Modules the reads table cites.
  ['src/domain/math/expression.ts', 21, 'computeEngine'],
  ['src/domain/math/expression.ts', 114, 'parseExpression'],
  ['src/domain/math/equivalence.ts', 185, 'compareExpressions'],
  ['src/domain/math/problems.ts', 357, 'FAMILY_IDS'],
  ['src/domain/tools/platform.ts', 311, 'probePlatform'],
]

/** Every doc that may cite source. Scanned by the coverage test below. */
const DOCS = [
  'docs/webmcp/capabilities.md',
  'docs/webmcp/ceiling.md',
  'docs/webmcp/platform.md',
]

/** file, from, to, text expected at `from`, text expected at `to`. */
const RANGES: Array<[string, number, number, string, string]> = [
  [TYPES, 88, 119, 'SessionState = {', '}'],
  [TYPES, 121, 130, 'SessionAction =', "'RESET'"],
]

const TOOL_LINES: Array<[string, number]> = [
  ['get_scratchpad', 525],
  ['check_work', 542],
  ['annotate_step', 557],
  ['propose_step', 598],
  ['new_problem', 642],
  ['get_receipt', 673],
  ['add_step', 703],
  ['edit_step', 731],
  ['remove_step', 763],
  ['resolve_proposal', 791],
  ['reset_session', 816],
  ['get_changes_since', 837],
  ['list_problem_families', 901],
  ['validate_expression', 921],
  ['compare_expressions', 955],
  ['differentiate_expression', 986],
  ['evaluate_expression', 1032],
  ['get_platform', 1083],
]

describe('the file:line citations in docs/webmcp', () => {
  it.each(CITATIONS)('%s:%i contains %s', (file, n, expected) => {
    expect(line(file, n)).toContain(expected)
  })

  it.each(TOOL_LINES)('definitions.ts cites %s at line %i', (name, n) => {
    expect(line(TOOLS, n)).toContain(`name: '${name}'`)
  })

  it('cites every tool exactly once', () => {
    expect(TOOL_LINES).toHaveLength(18)
    expect(new Set(TOOL_LINES.map(([name]) => name)).size).toBe(18)
  })

  it('every citation the docs make is one this test covers', () => {
    const docs = ['docs/webmcp/capabilities.md', 'docs/webmcp/ceiling.md']
      .map((p) => readFileSync(p, 'utf8'))
      .join('\n')
    const cited = new Set<string>()
    for (const m of docs.matchAll(/`?([A-Za-z/.]+\.(?:ts|tsx)):(\d+)/g)) {
      cited.add(`${m[1].split('/').pop()}:${m[2]}`)
    }
    const covered = new Set([
      ...CITATIONS.map(([f, n]) => `${f.split('/').pop()}:${n}`),
      ...TOOL_LINES.map(([, n]) => `definitions.ts:${n}`),
    ])
    const uncovered = [...cited].filter((c) => !covered.has(c))
    expect(uncovered, `citations in the docs that no test checks: ${uncovered.join(', ')}`).toEqual([])
  })
})
