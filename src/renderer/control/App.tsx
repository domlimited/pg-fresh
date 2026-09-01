import { useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { previewVideoRegistry } from '@shared/canvas-engine/videoRegistry'
import { useSceneStore } from '@shared/store/sceneStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useOutputStatusStore } from '@shared/store/outputStatusStore'
import { useTimecodeSyncStore } from '@shared/store/timecodeSyncStore'
import { useTransitionStore } from '@shared/store/transitionStore'
import { useUiStore } from '@shared/store/uiStore'
import { TopBar } from './panels/TopBar'
import { PreviewCanvas } from './panels/PreviewCanvas'
import { PlaybackControls } from './panels/PlaybackControls'
import { OutputAdjustPanel } from './panels/OutputAdjustPanel'
import { QueuePanel } from './panels/QueuePanel'
import { SourceSidebar } from './panels/SourceSidebar'
import { ProgramMonitorPanel } from './panels/ProgramMonitorPanel'
import { TakeControls } from './panels/TakeControls'
import { takeProgram } from './actions/programActions'

const TIMECODE_SYNC_INTERVAL_MS = 500

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName)
}

function App(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const loadResolution = useResolutionStore((s) => s.load)
  const outputAdjustOpen = useUiStore((s) => s.outputAdjustOpen)
  const toggleOutputAdjust = useUiStore((s) => s.toggleOutputAdjust)

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
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SourceSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 basis-0 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-900 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Viewer</h2>
                  <button
                    onClick={toggleOutputAdjust}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold ${
                      outputAdjustOpen
                        ? 'bg-cyan-600/20 text-cyan-300'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    ปรับ OUTPUT
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <PreviewCanvas />
                </div>
              </div>
              <PlaybackControls />
            </div>
            <TakeControls />
            <ProgramMonitorPanel />
          </div>
          <QueuePanel />
        </div>
      </div>
      {/* Floats above everything on its own layer instead of sitting in the
          Viewer column's layout flow — see uiStore.ts for why. */}
      {outputAdjustOpen && <OutputAdjustPanel />}
    </div>
  )
}

export default App
