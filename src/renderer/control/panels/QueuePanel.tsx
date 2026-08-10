import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Film, Image as ImageIcon, Play, Repeat, SkipForward, Trash2 } from 'lucide-react'
import type { MediaItem } from '@common/types/media'
import { getVideoElement } from '@shared/canvas-engine/videoRegistry'
import { QUEUE_LAYER_ID } from '@shared/canvas-engine/constants'
import { useQueueStore } from '@shared/store/queueStore'
import { toMediaUrl } from '@shared/utils/mediaUrl'
import { advanceQueue, playQueueIndex } from '../actions/queueActions'

const MEDIA_DRAG_TYPE = 'application/x-fresh-media'
const IMAGE_DWELL_MS = 5000
const VIDEO_END_POLL_MS = 300

export function QueuePanel(): JSX.Element {
  const items = useQueueStore((s) => s.items)
  const currentIndex = useQueueStore((s) => s.currentIndex)
  const autoAdvance = useQueueStore((s) => s.autoAdvance)
  const addItem = useQueueStore((s) => s.addItem)
  const removeItem = useQueueStore((s) => s.removeItem)
  const reorder = useQueueStore((s) => s.reorder)
  const toggleAutoAdvance = useQueueStore((s) => s.toggleAutoAdvance)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Drives auto-advance by polling instead of an 'ended' listener — the
  // queue's video element mounts/unmounts across renders and a listener
  // attached in this component would race that lifecycle.
  useEffect(() => {
    if (!autoAdvance || currentIndex === null) return
    const currentItem = items[currentIndex]
    if (!currentItem) return

    if (currentItem.kind === 'image') {
      const timer = setTimeout(() => advanceQueue(), IMAGE_DWELL_MS)
      return () => clearTimeout(timer)
    }

    const interval = setInterval(() => {
      const el = getVideoElement(QUEUE_LAYER_ID)
      if (el?.ended) advanceQueue()
    }, VIDEO_END_POLL_MS)
    return () => clearInterval(interval)
  }, [autoAdvance, currentIndex, items])

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    const json = e.dataTransfer.getData(MEDIA_DRAG_TYPE)
    if (!json) return
    const item: MediaItem = JSON.parse(json)
    addItem(item)
  }

  function handleItemDragStart(index: number): void {
    dragIndexRef.current = index
  }

  function handleItemDrop(index: number): void {
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      reorder(dragIndexRef.current, index)
    }
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex h-48 shrink-0 flex-col border-t border-neutral-800 bg-neutral-900"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Queue</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoAdvance}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
              autoAdvance ? 'bg-cyan-600/20 text-cyan-300' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            Auto-Advance {autoAdvance ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => advanceQueue()}
            className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-3 pb-3">
        {items.length === 0 ? (
          <p className="py-4 text-xs text-neutral-600">Drag media from the Library here to build a queue</p>
        ) : (
          <div className="flex h-full gap-2">
            {items.map((item, index) => {
              const isCurrent = index === currentIndex
              const isUpNext = currentIndex !== null && index === currentIndex + 1
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOverIndex(index)
                  }}
                  onDrop={() => handleItemDrop(index)}
                  onDoubleClick={() => playQueueIndex(index)}
                  title={item.name}
                  className={`relative flex w-28 shrink-0 cursor-grab flex-col overflow-hidden rounded border bg-neutral-950 ${
                    isCurrent
                      ? 'border-cyan-400'
                      : dragOverIndex === index
                        ? 'border-neutral-500'
                        : 'border-neutral-800'
                  }`}
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
                    {isCurrent && (
                      <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-cyan-500 px-1 py-0.5 text-[9px] font-semibold text-neutral-950">
                        <Play className="h-2 w-2" /> LIVE
                      </span>
                    )}
                    {isUpNext && (
                      <span className="absolute left-1 top-1 rounded bg-neutral-700 px-1 py-0.5 text-[9px] font-semibold text-neutral-200">
                        UP NEXT
                      </span>
                    )}
                  </div>
                  <span className="truncate px-1 py-0.5 text-[10px] text-neutral-400">
                    {index + 1}. {item.name}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-neutral-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
