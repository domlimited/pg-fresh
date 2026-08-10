import { create } from 'zustand'
import type { Layer, ProgramUpdatePayload } from '@common/types/scene'
import { getVideoElement } from '../canvas-engine/videoRegistry'

interface ProgramState {
  current: Layer[]
  incoming: Layer[] | null
  incomingOpacity: number
  fadeMs: number
  black: boolean
  freeze: boolean
  applyUpdate: (payload: ProgramUpdatePayload) => void
  setBlack: (black: boolean) => void
  setFreeze: (freeze: boolean) => void
}

let fadeTimer: ReturnType<typeof setTimeout> | null = null

export const useProgramStore = create<ProgramState>((set, get) => ({
  current: [],
  incoming: null,
  incomingOpacity: 0,
  fadeMs: 0,
  black: false,
  freeze: false,

  applyUpdate: (payload) => {
    if (fadeTimer) clearTimeout(fadeTimer)

    if (payload.mode === 'cut' || payload.fadeMs === 0) {
      set({ current: payload.layers, incoming: null, incomingOpacity: 0 })
      return
    }

    set({ incoming: payload.layers, incomingOpacity: 0, fadeMs: payload.fadeMs })
    // Double rAF so the browser commits opacity:0 before we animate to 1.
    requestAnimationFrame(() => requestAnimationFrame(() => set({ incomingOpacity: 1 })))

    fadeTimer = setTimeout(() => {
      set({ current: get().incoming ?? payload.layers, incoming: null, incomingOpacity: 0 })
    }, payload.fadeMs)
  },

  setBlack: (black) => set({ black }),

  setFreeze: (freeze) => {
    set({ freeze })
    if (freeze) {
      // Hold the current frame immediately rather than waiting for the next
      // timecode sync tick — Control keeps playing live underneath.
      for (const layer of get().current) {
        if (layer.sourceType === 'video') getVideoElement(layer.id)?.pause()
      }
    }
  }
}))
