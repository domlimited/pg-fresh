import type { ComponentType } from 'react'
import type { Layer } from '@common/types/scene'
import { CameraLayer } from './CameraLayer'
import { LayerContent } from './LayerContent'
import { StreamLayer } from './StreamLayer'
import { WebviewLayer } from './WebviewLayer'

interface LayerSourceProps {
  layer: Layer
  role: 'control' | 'output'
  // 'video' rendering differs between Control (muted, manual transport
  // controls) and Output (autoplay + timecode-sync-driven) — every other
  // source type shares one component, parameterized by `role` for audio.
  VideoComponent: ComponentType<{ layer: Layer }>
}

export function LayerSource({ layer, role, VideoComponent }: LayerSourceProps): JSX.Element {
  switch (layer.sourceType) {
    case 'video':
      return <VideoComponent layer={layer} />
    case 'camera':
      return <CameraLayer layer={layer} role={role} />
    case 'webview':
      return <WebviewLayer layer={layer} role={role} />
    case 'stream':
      return <StreamLayer layer={layer} role={role} />
    default:
      return <LayerContent layer={layer} />
  }
}
