'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  MATRIX_MAX_SIZE,
  MATRIX_MIN_SIZE,
  applyMatrix,
  canMultiply,
  cloneMatrix,
  determinant,
  eigenpairs2x2,
  eigenvalues2x2,
  identity,
  isSquare,
  matrixColumns,
  matrixDimensions,
  multiplyMatrices,
  rotateMatrix2x2,
  roundMatrix,
  scaleMatrix,
  trace,
  transformVectors,
  transpose,
  type MatrixValues,
} from '../domain/math/matrix'
import type { MatrixObject, Point, WorldAction, WorldState } from '../domain/world/types'
import { revealDash, revealItem, revealLerp, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumbers } from './useTweenedNumber'
import '../styles/matrix.css'
import '../styles/reveal.css'

const TOOLBAR_HEIGHT = 34
const SIDE_WIDTH = 150
const GRID_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
const MORPH_MS = 320
const FLASH_MS = 600

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '—'
  return String(Number(value.toFixed(2)))
}
const cellKey = (row: number, column: number) => `${row}-${column}`

const stopCanvas = (event: ReactPointerEvent<HTMLElement>) => { if (event.button !== 2) event.stopPropagation() }

/** Cells whose committed value changed since the previous values, each flashing for FLASH_MS. */
function useCellFlashes(values: MatrixValues): Set<string> {
  const [flashing, setFlashing] = useState<Set<string>>(() => new Set())
  const previous = useRef<MatrixValues | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => {
    const before = previous.current
    previous.current = values
    if (!before) return
    const changed: string[] = []
    values.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      if (before[rowIndex]?.[columnIndex] !== value) changed.push(cellKey(rowIndex, columnIndex))
    }))
    if (changed.length === 0) return
    setFlashing((current) => new Set([...current, ...changed]))
    timers.current.push(window.setTimeout(() => {
      setFlashing((current) => {
        const next = new Set(current)
        for (const key of changed) next.delete(key)
        return next
      })
    }, FLASH_MS))
  }, [values])
  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)) }, [])
  return flashing
}

/**
 * One editable entry. Local draft text; commits on Enter, blur, and Tab (via
 * blur). Arrow up/down nudge the value by 0.1 (Shift: 1) with a live preview
 * and commit once on key release.
 */
function MatrixCell({
  row,
  column,
  value,
  flash,
  inputRef,
  onCommit,
  onMove,
  onNudge,
  onNudgeEnd,
}: {
  row: number
  column: number
  value: number
  flash: boolean
  inputRef: (element: HTMLInputElement | null) => void
  onCommit: (row: number, column: number, value: number) => void
  onMove: (row: number, column: number, dr: number, dc: number) => void
  onNudge: (row: number, column: number, value: number) => void
  onNudgeEnd: () => void
}) {
  const [text, setText] = useState(() => formatNumber(value))
  const elementRef = useRef<HTMLInputElement | null>(null)
  const nudging = useRef(false)

  useEffect(() => {
    if (nudging.current || typeof document === 'undefined' || document.activeElement !== elementRef.current) setText(formatNumber(value))
  }, [value])

  const commit = () => {
    const parsed = Number(text)
    if (text.trim() === '' || !Number.isFinite(parsed)) {
      setText(formatNumber(value))
      return
    }
    onCommit(row, column, parsed)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); commit(); return }
    if (event.key === 'Escape') { event.preventDefault(); setText(formatNumber(value)); elementRef.current?.blur(); return }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const base = Number(text)
      const step = (event.shiftKey ? 1 : 0.1) * (event.key === 'ArrowUp' ? 1 : -1)
      const next = Number(((Number.isFinite(base) ? base : value) + step).toFixed(3))
      nudging.current = true
      setText(formatNumber(next))
      onNudge(row, column, next)
      return
    }
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const move = moves[event.key]
    if (!move) return
    const input = elementRef.current
    // Left/right only leave the cell when the caret is already at the edge.
    if (input) {
      const at = input.selectionStart
      const length = input.value.length
      if (at !== null && ((move[1] < 0 && at > 0) || (move[1] > 0 && at < length))) return
    }
    event.preventDefault()
    onMove(row, column, move[0], move[1])
  }
  const onKeyUp = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && nudging.current) {
      nudging.current = false
      onNudgeEnd()
    }
  }

  return (
    <input
      ref={(element) => { elementRef.current = element; inputRef(element) }}
      type="number"
      step="0.1"
      inputMode="decimal"
      value={text}
      className={flash ? 'is-flash' : undefined}
      aria-label={`Matrix entry row ${row + 1}, column ${column + 1}`}
      data-canvas-control="true"
      onPointerDown={stopCanvas}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => { if (nudging.current) { nudging.current = false; onNudgeEnd() } else commit() }}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    />
  )
}

