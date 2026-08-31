import { useProgramStore } from '@shared/store/programStore'

// Same pattern as takeProgram() in programActions.ts: update the local
// (same-process) programStore immediately for the embedded Program
// monitor, and forward to the real Output window over IPC if it's open.
export function setBlack(black: boolean): void {
  useProgramStore.getState().setBlack(black)
  window.fresh.sendSetBlack(black)
}

export function setFreeze(freeze: boolean): void {
  useProgramStore.getState().setFreeze(freeze)
  window.fresh.sendSetFreeze(freeze)
}
