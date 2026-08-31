import { RotateCcw } from 'lucide-react'
import type { FitMode } from '@common/types/scene'
import { useSceneStore } from '@shared/store/sceneStore'
import { useResolutionStore } from '@shared/store/resolutionStore'

const ASPECT_RATIOS: { label: string; ratio: number | null }[] = [
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '1:1', ratio: 1 },
  { label: '9:16', ratio: 9 / 16 },
  { label: 'อิสระ', ratio: null }
]

const FIT_MODES: { id: FitMode; label: string }[] = [
  { id: 'contain', label: 'Contain' },
  { id: 'cover', label: 'Cover' },
  { id: 'stretch', label: 'Stretch' }
]

export function OutputAdjustPanel(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const selectedLayerId = useSceneStore((s) => s.selectedLayerId)
  const updateLayer = useSceneStore((s) => s.updateLayer)
  const canvasWidth = useResolutionStore((s) => s.width)
  const layer = layers.find((l) => l.id === selectedLayerId)

  if (!layer) {
    return (
      <div className="shrink-0 border-t border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-600">
        เลือก Layer บน Canvas เพื่อปรับ Output ก่อนส่ง
      </div>
    )
  }

  const scalePercent = Math.round((layer.width / canvasWidth) * 1000) / 10
  const aspect = layer.width / layer.height
  const crop = layer.crop ?? { top: 0, right: 0, bottom: 0, left: 0 }

  function setScalePercent(percent: number): void {
    if (!layer) return
    const width = (percent / 100) * canvasWidth
    const height = width / aspect
    const cx = layer.x + layer.width / 2
    const cy = layer.y + layer.height / 2
    updateLayer(layer.id, { width, height, x: cx - width / 2, y: cy - height / 2 })
  }

  function setAspectRatio(ratio: number | null): void {
    if (!layer || ratio === null) return
    const height = layer.width / ratio
    const cy = layer.y + layer.height / 2
    updateLayer(layer.id, { height, y: cy - height / 2 })
  }

  function setVerticalCrop(percent: number): void {
    if (!layer) return
    updateLayer(layer.id, { crop: { ...crop, top: percent, bottom: percent } })
  }

  function setHorizontalCrop(percent: number): void {
    if (!layer) return
    updateLayer(layer.id, { crop: { ...crop, left: percent, right: percent } })
  }

  function reset(): void {
    if (!layer) return
    updateLayer(layer.id, { crop: undefined, fit: undefined })
  }

  return (
    <div className="shrink-0 space-y-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">ปรับ OUTPUT ก่อนส่ง</h3>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 hover:bg-neutral-700"
        >
          <RotateCcw className="h-3 w-3" />
          รีเซ็ต
        </button>
      </div>

      <div className="flex gap-1.5">
        {ASPECT_RATIOS.map((ar) => (
          <button
            key={ar.label}
            onClick={() => setAspectRatio(ar.ratio)}
            className="flex-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
          >
            {ar.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-neutral-400">
        <label className="space-y-1">
          <span>Scale</span>
          <input
            type="range"
            min={5}
            max={300}
            value={scalePercent}
            onChange={(e) => setScalePercent(Number(e.target.value))}
            className="block h-1 w-full accent-cyan-500"
          />
          <span className="tabular-nums text-neutral-500">{scalePercent}%</span>
        </label>
        <label className="space-y-1">
          <span>X</span>
          <input
            type="number"
            value={Math.round(layer.x)}
            onChange={(e) => updateLayer(layer.id, { x: Number(e.target.value) })}
            className="w-full rounded bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </label>
        <label className="space-y-1">
          <span>Y</span>
          <input
            type="number"
            value={Math.round(layer.y)}
            onChange={(e) => updateLayer(layer.id, { y: Number(e.target.value) })}
            className="w-full rounded bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </label>
      </div>

      <div className="space-y-2 text-xs text-neutral-400">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Crop (ตัดขอบ %)</p>
        <label className="flex items-center gap-2">
          <span className="w-16 shrink-0">บน/ล่าง</span>
          <input
            type="range"
            min={0}
            max={49}
            value={crop.top}
            onChange={(e) => setVerticalCrop(Number(e.target.value))}
            className="h-1 flex-1 accent-cyan-500"
          />
          <span className="w-10 shrink-0 text-right tabular-nums">{crop.top}%</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="w-16 shrink-0">ซ้าย/ขวา</span>
          <input
            type="range"
            min={0}
            max={49}
            value={crop.left}
            onChange={(e) => setHorizontalCrop(Number(e.target.value))}
            className="h-1 flex-1 accent-cyan-500"
          />
          <span className="w-10 shrink-0 text-right tabular-nums">{crop.left}%</span>
        </label>
      </div>

      <div className="flex gap-1.5">
        {FIT_MODES.map((fm) => (
          <button
            key={fm.id}
            onClick={() => updateLayer(layer.id, { fit: fm.id })}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
              (layer.fit ?? 'cover') === fm.id
                ? 'bg-cyan-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {fm.label}
          </button>
        ))}
      </div>
    </div>
  )
}
