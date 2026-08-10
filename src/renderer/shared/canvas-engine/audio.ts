import type { Layer } from '@common/types/scene'

// Only called for the Output-side element of a layer — Control's copy of
// the same media stays hard-muted (it's a cueing preview, not what's on
// air) regardless of the layer's volume/muted settings.
export async function applyAudioSettings(el: HTMLMediaElement, layer: Layer): Promise<void> {
  el.volume = layer.volume ?? 1
  el.muted = layer.muted ?? false

  if (layer.audioOutputId && 'setSinkId' in el) {
    try {
      await el.setSinkId(layer.audioOutputId)
    } catch (err) {
      console.error('[audio] setSinkId failed for', layer.id, err)
    }
  }
}
