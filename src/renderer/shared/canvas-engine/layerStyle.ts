import type { CSSProperties } from 'react'
import type { Layer } from '@common/types/scene'

// Undefined fit preserves the pre-v3 behavior (object-cover) so existing
// presets/layers with no `fit` field don't change how they render.
export function getMediaObjectFit(layer: Layer): CSSProperties['objectFit'] {
  switch (layer.fit) {
    case 'contain':
      return 'contain'
    case 'stretch':
      return 'fill'
    case 'cover':
    default:
      return 'cover'
  }
}

export function getCropClipPath(layer: Layer): string | undefined {
  const crop = layer.crop
  if (!crop) return undefined
  const { top, right, bottom, left } = crop
  if (!top && !right && !bottom && !left) return undefined
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`
}
