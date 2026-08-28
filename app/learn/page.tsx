import Scratchpad from '../../src/components/Scratchpad'

export default function LearnPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the scratchpad
      </a>
      <Scratchpad />
      <noscript>
        <div className="noscript-recovery is-error" role="alert">
          <p>The scratchpad needs JavaScript to save and check your derivation.</p>
          <p>
            Enable JavaScript, then <a href="/learn">reload the scratchpad</a>.
          </p>
        </div>
      </noscript>
    </>
  )
}
