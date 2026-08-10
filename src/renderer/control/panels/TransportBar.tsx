import { useState } from 'react'
import { Grid3x3, Settings } from 'lucide-react'
import type { TakeMode } from '@common/types/scene'
import { useSceneStore } from '@shared/store/sceneStore'
import { takeProgram } from '../actions/programActions'
import { ResolutionModal } from './ResolutionModal'

export function TransportBar(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const snapEnabled = useSceneStore((s) => s.snapEnabled)
  const toggleSnap = useSceneStore((s) => s.toggleSnap)
  const [black, setBlack] = useState(false)
  const [freeze, setFreeze] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)

  function handleTake(mode: TakeMode): void {
    takeProgram(layers, mode)
  }

  function toggleBlack(): void {
    const next = !black
    setBlack(next)
    window.fresh.sendSetBlack(next)
  }

  function toggleFreeze(): void {
    const next = !freeze
    setFreeze(next)
    window.fresh.sendSetFreeze(next)
  }

  return (
    <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-2">
      <span className="mr-2 text-sm font-semibold tracking-wide text-neutral-300">FRESH</span>

      <button
        onClick={toggleSnap}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
          snapEnabled ? 'bg-cyan-600/20 text-cyan-300' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
        Snap {snapEnabled ? 'On' : 'Off'}
      </button>

      <button
        onClick={() => setShowResolutionModal(true)}
        title="Canvas resolution"
        className="rounded-md bg-neutral-800 p-1.5 text-neutral-300 hover:bg-neutral-700"
      >
        <Settings className="h-4 w-4" />
      </button>

      {showResolutionModal && <ResolutionModal onClose={() => setShowResolutionModal(false)} />}

      <div className="flex-1" />

      <button
        onClick={toggleFreeze}
        className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
          freeze ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
        }`}
      >
        FREEZE
      </button>
      <button
        onClick={toggleBlack}
        className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
          black ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
        }`}
      >
        BLACK
      </button>

      <div className="mx-2 h-6 w-px bg-neutral-800" />

      <button
        onClick={() => handleTake('cut')}
        className="rounded-md bg-cyan-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan-500"
      >
        Take
      </button>
      <button
        onClick={() => handleTake('cut')}
        className="rounded-md bg-neutral-800 px-4 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Cut
      </button>
      <button
        onClick={() => handleTake('fade')}
        className="rounded-md bg-neutral-800 px-4 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        Fade
      </button>
    </div>
  )
}
