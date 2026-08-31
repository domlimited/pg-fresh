import { Stage } from '@shared/canvas-engine/Stage'
import { GridOverlay } from '@shared/canvas-engine/GridOverlay'
import { LayerBox } from '@shared/canvas-engine/LayerBox'
import { GRID_SIZE } from '@shared/canvas-engine/constants'
import { useResolutionStore } from '@shared/store/resolutionStore'
import { useSceneStore } from '@shared/store/sceneStore'
import type { MediaItem } from '@common/types/media'
import { CAMERA_DRAG_TYPE } from './CameraPanel'
import { CAPTURE_DRAG_TYPE } from './CapturePanel'

const MEDIA_DRAG_TYPE = 'application/x-fresh-media'

export function PreviewCanvas(): JSX.Element {
  const width = useResolutionStore((s) => s.width)
  const height = useResolutionStore((s) => s.height)
  const layers = useSceneStore((s) => s.layers)
  const selectedLayerId = useSceneStore((s) => s.selectedLayerId)
  const snapEnabled = useSceneStore((s) => s.snapEnabled)
  const selectLayer = useSceneStore((s) => s.selectLayer)
  const updateLayer = useSceneStore((s) => s.updateLayer)
  const addMediaLayer = useSceneStore((s) => s.addMediaLayer)
  const addCameraLayer = useSceneStore((s) => s.addCameraLayer)
  const addScreenCaptureLayer = useSceneStore((s) => s.addScreenCaptureLayer)

  return (
    <Stage
      width={width}
      height={height}
      background="#0a0a0a"
      onPointerDownEmpty={() => selectLayer(null)}
      onDropAt={(x, y, dataTransfer) => {
        const mediaJson = dataTransfer.getData(MEDIA_DRAG_TYPE)
        if (mediaJson) {
          const item: MediaItem = JSON.parse(mediaJson)
          addMediaLayer(item, x, y)
          return
        }
        const cameraJson = dataTransfer.getData(CAMERA_DRAG_TYPE)
        if (cameraJson) {
          addCameraLayer(JSON.parse(cameraJson), x, y)
          return
        }
        const captureJson = dataTransfer.getData(CAPTURE_DRAG_TYPE)
        if (captureJson) {
          addScreenCaptureLayer(JSON.parse(captureJson), x, y)
        }
      }}
    >
      {snapEnabled && <GridOverlay width={width} height={height} gridSize={GRID_SIZE} />}
      {[...layers]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((layer) => (
          <LayerBox
            key={layer.id}
            layer={layer}
            selected={layer.id === selectedLayerId}
            snap={snapEnabled}
            gridSize={GRID_SIZE}
            onSelect={selectLayer}
            onChange={(patch) => updateLayer(layer.id, patch)}
          />
        ))}
    </Stage>
  )
}
