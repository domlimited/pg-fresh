import type { CSSProperties } from 'react'
import type { FitMode, Layer } from '@common/types/scene'

// The single definition of what an un-adjusted layer does. It stays a
// constant rather than being written into every new layer by
// sceneStore.setActiveSource(): `fit: undefined` is what "the operator hasn't
// touched this" means, which the reset button and the per-source adjustment
// memory both need to be able to express. Every reader of `layer.fit` must
// fall back to this — the previous default ('cover') was spelled out
// independently in three files, and that is how it survived this long.
export const DEFAULT_FIT: FitMode = 'contain'

// Undefined fit means 'contain' — the whole frame is visible, letterboxed.
// This used to fall back to 'cover', which silently cropped anything whose
// aspect ratio didn't match the canvas: load a portrait photo on a 16:9 wall
// and its top and bottom were gone before the operator touched anything (see
// docs/requirement-v5). Cropping to fill is still one click away (the Cover
// button in OutputAdjustPanel) — it just isn't what happens by default now.
export function getMediaObjectFit(layer: Layer): CSSProperties['objectFit'] {
  switch (layer.fit ?? DEFAULT_FIT) {
    case 'cover':
      return 'cover'
    case 'stretch':
      return 'fill'
    case 'contain':
    default:
      return 'contain'
  }
}

export function getCropClipPath(layer: Layer): string | undefined {
  const crop = layer.crop
  if (!crop) return undefined
  const { top, right, bottom, left } = crop
  if (!top && !right && !bottom && !left) return undefined
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`
}
