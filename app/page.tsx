import { Tex } from '../src/components/Tex'

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Mathos home">Mathos</a>
        <span className="webmcp-mark">WebMCP</span>
      </header>

      <main id="main" className="landing-shell">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <h1 id="page-title">A page that knows how you think.</h1>
            <p>
              You write the mathematics. The page reads it, keeps what it learns
              about you, and hands that to whichever agent you bring.
            </p>
            <a className="button button-lg" href="/learn">
              Open the scratchpad <span aria-hidden="true">→</span>
            </a>
          </div>

          <figure
            className="reading"
            aria-label="A derivation with the first step that stopped being equivalent marked"
          >
            <ol className="reading-steps">
              <li className="reading-step">
                <span className="reading-index">1</span>
                <span className="reading-tex">
                  <Tex
                    latex={'y = 12x^3 + 4x^2'}
                    ariaLabel="y equals twelve x cubed plus four x squared"
                  />
                </span>
              </li>
              <li className="reading-step">
                <span className="reading-index">2</span>
                <span className="reading-tex">
                  <Tex
                    latex={'\\frac{dy}{dx} = 36x^2 + 8x'}
                    ariaLabel="d y by d x equals thirty-six x squared plus eight x"
                  />
                </span>
              </li>
              <li className="reading-step is-broken">
                <span className="reading-index">3</span>
                <span className="reading-tex">
                  <Tex
                    latex={'\\frac{dy}{dx} = 36x^2'}
                    ariaLabel="d y by d x equals thirty-six x squared"
                  />
                </span>
              </li>
            </ol>

            <figcaption className="reading-note">
              Step 3 stopped being equivalent at <span className="reading-point">x = −1.4</span>.
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="site-footer">
        <span>Mathos</span>
        <span>Built for the WebMCP Challenge</span>
      </footer>
    </>
  )
}
