import { create } from 'zustand'
import type { OutputStatus } from '@common/types/display'

interface OutputStatusState extends OutputStatus {
  setStatus: (status: OutputStatus) => void
}

// One shared instance, subscribed once (see App.tsx) — both TopBar (the
// "ส่งไปจอ LED" button) and ProgramMonitorPanel (the "ไม่ได้ส่ง" indicator)
// read from it instead of each polling/listening independently.
export const useOutputStatusStore = create<OutputStatusState>((set) => ({
  active: false,
  displayId: null,
  setStatus: (status) => set(status)
}))
