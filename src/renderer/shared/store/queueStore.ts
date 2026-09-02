import { create } from 'zustand'
import type { MediaItem, MediaKind } from '@common/types/media'

export interface QueueItem {
  id: string
  mediaId: string
  name: string
  kind: MediaKind
  mediaPath: string
  thumbnailPath: string | null
  durationSec: number | null
}

interface QueueState {
  items: QueueItem[]
  currentIndex: number | null
  autoAdvance: boolean
  addItem: (media: MediaItem) => void
  removeItem: (id: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
  toggleAutoAdvance: () => void
  setCurrentIndex: (index: number | null) => void
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  currentIndex: null,
  autoAdvance: false,

  addItem: (media) => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      mediaId: media.id,
      name: media.name,
      kind: media.kind,
      mediaPath: media.displayPath,
      thumbnailPath: media.thumbnailPath,
      durationSec: media.durationSec
    }
    set({ items: [...get().items, item] })
  },

  removeItem: (id) => {
    const items = get().items
    const index = items.findIndex((i) => i.id === id)
    const currentIndex = get().currentIndex
    set({
      items: items.filter((i) => i.id !== id),
      currentIndex:
        currentIndex === null
          ? null
          : index === currentIndex
            ? null
            : index < currentIndex
              ? currentIndex - 1
              : currentIndex
    })
  },

  reorder: (fromIndex, toIndex) => {
    const items = [...get().items]
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    set({ items })
  },

  toggleAutoAdvance: () => set({ autoAdvance: !get().autoAdvance }),

  setCurrentIndex: (index) => set({ currentIndex: index })
}))
