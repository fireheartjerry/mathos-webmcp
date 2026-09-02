'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  MATRIX_MAX_SIZE,
  MATRIX_MIN_SIZE,
  applyMatrix,
  cloneMatrix,
  determinant,
  eigenvalues2x2,
  identity,
  isSquare,
  matrixColumns,
  matrixDimensions,
  trace,
  transformVectors,
  transpose,
  type MatrixValues,
} from '../domain/math/matrix'
import type { MatrixObject, Point, WorldAction, WorldState } from '../domain/world/types'
import { revealDash, revealItem, revealLerp, revealProgress, revealStage } from '../domain/animation/evaluate'
import '../styles/matrix.css'
import '../styles/reveal.css'

const TOOLBAR_HEIGHT = 30
const SIDE_WIDTH = 150
const GRID_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4]

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '—'
  return String(Number(value.toFixed(2)))
}

const stopCanvas = (event: ReactPointerEvent<HTMLElement>) => { if (event.button !== 2) event.stopPropagation() }

/** One editable entry. Local draft text; commits on Enter, blur, and Tab (via blur). */
function MatrixCell({
  row,
  column,
  value,
  inputRef,
  onCommit,
  onMove,
}: {
  row: number
  column: number
  value: number
  inputRef: (element: HTMLInputElement | null) => void
  onCommit: (row: number, column: number, value: number) => void
  onMove: (row: number, column: number, dr: number, dc: number) => void
}) {
  const [text, setText] = useState(() => formatNumber(value))
  const elementRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined' || document.activeElement !== elementRef.current) setText(formatNumber(value))
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
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const move = moves[event.key]
    if (!move) return
    const input = elementRef.current
    // Left/right only leave the cell when the caret is already at the edge.
    if (input && move[0] === 0) {
      const at = input.selectionStart
      const length = input.value.length
      if (at !== null && ((move[1] < 0 && at > 0) || (move[1] > 0 && at < length))) return
    }
    event.preventDefault()
    onMove(row, column, move[0], move[1])
  }

  return (
    <input
      ref={(element) => { elementRef.current = element; inputRef(element) }}
      type="number"
      step="0.1"
      inputMode="decimal"
      value={text}
      aria-label={`Matrix entry row ${row + 1}, column ${column + 1}`}
      data-canvas-control="true"
      onPointerDown={stopCanvas}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  )
}

