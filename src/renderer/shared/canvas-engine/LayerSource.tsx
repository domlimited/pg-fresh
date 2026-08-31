import type { ComponentType } from 'react'
import type { Layer } from '@common/types/scene'
import { CameraLayer } from './CameraLayer'
import { LayerContent } from './LayerContent'
import { ScreenCaptureLayer } from './ScreenCaptureLayer'
import { StreamLayer } from './StreamLayer'
import { WebviewLayer } from './WebviewLayer'

interface LayerSourceProps {
  layer: Layer
  role: 'control' | 'output'
  // Forces audio off regardless of `role` — see LayerRenderer's muteAudio
  // doc comment (used by the embedded Program Monitor).
  muteAudio?: boolean
  // 'video' rendering differs between Control (muted, manual transport
  // controls) and Output (autoplay + timecode-sync-driven) — every other
  // source type shares one component, parameterized by `role` for audio.
  VideoComponent: ComponentType<{ layer: Layer; muteAudio?: boolean }>
}

export function LayerSource({ layer, role, muteAudio, VideoComponent }: LayerSourceProps): JSX.Element {
  switch (layer.sourceType) {
    case 'video':
      return <VideoComponent layer={layer} muteAudio={muteAudio} />
    case 'camera':
      return <CameraLayer layer={layer} role={role} muteAudio={muteAudio} />
    case 'screen':
      return <ScreenCaptureLayer layer={layer} />
    case 'webview':
      return <WebviewLayer layer={layer} role={role} muteAudio={muteAudio} />
    case 'stream':
      return <StreamLayer layer={layer} role={role} muteAudio={muteAudio} />
    default:
      return <LayerContent layer={layer} />
  }
}
