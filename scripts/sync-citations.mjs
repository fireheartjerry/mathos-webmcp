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
    return `types.ts:${unionStart}-${unionStart + ACTIONS.length - 1}`
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
  writeFileSync(doc, text)
}

// Rewrite the test's own tables, so the checker and the docs agree.
const TEST = 'src/domain/tools/citations.test.ts'
let test = readFileSync(TEST, 'utf8')
for (const [action, line] of Object.entries(actionLines)) {
  const needle = action === 'RESET' ? `"'RESET'"` : `'${action}'`
  test = test.replace(new RegExp(`\\[TYPES, \\d+, ${needle.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}\\]`), `[TYPES, ${line}, ${needle}]`)
}
test = test.replace(/\[TYPES, \d+, \d+, 'SessionState = \{', '\}'\]/, `[TYPES, ${stateStart}, ${stateEnd}, 'SessionState = {', '}']`)
test = test.replace(/\[TYPES, \d+, \d+, 'SessionAction =', "'RESET'"\]/, `[TYPES, ${unionStart}, ${actionLines.RESET}, 'SessionAction =', "'RESET'"]`)
test = test.replace(/\[TYPES, \d+, 'SessionAction ='\]/, `[TYPES, ${unionStart}, 'SessionAction =']`)
const toolTable = toolNames.map((n) => `  ['${n}', ${toolLines[n]}],`).join('\n')
test = test.replace(
  /const TOOL_LINES: Array<\[string, number\]> = \[[\s\S]*?\n\]/,
  `const TOOL_LINES: Array<[string, number]> = [\n${toolTable}\n]`,
)
writeFileSync(TEST, test)

console.log('synced:', JSON.stringify({ stateStart, stateEnd, unionStart, actions: actionLines, tools: toolLines }, null, 1))
