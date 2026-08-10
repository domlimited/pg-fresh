import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import type { ProgramUpdatePayload, TimecodeSyncPayload } from '@common/types/scene'
import { getOutputWindow } from '../windows/outputWindow'

export function registerSceneIpc(): void {
  ipcMain.on(IPC_CHANNELS.PROGRAM_UPDATE, (_event, payload: ProgramUpdatePayload) => {
    getOutputWindow()?.webContents.send(IPC_CHANNELS.PROGRAM_UPDATE, payload)
  })

  ipcMain.on(IPC_CHANNELS.TIMECODE_SYNC, (_event, payload: TimecodeSyncPayload) => {
    getOutputWindow()?.webContents.send(IPC_CHANNELS.TIMECODE_SYNC, payload)
  })

  ipcMain.on(IPC_CHANNELS.OUTPUT_SET_BLACK, (_event, black: boolean) => {
    getOutputWindow()?.webContents.send(IPC_CHANNELS.OUTPUT_SET_BLACK, black)
  })

  ipcMain.on(IPC_CHANNELS.OUTPUT_SET_FREEZE, (_event, freeze: boolean) => {
    getOutputWindow()?.webContents.send(IPC_CHANNELS.OUTPUT_SET_FREEZE, freeze)
  })
}
