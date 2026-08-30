/**
 * Accessibility and legibility sweep over the live page.
 *
 * Not a substitute for a real audit; these are the failures that are cheap to detect
 * and expensive to ship: unlabelled controls, unreachable focus, contrast below the
 * WCAG AA thresholds, and touch targets too small to hit.
 *
 * KNOWN OPEN, 2026-08-30. This reports the submit button in the composer at 4.17:1
 * against the 4.5 threshold for 14px text. The numbers behind it do not add up and the
 * discrepancy is not resolved:
 *
 *   - `.button` is the only rule Chrome reports as matching (CSS.getMatchedStylesForNode),
 *     and it sets `color: var(--surface)`.
 *   - `--surface` resolves to #fff on that element, and the button matches neither
 *     `:disabled` nor `[aria-disabled="true"]`.
 *   - `getComputedStyle(button).color` nevertheless returns #949494, which is
 *     `--ink-disabled`, used only by the disabled branch.
 *
 * The fill behind it is #333 from a full-bleed `::before`, so the ratio depends entirely
 * on which of those two readings of `color` is true. Do not "fix" the button on the
 * strength of this number until somebody has looked at a screenshot and read the
 * contrast off the pixels. Two earlier readings from this same script were instrument
 * artifacts, both fixed below.
 */
/**
 * Measure the resting state, not a loading frame.
 *
 * The scratchpad disables its composer until the computer algebra engine has loaded, and
 * a disabled control is greyed on purpose. Running the sweep during that window read the
 * disabled palette off a control that was a few hundred milliseconds from being enabled,
 * and reported the primary action as failing contrast.
 */
const settled = async () => {
  for (let i = 0; i < 40; i++) {
    const composer = document.querySelector('#next-step')
    if (!composer || !composer.disabled) return
    await new Promise((r) => setTimeout(r, 100))
  }
}
await settled()

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

// 2. Focusable controls must be reachable, and the page must draw a focus ring.
//
// This used to call el.focus() and read the computed outline. That is not a test of the
// page, it is a test of Chrome's :focus-visible heuristic, which only matches when the
// browser believes focus came from the keyboard. A programmatic focus on a freshly
// loaded tab does not qualify, so the same page reported 0 problems or 11 depending on
// whether the tab had been typed in first. Read the rules instead.
for (const el of interactive) {
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue
  if (el.tabIndex < 0) add('not reachable by keyboard', `${el.tagName.toLowerCase()}.${el.className}`)
}
const focusRules = []
for (const sheet of document.styleSheets) {
  let rules
  try { rules = sheet.cssRules } catch { continue }   // cross-origin sheet
  for (const rule of rules || []) {
    if (!rule.selectorText || !rule.selectorText.includes(':focus-visible')) continue
    const t = rule.style
    const ring = t.outlineStyle !== 'none' && t.outlineWidth && parseFloat(t.outlineWidth) > 0
    const outline = t.outline && !/none/.test(t.outline)
    const shadow = t.boxShadow && t.boxShadow !== 'none'
    if (ring || outline || shadow) focusRules.push(rule.selectorText)
  }
}
if (focusRules.length === 0) add('no :focus-visible rule draws a ring', 'searched every same-origin stylesheet')

// 3. Contrast, at the WCAG AA thresholds.
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const parse = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number)
const opaque = (c) => c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)
const bgOf = (el) => {
  let node = el
  while (node) {
    const c = getComputedStyle(node).backgroundColor
    if (opaque(c)) return parse(c)
    node = node.parentElement
  }
  return [255, 255, 255]
}
/**
 * The fill an element actually paints behind its own text.
 *
 * `.button` draws its background on a full-bleed `::before` (inset: 0, z-index: -1), so
 * reading only `backgroundColor` off the element gave the *ancestor's* colour and
 * reported the primary "Add line" button at 2.71:1 when it renders white on near-black.
 * A screenshot of the button is what settled it. Take the most favourable of the
 * candidate layers: a false failure on the main call to action is worse than a miss,
 * because it is the one an author will "fix" by changing something that was correct.
 */
const bgLayers = (el) => {
  const layers = [bgOf(el)]
  for (const pseudo of ['::before', '::after']) {
    const s = getComputedStyle(el, pseudo)
    if (s.content === 'none') continue
    if (!opaque(s.backgroundColor)) continue
    // Only count it if it covers the element rather than sitting beside it.
    const covers = ['top', 'right', 'bottom', 'left'].every((side) => {
      const v = s.getPropertyValue(side)
      return v === '0px' || v === 'auto'
    })
    if (covers) layers.push(parse(s.backgroundColor))
  }
  return layers
}
let worst = { ratio: 99, text: '' }
for (const el of document.querySelectorAll('p, span, li, button, a, h1, h2, h3, label, code, td, th')) {
  // Zero-width characters are KaTeX struts, not text a person reads.
  const text = el.textContent?.replace(/[​-‍﻿]/g, '').trim()
  if (!text || el.children.length > 0) continue
  // WCAG exempts disabled controls, and this page greys them deliberately.
  if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled], [aria-disabled="true"]')) continue
  const s = getComputedStyle(el)
  if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue
  const size = parseFloat(s.fontSize)
  const bold = Number(s.fontWeight) >= 700
  const large = size >= 24 || (size >= 18.66 && bold)
  const need = large ? 3 : 4.5
  const a = lum(parse(s.color)) + 0.05
  const ratio = Math.max(...bgLayers(el).map((layer) => {
    const b = lum(layer) + 0.05
    return a > b ? a / b : b / a
  }))
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
  focusRules,
  controls: interactive.length,
  worstContrast: worst,
  problemCount: problems.length,
  problems: problems.slice(0, 20),
}