/** A small number input for the popovers; commits through the surrounding form. */
function PopoverNumber({ value, label, onChange, step = 'any' }: { value: string; label: string; onChange: (text: string) => void; step?: number | 'any' }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => event.target.select()}
    />
  )
}

type PopoverMode = 'multiply' | 'scale' | 'rotate'

/** Multiply-by-B, scale and rotate all live in one popover under the header. */
function OperationPopover({ mode, values, onApply, onClose }: {
  mode: PopoverMode
  values: MatrixValues
  onApply: (summary: string, next: MatrixValues) => void
  onClose: () => void
}) {
  const { columns } = matrixDimensions(values)
  const [bColumns, setBColumns] = useState(columns)
  const [b, setB] = useState<string[][]>(() => identity(columns, columns).map((row) => row.map(String)))
  const [k, setK] = useState('2')
  const [theta, setTheta] = useState('45')
  const rootRef = useRef<HTMLFormElement>(null)
  useEffect(() => { rootRef.current?.querySelector<HTMLInputElement>('input')?.focus() }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const resizeB = (next: number) => {
    const size = Math.min(MATRIX_MAX_SIZE, Math.max(MATRIX_MIN_SIZE, next))
    setBColumns(size)
    setB(Array.from({ length: columns }, (_, row) => Array.from({ length: size }, (_, column) => b[row]?.[column] ?? (row === column ? '1' : '0'))))
  }
  const parsedB = b.map((row) => row.map((entry) => Number(entry)))
  const bValid = parsedB.every((row) => row.every(Number.isFinite)) && canMultiply(values, parsedB)
  const kValue = Number(k)
  const thetaValue = Number(theta)
  const valid = mode === 'multiply' ? bValid : mode === 'scale' ? Number.isFinite(kValue) : Number.isFinite(thetaValue)

  const apply = () => {
    if (!valid) return
    if (mode === 'multiply') onApply('Multiplied by B', roundMatrix(multiplyMatrices(values, parsedB)))
    else if (mode === 'scale') onApply(`Scaled matrix by ${formatNumber(kValue)}`, scaleMatrix(values, kValue))
    else onApply(`Rotated matrix by ${formatNumber(thetaValue)}°`, rotateMatrix2x2(values, thetaValue))
    onClose()
  }

  return (
    <form
      ref={rootRef}
      className="matrix-popover"
      data-canvas-control="true"
      aria-label={mode === 'multiply' ? 'Multiply by a matrix B' : mode === 'scale' ? 'Scale the matrix' : 'Rotate the matrix'}
      onPointerDown={stopCanvas}
      onDoubleClick={(event) => event.stopPropagation()}
      onSubmit={(event) => { event.preventDefault(); apply() }}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); apply() } }}
    >
      {mode === 'multiply' && (
        <>
          <div className="matrix-popover-head">
            <span>A · B, B is {columns}×{bColumns}</span>
            <span className="matrix-popover-size">
              <button type="button" title="Fewer columns in B" disabled={bColumns <= MATRIX_MIN_SIZE} onClick={() => resizeB(bColumns - 1)}>−</button>
              <button type="button" title="More columns in B" disabled={bColumns >= MATRIX_MAX_SIZE} onClick={() => resizeB(bColumns + 1)}>+</button>
            </span>
          </div>
          <div className="matrix-popover-grid" style={{ gridTemplateColumns: `repeat(${bColumns}, 46px)` }}>
            {b.map((row, rowIndex) => row.map((entry, columnIndex) => (
              <PopoverNumber
                key={cellKey(rowIndex, columnIndex)}
                label={`B entry row ${rowIndex + 1}, column ${columnIndex + 1}`}
                value={entry}
                step={0.1}
                onChange={(text) => setB((current) => current.map((r, ri) => (ri === rowIndex ? r.map((c, ci) => (ci === columnIndex ? text : c)) : r)))}
              />
            )))}
          </div>
        </>
      )}
      {mode === 'scale' && (
        <label className="matrix-popover-row">
          <span>k · A, k =</span>
          <PopoverNumber label="Scale factor k" value={k} onChange={setK} step={0.1} />
        </label>
      )}
      {mode === 'rotate' && (
        <label className="matrix-popover-row">
          <span>R(θ) · A, θ =</span>
          <PopoverNumber label="Rotation angle in degrees" value={theta} onChange={setTheta} step={5} />
          <span>°</span>
        </label>
      )}
      <div className="matrix-popover-actions">
        <button type="button" onClick={onClose}>cancel</button>
        <button type="submit" className="is-primary" disabled={!valid}>apply</button>
      </div>
    </form>
  )
}

