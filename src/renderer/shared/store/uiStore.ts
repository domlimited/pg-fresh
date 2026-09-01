import { create } from 'zustand'

interface UiState {
  // Whether the "ปรับ OUTPUT ก่อนส่ง" panel is showing. It floats as an
  // overlay (see App.tsx/OutputAdjustPanel.tsx) instead of sitting in the
  // Viewer column's normal layout flow — the Viewer and Program monitor
  // must always render at the same size, and a panel that only exists on
  // the Viewer's side of the layout would eat into its available height
  // and throw that off (see requirement-v4).
  outputAdjustOpen: boolean
  toggleOutputAdjust: () => void
  closeOutputAdjust: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  outputAdjustOpen: false,
  toggleOutputAdjust: () => set({ outputAdjustOpen: !get().outputAdjustOpen }),
  closeOutputAdjust: () => set({ outputAdjustOpen: false })
}))
