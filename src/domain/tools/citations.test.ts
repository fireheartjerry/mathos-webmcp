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

const NEWLINE = String.fromCharCode(10)
const D = String.fromCharCode(92) + 'd'
const W = String.fromCharCode(92) + 'w'
const DOT = String.fromCharCode(92) + '.'

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
  [SCRATCHPAD, 398, 'ADD_STEP'],
  [SCRATCHPAD, 586, 'EDIT_STEP'],
  [SCRATCHPAD, 723, 'REMOVE_STEP'],
  [SCRATCHPAD, 416, 'RESOLVE_PROPOSAL'],
  [SCRATCHPAD, 792, 'NEW_PROBLEM'],
  // Modules the reads table cites.
  ['src/domain/math/expression.ts', 21, 'computeEngine'],
  ['src/domain/math/expression.ts', 129, 'parseExpression'],
  ['src/domain/math/equivalence.ts', 185, 'compareExpressions'],
  ['src/domain/math/problems.ts', 416, 'FAMILY_IDS'],
  ['src/domain/tools/platform.ts', 358, 'probePlatform'],
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
    // Scans every file in DOCS. An earlier version hardcoded two of the three, so a
    // citation added to platform.md went unchecked - and matched only a range's start,
    // which let `types.ts:121-129` pass while the union actually ends at 130.
    const docs = DOCS.map((d) => readFileSync(d, 'utf8')).join(NEWLINE)

    // Keyed on the file's base name. That is only safe while base names are unique, so
    // that is asserted rather than assumed.
    const base = (full: string) => full.split('/').pop() as string
    const owners = new Map<string, string>()
    for (const file of [...CITATIONS.map(([f]) => f), TOOLS, ...RANGES.map(([f]) => f)]) {
      const existing = owners.get(base(file))
      expect(existing ?? file, `two different files share the base name ${base(file)}`).toBe(file)
      owners.set(base(file), file)
    }

    const RANGE = new RegExp(`([${W}./-]+${DOT}(?:ts|tsx)):(${D}+)-(${D}+)`, 'g')
    const SINGLE = new RegExp(`([${W}./-]+${DOT}(?:ts|tsx)):(${D}+)(?![${D}-])`, 'g')

    const citedRanges = new Set<string>()
    for (const m of docs.matchAll(RANGE)) citedRanges.add(`${base(m[1])}:${m[2]}-${m[3]}`)
    const citedLines = new Set<string>()
    for (const m of docs.matchAll(SINGLE)) citedLines.add(`${base(m[1])}:${m[2]}`)

    const coveredLines = new Set([
      ...CITATIONS.map(([f, n]) => `${base(f)}:${n}`),
      ...TOOL_LINES.map(([, n]) => `${base(TOOLS)}:${n}`),
    ])
    const coveredRanges = new Set(RANGES.map(([f, a, b]) => `${base(f)}:${a}-${b}`))

    const stray = [
      ...[...citedLines].filter((c) => !coveredLines.has(c)),
      ...[...citedRanges].filter((c) => !coveredRanges.has(c)),
    ]
    expect(stray, `citations no test checks: ${stray.join(', ')}`).toEqual([])
  })
})
