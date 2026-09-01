'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Tex } from '../../src/components/Tex'
import styles from './page.module.css'

const STORAGE_KEY = 'mathburst.handwriting.v1'
const CANVAS = { width: 1400, height: 360 }

type InkPoint = { x: number; y: number }
type StoredSample = {
  id: string
  label: string
  canvas: typeof CANVAS
  strokes: InkPoint[][]
  capturedAt: number
}
type StoredLibrary = { version: 1; samples: Record<string, StoredSample> }

const TASKS = [
  {
    id: 'opening-attempt',
    number: '01',
    eyebrow: 'Learner · original reasoning',
    title: 'Write the incorrect recurrence',
    latex: String.raw`\begin{aligned}\Gamma\!\left(\frac92\right)&=\int_0^\infty x^{7/2}e^{-x}\,dx\\&=\left[-x^{7/2}e^{-x}\right]_0^\infty-\frac72\Gamma\!\left(\frac72\right)\end{aligned}`,
    note: 'Two lines. Keep the mistaken minus exactly as shown—the Tutor needs something real to catch.',
  },
  {
    id: 'opening-correction',
    number: '02',
    eyebrow: 'Learner · correction',
    title: 'Write the repaired reduction',
    latex: String.raw`\begin{aligned}+\frac72\Gamma\!\left(\frac72\right)\\=\frac72\cdot\frac52\cdot\frac32\cdot\frac12\sqrt\pi=\frac{105}{16}\sqrt\pi\end{aligned}`,
    note: 'This enters after the Tutor mark. Let it feel like a quick correction, not calligraphy.',
  },
  {
    id: 'tutor-note',
    number: '03',
    eyebrow: 'Tutor · purple annotation',
    title: 'Write the diagnostic note',
    latex: String.raw`v=-e^{-x}.\quad\text{Two negatives.}`,
    note: 'Compact and slightly slanted is perfect. Mathburst will recolor this one purple.',
  },
] as const

function loadLibrary(): StoredLibrary {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredLibrary | null
    return parsed?.version === 1 && parsed.samples ? parsed : { version: 1, samples: {} }
  } catch {
    return { version: 1, samples: {} }
  }
}

