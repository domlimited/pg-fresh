import type { Layer } from '@common/types/scene'
import { LayerSource } from './LayerSource'
import { OutputVideoLayer } from './OutputVideoLayer'

interface LayerRendererProps {
  layer: Layer
  // The embedded Program Monitor (ProgramMonitorPanel, inside the Control
  // window) renders with this true — it's a visual-only preview of what's
  // live, not the actual broadcast, so it must never play audible sound on
  // the operator's own machine (and would double up with the real Output
  // window's audio when that's also active). The real Output window's
  // App.tsx omits this — that copy IS the broadcast audio.
  muteAudio?: boolean
}

export function LayerRenderer({ layer, muteAudio = false }: LayerRendererProps): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity,
        zIndex: layer.zIndex,
        overflow: 'hidden'
      }}
    >
      <LayerSource layer={layer} role="output" muteAudio={muteAudio} VideoComponent={OutputVideoLayer} />
    </div>
  )
}
