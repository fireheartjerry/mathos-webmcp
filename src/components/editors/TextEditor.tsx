import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { TextObject } from '../../domain/world/types'

export type TextEditorProps = {
  object: TextObject
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  /** Style changes are committed as one normal world patch per control. */
  onPatchObject?: (id: string, patch: Record<string, unknown>, summary?: string) => void
}

type TextAlignment = NonNullable<TextObject['textAlign']>

const alignmentOptions: Array<{ value: TextAlignment; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const finiteDraft = (raw: string): number | null => {
  const value = Number(raw.trim())
  return raw.trim() && Number.isFinite(value) ? value : null
}

const formatNumber = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

const colorForInput = (color: string): string => /^#[0-9a-f]{6}$/i.test(color) || /^#[0-9a-f]{3}$/i.test(color) ? color : '#171713'

export default function TextEditor({ object, value, onChange, onSave, onCancel, onPatchObject }: TextEditorProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const widthRef = useRef<HTMLInputElement | null>(null)
  const fontSizeRef = useRef<HTMLInputElement | null>(null)
  const cancelWidthBlur = useRef(false)
  const cancelFontSizeBlur = useRef(false)
  const [widthDraft, setWidthDraft] = useState(() => formatNumber(object.bounds.width))
  const [fontSizeDraft, setFontSizeDraft] = useState(() => formatNumber(object.fontSize))
  const [widthFocused, setWidthFocused] = useState(false)
  const [fontSizeFocused, setFontSizeFocused] = useState(false)

  useEffect(() => {
    const field = textAreaRef.current
    if (!field) return
    field.focus()
    // A newly created empty field should show a real caret. For an existing
    // object, moving the caret to the end is predictable after double-click
    // opens the inspector and does not destroy the user's draft.
    const caret = value.length
    field.setSelectionRange(caret, caret)
  }, [object.id])

  useEffect(() => {
    if (!widthFocused) setWidthDraft(formatNumber(object.bounds.width))
  }, [object.bounds.width, object.id, widthFocused])

  useEffect(() => {
    if (!fontSizeFocused) setFontSizeDraft(formatNumber(object.fontSize))
  }, [fontSizeFocused, object.fontSize, object.id])

  const patch = (next: Record<string, unknown>, summary: string) => {
    onPatchObject?.(object.id, next, summary)
  }

  const commitWidth = () => {
    const parsed = finiteDraft(widthDraft)
    if (parsed === null || parsed <= 0) {
      setWidthDraft(formatNumber(object.bounds.width))
      return
    }
    const width = Math.max(1, parsed)
    setWidthDraft(formatNumber(width))
    if (!Object.is(width, object.bounds.width)) {
      patch({ bounds: { ...object.bounds, width } }, 'Changed text width')
    }
  }

  const commitFontSize = () => {
    const parsed = finiteDraft(fontSizeDraft)
    if (parsed === null || parsed <= 0) {
      setFontSizeDraft(formatNumber(object.fontSize))
      return
    }
    const fontSize = Math.max(1, parsed)
    setFontSizeDraft(formatNumber(fontSize))
    if (!Object.is(fontSize, object.fontSize)) {
      patch({ fontSize }, 'Changed text font size')
    }
  }

  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onSave()
    }
  }

  const onNumericKeyDown = (event: KeyboardEvent<HTMLInputElement>, commit: () => void, cancel: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      event.currentTarget.blur()
    }
  }

  return (
    <div className="editor editor-text" data-editor-kind="text">
      <textarea
        ref={textAreaRef}
        autoFocus
        rows={3}
        value={value}
        spellCheck={false}
        aria-label="Text content"
        placeholder="Write something…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onTextKeyDown}
      />

      <div className="editor-control-row editor-alignment-control" role="group" aria-label="Text alignment">
        <span className="editor-control-label">Align</span>
        <div className="editor-segmented-control">
          {alignmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={`Align text ${option.value}`}
              aria-pressed={(object.textAlign ?? 'left') === option.value}
              disabled={!onPatchObject}
              onClick={() => patch({ textAlign: option.value }, `Aligned text ${option.value}`)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-control-grid">
        <label className="editor-control-field">
          <span>Width</span>
          <input
            ref={widthRef}
            type="text"
            inputMode="decimal"
            value={widthDraft}
            aria-label="Text width"
            onFocus={() => setWidthFocused(true)}
            onChange={(event) => setWidthDraft(event.target.value)}
            onBlur={() => {
              setWidthFocused(false)
              if (cancelWidthBlur.current) {
                cancelWidthBlur.current = false
                setWidthDraft(formatNumber(object.bounds.width))
              } else commitWidth()
            }}
            onKeyDown={(event) => onNumericKeyDown(event, commitWidth, () => {
              cancelWidthBlur.current = true
              setWidthDraft(formatNumber(object.bounds.width))
            })}
          />
        </label>
        <label className="editor-control-field">
          <span>Font size</span>
          <input
            ref={fontSizeRef}
            type="text"
            inputMode="decimal"
            value={fontSizeDraft}
            aria-label="Text font size"
            onFocus={() => setFontSizeFocused(true)}
            onChange={(event) => setFontSizeDraft(event.target.value)}
            onBlur={() => {
              setFontSizeFocused(false)
              if (cancelFontSizeBlur.current) {
                cancelFontSizeBlur.current = false
                setFontSizeDraft(formatNumber(object.fontSize))
              } else commitFontSize()
            }}
            onKeyDown={(event) => onNumericKeyDown(event, commitFontSize, () => {
              cancelFontSizeBlur.current = true
              setFontSizeDraft(formatNumber(object.fontSize))
            })}
          />
        </label>
        <label className="editor-control-field editor-color-field">
          <span>Color</span>
          <span className="editor-color-input-wrap">
            <input
              type="color"
              value={colorForInput(object.color)}
              aria-label="Text color"
              disabled={!onPatchObject}
              onChange={(event) => patch({ color: event.target.value }, 'Changed text color')}
            />
            <code>{object.color}</code>
          </span>
        </label>
      </div>

      <div className="editor-control-row editor-presentation-control" role="group" aria-label="Text presentation">
        <span className="editor-control-label">Style</span>
        <div className="editor-segmented-control">
          <button
            type="button"
            aria-label="Use typed text"
            aria-pressed={(object.presentation ?? 'typed') === 'typed'}
            disabled={!onPatchObject}
            onClick={() => patch({ presentation: 'typed' }, 'Set text presentation to typed')}
          >
            Typed
          </button>
          <button
            type="button"
            aria-label="Use handwritten text"
            aria-pressed={object.presentation === 'handwritten'}
            disabled={!onPatchObject}
            onClick={() => patch({ presentation: 'handwritten' }, 'Set text presentation to handwritten')}
          >
            Handwritten
          </button>
        </div>
      </div>
    </div>
  )
}

export { TextEditor }
