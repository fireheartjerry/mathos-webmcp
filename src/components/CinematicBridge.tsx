'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { BridgeTransition } from '../domain/demo/shotContract'
import type { Point } from '../domain/world/types'

/**
 * A presentational match transition. It reads screen anchors and a few
 * already-computed values, draws the preserved object moving from one frame
 * to the next, and removes itself at rest. It never owns mathematical state.
 */
export type BridgeEndpoints = {
  source: Point
  target: Point
  sourceLabel: string
  targetLabel: string
  /** Honest values the preserved object carries (masses, weights, lattice indices). */
  values?: number[]
}

type Anchor = { objectId: string; fraction: Point; label: string }

/** Which world objects a bridge leaves and lands on, as fractions of their bounds. */
export function bridgeAnchors(transition: BridgeTransition): { source: Anchor; target: Anchor } {
  switch (transition) {
    case 'minus-integral':
      return {
        source: { objectId: 'opening_annotation_circle', fraction: { x: 0.5, y: 0.5 }, label: 'the circled −' },
        target: { objectId: 'eq_integral', fraction: { x: 0.37, y: 0.5 }, label: '∫₀^∞' },
      }
    case 'area-bins':
      return {
        source: { objectId: 'graph_integrand', fraction: { x: 0.33, y: 0.5 }, label: 'normalized area' },
        target: { objectId: 'attention_mechanism', fraction: { x: 0.82, y: 0.62 }, label: 'probability masses' },
      }
    case 'bins-logits':
      return {
        source: { objectId: 'attention_mechanism', fraction: { x: 0.82, y: 0.62 }, label: 'w = softmax(log w)' },
        target: { objectId: 'training_panel', fraction: { x: 0.5, y: 0.5 }, label: 'next-token distribution' },
      }
    case 'ribbons-triangle':
      return {
        source: { objectId: 'training_panel', fraction: { x: 0.3, y: 0.55 }, label: 'attention ribbons' },
        target: { objectId: 'barycentric_geometry', fraction: { x: 0.36, y: 0.42 }, label: 'P = αA + βB + γC' },
      }
    case 'triangle-simplex':
      return {
        source: { objectId: 'geometry_construction', fraction: { x: 0.35, y: 0.55 }, label: 'triangle ABC' },
        target: { objectId: 'simplex_projection', fraction: { x: 0.37, y: 0.46 }, label: 'α + β + γ + δ = 1' },
      }
    case 'lattice-lanes':
      return {
        source: { objectId: 'partition_observatory', fraction: { x: 0.5, y: 0.72 }, label: 'n mod 5' },
        target: { objectId: '', fraction: { x: 0.5, y: 0.5 }, label: 'tool families' },
      }
  }
}

const DURATION_MS = 1150
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpPoint = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

type Frame = {
  segments: Array<{ points: Point[]; role: 'object' | 'focus' }>
  dots: Array<{ at: Point; role: 'object' | 'focus' }>
  caption: string
}

function resample(points: Point[], count: number): Point[] {
  if (points.length === 0) return Array.from({ length: count }, () => ({ x: 0, y: 0 }))
  if (points.length === 1) return Array.from({ length: count }, () => points[0])
  const lengths: number[] = [0]
  for (let index = 1; index < points.length; index += 1) {
    lengths.push(lengths[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y))
  }
  const total = lengths[lengths.length - 1] || 1
  return Array.from({ length: count }, (_, index) => {
    const distance = (index / Math.max(1, count - 1)) * total
    let segment = 1
    while (segment < lengths.length - 1 && lengths[segment] < distance) segment += 1
    const span = lengths[segment] - lengths[segment - 1] || 1
    const t = clamp01((distance - lengths[segment - 1]) / span)
    return lerpPoint(points[segment - 1], points[segment], t)
  })
}

const morph = (from: Point[], to: Point[], t: number, count = 40): Point[] => {
  const a = resample(from, count)
  const b = resample(to, count)
  return a.map((point, index) => lerpPoint(point, b[index], t))
}

