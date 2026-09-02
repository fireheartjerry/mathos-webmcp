'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { CreationOption } from './toolOptions'
import '../../styles/creation.css'

const GAP = 12

/** Panels that float over the canvas and paint above this popover. */
const FLOATING_CHROME = [
  '.progressive-inspector',
  '.object-context',
  '.activity-rail',
  '.zoom-controls',
  '.personal-project-navigator',
  '.webmcp-inspector',
  '.reconstruction-panel',
  '.agent-console',
  '.tool-toast',
  '.webmcp-trace',
  '.director-panel',
]

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
    const { width, height } = popover.getBoundingClientRect()

    // The canvas is the positioning parent, but chrome floats over it and draws
    // above this popover, so staying inside the canvas is not enough: the popover
    // also stays inside the viewport and clear of every panel docked over it.
    const minX = Math.max(GAP, GAP - parentRect.left)
    const minY = Math.max(GAP, GAP - parentRect.top)
    const maxX = Math.max(minX, Math.min(parentRect.width, window.innerWidth - parentRect.left) - width - GAP)
    const maxY = Math.max(minY, Math.min(parentRect.height, window.innerHeight - parentRect.top) - height - GAP)

    let x = Math.max(minX, Math.min(anchor.x + GAP, maxX))
    let y = Math.max(minY, Math.min(anchor.y + GAP, maxY))

    const obstacles = FLOATING_CHROME.flatMap((selector) => {
      const el = document.querySelector(selector)
      return el && el !== popover && !popover.contains(el) ? [el.getBoundingClientRect()] : []
    })
    // Lift above an obstacle where there is room, otherwise slide left of it.
    // Two passes settle the common case of the dock stacked over the zoom row.
    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of obstacles) {
        const left = x + parentRect.left
        const top = y + parentRect.top
        if (left + width + GAP <= obstacle.left || left >= obstacle.right + GAP) continue
        if (top + height + GAP <= obstacle.top || top >= obstacle.bottom + GAP) continue
        const lifted = obstacle.top - parentRect.top - height - GAP
        if (lifted >= minY) { y = Math.min(y, lifted); continue }
        const shifted = obstacle.left - parentRect.left - width - GAP
        if (shifted >= minX) x = Math.min(x, shifted)
      }
    }
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
