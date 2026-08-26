const BRIDGE_STAGES = [
  ['You proved that change can travel by more than one route.', 'Calculus / sensitivity', 'proved here'],
  ['Carry many changing quantities together, with direction and scale.', 'Vectors', 'what transfers'],
  ['Draw the routes so each cause, operation, and result stays visible.', 'Computation graphs', 'what transfers'],
  ['Send the final error backward through every route that created it.', 'Backpropagation', 'what transfers'],
  ['Use those signals to nudge the numbers toward a better result.', 'Optimization', 'what transfers'],
  ['Measure how surprised the model was by the right next choice.', 'Probability / loss', 'what transfers'],
  ['Turn small pieces of text into learnable number-vectors.', 'Tokens and embeddings', 'what transfers'],
  ['Let each piece choose which earlier routes carry useful context.', 'Attention', 'what transfers'],
  ['Stack attention, preserved paths, and small neural networks.', 'Transformer blocks', 'what transfers'],
  ['Watch real loss reshape real weights inside your browser.', 'Training lab', 'live destination'],
]

export default function PathwayBridge({ onOpenLab, onBackReceipt }: { onOpenLab: () => void; onBackReceipt: () => void }) {
  return (
    <section className="pathway-bridge enter-panel">
      <nav className="mode-nav" aria-label="Learning journey"><button onClick={onBackReceipt}>Evidence receipt</button><span>→</span><strong>Pathway</strong><span>→</span><button onClick={onOpenLab}>Training lab</button></nav>
      <header className="bridge-hero">
        <div>
          <p>One idea · ten stages</p>
          <h1>The path keeps<br /><em>changing shape.</em></h1>
        </div>
        <p className="bridge-lede">You proved one narrow idea today: change follows every route. Here is how that idea travels toward a transformer—without pretending you already mastered the stops between.</p>
      </header>

      <div className="path-morph" aria-label="A derivative path conceptually becoming attention paths">
        <div className="morph-label"><span>Derivative paths</span><code>dy/dx = Σ path contributions</code></div>
        <svg viewBox="0 0 980 150" role="img" aria-label="Two derivative paths fan into many weighted attention paths">
          <defs>
            <linearGradient id="path-gradient" x1="0" x2="1"><stop stopColor="#c85d31" /><stop offset="0.52" stopColor="#3f795f" /><stop offset="1" stopColor="#3e6f9d" /></linearGradient>
          </defs>
          <path d="M20 42 C170 42 155 73 300 73 S440 22 540 55 S720 42 960 25" />
          <path d="M20 108 C170 108 155 77 300 77 S440 128 540 95 S720 108 960 75" />
          <path className="morph-new-path" d="M300 75 C450 75 420 75 540 75 S720 112 960 125" />
          {[20, 300, 540, 720, 960].map((x, index) => <circle key={x} cx={x} cy={index < 2 ? 75 : [75, 42, 75, 108, 75][index]} r="7" />)}
        </svg>
        <div className="morph-label right"><code>attention = softmax(QKᵀ / √d)</code><span>Attention paths</span></div>
      </div>

      <ol className="bridge-stage-list">
        {BRIDGE_STAGES.map(([plain, technical, status], index) => (
          <li key={technical} className={index === 0 ? 'bridge-proved' : index === 9 ? 'bridge-live' : ''}>
            <span className="bridge-number">{index === 0 ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <div><small>{status}</small><h2>{plain}</h2><p>{technical}</p></div>
            {index === 9 && <button onClick={onOpenLab}>Train the tiny transformer <span aria-hidden="true">↗</span></button>}
          </li>
        ))}
      </ol>
      <div className="bridge-final-action"><p>The next screen is not a simulation. The loss, sample, weights, and attention all come from a trainable model.</p><button onClick={onOpenLab}>Train the tiny transformer <span aria-hidden="true">→</span></button></div>
    </section>
  )
}
