interface GridOverlayProps {
  width: number
  height: number
  gridSize: number
}

export function GridOverlay({ width, height, gridSize }: GridOverlayProps): JSX.Element {
  const verticalLines = Math.floor(width / gridSize)
  const horizontalLines = Math.floor(height / gridSize)

  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute left-0 top-0"
    >
      {Array.from({ length: verticalLines + 1 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * gridSize}
          y1={0}
          x2={i * gridSize}
          y2={height}
          stroke="#ffffff"
          strokeOpacity={0.06}
        />
      ))}
      {Array.from({ length: horizontalLines + 1 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * gridSize}
          x2={width}
          y2={i * gridSize}
          stroke="#ffffff"
          strokeOpacity={0.06}
        />
      ))}
    </svg>
  )
}
