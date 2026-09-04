export type FrameEmphasis = 'detail' | 'feature' | 'establish'

export type FrameBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type FrameInsets = {
  left: number
  right: number
  top: number
  bottom: number
}

export type FrameViewport = {
  x: number
  y: number
  zoom: number
}

export type EdgeRect = {
  left: number
  right: number
  top: number
  bottom: number
}

export type FreeRegion = EdgeRect & {
  width: number
  height: number
}

/** Linear fill of the free region on the limiting axis. */
export const SHOT_COVERAGE = {
  detail: 0.94,
  feature: 0.78,
  establish: 0.44,
} as const

const EPSILON = 1e-7

const uniqueSorted = (values: number[]) => [...new Set(values.map((value) => Math.round(value * 1000) / 1000))]
  .sort((a, b) => a - b)

const overlaps = (a: EdgeRect, b: EdgeRect) => (
  a.left < b.right - EPSILON
  && a.right > b.left + EPSILON
  && a.top < b.bottom - EPSILON
  && a.bottom > b.top + EPSILON
)

/**
 * Find the largest axis-aligned inset rectangle that contains no floating chrome.
 * Candidate edges only need to occur at a chrome edge (or the canvas edge), which
 * makes this exhaustive for the small set of panels in the workspace.
 */
export const measureChromeInsets = (
  canvas: EdgeRect,
  overlays: EdgeRect[],
  gutter = 16,
): FrameInsets => {
  const width = Math.max(0, canvas.right - canvas.left)
  const height = Math.max(0, canvas.bottom - canvas.top)
  if (width <= 0 || height <= 0) return { left: 0, right: 0, top: 0, bottom: 0 }

  const blocks = overlays.map((rect) => ({
    left: Math.max(0, rect.left - canvas.left - gutter),
    right: Math.min(width, rect.right - canvas.left + gutter),
    top: Math.max(0, rect.top - canvas.top - gutter),
    bottom: Math.min(height, rect.bottom - canvas.top + gutter),
  })).filter((rect) => rect.right > rect.left && rect.bottom > rect.top)

  if (blocks.length === 0) return { left: 0, right: 0, top: 0, bottom: 0 }

  const lefts = uniqueSorted([0, ...blocks.map((rect) => rect.right)])
  const rights = uniqueSorted([0, ...blocks.map((rect) => width - rect.left)])
  const tops = uniqueSorted([0, ...blocks.map((rect) => rect.bottom)])
  const bottoms = uniqueSorted([0, ...blocks.map((rect) => height - rect.top)])
  let best = { left: width, right: 0, top: 0, bottom: 0, area: 0, inset: width }

  for (const left of lefts) {
    for (const right of rights) {
      const freeWidth = width - left - right
      if (freeWidth <= 0) continue
      for (const top of tops) {
        for (const bottom of bottoms) {
          const freeHeight = height - top - bottom
          if (freeHeight <= 0) continue
          const region = { left, right: width - right, top, bottom: height - bottom }
          if (blocks.some((block) => overlaps(region, block))) continue
          const area = freeWidth * freeHeight
          const inset = left + right + top + bottom
          if (area > best.area + EPSILON || (Math.abs(area - best.area) <= EPSILON && inset < best.inset)) {
            best = { left, right, top, bottom, area, inset }
          }
        }
      }
    }
  }

  return { left: best.left, right: best.right, top: best.top, bottom: best.bottom }
}

export const freeRegionFor = (
  canvas: { width: number; height: number },
  insets: FrameInsets,
): FreeRegion => {
  const left = Math.max(0, insets.left)
  const top = Math.max(0, insets.top)
  const right = Math.max(left, canvas.width - Math.max(0, insets.right))
  const bottom = Math.max(top, canvas.height - Math.max(0, insets.bottom))
  return { left, right, top, bottom, width: right - left, height: bottom - top }
}

export const screenBounds = (bounds: FrameBounds, viewport: FrameViewport): FreeRegion => {
  const left = viewport.x + bounds.x * viewport.zoom
  const top = viewport.y + bounds.y * viewport.zoom
  const width = bounds.width * viewport.zoom
  const height = bounds.height * viewport.zoom
  return { left, right: left + width, top, bottom: top + height, width, height }
}

export const frameCoverage = (bounds: FrameBounds, viewport: FrameViewport, free: FreeRegion) => {
  const screen = screenBounds(bounds, viewport)
  return Math.max(screen.width / free.width, screen.height / free.height)
}

export const containsBounds = (free: FreeRegion, screen: EdgeRect, epsilon = 0.01) => (
  screen.left >= free.left - epsilon
  && screen.right <= free.right + epsilon
  && screen.top >= free.top - epsilon
  && screen.bottom <= free.bottom + epsilon
)

