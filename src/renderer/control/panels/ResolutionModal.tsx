import { useState } from 'react'
import { X } from 'lucide-react'
import { useResolutionStore } from '@shared/store/resolutionStore'

const PRESETS = [
  { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '3840 × 1080 (Ultra-wide LED wall)', width: 3840, height: 1080 }
]

const MIN_DIMENSION = 64
const MAX_DIMENSION = 16384

interface ResolutionModalProps {
  onClose: () => void
}

export function ResolutionModal({ onClose }: ResolutionModalProps): JSX.Element {
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)
  const setResolution = useResolutionStore((s) => s.setResolution)
  const [customWidth, setCustomWidth] = useState(String(width))
  const [customHeight, setCustomHeight] = useState(String(height))

  function applyCustom(): void {
    const w = Math.round(Number(customWidth))
    const h = Math.round(Number(customHeight))
    if (!Number.isFinite(w) || !Number.isFinite(h)) return
    void setResolution(
      Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, w)),
      Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, h))
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-80 rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-neutral-100"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Canvas Resolution</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-neutral-500">
          Current: {width} × {height}
        </p>

        <div className="mb-3 space-y-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => void setResolution(preset.width, preset.height)}
              className={`w-full rounded px-3 py-2 text-left text-sm ${
                width === preset.width && height === preset.height
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="border-t border-neutral-800 pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Custom</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="w-20 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
            />
            <span className="text-neutral-500">×</span>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="w-20 rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-100"
            />
            <button
              onClick={applyCustom}
              className="ml-auto rounded bg-cyan-600 px-3 py-1 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
