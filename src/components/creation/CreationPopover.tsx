'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CreationOption } from './toolOptions'
import '../../styles/creation.css'

export default function CreationPopover<T extends string>({
  title,
  description,
  anchor,
  options,
  onSelect,
  onCancel,
}: {
  title: string
  description?: string
  anchor: { x: number; y: number }
  options: CreationOption<T>[]
  onSelect: (option: T) => void
  onCancel: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const firstEnabledRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstEnabledRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onCancel])

  const style: CSSProperties = {
    left: anchor.x + 12,
    top: anchor.y + 12,
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      ref={popoverRef}
      className="creation-popover"
      role="dialog"
      aria-label={title}
      data-canvas-control="true"
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="creation-popover-header">
        <div>
          <span className="creation-popover-kicker">native creation</span>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" className="creation-popover-close" aria-label="Cancel creation" onClick={onCancel}>×</button>
      </div>
      <div className="creation-popover-options">
        {options.map((option, index) => (
          <button
            key={option.id}
            ref={index === options.findIndex((candidate) => !candidate.disabled) ? firstEnabledRef : undefined}
            type="button"
            className="creation-option"
            disabled={option.disabled}
            onKeyDown={handleKeyDown}
            onClick={() => onSelect(option.id)}
          >
            <span>{option.label}</span>
            {option.disabledLabel && <small>{option.disabledLabel}</small>}
            {!option.disabled && option.description && <small>{option.description}</small>}
          </button>
        ))}
      </div>
      <button type="button" className="creation-popover-cancel" onClick={onCancel}>Cancel <kbd>Esc</kbd></button>
    </div>
  )
}
