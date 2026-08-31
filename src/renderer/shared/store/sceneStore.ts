import { create } from 'zustand'
import type { Layer } from '@common/types/scene'
import type { MediaItem, MediaKind } from '@common/types/media'
import { QUEUE_LAYER_ID } from '../canvas-engine/constants'
import { isStreamUrl, normalizeWebUrl } from '../utils/webUrl'
import { useResolutionStore } from './resolutionStore'

const PLACEHOLDER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']
const DEFAULT_MEDIA_LAYER_WIDTH = 480

interface QueueLayerSource {
  mediaId: string
  mediaPath: string
  name: string
  kind: MediaKind
}

interface CameraDevice {
  deviceId: string
  label: string
}

interface CaptureSourcePick {
  id: string
  name: string
}

interface SceneState {
  layers: Layer[]
  selectedLayerId: string | null
  snapEnabled: boolean
  addLayer: () => void
  addMediaLayer: (item: MediaItem, centerX: number, centerY: number) => void
  addCameraLayer: (device: CameraDevice, centerX: number, centerY: number) => void
  addScreenCaptureLayer: (source: CaptureSourcePick, centerX: number, centerY: number) => void
  addUrlLayer: (rawUrl: string, centerX: number, centerY: number) => void
  setQueueLayer: (source: QueueLayerSource) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  selectLayer: (id: string | null) => void
  toggleSnap: () => void
  reorderLayer: (id: string, direction: 'up' | 'down') => void
  loadLayers: (layers: Layer[]) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  layers: [],
  selectedLayerId: null,
  snapEnabled: true,

  addLayer: () => {
    const layers = get().layers
    const id = crypto.randomUUID()
    const layer: Layer = {
      id,
      name: `Layer ${layers.length + 1}`,
      sourceType: 'placeholder',
      color: PLACEHOLDER_COLORS[layers.length % PLACEHOLDER_COLORS.length],
      x: 160,
      y: 120,
      width: 480,
      height: 270,
      rotation: 0,
      opacity: 1,
      zIndex: layers.length
    }
    set({ layers: [...layers, layer], selectedLayerId: id })
  },

  addMediaLayer: (item, centerX, centerY) => {
    const layers = get().layers
    const id = crypto.randomUUID()
    const aspect = item.width && item.height ? item.width / item.height : 16 / 9
    const width = DEFAULT_MEDIA_LAYER_WIDTH
    const height = Math.round(width / aspect)
    const layer: Layer = {
      id,
      name: item.name,
      sourceType: item.kind,
      mediaId: item.id,
      mediaPath: item.displayPath,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: layers.length,
      loop: false
    }
    set({ layers: [...layers, layer], selectedLayerId: id })
  },

  addCameraLayer: (device, centerX, centerY) => {
    const layers = get().layers
    const id = crypto.randomUUID()
    const width = DEFAULT_MEDIA_LAYER_WIDTH
    const height = Math.round(width / (16 / 9))
    const layer: Layer = {
      id,
      name: device.label,
      sourceType: 'camera',
      deviceId: device.deviceId,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: layers.length
    }
    set({ layers: [...layers, layer], selectedLayerId: id })
  },

  addScreenCaptureLayer: (source, centerX, centerY) => {
    const layers = get().layers
    const id = crypto.randomUUID()
    const width = DEFAULT_MEDIA_LAYER_WIDTH
    const height = Math.round(width / (16 / 9))
    const layer: Layer = {
      id,
      name: source.name,
      sourceType: 'screen',
      deviceId: source.id,
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: layers.length
    }
    set({ layers: [...layers, layer], selectedLayerId: id })
  },

  addUrlLayer: (rawUrl, centerX, centerY) => {
    const layers = get().layers
    const id = crypto.randomUUID()
    const isStream = isStreamUrl(rawUrl)
    const width = DEFAULT_MEDIA_LAYER_WIDTH
    const height = Math.round(width / (16 / 9))
    const layer: Layer = {
      id,
      name: isStream ? 'Stream' : 'Webpage',
      sourceType: isStream ? 'stream' : 'webview',
      url: isStream ? rawUrl : normalizeWebUrl(rawUrl),
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: layers.length
    }
    set({ layers: [...layers, layer], selectedLayerId: id })
  },

  setQueueLayer: (source) => {
    const { width, height } = useResolutionStore.getState()
    const layers = get().layers.filter((l) => l.id !== QUEUE_LAYER_ID)
    const layer: Layer = {
      id: QUEUE_LAYER_ID,
      name: source.name,
      sourceType: source.kind,
      mediaId: source.mediaId,
      mediaPath: source.mediaPath,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: -1,
      loop: false
    }
    set({ layers: [layer, ...layers] })
  },

  updateLayer: (id, patch) => {
    set({ layers: get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  },

  removeLayer: (id) => {
    set({
      layers: get().layers.filter((l) => l.id !== id),
      selectedLayerId: get().selectedLayerId === id ? null : get().selectedLayerId
    })
  },

  selectLayer: (id) => set({ selectedLayerId: id }),

  toggleSnap: () => set({ snapEnabled: !get().snapEnabled }),

  reorderLayer: (id, direction) => {
    const layers = [...get().layers].sort((a, b) => a.zIndex - b.zIndex)
    const index = layers.findIndex((l) => l.id === id)
    const swapIndex = direction === 'up' ? index + 1 : index - 1
    if (index === -1 || swapIndex < 0 || swapIndex >= layers.length) return

    const currentZ = layers[index].zIndex
    layers[index].zIndex = layers[swapIndex].zIndex
    layers[swapIndex].zIndex = currentZ
    set({ layers })
  },

  loadLayers: (layers) => set({ layers: layers.map((l) => ({ ...l })), selectedLayerId: null })
}))
