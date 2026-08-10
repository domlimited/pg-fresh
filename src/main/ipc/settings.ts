import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import { getResolution, setResolution } from '../db/repositories/settings'
import { getOutputWindow } from '../windows/outputWindow'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_RESOLUTION, () => getResolution())

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_RESOLUTION, (_event, width: number, height: number) => {
    const resolution = setResolution(width, height)
    getOutputWindow()?.webContents.send(IPC_CHANNELS.SETTINGS_RESOLUTION_UPDATE, resolution)
    return resolution
  })
}
