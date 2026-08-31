import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@common/ipc-channels'
import { activateOutput, deactivateOutput, getOutputStatus, listDisplays } from '../windows/outputWindow'

export function registerDisplayIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DISPLAY_LIST, () => listDisplays())

  ipcMain.handle(IPC_CHANNELS.OUTPUT_ACTIVATE, (_event, displayId: number) => {
    // A stale/unplugged displayId (picked before a monitor was disconnected)
    // makes activateOutput() a no-op — reject so the renderer knows the
    // send-to-LED action actually failed instead of silently doing nothing.
    if (!activateOutput(displayId)) {
      throw new Error(`Display ${displayId} not found — it may have been disconnected`)
    }
    return getOutputStatus()
  })

  ipcMain.handle(IPC_CHANNELS.OUTPUT_DEACTIVATE, () => {
    deactivateOutput()
    return getOutputStatus()
  })
}
