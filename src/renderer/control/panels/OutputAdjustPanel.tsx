import { RotateCcw, X } from 'lucide-react'
import type { FitMode } from '@common/types/scene'
import { DEFAULT_FIT } from '@shared/canvas-engine/layerStyle'
import { useSceneStore } from '@shared/store/sceneStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useUiStore } from '@shared/store/uiStore'

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
  const layer = useSceneStore((s) => s.layers[0])
  const updateLayer = useSceneStore((s) => s.updateLayer)
  const resetAdjustment = useSceneStore((s) => s.resetAdjustment)
  const canvasWidth = useResolutionStore((s) => s.width)
  const closeOutputAdjust = useUiStore((s) => s.closeOutputAdjust)

  const scalePercent = layer ? Math.round((layer.width / canvasWidth) * 1000) / 10 : 100
  const aspect = layer ? layer.width / layer.height : 16 / 9
  const crop = layer?.crop ?? { top: 0, right: 0, bottom: 0, left: 0 }

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
    resetAdjustment(layer.id)
  }

  return (
    // Fixed/floating overlay, deliberately outside the Viewer column's flex
    // flow (rendered as a sibling at the App root) — see uiStore.ts: this
    // panel used to sit inside the Viewer column and eat into its available
    // height, making the Viewer and Program monitor render at different
    // sizes even though both were internally correct. Floating it removes
    // that layout coupling entirely.
    <div
      className="fixed bottom-4 right-4 z-40 max-h-[80vh] w-80 space-y-3 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">ปรับ OUTPUT ก่อนส่ง</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 hover:bg-neutral-700"
          >
            <RotateCcw className="h-3 w-3" />
            รีเซ็ต
          </button>
          <button
            onClick={closeOutputAdjust}
            className="rounded bg-neutral-800 p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!layer && <p className="text-[11px] text-neutral-500">ยังไม่มีแหล่งภาพที่เลือก — เลือกแหล่งก่อนเพื่อปรับค่า</p>}

      {/* Only this content dims when there's no active source, not the
          panel's own background — dimming the outer container with opacity
          made its bg-neutral-900 translucent, letting the Queue panel
          sitting underneath show through and visually collide with these
          controls (see requirement-v4). */}
      <div className={`space-y-3 ${layer ? '' : 'pointer-events-none opacity-50'}`}>
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
            value={Math.round(layer?.x ?? 0)}
            onChange={(e) => layer && updateLayer(layer.id, { x: Number(e.target.value) })}
            className="w-full rounded bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </label>
        <label className="space-y-1">
          <span>Y</span>
          <input
            type="number"
            value={Math.round(layer?.y ?? 0)}
            onChange={(e) => layer && updateLayer(layer.id, { y: Number(e.target.value) })}
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
            onClick={() => layer && updateLayer(layer.id, { fit: fm.id })}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
              (layer?.fit ?? DEFAULT_FIT) === fm.id
                ? 'bg-cyan-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {fm.label}
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}
