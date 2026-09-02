'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MutableRefObject, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import {
  compositionToPartition,
  ferrersDiagram,
  finiteEulerProductCoefficients,
  fiveResidueLanes,
  ramanujanCheck,
  verifyRamanujanFive,
} from '../domain/math/partitions'
import { tetrahedralLatticeCount } from '../domain/math/simplex'
import type { NumberTheoryObject, WorldAction, WorldState } from '../domain/world/types'
import { revealItem, revealProgress, revealStage } from '../domain/animation/evaluate'
import { useTweenedNumber } from './useTweenedNumber'
import { Tex } from './Tex'
import '../styles/reveal.css'
import '../styles/lattice.css'

type NumberTheoryViewProps = {
  object: NumberTheoryObject
  world?: WorldState
  run: (action: WorldAction) => void
}

const FLASH_MS = 700
const SLIDE_STAGGER_MS = 40
const SLIDE_MS = 360
const DENSE_LANE = 8
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const humanPut = (summary: string, object: NumberTheoryObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

/**
 * The integer lattice point nearest the linked simplex weights: round each
 * weight·N and repair the sum so the tuple is an honest lattice point.
 */
function nearestLatticeTuple(weights: readonly number[], denominator: number): [number, number, number, number] {
  const scaled = weights.map((weight) => Math.max(0, weight) * denominator)
  const tuple = scaled.map((value) => Math.round(value)) as [number, number, number, number]
  let difference = denominator - tuple.reduce((sum, value) => sum + value, 0)
  while (difference !== 0) {
    const remainders = scaled.map((value, index) => value - tuple[index])
    const index = difference > 0
      ? remainders.indexOf(Math.max(...remainders))
      : remainders.indexOf(Math.min(...remainders.map((value, current) => tuple[current] > 0 ? value : Number.POSITIVE_INFINITY)))
    tuple[index] += Math.sign(difference)
    difference -= Math.sign(difference)
  }
  return tuple
}

type FlashField = 'selectedN' | 'finiteCutoff' | 'revealTheorem'
const FLASH_FIELDS: readonly FlashField[] = ['selectedN', 'finiteCutoff', 'revealTheorem']

const sameValue = (a: unknown, b: unknown): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => sameValue(item, b[index]))
  return a === b
}

/**
 * Fields that changed on the object without a matching local commit: a tool,
 * an undo, or a timeline set them. Each flagged field stays hot for 700 ms.
 */
function useForeignChanges<T extends object, K extends keyof T>(
  object: T,
  fields: readonly K[],
  localRef: MutableRefObject<T | null>,
): Partial<Record<K, true>> {
  const previousRef = useRef(object)
  const [flash, setFlash] = useState<Partial<Record<K, number>>>({})
  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = object
    if (previous === object) return
    const local = localRef.current
    const hits = fields.filter((field) => !sameValue(object[field], previous[field]) && (!local || !sameValue(object[field], local[field])))
    if (local && fields.every((field) => sameValue(object[field], local[field]))) localRef.current = null
    if (!hits.length) return
    const stamp = Date.now()
    setFlash((current) => {
      const next = { ...current }
      for (const field of hits) next[field] = stamp
      return next
    })
    window.setTimeout(() => setFlash((current) => {
      const next = { ...current }
      for (const field of hits) if (next[field] === stamp) delete next[field]
      return next
    }), FLASH_MS)
  }, [object, fields, localRef])
  const hot: Partial<Record<K, true>> = {}
  for (const field of fields) if (flash[field] !== undefined) hot[field] = true
  return hot
}

type NumberFieldProps = {
  label: string
  value: number
  min: number
  max: number
  onCommit: (value: number) => void
  target?: string
}

