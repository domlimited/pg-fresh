import type { Layer } from '@common/types/scene'
import { LayerSource } from './LayerSource'
import { OutputVideoLayer } from './OutputVideoLayer'

interface LayerRendererProps {
  layer: Layer
}

export function LayerRenderer({ layer }: LayerRendererProps): JSX.Element {
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
      <LayerSource layer={layer} role="output" VideoComponent={OutputVideoLayer} />
    </div>
  )
}