export default function MatrixPlane({ object, world, run }: { object: MatrixObject; world: WorldState; run: (action: WorldAction) => void }) {
  const width = Math.max(260, object.bounds.width)
  const height = Math.max(200, object.bounds.height)
  const { rows, columns } = matrixDimensions(object.values)
  const isTwoByTwo = rows === 2 && columns === 2

  // Live values while a basis vector is dragged or a cell is nudged; null otherwise.
  const [draft, setDraft] = useState<MatrixValues | null>(null)
  const values = draft ?? object.values
  useEffect(() => { setDraft(null) }, [object.values])
  const [popover, setPopover] = useState<PopoverMode | null>(null)
  useEffect(() => { if (popover === 'rotate' && !isTwoByTwo) setPopover(null) }, [popover, isTwoByTwo])

  // The plane, lattice, vectors and readouts draw from tweened entries so a
  // committed change morphs from the previous map; a drag or nudge snaps.
  const flat = useMemo(() => values.flat(), [values])
  const tweened = useTweenedNumbers(flat, draft ? 0 : MORPH_MS)
  const shown = useMemo<MatrixValues>(() => {
    if (tweened.length !== flat.length) return values
    return values.map((row, rowIndex) => row.map((_, columnIndex) => tweened[rowIndex * columns + columnIndex]))
  }, [tweened, flat.length, values, columns])
  const cellFlashes = useCellFlashes(object.values)

  const inputs = useRef(new Map<string, HTMLInputElement>())
  const registerInput = (row: number, column: number) => (element: HTMLInputElement | null) => {
    const key = cellKey(row, column)
    if (element) inputs.current.set(key, element)
    else inputs.current.delete(key)
  }

  const put = (summary: string, next: MatrixValues) => {
    run({ id: crypto.randomUUID(), source: 'human', summary, operations: [{ type: 'put', object: { ...object, values: next } }] })
  }

  const commitCell = (row: number, column: number, value: number) => {
    if (object.values[row]?.[column] === value) return
    const next = cloneMatrix(object.values)
    next[row][column] = value
    put(`Edited matrix cell (${row + 1},${column + 1})`, next)
  }
  const nudgeCell = (row: number, column: number, value: number) => {
    setDraft((current) => {
      const next = cloneMatrix(current ?? object.values)
      next[row][column] = value
      return next
    })
  }
  const endNudge = () => {
    if (!draft) return
    const changed = draft.findIndex((row, rowIndex) => row.some((value, columnIndex) => value !== object.values[rowIndex]?.[columnIndex]))
    if (changed < 0) { setDraft(null); return }
    const column = draft[changed].findIndex((value, columnIndex) => value !== object.values[changed]?.[columnIndex])
    put(`Edited matrix cell (${changed + 1},${column + 1})`, draft)
  }

  const moveFocus = (row: number, column: number, dr: number, dc: number) => {
    const target = inputs.current.get(cellKey(Math.min(rows - 1, Math.max(0, row + dr)), Math.min(columns - 1, Math.max(0, column + dc))))
    target?.focus()
    target?.select()
  }

  const resize = (nextRows: number, nextColumns: number) => {
    if (nextRows < MATRIX_MIN_SIZE || nextRows > MATRIX_MAX_SIZE || nextColumns < MATRIX_MIN_SIZE || nextColumns > MATRIX_MAX_SIZE) return
    const next = Array.from({ length: nextRows }, (_, row) => Array.from({ length: nextColumns }, (_, column) => object.values[row]?.[column] ?? (row === column ? 1 : 0)))
    put(`Resized matrix to ${nextRows}×${nextColumns}`, next)
  }

  const square = isSquare(shown)
  // det and tr are read from the tweened entries, so they glide with the lattice.
  const det = square ? determinant(shown) : Number.NaN
  const tr = square ? trace(shown) : Number.NaN
  const eig = isTwoByTwo ? eigenvalues2x2(shown) : null

  // ---- staged reveal: lattice → basis vectors → readouts (see TwoByTwoPlane for the plot) --
  const p = revealProgress(object)
  const revealing = p < 1
  const toolbarT = revealStage(p, 0, 0.2)
  const gridT = revealStage(p, 0, isTwoByTwo ? 0.3 : 0.5)
  const readoutT = revealStage(p, isTwoByTwo ? 0.85 : 0.5, 1)
  const rootClass = `matrix-plane matrix-widget reveal-root${revealing ? ' is-revealing' : ''}${draft ? ' is-dragging' : ''}`
  const rootStyle = revealing ? { opacity: object.opacity } : undefined

  const toolbar = (
    <header className="matrix-toolbar reveal-fade" data-canvas-control="true" onPointerDown={stopCanvas} onDoubleClick={(event) => event.stopPropagation()} style={{ opacity: toolbarT }}>
      <span className="matrix-kicker-text">matrix</span>
      <span className="matrix-title">A</span>
      <div className="matrix-actions" role="toolbar" aria-label="Matrix operations">
        <button type="button" title="Add row" disabled={rows >= MATRIX_MAX_SIZE} onClick={() => resize(rows + 1, columns)}>+r</button>
        <button type="button" title="Remove row" disabled={rows <= MATRIX_MIN_SIZE} onClick={() => resize(rows - 1, columns)}>−r</button>
        <button type="button" title="Add column" disabled={columns >= MATRIX_MAX_SIZE} onClick={() => resize(rows, columns + 1)}>+c</button>
        <button type="button" title="Remove column" disabled={columns <= MATRIX_MIN_SIZE} onClick={() => resize(rows, columns - 1)}>−c</button>
        <button type="button" title="Transpose" onClick={() => put('Transposed matrix', transpose(object.values))}>T</button>
        <button type="button" title="Reset to identity" onClick={() => put('Reset matrix to identity', identity(rows, columns))}>I</button>
        <button type="button" title="Multiply by a matrix B" aria-expanded={popover === 'multiply'} className={popover === 'multiply' ? 'is-open' : undefined} onClick={() => setPopover(popover === 'multiply' ? null : 'multiply')}>×B</button>
        <button type="button" title="Scale by k" aria-expanded={popover === 'scale'} className={popover === 'scale' ? 'is-open' : undefined} onClick={() => setPopover(popover === 'scale' ? null : 'scale')}>×k</button>
        {isTwoByTwo && <button type="button" title="Rotate by θ" aria-expanded={popover === 'rotate'} className={popover === 'rotate' ? 'is-open' : undefined} onClick={() => setPopover(popover === 'rotate' ? null : 'rotate')}>θ</button>}
      </div>
      <span className="matrix-dims">{rows}×{columns}</span>
    </header>
  )

  const grid = (
    <div
      className="matrix-grid"
      role="group"
      aria-label={`Edit ${rows} by ${columns} matrix`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(44px, 1fr))`, opacity: gridT }}
      data-canvas-control="true"
      onPointerDown={stopCanvas}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {values.map((row, rowIndex) => row.map((value, columnIndex) => (
        <MatrixCell
          key={cellKey(rowIndex, columnIndex)}
          row={rowIndex}
          column={columnIndex}
          value={value}
          flash={cellFlashes.has(cellKey(rowIndex, columnIndex))}
          inputRef={registerInput(rowIndex, columnIndex)}
          onCommit={commitCell}
          onMove={moveFocus}
          onNudge={nudgeCell}
          onNudgeEnd={endNudge}
        />
      )))}
    </div>
  )

  const readouts = (
    <div className="matrix-facts reveal-fade" aria-live="polite" style={{ opacity: readoutT }}>
      <span><small>dim </small>{rows} × {columns}</span>
      {square ? (
        <>
          <span><small>det </small><b>{formatNumber(det)}</b></span>
          <span><small>tr </small>{formatNumber(tr)}</span>
          {isTwoByTwo && <span><small>λ </small>{eig ? `${formatNumber(eig[0])}, ${formatNumber(eig[1])}` : 'complex'}</span>}
        </>
      ) : <span><small>not square</small></span>}
    </div>
  )

  const popoverNode = popover && (
    <OperationPopover mode={popover} values={object.values} onApply={put} onClose={() => setPopover(null)} />
  )

  if (!isTwoByTwo) {
    const showColumns = rows === 2 || columns === 2
    return (
      <div className={rootClass} style={rootStyle}>
        {toolbar}
        {popoverNode}
        <div className="matrix-body matrix-centre">
          <span className="matrix-name" style={{ opacity: gridT }}>A =</span>
          {grid}
          {readouts}
          {showColumns && (
            <ul className="matrix-column-list" aria-label="Column vectors" style={{ opacity: readoutT }}>
              {matrixColumns(shown).map((column, index) => <li key={index}><span>c{index + 1} </span>({column.map(formatNumber).join(', ')})</li>)}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <TwoByTwoPlane
      object={object}
      world={world}
      values={values}
      shown={shown}
      width={width}
      height={height}
      setDraft={setDraft}
      put={put}
      toolbar={toolbar}
      popover={popoverNode}
      grid={grid}
      readouts={readouts}
      progress={p}
      rootClass={rootClass}
      rootStyle={rootStyle}
    />
  )
}

/** Where a line through the origin with direction `direction` leaves `box`, on each side. */
function lineEndpoints(center: Point, direction: Point, box: { left: number; top: number; right: number; bottom: number }): [Point, Point] | null {
  const candidates: number[] = []
  if (Math.abs(direction.x) > 1e-9) candidates.push((box.left - center.x) / direction.x, (box.right - center.x) / direction.x)
  if (Math.abs(direction.y) > 1e-9) candidates.push((box.top - center.y) / direction.y, (box.bottom - center.y) / direction.y)
  const inside = (t: number) => {
    const x = center.x + direction.x * t
    const y = center.y + direction.y * t
    return x >= box.left - 0.5 && x <= box.right + 0.5 && y >= box.top - 0.5 && y <= box.bottom + 0.5
  }
  const valid = candidates.filter(inside)
  if (valid.length < 2) return null
  const tMin = Math.min(...valid)
  const tMax = Math.max(...valid)
  return [
    { x: center.x + direction.x * tMin, y: center.y + direction.y * tMin },
    { x: center.x + direction.x * tMax, y: center.y + direction.y * tMax },
  ]
}

function TwoByTwoPlane({
  object,
  world,
  values,
  shown,
  width,
  height,
  setDraft,
  put,
  toolbar,
  popover,
  grid,
  readouts,
  progress,
  rootClass,
  rootStyle,
}: {
  object: MatrixObject
  world: WorldState
  values: MatrixValues
  shown: MatrixValues
  width: number
  height: number
  setDraft: (next: MatrixValues | null) => void
  put: (summary: string, next: MatrixValues) => void
  toolbar: ReactNode
  popover: ReactNode
  grid: ReactNode
  readouts: ReactNode
  progress: number
  rootClass: string
  rootStyle: CSSProperties | undefined
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ column: 0 | 1; pointerId: number; scale: number; values: MatrixValues } | null>(null)
  const [draggingColumn, setDraggingColumn] = useState<0 | 1 | null>(null)

  const plotWidth = width - SIDE_WIDTH
  const plotHeight = height - TOOLBAR_HEIGHT
  const box = { left: 8, top: 30, right: plotWidth - 8, bottom: plotHeight - 30 }
  const center = { x: plotWidth / 2, y: (box.top + box.bottom) / 2 }
  const vectors = transformVectors({ ...object, values: shown }, world)
  const basis: [Point, Point] = [{ x: shown[0][0], y: shown[1][0] }, { x: shown[0][1], y: shown[1][1] }]
  const extents = [
    ...vectors.flatMap((vector) => [Math.abs(vector.source.x), Math.abs(vector.source.y), Math.abs(vector.transformed.x), Math.abs(vector.transformed.y)]),
    ...[{ x: values[0][0], y: values[1][0] }, { x: values[0][1], y: values[1][1] }].flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
  ]
  const maximum = Math.max(4, ...extents)
  const scale = dragRef.current?.scale ?? Math.min(box.right - box.left, box.bottom - box.top) / (maximum * 2.35)
  const draw = (point: Point) => ({ x: center.x + point.x * scale, y: center.y - point.y * scale })
  const sourceMarker = `matrix-source-${object.id}`
  const resultMarker = `matrix-result-${object.id}`
  /** Keep an SVG text label of roughly `textWidth` px inside the plot rectangle. */
  const clampLabel = (x: number, y: number, textWidth: number) => ({
    x: Math.min(Math.max(x, box.left + 2), box.right - textWidth - 2),
    y: Math.min(Math.max(y, box.top + 12), box.bottom - 3),
  })
  const eigen = eigenpairs2x2(shown)

  // ---- staged reveal: lattice lines draw → vectors grow from the origin → readouts --
  const p = progress
  const kickerT = revealStage(p, 0, 0.15)
  const axesT = revealStage(p, 0, 0.2)
  const latticeT = revealStage(p, 0, 0.5)
  const vectorT = revealStage(p, 0.5, 0.85)
  const keyT = revealStage(p, 0.85, 1)
  const latticeCount = GRID_VALUES.length * 2
  const grow = (tip: Point) => revealLerp(center, tip, vectorT)

  const localPoint = (event: ReactPointerEvent<SVGElement>, currentScale: number): Point => {
    const rect = svgRef.current!.getBoundingClientRect()
    const local = { x: ((event.clientX - rect.left) / rect.width) * plotWidth, y: ((event.clientY - rect.top) / rect.height) * plotHeight }
    return { x: (local.x - center.x) / currentScale, y: (center.y - local.y) / currentScale }
  }

  const withColumn = (base: MatrixValues, column: 0 | 1, point: Point): MatrixValues => {
    const next = cloneMatrix(base)
    next[0][column] = Number(point.x.toFixed(2))
    next[1][column] = Number(point.y.toFixed(2))
    return next
  }

  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>, column: 0 | 1) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    svgRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { column, pointerId: event.pointerId, scale, values: object.values }
    setDraggingColumn(column)
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.stopPropagation()
    setDraft(withColumn(active.values, active.column, localPoint(event, active.scale)))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = dragRef.current
    if (!active || active.pointerId !== event.pointerId) return
    event.stopPropagation()
    const next = withColumn(active.values, active.column, localPoint(event, active.scale))
    dragRef.current = null
    setDraggingColumn(null)
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* pointer already released */ }
    put(`Dragged basis vector e${active.column + 1}`, next)
  }

  return (
    <div className={rootClass} style={rootStyle}>
      {toolbar}
      {popover}
      <div className="matrix-body">
        <div className="matrix-plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${plotWidth} ${plotHeight}`}
            aria-label="Live matrix transformation"
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <defs>
              <marker id={sourceMarker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className="matrix-source-head" d="M0 0L10 5L0 10Z" /></marker>
              <marker id={resultMarker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className="matrix-result-head" d="M0 0L10 5L0 10Z" /></marker>
              <clipPath id={`matrix-clip-${object.id}`}><rect x={box.left} y={box.top} width={Math.max(0, box.right - box.left)} height={Math.max(0, box.bottom - box.top)} /></clipPath>
            </defs>
            <rect className="matrix-paper" width={plotWidth} height={plotHeight} />
            <text className="matrix-kicker" x="12" y="18" style={{ opacity: kickerT }}>linear transformation</text>
            <g clipPath={`url(#matrix-clip-${object.id})`}>
              <g className="matrix-lattice">
                {GRID_VALUES.map((value, index) => {
                  const t = revealItem(latticeT, index, latticeCount, 2)
                  if (t <= 0) return null
                  const first = draw(applyMatrix(shown, { x: value, y: -4 }))
                  const last = draw(applyMatrix(shown, { x: value, y: 4 }))
                  return <line key={`v-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} pathLength={1} style={revealDash(t)} />
                })}
                {GRID_VALUES.map((value, index) => {
                  const t = revealItem(latticeT, GRID_VALUES.length + index, latticeCount, 2)
                  if (t <= 0) return null
                  const first = draw(applyMatrix(shown, { x: -4, y: value }))
                  const last = draw(applyMatrix(shown, { x: 4, y: value }))
                  return <line key={`h-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} pathLength={1} style={revealDash(t)} />
                })}
              </g>
              <line className="matrix-axis" x1={box.left} x2={box.right} y1={center.y} y2={center.y} pathLength={1} style={revealDash(axesT)} />
              <line className="matrix-axis" x1={center.x} x2={center.x} y1={box.bottom} y2={box.top} pathLength={1} style={revealDash(axesT)} />
              {keyT > 0 && eigen && eigen.map((pair, index) => {
                const direction = { x: pair.vector.x, y: -pair.vector.y }
                const ends = lineEndpoints(center, direction, box)
                if (!ends) return null
                const text = `λ${index === 0 ? '₁' : '₂'} = ${formatNumber(pair.value)}`
                const textWidth = text.length * 6.6
                // Label near the end of the line that points up-right, tucked inside the plot.
                const tip = ends[1].y <= ends[0].y ? ends[1] : ends[0]
                const label = clampLabel(tip.x - (tip.x > center.x ? textWidth + 6 : -6), tip.y + (tip.y < center.y ? 14 : -6), textWidth)
                return (
                  <g key={`eigen-${index}`} className="matrix-eigen" style={{ opacity: keyT }}>
                    <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} />
                    <text x={label.x} y={label.y}>{text}</text>
                  </g>
                )
              })}
              {vectorT > 0 && vectors.map((vector, index) => {
                const source = grow(draw(vector.source))
                const transformed = grow(draw(vector.transformed))
                const label = clampLabel(transformed.x + 6, transformed.y - 6, 22)
                return <g key={vector.id}>
                  <line className="matrix-source-vector" x1={center.x} y1={center.y} x2={source.x} y2={source.y} markerEnd={`url(#${sourceMarker})`} />
                  <line className="matrix-result-vector" x1={center.x} y1={center.y} x2={transformed.x} y2={transformed.y} markerEnd={`url(#${resultMarker})`} />
                  <text className="matrix-vector-label" x={label.x} y={label.y} style={{ opacity: vectorT }}>v{index + 1}′</text>
                </g>
              })}
              {vectorT > 0 && basis.map((point, index) => {
                const column = index as 0 | 1
                const at = grow(draw(point))
                const label = clampLabel(at.x + 8, at.y + 4, 22)
                return <g key={`basis-${column}`}>
                  <line className="matrix-basis-vector" x1={center.x} y1={center.y} x2={at.x} y2={at.y} />
                  <circle
                    className={`matrix-basis-handle${draggingColumn === column ? ' is-dragging' : ''}`}
                    data-canvas-handle="true"
                    role="slider"
                    aria-label={`Basis vector e${column + 1}: (${formatNumber(values[0][column])}, ${formatNumber(values[1][column])})`}
                    cx={at.x}
                    cy={at.y}
                    r={6}
                    onPointerDown={(event) => beginDrag(event, column)}
                  />
                  <text className="matrix-basis-label" x={label.x} y={label.y} style={{ opacity: vectorT }}>e{column + 1}′</text>
                </g>
              })}
            </g>
          </svg>
          <div className="matrix-key" style={{ opacity: keyT }}>
            <span>— source</span>
            <b>— transformed</b>
            {eigen && <em>— eigenlines</em>}
          </div>
        </div>
        <div className="matrix-side" data-canvas-control="true" onPointerDown={stopCanvas} onDoubleClick={(event) => event.stopPropagation()}>
          <span className="matrix-name" style={{ opacity: revealStage(p, 0, 0.3) }}>A =</span>
          {grid}
          {readouts}
          <em style={{ opacity: keyT }} title="Drag e1′ and e2′ on the plane; type in a cell, or press ↑ ↓ (Shift for ±1)">drag · type · ↑↓ edit</em>
        </div>
      </div>
    </div>
  )
}
