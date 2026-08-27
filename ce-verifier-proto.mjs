// Prototype: dual-route expression verifier.
// Route A: compute-engine's own equivalence/simplification.
// Route B: an independent evaluator written here, walking the MathJSON tree.
//          It shares ONLY the parser with route A - no simplification, no isEqual.
// Disagreement, non-finite values, or sampling failure => 'uncertain'. Never 'match'.

import { ComputeEngine } from '@cortex-js/compute-engine'
const ce = new ComputeEngine()

const MAX_INPUT_CHARS = 256
const MAX_NODES = 400
const MAX_DEPTH = 24
const SAMPLE_COUNT = 24
const REL_TOLERANCE = 1e-9

// ---------- input contract ----------

function countNodes(json, depth = 0) {
  if (depth > MAX_DEPTH) return { nodes: Infinity, depth }
  if (!Array.isArray(json)) return { nodes: 1, depth }
  let nodes = 1
  let maxDepth = depth
  for (const child of json.slice(1)) {
    const r = countNodes(child, depth + 1)
    nodes += r.nodes
    if (r.depth > maxDepth) maxDepth = r.depth
    if (nodes > MAX_NODES) return { nodes: Infinity, depth: maxDepth }
  }
  return { nodes, depth: maxDepth }
}

function collectSymbols(json, out = new Set()) {
  if (typeof json === 'string') { out.add(json); return out }
  if (Array.isArray(json)) for (const child of json.slice(1)) collectSymbols(child, out)
  return out
}

const KNOWN_CONSTANTS = new Set(['Pi', 'ExponentialE', 'Nothing'])
const BANNED = new Set(['PositiveInfinity', 'NegativeInfinity', 'ComplexInfinity', 'NaN', 'Nothing'])

export function parseExpression(latex, allowedVars) {
  if (typeof latex !== 'string') return { ok: false, code: 'invalid_input', message: 'Expression must be text.' }
  const trimmed = latex.trim()
  if (!trimmed) return { ok: false, code: 'empty', message: 'Enter an expression.' }
  if (trimmed.length > MAX_INPUT_CHARS) return { ok: false, code: 'too_long', message: `Keep it under ${MAX_INPUT_CHARS} characters.` }

  let expr
  try { expr = ce.parse(trimmed) } catch (e) { return { ok: false, code: 'parse_error', message: 'That expression could not be read.' } }
  if (!expr || !expr.isValid) return { ok: false, code: 'parse_error', message: 'That expression could not be read.' }

  const json = expr.json
  const flat = JSON.stringify(json)
  if (flat.includes('"Error"')) return { ok: false, code: 'parse_error', message: 'That expression could not be read.' }

  const size = countNodes(json)
  if (size.nodes === Infinity) return { ok: false, code: 'too_complex', message: 'That expression is too complex to check.' }

  const symbols = collectSymbols(json)
  for (const s of symbols) {
    if (BANNED.has(s)) return { ok: false, code: 'unsupported', message: 'Infinite or undefined values are not supported here.' }
    if (KNOWN_CONSTANTS.has(s)) continue
    if (/^[A-Z]/.test(s)) continue                       // MathJSON operator heads
    if (!allowedVars.includes(s)) {
      return { ok: false, code: 'unknown_symbol', message: `This problem only uses ${allowedVars.join(', ')}. Found "${s}".` }
    }
  }
  return { ok: true, expr, symbols: [...symbols].filter((s) => allowedVars.includes(s)) }
}

// ---------- route B: independent evaluator ----------

