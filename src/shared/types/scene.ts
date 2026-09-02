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
  // Changes on every setActiveSource() call, unlike `id`, which is the fixed
  // ACTIVE_LAYER_ID shared by every source the switcher loads. Effects that
  // must re-run when the operator loads different media have to depend on
  // this — keying them on `id` meant they never re-ran at all, so transport
  // state stayed pinned to whatever clip was loaded first (requirement-v5,
  // ปัญหาข้อ 2).
  loadId: string
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
  // Measured by ffprobe at import time. <video>.duration is NaN until
  // metadata arrives and Infinity for live sources, so the transport falls
  // back to this rather than showing 0:00.
  durationSec?: number
  loop?: boolean
  isPlaying?: boolean
  currentTime?: number
  volume?: number
  muted?: boolean
  audioOutputId?: string
  // Undefined means no crop and fit 'contain' (show the whole frame) — see
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
