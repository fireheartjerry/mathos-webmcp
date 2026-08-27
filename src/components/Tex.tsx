import { useMemo } from 'react'
import katex from 'katex'

/**
 * Math is typeset, never typed. `a = x²` set in the UI font is the single fastest way
 * to make a mathematics product look like a mock-up, and Mathos renders through KaTeX
 * in production, so we do too.
 *
 * `throwOnError` is off: a learner mid-keystroke is constantly holding invalid LaTeX,
 * and the editor must not flash an exception at them. Invalid input renders in the
 * error colour and the verifier reports the real reason separately.
 */
export function Tex({ latex, display = false, ariaLabel }: { latex: string; display?: boolean; ariaLabel?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        errorColor: 'var(--path-a)',
        strict: false,
        // 'htmlAndMathml' keeps KaTeX's MathML branch, which is what a screen reader
        // announces. With 'html' every expression on the page is an unnamed role="math".
        output: 'htmlAndMathml',
      })
    } catch {
      return ''
    }
  }, [latex, display])

  if (!html) {
    return (
      <span className="math math-raw" role="math" aria-label={ariaLabel ?? latex}>
        {latex}
      </span>
    )
  }
  return (
    <span
      className={display ? 'math math-display' : 'math'}
      role="math"
      // KaTeX emits its own aria-hidden spans plus an MathML branch for readers.
      aria-label={ariaLabel}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
