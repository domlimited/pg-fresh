import { useEffect, useState } from 'react'
import { Pause, Play, Repeat, Square, Volume2, VolumeX } from 'lucide-react'
import type { SourceType } from '@common/types/scene'
import { getVideoElement } from '@shared/canvas-engine/videoRegistry'
import { useSceneStore } from '@shared/store/sceneStore'
import { formatTime } from '@shared/utils/time'

const AUDIO_CAPABLE_TYPES: SourceType[] = ['video', 'camera', 'stream', 'webview']

interface AudioDevice {
  deviceId: string
  label: string
}

export function PlaybackControls(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const selectedLayerId = useSceneStore((s) => s.selectedLayerId)
  const updateLayer = useSceneStore((s) => s.updateLayer)
  const layer = layers.find((l) => l.id === selectedLayerId)

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((list) => {
      setAudioDevices(
        list
          .filter((d) => d.kind === 'audiooutput')
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Output ${i + 1}` }))
      )
    })
  }, [])

  useEffect(() => {
    if (!layer || layer.sourceType !== 'video') return
    const el = getVideoElement(layer.id)
    if (!el) return

    const onTimeUpdate = (): void => setCurrentTime(el.currentTime)
    const onLoadedMetadata = (): void => setDuration(el.duration || 0)
    const onPlay = (): void => setIsPlaying(true)
    const onPause = (): void => setIsPlaying(false)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    setCurrentTime(el.currentTime)
    setDuration(el.duration || 0)
    setIsPlaying(!el.paused)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [layer?.id, layer?.sourceType])

  if (!layer) {
    return (
      <div className="flex h-11 shrink-0 items-center border-t border-neutral-800 bg-neutral-900 px-4 text-xs text-neutral-600">
        Select a layer to see audio/playback controls
      </div>
    )
  }

  const audioCapable = AUDIO_CAPABLE_TYPES.includes(layer.sourceType)
  const isVideo = layer.sourceType === 'video'

  if (!audioCapable && !isVideo) {
    return (
      <div className="flex h-11 shrink-0 items-center border-t border-neutral-800 bg-neutral-900 px-4 text-xs text-neutral-600">
        No audio/playback controls for this layer type
      </div>
    )
  }

  const el = getVideoElement(layer.id)

  function togglePlay(): void {
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  function stop(): void {
    if (!el) return
    el.pause()
    el.currentTime = 0
  }

  function seek(value: number): void {
    if (!el) return
    el.currentTime = value
    setCurrentTime(value)
  }

  return (
    <div className="flex shrink-0 flex-col border-t border-neutral-800 bg-neutral-900">
      {audioCapable && (
        <div className="flex h-9 items-center gap-3 px-4">
          <button
            onClick={() => updateLayer(layer.id, { muted: !(layer.muted ?? false) })}
            className={layer.muted ? 'text-red-400' : 'text-neutral-300 hover:text-cyan-400'}
          >
            {layer.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {layer.sourceType !== 'webview' && (
            <>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={layer.volume ?? 1}
                onChange={(e) => updateLayer(layer.id, { volume: Number(e.target.value) })}
                className="h-1 w-24 accent-cyan-500"
              />
              <select
                value={layer.audioOutputId ?? ''}
                onChange={(e) => updateLayer(layer.id, { audioOutputId: e.target.value || undefined })}
                className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-200"
              >
                <option value="">System Default</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {isVideo && (
        <div className="flex h-11 items-center gap-3 px-4">
          <button onClick={togglePlay} className="text-neutral-200 hover:text-cyan-400">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={stop} className="text-neutral-200 hover:text-cyan-400">
            <Square className="h-4 w-4" />
          </button>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-400">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 flex-1 accent-cyan-500"
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-neutral-400">{formatTime(duration)}</span>
          <button
            onClick={() => updateLayer(layer.id, { loop: !layer.loop })}
            className={layer.loop ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-200'}
          >
            <Repeat className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
