'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: anchor.x + 12, y: anchor.y + 12 })

  useLayoutEffect(() => {
    const popover = popoverRef.current
    const parent = popover?.offsetParent instanceof HTMLElement ? popover.offsetParent : popover?.parentElement
    if (!popover || !parent) return
    const parentRect = parent.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const maxX = Math.max(12, parentRect.width - popoverRect.width - 12)
    const maxY = Math.max(12, parentRect.height - popoverRect.height - 12)
    const x = Math.max(12, Math.min(anchor.x + 12, maxX))
    const y = Math.max(12, Math.min(anchor.y + 12, maxY))
    setPosition((current) => current.x === x && current.y === y ? current : { x, y })
  }, [anchor.x, anchor.y])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ;(firstEnabledRef.current ?? cancelRef.current)?.focus()
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
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onCancel])

  const style: CSSProperties = {
    left: position.x,
    top: position.y,
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
      aria-modal="false"
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
      <button ref={cancelRef} type="button" className="creation-popover-cancel" onClick={onCancel}>Cancel <kbd>Esc</kbd></button>
    </div>
  )
}