function evalNode(json, env) {
  if (typeof json === 'number') return json
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    if ('num' in json) {
      const v = Number(json.num)
      if (!Number.isFinite(v)) throw new Error('non-finite literal')
      return v
    }
    throw new Error('unsupported literal object')
  }
  if (typeof json === 'string') {
    if (json === 'Pi') return Math.PI
    if (json === 'ExponentialE') return Math.E
    if (json in env) return env[json]
    throw new Error(`unbound symbol ${json}`)
  }
  if (!Array.isArray(json)) throw new Error('unsupported node')

  const [head, ...args] = json
  const v = args.map((a) => evalNode(a, env))
  switch (head) {
    case 'Add': return v.reduce((a, b) => a + b, 0)
    case 'Negate': return -v[0]
    case 'Subtract': return v[0] - v[1]
    case 'Multiply': return v.reduce((a, b) => a * b, 1)
    case 'Divide': return v[0] / v[1]
    case 'Rational': return v[0] / v[1]
    case 'Power': return Math.pow(v[0], v[1])
    case 'Square': return v[0] * v[0]
    case 'Sqrt': return Math.sqrt(v[0])
    case 'Root': return Math.pow(v[0], 1 / v[1])
    case 'Exp': return Math.exp(v[0])
    case 'Ln': return Math.log(v[0])
    case 'Log': return v.length > 1 ? Math.log(v[0]) / Math.log(v[1]) : Math.log10(v[0])
    case 'Sin': return Math.sin(v[0])
    case 'Cos': return Math.cos(v[0])
    case 'Tan': return Math.tan(v[0])
    case 'Abs': return Math.abs(v[0])
    case 'Delimiter': return v[0]
    default: throw new Error(`unsupported operator ${head}`)
  }
}

// deterministic PRNG so results are reproducible
function makeRng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function numericRoute(exprA, exprB, vars, seed = 20260826) {
  const rng = makeRng(seed)
  const a = exprA.json
  const b = exprB.json
  let compared = 0
  for (let i = 0; i < SAMPLE_COUNT * 4 && compared < SAMPLE_COUNT; i++) {
    const env = {}
    // sample away from 0 and from small integers, and stay positive often enough
    // that log/sqrt domains are exercised without dominating
    for (const name of vars) env[name] = Number(((rng() * 6 + 0.37) * (rng() < 0.25 ? -1 : 1)).toFixed(6))
    let va, vb
    try { va = evalNode(a, env); vb = evalNode(b, env) } catch { continue }
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue
    compared++
    const scale = Math.max(1, Math.abs(va), Math.abs(vb))
    if (Math.abs(va - vb) > REL_TOLERANCE * scale) return { verdict: 'unequal', compared }
  }
  if (compared < Math.ceil(SAMPLE_COUNT / 3)) return { verdict: 'insufficient', compared }
  return { verdict: 'equal', compared }
}

// ---------- route A ----------

// The engine is strong at PROVING polynomial/rational equality (simplify reaches 0)
// and weak at DISPROVING it symbolically (isEqual returns undefined for 9x^2+2x vs 9x^2).
// So we only ever trust it for 'equal', and read a non-zero *constant* difference as 'unequal'.
function engineRoute(exprA, exprB) {
  try {
    if (exprA.isSame(exprB)) return 'equal'
    const diff = exprA.sub(exprB).simplify()
    const j = diff.json
    if (j === 0 || (typeof j === 'object' && j !== null && 'num' in j && Number(j.num) === 0)) return 'equal'
    if (diff.isEqual(0) === true) return 'equal'
    // a difference that is a finite non-zero literal is a symbolic disproof
    if (typeof j === 'number' && Number.isFinite(j) && j !== 0) return 'unequal'
    return 'unknown'
  } catch { return 'unknown' }
}

// ---------- the oracle ----------

