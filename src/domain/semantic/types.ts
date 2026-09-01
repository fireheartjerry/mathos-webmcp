/** Canonical mathematical values shared by one or more visible views. */
export type SemanticEntity =
  | { id: string; kind: 'expression'; latex: string; parameters: Record<string, number> }
  | { id: string; kind: 'scalar'; name: string; value: number }
  | { id: string; kind: 'vector'; name: string; values: number[] }
  | { id: string; kind: 'matrix'; name: string; values: number[][] }
  | { id: string; kind: 'data'; columns: Record<string, number[]> }

export type SemanticBinding = {
  id: string
  source: { entityId: string; path: string }
  target: { objectId: string; path: string }
  forward: 'identity' | 'expression-parameter' | 'matrix-cell' | 'point-coordinate'
  inverse: 'identity' | 'expression-parameter' | 'matrix-cell' | 'point-coordinate' | null
}
