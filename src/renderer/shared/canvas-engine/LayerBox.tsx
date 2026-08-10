import { useContext, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Layer } from '@common/types/scene'
import { ControlVideoLayer } from './ControlVideoLayer'
import { LayerSource } from './LayerSource'
import { StageScaleContext } from './Stage'

type Corner = 'nw' | 'ne' | 'sw' | 'se'

interface LayerBoxProps {
  layer: Layer
  selected: boolean
  snap: boolean
  gridSize: number
  onSelect: (id: string) => void
  onChange: (patch: Partial<Layer>) => void
}

const MIN_SIZE = 20

function snapValue(value: number, gridSize: number, snap: boolean): number {
  return snap ? Math.round(value / gridSize) * gridSize : value
}

const CORNER_STYLE: Record<Corner, { top: number | string; left: number | string; cursor: string }> = {
  nw: { top: -5, left: -5, cursor: 'nwse-resize' },
  ne: { top: -5, left: 'calc(100% - 5px)', cursor: 'nesw-resize' },
  sw: { top: 'calc(100% - 5px)', left: -5, cursor: 'nesw-resize' },
  se: { top: 'calc(100% - 5px)', left: 'calc(100% - 5px)', cursor: 'nwse-resize' }
}

export function LayerBox({ layer, selected, snap, gridSize, onSelect, onChange }: LayerBoxProps): JSX.Element {
  const scale = useContext(StageScaleContext)
  const boxRef = useRef<HTMLDivElement>(null)

  function handleDragPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.stopPropagation()
    onSelect(layer.id)

    const startClientX = e.clientX
    const startClientY = e.clientY
    const start = { x: layer.x, y: layer.y }

    function onMove(ev: PointerEvent): void {
      const dx = (ev.clientX - startClientX) / scale
      const dy = (ev.clientY - startClientY) / scale
      onChange({
        x: snapValue(start.x + dx, gridSize, snap),
        y: snapValue(start.y + dy, gridSize, snap)
      })
    }
    function onUp(): void {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>, corner: Corner): void {
    e.stopPropagation()
    onSelect(layer.id)

    const startClientX = e.clientX
    const startClientY = e.clientY
    const start = { x: layer.x, y: layer.y, width: layer.width, height: layer.height }

    function onMove(ev: PointerEvent): void {
      const dx = (ev.clientX - startClientX) / scale
      const dy = (ev.clientY - startClientY) / scale
      let { x, y, width, height } = start

      if (corner === 'se') {
        width = start.width + dx
        height = start.height + dy
      } else if (corner === 'ne') {
        width = start.width + dx
        height = start.height - dy
        y = start.y + dy
      } else if (corner === 'sw') {
        width = start.width - dx
        x = start.x + dx
        height = start.height + dy
      } else {
        width = start.width - dx
        x = start.x + dx
        height = start.height - dy
        y = start.y + dy
      }

      width = Math.max(MIN_SIZE, width)
      height = Math.max(MIN_SIZE, height)

      onChange({
        x: snapValue(x, gridSize, snap),
        y: snapValue(y, gridSize, snap),
        width: snapValue(width, gridSize, snap),
        height: snapValue(height, gridSize, snap)
      })
    }
    function onUp(): void {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleRotatePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.stopPropagation()
    onSelect(layer.id)

    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    function onMove(ev: PointerEvent): void {
      const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX)
      let degrees = (angle * 180) / Math.PI + 90
      if (snap) degrees = Math.round(degrees / 15) * 15
      onChange({ rotation: degrees })
    }
    function onUp(): void {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={boxRef}
      onPointerDown={handleDragPointerDown}
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity,
        zIndex: layer.zIndex,
        cursor: 'move',
        overflow: 'hidden',
        outline: selected ? '2px solid #22d3ee' : '1px solid rgba(255,255,255,0.15)',
        outlineOffset: selected ? -2 : -1
      }}
    >
      <LayerSource layer={layer} role="control" VideoComponent={ControlVideoLayer} />

      <span className="pointer-events-none absolute left-0 top-0 select-none bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
        {layer.name}
      </span>

      {selected && (
        <>
          {(Object.keys(CORNER_STYLE) as Corner[]).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => handleResizePointerDown(e, corner)}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: '#22d3ee',
                borderRadius: 2,
                ...CORNER_STYLE[corner]
              }}
            />
          ))}
          <div
            onPointerDown={handleRotatePointerDown}
            style={{
              position: 'absolute',
              top: -28,
              left: 'calc(50% - 5px)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#22d3ee',
              cursor: 'grab'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              width: 1,
              height: 20,
              background: '#22d3ee',
              pointerEvents: 'none'
            }}
          />
        </>
      )}
    </div>
  )
}
