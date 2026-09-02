import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { useProgramStore } from '../store/programStore'
import { useTimecodeSyncStore } from '../store/timecodeSyncStore'
import { toMediaUrl } from '../utils/mediaUrl'
import { applyAudioSettings } from './audio'
import { getCropClipPath, getMediaObjectFit } from './layerStyle'
import { programVideoRegistry } from './videoRegistry'

interface OutputVideoLayerProps {
  layer: Layer
  muteAudio?: boolean
}

const DRIFT_TOLERANCE_SEC = 0.3

// Each window opens its own MediaStream/decoder for the same file — a
// MediaStream/video frame can't cross the IPC boundary — so playback state
// is kept in sync via periodic timecode messages from Control instead.
export function OutputVideoLayer({ layer, muteAudio = false }: OutputVideoLayerProps): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const sync = useTimecodeSyncStore((s) => s.syncs[layer.id])
  const freeze = useProgramStore((s) => s.freeze)

  useEffect(() => {
    programVideoRegistry.register(layer.id, ref.current)
    return () => programVideoRegistry.register(layer.id, null)
  }, [layer.id])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.currentTime = layer.currentTime ?? 0
    if (layer.isPlaying) void el.play()
    // Keyed on loadId, not id: id is the constant ACTIVE_LAYER_ID, so taking
    // a different clip to Program never re-ran this and the new clip started
    // at 0, paused, until a drift correction happened to nudge it
    // (requirement-v5, ปัญหาข้อ 2). This sets the position on Take/Cut/Fade;
    // ongoing sync is handled by the effect below.
  }, [layer.loadId])

  useEffect(() => {
    const el = ref.current
    if (!el || !sync || freeze) return
    if (Math.abs(el.currentTime - sync.currentTime) > DRIFT_TOLERANCE_SEC) {
      el.currentTime = sync.currentTime
    }
    if (sync.isPlaying && el.paused) void el.play()
    if (!sync.isPlaying && !el.paused) el.pause()
  }, [sync, freeze])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (muteAudio) {
      el.muted = true
      return
    }
    void applyAudioSettings(el, layer)
  }, [muteAudio, layer.volume, layer.muted, layer.audioOutputId])

  return (
    <video
      ref={ref}
      src={layer.mediaPath ? toMediaUrl(layer.mediaPath) : undefined}
      loop={layer.loop}
      className="pointer-events-none h-full w-full"
      style={{ objectFit: getMediaObjectFit(layer), clipPath: getCropClipPath(layer) }}
    />
  )
}
