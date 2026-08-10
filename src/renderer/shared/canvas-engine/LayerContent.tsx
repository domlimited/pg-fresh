import type { Layer } from '@common/types/scene'
import { toMediaUrl } from '../utils/mediaUrl'

interface LayerContentProps {
  layer: Layer
}

// Renders 'placeholder' and 'image' sources. 'video' is handled by
// ControlVideoLayer / OutputVideoLayer since Control and Output windows
// drive playback differently (see those components).
export function LayerContent({ layer }: LayerContentProps): JSX.Element {
  if (layer.sourceType === 'image' && layer.mediaPath) {
    return (
      <img
        src={toMediaUrl(layer.mediaPath)}
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="h-full w-full" style={{ background: layer.color ?? '#3b82f6' }} />
  )
}
