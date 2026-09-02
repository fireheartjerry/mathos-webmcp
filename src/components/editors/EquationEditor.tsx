import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { detectNamedParameters, validateLatex } from '../../domain/semantic/expression'
import type { EquationObject } from '../../domain/world/types'
import { Tex } from '../Tex'
import SymbolPalette from './SymbolPalette'

export type EquationEditorProps = {
  object: EquationObject
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  /** Canonical expression values already present in the world. */
  parameterValues?: Record<string, number>
  /** Adds a missing named parameter through one atomic world action. */
  onAddParameter?: (name: string) => void
}

type EquationMode = 'visual' | 'raw'

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

export default function EquationEditor({
  object,
  value,
  onChange,
  onSave,
  onCancel,
  parameterValues = {},
  onAddParameter,
}: EquationEditorProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [mode, setMode] = useState<EquationMode>('visual')
  const validation = useMemo(() => validateLatex(value), [value])
  const parameters = useMemo(() => detectNamedParameters(value), [value])

  const insertAtCaret = (inserted: string) => {
    const field = textAreaRef.current
    const start = field?.selectionStart ?? value.length
    const end = field?.selectionEnd ?? start
    const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`
    onChange(next)
    const caret = start + inserted.length
    // React applies the controlled value on the next render. Restore the
    // selection after that render so consecutive palette clicks stay at the
    // insertion point rather than jumping to the end.
    const restore = () => {
      const current = textAreaRef.current
      if (!current) return
      current.focus()
      current.setSelectionRange(caret, caret)
    }
    if (typeof window === 'undefined') restore()
    else window.requestAnimationFrame(restore)
  }

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      if (validation.valid) onSave()
    }
  }

  return (
    <div className="editor editor-equation" data-editor-kind="equation" data-valid={validation.valid}>
      <div className="editor-mode-switch" role="tablist" aria-label="Equation input mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'visual'}
          onClick={() => setMode('visual')}
        >
          Visual symbols
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'raw'}
          onClick={() => setMode('raw')}
        >
          Raw LaTeX
        </button>
      </div>

      {mode === 'visual' && <SymbolPalette onInsert={insertAtCaret} />}

      <label className="editor-equation-input">
        <span>{mode === 'raw' ? 'Raw LaTeX' : 'Expression'}</span>
        <textarea
          ref={textAreaRef}
          autoFocus
          rows={3}
          value={value}
          spellCheck={false}
          aria-label="Equation LaTeX"
          aria-invalid={!validation.valid}
          placeholder="e.g. \\frac{1}{2}mv^2"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onTextKeyDown}
        />
      </label>

      <div className="editor-equation-preview" aria-live="polite">
        <span className="editor-control-label">Preview</span>
        {validation.valid ? (
          <div className="editor-equation-preview-math"><Tex latex={value} display ariaLabel={value || 'Empty equation'} /></div>
        ) : (
          <div className="editor-equation-error" role="alert">{validation.error ?? 'Invalid LaTeX.'}</div>
        )}
      </div>

      <div className="editor-parameter-section" aria-label="Equation parameters">
        <div className="editor-parameter-heading">
          <span className="editor-control-label">Parameters</span>
          {parameters.length === 0 && <small>No named parameters detected</small>}
        </div>
        {parameters.length > 0 && (
          <div className="editor-parameter-chips">
            {parameters.map((name) => {
              const existing = parameterValues[name]
              const missing = !hasOwn(parameterValues, name)
              return (
                <span key={name} className={`editor-parameter-chip${missing ? ' is-missing' : ''}`}>
                  <code>{name}</code>
                  {missing ? (
                    <button
                      type="button"
                      disabled={!onAddParameter}
                      onClick={() => onAddParameter?.(name)}
                    >
                      Add control
                    </button>
                  ) : (
                    <small>{Number.isFinite(existing) ? existing : 'controlled'}</small>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {!validation.valid && <p className="editor-equation-hint">Fix the expression before saving.</p>}
    </div>
  )
}

export { EquationEditor }
