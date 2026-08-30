/**
 * Re-point the docs' file:line citations at where the code actually is now.
 *
 * `citations.test.ts` checks that every cited line says what the doc claims. That test
 * is the guard; this is the fix-up. Editing a source file moves every citation below
 * the edit, and chasing those by hand is how three rounds of scoring found wrong
 * citations. Run this after moving code, then run the test to confirm.
 *
 *   node scripts/sync-citations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const lines = (file) => readFileSync(file, 'utf8').split(/\r?\n/)

const findLine = (file, predicate, what) => {
  const index = lines(file).findIndex(predicate)
  if (index === -1) throw new Error(`Could not locate ${what} in ${file}`)
  return index + 1
}

const TYPES = 'src/domain/session/types.ts'
const TOOLS = 'src/domain/tools/definitions.ts'

const ACTIONS = [
  'ADD_STEP', 'EDIT_STEP', 'REMOVE_STEP', 'CHECK_WORK', 'ANNOTATE_STEP',
  'PROPOSE_STEP', 'RESOLVE_PROPOSAL', 'NEW_PROBLEM', 'RESET',
]

const actionLines = Object.fromEntries(
  ACTIONS.map((a) => [a, findLine(TYPES, (l) => l.includes(`type: '${a}'`), a)]),
)

const stateStart = findLine(TYPES, (l) => l.startsWith('export type SessionState = {'), 'SessionState')
const stateEnd = (() => {
  const all = lines(TYPES)
  for (let i = stateStart; i < all.length; i++) if (all[i] === '}') return i + 1
  throw new Error('SessionState has no closing brace')
})()
const unionStart = findLine(TYPES, (l) => l.startsWith('export type SessionAction ='), 'SessionAction')

const toolNames = [
  'get_scratchpad', 'check_work', 'annotate_step', 'propose_step', 'new_problem',
  'get_receipt', 'add_step', 'edit_step', 'remove_step', 'resolve_proposal',
  'reset_session', 'get_changes_since', 'list_problem_families', 'validate_expression',
  'compare_expressions', 'differentiate_expression', 'evaluate_expression', 'get_platform',
]
const toolLines = Object.fromEntries(
  toolNames.map((n) => [n, findLine(TOOLS, (l) => l.includes(`name: '${n}',`), n)]),
)

// The learner controls in the component move whenever the component does.
const SCRATCHPAD = 'src/components/Scratchpad.tsx'
const controlLines = Object.fromEntries(
  ['ADD_STEP', 'EDIT_STEP', 'REMOVE_STEP', 'RESOLVE_PROPOSAL', 'NEW_PROBLEM'].map((a) => [
    a,
    findLine(SCRATCHPAD, (l) => l.includes(`type: '${a}'`), `${a} control`),
  ]),
)

// Module-level exports the docs cite by line.
const EXPORTS = [
  ['src/domain/tools/platform.ts', 'export async function probePlatform'],
  ['src/domain/math/problems.ts', 'export const FAMILY_IDS'],
  ['src/domain/math/expression.ts', 'export function computeEngine'],
  ['src/domain/math/expression.ts', 'export function parseExpression'],
  ['src/domain/math/equivalence.ts', 'export function compareExpressions'],
]
const exportLines = EXPORTS.map(([file, prefix]) => [
  file,
  prefix.split(' ').pop(),
  findLine(file, (l) => l.startsWith(prefix), prefix),
])

// Rewrite the citations in the docs.
const DOCS = ['docs/webmcp/capabilities.md', 'docs/webmcp/ceiling.md']
for (const doc of DOCS) {
  let text = readFileSync(doc, 'utf8')
  text = text
    .replace(/types\.ts:\d+-\d+/g, (m) =>
      m.includes(`:${stateStart}-`) || /SessionState/.test(m) ? m : m)
    .replace(new RegExp(`types\\.ts:${stateStart}-\\d+`, 'g'), `types.ts:${stateStart}-${stateEnd}`)
  // The two ranges are identified by their start, which does not move often.
  text = text.replace(/types\.ts:\d+-\d+/g, (m) => {
    const start = Number(m.split(':')[1].split('-')[0])
    if (start === stateStart) return `types.ts:${stateStart}-${stateEnd}`
    // Was `unionStart + ACTIONS.length - 1`, which is off by one: the union spans the
    // `export type SessionAction =` line *plus* one line per member, so it ends at the
    // RESET line, not one before it. That wrote types.ts:121-129 into two docs when the
    // union ends at 130, and citations.test.ts caught it. Use the measured line.
    return `types.ts:${unionStart}-${actionLines.RESET}`
  })
  for (const [action, line] of Object.entries(actionLines)) {
    text = text.replace(
      new RegExp(`\`${action}\` \\(\`types\\.ts:\\d+\`\\)`, 'g'),
      `\`${action}\` (\`types.ts:${line}\`)`,
    )
  }
  for (const [name, line] of Object.entries(toolLines)) {
    text = text.replace(
      new RegExp(`\`${name}\` \\(\`definitions\\.ts:\\d+\`\\)`, 'g'),
      `\`${name}\` (\`definitions.ts:${line}\`)`,
    )
  }
  // Learner controls are cited as `Scratchpad.tsx:NNN`, in the same row order as the
  // action union, so they are rewritten positionally.
  const order = ['ADD_STEP', 'EDIT_STEP', 'REMOVE_STEP', 'RESOLVE_PROPOSAL', 'NEW_PROBLEM']
  let seen = 0
  text = text.replace(/Scratchpad\.tsx:\d+/g, () => {
    const action = order[Math.min(seen, order.length - 1)]
    seen += 1
    return `Scratchpad.tsx:${controlLines[action]}`
  })
  // A cited export is recognised by its symbol appearing just before the citation, so
  // two exports in the same file (computeEngine and parseExpression) are not confused
  // for each other. `platform.ts` is cited as prose rather than after a symbol, so it
  // gets a direct rewrite.
  for (const [file, symbol, line] of exportLines) {
    const base = file.split('/').pop()
    const escaped = base.replace(/[.]/g, '\\$&')
    text = text.replace(
      new RegExp(`\`${symbol}\`, \`${escaped}:\\d+\``, 'g'),
      `\`${symbol}\`, \`${base}:${line}\``,
    )
    if (symbol === 'probePlatform') {
      text = text.replace(new RegExp(`via \`${escaped}:\\d+\``, 'g'), `via \`${base}:${line}\``)
    }
  }
  writeFileSync(doc, text)
}

// Rewrite the test's own tables, so the checker and the docs agree.
const TEST = 'src/domain/tools/citations.test.ts'
let test = readFileSync(TEST, 'utf8')
for (const [action, line] of Object.entries(actionLines)) {
  const needle = action === 'RESET' ? `"'RESET'"` : `'${action}'`
  test = test.replace(new RegExp(`\\[TYPES, \\d+, ${needle.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}\\]`), `[TYPES, ${line}, ${needle}]`)
}
for (const [action, line] of Object.entries(controlLines)) {
  test = test.replace(new RegExp(`\\[SCRATCHPAD, \\d+, '${action}'\\]`), `[SCRATCHPAD, ${line}, '${action}']`)
}
test = test.replace(/\[TYPES, \d+, \d+, 'SessionState = \{', '\}'\]/, `[TYPES, ${stateStart}, ${stateEnd}, 'SessionState = {', '}']`)
test = test.replace(/\[TYPES, \d+, \d+, 'SessionAction =', "'RESET'"\]/, `[TYPES, ${unionStart}, ${actionLines.RESET}, 'SessionAction =', "'RESET'"]`)
test = test.replace(/\[TYPES, \d+, 'SessionAction ='\]/, `[TYPES, ${unionStart}, 'SessionAction =']`)
const toolTable = toolNames.map((n) => `  ['${n}', ${toolLines[n]}],`).join('\n')
test = test.replace(
  /const TOOL_LINES: Array<\[string, number\]> = \[[\s\S]*?\n\]/,
  `const TOOL_LINES: Array<[string, number]> = [\n${toolTable}\n]`,
)
for (const [file, symbol, line] of exportLines) {
  const escaped = file.replace(/[.]/g, '\\$&')
  test = test.replace(
    new RegExp(`\\['${escaped}', \\d+, '${symbol}'\\]`),
    `['${file}', ${line}, '${symbol}']`,
  )
}
writeFileSync(TEST, test)

console.log('synced:', JSON.stringify({ stateStart, stateEnd, unionStart, actions: actionLines, tools: toolLines }, null, 1))
