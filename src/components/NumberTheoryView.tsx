'use client'

import { useMemo } from 'react'
import {
  compositionToPartition,
  ferrersDiagram,
  finiteEulerProductCoefficients,
  fiveResidueLanes,
  partitionNumber,
  verifyRamanujanFive,
} from '../domain/math/partitions'
import type { NumberTheoryObject, WorldAction } from '../domain/world/types'
import { Tex } from './Tex'

type NumberTheoryViewProps = {
  object: NumberTheoryObject
  run: (action: WorldAction) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const humanPut = (summary: string, object: NumberTheoryObject): WorldAction => ({
  id: crypto.randomUUID(),
  source: 'human',
  summary,
  operations: [{ type: 'put', object }],
})

function compositionFor(total: number): number[] {
  let remaining = Math.max(1, Math.floor(total))
  const parts: number[] = []
  while (remaining > 0) {
    const part = Math.min(4, remaining)
    parts.push(part)
    remaining -= part
  }
  return parts
}

function updateNumber(object: NumberTheoryObject, patch: Partial<NumberTheoryObject>, summary: string, run: NumberTheoryViewProps['run']) {
  run(humanPut(summary, { ...object, ...patch }))
}

export default function NumberTheoryView({ object, run }: NumberTheoryViewProps) {
  const selectedN = clamp(Math.round(object.selectedN), 1, Math.max(1, Math.round(object.maxN)))
  const cutoff = clamp(Math.round(object.finiteCutoff), selectedN, Math.max(selectedN, Math.round(object.maxN)))
  const composition = useMemo(() => compositionFor(selectedN), [selectedN])
  const sortedPartition = useMemo(() => compositionToPartition(composition), [composition])
  const multiplicities = useMemo(() => [1, 2, 3, 4].map((part) => sortedPartition.filter((value) => value === part).length), [sortedPartition])
  const weightedTotal = multiplicities.reduce((total, count, index) => total + (index + 1) * count, 0)
  const diagram = useMemo(() => ferrersDiagram(sortedPartition), [sortedPartition])
  const coefficients = useMemo(() => finiteEulerProductCoefficients(cutoff, cutoff), [cutoff])
  const lanes = useMemo(() => fiveResidueLanes(cutoff), [cutoff])
  const verification = useMemo(() => verifyRamanujanFive(cutoff), [cutoff])
  const selectedCoefficient = coefficients[selectedN] ?? partitionNumber(selectedN)
  const stopPointer = (event: React.PointerEvent) => event.stopPropagation()

  return (
    <section className="number-theory-view" aria-label="Partition observatory" onPointerDown={stopPointer}>
      <header className="number-theory-header">
        <div>
          <span className="math-object-kicker">ARITHMETIC / FINITE OBSERVATORY</span>
          <h3>Simplex → partition function</h3>
        </div>
        <div className="number-theory-controls" aria-label="Partition controls">
          <label onPointerDown={stopPointer}>
            <span>selected N</span>
            <output>{selectedN}</output>
            <input
              aria-label="Selected N"
              type="range"
              min="1"
              max={Math.max(1, Math.round(object.maxN))}
              step="1"
              value={selectedN}
              onPointerDown={stopPointer}
              onChange={(event) => updateNumber(object, { selectedN: Number(event.target.value) }, `Selected partition size N=${event.target.value}`, run)}
            />
          </label>
          <label onPointerDown={stopPointer}>
            <span>product cutoff</span>
            <output>{cutoff}</output>
            <input
              aria-label="Finite Euler product cutoff"
              type="range"
              min={selectedN}
              max={Math.max(selectedN, Math.round(object.maxN))}
              step="1"
              value={cutoff}
              onPointerDown={stopPointer}
              onChange={(event) => updateNumber(object, { finiteCutoff: Number(event.target.value) }, `Changed Euler product cutoff to ${event.target.value}`, run)}
            />
          </label>
          <button
            type="button"
            className="number-theory-reveal"
            aria-pressed={object.revealTheorem}
            onPointerDown={stopPointer}
            onClick={() => updateNumber(object, { revealTheorem: !object.revealTheorem }, object.revealTheorem ? 'Hid theorem reveal' : 'Revealed Ramanujan theorem', run)}
          >
            {object.revealTheorem ? 'hide theorem' : 'reveal theorem'}
          </button>
        </div>
      </header>

      <div className="number-theory-chain" aria-label="Composition to partition transition">
        <div className="number-theory-step">
          <span className="step-index">01</span>
          <small>ordered simplex lattice point</small>
          <strong className="math-inline">({composition.join(', ')})</strong>
          <em>composition</em>
        </div>
        <span className="number-theory-arrow" aria-hidden="true">→ sort / quotient →</span>
        <div className="number-theory-step">
          <span className="step-index">02</span>
          <small>same total, order forgotten</small>
          <strong className="math-inline">({sortedPartition.join(', ')})</strong>
          <em>partition into parts ≤ 4</em>
        </div>
        <span className="number-theory-arrow" aria-hidden="true">→ multiplicities →</span>
        <div className="number-theory-step">
          <span className="step-index">03</span>
          <small>weighted multiplicity</small>
          <strong className="math-inline">k₁+2k₂+3k₃+4k₄={weightedTotal}</strong>
          <em>{multiplicities.map((count, index) => `k${index + 1}=${count}`).join(' · ')}</em>
        </div>
        <span className="number-theory-arrow" aria-hidden="true">→ unfold →</span>
        <div className="number-theory-step number-theory-product">
          <span className="step-index">04</span>
          <small>finite Euler product</small>
          <Tex latex={`\\prod_{m=1}^{${cutoff}}(1-q^m)^{-1}`} />
          <em>coefficients stream to p(N)</em>
        </div>
      </div>

      <div className="number-theory-main-grid">
        <article className="number-theory-card coefficient-card">
          <div className="number-theory-card-heading">
            <span>COEFFICIENT STRIP</span>
            <strong>p({selectedN}) = {selectedCoefficient}</strong>
          </div>
          <div className="coefficient-strip" aria-label={`Partition coefficients from zero to ${cutoff}`}>
            {coefficients.slice(0, Math.min(cutoff + 1, 16)).map((value, index) => (
              <div key={index} className={`coefficient-cell ${index === selectedN ? 'is-selected' : ''}`}>
                <small>{index}</small>
                <b>{value}</b>
              </div>
            ))}
            {cutoff + 1 > 16 && <span className="coefficient-more">… +{cutoff - 15} more</span>}
          </div>
          <p className="number-theory-boundary">Finite factors compute these displayed coefficients; the infinite product is the mathematical limit.</p>
        </article>

        <article className="number-theory-card ferrers-card">
          <div className="number-theory-card-heading">
            <span>FERRERS DIAGRAM</span>
            <strong>{diagram.cellCount} cells</strong>
          </div>
          <div className="ferrers-diagram" aria-label={`Ferrers diagram for ${sortedPartition.join(', ') || 'zero'}`}>
            {diagram.parts.length ? diagram.parts.map((length, row) => (
              <div className="ferrers-row" key={`${row}-${length}`}>
                {Array.from({ length }, (_, cell) => <i key={cell} aria-hidden="true" />)}
              </div>
            )) : <span className="ferrers-empty">∅</span>}
          </div>
          <p className="number-theory-boundary">Sorting quotients order; it does not turn the tetrahedral count into unrestricted p(N).</p>
        </article>
      </div>

      <section className="residue-observatory" aria-label="Five residue lanes">
        <div className="number-theory-card-heading">
          <span>RESIDUE OBSERVATORY / MOD 5</span>
          <strong>p(5n + 4) candidates</strong>
        </div>
        <div className="residue-lanes">
          {lanes.map((lane) => (
            <div key={lane.residue} className={`residue-lane ${lane.residue === 4 ? 'is-highlighted' : ''}`}>
              <span className="residue-lane-label">N ≡ {lane.residue}</span>
              <div className="residue-lane-values">
                {lane.values.slice(0, 6).map((entry) => (
                  <span key={entry.index} className={entry.modulo === 0 ? 'is-zero-mod' : ''}>
                    <small>p({entry.index})</small><b>{entry.value}</b><i>≡ {entry.modulo}</i>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {object.revealTheorem ? (
        <aside className={`ramanujan-reveal ${verification.verified ? 'is-verified' : 'has-counterexample'}`}>
          <span className="ramanujan-sigil">R</span>
          <div>
            <span className="math-object-kicker">THEOREM REVEAL</span>
            <h4><Tex latex={'p(5n+4)\\equiv 0\\pmod 5'} /></h4>
            <p>{verification.statement}</p>
            <small>{verification.checked.length} finite case{verification.checked.length === 1 ? '' : 's'} checked through N={cutoff}; this surface verifies examples, not the general proof.</small>
          </div>
        </aside>
      ) : (
        <button className="ramanujan-tease" type="button" onPointerDown={stopPointer} onClick={() => updateNumber(object, { revealTheorem: true }, 'Revealed Ramanujan theorem', run)}>
          <span>?</span> Five-fold pattern detected · reveal the theorem
        </button>
      )}
    </section>
  )
}
