import { Fragment } from 'react'
import { Tex } from '../src/components/Tex'

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Mathos home">Mathos</a>
      </header>

      <main id="main" className="landing-shell">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            {/* Split per word so the line assembles rather than arriving whole
                (Sarsa section 8: staggered 80ms). The words are spans inside a
                single h1, so the accessible name is unchanged. */}
            <h1 id="page-title">
              {'A page that knows how you think.'.split(' ').map((word, i) => (
                <Fragment key={word + i}>
                  {/* The space lives between the spans, never inside one. An
                      inline-block collapses its own trailing whitespace, so a
                      space inside the span disappears and the words run
                      together — while textContent still reads correctly. */}
                  {i > 0 ? ' ' : null}
                  <span className="hero-word" style={{ ["--w" as string]: i }}>
                    {word}
                  </span>
                </Fragment>
              ))}
            </h1>
            <p>
              You write the mathematics. The page reads it, keeps what it learns
              about you, and hands that to whichever agent you bring.
            </p>
            <a className="cta" href="/learn">
              <span className="cta-label">Open the scratchpad</span>
              <span className="cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>

          <figure
            className="reading"
            aria-label="A derivation whose third step stopped being equivalent, and the corrected second attempt"
          >
            <ol className="reading-steps">
              {/* An li, not a span: ol may only contain li. Absolutely positioned,
                  so it adds no row. */}
              <li className="reading-scan scan-find" aria-hidden="true" />
              <li className="reading-scan scan-confirm" aria-hidden="true" />
              <li className="reading-step" style={{ ["--i" as string]: 0, ["--pulse-delay" as string]: "888ms" }}>
                <span className="reading-index">1</span>
                <span className="reading-tex">
                  <Tex
                    latex={'y = 12x^3 + 4x^2'}
                    ariaLabel="y equals twelve x cubed plus four x squared"
                  />
                </span>
              </li>
              <li className="reading-step" style={{ ["--i" as string]: 1, ["--pulse-delay" as string]: "1167ms" }}>
                <span className="reading-index">2</span>
                <span className="reading-tex">
                  <Tex
                    latex={'\\frac{dy}{dx} = 36x^2 + 8x'}
                    ariaLabel="d y by d x equals thirty-six x squared plus eight x"
                  />
                </span>
              </li>
              {/* The product is called Second Try, so the hero shows both. The
                  first attempt drops the 8x; the second evaluates the real
                  derivative at the requested point. 36(4) + 8(2) = 160.
                  Only the first attempt is exposed to assistive tech — the
                  swapped-in second is decorative narrative, and the figure's
                  label carries the whole story. */}
              <li className="reading-step is-broken" style={{ ["--i" as string]: 2, ["--pulse-delay" as string]: "1536ms" }}>
                <span className="reading-index">3</span>
                <span className="reading-swap">
                  <span className="reading-tex try-first">
                    <Tex
                      latex={'\\frac{dy}{dx} = 36x^2'}
                      ariaLabel="d y by d x equals thirty-six x squared"
                    />
                  </span>
                  <span className="reading-tex try-second" aria-hidden="true">
                    <Tex latex={'\\frac{dy}{dx}\\bigg|_{x=2} = 160'} />
                  </span>
                </span>
              </li>
            </ol>

            <figcaption className="reading-note">
              <span className="try-first">
                Step 3 stopped being equivalent at{' '}
                <span className="reading-point">x = −1.4</span>.
              </span>
              <span className="try-second" aria-hidden="true">
                Checked. Sound through step 3.
              </span>
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="site-footer">
        <span>Built for the WebMCP Challenge</span>
      </footer>
    </>
  )
}
