// Two separate registries, not one: Control's window now renders a layer's
// video TWICE in the same process — once for editing (preview role) and
// once for the embedded Program monitor (program role, mirrors what's live
// on the LED output). Both use the same layer.id, so a single shared Map
// would have the second mount silently steal the first one's entry.
function createRegistry(): {
  register: (layerId: string, el: HTMLVideoElement | null) => void
  get: (layerId: string) => HTMLVideoElement | undefined
} {
  const registry = new Map<string, HTMLVideoElement>()
  return {
    register: (layerId, el) => {
      if (el) registry.set(layerId, el)
      else registry.delete(layerId)
    },
    get: (layerId) => registry.get(layerId)
  }
}

// Preview canvas copy — the layer as the operator is editing/cueing it.
export const previewVideoRegistry = createRegistry()

// Program copy — the layer as it's actually live (embedded Program monitor
// in Control, and the real Output window each keep their own instance of
// this module, so this registry only ever holds one process's elements).
export const programVideoRegistry = createRegistry()
