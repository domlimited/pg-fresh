import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { Layer } from '@common/types/scene'
import { clearPresetSlot, listPresets, upsertPresetSlot } from '../db/repositories/presets'

export function registerPresetIpc(): void {
  ipcMain.handle(IPC_CHANNELS.PRESET_LIST, () => listPresets())

  ipcMain.handle(IPC_CHANNELS.PRESET_SAVE, (_event, slot: number, layers: Layer[]) =>
    upsertPresetSlot(slot, layers)
  )

  ipcMain.handle(IPC_CHANNELS.PRESET_CLEAR, (_event, slot: number) => clearPresetSlot(slot))
}
