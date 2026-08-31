import type { Layer, ProgramUpdatePayload, TakeMode } from '@common/types/scene'
import { previewVideoRegistry } from '@shared/canvas-engine/videoRegistry'
import { useProgramStore } from '@shared/store/programStore'

const DEFAULT_FADE_DURATION_MS = 1000

// sceneStore only tracks a video layer's *static* fields — the live
// playhead lives in the DOM <video> element, so snapshot it here before
// handing the layer list to Output.
function snapshotPlayback(layers: Layer[]): Layer[] {
  return layers.map((layer) => {
    if (layer.sourceType !== 'video') return layer
    const el = previewVideoRegistry.get(layer.id)
    if (!el) return layer
    return { ...layer, currentTime: el.currentTime, isPlaying: !el.paused }
  })
}

// Shared by the Program panel's CUT/FADE buttons, the Spacebar hotkey, and
// queue auto-advance — all three need to push the current canvas live.
//
// This updates two things: the local programStore (so Control's own
// embedded Program Monitor — same process — reflects it immediately) and,
// via IPC, the real Output window's programStore, if that window is
// currently open (see actions/outputActions.ts for when it is).
export function takeProgram(layers: Layer[], mode: TakeMode, fadeMs = DEFAULT_FADE_DURATION_MS): void {
  const payload: ProgramUpdatePayload = {
    layers: snapshotPlayback(layers),
    mode,
    fadeMs: mode === 'fade' ? fadeMs : 0
  }
  useProgramStore.getState().applyUpdate(payload)
  window.fresh.sendProgramUpdate(payload)
}
