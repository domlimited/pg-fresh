import { useState } from 'react'
import { Link2, Plus } from 'lucide-react'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useSceneStore } from '@shared/store/sceneStore'

export function UrlSourcePanel(): JSX.Element {
  const [url, setUrl] = useState('')
  const addUrlLayer = useSceneStore((s) => s.addUrlLayer)
  const canvasWidth = useResolutionStore((s) => s.width)
  const canvasHeight = useResolutionStore((s) => s.height)

  function handleAdd(): void {
    const trimmed = url.trim()
    if (!trimmed) return
    addUrlLayer(trimmed, canvasWidth / 2, canvasHeight / 2)
    setUrl('')
  }

  return (
    <div className="flex h-full flex-col gap-2 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">เว็บ / สตรีม</h2>
      <div className="flex items-center gap-2">
      <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="YouTube / webpage URL, or rtsp://… rtmp://…"
        className="flex-1 rounded bg-neutral-800 px-2 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600"
      />
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
      </div>
    </div>
  )
}
