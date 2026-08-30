/**
 * Accessibility and legibility sweep over the live page.
 *
 * Not a substitute for a real audit; these are the failures that are cheap to detect
 * and expensive to ship: unlabelled controls, unreachable focus, contrast below the
 * WCAG AA thresholds, and touch targets too small to hit.
 */
const problems = []
const add = (kind, detail) => problems.push({ kind, detail })

// 1. Every interactive control needs an accessible name.
const interactive = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')]
for (const el of interactive) {
  const name = (
    el.getAttribute('aria-label') ||
    (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) ||
    el.textContent ||
    el.getAttribute('title') ||
    (el.labels && el.labels[0]?.textContent) ||
    el.getAttribute('placeholder') ||
    ''
  ).trim()
  if (!name) add('unnamed control', `${el.tagName.toLowerCase()}.${el.className || '(no class)'}`)
}

// 2. Focusable controls must be reachable and must show a focus ring.
let ringless = 0
for (const el of interactive) {
  if (el.disabled) continue
  if (el.tabIndex < 0) add('not reachable by keyboard', `${el.tagName.toLowerCase()}.${el.className}`)
  el.focus()
  const s = getComputedStyle(el)
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
  const shadow = s.boxShadow && s.boxShadow !== 'none'
  if (!ring && !shadow) ringless += 1
}
if (ringless > 0) add('no visible focus indicator', `${ringless} of ${interactive.length} controls`)

// 3. Contrast, at the WCAG AA thresholds.
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)
const bgOf = (el) => {
  let node = el
  while (node) {
    const c = getComputedStyle(node).backgroundColor
    if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return parse(c)
    node = node.parentElement
  }
  return [255, 255, 255]
}
let worst = { ratio: 99, text: '' }
for (const el of document.querySelectorAll('p, span, li, button, a, h1, h2, h3, label, code, td, th')) {
  // Zero-width characters are KaTeX struts, not text a person reads.
  const text = el.textContent?.replace(/[​-‍﻿]/g, '').trim()
  if (!text || el.children.length > 0) continue
  const s = getComputedStyle(el)
  if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue
  const size = parseFloat(s.fontSize)
  const bold = Number(s.fontWeight) >= 700
  const large = size >= 24 || (size >= 18.66 && bold)
  const need = large ? 3 : 4.5
  const a = lum(parse(s.color)) + 0.05
  const b = lum(bgOf(el)) + 0.05
  const ratio = a > b ? a / b : b / a
  if (ratio < worst.ratio) worst = { ratio: Number(ratio.toFixed(2)), text: text.slice(0, 40), size }
  if (ratio < need) add('contrast below AA', `${ratio.toFixed(2)}:1 needs ${need} — "${text.slice(0, 40)}" at ${size}px`)
  if (size < 11) add('text under 11px', `${size}px — "${text.slice(0, 40)}"`)
}

// 4. Hit targets.
for (const el of interactive) {
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) continue
  const min = Math.min(r.width, r.height)
  if (min < 32) add('hit target under 32px', `${Math.round(r.width)}x${Math.round(r.height)} — ${(el.textContent || el.className).trim().slice(0, 30)}`)
}

// 5. Document-level basics.
if (!document.documentElement.lang) add('no lang on <html>', '')
if (!document.title) add('no document title', '')
const h1s = document.querySelectorAll('h1').length
if (h1s !== 1) add('heading structure', `${h1s} h1 elements`)

return {
  controls: interactive.length,
  worstContrast: worst,
  problemCount: problems.length,
  problems: problems.slice(0, 20),
}
