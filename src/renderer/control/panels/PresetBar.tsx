import { useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { usePresetStore } from '@shared/store/presetStore'
import { useSceneStore } from '@shared/store/sceneStore'

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function PresetBar(): JSX.Element {
  const presets = usePresetStore((s) => s.presets)
  const saveMode = usePresetStore((s) => s.saveMode)
  const toggleSaveMode = usePresetStore((s) => s.toggleSaveMode)
  const saveToSlot = usePresetStore((s) => s.saveToSlot)
  const clearSlot = usePresetStore((s) => s.clearSlot)
  const refresh = usePresetStore((s) => s.refresh)
  const layers = useSceneStore((s) => s.layers)
  const loadLayers = useSceneStore((s) => s.loadLayers)

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleSlotClick(slot: number): void {
    const preset = presets.find((p) => p.slot === slot)
    if (saveMode) {
      void saveToSlot(slot, layers)
    } else if (preset) {
      loadLayers(preset.layers)
    }
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-neutral-800 bg-neutral-900 px-4 py-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Presets</span>
      {SLOTS.map((slot) => {
        const preset = presets.find((p) => p.slot === slot)
        return (
          <div key={slot} className="group relative">
            <button
              onClick={() => handleSlotClick(slot)}
              title={preset ? preset.name : `Empty slot ${slot}`}
              className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${
                preset
                  ? 'bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50'
                  : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
              } ${saveMode ? 'ring-2 ring-amber-400' : ''}`}
            >
              {slot}
            </button>
            {preset && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void clearSlot(slot)
                }}
                className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-neutral-700 text-neutral-300 hover:bg-red-500 hover:text-white group-hover:flex"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )
      })}
      <button
        onClick={toggleSaveMode}
        className={`ml-2 flex items-center gap-1 rounded px-2 py-1.5 text-xs ${
          saveMode ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
      >
        <Save className="h-3.5 w-3.5" />
        {saveMode ? 'Click a slot to save…' : 'Save'}
      </button>
    </div>
  )
}
