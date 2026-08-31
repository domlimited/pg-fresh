import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { getCropClipPath, getMediaObjectFit } from './layerStyle'

interface ScreenCaptureLayerProps {
  layer: Layer
}

// Electron's desktopCapturer source id is passed as a non-standard
// chromeMediaSourceId constraint — not in the DOM lib types, so this is
// asserted rather than typed against MediaStreamConstraints.
function buildConstraints(sourceId: string): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  } as unknown as MediaStreamConstraints
}

// Screen/window capture is inherently live already (like CameraLayer) — no
// playhead to keep in sync across windows, each process just opens its own
// stream for the same source id.
export function ScreenCaptureLayer({ layer }: ScreenCaptureLayerProps): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const sourceId = layer.deviceId
    if (!sourceId) return

    let cancelled = false
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia(buildConstraints(sourceId))
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (ref.current) ref.current.srcObject = s
      })
      .catch((err) => {
        console.error('[ScreenCaptureLayer] failed to open source', sourceId, err)
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [layer.deviceId])

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="pointer-events-none h-full w-full"
      style={{ objectFit: getMediaObjectFit(layer), clipPath: getCropClipPath(layer) }}
    />
  )
}
