import { create } from 'zustand'
import type { TakeMode } from '@common/types/scene'

export const FADE_SPEED_OPTIONS = [
  { label: 'เร็ว 0.5s', ms: 500 },
  { label: 'ปกติ 1s', ms: 1000 },
  { label: 'ช้า 2s', ms: 2000 },
  { label: 'ช้ามาก 3s', ms: 3000 }
] as const

interface TransitionState {
  // Default transition style — drives the Spacebar hotkey and queue
  // auto-advance. The Program monitor's explicit CUT/FADE buttons always
  // override this with their own mode regardless of the selection here.
  mode: TakeMode
  fadeMs: number
  setMode: (mode: TakeMode) => void
  setFadeMs: (fadeMs: number) => void
}

export const useTransitionStore = create<TransitionState>((set) => ({
  mode: 'cut',
  fadeMs: FADE_SPEED_OPTIONS[1].ms,
  setMode: (mode) => set({ mode }),
  setFadeMs: (fadeMs) => set({ fadeMs })
}))
