import { useEffect, useRef } from 'react'
import type { Layer } from '@common/types/scene'
import { useProgramStore } from '../store/programStore'
import { useTimecodeSyncStore } from '../store/timecodeSyncStore'
import { toMediaUrl } from '../utils/mediaUrl'
import { applyAudioSettings } from './audio'
import { registerVideoElement } from './videoRegistry'

interface OutputVideoLayerProps {
  layer: Layer
}

const DRIFT_TOLERANCE_SEC = 0.3

// Each window opens its own MediaStream/decoder for the same file — a
// MediaStream/video frame can't cross the IPC boundary — so playback state
// is kept in sync via periodic timecode messages from Control instead.
export function OutputVideoLayer({ layer }: OutputVideoLayerProps): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const sync = useTimecodeSyncStore((s) => s.syncs[layer.id])
  const freeze = useProgramStore((s) => s.freeze)

  useEffect(() => {
    registerVideoElement(layer.id, ref.current)
    return () => registerVideoElement(layer.id, null)
  }, [layer.id])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.currentTime = layer.currentTime ?? 0
    if (layer.isPlaying) void el.play()
    // Deliberately keyed on layer.id only — this sets the initial position
    // on Take/Cut/Fade; ongoing sync is handled by the effect below.
  }, [layer.id])

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
    void applyAudioSettings(el, layer)
  }, [layer.volume, layer.muted, layer.audioOutputId])

  return (
    <video
      ref={ref}
      src={layer.mediaPath ? toMediaUrl(layer.mediaPath) : undefined}
      loop={layer.loop}
      className="pointer-events-none h-full w-full object-cover"
    />
  )
}
