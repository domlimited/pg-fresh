import { Scissors } from 'lucide-react'
import { useSceneStore } from '@shared/store/sceneStore'
import { useProgramStore } from '@shared/store/programStore'
import { setBlack, setFreeze } from '../actions/outputActions'
import { takeProgram } from '../actions/programActions'

// Sits in the narrow strip between the Viewer and Program columns (App.tsx)
// — stacked vertically instead of the old 2x2 grid inside the Program
// column so it doesn't eat into either column's width (see requirement-v4).
export function TakeControls(): JSX.Element {
  const layers = useSceneStore((s) => s.layers)
  const black = useProgramStore((s) => s.black)
  const freeze = useProgramStore((s) => s.freeze)

  return (
    <div className="flex w-20 shrink-0 flex-col justify-center gap-1.5 px-1">
      <button
        onClick={() => takeProgram(layers, 'cut')}
        title="ตัดทันที"
        className="flex flex-col items-center justify-center gap-1 rounded-md bg-cyan-600 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
      >
        <Scissors className="h-3.5 w-3.5" />
        CUT
      </button>
      <button
        onClick={() => takeProgram(layers, 'fade')}
        title="ค่อยๆเปลี่ยน"
        className="rounded-md bg-neutral-800 py-2 text-xs font-semibold text-neutral-100 hover:bg-neutral-700"
      >
        FADE
      </button>
      <button
        onClick={() => setFreeze(!freeze)}
        className={`rounded-md py-1.5 text-[11px] font-semibold ${
          freeze ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
        }`}
      >
        FREEZE
      </button>
      <button
        onClick={() => setBlack(!black)}
        className={`rounded-md py-1.5 text-[11px] font-semibold ${
          black ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
        }`}
      >
        BLACK
      </button>
    </div>
  )
}
