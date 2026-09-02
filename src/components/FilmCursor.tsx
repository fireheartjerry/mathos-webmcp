'use client'

import { useEffect, useState } from 'react'
import '../styles/handles.css'

/**
 * A rendered pointer for the film capture. Tab capture does not include the
 * OS cursor, so the page draws one at the real pointer position. It reads
 * pointer events only; it never generates them.
 *
 * The arrow is 20px tall with its tip at the pointer; a click pulses a 22px
 * ring from the tip for 260 ms (styles in handles.css).
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
      style={{ transform: `translate(${state.x - 3}px, ${state.y - 2}px)` }}
      aria-hidden="true"
    >
      <i />
      <svg viewBox="0 0 20 20">
        <path d="M3 2 L3 16.6 L6.8 13.2 L9.3 18.6 L12 17.4 L9.6 12.2 L14.6 12 Z" />
      </svg>
    </div>
  )
}
