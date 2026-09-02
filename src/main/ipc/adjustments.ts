import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { SourceAdjustment } from '@common/types/adjustment'
import { deleteAdjustment, listAdjustments, saveAdjustment } from '../db/repositories/sourceAdjustments'

export function registerAdjustmentIpc(): void {
  ipcMain.handle(IPC_CHANNELS.ADJUSTMENT_LIST, () => listAdjustments())

  ipcMain.handle(IPC_CHANNELS.ADJUSTMENT_SAVE, (_event, sourceKey: string, adjustment: SourceAdjustment) =>
    saveAdjustment(sourceKey, adjustment)
  )

  ipcMain.handle(IPC_CHANNELS.ADJUSTMENT_DELETE, (_event, sourceKey: string) => deleteAdjustment(sourceKey))
}
