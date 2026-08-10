import { create } from 'zustand'
import { DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from '../canvas-engine/constants'

interface ResolutionState {
  width: number
  height: number
  loaded: boolean
  load: () => Promise<void>
  setResolution: (width: number, height: number) => Promise<void>
  applyRemote: (width: number, height: number) => void
}

export const useResolutionStore = create<ResolutionState>((set) => ({
  width: DEFAULT_CANVAS_WIDTH,
  height: DEFAULT_CANVAS_HEIGHT,
  loaded: false,

  load: async () => {
    const resolution = await window.fresh.getCanvasResolution()
    set({ width: resolution.width, height: resolution.height, loaded: true })
  },

  setResolution: async (width, height) => {
    await window.fresh.setCanvasResolution(width, height)
    set({ width, height })
  },

  applyRemote: (width, height) => set({ width, height })
}))
