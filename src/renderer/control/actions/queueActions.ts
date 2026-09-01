import { useSceneStore } from '@shared/store/sceneStore'
import { useQueueStore } from '@shared/store/queueStore'
import { useTransitionStore } from '@shared/store/transitionStore'
import { takeProgram } from './programActions'

// Loads a queue item into the Viewer only — does NOT touch Program/LED, and
// deliberately does NOT update queueStore's currentIndex (that field means
// "which item is live", read by QueuePanel's LIVE badge and its
// auto-advance effect — updating it here would make previewing an item
// falsely mark it live and could trigger auto-advance on unbroadcast
// content). This is what a single click on a Queue item does
// (requirement-v4: clicking a Queue item must preview in the Viewer first,
// not broadcast immediately).
export function loadQueueIndex(index: number): void {
  const queue = useQueueStore.getState()
  const item = queue.items[index]
  if (!item) return

  useSceneStore.getState().setActiveSource({
    name: item.name,
    sourceType: item.kind,
    mediaId: item.mediaId,
    mediaPath: item.mediaPath
  })
}

// Loads into the Viewer and immediately sends it live — double-click on a
// Queue item, or auto-advance continuing an already-live queue. currentIndex
// only changes here, once the item is actually broadcasting.
export function sendQueueIndexLive(index: number): void {
  loadQueueIndex(index)
  useQueueStore.getState().setCurrentIndex(index)
  const { mode, fadeMs } = useTransitionStore.getState()
  takeProgram(useSceneStore.getState().layers, mode, fadeMs)
}

export function advanceQueue(): void {
  const { items, currentIndex } = useQueueStore.getState()
  if (items.length === 0) return
  const next = currentIndex === null ? 0 : (currentIndex + 1) % items.length
  sendQueueIndexLive(next)
}
