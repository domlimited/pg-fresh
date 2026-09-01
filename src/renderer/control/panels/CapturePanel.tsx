import { useEffect, useState } from 'react'
import { MonitorSmartphone, RefreshCw } from 'lucide-react'
import type { CaptureSource } from '@common/types/capture'
import { useSceneStore } from '@shared/store/sceneStore'

interface CapturePanelProps {
  kind: 'screen' | 'window'
}

export function CapturePanel({ kind }: CapturePanelProps): JSX.Element {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const setActiveSource = useSceneStore((s) => s.setActiveSource)

  async function refresh(): Promise<void> {
    setLoading(true)
    try {
      const result = kind === 'screen' ? await window.fresh.listScreenSources() : await window.fresh.listWindowSources()
      setSources(result.sources)
      setDenied(result.denied)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {kind === 'screen' ? 'จับหน้าจอ' : 'จับหน้าต่าง App'}
        </h2>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {denied ? (
          <p className="py-4 text-xs text-neutral-600">
            macOS ต้องได้รับสิทธิ์ Screen Recording ก่อนถึงจะจับภาพหน้าจอ/หน้าต่างได้ — ไปที่ System Settings →
            Privacy &amp; Security → Screen Recording แล้วเปิดให้ FRESH จากนั้นรีสตาร์ทแอป
          </p>
        ) : sources.length === 0 ? (
          <p className="py-4 text-xs text-neutral-600">
            {loading ? 'กำลังค้นหา…' : kind === 'screen' ? 'ไม่พบจอที่ตรวจจับได้' : 'ไม่พบหน้าต่างที่ตรวจจับได้'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sources.map((source) => (
              <div
                key={source.id}
                onClick={() => setActiveSource({ name: source.name, sourceType: 'screen', deviceId: source.id })}
                title={source.name}
                className="flex cursor-pointer flex-col overflow-hidden rounded border border-neutral-800 bg-neutral-950 hover:border-cyan-600"
              >
                <div className="relative flex h-16 items-center justify-center bg-black">
                  {source.thumbnailDataUrl ? (
                    <img src={source.thumbnailDataUrl} draggable={false} className="h-full w-full object-cover" />
                  ) : (
                    <MonitorSmartphone className="h-6 w-6 text-neutral-600" />
                  )}
                </div>
                <span className="truncate px-1 py-0.5 text-[10px] text-neutral-400">{source.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
