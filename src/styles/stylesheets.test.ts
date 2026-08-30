import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The production build minifies CSS; the dev server does not. A stray `@` left behind
 * when a `@media (prefers-reduced-motion)` block was deleted therefore broke
 * `pnpm build` while `pnpm dev` kept working — and the gate only ran tests and
 * typecheck, so nothing caught it. These are the cheap structural checks; `pnpm build`
 * is the real one, and it now runs in the gate too.
 */
const FILES = [
  ...readdirSync('src/styles').filter((f) => f.endsWith('.css')).map((f) => join('src/styles', f)),
  ...readdirSync('src/components').filter((f) => f.endsWith('.css')).map((f) => join('src/components', f)),
]

describe('every stylesheet is well formed', () => {
  it.each(FILES)('%s has no dangling at-rule', (file) => {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const dangling = lines
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /^@[A-Za-z-]*$/.test(line) && !line.includes(';'))
    expect(dangling, `${file}: ${dangling.map((d) => `line ${d.n}`).join(', ')}`).toEqual([])
  })

  it.each(FILES)('%s has balanced braces', (file) => {
    const text = readFileSync(file, 'utf8')
    const open = (text.match(/\{/g) ?? []).length
    const close = (text.match(/\}/g) ?? []).length
    expect(open, `${file}: ${open} open vs ${close} close`).toBe(close)
  })

  it.each(FILES)('%s declares no empty rule', (file) => {
    // An empty rule is dead weight and usually the residue of a deleted block.
    const text = readFileSync(file, 'utf8')
    const empty = [...text.matchAll(/\{\s*(?:\/\*[\s\S]*?\*\/\s*)*\}/g)].length
    expect(empty, `${file} has ${empty} empty rule(s)`).toBe(0)
  })
})
