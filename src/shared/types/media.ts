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
  // 0-100 while a transcode is running. Deliberately not persisted — it is
  // meaningless after a restart, and is merged in by the main process (see
  // withProgress() in main/ipc/media.ts).
  transcodeProgress?: number
  createdAt: number
}
