/**
 * A spoken form for the LaTeX this product actually produces.
 *
 * The step controls used to put the raw source into their accessible name, so a
 * screen reader read `\frac{dy}{dx} = 12x^2 + 2x` aloud as backslash-f-r-a-c and
 * a pile of braces. Nothing on the page was readable by ear.
 *
 * This is deliberately not a general LaTeX-to-speech engine — that is a research
 * problem. It covers the vocabulary the scratchpad and its problem families emit,
 * and anything it does not recognise falls through unchanged, so the result is
 * never worse than the raw string it replaced.
 */

const SUPERSCRIPT_WORDS: Record<string, string> = {
  '2': 'squared',
  '3': 'cubed',
}

function speakPower(exponent: string): string {
  const trimmed = exponent.trim()
  const word = SUPERSCRIPT_WORDS[trimmed]
  return word ? ` ${word}` : ` to the power ${trimmed}`
}

export function speakLatex(latex: string): string {
  let out = latex

  // Derivative notation, including the evaluated-at bar the receipt uses.
  out = out.replace(
    /\\d?frac\s*\{\s*d\s*([A-Za-z])\s*\}\s*\{\s*d\s*([A-Za-z])\s*\}/g,
    (_m, top: string, bottom: string) => `d ${top} by d ${bottom}`,
  )
  // Any remaining fraction.
  out = out.replace(
    /\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,
    (_m, top: string, bottom: string) => `${top} over ${bottom}`,
  )
  out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_m, body: string) => `the square root of ${body}`)

  // "evaluated at x = 2", from \bigg|_{x=2} and friends.
  out = out.replace(/\\[a-z]*\|\s*_\s*\{([^{}]*)\}/g, (_m, at: string) => ` evaluated at ${at}`)

  out = out.replace(/\^\s*\{([^{}]*)\}/g, (_m, exp: string) => speakPower(exp))
  out = out.replace(/\^\s*([0-9A-Za-z])/g, (_m, exp: string) => speakPower(exp))

  out = out.replace(/\\cdot/g, ' times ')
  out = out.replace(/\\times/g, ' times ')
  out = out.replace(/\\pi/g, ' pi ')
  out = out.replace(/\\ln/g, ' natural log of ')
  out = out.replace(/\\left|\\right/g, '')

  out = out.replace(/=/g, ' equals ')
  out = out.replace(/(?<=[\w)\]])\s*\+\s*/g, ' plus ')
  out = out.replace(/(?<=[\w)\]])\s*-\s*/g, ' minus ')
  out = out.replace(/(?<![A-Za-z])-(?=\d)/g, 'negative ')

  // Anything left over: drop the LaTeX punctuation rather than spelling it out.
  out = out.replace(/[{}\\]/g, ' ')
  out = out.replace(/\s+/g, ' ').trim()
  return out
}
