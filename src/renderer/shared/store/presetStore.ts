import { create } from 'zustand'
import type { Layer } from '@common/types/scene'
import type { Preset } from '@common/types/preset'

interface PresetState {
  presets: Preset[]
  saveMode: boolean
  toggleSaveMode: () => void
  refresh: () => Promise<void>
  saveToSlot: (slot: number, layers: Layer[]) => Promise<void>
  clearSlot: (slot: number) => Promise<void>
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  saveMode: false,

  toggleSaveMode: () => set({ saveMode: !get().saveMode }),

  refresh: async () => {
    const presets = await window.fresh.listPresets()
    set({ presets })
  },

  saveToSlot: async (slot, layers) => {
    await window.fresh.savePresetSlot(slot, layers)
    await get().refresh()
    set({ saveMode: false })
  },

  clearSlot: async (slot) => {
    await window.fresh.clearPresetSlot(slot)
    await get().refresh()
  }
}))
