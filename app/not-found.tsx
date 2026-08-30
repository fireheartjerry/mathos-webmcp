import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Not found — Second Try',
  // No `robots` here on purpose: the framework already emits `noindex` for this route,
  // and declaring it again only produced two <meta name="robots"> tags in the head.
}

/**
 * The framework's default 404 was a dead end: the string "404 This page could not be
 * found" on a bare white page, with no way back into the product and no relation to the
 * rest of it. Two concrete problems, not one.
 *
 * The first is that a judge who mistypes a path, or follows a link from a document
 * written before a route was renamed, lands somewhere with no exit. The second is subtler
 * and was a contradiction with a claim this project makes: the default page ships its own
 * `@media (prefers-color-scheme: dark)` block and repaints itself black. Every other page
 * here declares `color-scheme: light` at `:root` precisely so a dark-mode browser cannot
 * do that to a palette whose contrast has been measured. The one page nobody looked at
 * was the one page that broke the rule.
 *
 * This uses only classes that already exist in the design system, so it inherits the
 * declared colour scheme, the type scale and the focus treatment rather than introducing
 * a second set of any of them.
 */
export default function NotFound() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Mathos home">Mathos</a>
      </header>

      <main id="main" className="landing-shell">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title">Not found.</h1>
            <a className="cta" href="/learn">
              <span className="cta-label">Open the scratchpad</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Built for the WebMCP Challenge</span>
      </footer>
    </>
  )
}
