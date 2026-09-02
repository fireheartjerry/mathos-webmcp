import type { ReactNode } from 'react'

export type SymbolPaletteItem = {
  label: string
  latex: string
  hint?: string
}

export type SymbolPaletteProps = {
  onInsert: (latex: string) => void
}

type SymbolGroup = {
  id: string
  label: string
  items: SymbolPaletteItem[]
}

const groups: SymbolGroup[] = [
  {
    id: 'fractions',
    label: 'Fractions',
    items: [
      { label: 'Fraction', latex: '\\frac{}{}', hint: '\\frac{}{}' },
      { label: 'Mixed fraction', latex: '\\frac{a}{b}', hint: '\\frac{a}{b}' },
    ],
  },
  {
    id: 'powers',
    label: 'Powers',
    items: [
      { label: 'Power', latex: '^{ }', hint: '^{ }' },
      { label: 'Subscript', latex: '_{ }', hint: '_{ }' },
    ],
  },
  {
    id: 'roots',
    label: 'Roots',
    items: [
      { label: 'Square root', latex: '\\sqrt{}', hint: '\\sqrt{}' },
      { label: 'Nth root', latex: '\\sqrt[n]{}', hint: '\\sqrt[n]{}' },
    ],
  },
  {
    id: 'calculus',
    label: 'Integrals & sums',
    items: [
      { label: 'Integral', latex: '\\int_{ }^{ }', hint: '\\int_{ }^{ }' },
      { label: 'Definite integral', latex: '\\int_{a}^{b}', hint: '\\int_{a}^{b}' },
      { label: 'Sum', latex: '\\sum_{i=1}^{n}', hint: '\\sum_{i=1}^{n}' },
      { label: 'Product', latex: '\\prod_{i=1}^{n}', hint: '\\prod_{i=1}^{n}' },
    ],
  },
  {
    id: 'greek',
    label: 'Greek',
    items: [
      { label: 'Alpha', latex: '\\alpha' },
      { label: 'Beta', latex: '\\beta' },
      { label: 'Gamma', latex: '\\gamma' },
      { label: 'Delta', latex: '\\Delta' },
      { label: 'Theta', latex: '\\theta' },
      { label: 'Lambda', latex: '\\lambda' },
      { label: 'Mu', latex: '\\mu' },
      { label: 'Pi', latex: '\\pi' },
      { label: 'Sigma', latex: '\\sigma' },
      { label: 'Omega', latex: '\\omega' },
    ],
  },
  {
    id: 'matrices',
    label: 'Matrices',
    items: [
      { label: '2 × 2 matrix', latex: '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}', hint: 'bmatrix' },
      { label: 'Matrix brackets', latex: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', hint: 'pmatrix' },
    ],
  },
  {
    id: 'geometry',
    label: 'Geometry',
    items: [
      { label: 'Angle', latex: '\\angle' },
      { label: 'Triangle', latex: '\\triangle' },
      { label: 'Perpendicular', latex: '\\perp' },
      { label: 'Parallel', latex: '\\parallel' },
      { label: 'Congruent', latex: '\\cong' },
      { label: 'Similar', latex: '\\sim' },
    ],
  },
]

const visualLabel: Record<string, string> = {
  Fraction: '½',
  'Mixed fraction': 'a⁄b',
  Power: 'xⁿ',
  Subscript: 'xₙ',
  'Square root': '√',
  'Nth root': 'ⁿ√',
  Integral: '∫',
  'Definite integral': '∫ₐᵇ',
  Sum: 'Σ',
  Product: 'Π',
  Alpha: 'α',
  Beta: 'β',
  Gamma: 'γ',
  Delta: 'Δ',
  Theta: 'θ',
  Lambda: 'λ',
  Mu: 'μ',
  Pi: 'π',
  Sigma: 'σ',
  Omega: 'ω',
  '2 × 2 matrix': '[ ]',
  'Matrix brackets': '( )',
  Angle: '∠',
  Triangle: '△',
  Perpendicular: '⊥',
  Parallel: '∥',
  Congruent: '≅',
  Similar: '∼',
}

const renderItem = (item: SymbolPaletteItem, onInsert: SymbolPaletteProps['onInsert']): ReactNode => (
  <button
    key={`${item.label}-${item.latex}`}
    type="button"
    className="editor-symbol-button"
    title={item.hint ?? item.latex}
    aria-label={`Insert ${item.label}`}
    data-latex={item.latex}
    onClick={() => onInsert(item.latex)}
  >
    <span aria-hidden="true">{visualLabel[item.label] ?? item.label}</span>
  </button>
)

export default function SymbolPalette({ onInsert }: SymbolPaletteProps) {
  return (
    <div className="editor-symbol-palette" aria-label="Visual symbol palette">
      {groups.map((group) => (
        <section key={group.id} className="editor-symbol-group" aria-labelledby={`editor-symbol-group-${group.id}`}>
          <h4 id={`editor-symbol-group-${group.id}`}>{group.label}</h4>
          <div className="editor-symbol-items">{group.items.map((item) => renderItem(item, onInsert))}</div>
        </section>
      ))}
    </div>
  )
}

export { groups as symbolPaletteGroups }
