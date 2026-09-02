'use client'

import { useEffect, useState } from 'react'

/**
 * A rendered pointer for the film capture. Tab capture does not include the
 * OS cursor, so the page draws one at the real pointer position. It reads
 * pointer events only; it never generates them.
 */
export default function FilmCursor() {
  const [state, setState] = useState({ x: -100, y: -100, visible: false, pressed: false })

  useEffect(() => {
    const move = (event: PointerEvent) => setState((current) => ({ ...current, x: event.clientX, y: event.clientY, visible: true }))
    const down = () => setState((current) => ({ ...current, pressed: true }))
    const up = () => setState((current) => ({ ...current, pressed: false }))
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    return () => {
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
    }
  }, [])

  return (
    <div
      className={`film-cursor${state.visible ? ' is-visible' : ''}${state.pressed ? ' is-pressed' : ''}`}
      style={{ transform: `translate(${state.x - 2}px, ${state.y - 2}px)` }}
      aria-hidden="true"
    >
      <i />
      <svg viewBox="0 0 22 30"><path d="M2 2 L2 23 L7.5 18.2 L11.2 27 L15.2 25.3 L11.6 16.8 L19 16.4 Z" /></svg>
    </div>
  )
}
