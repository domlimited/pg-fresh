import { useSceneStore } from '@shared/store/sceneStore'
import { useQueueStore } from '@shared/store/queueStore'
import { takeProgram } from './programActions'

export function playQueueIndex(index: number): void {
  const queue = useQueueStore.getState()
  const item = queue.items[index]
  if (!item) return

  queue.setCurrentIndex(index)
  useSceneStore.getState().setQueueLayer(item)
  takeProgram(useSceneStore.getState().layers, 'cut')
}

export function advanceQueue(): void {
  const { items, currentIndex } = useQueueStore.getState()
  if (items.length === 0) return
  const next = currentIndex === null ? 0 : (currentIndex + 1) % items.length
  playQueueIndex(next)
}
