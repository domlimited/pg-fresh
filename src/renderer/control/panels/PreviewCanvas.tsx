import { Stage } from '@shared/canvas-engine/Stage'
import { LayerSource } from '@shared/canvas-engine/LayerSource'
import { ControlVideoLayer } from '@shared/canvas-engine/ControlVideoLayer'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useSceneStore } from '@shared/store/sceneStore'

export function PreviewCanvas(): JSX.Element {
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)
  const layer = useSceneStore((s) => s.layers[0])

  return (
    <Stage width={width} height={height} background="#0a0a0a" verticalAlign="top">
      {layer ? (
        <div
          style={{
            position: 'absolute',
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            transform: `rotate(${layer.rotation}deg)`,
            opacity: layer.opacity,
            overflow: 'hidden'
          }}
        >
          <LayerSource layer={layer} role="control" VideoComponent={ControlVideoLayer} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-neutral-600">
          คลิกไฟล์ในคิว หรือเลือกแหล่งภาพจากด้านซ้าย เพื่อโหลด Preview
        </div>
      )}
    </Stage>
  )
}