/** Integer twin of a slider: edits locally, commits once on blur or Enter. */
function IntegerField({ label, value, min, max, onCommit, target }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null)
  const settle = () => {
    if (text === null) return
    const parsed = Math.round(Number(text))
    setText(null)
    if (Number.isFinite(parsed)) onCommit(clamp(parsed, min, max))
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    // Enter only blurs: the blur handler commits once, so Enter + blur never double-commit.
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') { setText(null); event.currentTarget.blur() }
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      className="lattice-num"
      aria-label={label}
      data-demo-target={target}
      value={text ?? String(value)}
      min={min}
      max={max}
      step={1}
      onChange={(event) => setText(event.target.value)}
      onBlur={settle}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}

/** A residue-lane value that counts up when its coefficient changes. */
function CountingValue({ value }: { value: number }) {
  const shown = useTweenedNumber(value, 360)
  return <b>{Math.round(shown)}</b>
}

export default function NumberTheoryView({ object, world, run }: NumberTheoryViewProps) {
  const [draft, setDraft] = useState<{ selectedN?: number; finiteCutoff?: number } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [slide, setSlide] = useState<{ from: number; stamp: number } | null>(null)
  const localRef = useRef<NumberTheoryObject | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const maxN = Math.max(1, Math.round(object.maxN))
  const selectedN = clamp(Math.round(draft?.selectedN ?? object.selectedN), 0, maxN)
  const cutoff = clamp(Math.round(draft?.finiteCutoff ?? object.finiteCutoff), Math.max(1, selectedN), maxN)
  const simplex = world && object.linkedSimplexId ? world.objects[object.linkedSimplexId] : undefined
  const denominator = simplex?.kind === 'simplex' ? Math.max(1, Math.round(simplex.denominator)) : 5
  const tuple = useMemo(
    () => simplex?.kind === 'simplex' ? nearestLatticeTuple(simplex.weights, denominator) : [2, 1, 1, 1] as [number, number, number, number],
    [simplex, denominator],
  )
  const latticeCount = tetrahedralLatticeCount(denominator)
  const partition = useMemo(() => compositionToPartition(tuple), [tuple])
  const diagram = useMemo(() => ferrersDiagram(partition), [partition])
  const coefficients = useMemo(() => finiteEulerProductCoefficients(cutoff, cutoff), [cutoff])
  const lanes = useMemo(() => fiveResidueLanes(cutoff), [cutoff])
  const verification = useMemo(() => verifyRamanujanFive(cutoff), [cutoff])
  const selectedCoefficient = coefficients[selectedN] ?? 0
  const check = useMemo(() => ramanujanCheck(selectedN, selectedCoefficient), [selectedN, selectedCoefficient])
  const flash = useForeignChanges(object, FLASH_FIELDS, localRef)
  const stop = (event: ReactPointerEvent) => { if (event.button !== 2) event.stopPropagation() }

  // ---- staged reveal: coefficient cells left→right → residue lanes → theorem card --
  const p = revealProgress(object)
  const revealing = p < 1
  const headerT = revealStage(p, 0, 0.15)
  const chainT = revealStage(p, 0.05, 0.25)
  const cellsT = revealStage(p, 0, 0.6)
  const lanesT = revealStage(p, 0.6, 0.9)
  const theoremT = revealStage(p, 0.9, 1)
  const cellStyle = (index: number, count: number, extra?: CSSProperties): CSSProperties => {
    const t = revealItem(cellsT, index, count, 1)
    if (t >= 1) return extra ?? {}
    return { ...extra, opacity: t, transform: `translateY(${((1 - t) * 6).toFixed(2)}px)` }
  }

  // New coefficient cells slide in from the right with a 40 ms stagger when the cutoff grows.
  const previousCutoffRef = useRef(cutoff)
  useEffect(() => {
    const previous = previousCutoffRef.current
    previousCutoffRef.current = cutoff
    if (cutoff <= previous || revealing) return
    const stamp = Date.now()
    setSlide({ from: previous, stamp })
    const timer = window.setTimeout(() => setSlide((current) => (current?.stamp === stamp ? null : current)), (cutoff - previous) * SLIDE_STAGGER_MS + SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [cutoff, revealing])

  // Keep the selected n in view and the fade edges honest.
  const updateFades = () => {
    const track = trackRef.current
    const scroller = scrollerRef.current
    if (!track || !scroller) return
    scroller.dataset.fadeLeft = track.scrollLeft > 2 ? 'true' : 'false'
    scroller.dataset.fadeRight = track.scrollLeft + track.clientWidth < track.scrollWidth - 2 ? 'true' : 'false'
  }
  useLayoutEffect(() => {
    const track = trackRef.current
    const cell = track?.querySelector<HTMLElement>(`[data-n="${selectedN}"]`)
    if (!track || !cell) { updateFades(); return }
    const margin = 32
    const left = cell.offsetLeft
    const right = left + cell.offsetWidth
    let target: number | null = null
    if (left < track.scrollLeft + margin) target = Math.max(0, left - margin)
    else if (right > track.scrollLeft + track.clientWidth - margin) target = right - track.clientWidth + margin
    if (target !== null) track.scrollTo({ left: target, behavior: revealing ? 'auto' : 'smooth' })
    updateFades()
  }, [selectedN, cutoff, revealing])
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateFades)
    observer.observe(track)
    return () => observer.disconnect()
  }, [])
  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    event.stopPropagation()
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) track.scrollLeft += event.deltaY
  }

  const commit = (summary: string, patch?: Partial<NumberTheoryObject>) => {
    const next: NumberTheoryObject = { ...object, selectedN, finiteCutoff: cutoff, ...patch }
    setDraft(null)
    if (next.selectedN === object.selectedN && next.finiteCutoff === object.finiteCutoff && next.revealTheorem === object.revealTheorem) return
    localRef.current = next
    run(humanPut(summary, next))
  }
  const selectN = (n: number) => {
    const next = clamp(Math.round(n), 0, maxN)
    if (next === object.selectedN) return
    const nextCutoff = Math.max(object.finiteCutoff, next)
    const summary = nextCutoff !== object.finiteCutoff ? `Selected n = ${next} and grew the product to m ≤ ${nextCutoff}` : `Selected n = ${next}`
    commit(summary, { selectedN: next, finiteCutoff: nextCutoff })
  }
  const setCutoff = (value: number) => {
    const next = clamp(Math.round(value), Math.max(1, object.selectedN), maxN)
    if (next === object.finiteCutoff) return
    commit(`Expanded the finite product to m ≤ ${next}`, { finiteCutoff: next })
  }
  const reveal = (revealTheorem: boolean) => commit(revealTheorem ? 'Revealed the verified p(5n+4) lane' : 'Hid the theorem', { revealTheorem })

  const verifyLane = verifying ? selectedN % 5 : -1
  const verifyLine = verifying
    ? check.applies
      ? check.holds
        ? <span className="is-holds">5 | p({check.n}) · {check.value} = 5 × {check.quotient} ✓</span>
        : <span className="is-fails">p({check.n}) ≡ {check.modulo} (mod 5) · counterexample</span>
      : <span className="is-silent">n ≡ {check.residue} (mod 5) · p(n) ≡ {check.modulo} · no claim</span>
    : <span className="is-silent">{check.applies ? 'n ≡ 4 (mod 5) · theorem lane' : `n ≡ ${check.residue} (mod 5)`}</span>

  return (
    <section className={`number-theory-view lattice-card reveal-root${revealing ? ' is-revealing' : ''}`} aria-label="Integer partitions" onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="lattice-head reveal-fade" style={{ opacity: headerT }}>
        <div className="lattice-head-text">
          <span className="lattice-kicker">Integer partitions · finite Euler product</span>
          <h3 className="lattice-title">Lattice points become partition coefficients</h3>
        </div>
        <div className="nt-controls" aria-label="Partition controls" onPointerDown={stop}>
          <label className={`lattice-field is-purple${flash.selectedN ? ' is-agent-set' : ''}`}>
            <span>n</span>
            <input
              aria-label="Selected n" type="range" min="0" max={maxN} step="1" value={selectedN} data-demo-target="partition-n"
              onChange={(event) => setDraft((current) => ({ ...(current ?? {}), selectedN: Number(event.target.value) }))}
              onPointerUp={() => commit(`Selected n = ${selectedN}`)}
              onKeyUp={() => commit(`Selected n = ${selectedN}`)}
              onBlur={() => { if (draft) commit(`Selected n = ${selectedN}`) }}
            />
            <IntegerField label="Selected n value" value={selectedN} min={0} max={maxN} onCommit={selectN} />
          </label>
          <label className={`lattice-field is-purple${flash.finiteCutoff ? ' is-agent-set' : ''}`}>
            <span>m ≤</span>
            <input
              aria-label="Finite Euler product cutoff" type="range" min={Math.max(1, selectedN)} max={maxN} step="1" value={cutoff} data-demo-target="partition-cutoff"
              onChange={(event) => setDraft((current) => ({ ...(current ?? {}), finiteCutoff: Number(event.target.value) }))}
              onPointerUp={() => commit(`Expanded the finite product to m ≤ ${cutoff}`)}
              onKeyUp={() => commit(`Expanded the finite product to m ≤ ${cutoff}`)}
              onBlur={() => { if (draft) commit(`Expanded the finite product to m ≤ ${cutoff}`) }}
            />
            <IntegerField label="Finite Euler product cutoff value" value={cutoff} min={Math.max(1, selectedN)} max={maxN} onCommit={setCutoff} />
          </label>
          <button type="button" className={`lattice-btn is-teal${verifying ? ' is-on' : ''}`} aria-pressed={verifying} onClick={() => setVerifying((current) => !current)}>verify n</button>
          <button
            type="button"
            className={`lattice-btn${object.revealTheorem ? ' is-on' : ''}${flash.revealTheorem ? ' is-agent-set' : ''}`}
            aria-pressed={object.revealTheorem}
            onClick={() => reveal(!object.revealTheorem)}
          >
            theorem
          </button>
        </div>
      </header>

      <div className="nt-body">
        <div className="number-theory-chain reveal-fade" aria-label="Lattice point to partition" style={{ opacity: chainT }}>
          <div className="number-theory-step">
            <small>lattice point · N = {denominator}</small>
            <strong>({tuple.join(', ')})</strong>
            <em>one of L₃({denominator}) = {latticeCount} tuples</em>
          </div>
          <span className="number-theory-arrow" aria-hidden="true">sort · forget order →</span>
          <div className="number-theory-step">
            <small>partition of {denominator} · ≤ 4 parts</small>
            <strong>{partition.length ? partition.join(' + ') : '∅'}</strong>
            <em>{latticeCount} tuples ≠ p({denominator}) partitions</em>
          </div>
          <span className="number-theory-arrow" aria-hidden="true">all partitions →</span>
          <div className="number-theory-step number-theory-product">
            <small>finite Euler product, m ≤ {cutoff}</small>
            <Tex latex={`\\prod_{m=1}^{${cutoff}}\\frac{1}{1-q^{m}}=\\sum_{n\\le ${cutoff}} p(n)\\,q^{n}+\\cdots`} />
            <em>coefficients below are computed here</em>
          </div>
          <div className="number-theory-step ferrers-step">
            <small>Ferrers · {diagram.cellCount} cells</small>
            <div className="ferrers-diagram" aria-label={`Ferrers diagram for ${partition.join(', ') || 'zero'}`}>
              {diagram.parts.length ? diagram.parts.map((length, row) => (
                <div className="ferrers-row" key={`${row}-${length}`}>
                  {Array.from({ length }, (_, cell) => <i key={cell} aria-hidden="true" />)}
                </div>
              )) : <span className="ferrers-empty">∅</span>}
            </div>
          </div>
        </div>

        <div className="coefficient-strip" aria-label={`Partition coefficients from zero to ${cutoff}`} data-cutoff={cutoff}>
          <div ref={scrollerRef} className="coefficient-scroller">
            <div ref={trackRef} className="coefficient-track" onScroll={updateFades} onWheel={onWheel} role="listbox" aria-label="Choose n">
              {coefficients.map((value, index) => {
                const isNew = slide !== null && index > slide.from
                const isSelected = index === selectedN
                const style = cellStyle(index, coefficients.length, isNew ? { animationDelay: `${(index - slide.from - 1) * SLIDE_STAGGER_MS}ms` } : undefined)
                return (
                  <button
                    type="button"
                    key={index}
                    data-n={index}
                    role="option"
                    aria-selected={isSelected}
                    className={`coefficient-cell${isSelected ? ' is-selected' : ''}${index % 5 === 4 ? ' is-lane-four' : ''}${isNew ? ' is-new' : ''}${(isSelected && flash.selectedN) || (isNew && flash.finiteCutoff) ? ' is-agent-set' : ''}`}
                    style={style}
                    onPointerDown={stop}
                    onClick={() => selectN(index)}
                  >
                    <small>p({index})</small>
                    <b>{value}</b>
                  </button>
                )
              })}
            </div>
          </div>
          <div className={`coefficient-readout${flash.selectedN ? ' is-agent-set' : ''}`} style={{ opacity: revealStage(p, 0.55, 0.65) }} aria-live="polite">
            <span>p({selectedN}) = <b>{selectedCoefficient}</b></span>
            {verifyLine}
          </div>
        </div>

        <section className="residue-observatory" aria-label="Five residue lanes">
          <div className="residue-lanes">
            {lanes.map((lane, laneIndex) => {
              const t = revealItem(lanesT, laneIndex, lanes.length, 0.6)
              const laneStyle: CSSProperties | undefined = t < 1 ? { opacity: t, transform: `translateX(${((1 - t) * -10).toFixed(2)}px)` } : undefined
              return (
                <div
                  key={lane.residue}
                  className={`residue-lane${lane.residue === 4 ? ' is-highlighted' : ''}${lane.residue === verifyLane ? ' is-verifying' : ''}${lane.values.length >= DENSE_LANE ? ' is-dense' : ''}`}
                  style={laneStyle}
                >
                  <span className="residue-lane-label">n ≡ {lane.residue} (mod 5)</span>
                  <div className="residue-lane-values">
                    {lane.values.map((entry) => (
                      <span
                        key={entry.index}
                        className={`${entry.modulo === 0 ? 'is-zero-mod' : ''}${verifying && entry.index === selectedN ? ' is-verified-cell' : entry.index === selectedN ? ' is-selected-cell' : ''}`}
                        title={`p(${entry.index}) = ${entry.value}`}
                      >
                        <small>p({entry.index})</small><CountingValue value={entry.value} /><i>≡ {entry.modulo}</i>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="lattice-foot" onPointerDown={stop}>
        {object.revealTheorem ? (
          <aside className={`ramanujan-reveal ${verification.verified ? 'is-verified' : 'has-counterexample'}${flash.revealTheorem ? ' is-agent-set' : ''}`} style={{ opacity: theoremT }}>
            <div className="ramanujan-statement">
              <span className="math-object-kicker">THEOREM · RAMANUJAN (1919)</span>
              <h4><Tex latex={'p(5n+4)\\equiv 0\\pmod 5'} /></h4>
            </div>
            <div className="ramanujan-evidence">
              <b>{verification.verified ? 'verified' : 'counterexample'} · {verification.checked.length} finite case{verification.checked.length === 1 ? '' : 's'}</b>
              <span>{verification.checked.map((index) => `p(${index}) = ${coefficients[index]}`).join(' · ')}</span>
              <small>These cases are computed and checked here. The general congruence is a theorem; this surface does not prove it.</small>
            </div>
            <button type="button" onPointerDown={stop} onClick={() => reveal(false)}>hide</button>
          </aside>
        ) : (
          <button className={`ramanujan-tease${flash.revealTheorem ? ' is-agent-set' : ''}`} type="button" data-demo-target="partition-reveal" onPointerDown={stop} onClick={() => reveal(true)} style={{ opacity: theoremT }}>
            <span>?</span> every value in the n ≡ 4 lane is a multiple of five · reveal the theorem
          </button>
        )}
      </footer>
    </section>
  )
}
