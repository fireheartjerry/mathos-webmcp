import { useCallback } from 'react'

/** The single gesture owner selected when a pointer enters the canvas. */
export type CanvasInputOwner = 'pan' | 'ink' | 'erase' | 'object' | 'handle' | 'control'

type RouterInput = {
  button: number
  mode: string
  target: EventTarget | null
  objectId?: string | null
  objectKind?: string | null
}

function targetElement(target: EventTarget | null): Element | null {
  return typeof Element !== 'undefined' && target instanceof Element ? target : null
}

function closest(target: EventTarget | null, selector: string): Element | null {
  return targetElement(target)?.closest(selector) ?? null
}

/** Explicit markers are preferred; the class/native-control fallbacks cover existing widgets. */
export function isCanvasHandleTarget(target: EventTarget | null): boolean {
  return Boolean(closest(target, '[data-canvas-handle], .gamma-bound-handle, .geometry-point.is-draggable, .barycentric-point'))
}

export function isCanvasControlTarget(target: EventTarget | null): boolean {
  if (isCanvasHandleTarget(target)) return false
  if (closest(target, '[data-canvas-control]')) return true
  if (closest(target, 'input, textarea, select, button, option, label, [contenteditable="true"], [role="slider"], [role="spinbutton"]')) return true
  const element = closest(target, '[class]')
  if (!element) return false
  const className = element.getAttribute('class') ?? ''
  return /(?:^|[-_ ])controls?(?:$|[-_ ])/.test(className)
}

/**
 * Decide ownership without inspecting React state. Canvas capture handlers can use this
 * before a nested widget gets a chance to stop propagation.
 */
export function chooseCanvasInputOwner({ button, mode, target, objectId, objectKind }: RouterInput): CanvasInputOwner | null {
  if (button === 2) return 'pan'
  if (button !== 0) return null
  if (mode === 'pen' || mode === 'highlighter') return 'ink'
  if (mode === 'hand') return 'pan'
  if (mode === 'select' && isCanvasHandleTarget(target)) return 'handle'
  if (mode === 'select' && isCanvasControlTarget(target)) return 'control'
  if (mode === 'eraser' && objectId) return 'erase'
  if (mode === 'select' && objectId && objectKind) return 'object'
  return null
}

/** Stable hook used by the canvas and object boundary for the same priority policy. */
export function useCanvasInputRouter(mode: string) {
  return useCallback((input: Omit<RouterInput, 'mode'> & { mode?: string }) => chooseCanvasInputOwner({ ...input, mode: input.mode ?? mode }), [mode])
}
