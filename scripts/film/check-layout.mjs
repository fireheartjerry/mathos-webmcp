/**
 * Fail loudly when two things the film builds would overlap on the canvas.
 *
 * The world grid was laid out for 470x330 cards. The cards are 800x560 now and the
 * camera sits closer, so neighbours that used to be comfortably apart started
 * covering each other — which a frame review flagged three separate times before
 * anyone traced it to the bounds. Overlap is a property of the numbers, so check the
 * numbers instead of re-watching the film.
 *
 *   node scripts/film/check-layout.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = resolve('.', 'src/domain/replay/script.ts')
const text = readFileSync(SOURCE, 'utf8')

/** Minimum clear space between two boxes, so nothing sits flush against a neighbour. */
const GUTTER = 80
/** Anything this far out is a deliberate off-canvas fixture, not part of the layout. */
const OFF_CANVAS = -2000

/**
 * Shapes, arrows and frames are MEANT to overlap: a box rings a card, an arrow spans
 * from one widget to another. Only widgets and their captions compete for space.
 */
const CONNECTOR = /kind: '(arrow|shape|frame)'|create_shape|set_arrow/
/** A caption sits deliberately close under its own card. */
const CAPTION = /kind: 'text'/

const boxes = []
const pattern = /bounds: \{ x: (-?[\d.]+), y: (-?[\d.]+), width: ([\d.]+), height: ([\d.]+) \}/g
for (const match of text.matchAll(pattern)) {
  const line = text.slice(0, match.index).split('\n').length
  const [x, y, width, height] = match.slice(1, 5).map(Number)
  if (x <= OFF_CANVAS || y <= OFF_CANVAS) continue
  const context = text.slice(Math.max(0, match.index - 420), match.index)
  if (CONNECTOR.test(context)) continue
  boxes.push({ line, x, y, width, height, caption: CAPTION.test(context) })
}

const gap = (a, b) => {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width))
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height))
  return Math.max(dx, dy)
}

const problems = []
for (let i = 0; i < boxes.length; i += 1) {
  for (let j = i + 1; j < boxes.length; j += 1) {
    const separation = gap(boxes[i], boxes[j])
    // A caption belongs to the card above it, so it may sit closer than two widgets may.
    const needed = boxes[i].caption || boxes[j].caption ? 24 : GUTTER
    if (separation >= needed) continue
    problems.push({ a: boxes[i], b: boxes[j], separation, needed })
  }
}

const show = (box) => `script.ts:${box.line} [${box.x},${box.y} ${box.width}x${box.height}]`
if (problems.length) {
  console.error(`${problems.length} layout problem${problems.length === 1 ? '' : 's'} (need ${GUTTER}px clear):\n`)
  for (const { a, b, separation, needed } of problems) {
    const how = separation < 0
      ? `OVERLAP by ${Math.abs(separation).toFixed(0)}px`
      : `only ${separation.toFixed(0)}px apart, needs ${needed}px`
    console.error(`  ${how}\n    ${show(a)}\n    ${show(b)}\n`)
  }
  process.exit(1)
}
console.log(`layout ok: ${boxes.length} boxes, all at least ${GUTTER}px apart`)
