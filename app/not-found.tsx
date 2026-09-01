import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Not found — Mathburst',
}

export default function NotFound() {
  return (
    <main className="mathburst-404">
      <header>
        <a className="wordmark" href="/" aria-label="Mathburst home"><span>∫</span> Mathburst</a>
        <em>shared mathematical world</em>
      </header>
      <section aria-labelledby="not-found-title">
        <span>404 · outside the frame</span>
        <h1 id="not-found-title">This part of the world is still blank.</h1>
        <p>The mathematics is one step back.</p>
        <a href="/">Return to Mathburst <b>→</b></a>
      </section>
    </main>
  )
}
