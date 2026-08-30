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
            <h1 id="page-title">A second mind, shaped by yours.</h1>
            <p>
              <strong>Second Try</strong> is a calculus scratchpad. You write
              the working; the page checks every line and marks the first one
              that stopped being true.
            </p>
            <p>
              In <em>The Diamond Age</em>, a child is given a Primer: a book
              that learns her mind over years and reshapes itself around who
              she is becoming. This is a first step toward that. What the page
              learns about your reasoning stays here, and any agent you bring
              can read it through WebMCP.
            </p>
            <a className="cta" href="/learn">
              <span className="cta-label">Open the scratchpad</span>
            </a>
          </div>

          {/* One frame, not a loop. This previously held two attempts stacked
              on each other and crossfaded on a 12-second timer, plus a caption
              that composed itself word by word. Nothing on the page had
              changed, so none of that motion carried state. The figure now
              shows the single thing the product claims: the first line that
              stopped being true, and why. */}
          <figure
            className="reading"
            aria-label="A derivation whose third step stopped being equivalent"
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
                <span className="reading-verdict">equals</span>
              </li>
              <li className="reading-step">
                <span className="reading-index">2</span>
                <span className="reading-tex">
                  <Tex
                    latex={'\\frac{dy}{dx} = 36x^2 + 8x'}
                    ariaLabel="d y by d x equals thirty-six x squared plus eight x"
                  />
                </span>
                <span className="reading-verdict">differentiates</span>
              </li>
              <li className="reading-step is-broken">
                <span className="reading-index">3</span>
                <span className="reading-tex">
                  <Tex
                    latex={'\\frac{dy}{dx} = 36x^2'}
                    ariaLabel="d y by d x equals thirty-six x squared"
                  />
                </span>
                <span className="reading-verdict is-broken-verdict">not equivalent</span>
              </li>
            </ol>

            <figcaption className="reading-note">
              Step 3 stopped being equivalent at <Tex latex={'x = -1.4'} ariaLabel="x equals negative 1.4" />.
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
