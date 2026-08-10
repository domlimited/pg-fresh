import type { Layer, TakeMode } from '@common/types/scene'
import { getVideoElement } from '@shared/canvas-engine/videoRegistry'

const FADE_DURATION_MS = 600

// sceneStore only tracks a video layer's *static* fields — the live
// playhead lives in the DOM <video> element, so snapshot it here before
// handing the layer list to Output.
function snapshotPlayback(layers: Layer[]): Layer[] {
  return layers.map((layer) => {
    if (layer.sourceType !== 'video') return layer
    const el = getVideoElement(layer.id)
    if (!el) return layer
    return { ...layer, currentTime: el.currentTime, isPlaying: !el.paused }
  })
}

// Shared by TransportBar's buttons, the Spacebar hotkey, and queue
// auto-advance — all three need to push the current canvas live.
export function takeProgram(layers: Layer[], mode: TakeMode): void {
  window.fresh.sendProgramUpdate({
    layers: snapshotPlayback(layers),
    mode,
    fadeMs: mode === 'fade' ? FADE_DURATION_MS : 0
  })
}
