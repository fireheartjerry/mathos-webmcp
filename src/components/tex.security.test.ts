import { describe, expect, it } from 'vitest'
import katex from 'katex'

/**
 * Everything typeset on this page is untrusted input.
 *
 * A learner types LaTeX, and under the current thesis an agent may write lines and
 * propose replacements, so `propose_step`'s `latex` reaches KaTeX too. KaTeX's output is
 * injected with `dangerouslySetInnerHTML` — the only such call in the product — which
 * makes its escaping load-bearing rather than incidental.
 *
 * KaTeX defaults `trust: false`, which is supposed to neutralise the HTML-emitting
 * commands. This asserts that it does, with the exact options `Tex.tsx` passes, because
 * a default is a claim until something executes it. Chrome's WebMCP security guidance
 * names injection through tool-reachable content as a primary threat class.
 */
const B = String.fromCharCode(92)

const OPTIONS = {
  displayMode: false,
  throwOnError: false,
  errorColor: 'var(--path-a)',
  strict: false,
  output: 'htmlAndMathml' as const,
}

const render = (latex: string) => katex.renderToString(latex, OPTIONS)

const ATTACKS: Array<[string, string]> = [
  ['javascript URL through href', `${B}href{javascript:alert(1)}{click}`],
  ['data URL through href', `${B}href{data:text/html,<script>alert(1)</script>}{x}`],
  ['url command', `${B}url{javascript:alert(1)}`],
  ['htmlData attribute injection', `${B}htmlData{onclick=alert(1)}{x}`],
  ['htmlClass', `${B}htmlClass{evil}{x}`],
  ['htmlId', `${B}htmlId{evil}{x}`],
  ['htmlStyle overlay', `${B}htmlStyle{position:fixed;inset:0}{x}`],
  ['includegraphics', `${B}includegraphics{x.png}`],
  ['raw script tag', '<script>alert(1)</script>'],
  ['raw img with handler', '<img src=x onerror=alert(1)>'],
  ['break out of the span', '</span><img src=x onerror=alert(1)>'],
  ['svg handler', '<svg onload=alert(1)>'],
]

/**
 * Only the tags matter.
 *
 * KaTeX escapes text, and it echoes the original source into an `<annotation>` node, so
 * a hostile string reappears in the output as inert characters — `&lt;img src=x
 * onerror=…&gt;`. A first version of this test scanned the whole string and failed on
 * exactly that, which would have been a false alarm reported as a vulnerability. What is
 * dangerous is a *tag*: an element that executes, or an attribute the browser acts on.
 */
const tagsOf = (html: string) => html.match(/<[^>]+>/g) ?? []

describe('typeset input cannot inject markup', () => {
  it.each(ATTACKS)('%s produces no executable tag or attribute', (_name, latex) => {
    const tags = tagsOf(render(latex))
    const dangerous = tags.filter((tag) =>
      /^<\s*\/?\s*(script|img|svg|iframe|object|embed|link|base|form)\b/i.test(tag) ||
      /\son[a-z]+\s*=/i.test(tag) ||
      /\s(href|src|xlink:href|formaction)\s*=/i.test(tag) ||
      /javascript:/i.test(tag),
    )
    expect(dangerous, `dangerous tags: ${dangerous.join(' | ')}`).toEqual([])
  })

  it('keeps the hostile source as inert text, not as markup', () => {
    // The source is echoed into <annotation> for assistive technology and copy-paste.
    // That is fine, and worth pinning: it must arrive escaped.
    const html = render('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(tagsOf(html).some((t) => /^<\s*img/i.test(t))).toBe(false)
  })

  it('still typesets ordinary mathematics', () => {
    const html = render(`${B}frac{dy}{dx} = 12x^2 + 2x`)
    expect(html).toContain('katex')
    expect(html).toContain('<math')
  })

  it('renders malformed input without throwing, because a learner mid-keystroke holds it', () => {
    expect(() => render(`${B}frac{`)).not.toThrow()
    expect(() => render('4x^^')).not.toThrow()
  })
})