export function compare(latexA, latexB, allowedVars) {
  const A = parseExpression(latexA, allowedVars)
  if (!A.ok) return { status: 'invalid', reason: A.code, message: A.message }
  const B = parseExpression(latexB, allowedVars)
  if (!B.ok) return { status: 'invalid', reason: 'reference_' + B.code, message: B.message }

  const vars = [...new Set([...A.symbols, ...B.symbols])]
  const engine = engineRoute(A.expr, B.expr)
  const numeric = vars.length === 0
    ? (() => { try {
        const va = evalNode(A.expr.json, {}), vb = evalNode(B.expr.json, {})
        if (!Number.isFinite(va) || !Number.isFinite(vb)) return { verdict: 'insufficient', compared: 0 }
        const scale = Math.max(1, Math.abs(va), Math.abs(vb))
        return { verdict: Math.abs(va - vb) <= REL_TOLERANCE * scale ? 'equal' : 'unequal', compared: 1 }
      } catch { return { verdict: 'insufficient', compared: 0 } } })()
    : numericRoute(A.expr, B.expr, vars)

  const routes = { engine, numeric: numeric.verdict, samples: numeric.compared }

  // Asymmetric, and deliberately so.
  //
  // DISPROOF is sound: one point where both sides evaluate to finite values that
  // differ is a genuine counterexample. It does not need the engine's agreement,
  // and the engine usually cannot supply one (isEqual returns undefined for
  // 9x^2+2x vs 9x^2). We must not throw away a valid counterexample.
  if (numeric.verdict === 'unequal' && engine !== 'equal') return { status: 'mismatch', routes }

  // PROOF is not available to us. Equality requires BOTH routes to agree, and even
  // then we call it "consistent with equivalence", never proof.
  if (engine === 'equal' && numeric.verdict === 'equal') return { status: 'match', routes }

  // Everything else - including the engine claiming equality while a counterexample
  // exists (sqrt(x^2) vs x) - fails closed.
  return { status: 'uncertain', routes }
}

// ---------- adversarial suite ----------

const V = ['x']
const cases = [
  // [a, b, expected]
  ['40', '40', 'match'],
  ['40.0', '40', 'match'],
  ['+40', '40', 'match'],
  ['36+4', '40', 'match'],
  ['4\\cdot 10', '40', 'match'],
  ['\\frac{80}{2}', '40', 'match'],
  ['  40  ', '40', 'match'],
  ['40.00001', '40', 'mismatch'],
  ['36', '40', 'mismatch'],
  ['4', '40', 'mismatch'],
  ['9x^2+2x', '9x^2+2x', 'match'],
  ['2x+3', '3+2x', 'match'],
  ['(x+1)^2', 'x^2+2x+1', 'match'],
  ['x+x', '2x', 'match'],
  ['9x^2+2x', '9x^2', 'mismatch'],
  ['9x^2+2x', '9x^2+3x', 'mismatch'],
  ['\\sin^2(x)+\\cos^2(x)', '1', 'match'],
  // the honest-uncertainty cases: engine says equal, truth is domain-limited
  ['\\sqrt{x^2}', 'x', 'uncertain'],
  ['e^{\\ln x}', 'x', 'uncertain'],
  ['\\frac{x^2-1}{x-1}', 'x+1', 'uncertain-or-match'],
  // input contract
  ['', '40', 'invalid'],
  ['((((', '40', 'invalid'],
  ['\\infty', '40', 'invalid'],
  ['1/0', '40', 'invalid'],
  ['y+1', '40', 'invalid'],
  ['x'.repeat(300), '40', 'invalid'],
  ['2+', '40', 'invalid'],
]

let pass = 0, fail = 0
console.log('input'.padEnd(24), 'expected'.padEnd(20), 'actual'.padEnd(11), 'routes')
console.log('-'.repeat(96))
for (const [a, b, expected] of cases) {
  const r = compare(a, b, V)
  const ok = expected === 'uncertain-or-match' ? (r.status === 'uncertain' || r.status === 'match') : r.status === expected
  if (ok) pass++; else fail++
  const label = JSON.stringify(a.length > 22 ? a.slice(0, 19) + '...' : a)
  console.log(
    label.padEnd(24),
    expected.padEnd(20),
    (ok ? '  ' : 'XX') + r.status.padEnd(9),
    JSON.stringify(r.routes ?? r.reason),
  )
}
console.log('-'.repeat(96))
console.log(`pass ${pass} / fail ${fail}`)

console.log()
console.log('=== generated-problem check: derivative answers computed, not hardcoded ===')
for (const [f, at] of [['3x^3 + x^2', 2], ['2x^3+2x', 1], ['5x^2 + 4x', 3], ['x^4 - 2x^2', 2]]) {
  const d = ce.box(['D', ce.parse(f), 'x']).evaluate()
  const val = d.subs({ x: ce.box(at) }).N().re
  console.log(`  d/dx(${f}) = ${d.toString()}   at x=${at} -> ${val}`)
}
