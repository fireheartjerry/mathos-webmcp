import { ComputeEngine } from '@cortex-js/compute-engine'
const ce = new ComputeEngine()
const BS = String.fromCharCode(92)

function show(label, fn) {
  try { console.log(label.padEnd(44), '=>', JSON.stringify(fn())) }
  catch (e) { console.log(label.padEnd(44), '!! ' + String(e.message).slice(0, 90)) }
}

// The equivalence oracle candidate: A - B simplifies to 0
function equiv(a, b) {
  const A = ce.parse(a), B = ce.parse(b)
  if (!A.isValid || !B.isValid) return 'invalid'
  const direct = A.isEqual(B)          // may be true/false/undefined
  const diff = A.sub(B).simplify()
  const viaDiff = diff.isEqual(0)
  return { direct: String(direct), viaDiff: String(viaDiff), simplified: diff.toString().slice(0, 40) }
}

console.log('=== NUMERIC SURFACE FORMS vs 40 ===')
for (const f of ['40', '40.0', '+40', '4' + BS + 'cdot 10', '36+4', BS + 'frac{80}{2}', '40.00001', '4x', '  40  ']) {
  show(JSON.stringify(f), () => equiv('40', f))
}

console.log()
console.log('=== SYMBOLIC DIFFERENTIATION ===')
const expr = '3x^3 + x^2'   // y = a*b + a with a=x^2,b=3x  ->  3x^3 + x^2 ; y' = 9x^2+2x ; at x=2 -> 40
show('parse 3x^3 + x^2', () => ce.parse(expr).toString())
show("D(expr, x) via ce.box(['D',...])", () => ce.box(['D', ce.parse(expr), 'x']).evaluate().toString())
show('same, .simplify()', () => ce.box(['D', ce.parse(expr), 'x']).evaluate().simplify().toString())
show('derivative at x=2 (subs+N)', () => {
  const d = ce.box(['D', ce.parse(expr), 'x']).evaluate()
  return d.subs({ x: ce.box(2) }).N().re
})
show('derivative at x=2 (assign)', () => {
  const d = ce.box(['D', ce.parse(expr), 'x']).evaluate()
  ce.assign('x', 2)
  const v = d.N().re
  ce.assign('x', undefined)
  return v
})
show('Derivative op form', () => ce.box(['Derivative', ce.parse(expr), 'x']).evaluate().toString())

console.log()
console.log('=== ALGEBRAIC EQUIVALENCE ===')
const pairs = [
  ['2x+3', '3+2x'],
  ['(x+1)^2', 'x^2+2x+1'],
  [BS + 'frac{x^2-1}{x-1}', 'x+1'],
  [BS + 'sin^2(x)+' + BS + 'cos^2(x)', '1'],
  ['2x', 'x+x'],
  ['9x^2+2x', '9x^2+2x'],
  ['9x^2+2x', '9x^2+3x'],
  ['9x^2+2x', '9x^2'],          // the "missed the direct path" misconception
  [BS + 'sqrt{x^2}', 'x'],       // NOT equal in general
  ['e^{' + BS + 'ln x}', 'x'],
]
for (const [a, b] of pairs) show(a + '  ==  ' + b, () => equiv(a, b))

console.log()
console.log('=== HOSTILE / MALFORMED ===')
for (const bad of ['', '((((', 'x^^2', BS + 'foo{3}', '1/0', 'x/(x-x)', BS + 'infty', 'x'.repeat(300), '2^(2^(2^(2^10)))']) {
  show('parse ' + JSON.stringify(bad.slice(0, 24)), () => {
    const p = ce.parse(bad)
    return { valid: p.isValid, head: JSON.stringify(p.json).slice(0, 48) }
  })
}

console.log()
console.log('=== TIMING (1000 equivalence checks) ===')
const t0 = Date.now()
for (let i = 0; i < 1000; i++) equiv('9x^2+2x', '9x^2+2x')
console.log('1000 equiv checks:', Date.now() - t0, 'ms')
