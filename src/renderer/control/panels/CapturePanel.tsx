import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MonitorSmartphone, RefreshCw, Settings } from 'lucide-react'
import type { CaptureSource } from '@common/types/capture'
import { useSceneStore } from '@shared/store/sceneStore'

interface CapturePanelProps {
  kind: 'screen' | 'window'
}

export function CapturePanel({ kind }: CapturePanelProps): JSX.Element {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const setActiveSource = useSceneStore((s) => s.setActiveSource)

  // Guards against two refreshes overlapping — enumerating windows also
  // captures a thumbnail for each one, so a slow pass must not be stomped by
  // the focus-triggered pass behind it.
  const inFlight = useRef(false)

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const result = kind === 'screen' ? await window.fresh.listScreenSources() : await window.fresh.listWindowSources()
      setSources(result.sources)
      setDenied(result.denied)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    setFilter('')
    void refresh()
  }, [refresh])

  // The list goes stale the moment a window opens, closes, or moves — and the
  // operator's workflow is exactly "go open the app I want, then come back to
  // FRESH". Refreshing when this window regains focus catches that without
  // the cost of polling: every pass re-captures a thumbnail per window.
  useEffect(() => {
    const onFocus = (): void => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return sources
    return sources.filter((s) => s.name.toLowerCase().includes(needle))
  }, [sources, filter])

  const isWindowKind = kind === 'window'

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

      {!denied && isWindowKind && sources.length > 0 && (
        <div className="px-1 pb-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`ค้นหาจาก ${sources.length} หน้าต่าง…`}
            className="w-full rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-600"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2">
        {denied ? (
          <div className="space-y-2 py-4">
            <p className="text-xs text-neutral-600">
              macOS ต้องได้รับสิทธิ์ Screen Recording ก่อนถึงจะจับภาพหน้าจอ/หน้าต่างได้
            </p>
            <button
              onClick={() => void window.fresh.openScreenPermissionSettings()}
              className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
            >
              <Settings className="h-3.5 w-3.5" />
              เปิด System Settings
            </button>
            <p className="text-[10px] leading-relaxed text-neutral-600">
              เปิดสิทธิ์ให้ FRESH แล้ว <span className="text-neutral-400">ต้องปิดแล้วเปิดแอปใหม่</span> — และถ้าเพิ่งอัปเดต/ติดตั้งเวอร์ชันใหม่
              macOS อาจถอนสิทธิ์เดิมทิ้ง ต้องเปิดให้ใหม่อีกครั้ง
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-4 text-xs text-neutral-600">
            {loading
              ? 'กำลังค้นหา…'
              : filter.trim()
                ? `ไม่พบหน้าต่างที่ตรงกับ "${filter.trim()}"`
                : kind === 'screen'
                  ? 'ไม่พบจอที่ตรวจจับได้'
                  : 'ไม่พบหน้าต่างที่ตรวจจับได้'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((source) => (
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
                <div className="flex items-center gap-1 px-1 py-0.5">
                  {source.appIconDataUrl && (
                    <img src={source.appIconDataUrl} draggable={false} className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate text-[10px] text-neutral-400">{source.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* macOS simply does not expose these to any screen-capture API — say
            so rather than letting the operator hunt for a window that cannot
            appear (see docs/requirement-v5, ปัญหาข้อ 6). */}
        {!denied && isWindowKind && (
          <p className="px-1 pt-3 text-[10px] leading-relaxed text-neutral-600">
            หน้าต่างที่ย่อลง Dock, แอปที่สั่ง Hide ไว้ หรือหน้าต่างที่อยู่คนละ Desktop/Space จะไม่ขึ้นในรายการนี้ —
            สลับไปเปิดหน้าต่างนั้นค้างไว้ก่อน แล้วกลับมาที่ FRESH รายการจะรีเฟรชให้เอง
          </p>
        )}
      </div>
    </div>
  )
}
