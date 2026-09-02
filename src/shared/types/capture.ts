export interface CaptureSource {
  id: string
  name: string
  thumbnailDataUrl: string
  // The owning application's icon. A window that is occluded, on another
  // Space, or freshly opened often yields a blank/black thumbnail, and the
  // window title alone ("Untitled", "") is frequently useless — the icon is
  // what makes a row identifiable in practice.
  appIconDataUrl: string | null
}

export interface CaptureSourceList {
  denied: boolean
  sources: CaptureSource[]
}
