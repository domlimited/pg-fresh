import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { applyAudioSettings } from './audio'

interface CameraLayerProps {
  layer: Layer
  role: 'control' | 'output'
}

// Each window (Control and Output) opens its own getUserMedia stream for
// the same deviceId — a MediaStream can't cross the IPC boundary, but
// unlike video files there's no playhead to keep in sync: the camera feed
// is inherently live in both places already.
export function CameraLayer({ layer, role }: CameraLayerProps): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const deviceId = layer.deviceId
    if (!deviceId) return

    let cancelled = false
    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (ref.current) ref.current.srcObject = s
      })
      .catch((err) => {
        console.error('[CameraLayer] failed to open device', deviceId, err)
      })

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [layer.deviceId])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (role === 'control') {
      el.muted = true
      return
    }
    void applyAudioSettings(el, layer)
  }, [role, layer.volume, layer.muted, layer.audioOutputId])

  return <video ref={ref} autoPlay playsInline className="pointer-events-none h-full w-full object-cover" />
}
