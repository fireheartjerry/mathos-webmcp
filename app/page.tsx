const TOOLS = [
  {
    name: 'get_scratchpad',
    kind: 'Read',
    description: 'Current problem, learner lines, verdicts, first broken or unresolved line, and valid next actions.',
  },
  {
    name: 'check_work',
    kind: 'Write',
    description: 'Asks the page engine to check the derivation and record the first broken or unresolved relation.',
  },
  {
    name: 'annotate_step',
    kind: 'Write',
    description: 'Attaches an explanation to one learner-written line during guided practice.',
  },
  {
    name: 'propose_step',
    kind: 'Write',
    description: 'Offers a replacement after two learner attempts since the most recent check. The learner still decides.',
  },
  {
    name: 'new_problem',
    kind: 'Write',
    description: 'Starts a fresh unaided problem only after checked work reaches the answer.',
  },
  {
    name: 'get_receipt',
    kind: 'Read',
    description: 'Reports up to eight recent rounds, actor-specific intervention counts, truncation metadata, and explicit limits.',
  },
] as const

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="/" aria-label="Mathos Second Try home">Mathos</a>
          <span className="product-name">Second Try</span>
          <span className="header-context">A bounded calculus experiment</span>
        </div>
      </header>

      <main id="main" className="landing-shell">
        <section className="opening" aria-labelledby="page-title">
          <div className="opening-copy">
            <p className="product-context">Product-rule practice in a shared browser page</p>
            <h1 id="page-title">A learner-owned derivation, checked at the first unresolved relation.</h1>
          </div>

          <figure className="transaction" aria-labelledby="transaction-title">
            <figcaption id="transaction-title">
              <span>Current derivation</span>
              <span>Preview — controls are inactive here</span>
            </figcaption>

            <ol className="derivation-preview">
              <li className="derivation-line line-start">
                <span className="line-number" aria-hidden="true">1</span>
                <div className="line-expression">
                  <span className="actor">Learner</span>
                  <span className="math-expression" role="math" aria-label="f prime of x equals the derivative of 12 x cubed plus 4 x squared">
                    f′(x) = d/dx (12x³ + 4x²)
                  </span>
                </div>
                <div className="relation relation-start">
                  <span className="relation-mark" aria-hidden="true" />
                  <span>Starting line</span>
                </div>
              </li>

              <li className="derivation-line line-break">
                <span className="line-number" aria-hidden="true">2</span>
                <div className="line-expression">
                  <span className="actor">Learner</span>
                  <span className="math-expression" role="math" aria-label="f prime of x equals 36 x squared">
                    f′(x) = 36x²
                  </span>
                </div>
                <div className="relation relation-broken">
                  <span className="relation-mark" aria-hidden="true" />
                  <span>Does not follow</span>
                </div>
                <div className="line-evidence">
                  <div className="engine-note">
                    <span className="actor actor-engine">Page engine</span>
                    <strong>Missing term: +8x</strong>
                    <p>4x² contributes 8x. Checked result: 36x² + 8x.</p>
                  </div>
                  <div className="proposal-preview">
                    <span className="actor actor-agent">Agent</span>
                    <strong>Proposed replacement — not applied</strong>
                    <span className="proposal-math" role="math" aria-label="f prime of x equals 36 x squared plus 8 x">
                      f′(x) = 36x² + 8x
                    </span>
                    <div className="proposal-actions" aria-label="Learner decision controls shown as a static preview">
                      <button type="button" disabled aria-describedby="transaction-title">Accept replacement</button>
                      <button type="button" disabled aria-describedby="transaction-title">Reject</button>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
          </figure>

          <div className="opening-action">
            <p>
              Write each line yourself. The page checks equivalence. An agent can explain or offer
              a replacement, but it cannot alter the verdict or apply its proposal.
            </p>
            <a className="button button-lg" href="/learn">Open the scratchpad <span aria-hidden="true">→</span></a>
          </div>
        </section>

        <section className="document-section mechanism" aria-labelledby="mechanism-title">
          <div className="section-heading">
            <h2 id="mechanism-title">The page owns mathematical truth</h2>
          </div>
          <div className="section-body">
            <p className="lead-copy">
              The learner’s unfinished work exists in the open browser page. Its computer algebra
              engine checks each transition and writes the relation state. WebMCP gives an agent a
              bounded way to read that live document, request the same check, and place help beside
              the exact line.
            </p>
            <dl className="fact-list">
              <div><dt>Page engine</dt><dd>Checks symbolic equivalence and identifies the first broken or unresolved relation.</dd></div>
              <div><dt>Agent</dt><dd>May inspect, check, annotate, and propose through six declared tools.</dd></div>
              <div><dt>Learner</dt><dd>Writes, edits, removes, accepts, or rejects every mathematical line.</dd></div>
            </dl>
          </div>
        </section>

        <section className="document-section shared-state" aria-labelledby="shared-state-title">
          <div className="section-heading"><h2 id="shared-state-title">One live document, two possible writers</h2></div>
          <div className="section-body">
            <p className="lead-copy">
              Every agent write includes the revision it read. If the learner edits first, the stale
              call is refused and returns a recovery step. Proposals remain pending until the learner
              chooses. During the fresh unaided problem, annotation and proposal tools close.
            </p>
            <div className="revision-sequence" aria-label="Example stale revision refusal">
              <span><b>Learner</b>&nbsp;edits line 2</span>
              <span className="sequence-arrow" aria-hidden="true">→</span>
              <span><b>Page</b>&nbsp;advances to revision 8</span>
              <span className="sequence-arrow" aria-hidden="true">→</span>
              <span className="sequence-refusal"><b>Agent write</b>&nbsp;for revision 7 is refused</span>
            </div>
          </div>
        </section>

        <section className="document-section boundary" aria-labelledby="boundary-title">
          <div className="section-heading">
            <h2 id="boundary-title">The exact six-tool boundary</h2>
            <p className="section-note">Two read-only tools. Four tools that can change page state.</p>
          </div>
          <div className="section-body">
            <ol className="tool-list">
              {TOOLS.map((tool) => (
                <li key={tool.name}>
                  <code>{tool.name}</code>
                  <span className={`tool-kind kind-${tool.kind.toLowerCase()}`}>{tool.kind}</span>
                  <p>{tool.description}</p>
                </li>
              ))}
            </ol>
            <p className="runtime-note">
              The full learner experience works without WebMCP. For direct agent calls, use
              ChatGPT’s built-in browser on <strong>GPT-5.6 Sol or Terra</strong>, or Chrome 149+
              with <code>chrome://flags/#enable-webmcp-testing</code>. This build includes a checked
              six-tool Chrome harness; the page reports unavailable when that browser feature is off.
            </p>
          </div>
        </section>

        <section className="document-section falsifiability" aria-labelledby="falsifiability-title">
          <div className="section-heading"><h2 id="falsifiability-title">The contradiction stays visible</h2></div>
          <div className="section-body contradiction-test">
            <div className="agent-claim">
              <span className="actor actor-agent">Agent note</span>
              <p>“Line 2 is correct. Continue.”</p>
            </div>
            <div className="unchanged-verdict">
              <span className="actor actor-engine">Page engine</span>
              <strong>Line 2 · Does not follow</strong>
              <p>The engine-owned verdict remains unchanged: the result is still missing 8x.</p>
            </div>
            <p className="test-caption">
              This is the falsifiable boundary: an agent can make a wrong claim without being able
              to make the page display a passing relation.
            </p>
          </div>
        </section>

        <section className="document-section scope" aria-labelledby="scope-title">
          <div className="section-heading"><h2 id="scope-title">What one session can establish</h2></div>
          <div className="section-body">
            <p className="lead-copy">
              Second Try supports one generated product-rule family, polynomial derivatives, and
              algebraic rewriting. A fresh unaided problem records an immediate transfer signal for
              this browser session. It does not establish durable understanding, future performance,
              or general mathematics mastery.
            </p>
            <p className="closing-copy">
              The receipt keeps those limitations beside the observed checks, separates agent from
              local-inspector activity, and marks when its eight-round history window is truncated.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>Mathos · Y Combinator W24</p>
          <p>Second Try · WebMCP Challenge 2026</p>
        </div>
      </footer>
    </>
  )
}
