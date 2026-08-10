const registry = new Map<string, HTMLVideoElement>()

export function registerVideoElement(layerId: string, el: HTMLVideoElement | null): void {
  if (el) registry.set(layerId, el)
  else registry.delete(layerId)
}

export function getVideoElement(layerId: string): HTMLVideoElement | undefined {
  return registry.get(layerId)
}
