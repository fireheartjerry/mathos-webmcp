// Prototype: generated problems + structural misconception detection.
//
// The idea that replaces `attempt === '36'`:
//   A problem family declares its correct derivation AND a set of named error modes,
//   each expressed as a DIFFERENT DERIVATION - not a different literal. The engine
//   computes what each error mode would produce for THIS problem's random
//   coefficients. A learner's answer is then matched structurally against them.
//
// Consequence: the diagnosis survives problem generation. Change the coefficients and
// every predicted wrong answer changes with them. Nothing is hardcoded.

import { ComputeEngine } from '@cortex-js/compute-engine'
const ce = new ComputeEngine()

const d = (f, v = 'x') => ce.box(['D', f, v]).evaluate()
const at = (f, v) => f.subs({ x: ce.box(v) }).N().re
const L = (s) => ce.parse(s)

// ---------------------------------------------------------------------------
// Problem family: y = a(x)*b(x) + a(x)   -- one value reaches the result twice.
// ---------------------------------------------------------------------------
function sharedPathProblem({ aCoef, aPow, bCoef, point }) {
  const a = L(`${aCoef}x^${aPow}`)
  const b = L(`${bCoef}x`)
  const y = a.mul(b).add(a)

  const da = d(a), db = d(b)

  // The correct derivative, and the derivations a learner plausibly produces instead.
  const modes = {
    correct: {
      label: 'Both paths counted',
      expr: d(y),
    },
    omits_direct_path: {
      label: 'Counted the product path, missed the direct + a path',
      expr: d(a.mul(b)),
      teach: 'a reaches y twice: through the product a·b and directly through + a.',
    },
    omits_product_path: {
      label: 'Counted the direct + a path, missed the product path',
      expr: da,
      teach: 'the product a·b also changes when a changes.',
    },
    no_product_rule: {
      label: 'Multiplied the two derivatives instead of applying the product rule',
      expr: da.mul(db).add(da),
      teach: 'the derivative of a product is a′b + ab′, not a′b′.',
    },
    partial_product_rule: {
      label: 'Applied the product rule to only one factor',
      expr: da.mul(b).add(da),
      teach: 'the product rule has two terms; both factors take a turn.',
    },
  }

  const out = {}
  for (const [k, m] of Object.entries(modes)) {
    const simplified = m.expr.simplify()
    out[k] = { ...m, symbolic: simplified.toString(), value: at(simplified, point) }
  }
  return { a: a.toString(), b: b.toString(), y: y.toString(), point, modes: out }
}

console.log('=== GENERATED PROBLEMS (answers computed, never written down) ===\n')

const specs = [
  { aCoef: 1, aPow: 2, bCoef: 3, point: 2 },   // the current app's hardcoded problem
  { aCoef: 1, aPow: 2, bCoef: 2, point: 1 },
  { aCoef: 2, aPow: 2, bCoef: 5, point: 3 },
  { aCoef: 1, aPow: 3, bCoef: 4, point: 2 },
  { aCoef: 3, aPow: 2, bCoef: 2, point: -1 },
]

const generated = specs.map(sharedPathProblem)
for (const p of generated) {
  console.log(`y = ${p.y}   at x = ${p.point}`)
  for (const [k, m] of Object.entries(p.modes)) {
    console.log(`   ${k.padEnd(22)} ${String(m.value).padStart(8)}   ${m.symbolic}`)
  }
  console.log()
}

// ---------------------------------------------------------------------------
// Collision check: a diagnosis is only trustworthy if the error modes produce
// DISTINCT answers for this problem. If two modes collide we must NOT name one.
// ---------------------------------------------------------------------------
console.log('=== COLLISION CHECK (can we safely name a diagnosis?) ===\n')
for (const p of generated) {
  const byValue = new Map()
  for (const [k, m] of Object.entries(p.modes)) {
    const key = String(m.value)
    byValue.set(key, [...(byValue.get(key) ?? []), k])
  }
  const collisions = [...byValue.entries()].filter(([, ks]) => ks.length > 1)
  console.log(
    `y = ${p.y.padEnd(18)} at x=${String(p.point).padStart(2)}  ->`,
    collisions.length ? `COLLIDE: ${JSON.stringify(collisions)}` : 'all modes distinct  OK',
  )
}

// ---------------------------------------------------------------------------
// Diagnosis: match a learner answer against the predicted error modes.
// ---------------------------------------------------------------------------
function diagnose(problem, learnerValue) {
  const hits = Object.entries(problem.modes).filter(([, m]) => {
    if (!Number.isFinite(m.value) || !Number.isFinite(learnerValue)) return false
    return Math.abs(m.value - learnerValue) <= 1e-9 * Math.max(1, Math.abs(m.value))
  })
  if (hits.length === 0) return { kind: 'unrecognised' }
  if (hits.length > 1) return { kind: 'ambiguous', modes: hits.map(([k]) => k) }
  const [key, mode] = hits[0]
  if (key === 'correct') return { kind: 'correct' }
  return { kind: 'diagnosed', id: key, label: mode.label, teach: mode.teach }
}

console.log('\n=== DIAGNOSIS ON THE ORIGINAL PROBLEM (y = 3x^3 + x^2, x = 2) ===\n')
const p0 = generated[0]
for (const v of [40, 36, 4, 6, 12, 41, 0]) {
  console.log(`  learner answers ${String(v).padStart(3)} ->`, JSON.stringify(diagnose(p0, v)))
}

console.log('\n=== THE SAME DIAGNOSIS ON A DIFFERENT GENERATED PROBLEM (y = 10x^3 + 2x^2, x = 3) ===\n')
const p2 = generated[2]
console.log('  correct answer is', p2.modes.correct.value)
for (const [k, m] of Object.entries(p2.modes)) {
  console.log(`  learner answers ${String(m.value).padStart(4)} ->`, JSON.stringify(diagnose(p2, m.value)))
}

// ---------------------------------------------------------------------------
// Does the diagnosis also work on SYMBOLIC answers (the derivative, not its value)?
// ---------------------------------------------------------------------------
console.log('\n=== SYMBOLIC ANSWERS ===\n')
function diagnoseSymbolic(problem, latex) {
  const learner = L(latex)
  if (!learner.isValid) return { kind: 'invalid' }
  const hits = Object.entries(problem.modes).filter(([, m]) => {
    const diff = L(m.symbolic).sub(learner).simplify()
    return diff.isEqual(0) === true
  })
  if (hits.length === 0) return { kind: 'unrecognised' }
  if (hits.length > 1) return { kind: 'ambiguous', modes: hits.map(([k]) => k) }
  return hits[0][0] === 'correct' ? { kind: 'correct' } : { kind: 'diagnosed', id: hits[0][0] }
}
for (const s of ['9x^2+2x', '9x^2', '2x', '9x^2 + 2x', '2x + 9x^2', '18x^2']) {
  console.log(`  learner writes ${s.padEnd(12)} ->`, JSON.stringify(diagnoseSymbolic(p0, s)))
}