function smoothPath(points: InkPoint[]): string {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0`
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]
    const next = points[index + 1]
    const middle = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
    path += ` Q ${point.x.toFixed(1)} ${point.y.toFixed(1)} ${middle.x.toFixed(1)} ${middle.y.toFixed(1)}`
  }
  const last = points.at(-1)!
  path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return path
}

export default function HandwritingStudioPage() {
  const [taskIndex, setTaskIndex] = useState(0)
  const [strokes, setStrokes] = useState<InkPoint[][]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [message, setMessage] = useState('Ready for your hand.')
  const svgRef = useRef<SVGSVGElement>(null)
  const activePointer = useRef<number | null>(null)
  const task = TASKS[taskIndex]

  useEffect(() => {
    const library = loadLibrary()
    setSavedIds(Object.keys(library.samples))
    setStrokes(library.samples[task.id]?.strokes ?? [])
  }, [task.id])

  const inkBounds = useMemo(() => {
    const points = strokes.flat()
    if (!points.length) return null
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    return {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    }
  }, [strokes])

  const localPoints = (event: ReactPointerEvent<SVGSVGElement>): InkPoint[] => {
    const rect = svgRef.current!.getBoundingClientRect()
    const native = event.nativeEvent
    const events = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native]
    return events.map((sample) => ({
      x: Math.min(CANVAS.width, Math.max(0, ((sample.clientX - rect.left) / rect.width) * CANVAS.width)),
      y: Math.min(CANVAS.height, Math.max(0, ((sample.clientY - rect.top) / rect.height) * CANVAS.height)),
    }))
  }

  const beginStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    activePointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setStrokes((current) => [...current, localPoints(event)])
    setMessage('Capturing vector ink…')
  }

  const continueStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return
    event.preventDefault()
    const additions = localPoints(event)
    setStrokes((current) => current.map((stroke, index) => (
      index === current.length - 1 ? [...stroke, ...additions] : stroke
    )))
  }

  const finishStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ }
    setMessage('Stroke smoothed. Keep going or undo the last stroke.')
  }

  const save = () => {
    const usefulStrokes = strokes.filter((stroke) => stroke.length > 1)
    if (!usefulStrokes.length) {
      setMessage('Write the reference before saving this plate.')
      return
    }
    const library = loadLibrary()
    library.samples[task.id] = {
      id: task.id,
      label: task.title,
      canvas: CANVAS,
      strokes: usefulStrokes,
      capturedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    setSavedIds(Object.keys(library.samples))
    if (taskIndex < TASKS.length - 1) {
      setMessage(`${task.title} saved. Loading the next plate…`)
      setTaskIndex((current) => current + 1)
    } else {
      setMessage('All three handwriting plates are saved to Mathburst.')
    }
  }

  const allSaved = TASKS.every((item) => savedIds.includes(item.id))

  return (
    <main className={styles.studio}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="Return to Mathburst">
          <span>∫</span><b>Mathburst</b>
        </a>
        <div className={styles.headerTitle}>
          <span>Capture utility</span>
          <h1>Human ink studio</h1>
        </div>
        <div className={styles.status} data-complete={allSaved}>
          <i /> {savedIds.length} / {TASKS.length} saved
        </div>
      </header>

      <section className={styles.workflow} aria-label="Handwriting capture progress">
        {TASKS.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={index === taskIndex}
            data-saved={savedIds.includes(item.id)}
            onClick={() => setTaskIndex(index)}
          >
            <b>{item.number}</b>
            <span>{item.title}</span>
            <i>{savedIds.includes(item.id) ? 'saved' : index === taskIndex ? 'active' : 'waiting'}</i>
          </button>
        ))}
      </section>

      <section className={styles.captureGrid}>
        <aside className={styles.reference}>
          <div className={styles.plateNumber}>{task.number}</div>
          <span className={styles.eyebrow}>{task.eyebrow}</span>
          <h2>{task.title}</h2>
          <div className={styles.latex} aria-label="LaTeX reference">
            <span>Reference · copy this structure</span>
            <Tex latex={task.latex} display ariaLabel={task.title} />
          </div>
          <p>{task.note}</p>
          <dl>
            <div><dt>Input</dt><dd>mouse or pen</dd></div>
            <div><dt>Output</dt><dd>smoothed SVG strokes</dd></div>
            <div><dt>Storage</dt><dd>this local session</dd></div>
          </dl>
        </aside>

        <div className={styles.canvasColumn}>
          <div className={styles.canvasHeader}>
            <div><span>Live plate</span><b>Write naturally—do not trace slowly</b></div>
            <div><span>{strokes.length}</span> strokes</div>
          </div>
          <svg
            ref={svgRef}
            className={styles.inkCanvas}
            viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
            role="img"
            aria-label={`Drawing canvas for ${task.title}`}
            onPointerDown={beginStroke}
            onPointerMove={continueStroke}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          >
            <defs>
              <pattern id="minor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1.2" className={styles.gridDot} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" className={styles.paper} />
            <rect width="100%" height="100%" fill="url(#minor-grid)" />
            <line x1="54" x2="1346" y1="286" y2="286" className={styles.baseline} />
            {strokes.map((stroke, index) => (
              <path key={index} d={smoothPath(stroke)} className={styles.inkStroke} />
            ))}
          </svg>

          <div className={styles.canvasFooter}>
            <p aria-live="polite">{message}</p>
            <span>{inkBounds ? `${Math.round(inkBounds.width)} × ${Math.round(inkBounds.height)} ink bounds` : 'blank plate'}</span>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.quietButton} onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={!strokes.length}>Undo stroke</button>
            <button type="button" className={styles.quietButton} onClick={() => { setStrokes([]); setMessage('Plate cleared.') }} disabled={!strokes.length}>Clear plate</button>
            <button type="button" className={styles.saveButton} onClick={save}>{taskIndex === TASKS.length - 1 ? 'Save final plate' : 'Save + next plate'} <span>→</span></button>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p><b>No font substitution.</b> Your captured points become real Mathburst ink objects; post-processing only smooths, crops, scales, and recolors them.</p>
        <a href="/" data-ready={allSaved}>{allSaved ? 'Return to Mathburst with real ink' : 'Return without finishing'}</a>
      </footer>
    </main>
  )
}
