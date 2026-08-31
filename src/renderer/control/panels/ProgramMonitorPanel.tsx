import { useEffect, useState } from 'react'
import { Pause, Play, Repeat, Scissors, Square, WifiOff } from 'lucide-react'
import type { Layer } from '@common/types/scene'
import { Stage } from '@shared/canvas-engine/Stage'
import { LayerRenderer } from '@shared/canvas-engine/LayerRenderer'
import { programVideoRegistry } from '@shared/canvas-engine/videoRegistry'
import { useProgramStore } from '@shared/store/programStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useOutputStatusStore } from '@shared/store/outputStatusStore'
import { useSceneStore } from '@shared/store/sceneStore'
import { formatTime } from '@shared/utils/time'
import { setBlack, setFreeze } from '../actions/outputActions'
import { takeProgram } from '../actions/programActions'

// Mirrors output/App.tsx's rendering (same Stage/LayerRenderer, current +
// crossfading incoming layers, black overlay) but reads the LOCAL
// programStore instance living in Control's own process — see
// videoRegistry.ts and programActions.ts for why Control and the real
// Output window each keep an independent copy of this state.
function ProgramStage(): JSX.Element {
  const current = useProgramStore((s) => s.current)
  const incoming = useProgramStore((s) => s.incoming)
  const incomingOpacity = useProgramStore((s) => s.incomingOpacity)
  const fadeMs = useProgramStore((s) => s.fadeMs)
  const black = useProgramStore((s) => s.black)
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
      <Stage width={width} height={height} background="#000">
        {current.map((layer) => (
          <LayerRenderer key={layer.id} layer={layer} muteAudio />
        ))}
        {incoming && (
          <div
            style={{ position: 'absolute', inset: 0, opacity: incomingOpacity, transition: `opacity ${fadeMs}ms linear` }}
          >
            {incoming.map((layer) => (
              <LayerRenderer key={layer.id} layer={layer} muteAudio />
            ))}
          </div>
        )}
      </Stage>
      {black && <div className="absolute inset-0 z-50 bg-black" />}
    </div>
  )
}

function primaryVideoLayer(layers: Layer[]): Layer | undefined {
  return layers.find((l) => l.sourceType === 'video')
}

function TransformReadout(): JSX.Element {
  const current = useProgramStore((s) => s.current)
  const layer = primaryVideoLayer(current) ?? current[0]

  if (!layer) {
    return <p className="px-1 py-2 text-xs text-neutral-600">ยังไม่มีสื่อที่ส่งออกอากาศ</p>
  }

  const ar = layer.height ? (layer.width / layer.height).toFixed(2) : '—'
  const crop = layer.crop
  const cropLabel = crop
    ? `${crop.top}/${crop.bottom}% | ${crop.left}/${crop.right}%`
    : '0%/0%'

  return (
    <div className="space-y-1 px-1 py-2 text-xs text-neutral-400">
      <p>
        <span className="text-neutral-500">X:</span> {Math.round(layer.x)}{' '}
        <span className="ml-2 text-neutral-500">Y:</span> {Math.round(layer.y)}{' '}
        <span className="ml-2 text-neutral-500">W×H:</span> {Math.round(layer.width)}×{Math.round(layer.height)}
      </p>
      <p>
        <span className="text-neutral-500">Crop:</span> {cropLabel} | <span className="text-neutral-500">Fit:</span>{' '}
        {layer.fit ?? 'cover'} | <span className="text-neutral-500">AR:</span> {ar}
      </p>
      <p className="truncate text-neutral-500">{layer.name}</p>
    </div>
  )
}

function ProgramTransport(): JSX.Element {
  const current = useProgramStore((s) => s.current)
  const layer = primaryVideoLayer(current)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!layer) return
    const el = programVideoRegistry.get(layer.id)
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
  }, [layer?.id])

  if (!layer) {
    return <div className="px-1 py-2 text-xs text-neutral-600">ยังไม่มีคลิปที่กำลังเล่นอยู่บนโปรแกรม</div>
  }

  const el = programVideoRegistry.get(layer.id)

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
    <div className="space-y-2 px-1 py-2">
      <p className="truncate text-xs text-neutral-400">{layer.name}</p>
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="text-neutral-200 hover:text-cyan-400">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={stop} className="text-neutral-200 hover:text-cyan-400">
          <Square className="h-4 w-4" />
        </button>
        <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-neutral-500">
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
        <span className="w-10 shrink-0 text-[10px] tabular-nums text-neutral-500">{formatTime(duration)}</span>
        <button
          onClick={() => useSceneStore.getState().updateLayer(layer.id, { loop: !layer.loop })}
          className={layer.loop ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-200'}
        >
          <Repeat className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ProgramMonitorPanel(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const black = useProgramStore((s) => s.black)
  const freeze = useProgramStore((s) => s.freeze)
  const outputActive = useOutputStatusStore((s) => s.active)

  return (
    <div className="flex w-96 shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-900 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Program (จอ LED)</h2>
        {!outputActive && (
          <span className="flex items-center gap-1 text-[10px] text-neutral-600">
            <WifiOff className="h-3 w-3" />
            ไม่ได้ส่ง
          </span>
        )}
      </div>

      <ProgramStage />
      <TransformReadout />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => takeProgram(layers, 'cut')}
          className="flex items-center justify-center gap-1.5 rounded-md bg-cyan-600 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          <Scissors className="h-3.5 w-3.5" />
          CUT (ตัดทันที)
        </button>
        <button
          onClick={() => takeProgram(layers, 'fade')}
          className="rounded-md bg-neutral-800 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
        >
          FADE (ค่อยๆเปลี่ยน)
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => setFreeze(!freeze)}
          className={`rounded-md py-1.5 text-xs font-semibold ${
            freeze ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
          }`}
        >
          FREEZE
        </button>
        <button
          onClick={() => setBlack(!black)}
          className={`rounded-md py-1.5 text-xs font-semibold ${
            black ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
          }`}
        >
          BLACK
        </button>
      </div>

      <div className="mt-2 border-t border-neutral-800">
        <ProgramTransport />
      </div>
    </div>
  )
}
