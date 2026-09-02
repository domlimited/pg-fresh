import type { FitMode, LayerCrop } from './scene'

// What the "ปรับ OUTPUT ก่อนส่ง" panel produces, remembered per source so that
// switching away from a clip and back doesn't discard the operator's work
// (requirement-v5, ปัญหาข้อ 4).
//
// Deliberately excludes anything transient (currentTime, isPlaying) and
// anything that identifies the source itself (name, mediaPath, loadId) — this
// is only the adjustment, applied on top of a freshly built layer.
export interface SourceAdjustment {
  // Geometry is stored as a fraction of the canvas, never as pixels: OUTPUT
  // resolution is user-configurable, so a box saved against 1920x1080 would
  // land in the wrong place — and at the wrong size — on a 3840x1080 wall.
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  fit?: FitMode
  crop?: LayerCrop
  volume?: number
  muted?: boolean
  loop?: boolean
  audioOutputId?: string
}

// Key format is shared with the main process, which drops a media item's
// adjustment when the item is removed from the library — keep both sides
// building keys through these helpers rather than inlining the prefix.
export function mediaSourceKey(mediaId: string): string {
  return `media:${mediaId}`
}

export interface SourceIdentity {
  name: string
  mediaId?: string
  deviceId?: string
  url?: string
}

// Stable across loads of the same source, unlike Layer.loadId. Prefixed by
// field so a device id can never collide with a media id.
export function sourceKeyFor(source: SourceIdentity): string {
  if (source.mediaId) return mediaSourceKey(source.mediaId)
  if (source.deviceId) return `device:${source.deviceId}`
  if (source.url) return `url:${source.url}`
  return `name:${source.name}`
}
