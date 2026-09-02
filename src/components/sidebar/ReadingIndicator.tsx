'use client'

import type { CSSProperties } from 'react'
import '../../styles/sidebar.css'

export type ReadingRect = { top: number; left: number; width: number; height: number }

/**
 * A non-interactive purple glow around the canvas while the Tutor reads. By
 * default it covers the canvas area (below the 54px header, right of the 58px
 * rail); pass `rect` to match a measured element instead. Fades over 220 ms.
 */
export default function ReadingIndicator({
  active,
  label = 'Tutor is reading',
  rect,
}: {
  active: boolean
  label?: string
  rect?: ReadingRect
}) {
  const style: CSSProperties | undefined = rect
    ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, right: 'auto', bottom: 'auto' }
    : undefined
  const [head, ...tail] = label.split(' · ')
  return (
    <div className={`reading-indicator${active ? ' is-active' : ''}`} style={style} aria-hidden={!active}>
      <span className="reading-indicator-label" role={active ? 'status' : undefined}>
        <i aria-hidden />
        <span>{head}</span>
        {tail.length > 0 && <b>{tail.join(' · ')}</b>}
      </span>
    </div>
  )
}
