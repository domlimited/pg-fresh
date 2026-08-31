export interface CaptureSource {
  id: string
  name: string
  thumbnailDataUrl: string
}

export interface CaptureSourceList {
  denied: boolean
  sources: CaptureSource[]
}
