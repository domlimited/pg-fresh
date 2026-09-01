import { useEffect, useRef, useState, type ReactNode } from 'react'

interface StageProps {
  width: number
  height: number
  background?: string
  children?: ReactNode
  // 'center' (default) matches the real Output window and Program monitor —
  // when the container's aspect ratio doesn't exactly match the canvas's,
  // the letterboxed video sits centered like a real display would. The
  // Viewer uses 'top' instead so it hugs the panel's top edge and lines up
  // with Program's box, which never has extra vertical space to center
  // within (see requirement-v4).
  verticalAlign?: 'center' | 'top'
}

export function Stage({
  width,
  height,
  background = '#000',
  children,
  verticalAlign = 'center'
}: StageProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
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

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full justify-center overflow-hidden ${
        verticalAlign === 'top' ? 'items-start' : 'items-center'
      }`}
    >
      <div
        style={{
          width,
          height,
          // Without flexShrink:0, this div's parent (a flex row) shrinks its
          // *width* to fit the available space before the transform below
          // ever runs, since flex-shrink defaults to 1 — height is left
          // alone (cross-axis, unaffected by flex-shrink), so the box's
          // aspect ratio gets corrupted before scale() even applies,
          // rendering as a squished sliver instead of the canvas's actual
          // aspect ratio.
          flexShrink: 0,
          transform: `scale(${scale})`,
          // scale() shrinks around transform-origin, which defaults to the
          // box's own center — that's fine when the box is also centered by
          // align-items, but for 'top' alignment the untransformed box
          // (full canvas height, taller than the container) has its center
          // far below the container's top, so a center-anchored scale would
          // shrink it toward there and visually push it down/off the
          // bottom. Anchoring the origin to 'top' instead keeps the box's
          // top edge fixed at the container's top through the scale.
          transformOrigin: verticalAlign === 'top' ? 'top center' : 'center',
          background,
          position: 'relative',
          // This div IS the canvas frame (e.g. 1920x1080) — a layer sized or
          // positioned beyond it (crop/scale/aspect-ratio adjustments can
          // push x/y negative or width/height past the edge) must be
          // clipped exactly at this boundary, like a real screen would,
          // instead of painting outside it into whatever sits around the
          // Stage visually.
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  )
}
