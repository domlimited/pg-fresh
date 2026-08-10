import { Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { useSceneStore } from '@shared/store/sceneStore'

export function LayerPanel(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const selectedLayerId = useSceneStore((s) => s.selectedLayerId)
  const selectLayer = useSceneStore((s) => s.selectLayer)
  const removeLayer = useSceneStore((s) => s.removeLayer)
  const reorderLayer = useSceneStore((s) => s.reorderLayer)
  const addLayer = useSceneStore((s) => s.addLayer)

  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Layers</h2>
        <button
          onClick={addLayer}
          className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sorted.length === 0 && <p className="px-1 py-2 text-xs text-neutral-600">No layers yet</p>}
        <ul className="space-y-1">
          {sorted.map((layer) => (
            <li
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              className={`flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm ${
                layer.id === selectedLayerId
                  ? 'bg-cyan-600/20 text-cyan-300'
                  : 'text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: layer.color }}
                />
                <span className="truncate">{layer.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    reorderLayer(layer.id, 'up')
                  }}
                  className="text-neutral-500 hover:text-neutral-200"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    reorderLayer(layer.id, 'down')
                  }}
                  className="text-neutral-500 hover:text-neutral-200"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeLayer(layer.id)
                  }}
                  className="text-neutral-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
