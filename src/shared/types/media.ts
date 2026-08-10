export type MediaKind = 'video' | 'image'

export type TranscodeStatus = 'none' | 'pending' | 'transcoding' | 'done' | 'failed'

export interface MediaItem {
  id: string
  path: string
  displayPath: string
  kind: MediaKind
  name: string
  durationSec: number | null
  width: number | null
  height: number | null
  thumbnailPath: string | null
  needsTranscode: boolean
  transcodeStatus: TranscodeStatus
  createdAt: number
}
