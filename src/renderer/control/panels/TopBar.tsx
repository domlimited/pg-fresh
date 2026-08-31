import { useEffect, useState } from 'react'
import { Grid3x3, Plus, Tv } from 'lucide-react'
import type { DisplayInfo } from '@common/types/display'
import { useSceneStore } from '@shared/store/sceneStore'
import { useOutputStatusStore } from '@shared/store/outputStatusStore'

export function TopBar(): JSX.Element {
  const snapEnabled = useSceneStore((s) => s.snapEnabled)
  const toggleSnap = useSceneStore((s) => s.toggleSnap)
  const outputActive = useOutputStatusStore((s) => s.active)
  const setOutputStatus = useOutputStatusStore((s) => s.setStatus)

  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  async function refreshDisplays(): Promise<DisplayInfo[]> {
    const list = await window.fresh.listDisplays()
    setDisplays(list)
    setSelectedDisplayId((current) =>
      current && list.some((d) => d.id === current) ? current : (list.find((d) => !d.isPrimary)?.id ?? list[0]?.id ?? null)
    )
    return list
  }

  useEffect(() => {
    void refreshDisplays()
  }, [])

  async function handleImportClick(): Promise<void> {
    await window.fresh.importMediaDialog()
  }

  async function handleSendToLed(): Promise<void> {
    setSendError(null)
    if (outputActive) {
      setOutputStatus(await window.fresh.deactivateOutput())
      return
    }
    if (selectedDisplayId === null) return
    try {
      setOutputStatus(await window.fresh.activateOutput(selectedDisplayId))
    } catch (err) {
      // Most likely a stale displayId — the monitor list may be out of date
      // (e.g. unplugged since the dropdown was populated). Refresh it so
      // the operator can just pick again instead of clicking a dead option.
      console.error('[TopBar] activateOutput failed', err)
      setSendError('ส่งสัญญาณไม่สำเร็จ — จออาจถูกถอดออก กำลังรีเฟรชรายการจอ')
      void refreshDisplays()
    }
  }

  const displayCountLabel =
    displays.length === 0
      ? 'กำลังตรวจสอบจอ…'
      : outputActive
        ? 'กำลังส่งสัญญาณไปจอ LED'
        : `พบ ${displays.length} จอ — เลือกจอ LED แล้วกดส่ง`

  return (
    <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-2.5">
      <span className="text-sm font-semibold tracking-wide text-neutral-100">Fresh Studio</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
          outputActive ? 'bg-emerald-600/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
        }`}
      >
        {outputActive ? 'LIVE' : 'IDLE'}
      </span>
      <span className={`text-xs ${sendError ? 'text-red-400' : 'text-neutral-500'}`}>{sendError ?? displayCountLabel}</span>

      <div className="flex-1" />

      <button
        onClick={toggleSnap}
        title="Snap to grid"
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
          snapEnabled ? 'bg-cyan-600/20 text-cyan-300' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
        Snap
      </button>

      <select
        value={selectedDisplayId ?? ''}
        onChange={(e) => setSelectedDisplayId(Number(e.target.value))}
        className="rounded-md bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200"
      >
        {displays.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleImportClick}
        className="flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
      >
        <Plus className="h-3.5 w-3.5" />
        เพิ่มไฟล์
      </button>

      <button
        onClick={() => void handleSendToLed()}
        disabled={selectedDisplayId === null}
        className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
          outputActive ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        <Tv className="h-3.5 w-3.5" />
        {outputActive ? 'หยุดส่งสัญญาณ' : 'ส่งไปจอ LED'}
      </button>
    </div>
  )
}
