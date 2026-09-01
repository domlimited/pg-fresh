import { create } from 'zustand'
import type { Layer, SourceType } from '@common/types/scene'
import { ACTIVE_LAYER_ID } from '../canvas-engine/constants'
import { useResolutionStore } from './resolutionStore'

export interface ActiveSourceInput {
  name: string
  sourceType: SourceType
  mediaId?: string
  mediaPath?: string
  deviceId?: string
  url?: string
}

interface SceneState {
  // 0 or 1 item: the single active source currently loaded in the Viewer —
  // the same layer, once sent live via takeProgram(), is what plays on
  // Program/Output. There is no multi-layer canvas anymore (see
  // requirement-v4: Layers feature removed in favor of a single-source
  // switcher).
  layers: Layer[]
  setActiveSource: (source: ActiveSourceInput) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  layers: [],

  setActiveSource: (source) => {
    const { width, height } = useResolutionStore.getState()
    const layer: Layer = {
      id: ACTIVE_LAYER_ID,
      name: source.name,
      sourceType: source.sourceType,
      mediaId: source.mediaId,
      mediaPath: source.mediaPath,
      deviceId: source.deviceId,
      url: source.url,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      loop: false
    }
    set({ layers: [layer] })
  },

  updateLayer: (id, patch) => {
    set({ layers: get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  }
}))