const normalize = (values: number[] | undefined, fallback: number[]): number[] => {
  const source = values && values.length ? values : fallback
  const total = source.reduce((sum, value) => sum + Math.max(0, value), 0) || 1
  return source.map((value) => Math.max(0, value) / total)
}

/** Local-space (origin-centred) geometry of each transition at progress `t`. */
function frameFor(transition: BridgeTransition, t: number, values?: number[]): Frame {
  switch (transition) {
    case 'minus-integral': {
      const bar = [{ x: -24, y: 0 }, { x: 24, y: 0 }]
      const integral = Array.from({ length: 24 }, (_, index) => {
        const u = index / 23
        return { x: 13 * Math.sin(Math.PI * u) * (1 - 2 * u), y: (u - 0.5) * 68 }
      })
      return { segments: [{ points: morph(bar, integral, t), role: t < 0.5 ? 'focus' : 'object' }], dots: [], caption: 'the sign becomes the integral' }
    }
    case 'area-bins': {
      const masses = normalize(values, [0.33, 0.45, 0.22])
      const curve: Point[] = []
      for (let index = 0; index <= 30; index += 1) {
        const x = index / 30
        const y = Math.pow(x * 6, 3.5) * Math.exp(-x * 6) / 3.2
        curve.push({ x: -60 + x * 120, y: -y * 46 })
      }
      const area = [{ x: -60, y: 0 }, ...curve, { x: 60, y: 0 }, { x: -60, y: 0 }]
      const bins: Point[] = [{ x: -60, y: 0 }]
      masses.forEach((mass, index) => {
        const left = -60 + index * 40
        bins.push({ x: left, y: -mass * 110 }, { x: left + 40, y: -mass * 110 }, { x: left + 40, y: 0 })
      })
      bins.push({ x: -60, y: 0 })
      return { segments: [{ points: morph(area, bins, t, 64), role: 'focus' }], dots: [], caption: 'area separates into three masses' }
    }
    case 'bins-logits': {
      const masses = normalize(values, [0.33, 0.45, 0.22])
      const logs = masses.map((mass) => Math.log(Math.max(1e-6, mass)))
      const phase = t < 0.5 ? t * 2 : (t - 0.5) * 2
      const heights = masses.map((mass, index) => (t < 0.5 ? lerp(mass * 110, logs[index] * 26, phase) : lerp(logs[index] * 26, mass * 110, phase)))
      const segments = heights.map((height, index) => ({
        points: [{ x: -50 + index * 40, y: 0 }, { x: -50 + index * 40, y: -height }],
        role: (t >= 0.5 ? 'focus' : 'object') as 'focus' | 'object',
      }))
      segments.push({ points: [{ x: -70, y: 0 }, { x: 70, y: 0 }], role: 'object' })
      return { segments, dots: [], caption: t < 0.5 ? 'w → log w' : 'softmax(log w) = w' }
    }
    case 'ribbons-triangle': {
      const weights = normalize(values, [0.33, 0.45, 0.22])
      const vertices = [{ x: -70, y: 50 }, { x: 70, y: 50 }, { x: 0, y: -60 }]
      const point = vertices.reduce((sum, vertex, index) => ({ x: sum.x + vertex.x * weights[index], y: sum.y + vertex.y * weights[index] }), { x: 0, y: 0 })
      const ribbons = weights.map((weight, index) => [{ x: -70, y: -30 + index * 30 }, { x: -70 + weight * 140, y: -30 + index * 30 }])
      const cevians = vertices.map((vertex) => [vertex, point])
      const segments: Frame['segments'] = ribbons.map((ribbon, index) => ({ points: morph(ribbon, cevians[index], t, 2), role: 'focus' as const }))
      const outline = [...vertices, vertices[0]]
      segments.push({ points: outline.map((vertex) => ({ x: vertex.x * t, y: vertex.y * t })), role: 'object' })
      return { segments, dots: [{ at: lerpPoint({ x: 0, y: 0 }, point, t), role: 'focus' }], caption: 'weights locate the point' }
    }
    case 'triangle-simplex': {
      const base = [{ x: -70, y: 40 }, { x: 70, y: 40 }, { x: 0, y: -50 }]
      const apex = { x: 12, y: -18 }
      const lifted = base.map((vertex) => ({ x: vertex.x * 0.86 + 10, y: vertex.y * 0.62 + 24 }))
      const segments = [
        { points: [lerpPoint(base[0], lifted[0], t), lerpPoint(base[1], lifted[1], t)], role: 'object' as const },
        { points: [lerpPoint(base[1], lifted[1], t), lerpPoint(base[2], lifted[2], t)], role: 'object' as const },
        { points: [lerpPoint(base[2], lifted[2], t), lerpPoint(base[0], lifted[0], t)], role: 'object' as const },
        ...lifted.map((vertex) => ({ points: [lerpPoint({ x: 0, y: 0 }, apex, t), lerpPoint(vertex, vertex, t)], role: 'focus' as const })),
      ]
      return { segments, dots: [{ at: lerpPoint({ x: 0, y: 0 }, apex, t), role: 'focus' }], caption: 'a fourth weight lifts the triangle' }
    }
    case 'lattice-lanes': {
      const count = Math.max(10, Math.min(56, values?.[0] ?? 20))
      const dots = Array.from({ length: count }, (_, n) => {
        const row = Math.floor(n / 8)
        const from = { x: -70 + (n % 8) * 20, y: -40 + row * 16 }
        const lane = n % 5
        const to = { x: -60 + lane * 30, y: 40 - Math.floor(n / 5) * 7 }
        return { at: lerpPoint(from, to, t), role: (lane === 4 ? 'focus' : 'object') as 'focus' | 'object' }
      })
      return { segments: [], dots, caption: 'index n sorts into five residue lanes' }
    }
  }
}

