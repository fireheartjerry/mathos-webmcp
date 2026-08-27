/**
 * Parsing and the input contract.
 *
 * Everything a learner or an agent types passes through `parseExpression` before any
 * other part of the system sees it. The Compute Engine is permissive by design - it
 * will happily accept `x^^2` as `Power(x, 2)`, read `""` as `Nothing`, and evaluate
 * `1/0` to `ComplexInfinity`. None of those should reach a verifier, so the guards
 * below are not defensive decoration; each one closes a false-acceptance route that
 * was observed in testing.
 */

import { ComputeEngine } from '@cortex-js/compute-engine'
import type { BoxedExpression } from '@cortex-js/compute-engine'

export const MAX_INPUT_CHARS = 256
export const MAX_AST_NODES = 400
export const MAX_AST_DEPTH = 24

/** One engine per page. Constructing it is expensive; parsing on it is not. */
let engine: ComputeEngine | undefined
export function computeEngine(): ComputeEngine {
  if (!engine) engine = new ComputeEngine()
  return engine
}

export type ParseFailureCode =
  | 'empty'
  | 'too_long'
  | 'too_complex'
  | 'parse_error'
  | 'unknown_symbol'
  | 'unsupported_value'

export type ParseResult =
  | { ok: true; expr: BoxedExpression; variables: string[] }
  | { ok: false; code: ParseFailureCode; message: string }

/** Symbols that parse cleanly but must never reach a verifier. */
const FORBIDDEN_SYMBOLS = new Set([
  'PositiveInfinity',
  'NegativeInfinity',
  'ComplexInfinity',
  'NaN',
  'Nothing',
  'Undefined',
])

const ALLOWED_CONSTANTS = new Set(['Pi', 'ExponentialE'])

function measure(json: unknown, depth = 0): { nodes: number; depth: number } {
  if (depth > MAX_AST_DEPTH) return { nodes: Number.POSITIVE_INFINITY, depth }
  if (!Array.isArray(json)) return { nodes: 1, depth }
  let nodes = 1
  let deepest = depth
  for (const child of json.slice(1)) {
    const inner = measure(child, depth + 1)
    nodes += inner.nodes
    if (inner.depth > deepest) deepest = inner.depth
    if (nodes > MAX_AST_NODES) return { nodes: Number.POSITIVE_INFINITY, depth: deepest }
  }
  return { nodes, depth: deepest }
}

/** Collects leaf symbols. Operator heads sit at index 0 and are skipped. */
function collectSymbols(json: unknown, found = new Set<string>()): Set<string> {
  if (typeof json === 'string') {
    found.add(json)
    return found
  }
  if (Array.isArray(json)) for (const child of json.slice(1)) collectSymbols(child, found)
  return found
}

/**
 * @param latex   the raw string a learner or agent supplied
 * @param allowedVariables  the variables this problem declares. Anything else is a
 *                          typo or an attempt to smuggle in a free symbol, and both
 *                          should be reported rather than silently evaluated.
 */
export function parseExpression(latex: unknown, allowedVariables: readonly string[]): ParseResult {
  if (typeof latex !== 'string') {
    return { ok: false, code: 'empty', message: 'Enter an expression.' }
  }
  const trimmed = latex.trim()
  if (!trimmed) {
    return { ok: false, code: 'empty', message: 'Enter an expression.' }
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return { ok: false, code: 'too_long', message: `Keep this under ${MAX_INPUT_CHARS} characters.` }
  }

  let expr: BoxedExpression
  try {
    expr = computeEngine().parse(trimmed)
  } catch {
    return { ok: false, code: 'parse_error', message: 'That expression could not be read.' }
  }
  if (!expr || !expr.isValid) {
    return { ok: false, code: 'parse_error', message: 'That expression could not be read.' }
  }

  const json = expr.json
  // The engine reports errors as nodes inside an otherwise "valid" tree.
  if (JSON.stringify(json).includes('"Error"')) {
    return { ok: false, code: 'parse_error', message: 'That expression could not be read.' }
  }

  if (!Number.isFinite(measure(json).nodes)) {
    return { ok: false, code: 'too_complex', message: 'That expression is too long to check.' }
  }

  const symbols = collectSymbols(json)
  for (const symbol of symbols) {
    if (FORBIDDEN_SYMBOLS.has(symbol)) {
      return {
        ok: false,
        code: 'unsupported_value',
        message: 'Infinite or undefined values are not supported here.',
      }
    }
    if (ALLOWED_CONSTANTS.has(symbol)) continue
    // Capitalised heads are MathJSON operators that survived into a leaf position.
    if (/^[A-Z]/.test(symbol)) continue
    if (!allowedVariables.includes(symbol)) {
      const list = allowedVariables.join(', ')
      return {
        ok: false,
        code: 'unknown_symbol',
        message: `This problem only uses ${list}. Found "${symbol}".`,
      }
    }
  }

  return {
    ok: true,
    expr,
    variables: [...symbols].filter((s) => allowedVariables.includes(s)),
  }
}
