/**
 * Mechanical audit of the Devpost copy against the rubric's binary rules.
 *
 * Only the fenced copy blocks count. Everything outside them is scaffolding for
 * whoever pastes the fields in, not submitted text, and the scorer has read it
 * that way in both prior rounds.
 *
 * This checks the rules a machine can settle: em dashes, banned words, cliches,
 * sentence length, hedge words, and the per-paragraph stative-verb share that
 * mandated a zero for sentence_mechanics twice running. Judgment stays with the
 * independent scorer.
 *
 *   node scripts/devpost/check-copy.mjs
 */
import { readFileSync } from 'node:fs'

const FILE = 'docs/devpost/SUBMISSION_COPY.md'
const raw = readFileSync(FILE, 'utf8')

/** Every fenced block, which is exactly the text that gets pasted into Devpost. */
const blocks = [...raw.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1])
const copy = blocks.join('\n\n')
/** The story field alone, which is what sentence_mechanics scores. */
const story = blocks.find((b) => b.includes('## Inspiration')) ?? ''

const BANNED = ['leverage', 'seamless', 'robust', 'delve', 'unlock', 'empower', 'game-changing', 'revolutionize', 'cutting-edge', "in today's world", "it's worth noting"]
const CLICHE = ['passionate about', 'we wanted to solve', 'changing the way', 'next generation', 'at the intersection of', 'democratize', 'for everyone', 'the future of', 'powerful tool', 'take it to the next level', 'excited to', 'we believe', 'imagine a world']
const HEDGE = ['very', 'really', 'actually', 'basically', 'simply', 'just', 'quite', 'somewhat', 'kind of', 'sort of', 'essentially', 'in order to', 'the fact that']
const ADJECTIVES = ['powerful', 'revolutionary', 'amazing', 'incredible', 'game-changing', 'transformative', 'seamless', 'robust', 'cutting-edge', 'groundbreaking', 'epic', 'unprecedented', 'stunning', 'extraordinary', 'remarkable', 'next-level', 'world-class', 'mind-blowing', 'jaw-dropping', 'sophisticated', 'dynamic', 'intelligent', 'smart', 'advanced', 'rich']
/** 'to be' forms and the existential, which are what the rubric calls stative. */
const STATIVE = /\b(is|are|was|were|be|been|being|am|there is|there are)\b/gi

const hits = (list, text) => list.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))

const fail = []
const pass = []

// --- Gates -----------------------------------------------------------------
const emDash = (copy.match(/—/g) ?? []).length + (copy.match(/ -- /g) ?? []).length
;(emDash === 0 ? pass : fail).push(`em_dash_gate: ${emDash} hits`)

const banned = hits(BANNED, copy)
;(banned.length === 0 ? pass : fail).push(`banned_word_gate: ${banned.join(', ') || 'clean'}`)

const cliche = hits(CLICHE, copy)
;(cliche.length === 0 ? pass : fail).push(`cliche_absence: ${cliche.join(', ') || 'clean'}`)

const adjectives = hits(ADJECTIVES, copy)
;(adjectives.length === 0 ? pass : fail).push(`evaluative_adjectives: ${adjectives.join(', ') || 'clean'}`)

// Strip markdown so bold markers and backticks do not count as words.
const plain = (text) => text.replace(/`[^`]*`/g, (m) => m.slice(1, -1)).replace(/\*\*/g, '').replace(/^[-#]\s*/gm, '')
const sentences = plain(story).split(/(?<=[.!?])\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 1)
const words = (s) => s.split(/\s+/).filter(Boolean).length
const long = sentences.filter((s) => words(s) > 30)
;(long.length === 0 ? pass : fail).push(`long_sentence_gate: ${long.length} over 30 words`)

const under20 = sentences.filter((s) => words(s) <= 20).length
const share = (100 * under20) / sentences.length
;(share >= 90 ? pass : fail).push(`sentences <=20 words: ${share.toFixed(1)}% (${under20}/${sentences.length}), need 90%`)

const hedge = HEDGE.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(plain(story)))
;(hedge.length === 0 ? pass : fail).push(`hedge_words: ${hedge.join(', ') || 'clean'}`)

const tbd = (copy.match(/\bTBD\b/g) ?? []).length
;(tbd === 0 ? pass : fail).push(`tbd_field_gate: ${tbd} placeholder(s)`)

// --- Per-paragraph stative share -------------------------------------------
// A paragraph over roughly 30% stative finite verbs mandates 0/16 on
// sentence_mechanics, so every paragraph gets audited, not sampled.
// Headings are dropped before the markdown strip, otherwise "Accomplishments
// that we are proud of" reads as a one-verb stative paragraph.
const paragraphs = story.split(/\n\s*\n/).filter((p) => !/^\s*#/.test(p)).map((p) => plain(p).replace(/\s+/g, ' ').trim()).filter(Boolean)
const hot = []
for (const para of paragraphs) {
  const statives = (para.match(STATIVE) ?? []).length
  // Approximate the finite-verb count by word count / typical clause length is
  // unreliable, so report the raw stative count instead and flag any paragraph
  // carrying two or more. Two statives in a short paragraph is what tripped the
  // last two rounds.
  if (statives >= 2 || (statives === 1 && words(para) < 25)) hot.push({ statives, para: para.slice(0, 110) })
}
;(hot.length === 0 ? pass : fail).push(`stative-heavy paragraphs: ${hot.length}`)

// --- Section pull ----------------------------------------------------------
const sections = [...story.matchAll(/^## (.+)$/gm)].map((m, i, all) => {
  const start = m.index + m[0].length
  const end = i + 1 < all.length ? all[i + 1].index : story.length
  const body = story.slice(start, end).replace(/\s+/g, ' ').trim()
  const last = body.split(/(?<=[.!?])\s+/).filter(Boolean).at(-1) ?? ''
  return { name: m[1], last }
})

console.log(`\n=== ${FILE} ===`)
console.log(`\nPASS (${pass.length})`)
for (const p of pass) console.log(`  ok   ${p}`)
console.log(`\nFAIL (${fail.length})`)
for (const f of fail) console.log(`  FAIL ${f}`)
if (hot.length) {
  console.log('\nStative-heavy paragraphs to rewrite:')
  for (const h of hot) console.log(`  [${h.statives}] ${h.para}`)
}
if (long.length) {
  console.log('\nSentences over 30 words:')
  for (const s of long) console.log(`  [${words(s)}w] ${s}`)
}
console.log('\nSection-ending sentences (judge PULL vs CLOSED by hand):')
for (const s of sections) console.log(`  ${s.name.padEnd(34)} ${s.last}`)
console.log(`\nlongest sentence: ${Math.max(...sentences.map(words))} words · sentences: ${sentences.length} · paragraphs: ${paragraphs.length}`)
process.exit(fail.length ? 1 : 0)
