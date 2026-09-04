import assert from 'node:assert/strict'
import {
  SHOT_COVERAGE,
  containsBounds,
  frameCoverage,
  freeRegionFor,
  interpolateViewport,
  measureChromeInsets,
  screenBounds,
  solveViewportForBounds,
} from './framing.ts'

const EPSILON = 0.011
const emphases = ['detail', 'feature', 'establish']
const subjects = [
  { name: 'card', width: 800, height: 560 },
  { name: 'narrow card', width: 730, height: 560 },
  { name: 'explainer', width: 300, height: 300 },
  { name: 'caption', width: 420, height: 80 },
]
const canvases = [
  { name: 'film', width: 2560, height: 1440, left: 548, right: 536, bottom: 64 },
  { name: 'window', width: 1440, height: 900, left: 316, right: 308, bottom: 64 },
]

const intersects = (a, b) => (
  a.left < b.right - EPSILON && a.right > b.left + EPSILON
  && a.top < b.bottom - EPSILON && a.bottom > b.top + EPSILON
)

const neighbourBounds = (bounds, direction) => ({
  x: bounds.x + direction * 1000,
  y: bounds.y,
  width: 800,
  height: bounds.height,
})

const assertFrame = (solution, bounds, emphasis) => {
  const screen = screenBounds(bounds, solution.viewport)
  assert(containsBounds(solution.free, screen), 'subject must be fully inside the free region')
  assert(solution.coverage + EPSILON >= SHOT_COVERAGE[emphasis], 'shot must meet its stated coverage')
  if (emphasis !== 'establish') {
    for (const direction of [-1, 1]) {
      const neighbour = screenBounds(neighbourBounds(bounds, direction), solution.viewport)
      assert(!intersects(solution.free, neighbour), 'neighbour must not intrude into a detail/feature shot')
    }
  }
}

const solve = (canvas, insets, bounds, emphasis, extra = {}) => solveViewportForBounds({
  canvas,
  insets,
  bounds,
  emphasis,
  ...extra,
})

for (const canvas of canvases) {
  for (const consoleDocked of [false, true]) {
    for (const timelinesOpen of [false, true]) {
      for (const ledgerPinned of [false, true]) {
        const insets = {
          left: timelinesOpen ? canvas.left : ledgerPinned ? 316 : 0,
          right: consoleDocked ? canvas.right : 0,
          top: 0,
          bottom: canvas.bottom,
        }
        for (const subject of subjects) {
          const bounds = { x: 1800, y: 900, width: subject.width, height: subject.height }
          const solutions = emphases.map((emphasis) => solve(canvas, insets, bounds, emphasis))
          solutions.forEach((solution, index) => assertFrame(solution, bounds, emphases[index]))
          assert(solutions[0].coverage > solutions[1].coverage + 0.07, 'detail and feature must be visibly distinct')
          assert(solutions[1].coverage > solutions[2].coverage + 0.15, 'feature and establish must be visibly distinct')

          for (let from = 0; from < solutions.length; from += 1) {
            for (let to = 0; to < solutions.length; to += 1) {
              for (let step = 0; step <= 20; step += 1) {
                const viewport = interpolateViewport(solutions[from].viewport, solutions[to].viewport, step / 20)
                assert(containsBounds(solutions[to].free, screenBounds(bounds, viewport)), 'subject clipped mid-camera-move')
              }
            }
          }

          const repeated = solve(canvas, insets, bounds, 'feature')
          assert.deepEqual(repeated, solutions[1], 'the same inputs must produce the same frame')

          const anchor = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
          const anchored = solve(canvas, insets, bounds, 'detail', {
            anchor,
            currentViewport: solutions[2].viewport,
          })
          assert(anchored.anchorUsed, 'an on-picture safe cursor anchor must be retained')
          const oldPoint = {
            x: solutions[2].viewport.x + anchor.x * solutions[2].viewport.zoom,
            y: solutions[2].viewport.y + anchor.y * solutions[2].viewport.zoom,
          }
          const newPoint = {
            x: anchored.viewport.x + anchor.x * anchored.viewport.zoom,
            y: anchored.viewport.y + anchor.y * anchored.viewport.zoom,
          }
          assert(Math.abs(oldPoint.x - newPoint.x) < EPSILON && Math.abs(oldPoint.y - newPoint.y) < EPSILON,
            'cursor anchor must remain at the same screen point')

          const offPicture = solve(canvas, insets, bounds, 'detail', {
            anchor,
            currentViewport: { x: -100000, y: -100000, zoom: 1 },
          })
          assert(!offPicture.anchorUsed, 'an off-picture cursor must fall back to centring')
          assert.deepEqual(offPicture.viewport, solutions[0].viewport, 'off-picture fallback must use the stable centred frame')
        }
      }
    }
  }
}

// Exercise chrome measurement itself with the film's left evidence column,
// right console and bottom navigator. The chosen inset rectangle must be clear.
const canvasRect = { left: 44, right: 2604, top: 54, bottom: 1494 }
const chrome = [
  { left: 44, right: 344, top: 54, bottom: 1494 },
  { left: 576, right: 876, top: 424, bottom: 1134 },
  { left: 2068, right: 2588, top: 66, bottom: 872 },
  { left: 576, right: 1120, top: 1438, bottom: 1482 },
]
const measured = measureChromeInsets(canvasRect, chrome)
const measuredFree = freeRegionFor({ width: 2560, height: 1440 }, measured)
for (const overlay of chrome) {
  const local = {
    left: overlay.left - canvasRect.left,
    right: overlay.right - canvasRect.left,
    top: overlay.top - canvasRect.top,
    bottom: overlay.bottom - canvasRect.top,
  }
  assert(!intersects(measuredFree, local), 'measured free region must not intersect chrome')
}
assert.deepEqual(measureChromeInsets(canvasRect, chrome), measured, 'chrome measurement must be deterministic')
const representative = canvases[0]
const representativeInsets = {
  left: representative.left,
  right: representative.right,
  top: 0,
  bottom: representative.bottom,
}
const rows = subjects.flatMap((subject) => emphases.map((emphasis) => {
  const bounds = { x: 1800, y: 900, width: subject.width, height: subject.height }
  const solution = solve(representative, representativeInsets, bounds, emphasis)
  return {
    shot: `${emphasis} · ${subject.width}x${subject.height}`,
    zoom: solution.viewport.zoom.toFixed(3),
    coverage: `${(frameCoverage(bounds, solution.viewport, solution.free) * 100).toFixed(1)}%`,
    target: `${(SHOT_COVERAGE[emphasis] * 100).toFixed(0)}%`,
  }
}))

console.log('Framing harness: all constraints passed across 16 chrome/canvas combinations.')
console.table(rows)