export const interpolateViewport = (from: FrameViewport, to: FrameViewport, t: number): FrameViewport => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  zoom: from.zoom + (to.zoom - from.zoom) * t,
})

export type FramingSolution = {
  viewport: FrameViewport
  free: FreeRegion
  coverage: number
  requestedCoverage: number
  anchorUsed: boolean
  neighboursExcluded: boolean
}

type SolveFramingOptions = {
  canvas: { width: number; height: number }
  insets: FrameInsets
  bounds: FrameBounds
  emphasis?: FrameEmphasis
  anchor?: { x: number; y: number } | null
  currentViewport?: FrameViewport
  pitch?: number
  neighbourWidth?: number
  minZoom?: number
}

const horizontalPlacement = (
  free: FreeRegion,
  bounds: FrameBounds,
  zoom: number,
  excludeNeighbours: boolean,
  pitch: number,
  neighbourWidth: number,
) => {
  const subjectWidth = bounds.width * zoom
  const lower = excludeNeighbours ? Math.max(free.left, free.right - pitch * zoom) : free.left
  const upper = excludeNeighbours
    ? Math.min(free.right - subjectWidth, free.left + (pitch - neighbourWidth) * zoom)
    : free.right - subjectWidth
  return { lower, upper }
}

/** Solve all framing constraints together; no additive context margin is involved. */
export const solveViewportForBounds = ({
  canvas,
  insets,
  bounds,
  emphasis = 'feature',
  anchor = null,
  currentViewport,
  pitch = 1000,
  neighbourWidth = 800,
  minZoom = 0.25,
}: SolveFramingOptions): FramingSolution => {
  if (![canvas.width, canvas.height, bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
      || canvas.width <= 0 || canvas.height <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error('Cannot frame non-finite or non-positive canvas and subject bounds.')
  }

  const free = freeRegionFor(canvas, insets)
  if (free.width <= 0 || free.height <= 0) throw new Error('Floating chrome leaves no free region for the subject.')
  const requestedCoverage = SHOT_COVERAGE[emphasis]
  const fitZoom = Math.min(free.width / bounds.width, free.height / bounds.height)
  const canTryNeighbourExclusion = emphasis !== 'establish' && bounds.width <= pitch && neighbourWidth <= pitch
  const neighbourZoom = canTryNeighbourExclusion ? free.width / (pitch * 2 - neighbourWidth) : 0
  // Chrome can leave a region too narrow to hide both neighbouring columns. In that
  // case containment wins: keep the requested visual coverage where possible and
  // allow a sliver of context instead of failing the camera tool (and the replay).
  const excludesNeighbours = canTryNeighbourExclusion && neighbourZoom <= fitZoom + EPSILON
  const zoom = Math.min(fitZoom, Math.max(minZoom, fitZoom * requestedCoverage, excludesNeighbours ? neighbourZoom : 0))

  const horizontal = horizontalPlacement(free, bounds, zoom, excludesNeighbours, pitch, neighbourWidth)
  const vertical = { lower: free.top, upper: free.bottom - bounds.height * zoom }
  if (horizontal.lower > horizontal.upper + EPSILON || vertical.lower > vertical.upper + EPSILON) {
    throw new Error(`Cannot place ${bounds.width}x${bounds.height} subject inside the free region.`)
  }

  let subjectLeft = Math.min(horizontal.upper, Math.max(horizontal.lower, free.left + (free.width - bounds.width * zoom) / 2))
  let subjectTop = Math.min(vertical.upper, Math.max(vertical.lower, free.top + (free.height - bounds.height * zoom) / 2))
  let anchorUsed = false

  if (anchor && currentViewport) {
    const screenX = currentViewport.x + anchor.x * currentViewport.zoom
    const screenY = currentViewport.y + anchor.y * currentViewport.zoom
    const onPicture = screenX >= free.left && screenX <= free.right && screenY >= free.top && screenY <= free.bottom
    if (onPicture) {
      const anchoredLeft = screenX + (bounds.x - anchor.x) * zoom
      const anchoredTop = screenY + (bounds.y - anchor.y) * zoom
      if (anchoredLeft >= horizontal.lower - EPSILON && anchoredLeft <= horizontal.upper + EPSILON
          && anchoredTop >= vertical.lower - EPSILON && anchoredTop <= vertical.upper + EPSILON) {
        subjectLeft = anchoredLeft
        subjectTop = anchoredTop
        anchorUsed = true
      }
    }
  }

  const viewport = {
    x: subjectLeft - bounds.x * zoom,
    y: subjectTop - bounds.y * zoom,
    zoom,
  }
  return {
    viewport,
    free,
    coverage: frameCoverage(bounds, viewport, free),
    requestedCoverage,
    anchorUsed,
    neighboursExcluded: excludesNeighbours,
  }
}
