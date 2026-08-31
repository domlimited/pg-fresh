import Hls from 'hls.js'
import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { toMediaUrl } from '../utils/mediaUrl'
import { applyAudioSettings } from './audio'
import { getCropClipPath, getMediaObjectFit } from './layerStyle'

interface StreamLayerProps {
  layer: Layer
  role: 'control' | 'output'
  muteAudio?: boolean
}

// RTSP/RTMP can't be played directly by Chromium — the main process
// transcodes it to an HLS playlist (src/main/media/streamTranscoder.ts) and
// this component points hls.js at it via the media:// protocol. Control and
// Output each call startStream() for the same layer id; the main process
// ref-counts so only one ffmpeg process actually runs per source.
export function StreamLayer({ layer, role, muteAudio = false }: StreamLayerProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const sourceUrl = layer.url
    if (!sourceUrl) return
    let cancelled = false

    window.fresh.startStream(layer.id, sourceUrl).then(({ playlistPath }) => {
      if (cancelled || !videoRef.current) return
      const hlsUrl = toMediaUrl(playlistPath)

      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) console.error('[StreamLayer] fatal hls.js error', data)
        })
        hls.loadSource(hlsUrl)
        hls.attachMedia(videoRef.current)
        hlsRef.current = hls
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl
      }
    })

    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
      window.fresh.stopStream(layer.id)
    }
  }, [layer.id, layer.url])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (role === 'control' || muteAudio) {
      el.muted = true
      return
    }
    void applyAudioSettings(el, layer)
  }, [role, muteAudio, layer.volume, layer.muted, layer.audioOutputId])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="pointer-events-none h-full w-full"
      style={{ objectFit: getMediaObjectFit(layer), clipPath: getCropClipPath(layer) }}
    />
  )
}
