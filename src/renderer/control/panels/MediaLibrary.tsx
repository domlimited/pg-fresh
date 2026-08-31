import { useEffect, useState, type DragEvent } from 'react'
import { FolderOpen, Film, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import type { MediaItem } from '@common/types/media'
import { toMediaUrl } from '@shared/utils/mediaUrl'

const MEDIA_DRAG_TYPE = 'application/x-fresh-media'

export function MediaLibrary(): JSX.Element {
  const [items, setItems] = useState<MediaItem[]>([])

  useEffect(() => {
    window.fresh.listMedia().then(setItems)
    return window.fresh.onMediaLibraryUpdate(setItems)
  }, [])

  async function handleImportClick(): Promise<void> {
    await window.fresh.importMediaDialog()
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>): Promise<void> {
    e.preventDefault()
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as File & { path?: string }).path)
      .filter((p): p is string => !!p)
    if (paths.length) await window.fresh.importMediaPaths(paths)
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, item: MediaItem): void {
    e.dataTransfer.setData(MEDIA_DRAG_TYPE, JSON.stringify(item))
  }

  async function handleRemove(id: string): Promise<void> {
    await window.fresh.removeMedia(id)
  }

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">รูปภาพ / วิดีโอ</h2>
        <button
          onClick={handleImportClick}
          className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Import
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {items.length === 0 ? (
          <p className="py-4 text-xs text-neutral-600">
            Import files or drag &amp; drop video/image files here
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                title={item.name}
                className="relative flex cursor-grab flex-col overflow-hidden rounded border border-neutral-800 bg-neutral-950"
              >
                <div className="relative flex h-16 items-center justify-center bg-black">
                  {item.thumbnailPath ? (
                    <img
                      src={toMediaUrl(item.thumbnailPath)}
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  ) : item.kind === 'video' ? (
                    <Film className="h-6 w-6 text-neutral-600" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-neutral-600" />
                  )}
                  {item.transcodeStatus === 'transcoding' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    </div>
                  )}
                  {item.transcodeStatus === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-950/70 text-[10px] text-red-300">
                      Transcode failed
                    </div>
                  )}
                </div>
                <span className="truncate px-1 py-0.5 text-[10px] text-neutral-400">{item.name}</span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-neutral-400 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
