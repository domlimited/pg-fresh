import { useEffect } from 'react'
import { getVideoElement } from '@shared/canvas-engine/videoRegistry'
import { useSceneStore } from '@shared/store/sceneStore'
import { usePresetStore } from '@shared/store/presetStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { TransportBar } from './panels/TransportBar'
import { PresetBar } from './panels/PresetBar'
import { LayerPanel } from './panels/LayerPanel'
import { PreviewCanvas } from './panels/PreviewCanvas'
import { PlaybackControls } from './panels/PlaybackControls'
import { MediaLibrary } from './panels/MediaLibrary'
import { CameraPanel } from './panels/CameraPanel'
import { UrlSourcePanel } from './panels/UrlSourcePanel'
import { QueuePanel } from './panels/QueuePanel'
import { takeProgram } from './actions/programActions'

const TIMECODE_SYNC_INTERVAL_MS = 500

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName)
}

function App(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const loadResolution = useResolutionStore((s) => s.load)

  useEffect(() => {
    void loadResolution()
  }, [loadResolution])

  useEffect(() => {
    const interval = setInterval(() => {
      for (const layer of layers) {
        if (layer.sourceType !== 'video') continue
        const el = getVideoElement(layer.id)
        if (!el || el.paused) continue
        window.fresh.sendTimecodeSync({ layerId: layer.id, currentTime: el.currentTime, isPlaying: true })
      }
    }, TIMECODE_SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [layers])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (isTypingTarget(e.target)) return

      if (e.code === 'Space') {
        e.preventDefault()
        takeProgram(useSceneStore.getState().layers, 'cut')
        return
      }

      const digitMatch = e.code.match(/^(?:Digit|Numpad)([1-9])$/)
      if (digitMatch) {
        const slot = Number(digitMatch[1])
        const preset = usePresetStore.getState().presets.find((p) => p.slot === slot)
        if (preset) useSceneStore.getState().loadLayers(preset.layers)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <TransportBar />
      <PresetBar />
      <div className="flex flex-1 overflow-hidden">
        <LayerPanel />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-4">
            <PreviewCanvas />
          </div>
          <PlaybackControls />
          <MediaLibrary />
          <CameraPanel />
          <UrlSourcePanel />
          <QueuePanel />
        </div>
      </div>
    </div>
  )
}

export default App