export default function CinematicBridge({
  transition,
  endpoints,
  onDone,
}: {
  transition: BridgeTransition
  endpoints: BridgeEndpoints
  onDone: () => void
}) {
  const [progress, setProgress] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { onDone(); return }
    const start = performance.now()
    const tick = (now: number) => {
      const raw = clamp01((now - start) / DURATION_MS)
      setProgress(raw)
      if (raw < 1) frameRef.current = window.requestAnimationFrame(tick)
      else window.setTimeout(onDone, 260)
    }
    frameRef.current = window.requestAnimationFrame(tick)
    return () => { if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current) }
  }, [onDone])

  const t = easeInOut(progress)
  const position = lerpPoint(endpoints.source, endpoints.target, t)
  const frame = frameFor(transition, t, endpoints.values)
  // Bridges are authored at ~140 px; scale them with the frame so they read at 2560 wide.
  const size = Math.max(1, Math.min(window.innerWidth, window.innerHeight) / 640)
  const scale = size * (1 + 0.35 * Math.sin(Math.PI * t))
  const toScreen = (point: Point): string => `${(position.x + point.x * scale).toFixed(1)},${(position.y + point.y * scale).toFixed(1)}`
  const captionOpacity = Math.sin(Math.PI * t)

  return (
    <svg className="cinematic-bridge" aria-hidden="true" style={{ '--bridge-size': size } as CSSProperties}>
      <line className="bridge-guide" x1={endpoints.source.x} y1={endpoints.source.y} x2={position.x} y2={position.y} />
      {frame.segments.map((segment, index) => (
        <polyline key={index} className={`bridge-segment is-${segment.role}`} points={segment.points.map(toScreen).join(' ')} />
      ))}
      {frame.dots.map((dot, index) => {
        const [x, y] = toScreen(dot.at).split(',').map(Number)
        return <circle key={index} className={`bridge-dot is-${dot.role}`} cx={x} cy={y} r={(dot.role === 'focus' ? 4.5 : 2.6) * size} />
      })}
      <g className="bridge-caption" style={{ opacity: captionOpacity }} transform={`translate(${position.x.toFixed(1)}, ${(position.y + 78 * scale).toFixed(1)}) scale(${size.toFixed(2)})`}>
        <text textAnchor="middle">{frame.caption}</text>
        <text className="bridge-caption-endpoints" textAnchor="middle" y="18">{endpoints.sourceLabel} → {endpoints.targetLabel}</text>
      </g>
    </svg>
  )
}