export default function MatrixPlane({ object, world, run }: { object: MatrixObject; world: WorldState; run: (action: WorldAction) => void }) {
  const width = Math.max(260, object.bounds.width)
  const height = Math.max(200, object.bounds.height)
  const { rows, columns } = matrixDimensions(object.values)
  const isTwoByTwo = rows === 2 && columns === 2

  // Live values while a basis vector is being dragged; null otherwise.
  const [draft, setDraft] = useState<MatrixValues | null>(null)
  const values = draft ?? object.values
  useEffect(() => { setDraft(null) }, [object.values])

  const inputs = useRef(new Map<string, HTMLInputElement>())
  const registerInput = (row: number, column: number) => (element: HTMLInputElement | null) => {
    const key = `${row}-${column}`
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

  const moveFocus = (row: number, column: number, dr: number, dc: number) => {
    const target = inputs.current.get(`${Math.min(rows - 1, Math.max(0, row + dr))}-${Math.min(columns - 1, Math.max(0, column + dc))}`)
    target?.focus()
    target?.select()
  }

  const resize = (nextRows: number, nextColumns: number) => {
    if (nextRows < MATRIX_MIN_SIZE || nextRows > MATRIX_MAX_SIZE || nextColumns < MATRIX_MIN_SIZE || nextColumns > MATRIX_MAX_SIZE) return
    const next = Array.from({ length: nextRows }, (_, row) => Array.from({ length: nextColumns }, (_, column) => object.values[row]?.[column] ?? (row === column ? 1 : 0)))
    put(`Resized matrix to ${nextRows}×${nextColumns}`, next)
  }

  const facts = (() => {
    if (!isSquare(values)) return { det: null, tr: null, eig: null }
    const eig = eigenvalues2x2(values)
    return { det: determinant(values), tr: trace(values), eig }
  })()

  // ---- staged reveal: lattice → basis vectors → readouts (see TwoByTwoPlane for the plot) --
  const p = revealProgress(object)
  const revealing = p < 1
  const toolbarT = revealStage(p, 0, 0.2)
  const gridT = revealStage(p, 0, isTwoByTwo ? 0.3 : 0.5)
  const readoutT = revealStage(p, isTwoByTwo ? 0.85 : 0.5, 1)
  const rootClass = `matrix-plane matrix-widget reveal-root${revealing ? ' is-revealing' : ''}`
  const rootStyle = revealing ? { opacity: object.opacity } : undefined

  const toolbar = (
    <div className="matrix-toolbar reveal-fade" data-canvas-control="true" onPointerDown={stopCanvas} onDoubleClick={(event) => event.stopPropagation()} style={{ opacity: toolbarT }}>
      <button type="button" title="Add row" disabled={rows >= MATRIX_MAX_SIZE} onClick={() => resize(rows + 1, columns)}>row +</button>
      <button type="button" title="Remove row" disabled={rows <= MATRIX_MIN_SIZE} onClick={() => resize(rows - 1, columns)}>row −</button>
      <button type="button" title="Add column" disabled={columns >= MATRIX_MAX_SIZE} onClick={() => resize(rows, columns + 1)}>col +</button>
      <button type="button" title="Remove column" disabled={columns <= MATRIX_MIN_SIZE} onClick={() => resize(rows, columns - 1)}>col −</button>
      <button type="button" title="Transpose" onClick={() => put('Transposed matrix', transpose(object.values))}>T</button>
      <button type="button" title="Reset to identity" onClick={() => put('Reset matrix to identity', identity(rows, columns))}>I</button>
      <span className="matrix-dims">{rows}×{columns}</span>
    </div>
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
          key={`${rowIndex}-${columnIndex}`}
          row={rowIndex}
          column={columnIndex}
          value={value}
          inputRef={registerInput(rowIndex, columnIndex)}
          onCommit={commitCell}
          onMove={moveFocus}
        />
      )))}
    </div>
  )

  const readouts = (
    <div className="matrix-facts reveal-fade" aria-live="polite" style={{ opacity: readoutT }}>
      <span><small>dim </small>{rows} × {columns}</span>
      {facts.det !== null && facts.tr !== null ? (
        <>
          <span><small>det </small><b>{formatNumber(facts.det)}</b></span>
          <span><small>tr </small>{formatNumber(facts.tr)}</span>
          {isTwoByTwo && <span><small>λ </small>{facts.eig ? `${formatNumber(facts.eig[0])}, ${formatNumber(facts.eig[1])}` : 'complex'}</span>}
        </>
      ) : <span><small>not square</small></span>}
    </div>
  )

  if (!isTwoByTwo) {
    const showColumns = rows === 2 || columns === 2
    return (
      <div className={rootClass} style={rootStyle}>
        {toolbar}
        <div className="matrix-body matrix-centre">
          <span className="matrix-name" style={{ opacity: gridT }}>A =</span>
          {grid}
          {readouts}
          {showColumns && (
            <ul className="matrix-column-list" aria-label="Column vectors" style={{ opacity: readoutT }}>
              {matrixColumns(values).map((column, index) => <li key={index}><span>c{index + 1} </span>({column.map(formatNumber).join(', ')})</li>)}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return <TwoByTwoPlane object={object} world={world} values={values} width={width} height={height} setDraft={setDraft} put={put} toolbar={toolbar} grid={grid} readouts={readouts} progress={p} rootClass={rootClass} rootStyle={rootStyle} />
}

function TwoByTwoPlane({
  object,
  world,
  values,
  width,
  height,
  setDraft,
  put,
  toolbar,
  grid,
  readouts,
  progress,
  rootClass,
  rootStyle,
}: {
  object: MatrixObject
  world: WorldState
  values: MatrixValues
  width: number
  height: number
  setDraft: (next: MatrixValues | null) => void
  put: (summary: string, next: MatrixValues) => void
  toolbar: ReactNode
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
  const center = { x: plotWidth / 2, y: plotHeight / 2 + 8 }
  const vectors = transformVectors({ ...object, values }, world)
  const basis: [Point, Point] = [{ x: values[0][0], y: values[1][0] }, { x: values[0][1], y: values[1][1] }]
  const extents = [
    ...vectors.flatMap((vector) => [Math.abs(vector.source.x), Math.abs(vector.source.y), Math.abs(vector.transformed.x), Math.abs(vector.transformed.y)]),
    ...basis.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]),
  ]
  const maximum = Math.max(4, ...extents)
  const scale = dragRef.current?.scale ?? Math.min(plotWidth, plotHeight - 54) / (maximum * 2.35)
  const draw = (point: Point) => ({ x: center.x + point.x * scale, y: center.y - point.y * scale })
  const sourceMarker = `matrix-source-${object.id}`
  const resultMarker = `matrix-result-${object.id}`

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
            </defs>
            <rect className="matrix-paper" width={plotWidth} height={plotHeight} />
            <text className="matrix-kicker" x="17" y="21" style={{ opacity: kickerT }}>LINEAR TRANSFORMATION</text>
            <g className="matrix-lattice">
              {GRID_VALUES.map((value, index) => {
                const t = revealItem(latticeT, index, latticeCount, 2)
                if (t <= 0) return null
                const first = draw(applyMatrix(values, { x: value, y: -4 }))
                const last = draw(applyMatrix(values, { x: value, y: 4 }))
                return <line key={`v-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} pathLength={1} style={revealDash(t)} />
              })}
              {GRID_VALUES.map((value, index) => {
                const t = revealItem(latticeT, GRID_VALUES.length + index, latticeCount, 2)
                if (t <= 0) return null
                const first = draw(applyMatrix(values, { x: -4, y: value }))
                const last = draw(applyMatrix(values, { x: 4, y: value }))
                return <line key={`h-${value}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} pathLength={1} style={revealDash(t)} />
              })}
            </g>
            <line className="matrix-axis" x1="8" x2={plotWidth - 8} y1={center.y} y2={center.y} pathLength={1} style={revealDash(axesT)} />
            <line className="matrix-axis" x1={center.x} x2={center.x} y1={plotHeight - 12} y2="32" pathLength={1} style={revealDash(axesT)} />
            {vectorT > 0 && vectors.map((vector, index) => {
              const source = grow(draw(vector.source))
              const transformed = grow(draw(vector.transformed))
              return <g key={vector.id}>
                <line className="matrix-source-vector" x1={center.x} y1={center.y} x2={source.x} y2={source.y} markerEnd={`url(#${sourceMarker})`} />
                <line className="matrix-result-vector" x1={center.x} y1={center.y} x2={transformed.x} y2={transformed.y} markerEnd={`url(#${resultMarker})`} />
                <text className="matrix-vector-label" x={transformed.x + 6} y={transformed.y - 6} style={{ opacity: vectorT }}>v{index + 1}′</text>
              </g>
            })}
            {vectorT > 0 && basis.map((point, index) => {
              const column = index as 0 | 1
              const at = grow(draw(point))
              return <g key={`basis-${column}`}>
                <line className="matrix-basis-vector" x1={center.x} y1={center.y} x2={at.x} y2={at.y} />
                <circle
                  className={`matrix-basis-handle${draggingColumn === column ? ' is-dragging' : ''}`}
                  data-canvas-handle="true"
                  role="slider"
                  aria-label={`Basis vector e${column + 1}: (${formatNumber(point.x)}, ${formatNumber(point.y)})`}
                  cx={at.x}
                  cy={at.y}
                  r={6}
                  onPointerDown={(event) => beginDrag(event, column)}
                />
                <text className="matrix-basis-label" x={at.x + 8} y={at.y + 4} style={{ opacity: vectorT }}>e{column + 1}′</text>
              </g>
            })}
          </svg>
          <div className="matrix-key" style={{ opacity: keyT }}><span>— source</span><b>— transformed</b></div>
        </div>
        <div className="matrix-side" data-canvas-control="true" onPointerDown={stopCanvas} onDoubleClick={(event) => event.stopPropagation()}>
          <span className="matrix-name" style={{ opacity: revealStage(p, 0, 0.3) }}>A =</span>
          {grid}
          {readouts}
          <em style={{ opacity: keyT }}>drag e1′ e2′ · type to edit</em>
        </div>
      </div>
    </div>
  )
}
