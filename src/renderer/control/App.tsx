import { useEffect } from 'react'
import { previewVideoRegistry } from '@shared/canvas-engine/videoRegistry'
import { useSceneStore } from '@shared/store/sceneStore'
import { usePresetStore } from '@shared/store/presetStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useOutputStatusStore } from '@shared/store/outputStatusStore'
import { useTimecodeSyncStore } from '@shared/store/timecodeSyncStore'
import { useTransitionStore } from '@shared/store/transitionStore'
import { TopBar } from './panels/TopBar'
import { PresetBar } from './panels/PresetBar'
import { LayerPanel } from './panels/LayerPanel'
import { PreviewCanvas } from './panels/PreviewCanvas'
import { PlaybackControls } from './panels/PlaybackControls'
import { OutputAdjustPanel } from './panels/OutputAdjustPanel'
import { QueuePanel } from './panels/QueuePanel'
import { SourceSidebar } from './panels/SourceSidebar'
import { ProgramMonitorPanel } from './panels/ProgramMonitorPanel'
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

  useEffect(() => window.fresh.onOutputStatusUpdate(useOutputStatusStore.getState().setStatus), [])

  useEffect(() => {
    const interval = setInterval(() => {
      for (const layer of layers) {
        if (layer.sourceType !== 'video') continue
        const el = previewVideoRegistry.get(layer.id)
        if (!el || el.paused) continue
        const payload = { layerId: layer.id, currentTime: el.currentTime, isPlaying: true }
        // Local programStore copy (embedded Program Monitor) and the real
        // Output window (if open) each keep their own OutputVideoLayer
        // decoder for this layer — both need this tick, not just the IPC
        // side, or the monitor's playhead never gets drift-corrected.
        useTimecodeSyncStore.getState().applySync(payload)
        window.fresh.sendTimecodeSync(payload)
      }
    }, TIMECODE_SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [layers])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (isTypingTarget(e.target)) return

      if (e.code === 'Space') {
        e.preventDefault()
        const { mode, fadeMs } = useTransitionStore.getState()
        takeProgram(useSceneStore.getState().layers, mode, fadeMs)
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
      <TopBar />
      <PresetBar />
      <div className="flex flex-1 overflow-hidden">
        <SourceSidebar />
        <LayerPanel />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-4">
            <PreviewCanvas />
          </div>
          <PlaybackControls />
          <OutputAdjustPanel />
          <QueuePanel />
        </div>
        <ProgramMonitorPanel />
      </div>
    </div>
  )
}

export default App
