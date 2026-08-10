import { useEffect } from 'react'
import { Stage } from '@shared/canvas-engine/Stage'
import { LayerRenderer } from '@shared/canvas-engine/LayerRenderer'
import { useProgramStore } from '@shared/store/programStore'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useTimecodeSyncStore } from '@shared/store/timecodeSyncStore'

function App(): JSX.Element {
  const current = useProgramStore((s) => s.current)
  const incoming = useProgramStore((s) => s.incoming)
  const incomingOpacity = useProgramStore((s) => s.incomingOpacity)
  const fadeMs = useProgramStore((s) => s.fadeMs)
  const black = useProgramStore((s) => s.black)
  const applyUpdate = useProgramStore((s) => s.applyUpdate)
  const setBlack = useProgramStore((s) => s.setBlack)
  const setFreeze = useProgramStore((s) => s.setFreeze)
  const applyTimecodeSync = useTimecodeSyncStore((s) => s.applySync)
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)
  const loadResolution = useResolutionStore((s) => s.load)
  const applyResolution = useResolutionStore((s) => s.applyRemote)

  useEffect(() => window.fresh.onProgramUpdate(applyUpdate), [applyUpdate])
  useEffect(() => window.fresh.onTimecodeSync(applyTimecodeSync), [applyTimecodeSync])
  useEffect(() => window.fresh.onSetBlack(setBlack), [setBlack])
  useEffect(() => window.fresh.onSetFreeze(setFreeze), [setFreeze])
  useEffect(() => {
    void loadResolution()
  }, [loadResolution])
  useEffect(
    () => window.fresh.onResolutionUpdate((r) => applyResolution(r.width, r.height)),
    [applyResolution]
  )

  return (
    <div className="relative h-full w-full">
      <Stage width={width} height={height} background="#000">
        {current.map((layer) => (
          <LayerRenderer key={layer.id} layer={layer} />
        ))}
        {incoming && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: incomingOpacity,
              transition: `opacity ${fadeMs}ms linear`
            }}
          >
            {incoming.map((layer) => (
              <LayerRenderer key={layer.id} layer={layer} />
            ))}
          </div>
        )}
      </Stage>
      {black && <div className="absolute inset-0 z-50 bg-black" />}
    </div>
  )
}

export default App
