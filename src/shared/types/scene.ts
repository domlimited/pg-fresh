export type SourceType = 'placeholder' | 'video' | 'image' | 'camera' | 'webview' | 'stream' | 'screen'

export type FitMode = 'contain' | 'cover' | 'stretch'

export interface LayerCrop {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Layer {
  id: string
  name: string
  sourceType: SourceType
  color?: string
  mediaId?: string
  mediaPath?: string
  deviceId?: string
  url?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  zIndex: number
  loop?: boolean
  isPlaying?: boolean
  currentTime?: number
  volume?: number
  muted?: boolean
  audioOutputId?: string
  // Undefined means the pre-v3 default: no crop, fit 'cover' — see
  // getMediaObjectFit()/getCropClipPath() in canvas-engine/layerStyle.ts.
  crop?: LayerCrop
  fit?: FitMode
}

export type TakeMode = 'cut' | 'fade'

export interface ProgramUpdatePayload {
  layers: Layer[]
  mode: TakeMode
  fadeMs: number
}

export interface TimecodeSyncPayload {
  layerId: string
  currentTime: number
  isPlaying: boolean
}
