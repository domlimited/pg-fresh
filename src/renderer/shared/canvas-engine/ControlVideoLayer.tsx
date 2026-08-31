import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { toMediaUrl } from '../utils/mediaUrl'
import { getCropClipPath, getMediaObjectFit } from './layerStyle'
import { previewVideoRegistry } from './videoRegistry'

interface ControlVideoLayerProps {
  layer: Layer
}

// Muted in Control — this is a cueing/preview copy of the clip. The actual
// broadcast audio plays from the Output window's own <video> element.
export function ControlVideoLayer({ layer }: ControlVideoLayerProps): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    previewVideoRegistry.register(layer.id, ref.current)
    return () => previewVideoRegistry.register(layer.id, null)
  }, [layer.id])

  return (
    <video
      ref={ref}
      src={layer.mediaPath ? toMediaUrl(layer.mediaPath) : undefined}
      muted
      loop={layer.loop}
      className="pointer-events-none h-full w-full"
      style={{ objectFit: getMediaObjectFit(layer), clipPath: getCropClipPath(layer) }}
    />
  )
}
