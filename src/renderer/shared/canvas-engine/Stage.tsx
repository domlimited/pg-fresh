import { createContext, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'

export const StageScaleContext = createContext(1)

interface StageProps {
  width: number
  height: number
  background?: string
  children?: ReactNode
  onPointerDownEmpty?: () => void
  onDropAt?: (x: number, y: number, dataTransfer: DataTransfer) => void
}

export function Stage({
  width,
  height,
  background = '#000',
  children,
  onPointerDownEmpty,
  onDropAt
}: StageProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = el
      setScale(Math.min(clientWidth / width, clientHeight / height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [width, height])

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    if (!onDropAt) return
    e.preventDefault()
    const rect = innerRef.current?.getBoundingClientRect()
    if (!rect) return
    onDropAt((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale, e.dataTransfer)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDownEmpty}
      onDragOver={onDropAt ? (e) => e.preventDefault() : undefined}
      onDrop={handleDrop}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        ref={innerRef}
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          background,
          position: 'relative'
        }}
      >
        <StageScaleContext.Provider value={scale || 1}>{children}</StageScaleContext.Provider>
      </div>
    </div>
  )
}
