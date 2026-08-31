import { useState } from 'react'
import { Camera, Image as ImageIcon, Link2, MonitorSmartphone, ScreenShare } from 'lucide-react'
import { Volume2, VolumeX } from 'lucide-react'
import type { TakeMode } from '@common/types/scene'
import { useSceneStore } from '@shared/store/sceneStore'
import { FADE_SPEED_OPTIONS, useTransitionStore } from '@shared/store/transitionStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { CameraPanel } from './CameraPanel'
import { CapturePanel } from './CapturePanel'
import { MediaLibrary } from './MediaLibrary'
import { UrlSourcePanel } from './UrlSourcePanel'

type SourceTab = 'media' | 'screen' | 'window' | 'camera' | 'web'

const TABS: { id: SourceTab; label: string; icon: typeof ImageIcon }[] = [
  { id: 'media', label: 'รูปภาพ / วิดีโอ', icon: ImageIcon },
  { id: 'screen', label: 'จับหน้าจอ', icon: ScreenShare },
  { id: 'window', label: 'จับหน้าต่าง App', icon: MonitorSmartphone },
  { id: 'camera', label: 'กล้อง', icon: Camera },
  { id: 'web', label: 'เว็บ / สตรีม', icon: Link2 }
]

const RESOLUTION_PRESETS = [
  { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '3840 × 1080 (Ultra-wide LED wall)', width: 3840, height: 1080 }
]

function TransitionGroup(): JSX.Element {
  const mode = useTransitionStore((s) => s.mode)
  const fadeMs = useTransitionStore((s) => s.fadeMs)
  const setMode = useTransitionStore((s) => s.setMode)
  const setFadeMs = useTransitionStore((s) => s.setFadeMs)

  const options: { id: TakeMode; label: string }[] = [
    { id: 'cut', label: 'ตัด' },
    { id: 'fade', label: 'จาง' }
  ]

  return (
    <div className="border-t border-neutral-800 px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Transition</h3>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={`rounded px-2 py-1.5 text-xs font-medium ${
              mode === opt.id ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          disabled
          title="เลื่อน (Slide) — เร็วๆ นี้"
          className="cursor-not-allowed rounded bg-neutral-900 px-2 py-1.5 text-xs font-medium text-neutral-600"
        >
          เลื่อน
        </button>
      </div>

      {mode === 'fade' && (
        <div className="mt-2">
          <label className="mb-1 block text-[10px] text-neutral-500">ความเร็ว FADE</label>
          <select
            value={fadeMs}
            onChange={(e) => setFadeMs(Number(e.target.value))}
            className="w-full rounded bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
          >
            {FADE_SPEED_OPTIONS.map((opt) => (
              <option key={opt.ms} value={opt.ms}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function OutputAudioControl(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const selectedLayerId = useSceneStore((s) => s.selectedLayerId)
  const updateLayer = useSceneStore((s) => s.updateLayer)
  const layer = layers.find((l) => l.id === selectedLayerId)

  const volume = layer?.volume ?? 1
  const muted = layer?.muted ?? false
  const dbLabel = volume <= 0 ? '-∞ dB' : `${(20 * Math.log10(volume)).toFixed(1)} dB`

  return (
    <div className="border-t border-neutral-800 px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">เสียง OUTPUT</h3>
      {!layer ? (
        <p className="text-xs text-neutral-600">เลือก Layer เพื่อปรับเสียง</p>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateLayer(layer.id, { muted: !muted })}
            className={muted ? 'text-red-400' : 'text-neutral-300 hover:text-cyan-400'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => updateLayer(layer.id, { volume: Number(e.target.value) })}
            className="h-1 flex-1 accent-cyan-500"
          />
        </div>
      )}
      <p className="mt-1 text-right text-[10px] text-neutral-600">{dbLabel}</p>
    </div>
  )
}

function OutputSizeControl(): JSX.Element {
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)
  const setResolution = useResolutionStore((s) => s.setResolution)
  const [customOpen, setCustomOpen] = useState(false)

  const matchesPreset = RESOLUTION_PRESETS.some((p) => p.width === width && p.height === height)
  const value = matchesPreset ? `${width}x${height}` : 'custom'

  return (
    <div className="border-t border-neutral-800 px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">ขนาด OUTPUT</h3>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setCustomOpen(true)
            return
          }
          const preset = RESOLUTION_PRESETS.find((p) => `${p.width}x${p.height}` === e.target.value)
          if (preset) void setResolution(preset.width, preset.height)
        }}
        className="w-full rounded bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200"
      >
        {RESOLUTION_PRESETS.map((p) => (
          <option key={p.label} value={`${p.width}x${p.height}`}>
            {p.label}
          </option>
        ))}
        <option value="custom">กำหนดเอง…</option>
      </select>

      {(customOpen || !matchesPreset) && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="number"
            defaultValue={width}
            onBlur={(e) => void setResolution(Number(e.target.value) || width, height)}
            className="w-16 rounded bg-neutral-800 px-1.5 py-1 text-xs text-neutral-100"
          />
          <span className="text-neutral-500">×</span>
          <input
            type="number"
            defaultValue={height}
            onBlur={(e) => void setResolution(width, Number(e.target.value) || height)}
            className="w-16 rounded bg-neutral-800 px-1.5 py-1 text-xs text-neutral-100"
          />
        </div>
      )}
    </div>
  )
}

export function SourceSidebar(): JSX.Element {
  const [tab, setTab] = useState<SourceTab>('media')

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="grid grid-cols-4 gap-1 border-b border-neutral-800 p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            className={`flex flex-col items-center gap-1 rounded px-1 py-2 text-[10px] leading-tight ${
              tab === id ? 'bg-cyan-600/20 text-cyan-300' : 'text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-center">{label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
        {tab === 'media' && <MediaLibrary />}
        {tab === 'screen' && <CapturePanel kind="screen" />}
        {tab === 'window' && <CapturePanel kind="window" />}
        {tab === 'camera' && <CameraPanel />}
        {tab === 'web' && <UrlSourcePanel />}
      </div>

      <TransitionGroup />
      <OutputAudioControl />
      <OutputSizeControl />
    </div>
  )
}
