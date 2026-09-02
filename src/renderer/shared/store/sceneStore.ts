import { create } from 'zustand'
import type { Layer, SourceType } from '@common/types/scene'
import type { SourceAdjustment } from '@common/types/adjustment'
import { sourceKeyFor } from '@common/types/adjustment'
import { ACTIVE_LAYER_ID } from '../canvas-engine/constants'
import { useResolutionStore } from './resolutionStore'

export interface ActiveSourceInput {
  name: string
  sourceType: SourceType
  mediaId?: string
  mediaPath?: string
  deviceId?: string
  url?: string
  durationSec?: number
}

interface SceneState {
  // 0 or 1 item: the single active source currently loaded in the Viewer —
  // the same layer, once sent live via takeProgram(), is what plays on
  // Program/Output. There is no multi-layer canvas anymore (see
  // requirement-v4: Layers feature removed in favor of a single-source
  // switcher).
  layers: Layer[]
  // Every source the operator has ever adjusted, keyed by sourceKeyFor().
  // Mirrors the source_adjustments table; loaded once at startup.
  adjustments: Record<string, SourceAdjustment>
  loadAdjustments: () => Promise<void>
  setActiveSource: (source: ActiveSourceInput) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  resetAdjustment: (id: string) => void
}

// Writes are debounced because the panel's sliders fire updateLayer on every
// pointer move — a drag would otherwise be hundreds of SQLite round trips.
const SAVE_DEBOUNCE_MS = 300
const pendingSaves = new Map<string, SourceAdjustment>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function flushSaves(): void {
  saveTimer = null
  const entries = [...pendingSaves.entries()]
  pendingSaves.clear()
  for (const [sourceKey, adjustment] of entries) {
    void window.fresh.saveSourceAdjustment(sourceKey, adjustment)
  }
}

function scheduleSave(sourceKey: string, adjustment: SourceAdjustment): void {
  pendingSaves.set(sourceKey, adjustment)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSaves, SAVE_DEBOUNCE_MS)
}

function toAdjustment(layer: Layer, canvasWidth: number, canvasHeight: number): SourceAdjustment {
  return {
    x: layer.x / canvasWidth,
    y: layer.y / canvasHeight,
    width: layer.width / canvasWidth,
    height: layer.height / canvasHeight,
    rotation: layer.rotation,
    opacity: layer.opacity,
    fit: layer.fit,
    crop: layer.crop,
    volume: layer.volume,
    muted: layer.muted,
    loop: layer.loop,
    audioOutputId: layer.audioOutputId
  }
}

function applyAdjustment(
  layer: Layer,
  adjustment: SourceAdjustment,
  canvasWidth: number,
  canvasHeight: number
): Layer {
  return {
    ...layer,
    x: adjustment.x * canvasWidth,
    y: adjustment.y * canvasHeight,
    width: adjustment.width * canvasWidth,
    height: adjustment.height * canvasHeight,
    rotation: adjustment.rotation,
    opacity: adjustment.opacity,
    fit: adjustment.fit,
    crop: adjustment.crop,
    volume: adjustment.volume,
    muted: adjustment.muted,
    loop: adjustment.loop ?? false,
    audioOutputId: adjustment.audioOutputId
  }
}

export const useSceneStore = create<SceneState>((set, get) => ({
  layers: [],
  adjustments: {},

  loadAdjustments: async () => {
    set({ adjustments: await window.fresh.listSourceAdjustments() })
  },

  setActiveSource: (source) => {
    const { width, height } = useResolutionStore.getState()
    const base: Layer = {
      id: ACTIVE_LAYER_ID,
      loadId: crypto.randomUUID(),
      name: source.name,
      sourceType: source.sourceType,
      mediaId: source.mediaId,
      mediaPath: source.mediaPath,
      deviceId: source.deviceId,
      url: source.url,
      durationSec: source.durationSec,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      loop: false
    }

    // Restore whatever the operator last set for this exact source. Without
    // this, every switch rebuilt the layer from defaults and silently threw
    // away their crop/scale/fit (requirement-v5, ปัญหาข้อ 4).
    const saved = get().adjustments[sourceKeyFor(source)]
    set({ layers: [saved ? applyAdjustment(base, saved, width, height) : base] })
  },

  updateLayer: (id, patch) => {
    const layers = get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l))
    set({ layers })

    const layer = layers.find((l) => l.id === id)
    if (!layer) return

    const { width, height } = useResolutionStore.getState()
    const sourceKey = sourceKeyFor(layer)
    const adjustment = toAdjustment(layer, width, height)
    set({ adjustments: { ...get().adjustments, [sourceKey]: adjustment } })
    scheduleSave(sourceKey, adjustment)
  },

  // Back to a full-canvas, uncropped, unrotated frame. Audio settings are
  // deliberately left alone: this is the "ปรับ OUTPUT" panel's reset button,
  // and that panel has no audio controls — wiping the operator's volume from
  // here would be a surprise. Going through updateLayer means the reset is
  // persisted like any other adjustment, so switching away and back doesn't
  // resurrect the old crop.
  resetAdjustment: (id) => {
    const { width, height } = useResolutionStore.getState()
    get().updateLayer(id, {
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      opacity: 1,
      crop: undefined,
      fit: undefined
    })
  }
}))
