import { create } from 'zustand'
import type { TimecodeSyncPayload } from '@common/types/scene'

interface TimecodeSyncState {
  syncs: Record<string, TimecodeSyncPayload>
  applySync: (payload: TimecodeSyncPayload) => void
}

export const useTimecodeSyncStore = create<TimecodeSyncState>((set, get) => ({
  syncs: {},
  applySync: (payload) => set({ syncs: { ...get().syncs, [payload.layerId]: payload } })
}))
