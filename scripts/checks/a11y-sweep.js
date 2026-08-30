/**
 * Accessibility and legibility sweep over the live page.
 *
 * Not a substitute for a real audit; these are the failures that are cheap to detect
 * and expensive to ship: unlabelled controls, unreachable focus, contrast below the
 * WCAG AA thresholds, and touch targets too small to hit.
 *
 * WHY THE CONTRAST CHECK READS THE CASCADE, NOT ONLY getComputedStyle.
 *
 * It used to report the composer's submit button at 4.17:1 against a 4.5 threshold,
 * reproducibly, on a healthy build. It was wrong:
 *
 *   - Two pixel samples, the button captured at 4x and decoded to raw RGB, agree - 90.7%
 *     #333333 (the ::before fill), 4.5% #ffffff (the glyphs), 3.2% #000000 (the border).
 *     White on #333 is **12.63:1**.
 *   - `getComputedStyle(button).color` returns #949494, and so does
 *     `-webkit-text-fill-color`.
 *   - The cascade says #ffffff: `.button` sets `color: var(--surface)` and `--surface`
 *     resolves to #fff on that element.
 *
 * Two of the three agree, and they are the two that can be checked. So `declaredColor()`
 * resolves the colour from the matching rules and wins when it disagrees with the
 * computed value; on this page it disagrees exactly once, on that button. If a colour has
 * no rule behind it *and* differs from what the element would inherit, it is reported as
 * unverifiable rather than failed - that is the case where neither source can be trusted.
 *
 * Three earlier findings from this script were the measurement rather than the page, and
 * two bugs in the fix itself were caught the same way: `visit()` treated every style rule
 * as a group, because Chrome gives each one an empty `cssRules` for CSS nesting, and the
 * colour parser read `#6f6f6f` as [6, 6, 6] by pulling decimal runs out of a hex string.
 * Treat a single failure here as a lead, not a verdict.
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
/**
 * The colour the cascade says the element has, which is not always what
 * getComputedStyle reports. Walks the same-origin stylesheets for matching rules that
 * set `color`, takes the last one to win, and resolves a `var(--x)` against the element.
 */
const declaredColor = (el) => {
  let declared = null
  const visit = (rules) => {
    for (const rule of rules || []) {
      // Do not treat "has cssRules" as "is a group": Chrome gives every CSSStyleRule an
      // empty cssRules for CSS nesting, so that test skipped every rule in the sheet and
      // declaredColor returned null for the whole page.
      if (!rule.selectorText) { if (rule.cssRules) visit(rule.cssRules); continue }
      if (rule.style && rule.style.color) {
        let matches = false
        try { matches = el.matches(rule.selectorText) } catch { matches = false }
        if (matches) declared = rule.style.color
      }
      if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules)
    }
  }
  for (const sheet of document.styleSheets) {
    let rules
    try { rules = sheet.cssRules } catch { continue }
    visit(rules)
  }
  if (!declared) return null
  const variable = /^var\((--[\w-]+)\)$/.exec(declared.trim())
  const value = variable ? getComputedStyle(el).getPropertyValue(variable[1]).trim() : declared
  // Hex first: `parse` pulls decimal runs out of a string, so it reads #6f6f6f as
  // [6, 6, 6] and quietly turns a mid grey into near-black.
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16))
  }
  const rgb = parse(value)
  return rgb.length === 3 ? rgb : null
}

let worst = { ratio: 99, text: '' }
const disagreements = []
const unverifiable = []
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
  // Prefer the cascade when it disagrees with the computed value: pixel samples of the
  // one element where they differ agreed with the cascade, twice, on two builds.
  const computed = parse(s.color)
  const cascade = declaredColor(el)
  if (!cascade) {
    // No rule sets this element's colour, so it must be inheriting. If it is not, the
    // computed value has no source and cannot be checked - see the header.
    const parent = el.parentElement ? getComputedStyle(el.parentElement).color : null
    if (parent && parse(parent).join() !== computed.join()) {
      unverifiable.push({ text: text.slice(0, 30), computed: s.color, inherits: parent })
      continue
    }
  }
  const fg = cascade && cascade.join() !== computed.join() ? cascade : computed
  if (cascade && cascade.join() !== computed.join()) {
    disagreements.push({ text: text.slice(0, 30), computed: computed.join(), cascade: cascade.join() })
  }
  const a = lum(fg) + 0.05
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
  colorDisagreements: disagreements,
  unverifiableColors: unverifiable,
  controls: interactive.length,
  worstContrast: worst,
  problemCount: problems.length,
  problems: problems.slice(0, 20),
}
