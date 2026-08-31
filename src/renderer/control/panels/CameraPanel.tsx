import { useEffect, useState, type DragEvent } from 'react'
import { Camera, RefreshCw } from 'lucide-react'

export const CAMERA_DRAG_TYPE = 'application/x-fresh-camera'

interface CameraDevice {
  deviceId: string
  label: string
}

export function CameraPanel(): JSX.Element {
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)

  async function refreshDevices(): Promise<void> {
    const list = await navigator.mediaDevices.enumerateDevices()
    const cameras = list
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))
    setDevices(cameras)
    if (cameras.some((d) => d.label !== '' && !d.label.startsWith('Camera '))) {
      setPermissionGranted(true)
    }
  }

  useEffect(() => {
    void refreshDevices()
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
  }, [])

  async function requestPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      setPermissionGranted(true)
      await refreshDevices()
    } catch (err) {
      console.error('[CameraPanel] camera permission denied', err)
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, device: CameraDevice): void {
    e.dataTransfer.setData(CAMERA_DRAG_TYPE, JSON.stringify(device))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">กล้อง</h2>
        <button
          onClick={() => void refreshDevices()}
          className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {devices.length === 0 ? (
          <button
            onClick={() => void requestPermission()}
            className="rounded bg-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-700"
          >
            Grant Camera Access
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                draggable
                onDragStart={(e) => handleDragStart(e, device)}
                title={device.label}
                className="flex cursor-grab flex-col items-center justify-center gap-1 rounded border border-neutral-800 bg-neutral-950 p-2"
              >
                <Camera className="h-5 w-5 text-neutral-500" />
                <span className="w-full truncate text-center text-[10px] text-neutral-400">{device.label}</span>
              </div>
            ))}
            {!permissionGranted && (
              <p className="self-center px-2 text-[10px] text-neutral-600">
                Labels appear after granting access
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
