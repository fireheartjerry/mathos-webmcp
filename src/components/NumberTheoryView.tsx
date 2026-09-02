'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  compositionToPartition,
  ferrersDiagram,
  finiteEulerProductCoefficients,
  fiveResidueLanes,
  verifyRamanujanFive,
} from '../domain/math/partitions'
import { tetrahedralLatticeCount } from '../domain/math/simplex'
import type { NumberTheoryObject, WorldAction, WorldState } from '../domain/world/types'
import { revealItem, revealProgress, revealStage } from '../domain/animation/evaluate'
import { Tex } from './Tex'
import '../styles/reveal.css'

type NumberTheoryViewProps = {
  object: NumberTheoryObject
  world?: WorldState
  run: (action: WorldAction) => void
}

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

export default function NumberTheoryView({ object, world, run }: NumberTheoryViewProps) {
  const [draft, setDraft] = useState<{ selectedN?: number; finiteCutoff?: number } | null>(null)
  const maxN = Math.max(1, Math.round(object.maxN))
  const selectedN = clamp(Math.round(draft?.selectedN ?? object.selectedN), 1, maxN)
  const cutoff = clamp(Math.round(draft?.finiteCutoff ?? object.finiteCutoff), selectedN, maxN)
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
  const selectedCoefficient = coefficients[selectedN]
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
    return { ...extra, opacity: t, transform: t < 1 ? `translateY(${((1 - t) * 6).toFixed(2)}px)` : undefined }
  }

  const commit = (summary: string) => {
    const next: NumberTheoryObject = { ...object, selectedN, finiteCutoff: cutoff }
    setDraft(null)
    if (next.selectedN === object.selectedN && next.finiteCutoff === object.finiteCutoff) return
    run(humanPut(summary, next))
  }
  const reveal = (revealTheorem: boolean) => run(humanPut(revealTheorem ? 'Revealed the verified p(5n+4) lane' : 'Hid the theorem', { ...object, revealTheorem }))

  return (
    <section className={`number-theory-view reveal-root${revealing ? ' is-revealing' : ''}`} aria-label="Integer partitions" onPointerDown={stop} style={revealing ? { opacity: object.opacity } : undefined}>
      <header className="number-theory-header reveal-fade" style={{ opacity: headerT }}>
        <div>
          <span className="math-object-kicker">INTEGER PARTITIONS · FINITE EULER PRODUCT</span>
          <h3>Lattice points become partition coefficients</h3>
        </div>
        <div className="number-theory-controls" aria-label="Partition controls">
          <label onPointerDown={stop}>
            <span>selected n</span><output>{selectedN}</output>
            <input
              aria-label="Selected n" type="range" min="1" max={maxN} step="1" value={selectedN} data-demo-target="partition-n"
              onChange={(event) => setDraft((current) => ({ ...(current ?? {}), selectedN: Number(event.target.value) }))}
              onPointerUp={() => commit(`Selected n = ${selectedN}`)}
              onKeyUp={() => commit(`Selected n = ${selectedN}`)}
              onBlur={() => { if (draft) commit(`Selected n = ${selectedN}`) }}
            />
          </label>
          <label onPointerDown={stop}>
            <span>factors m ≤</span><output>{cutoff}</output>
            <input
              aria-label="Finite Euler product cutoff" type="range" min={selectedN} max={maxN} step="1" value={cutoff} data-demo-target="partition-cutoff"
              onChange={(event) => setDraft((current) => ({ ...(current ?? {}), finiteCutoff: Number(event.target.value) }))}
              onPointerUp={() => commit(`Expanded the finite product to m ≤ ${cutoff}`)}
              onKeyUp={() => commit(`Expanded the finite product to m ≤ ${cutoff}`)}
              onBlur={() => { if (draft) commit(`Expanded the finite product to m ≤ ${cutoff}`) }}
            />
          </label>
        </div>
      </header>

      <div className="number-theory-chain reveal-fade" aria-label="Lattice point to partition" style={{ opacity: chainT }}>
        <div className="number-theory-step">
          <small>simplex lattice point · N = {denominator}</small>
          <strong>({tuple.join(', ')})</strong>
          <em>one of L₃({denominator}) = {latticeCount} ordered tuples</em>
        </div>
        <span className="number-theory-arrow" aria-hidden="true">sort · forget order →</span>
        <div className="number-theory-step">
          <small>partition of {denominator} into ≤ 4 parts</small>
          <strong>{partition.length ? partition.join(' + ') : '∅'}</strong>
          <em>the tetrahedral count is not p({denominator})</em>
        </div>
        <span className="number-theory-arrow" aria-hidden="true">all partitions →</span>
        <div className="number-theory-step number-theory-product">
          <small>finite Euler product, m ≤ {cutoff}</small>
          <Tex latex={`\\prod_{m=1}^{${cutoff}}\\frac{1}{1-q^{m}}=\\sum_{n\\le ${cutoff}} p(n)\\,q^{n}+\\cdots`} />
          <em>coefficients below are computed from these factors</em>
        </div>
        <div className="number-theory-step ferrers-step">
          <small>Ferrers diagram · {diagram.cellCount} cells</small>
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
        {coefficients.map((value, index) => (
          <div key={index} className={`coefficient-cell${index === selectedN ? ' is-selected' : ''}${index % 5 === 4 ? ' is-lane-four' : ''}`} style={cellStyle(index, coefficients.length, { animationDelay: `${index * 34}ms` })}>
            <small>p({index})</small>
            <b>{value}</b>
          </div>
        ))}
        <div className="coefficient-selected" style={{ opacity: revealStage(p, 0.55, 0.65) }}><span>p({selectedN}) =</span><b>{selectedCoefficient}</b></div>
      </div>

      <section className="residue-observatory" aria-label="Five residue lanes">
        <div className="residue-lanes">
          {lanes.map((lane, laneIndex) => (
            <div key={lane.residue} className={`residue-lane${lane.residue === 4 ? ' is-highlighted' : ''}`} style={(() => { const t = revealItem(lanesT, laneIndex, lanes.length, 0.6); return { opacity: t, transform: t < 1 ? `translateX(${((1 - t) * -10).toFixed(2)}px)` : undefined } })()}>
              <span className="residue-lane-label">n ≡ {lane.residue} (mod 5)</span>
              <div className="residue-lane-values">
                {lane.values.map((entry) => (
                  <span key={entry.index} className={entry.modulo === 0 ? 'is-zero-mod' : ''} style={{ animationDelay: `${entry.index * 34}ms` }}>
                    <small>p({entry.index})</small><b>{entry.value}</b><i>≡ {entry.modulo}</i>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {object.revealTheorem ? (
        <aside className={`ramanujan-reveal ${verification.verified ? 'is-verified' : 'has-counterexample'}`} style={{ opacity: theoremT }}>
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
        <button className="ramanujan-tease" type="button" data-demo-target="partition-reveal" onPointerDown={stop} onClick={() => reveal(true)} style={{ opacity: theoremT }}>
          <span>?</span> every value in the n ≡ 4 lane is a multiple of five · reveal the theorem
        </button>
      )}
    </section>
  )
}
