import katex from 'katex'

/**
 * A deliberately small LaTeX surface for the native equation editor.
 *
 * This is validation and token discovery only. It is intentionally not a
 * parser, evaluator, or CAS: KaTeX owns syntax/rendering and the graph math
 * module owns numerical evaluation.
 */

export type LatexValidation = {
  valid: boolean
  error?: string
}

const PRIMARY_VARIABLES = new Set(['x', 'y', 'z', 't'])
const CONSTANTS = new Set(['e', 'i', 'pi', 'infty', 'infinity', 'C'])
const MAX_LATEX_LENGTH = 4000
const FUNCTION_NAMES = new Set([
  'arccos', 'arcsin', 'arctan', 'arg', 'cos', 'cosh', 'cot', 'coth', 'csc',
  'deg', 'det', 'dim', 'exp', 'gcd', 'hom', 'inf', 'ker', 'lg', 'lim',
  'liminf', 'limsup', 'ln', 'log', 'max', 'min', 'mod', 'sec', 'sin',
  'sinh', 'sup', 'tan', 'tanh', 'trace',
])

const UNSAFE_PARAMETER_NAMES = new Set(['__proto__', 'prototype', 'constructor'])

// Only this allow-list of Greek symbol commands is semantic; formatting,
// operator, and structural TeX commands remain invisible to discovery.
const GREEK_PARAMETERS = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
  'theta', 'vartheta', 'iota', 'kappa', 'varkappa', 'lambda', 'mu', 'nu',
  'xi', 'omicron', 'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma',
  'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
])

const TEXT_COMMANDS = new Set(['mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'text', 'textrm', 'textbf', 'operatorname'])

const commandPattern = /\\([A-Za-z]+|.)/g
const identifierPattern = /[A-Za-z]+(?:_[A-Za-z0-9]+)?/g
const greekCharacterPattern = /[α-ωΑ-Ωϵϑϕϖϱςϵ]/g

const uniqueSorted = (names: string[]): string[] => [...new Set(names)].sort((left, right) => left.localeCompare(right))

/** Return a short, user-facing KaTeX error without leaking a long stack. */
const conciseError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  const cleaned = message.replace(/^KaTeX parse error:\s*/i, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return 'LaTeX could not be rendered.'
  return cleaned.length > 140 ? `${cleaned.slice(0, 137)}…` : cleaned
}

/** Validate one draft with the same renderer used by the canvas. */
export function validateLatex(latex: string): LatexValidation {
  if (typeof latex !== 'string') return { valid: false, error: 'LaTeX must be text.' }
  if (latex.length > MAX_LATEX_LENGTH) return { valid: false, error: `LaTeX is too long (maximum ${MAX_LATEX_LENGTH} characters).` }
  // Empty equations are valid while a newly created object is waiting for its
  // first keystroke. Tex renders this as an empty math span.
  if (latex.trim().length === 0) return { valid: true }
  try {
    katex.renderToString(latex, {
      displayMode: true,
      throwOnError: true,
      strict: false,
      output: 'htmlAndMathml',
    })
    return { valid: true }
  } catch (error) {
    return { valid: false, error: conciseError(error) }
  }
}

/** Boolean convenience for callers that only need to gate Save. */
export const isValidLatex = (latex: string): boolean => validateLatex(latex).valid

function stripTextGroups(latex: string): string {
  let result = latex
  // Text commands are presentation labels, not mathematical parameters. The
  // compact non-nested form covers the labels the editor can reasonably see.
  for (const command of TEXT_COMMANDS) {
    result = result.replace(new RegExp(`\\\\${command}\\s*\\{[^{}]*\\}`, 'g'), ' ')
  }
  return result
}

/**
 * Extract named symbols without pretending to understand expression grammar.
 * TeX commands, function names, primary graph variables, and constants are
 * omitted; one-letter and named Greek symbols are retained as controls.
 */
export function detectNamedParameters(latex: string): string[] {
  if (typeof latex !== 'string' || latex.length === 0 || latex.length > MAX_LATEX_LENGTH) return []

  const names: string[] = []
  let source = stripTextGroups(latex.replace(/%[^\n]*/g, ''))
  // Environment names (`bmatrix`, `aligned`, …) are syntax, not controls.
  source = source.replace(/\\(?:begin|end)\s*\{[^{}]*\}/g, ' ')
  const commands: string[] = []
  source = source.replace(commandPattern, (_match, command: string) => {
    if (command.length > 1) commands.push(command)
    return ' '
  })

  // Keep lowercase Greek command names as canonical ASCII chips. Case matters:
  // `\\gamma` is a variable, while uppercase `\\Gamma` is a function symbol.
  for (const command of commands) {
    if (GREEK_PARAMETERS.has(command) && command !== 'pi') names.push(command)
  }

  for (const identifier of source.match(identifierPattern) ?? []) {
    const lower = identifier.toLowerCase()
    if (UNSAFE_PARAMETER_NAMES.has(identifier) || PRIMARY_VARIABLES.has(lower) || CONSTANTS.has(identifier) || CONSTANTS.has(lower)) continue
    if (FUNCTION_NAMES.has(identifier) || FUNCTION_NAMES.has(lower)) continue
    // A subscript name is still one named control (`rate_0`), not two.
    names.push(identifier)
  }

  for (const character of source.match(greekCharacterPattern) ?? []) {
    if (character === character.toLowerCase() && character !== 'π') names.push(character)
  }

  return uniqueSorted(names)
}

// Friendly aliases keep the helper easy to discover for editor callers.
export const findExpressionParameters = detectNamedParameters
export const parseExpressionParameters = detectNamedParameters
